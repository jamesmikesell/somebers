# ML Tools (Python)

This folder contains small Python scripts for converting `development-tools/game-board-export.json` into an `.npz` file and visualizing the transformed tensors.

## Quick start (using the existing repo venv)

This repo already includes a Python environment with `numpy` + `matplotlib`:

- Converter: `./.venv-plot-tools/bin/python ml-tools/convert_export_to_npz.py`
- Visualizer: `./.venv-plot-tools/bin/python ml-tools/visualize_npz.py`

## Convert JSON → NPZ

```bash
./.venv-plot-tools/bin/python ml-tools/convert_export_to_npz.py \
  --input development-tools/game-board-export.json \
  --output ml-tools/outputs/game-board-export.npz
```

The `.npz` contains:

- `X`: `float32` array shaped `(N, C, H, W)`
  - channel `0`: per-cell `value`
  - channels `1..maxGroupNumber`: per-group channels; for group `g`, cells in that group contain that group’s `colorGroupGoal` (else `0`)
- `y_time_spent`: `float32` shaped `(N,)` (training target)
- `game_number`: `int32` shaped `(N,)` (ID only; do not train on it)
- `game_date_as_percent`: `float32` shaped `(N,)` (global feature)
- `height`, `width`: original board sizes per sample
- `group_number_map`: `int16` shaped `(N, H, W)` (padded)
- `group_goal`: `float32` shaped `(N, C)` mapping `groupNumber -> colorGroupGoal` (channel 0 is unused)

## About `groupNumber`

`groupNumber` is treated as an *identifier only* (used to segment cells into groups so we can write the per-group channels). The numeric value of `groupNumber` itself is not a meaningful ML feature; keep it for debugging/visual validation (`group_number_map`, `sample_XXX_groups.png`) and tracking.

## Notes for training (PyTorch)

- `X` is padded to the maximum `H,W` across samples; use `height/width` (or create a mask) if you want to ignore padding.
- Data augmentation can be done with rotations/flips on the last two dims:

```python
# X_t: torch.Tensor shaped (N,C,H,W)
X_rot = torch.rot90(X_t, k=1, dims=(-2, -1))
X_flip = torch.flip(X_t, dims=(-1,))  # horizontal flip
```

`y_time_spent` stays the same for these transforms.

## Visualize a sample

```bash
./.venv-plot-tools/bin/python ml-tools/visualize_npz.py \
  --input ml-tools/outputs/game-board-export.npz \
  --index 0 \
  --out-dir ml-tools/outputs
```

This writes `*.png` files you can open to validate:

- `sample_000_values.png` (channel 0)
- `sample_000_groups.png` (group map + goals)
- `sample_000_group_channels.png` (non-empty group channels)
