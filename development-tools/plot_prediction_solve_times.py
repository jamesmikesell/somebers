#!/usr/bin/env python3
"""Plot solve-time distributions per board size from ML prediction data."""

from __future__ import annotations

import argparse
import json
import math
from collections import defaultdict
from pathlib import Path
from statistics import quantiles
from typing import Dict, Iterable, List

try:
  import matplotlib
  matplotlib.use('Agg')
  import matplotlib.pyplot as plt
  from matplotlib.ticker import FuncFormatter
except ModuleNotFoundError as exc:
  raise SystemExit(
      'matplotlib is required. Install it with "pip install matplotlib" and rerun.'
  ) from exc


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(
      description=(
          'Generate a percent-per-bin solve time plot per board size using '
          'development-tools/ml-predictions-10k-games.json data.'
      )
  )
  parser.add_argument(
      'json_path',
      nargs='?',
      default='development-tools/ml-predictions-10k-games.json',
      help='Path to the ML prediction JSON data.',
  )
  parser.add_argument(
      '--output',
      type=Path,
      default=Path('development-tools/ml-prediction-solve-times.png'),
      help='Where to write the PNG plot.',
  )
  parser.add_argument(
      '--bin-size',
      type=float,
      default=None,
      help='Fixed bin width in seconds. If omitted, each board size picks '
      'its own bin width using the Freedman-Diaconis rule.',
  )
  parser.add_argument(
      '--min-bins',
      type=int,
      default=5,
      help='Minimum number of bins to use when auto-selecting bin widths.',
  )
  parser.add_argument(
      '--max-bins',
      type=int,
      default=80,
      help='Maximum number of bins to use when auto-selecting bin widths.',
  )
  parser.add_argument(
      '--max-seconds',
      type=float,
      default=None,
      help='Optional cap on solve times (drop samples above this threshold).',
  )
  parser.add_argument(
      '--min-seconds',
      type=float,
      default=None,
      help='Optional floor on solve times (drop samples below this threshold).',
  )
  parser.add_argument(
      '--figsize',
      type=float,
      nargs=2,
      metavar=('WIDTH', 'HEIGHT'),
      default=(10.0, 6.0),
      help='Matplotlib figure size in inches.',
  )
  parser.add_argument(
      '--dpi',
      type=int,
      default=150,
      help='Output resolution for the saved PNG.',
  )
  return parser.parse_args()


def load_predictions(path: Path) -> List[dict]:
  with path.open('r', encoding='utf-8') as fh:
    return json.load(fh)


def bin_edges(min_value: float, max_value: float, bin_size: float) -> List[float]:
  if bin_size <= 0:
    raise ValueError('bin_size must be positive')
  start = math.floor(min_value / bin_size) * bin_size
  stop = math.ceil(max_value / bin_size) * bin_size
  bins = [start]
  current = start
  while current < stop:
    current += bin_size
    bins.append(current)
  return bins


def histogram(values: Iterable[float], bins: List[float]) -> List[int]:
  counts = [0 for _ in range(len(bins) - 1)]
  bin_size = bins[1] - bins[0]
  for value in values:
    if value < bins[0]:
      continue
    if value >= bins[-1]:
      counts[-1] += 1
      continue
    idx = int((value - bins[0]) // bin_size)
    counts[idx] += 1
  return counts


def format_duration(seconds: float) -> str:
  if seconds <= 0 or not math.isfinite(seconds):
    return ''
  total_seconds = int(round(seconds))
  minutes, secs = divmod(total_seconds, 60)
  hours, minutes = divmod(minutes, 60)
  if hours:
    return f'{hours}:{minutes:02d}:{secs:02d}'
  return f'{minutes}:{secs:02d}'


def freedman_diaconis_bin_size(values: List[float]) -> float:
  if len(values) < 2:
    return 0.0
  try:
    q1, _, q3 = quantiles(values, n=4, method='inclusive')
  except ValueError:
    return 0.0
  iqr = q3 - q1
  if iqr <= 0:
    return 0.0
  return 2 * iqr / (len(values) ** (1 / 3))


def choose_bins(
    values: List[float], min_bins: int, max_bins: int, fixed_bin_size: float | None
) -> List[float]:
  min_value = min(values)
  max_value = max(values)
  if max_value == min_value:
    delta = max(1.0, max_value * 0.05 or 1.0)
    min_value -= delta / 2
    max_value += delta / 2
  span = max_value - min_value

  if fixed_bin_size:
    return bin_edges(min_value, max_value, fixed_bin_size)

  auto_size = freedman_diaconis_bin_size(values)
  if auto_size <= 0 or math.isnan(auto_size):
    approx_bins = max(min_bins, 1)
  else:
    approx_bins = span / auto_size if auto_size else min_bins
    approx_bins = max(min_bins, min(max_bins, int(round(approx_bins)) or min_bins))

  bin_width = span / approx_bins
  return bin_edges(min_value, max_value, bin_width)


def main() -> None:
  args = parse_args()
  predictions = load_predictions(Path(args.json_path))

  times_by_board: Dict[int, List[float]] = defaultdict(list)
  for entry in predictions:
    seconds = entry['predictedMs'] / 1000.0
    if args.min_seconds is not None and seconds < args.min_seconds:
      continue
    if args.max_seconds is not None and seconds > args.max_seconds:
      continue
    times_by_board[entry['boardSize']].append(seconds)

  if not times_by_board:
    raise SystemExit('No samples left after filtering; nothing to plot.')

  all_values = [value for values in times_by_board.values() for value in values]
  total_samples = len(all_values)
  plt.figure(figsize=args.figsize, dpi=args.dpi)
  for board_size in sorted(times_by_board.keys()):
    values = times_by_board[board_size]
    bins = choose_bins(values, args.min_bins, args.max_bins, args.bin_size)
    bin_size = bins[1] - bins[0]
    midpoints = [bins[i] + (bin_size / 2.0) for i in range(len(bins) - 1)]
    counts = histogram(values, bins)
    percentages = [(count / total_samples) * 100.0 for count in counts]
    plt.plot(midpoints, percentages, label=f'{board_size}x{board_size}')

  ax = plt.gca()
  ax.set_xscale('log')
  ax.xaxis.set_major_formatter(FuncFormatter(lambda value, _: format_duration(value)))
  ax.xaxis.set_major_locator(
      matplotlib.ticker.LogLocator(base=10, subs=tuple(float(i) for i in range(1, 10)), numticks=200)
  )
  ax.xaxis.set_minor_locator(matplotlib.ticker.LogLocator(base=10, subs='auto'))
  for label in ax.get_xticklabels():
    label.set_rotation(45)
    label.set_ha('right')
    label.set_fontsize(8)
  ax.yaxis.set_major_locator(matplotlib.ticker.MaxNLocator(10))
  ax.yaxis.set_minor_locator(matplotlib.ticker.AutoMinorLocator(2))
  ax.set_ylim(bottom=-0.1)
  plt.xlabel('Predicted solve time (seconds)')
  plt.ylabel('Percent of boards in bin')
  plt.title('Predicted solve-time distribution by board size')
  ax.grid(True, which='major', linestyle='--', alpha=0.5)
  plt.legend(title='Board Size')
  plt.tight_layout()

  output_path = args.output
  output_path.parent.mkdir(parents=True, exist_ok=True)
  plt.savefig(output_path)
  print(f'Wrote {output_path}')


if __name__ == '__main__':
  main()
