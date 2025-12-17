#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import math
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Iterable

import numpy as np
import torch
import torch.nn.functional as F
from tqdm import tqdm

from ml_tools_train_data import FeatureSpec, NpzDataset, build_features_for_indices
from ml_tools_train_models import ModelSpec, OnnxExportWrapper, build_model
from ml_tools_train_splits import Fold, make_folds
from ml_tools_train_utils import Metrics, compute_metrics, seed_everything


@dataclass(frozen=True)
class RunConfig:
  feature_variant: str
  model_type: str
  target_transform: str
  loss: str
  epochs: int
  batch_size: int
  learning_rate: float
  weight_decay: float
  patience: int


def _to_jsonable(obj: Any) -> Any:
  if isinstance(obj, (str, int, float, bool)) or obj is None:
    return obj
  if isinstance(obj, dict):
    return {str(k): _to_jsonable(v) for k, v in obj.items()}
  if isinstance(obj, (list, tuple)):
    return [_to_jsonable(v) for v in obj]
  if hasattr(obj, '__dict__'):
    return _to_jsonable(obj.__dict__)
  return str(obj)


def _transform_target(y: torch.Tensor, mode: str) -> torch.Tensor:
  if mode == 'none':
    return y
  if mode == 'log1p':
    return torch.log1p(torch.clamp(y, min=0))
  raise ValueError(f'Unknown target_transform: {mode}')


def _inverse_transform_target(y: torch.Tensor, mode: str) -> torch.Tensor:
  if mode == 'none':
    return y
  if mode == 'log1p':
    return torch.expm1(y)
  raise ValueError(f'Unknown target_transform: {mode}')


def _smape_loss(pred: torch.Tensor, target: torch.Tensor, eps: float = 1e-6) -> torch.Tensor:
  denom = torch.clamp(target.abs() + pred.abs(), min=eps)
  return torch.mean(200.0 * torch.abs(pred - target) / denom)


def _compute_loss(pred_t: torch.Tensor, y: torch.Tensor, config: RunConfig) -> torch.Tensor:
  if config.loss == 'smape':
    pred = _inverse_transform_target(pred_t, config.target_transform)
    return _smape_loss(pred, y)

  y_t = _transform_target(y, config.target_transform)
  if config.loss == 'huber':
    return F.smooth_l1_loss(pred_t, y_t, beta=1.0)
  if config.loss == 'mae':
    return F.l1_loss(pred_t, y_t)
  raise ValueError(f'Unknown loss: {config.loss}')


