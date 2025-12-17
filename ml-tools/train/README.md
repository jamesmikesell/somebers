# Training (PyTorch) + ONNX Export

This folder runs small model sweeps to predict `timeSpent` from the converted board tensor `X` and global features.

Note: the converter removes the original header row/column, so the maximum board size seen by training is `9x9` (for original `10x10` boards).

## Setup (new venv)

```bash
python3 -m venv ml-tools/.venv-ml
ml-tools/.venv-ml/bin/pip install -U pip
ml-tools/.venv-ml/bin/pip install -r ml-tools/train/requirements.txt
```

## Run a sweep

```bash
ml-tools/.venv-ml/bin/python ml-tools/train/run_sweep.py \
  --npz ml-tools/outputs/game-board-export.npz \
  --out-dir ml-tools/outputs/models \
  --split kfold \
  --k 5
```

## Retrain only the current best (no sweep)

After a sweep, retrain/export using the previously-selected best config:

```bash
ml-tools/.venv-ml/bin/python ml-tools/train/run_sweep.py \
  --npz ml-tools/outputs/game-board-export.npz \
  --out-dir ml-tools/outputs/models \
  --split kfold \
  --k 5
  --config ml-tools/outputs/models/best_config.json
```

## Evaluate the current best config (metrics)

This writes `eval_results.json` (MAE/RMSE/R²/sMAPE) and prints a short summary:

```bash
ml-tools/.venv-ml/bin/python ml-tools/train/run_sweep.py \
  --npz ml-tools/outputs/game-board-export.npz \
  --out-dir ml-tools/outputs/models \
  --config ml-tools/outputs/models/best_config.json \
  --eval --split time --val-fraction 0.2
```

Evaluation only (no retrain/export):

```bash
ml-tools/.venv-ml/bin/python ml-tools/train/run_sweep.py \
  --npz ml-tools/outputs/game-board-export.npz \
  --out-dir ml-tools/outputs/models \
  --config ml-tools/outputs/models/best_config.json \
  --eval-only --split kfold --k 5
```

Optional overrides:

```bash
ml-tools/.venv-ml/bin/python ml-tools/train/run_sweep.py \
  --npz ml-tools/outputs/game-board-export.npz \
  --out-dir ml-tools/outputs/models \
  --config ml-tools/outputs/models/best_config.json \
  --epochs 120
```

The sweep tries a few candidate feature variants + architectures:

- `mlp`: flattened board + globals
- `cnn`: small conv net + globals

Feature variants (board tensor):

- `goal_channels`: uses `X` as stored (channel 0 = value; channels 1.. = per-group goal values)
- `goal_channels_plus_goalmap`: adds a `groupGoalMap` channel (each cell gets its group’s goal)
- `value_plus_goalmap`: just `[value, groupGoalMap]`
- `mask_channels_plus_goalvec`: uses `[value, per-group masks]` and includes the per-group goal vector in globals

Notes:

- Column/row headers are now one channel per column and one per row (only that column/row is populated; others are masked/null). This avoids leakage across rows/columns.
- The converter treats `0` as missing for board values/headers and emits `X_mask` + `group_goal_mask`; training appends a value mask channel and normalizes using the masks (missing values are zero-filled only after masking).
- Sweeps accept `--losses` (e.g., `smape,huber`) and pick the best run by lowest sMAPE.

The global features always include:

- `gameDateAsPercent`
- `height`, `width` (normalized)

IDs like `game_number` are never used as features.

## Outputs

`--out-dir` gets:

- `sweep_results.json` (all configs + fold metrics)
- `best_config.json`
- `best_model.onnx`
- `best_model_metadata.json` (feature variant, normalization, target transform)

## Inference contract (ONNX)

ONNX model inputs:

- `board`: `float32` `(N, C, H, W)`
- `globals`: `float32` `(N, G)`

Output:

- `timeSpentPred`: `float32` `(N,)` in the original `timeSpent` units.
