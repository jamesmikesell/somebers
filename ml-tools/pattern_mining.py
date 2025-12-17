#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable

import numpy as np


def _classify_subset_roles(values: list[int], target: int) -> dict[str, object]:
  # Dynamic programming over reachable sums limited to target; assumes non-negative ints.
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
    return {
      'solutions_exist': False,
      'always': [],
      'never': list(range(n)),
      'optional': [],
      'example': [],
    }

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
    can_without = False
    for s in fwd[i]:
      rem = target - s
      if rem in bwd[i + 1]:
        can_without = True
        break
    can_with = False
    for s in fwd[i]:
      rem = target - v - s
      if rem >= 0 and rem in bwd[i + 1]:
        can_with = True
        break
    if can_with and not can_without:
      always.append(i)
    elif not can_with:
      never.append(i)
    else:
      optional.append(i)

  example: list[int] = []
  remaining = target
  for i, v in enumerate(values):
    if remaining in bwd[i + 1]:
      continue
    if remaining - v in bwd[i + 1]:
      example.append(i)
      remaining -= v

  return {
    'solutions_exist': True,
    'always': always,
    'never': never,
    'optional': optional,
    'example': example,
  }


def _first_nonzero(arr: np.ndarray) -> float | None:
  nz = arr[np.abs(arr) > 0]
  if nz.size == 0:
    return None
  return float(nz.flatten()[0])


def _role_map_for_mask(base: np.ndarray, base_mask: np.ndarray, region_mask: np.ndarray, target: float) -> dict[str, object]:
  coords = list(zip(*np.where(region_mask > 0)))
  values: list[int] = []
  coord_list: list[tuple[int, int]] = []
  for r, c in coords:
    if base_mask[r, c] <= 0:
      continue
    v = base[r, c]
    if not np.isfinite(v) or v == 0.0:
      continue
    values.append(int(round(float(v))))
    coord_list.append((int(r), int(c)))

  if not values or target is None:
    return {'solutions_exist': False, 'always': [], 'never': [], 'optional': [], 'example': [], 'role_map': []}

  target_int = int(round(float(target)))
  roles = _classify_subset_roles(values, target_int)

  role_map = np.zeros_like(base, dtype=np.int8)
  for idx in roles['always']:
    r, c = coord_list[idx]
    role_map[r, c] = 2  # always required
  for idx in roles['never']:
    r, c = coord_list[idx]
    role_map[r, c] = 3  # never used
  for idx in roles['optional']:
    r, c = coord_list[idx]
    role_map[r, c] = 1  # optional

  return {**roles, 'role_map': role_map.tolist(), 'coord_list': coord_list, 'target': target_int}


def analyze_sample(path: Path, index: int) -> dict[str, object]:
  data = np.load(path, allow_pickle=False)
  X = data['X']
  X_mask = data['X_mask'] if 'X_mask' in data else np.isfinite(X).astype(np.float32)
  base = X[index, 0]
  base_mask = X_mask[index, 0]
  h = int(data['height'][index])
  w = int(data['width'][index])
  base = base[:h, :w]
  base_mask = base_mask[:h, :w]

  group_number_map = data['group_number_map'][index, :h, :w]
  group_goal = data['group_goal'][index]
  max_group_number = int(data['max_group_number']) if 'max_group_number' in data else int(group_goal.shape[0] - 1)

  col_start = int(data['column_header_channel_start']) if 'column_header_channel_start' in data else int(data['column_header_channel_index'])
  col_count = int(data['column_header_channel_count']) if 'column_header_channel_count' in data else 1
  row_start = int(data['row_header_channel_start']) if 'row_header_channel_start' in data else int(data['row_header_channel_index'])
  row_count = int(data['row_header_channel_count']) if 'row_header_channel_count' in data else 1

  results: dict[str, object] = {'groups': [], 'columns': [], 'rows': []}

  # Groups
  for g in range(1, max_group_number + 1):
    mask = (group_number_map == g).astype(np.float32)
    if np.count_nonzero(mask) == 0:
      continue
    target = float(group_goal[g]) if g < len(group_goal) else None
    res = _role_map_for_mask(base, base_mask, mask, target)
    res['id'] = g
    results['groups'].append(res)

  # Columns
  for offset in range(col_count):
    ch = X[index, col_start + offset, :h, :w]
    ch_mask = X_mask[index, col_start + offset, :h, :w]
    if np.count_nonzero(ch_mask) == 0:
      continue
    target = _first_nonzero(ch)
    res = _role_map_for_mask(base, base_mask, ch_mask, target)
    res['id'] = offset
    results['columns'].append(res)

  # Rows
  for offset in range(row_count):
    ch = X[index, row_start + offset, :h, :w]
    ch_mask = X_mask[index, row_start + offset, :h, :w]
    if np.count_nonzero(ch_mask) == 0:
      continue
    target = _first_nonzero(ch)
    res = _role_map_for_mask(base, base_mask, ch_mask, target)
    res['id'] = offset
    results['rows'].append(res)

  return results


def main() -> None:
  parser = argparse.ArgumentParser(description='Mine subset roles (always/never/optional) under masks for a sample.')
  parser.add_argument('--input', type=Path, required=True, help='Path to .npz file.')
  parser.add_argument('--index', type=int, default=0, help='Sample index to analyze.')
  parser.add_argument('--out', type=Path, default=Path('ml-tools/outputs/pattern_roles.json'), help='Where to write JSON summary.')
  args = parser.parse_args()

  summary = analyze_sample(args.input, args.index)
  args.out.parent.mkdir(parents=True, exist_ok=True)
  args.out.write_text(json.dumps(summary, indent=2), encoding='utf-8')
  print(f'Wrote {args.out}')


if __name__ == '__main__':
  main()
