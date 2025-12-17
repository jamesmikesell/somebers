#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any

import numpy as np


def _as_int(value: Any) -> int | None:
  if value is None:
    return None
  if isinstance(value, bool):
    return None
  try:
    int_value = int(value)
  except (TypeError, ValueError):
    return None
  if not math.isfinite(float(int_value)):
    return None
  return int_value


def _as_float(value: Any) -> float | None:
  if value is None:
    return None
  if isinstance(value, bool):
    return None
  try:
    float_value = float(value)
  except (TypeError, ValueError):
    return None
  if not math.isfinite(float_value):
    return None
  return float_value


def _as_float_nonzero(value: Any) -> float | None:
  float_value = _as_float(value)
  if float_value is None:
    return None
  if float_value == 0.0:
    return None
  return float_value


def _classify_subset_roles(values: list[int], target: int) -> dict[str, list[int] | bool]:
  n = len(values)
  fwd: list[set[int]] = [set() for _ in range(n + 1)]
  fwd[0].add(0)
  for i, v in enumerate(values, 1):
    prev = fwd[i - 1]
    nxt = set(prev)
    for s in prev:
      s2 = s + v
      if s2 <= target:
        nxt.add(s2)
    fwd[i] = nxt
  if target not in fwd[n]:
    return {'solutions_exist': False, 'always': [], 'never': list(range(n)), 'optional': []}

  bwd: list[set[int]] = [set() for _ in range(n + 1)]
  bwd[n].add(0)
  for i in range(n - 1, -1, -1):
    v = values[i]
    nxt = set(bwd[i + 1])
    for s in bwd[i + 1]:
      s2 = s + v
      if s2 <= target:
        nxt.add(s2)
    bwd[i] = nxt

  always: list[int] = []
  never: list[int] = []
  optional: list[int] = []
  for i, v in enumerate(values):
    can_without = any((target - s) in bwd[i + 1] for s in fwd[i])
    can_with = any((target - v - s) in bwd[i + 1] for s in fwd[i] if (target - v - s) >= 0)
    if can_with and not can_without:
      always.append(i)
    elif not can_with:
      never.append(i)
    else:
      optional.append(i)
  return {'solutions_exist': True, 'always': always, 'never': never, 'optional': optional}


def _role_map_for_mask(base: np.ndarray, base_mask: np.ndarray, region_mask: np.ndarray, target: float) -> np.ndarray:
  role_map = np.zeros_like(base, dtype=np.int8)
  if target is None:
    return role_map
  target_int = int(round(float(target)))
  coords = list(zip(*np.where(region_mask > 0)))
  values: list[int] = []
  coord_list: list[tuple[int, int]] = []
  for r, c in coords:
    if base_mask[r, c] <= 0:
      continue
    v = base[r, c]
    if not math.isfinite(float(v)) or v == 0.0:
      continue
    values.append(int(round(float(v))))
    coord_list.append((int(r), int(c)))
  if not values:
    return role_map

  roles = _classify_subset_roles(values, target_int)
  for idx in roles['always']:
    rr, cc = coord_list[idx]
    role_map[rr, cc] = 2  # always required
  for idx in roles['never']:
    rr, cc = coord_list[idx]
    role_map[rr, cc] = 3  # never used
  for idx in roles['optional']:
    rr, cc = coord_list[idx]
    role_map[rr, cc] = 1  # optional
  return role_map


def _load_export(path: Path) -> list[dict[str, Any]]:
  raw = json.loads(path.read_text(encoding='utf-8'))
  if not isinstance(raw, list):
    raise ValueError('Expected top-level JSON array.')
  return raw


def _board_size(full_board: list[list[Any]]) -> tuple[int, int]:
  height = len(full_board)
  width = max((len(row) for row in full_board), default=0)
  return height, width


def _scan_dataset(games: list[dict[str, Any]]) -> tuple[int, int, int]:
  max_height = 0
  max_width = 0
  max_group_number = 0

  for game in games:
    full_board = game.get('fullBoard')
    if not isinstance(full_board, list):
      continue
    height, width = _board_size(full_board)
    # We extract row 0 and col 0 as header channels, so the effective grid shrinks by 1.
    if height >= 2 and width >= 2:
      max_height = max(max_height, height - 1)
      max_width = max(max_width, width - 1)

    for row in full_board:
      if not isinstance(row, list):
        continue
      for cell in row:
        if not isinstance(cell, dict):
          continue
        group_number = _as_int(cell.get('groupNumber'))
        if group_number is None or group_number <= 0:
          continue
        max_group_number = max(max_group_number, group_number)

  return max_height, max_width, max_group_number


