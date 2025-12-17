#!/usr/bin/env python3

from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np


def _imwrite(path: Path, figure: matplotlib.figure.Figure) -> None:
  path.parent.mkdir(parents=True, exist_ok=True)
  figure.savefig(path, dpi=150, bbox_inches='tight')
  plt.close(figure)


def visualize_npz(input_path: Path, index: int, out_dir: Path) -> list[Path]:
  data = np.load(input_path, allow_pickle=False)
  X = data['X']
  y_time_spent = data['y_time_spent']
  game_number = data['game_number']
  game_date_as_percent = data['game_date_as_percent']
  height = data['height']
  width = data['width']
  group_number_map = data['group_number_map']
  group_goal = data['group_goal']
  global_group_goal_max = float(np.max(group_goal)) if group_goal.size else 0.0
  if not np.isfinite(global_group_goal_max) or global_group_goal_max <= 0:
    global_group_goal_max = 1.0

  if X.ndim != 4:
    raise ValueError(f'Expected X to be 4D (N,C,H,W), got shape {X.shape}')

  sample_count = X.shape[0]
  if index < 0 or index >= sample_count:
    raise ValueError(f'index out of range: {index} (N={sample_count})')

  h = int(height[index])
  w = int(width[index])

  written: list[Path] = []

  title_prefix = f'sample {index:03d} (gameNumber={int(game_number[index])})'
  subtitle = f'timeSpent={float(y_time_spent[index]):.3f}, gameDateAsPercent={float(game_date_as_percent[index]):.6f}'

  values = X[index, 0, :h, :w]
  fig = plt.figure(figsize=(5, 5))
  ax = fig.add_subplot(1, 1, 1)
  im = ax.imshow(values, interpolation='nearest')
  ax.set_title(f'{title_prefix}\\nvalues (channel 0)\\n{subtitle}')
  fig.colorbar(im, ax=ax, shrink=0.8)
  out_path = out_dir / f'sample_{index:03d}_values.png'
  _imwrite(out_path, fig)
  written.append(out_path)

  group_map = group_number_map[index, :h, :w]
  goals = group_goal[index]
  non_empty_groups = [g for g in range(1, X.shape[1]) if np.any(group_map == g)]
  goals_text = ', '.join([f'{g}:{goals[g]:g}' for g in non_empty_groups[:18]])
  if len(non_empty_groups) > 18:
    goals_text += ', ...'

  fig = plt.figure(figsize=(6, 5))
  ax = fig.add_subplot(1, 1, 1)
  im = ax.imshow(group_map, interpolation='nearest', cmap='tab20')
  ax.set_title(f'{title_prefix}\\ngroup_number_map\\n{goals_text}')
  fig.colorbar(im, ax=ax, shrink=0.8)
  out_path = out_dir / f'sample_{index:03d}_groups.png'
  _imwrite(out_path, fig)
  written.append(out_path)

  if non_empty_groups:
    cols = 4
    rows = int(np.ceil(len(non_empty_groups) / cols))
    fig, axes = plt.subplots(rows, cols, figsize=(cols * 3.0, rows * 3.0))
    axes = np.array(axes).reshape(-1)
    norm = matplotlib.colors.Normalize(vmin=0.0, vmax=global_group_goal_max)
    for plot_index, group_number in enumerate(non_empty_groups):
      ax = axes[plot_index]
      channel = X[index, group_number, :h, :w]
      im = ax.imshow(channel, interpolation='nearest', norm=norm)
      ax.set_title(f'g={group_number}, goal={goals[group_number]:g}')
      ax.axis('off')
      fig.colorbar(im, ax=ax, shrink=0.7)
    for ax in axes[len(non_empty_groups):]:
      ax.axis('off')
    fig.suptitle(f'{title_prefix}\\nper-group channels (non-empty)')
    out_path = out_dir / f'sample_{index:03d}_group_channels.png'
    _imwrite(out_path, fig)
    written.append(out_path)

  return written


def main() -> None:
  parser = argparse.ArgumentParser(description='Visualize converted .npz tensors to validate transformation.')
  parser.add_argument('--input', type=Path, required=True, help='Path to the .npz file.')
  parser.add_argument('--index', type=int, default=0, help='Sample index to visualize.')
  parser.add_argument('--out-dir', type=Path, default=Path('ml-tools/outputs'), help='Directory for output PNGs.')

  args = parser.parse_args()
  paths = visualize_npz(args.input, args.index, args.out_dir)
  for path in paths:
    print(path)


if __name__ == '__main__':
  main()
