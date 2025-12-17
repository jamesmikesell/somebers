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
  max_group_number = int(data['max_group_number']) if 'max_group_number' in data else int(group_goal.shape[1] - 1)
  column_header_channel_start = int(data['column_header_channel_start']) if 'column_header_channel_start' in data else int(data['column_header_channel_index']) if 'column_header_channel_index' in data else (max_group_number + 1)
  column_header_channel_count = int(data['column_header_channel_count']) if 'column_header_channel_count' in data else 1
  row_header_channel_start = int(data['row_header_channel_start']) if 'row_header_channel_start' in data else int(data['row_header_channel_index']) if 'row_header_channel_index' in data else (max_group_number + column_header_channel_count + 1)
  row_header_channel_count = int(data['row_header_channel_count']) if 'row_header_channel_count' in data else 1

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

  # Column header channels: plot all non-empty columns in one grid.
  col_channels: list[tuple[int, np.ndarray]] = []
  col_vals: list[float] = []
  for offset in range(column_header_channel_count):
    ch = X[index, column_header_channel_start + offset, :h, :w]
    finite_vals = ch[np.abs(ch) > 0]
    if finite_vals.size == 0:
      continue
    col_channels.append((offset, ch))
    col_vals.extend(finite_vals.tolist())
  if col_channels:
    col_min = float(np.min(col_vals))
    col_max = float(np.max(col_vals))
    if not np.isfinite(col_min) or not np.isfinite(col_max):
      col_min, col_max = 0.0, 1.0
    elif col_min == col_max:
      col_max = col_min + 1.0
    col_vmin = col_min - 1.0
    if col_vmin >= col_max:
      col_max = col_vmin + 1.0
    cols = 4
    rows = int(np.ceil(len(col_channels) / cols))
    fig, axes = plt.subplots(rows, cols, figsize=(cols * 3.0, rows * 3.0))
    axes = np.array(axes).reshape(-1)
    norm = matplotlib.colors.Normalize(vmin=col_vmin, vmax=col_max)
    for plot_index, (offset, ch) in enumerate(col_channels):
      ax = axes[plot_index]
      im = ax.imshow(ch, interpolation='nearest', norm=norm)
      ax.set_title(f'col {offset}')
      ax.axis('off')
      fig.colorbar(im, ax=ax, shrink=0.7)
    for ax in axes[len(col_channels):]:
      ax.axis('off')
    fig.suptitle(f'{title_prefix}\nper-column headers (non-empty)')
    out_path = out_dir / f'sample_{index:03d}_column_headers.png'
    _imwrite(out_path, fig)
    written.append(out_path)

  # Row header channels: plot all non-empty rows in one grid.
  row_channels: list[tuple[int, np.ndarray]] = []
  row_vals: list[float] = []
  for offset in range(row_header_channel_count):
    ch = X[index, row_header_channel_start + offset, :h, :w]
    finite_vals = ch[np.abs(ch) > 0]
    if finite_vals.size == 0:
      continue
    row_channels.append((offset, ch))
    row_vals.extend(finite_vals.tolist())
  if row_channels:
    row_min = float(np.min(row_vals))
    row_max = float(np.max(row_vals))
    if not np.isfinite(row_min) or not np.isfinite(row_max):
      row_min, row_max = 0.0, 1.0
    elif row_min == row_max:
      row_max = row_min + 1.0
    row_vmin = row_min - 1.0
    if row_vmin >= row_max:
      row_max = row_vmin + 1.0
    cols = 4
    rows = int(np.ceil(len(row_channels) / cols))
    fig, axes = plt.subplots(rows, cols, figsize=(cols * 3.0, rows * 3.0))
    axes = np.array(axes).reshape(-1)
    norm = matplotlib.colors.Normalize(vmin=row_vmin, vmax=row_max)
    for plot_index, (offset, ch) in enumerate(row_channels):
      ax = axes[plot_index]
      im = ax.imshow(ch, interpolation='nearest', norm=norm)
      ax.set_title(f'row {offset}')
      ax.axis('off')
      fig.colorbar(im, ax=ax, shrink=0.7)
    for ax in axes[len(row_channels):]:
      ax.axis('off')
    fig.suptitle(f'{title_prefix}\nper-row headers (non-empty)')
    out_path = out_dir / f'sample_{index:03d}_row_headers.png'
    _imwrite(out_path, fig)
    written.append(out_path)

  group_map = group_number_map[index, :h, :w]
  goals = group_goal[index]
  non_empty_groups = [g for g in range(1, max_group_number + 1) if np.any(group_map == g)]
  if non_empty_groups:
    board_goal_values = np.array([float(goals[g]) for g in non_empty_groups], dtype=np.float64)
    board_goal_min = float(np.min(board_goal_values))
    board_goal_max = float(np.max(board_goal_values))
    if not np.isfinite(board_goal_min) or not np.isfinite(board_goal_max):
      board_goal_min, board_goal_max = 0.0, global_group_goal_max
    elif board_goal_min == board_goal_max:
      board_goal_max = board_goal_min + 1.0
  else:
    board_goal_min, board_goal_max = 0.0, global_group_goal_max
  # Group channels are 0 outside the group cells; make the colormap lower bound
  # slightly below the minimum goal so the background doesn't match the min-goal color.
  board_goal_vmin = min(0.0, board_goal_min - 1.0)
  if board_goal_vmin >= board_goal_max:
    board_goal_vmin = board_goal_max - 1.0

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
    norm = matplotlib.colors.Normalize(vmin=board_goal_vmin, vmax=board_goal_max)
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
