#!/usr/bin/env python3
"""Generate a scatter plot comparing model predictions and measured solve times."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

import matplotlib.pyplot as plt
import numpy as np


def load_predictions(path: Path) -> Dict[int, Tuple[float, int]]:
    data = json.loads(path.read_text(encoding='utf-8'))
    predictions: Dict[int, Tuple[float, int]] = {}

    for entry in data:
        try:
            game_number = int(entry['gameNumber'])
            predicted_ms = float(entry['predictedMs'])
            board_size = int(entry.get('boardSize', 0))
        except (KeyError, TypeError, ValueError):
            continue

        if predicted_ms > 0:
            predictions[game_number] = (predicted_ms, board_size)

    return predictions


def load_actuals(path: Path) -> Dict[int, float]:
    data = json.loads(path.read_text(encoding='utf-8'))
    games: Iterable[dict] = data.get('inProgressGames', [])
    actuals: Dict[int, float] = {}

    for entry in games:
        if not entry.get('completed'):
            continue

        game_number = entry.get('gameNumber')
        time_spent = entry.get('timeSpent')

        if game_number is None or time_spent in (None, 0):
            continue

        try:
            actuals[int(game_number)] = float(time_spent)
        except (TypeError, ValueError):
            continue

    return actuals


def format_mm_ss(milliseconds: float) -> str:
    total_seconds = int(round(milliseconds / 1000))
    minutes, seconds = divmod(total_seconds, 60)
    return f'{minutes}:{seconds:02d}'


def log_ticks(values: Iterable[float], count: int) -> Tuple[np.ndarray, List[str]]:
    min_val = min(values)
    max_val = max(values)
    ticks = np.logspace(np.log10(min_val), np.log10(max_val), num=count)
    return ticks, [format_mm_ss(t) for t in ticks]


def plot_pairs(pairs: List[Tuple[float, float, int]], output: Path, show_plot: bool) -> None:
    if not pairs:
        raise SystemExit('No overlapping completed games found to plot.')

    predicted, actual, board_sizes = zip(*pairs)

    fig, ax = plt.subplots(figsize=(8, 6))
    unique_board_sizes = sorted(set(board_sizes))
    color_palette = {
        5: '#1f77b4',  # blue
        6: '#d62728',  # red
        7: '#2ca02c',  # green
        8: '#ffb347',  # orange yellow
        9: '#9467bd',  # purple
    }
    default_colors = plt.get_cmap('tab10', len(unique_board_sizes))
    fallback = {size: default_colors(idx) for idx, size in enumerate(unique_board_sizes)}
    size_to_color = {size: color_palette.get(size, fallback[size]) for size in unique_board_sizes}
    colors = [size_to_color[size] for size in board_sizes]

    ax.scatter(predicted, actual, c=colors, alpha=0.85, s=12, edgecolors='none')
    ax.set_xscale('log')
    ax.set_yscale('log')
    ax.set_xlabel('Predicted Solve Time (mm:ss)')
    ax.set_ylabel('Actual Solve Time (mm:ss)')
    ax.set_title('Predicted vs Actual Solve Times')

    # Reference line to highlight perfect prediction parity.
    min_val = min(min(predicted), min(actual))
    max_val = max(max(predicted), max(actual))
    ax.plot([min_val, max_val], [min_val, max_val], color='green', linewidth=1, linestyle='-')
    ax.grid(True, which='both', linestyle='--', linewidth=0.4, alpha=0.5)

    x_ticks, x_labels = log_ticks(predicted, 15)
    y_ticks, y_labels = log_ticks(actual, 15)
    ax.set_xticks(x_ticks)
    ax.set_xticklabels(x_labels, rotation=45, ha='right')
    ax.set_yticks(y_ticks)
    ax.set_yticklabels(y_labels)

    legend_handles = [
        plt.Line2D([0], [0], marker='o', color='w', label=f'Board {size}x{size}', markerfacecolor=size_to_color[size], markersize=6)
        for size in unique_board_sizes
    ]
    ax.legend(handles=legend_handles, title='Board Size', loc='best')

    fig.tight_layout()
    output.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output, dpi=200)

    if show_plot:
        plt.show()
    else:
        plt.close(fig)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        '--predictions',
        type=Path,
        default=Path('development-tools/ml-predictions-2k-games.json'),
        help='Path to ml predictions JSON.',
    )
    parser.add_argument(
        '--backup',
        type=Path,
        default=Path('development-tools/backup.json'),
        help='Path to backup JSON.',
    )
    parser.add_argument(
        '--output',
        type=Path,
        default=Path('development-tools/prediction_vs_actual_scatter.png'),
        help='Image file to write.',
    )
    parser.add_argument(
        '--show',
        action='store_true',
        help='Display the plot in addition to writing the file.',
    )

    return parser.parse_args()


def main() -> None:
    args = parse_args()
    predictions = load_predictions(args.predictions)
    actuals = load_actuals(args.backup)

    overlapping_games = sorted(set(predictions) & set(actuals))
    pairs = [(predictions[gid][0], actuals[gid], predictions[gid][1]) for gid in overlapping_games]

    if not pairs:
        raise SystemExit('No overlapping completed games found to plot.')

    plot_pairs(pairs, args.output, args.show)
    print(f'Wrote scatter plot for {len(pairs)} games to {args.output}')


if __name__ == '__main__':
    main()
