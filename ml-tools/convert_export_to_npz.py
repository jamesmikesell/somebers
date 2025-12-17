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
    max_height = max(max_height, height)
    max_width = max(max_width, width)

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
      goal = _as_float(cell.get('colorGroupGoal'))
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
  channel_count = 1 + max_group_number

  X = np.zeros((sample_count, channel_count, max_height, max_width), dtype=np.float32)
  y_time_spent = np.full((sample_count,), np.nan, dtype=np.float32)
  game_number = np.full((sample_count,), -1, dtype=np.int32)
  game_date_as_percent = np.full((sample_count,), np.nan, dtype=np.float32)
  height = np.zeros((sample_count,), dtype=np.int16)
  width = np.zeros((sample_count,), dtype=np.int16)
  group_number_map = np.zeros((sample_count, max_height, max_width), dtype=np.int16)
  group_goal = np.zeros((sample_count, channel_count), dtype=np.float32)

  for i, game in enumerate(games):
    full_board = game.get('fullBoard')
    if not isinstance(full_board, list):
      continue

    board_height, board_width = _board_size(full_board)
    height[i] = board_height
    width[i] = board_width

    goals_by_group = _compute_group_goals(full_board)
    for group_number, goal in goals_by_group.items():
      if 0 <= group_number < channel_count:
        group_goal[i, group_number] = goal

    for r, row in enumerate(full_board):
      if not isinstance(row, list):
        continue
      for c, cell in enumerate(row):
        if r >= max_height or c >= max_width:
          continue
        if not isinstance(cell, dict):
          continue

        value = _as_float(cell.get('value'))
        if value is not None:
          X[i, 0, r, c] = value

        group_number = _as_int(cell.get('groupNumber'))
        if group_number is not None and 0 < group_number < channel_count:
          group_number_map[i, r, c] = group_number
          goal = goals_by_group.get(group_number, 0.0)
          X[i, group_number, r, c] = float(goal)

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

  output_path.parent.mkdir(parents=True, exist_ok=True)
  np.savez_compressed(
    output_path,
    X=X,
    y_time_spent=y_time_spent,
    game_number=game_number,
    game_date_as_percent=game_date_as_percent,
    height=height,
    width=width,
    group_number_map=group_number_map,
    group_goal=group_goal,
    max_height=np.array(max_height, dtype=np.int16),
    max_width=np.array(max_width, dtype=np.int16),
    max_group_number=np.array(max_group_number, dtype=np.int16),
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