def _train_one(
  dataset: NpzDataset,
  fold: Fold,
  config: RunConfig,
  device: torch.device,
  enable_augmentation: bool,
) -> tuple[Metrics, dict[str, Any]]:
  train_features = build_features_for_indices(dataset, fold.train_indices, config.feature_variant)
  val_features = build_features_for_indices(dataset, fold.val_indices, config.feature_variant)

  feature_spec = FeatureSpec.from_features(train_features)
  train_loader = feature_spec.make_loader(
    train_features,
    batch_size=config.batch_size,
    shuffle=True,
    augment=enable_augmentation,
  )
  val_loader = feature_spec.make_loader(
    val_features,
    batch_size=config.batch_size,
    shuffle=False,
    augment=False,
  )

  model_spec = ModelSpec(
    model_type=config.model_type,
    board_channels=feature_spec.board_channels,
    board_height=feature_spec.board_height,
    board_width=feature_spec.board_width,
    globals_dim=feature_spec.globals_dim,
    target_transform=config.target_transform,
    board_mean=feature_spec.board_mean,
    board_std=feature_spec.board_std,
    globals_mean=feature_spec.globals_mean,
    globals_std=feature_spec.globals_std,
  )
  model = build_model(model_spec).to(device)

  optimizer = torch.optim.AdamW(
    model.parameters(),
    lr=config.learning_rate,
    weight_decay=config.weight_decay,
  )

  best_val = float('inf')
  best_state: dict[str, Any] | None = None
  epochs_no_improve = 0

  for _epoch in range(config.epochs):
    model.train()
    for batch in train_loader:
      board, globals_vec, y = batch
      board = board.to(device)
      globals_vec = globals_vec.to(device)
      y = y.to(device)

      pred_t = model(board, globals_vec)
      loss = _compute_loss(pred_t, y, config)

      optimizer.zero_grad(set_to_none=True)
      loss.backward()
      optimizer.step()

    model.eval()
    val_preds: list[torch.Tensor] = []
    val_targets: list[torch.Tensor] = []
    with torch.no_grad():
      for batch in val_loader:
        board, globals_vec, y = batch
        board = board.to(device)
        globals_vec = globals_vec.to(device)
        y = y.to(device)
        pred_t = model(board, globals_vec)
        pred = _inverse_transform_target(pred_t, config.target_transform)
        val_preds.append(pred.detach().cpu())
        val_targets.append(y.detach().cpu())

    pred_all = torch.cat(val_preds)
    y_all = torch.cat(val_targets)
    metrics = compute_metrics(y_all.numpy(), pred_all.numpy())

    if metrics.smape < best_val:
      best_val = metrics.smape
      best_state = {k: v.detach().cpu() for k, v in model.state_dict().items()}
      epochs_no_improve = 0
    else:
      epochs_no_improve += 1
      if epochs_no_improve >= config.patience:
        break

  if best_state is None:
    raise RuntimeError('No training epochs completed.')

  model.load_state_dict(best_state)
  model.eval()

  # Metrics from the best checkpoint (not necessarily the last epoch).
  val_preds = []
  val_targets = []
  with torch.no_grad():
    for batch in val_loader:
      board, globals_vec, y = batch
      board = board.to(device)
      globals_vec = globals_vec.to(device)
      y = y.to(device)
      pred_t = model(board, globals_vec)
      pred = _inverse_transform_target(pred_t, config.target_transform)
      val_preds.append(pred.detach().cpu())
      val_targets.append(y.detach().cpu())
  pred_all = torch.cat(val_preds)
  y_all = torch.cat(val_targets)
  metrics = compute_metrics(y_all.numpy(), pred_all.numpy())

  fold_info = {
    'feature_spec': feature_spec.to_dict(),
    'model_spec': asdict(model_spec),
  }
  return metrics, fold_info


def _candidate_configs(
  variants: list[str],
  models: list[str],
  transforms: list[str],
  losses: list[str],
  epochs: int,
  patience: int,
) -> list[RunConfig]:
  base = dict(
    epochs=epochs,
    batch_size=64,
    learning_rate=3e-4,
    weight_decay=1e-3,
    patience=patience,
  )

  configs: list[RunConfig] = []
  for variant in variants:
    for model_type in models:
      for transform in transforms:
        for loss in losses:
          configs.append(
            RunConfig(
              feature_variant=variant,
              model_type=model_type,
              target_transform=transform,
              loss=loss,
              **base,
            )
          )
  return configs


def _mean(xs: Iterable[float]) -> float:
  xs = list(xs)
  return float(sum(xs) / max(len(xs), 1))