def _compute_group_goals(full_board: list[list[Any]]) -> dict[int, float]:
  goals_by_group: dict[int, float] = {}

  for row in full_board:
    if not isinstance(row, list):
      continue
    for cell in row:
      if not isinstance(cell, dict):
        continue
      group_number = _as_int(cell.get('groupNumber'))
      if group_number is None or group_number <= 0:
        continue
      goal = _as_float_nonzero(cell.get('colorGroupGoal'))
      if goal is None:
        continue
      if group_number in goals_by_group and goals_by_group[group_number] != goal:
        raise ValueError(
          f'Conflicting colorGroupGoal for groupNumber={group_number}: '
          f'{goals_by_group[group_number]} vs {goal}'
        )
      goals_by_group[group_number] = goal

  return goals_by_group


def convert_export_to_npz(input_path: Path, output_path: Path) -> None:
  games = _load_export(input_path)
  max_height, max_width, max_group_number = _scan_dataset(games)
  if max_height <= 0 or max_width <= 0:
    raise ValueError('No valid boards found in input JSON.')

  sample_count = len(games)
  # Base channels:
  # - channel 0: value grid (excluding header row/col)
  # - channels 1..max_group_number: group goal channels (excluding header row/col)
  # - per-column header channels (one per column, only that column is populated)
  # - per-row header channels (one per row, only that row is populated)
  group_channel_count = 1 + max_group_number
  column_header_channel_start = group_channel_count
  column_header_channel_count = max_width
  row_header_channel_start = column_header_channel_start + column_header_channel_count
  row_header_channel_count = max_height
  channel_count = group_channel_count + column_header_channel_count + row_header_channel_count

  X = np.full((sample_count, channel_count, max_height, max_width), np.nan, dtype=np.float32)
  y_time_spent = np.full((sample_count,), np.nan, dtype=np.float32)
  game_number = np.full((sample_count,), -1, dtype=np.int32)
  game_date_as_percent = np.full((sample_count,), np.nan, dtype=np.float32)
  height = np.zeros((sample_count,), dtype=np.int16)
  width = np.zeros((sample_count,), dtype=np.int16)
  group_number_map = np.zeros((sample_count, max_height, max_width), dtype=np.int16)
  group_goal = np.full((sample_count, group_channel_count), np.nan, dtype=np.float32)
  group_role_map = np.zeros((sample_count, max_height, max_width), dtype=np.int8)
  column_role_map = np.zeros((sample_count, max_height, max_width), dtype=np.int8)
  row_role_map = np.zeros((sample_count, max_height, max_width), dtype=np.int8)

  for i, game in enumerate(games):
    full_board = game.get('fullBoard')
    if not isinstance(full_board, list):
      continue

    orig_height, orig_width = _board_size(full_board)
    if orig_height < 2 or orig_width < 2:
      continue
    board_height = orig_height - 1
    board_width = orig_width - 1
    height[i] = board_height
    width[i] = board_width

    goals_by_group = _compute_group_goals(full_board)
    for group_number, goal in goals_by_group.items():
      if 0 <= group_number < group_channel_count:
        group_goal[i, group_number] = goal

    # Extract header values:
    # - (0,0) is ignored
    # - row 0, col 1.. are column headers; broadcast down that column in the new grid
    # - col 0, row 1.. are row headers; broadcast across that row in the new grid
    col_headers: list[float] = [math.nan] * board_width
    if isinstance(full_board[0], list):
      for c in range(1, min(orig_width, board_width + 1)):
        cell = full_board[0][c] if c < len(full_board[0]) else None
        if isinstance(cell, dict):
          v = _as_float_nonzero(cell.get('value'))
          if v is not None:
            col_headers[c - 1] = float(v)

    row_headers: list[float] = [math.nan] * board_height
    for r in range(1, min(orig_height, board_height + 1)):
      row = full_board[r]
      cell = row[0] if isinstance(row, list) and len(row) > 0 else None
      if isinstance(cell, dict):
        v = _as_float_nonzero(cell.get('value'))
        if v is not None:
          row_headers[r - 1] = float(v)

    # Fill header channels (sparse: only the matching column/row channel is populated).
    for r in range(min(board_height, max_height)):
      for c in range(min(board_width, max_width)):
        col_value = col_headers[c]
        if math.isfinite(col_value):
          X[i, column_header_channel_start + c, r, c] = col_value
        row_value = row_headers[r]
        if math.isfinite(row_value):
          X[i, row_header_channel_start + r, r, c] = row_value

    # Fill value + group channels from the reduced grid (skip original row 0 and col 0).
    for r in range(1, orig_height):
      row = full_board[r]
      if not isinstance(row, list):
        continue
      rr = r - 1
      if rr >= max_height:
        continue
      for c in range(1, len(row)):
        cc = c - 1
        if cc >= max_width:
          continue
        cell = row[c]
        if not isinstance(cell, dict):
          continue

        value = _as_float_nonzero(cell.get('value'))
        if value is not None:
          X[i, 0, rr, cc] = value

        group_number = _as_int(cell.get('groupNumber'))
        if group_number is not None and 0 < group_number <= max_group_number:
          group_number_map[i, rr, cc] = group_number
          goal = goals_by_group.get(group_number)
          if goal is not None:
            X[i, group_number, rr, cc] = float(goal)

    stats = game.get('gamePlayStats')
    if isinstance(stats, dict):
      time_spent = _as_float(stats.get('timeSpent'))
      if time_spent is not None:
        y_time_spent[i] = time_spent

      game_number_value = _as_int(stats.get('gameNumber'))
      if game_number_value is not None:
        game_number[i] = game_number_value

      date_pct = _as_float(stats.get('gameDateAsPercent'))
      if date_pct is not None:
        game_date_as_percent[i] = date_pct

  X_mask = np.isfinite(X).astype(np.float32)
  group_goal_mask = np.isfinite(group_goal).astype(np.float32)
  X = np.nan_to_num(X, nan=0.0)
  group_goal = np.nan_to_num(group_goal, nan=0.0)

  # Compute role maps (always/never/optional) per sample for groups/rows/columns.
  for i in range(sample_count):
    base = X[i, 0]
    base_mask = X_mask[i, 0]
    h = int(height[i])
    w = int(width[i])
    base = base[:h, :w]
    base_mask = base_mask[:h, :w]

    # Groups.
    group_map = group_number_map[i, :h, :w]
    for g in range(1, max_group_number + 1):
      mask = (group_map == g).astype(np.float32)
      if np.count_nonzero(mask) == 0:
        continue
      target = group_goal[i, g] if math.isfinite(float(group_goal[i, g])) else None
      roles = _role_map_for_mask(base, base_mask, mask, target)
      group_role_map[i, :h, :w] = np.where(mask > 0, roles, group_role_map[i, :h, :w])

    # Columns.
    for offset in range(column_header_channel_count):
      ch_mask = X_mask[i, column_header_channel_start + offset, :h, :w]
      if np.count_nonzero(ch_mask) == 0:
        continue
      # header value is constant within the column mask.
      target = None
      col_vals = X[i, column_header_channel_start + offset, :h, :w]
      finite_vals = col_vals[np.abs(col_vals) > 0]
      if finite_vals.size:
        target = float(finite_vals.flatten()[0])
      roles = _role_map_for_mask(base, base_mask, ch_mask, target)
      column_role_map[i, :h, :w] = np.where(ch_mask > 0, roles, column_role_map[i, :h, :w])

    # Rows.
    for offset in range(row_header_channel_count):
      ch_mask = X_mask[i, row_header_channel_start + offset, :h, :w]
      if np.count_nonzero(ch_mask) == 0:
        continue
      target = None
      row_vals = X[i, row_header_channel_start + offset, :h, :w]
      finite_vals = row_vals[np.abs(row_vals) > 0]
      if finite_vals.size:
        target = float(finite_vals.flatten()[0])
      roles = _role_map_for_mask(base, base_mask, ch_mask, target)
      row_role_map[i, :h, :w] = np.where(ch_mask > 0, roles, row_role_map[i, :h, :w])

  output_path.parent.mkdir(parents=True, exist_ok=True)
  np.savez_compressed(
    output_path,
    X=X,
    X_mask=X_mask,
    y_time_spent=y_time_spent,
    game_number=game_number,
    game_date_as_percent=game_date_as_percent,
    height=height,
    width=width,
    group_number_map=group_number_map,
    group_goal=group_goal,
    group_goal_mask=group_goal_mask,
    group_role_map=group_role_map,
    column_role_map=column_role_map,
    row_role_map=row_role_map,
    max_height=np.array(max_height, dtype=np.int16),
    max_width=np.array(max_width, dtype=np.int16),
    max_group_number=np.array(max_group_number, dtype=np.int16),
    column_header_channel_index=np.array(column_header_channel_start, dtype=np.int16),
    row_header_channel_index=np.array(row_header_channel_start, dtype=np.int16),
    column_header_channel_start=np.array(column_header_channel_start, dtype=np.int16),
    column_header_channel_count=np.array(column_header_channel_count, dtype=np.int16),
    row_header_channel_start=np.array(row_header_channel_start, dtype=np.int16),
    row_header_channel_count=np.array(row_header_channel_count, dtype=np.int16),
  )


def main() -> None:
  parser = argparse.ArgumentParser(
    description='Convert game-board-export.json into a padded tensor .npz for ML.'
  )
  parser.add_argument(
    '--input',
    type=Path,
    default=Path('development-tools/game-board-export.json'),
    help='Path to the JSON export.',
  )
  parser.add_argument(
    '--output',
    type=Path,
    default=Path('ml-tools/outputs/game-board-export.npz'),
    help='Path to write the .npz output.',
  )

  args = parser.parse_args()
  convert_export_to_npz(args.input, args.output)
  print(f'Wrote {args.output}')


if __name__ == '__main__':
  main()
