from __future__ import annotations

from dataclasses import dataclass

import torch
import torch.nn as nn


@dataclass(frozen=True)
class ModelSpec:
  model_type: str
  board_channels: int
  board_height: int
  board_width: int
  globals_dim: int
  target_transform: str
  board_mean: list[float]
  board_std: list[float]
  globals_mean: list[float]
  globals_std: list[float]


class _Normalizer(nn.Module):
  def __init__(
    self,
    board_mean: list[float],
    board_std: list[float],
    globals_mean: list[float],
    globals_std: list[float],
  ):
    super().__init__()
    self.register_buffer('board_mean', torch.tensor(board_mean, dtype=torch.float32).view(1, -1, 1, 1))
    self.register_buffer('board_std', torch.tensor(board_std, dtype=torch.float32).view(1, -1, 1, 1))
    self.register_buffer('globals_mean', torch.tensor(globals_mean, dtype=torch.float32).view(1, -1))
    self.register_buffer('globals_std', torch.tensor(globals_std, dtype=torch.float32).view(1, -1))

  def forward(self, board: torch.Tensor, globals_vec: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
    board_n = (board - self.board_mean) / self.board_std
    globals_n = (globals_vec - self.globals_mean) / self.globals_std
    return board_n, globals_n


class MlpRegressor(nn.Module):
  def __init__(self, board_channels: int, board_height: int, board_width: int, globals_dim: int):
    super().__init__()
    flat_dim = board_channels * board_height * board_width
    self.net = nn.Sequential(
      nn.Linear(flat_dim + globals_dim, 512),
      nn.ReLU(),
      nn.Dropout(p=0.2),
      nn.Linear(512, 256),
      nn.ReLU(),
      nn.Dropout(p=0.2),
      nn.Linear(256, 1),
    )

  def forward(self, board: torch.Tensor, globals_vec: torch.Tensor) -> torch.Tensor:
    x = torch.flatten(board, start_dim=1)
    x = torch.cat([x, globals_vec], dim=1)
    return self.net(x).squeeze(1)


class CnnRegressor(nn.Module):
  def __init__(self, board_channels: int, globals_dim: int):
    super().__init__()
    self.conv = nn.Sequential(
      nn.Conv2d(board_channels, 32, kernel_size=3, padding=1),
      nn.ReLU(),
      nn.Conv2d(32, 64, kernel_size=3, padding=1),
      nn.ReLU(),
      nn.MaxPool2d(kernel_size=2),  # 10->5
      nn.Conv2d(64, 128, kernel_size=3, padding=1),
      nn.ReLU(),
      nn.AdaptiveAvgPool2d((1, 1)),
    )
    self.head = nn.Sequential(
      nn.Linear(128 + globals_dim, 128),
      nn.ReLU(),
      nn.Dropout(p=0.2),
      nn.Linear(128, 1),
    )

  def forward(self, board: torch.Tensor, globals_vec: torch.Tensor) -> torch.Tensor:
    x = self.conv(board).flatten(1)
    x = torch.cat([x, globals_vec], dim=1)
    return self.head(x).squeeze(1)


class FullModel(nn.Module):
  def __init__(self, normalizer: _Normalizer, regressor: nn.Module, target_transform: str):
    super().__init__()
    self.normalizer = normalizer
    self.regressor = regressor
    self.target_transform = target_transform

  def forward(self, board: torch.Tensor, globals_vec: torch.Tensor) -> torch.Tensor:
    board_n, globals_n = self.normalizer(board, globals_vec)
    return self.regressor(board_n, globals_n)


class OnnxExportWrapper(nn.Module):
  def __init__(self, model: FullModel):
    super().__init__()
    self.model = model

  def forward(self, board: torch.Tensor, globals_vec: torch.Tensor) -> torch.Tensor:
    pred_t = self.model(board, globals_vec)
    if self.model.target_transform == 'none':
      return pred_t
    if self.model.target_transform == 'log1p':
      # ONNX export: avoid aten::expm1 (not supported in opset 17 in some builds).
      return torch.exp(pred_t) - 1.0
    raise ValueError(f'Unknown target_transform: {self.model.target_transform}')


def build_model(spec: ModelSpec) -> nn.Module:
  normalizer = _Normalizer(spec.board_mean, spec.board_std, spec.globals_mean, spec.globals_std)

  if spec.model_type == 'mlp':
    regressor: nn.Module = MlpRegressor(spec.board_channels, spec.board_height, spec.board_width, spec.globals_dim)
  elif spec.model_type == 'cnn':
    regressor = CnnRegressor(spec.board_channels, spec.globals_dim)
  else:
    raise ValueError(f'Unknown model_type: {spec.model_type}')

  # Regressor predicts the target in transformed space (controlled externally by the training loop).
  return FullModel(normalizer, regressor, target_transform=spec.target_transform)