def _train_final_and_export_onnx(
  dataset: NpzDataset,
  config: RunConfig,
  out_dir: Path,
  device: torch.device,
) -> None:
  indices = list(range(dataset.sample_count))
  features = build_features_for_indices(dataset, indices, config.feature_variant)
  feature_spec = FeatureSpec.from_features(features)

  model_spec = ModelSpec(
    model_type=config.model_type,
    board_channels=feature_spec.board_channels,
    board_height=feature_spec.board_height,
    board_width=feature_spec.board_width,
    globals_dim=feature_spec.globals_dim,
    target_transform=config.target_transform,
    board_mean=feature_spec.board_mean,
    board_std=feature_spec.board_std,
    globals_mean=feature_spec.globals_mean,
    globals_std=feature_spec.globals_std,
  )
  model = build_model(model_spec).to(device)

  loader = feature_spec.make_loader(
    features,
    batch_size=config.batch_size,
    shuffle=True,
    augment=True,
  )

  optimizer = torch.optim.AdamW(
    model.parameters(),
    lr=config.learning_rate,
    weight_decay=config.weight_decay,
  )

  for _epoch in tqdm(range(config.epochs), desc='final-train'):
    model.train()
    for board, globals_vec, y in loader:
      board = board.to(device)
      globals_vec = globals_vec.to(device)
      y = y.to(device)
      pred_t = model(board, globals_vec)
      loss = _compute_loss(pred_t, y, config)
      optimizer.zero_grad(set_to_none=True)
      loss.backward()
      optimizer.step()

  model.eval()

  dummy_board = torch.zeros((1, feature_spec.board_channels, feature_spec.board_height, feature_spec.board_width), dtype=torch.float32, device=device)
  dummy_globals = torch.zeros((1, feature_spec.globals_dim), dtype=torch.float32, device=device)

  out_dir.mkdir(parents=True, exist_ok=True)
  onnx_path = out_dir / 'best_model.onnx'
  torch.onnx.export(
    OnnxExportWrapper(model).to(device),
    (dummy_board, dummy_globals),
    onnx_path,
    input_names=['board', 'globals'],
    output_names=['timeSpentPred'],
    dynamic_axes={
      'board': {0: 'batch'},
      'globals': {0: 'batch'},
      'timeSpentPred': {0: 'batch'},
    },
    opset_version=17,
  )

  metadata = {
    'run_config': asdict(config),
    'feature_spec': feature_spec.to_dict(),
    'model_spec': asdict(model_spec),
    'onnx': {
      'opset': 17,
      'inputs': {
        'board': ['N', feature_spec.board_channels, feature_spec.board_height, feature_spec.board_width],
        'globals': ['N', feature_spec.globals_dim],
      },
      'outputs': {
        'timeSpentPred': ['N'],
      },
    },
  }
  (out_dir / 'best_model_metadata.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')


def main() -> None:
  parser = argparse.ArgumentParser(description='Run a small model sweep and export the best model to ONNX.')
  parser.add_argument('--npz', type=Path, required=True, help='Path to the converted .npz.')
  parser.add_argument('--out-dir', type=Path, default=Path('ml-tools/outputs/models'), help='Output directory.')
  parser.add_argument(
    '--config',
    type=Path,
    default=None,
    help='Skip sweep and train/export using this best_config.json.',
  )
  parser.add_argument(
    '--eval',
    action='store_true',
    help='When used with --config, also evaluate using --split and write eval_results.json.',
  )
  parser.add_argument(
    '--eval-only',
    action='store_true',
    help='When used with --config, run evaluation only (no final retrain/export). Implies --eval.',
  )
  parser.add_argument('--split', choices=['kfold', 'time'], default='kfold', help='Validation scheme.')
  parser.add_argument('--k', type=int, default=5, help='Number of folds (kfold only).')
  parser.add_argument('--val-fraction', type=float, default=0.2, help='Validation fraction (time split only).')
  parser.add_argument('--seed', type=int, default=1337, help='Random seed.')
  parser.add_argument('--device', default='cpu', help='cpu or cuda.')
  parser.add_argument('--no-augment', action='store_true', help='Disable train-time rot/flip augmentation.')
  parser.add_argument('--epochs', type=int, default=None, help='Override training epochs.')
  parser.add_argument('--patience', type=int, default=None, help='Override early-stopping patience.')
  parser.add_argument(
    '--variants',
    default='goal_channels,goal_channels_plus_goalmap,value_plus_goalmap,mask_channels_plus_goalvec',
    help='Comma-separated feature variants to test.',
  )
  parser.add_argument('--models', default='mlp,cnn', help='Comma-separated model types to test.')
  parser.add_argument('--transforms', default='none,log1p', help='Comma-separated target transforms to test.')
  parser.add_argument('--losses', default='smape,huber', help='Comma-separated training losses to test (smape,huber,mae).')

  args = parser.parse_args()
  seed_everything(args.seed)

  device = torch.device(args.device)
  dataset = NpzDataset(args.npz)

  if args.config is not None:
    if args.eval_only:
      args.eval = True

    loaded = json.loads(args.config.read_text(encoding='utf-8'))
    if 'loss' not in loaded:
      loaded['loss'] = 'smape'
    config = RunConfig(**loaded)
    if args.epochs is not None:
      config = RunConfig(**{**asdict(config), 'epochs': int(args.epochs)})
    if args.patience is not None:
      config = RunConfig(**{**asdict(config), 'patience': int(args.patience)})

    out_dir: Path = args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.eval:
      folds = make_folds(
        dataset,
        split=args.split,
        k=args.k,
        val_fraction=args.val_fraction,
        seed=args.seed,
      )
      fold_metrics: list[Metrics] = []
      for fold in folds:
        metrics, _info = _train_one(
          dataset,
          fold,
          config,
          device=device,
          enable_augmentation=not args.no_augment,
        )
        fold_metrics.append(metrics)

      eval_result = {
        'config': asdict(config),
        'split': args.split,
        'k': args.k if args.split == 'kfold' else None,
        'val_fraction': args.val_fraction if args.split == 'time' else None,
        'seed': args.seed,
        'fold_mae': [m.mae for m in fold_metrics],
        'fold_rmse': [m.rmse for m in fold_metrics],
        'fold_r2': [m.r2 for m in fold_metrics],
        'fold_smape': [m.smape for m in fold_metrics],
        'mean_mae': _mean(m.mae for m in fold_metrics),
        'mean_rmse': _mean(m.rmse for m in fold_metrics),
        'mean_r2': _mean(m.r2 for m in fold_metrics),
        'mean_smape': _mean(m.smape for m in fold_metrics),
      }
      (out_dir / 'eval_results.json').write_text(json.dumps(_to_jsonable(eval_result), indent=2), encoding='utf-8')
      print('eval mean_mae:', eval_result['mean_mae'])
      print('eval mean_rmse:', eval_result['mean_rmse'])
      print('eval mean_r2:', eval_result['mean_r2'])
      print('eval mean_smape:', eval_result['mean_smape'])

    if args.eval_only:
      return

    _train_final_and_export_onnx(dataset, config, out_dir, device=device)
    print(out_dir / 'best_model.onnx')
    return

  folds = make_folds(
    dataset,
    split=args.split,
    k=args.k,
    val_fraction=args.val_fraction,
    seed=args.seed,
  )

  candidates = _candidate_configs(
    variants=[v.strip() for v in args.variants.split(',') if v.strip()],
    models=[m.strip() for m in args.models.split(',') if m.strip()],
    transforms=[t.strip() for t in args.transforms.split(',') if t.strip()],
    losses=[l.strip() for l in args.losses.split(',') if l.strip()],
    epochs=int(args.epochs) if args.epochs is not None else 80,
    patience=int(args.patience) if args.patience is not None else 10,
  )
  results: list[dict[str, Any]] = []

  for config in tqdm(candidates, desc='sweep'):
    fold_metrics: list[Metrics] = []
    fold_infos: list[dict[str, Any]] = []
    for fold in folds:
      metrics, fold_info = _train_one(
        dataset,
        fold,
        config,
        device=device,
        enable_augmentation=not args.no_augment,
      )
      fold_metrics.append(metrics)
      fold_infos.append(fold_info)

    result = {
      'config': asdict(config),
      'fold_mae': [m.mae for m in fold_metrics],
      'fold_rmse': [m.rmse for m in fold_metrics],
      'fold_r2': [m.r2 for m in fold_metrics],
      'fold_smape': [m.smape for m in fold_metrics],
      'mean_mae': _mean(m.mae for m in fold_metrics),
      'mean_rmse': _mean(m.rmse for m in fold_metrics),
      'mean_r2': _mean(m.r2 for m in fold_metrics),
      'mean_smape': _mean(m.smape for m in fold_metrics),
      'fold_info': fold_infos[:1],
    }
    results.append(result)

  out_dir: Path = args.out_dir
  out_dir.mkdir(parents=True, exist_ok=True)
  (out_dir / 'sweep_results.json').write_text(json.dumps(_to_jsonable(results), indent=2), encoding='utf-8')

  best = min(results, key=lambda r: float(r['mean_smape']))
  (out_dir / 'best_config.json').write_text(json.dumps(best['config'], indent=2), encoding='utf-8')

  best_config_dict = best['config']
  if 'loss' not in best_config_dict:
    best_config_dict = {**best_config_dict, 'loss': 'smape'}
  best_config = RunConfig(**best_config_dict)
  _train_final_and_export_onnx(dataset, best_config, out_dir, device=device)

  print('Best:', json.dumps(best['config']))
  print('mean_mae:', best['mean_mae'])
  print('mean_smape:', best['mean_smape'])
  print(out_dir / 'best_model.onnx')


if __name__ == '__main__':
  main()
