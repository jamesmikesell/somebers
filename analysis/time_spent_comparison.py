#!/usr/bin/env python3
"""Compare timeSpent values between backup snapshots, normalize, and plot."""

from __future__ import annotations

import argparse
import copy
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Dict, List, Sequence, Tuple, Union

import matplotlib.pyplot as plt
import numpy as np


JsonType = Union[dict, list, int, float, str, None]


@dataclass(frozen=True)
class GameRecord:
  game_number: int
  time_spent: float


def extract_time_spent(node: JsonType) -> List[GameRecord]:
  """Recursively search for objects that expose gameNumber and timeSpent."""
  records: List[GameRecord] = []

  def walk(value: JsonType) -> None:
    if isinstance(value, dict):
      if (
          'gameNumber' in value
          and 'timeSpent' in value
          and value.get('timeSpent') > 9000
          and value.get('completed') is True
      ):
        game_number = value['gameNumber']
        time_spent = value['timeSpent']
        if isinstance(game_number, int) and isinstance(time_spent, (int, float)):
          records.append(GameRecord(game_number, float(time_spent)))
      for child in value.values():
        walk(child)
    elif isinstance(value, list):
      for item in value:
        walk(item)

  walk(node)
  return records


def load_game_map(path: Path) -> Dict[int, float]:
  data = json.loads(path.read_text())
  game_map: Dict[int, float] = {}
  duplicates: Dict[int, List[float]] = {}

  for record in extract_time_spent(data):
    previous = game_map.get(record.game_number)
    if previous is None:
      game_map[record.game_number] = record.time_spent
    elif not np.isclose(previous, record.time_spent):
      duplicates.setdefault(record.game_number, [previous]).append(record.time_spent)

  if duplicates:
    duplicate_info = ', '.join(
        f'{game_number} (values: {values})' for game_number, values in sorted(duplicates.items())
    )
    print(f'Warning: conflicting timeSpent values encountered for gameNumbers: {duplicate_info}')

  return game_map


def compute_power_law_fit(x: np.ndarray, y: np.ndarray) -> Tuple[float, float]:
  """Return multiplicative constant a and exponent b for y = a * x ** b."""
  if np.any(x <= 0) or np.any(y <= 0):
    raise ValueError('Power-law regression requires strictly positive samples.')
  log_x = np.log(x)
  log_y = np.log(y)
  if log_x.size < 2:
    raise ValueError('Need at least two samples to compute a power-law fit.')
  slope, intercept = np.polyfit(log_x, log_y, 1)
  a = float(np.exp(intercept))
  b = float(slope)
  return a, b


def compute_log_polynomial_fit(x: np.ndarray, y: np.ndarray, degree: int) -> np.ndarray:
  """Return polynomial coefficients for log(y) ~ poly(log(x)) of given degree."""
  if degree < 1:
    raise ValueError('Polynomial degree must be at least 1.')
  if np.any(x <= 0) or np.any(y <= 0):
    raise ValueError('Log-space regression requires strictly positive samples.')
  log_x = np.log(x)
  log_y = np.log(y)
  if log_x.size <= degree:
    raise ValueError('Not enough samples to fit the requested polynomial degree.')
  return np.polyfit(log_x, log_y, degree)


def compute_power_law_inverse(values: np.ndarray, a: float, b: float) -> np.ndarray:
  """Return inverse of power-law mapping for y = a * x ** b."""
  values_arr = np.asarray(values, dtype=float)
  if values_arr.size == 0:
    return values_arr
  if abs(b) < 1e-6:
    # When b is ~0, treat mapping as approximately linear in y around a.
    safe_a = a if abs(a) > 1e-12 else 1e-12
    return values_arr / safe_a
  return np.power(values_arr / a, 1.0 / b)


def invert_log_polynomial(
    values: np.ndarray,
    coeffs: np.ndarray,
    initial_log_x: np.ndarray,
    fallback: np.ndarray,
    max_iter: int = 50,
    tolerance: float = 1e-10,
) -> np.ndarray:
  """Invert log-space polynomial mapping to recover x for given y."""
  values_arr = np.asarray(values, dtype=float)
  if np.any(values_arr <= 0):
    raise ValueError('Polynomial inversion requires strictly positive values.')
  fallback_arr = np.asarray(fallback, dtype=float)
  if fallback_arr.shape != values_arr.shape:
    raise ValueError('Fallback values must match the shape of input values.')
  log_values = np.log(values_arr)
  derivative_coeffs = np.polyder(coeffs)
  log_x = np.array(initial_log_x, dtype=float, copy=True)
  if log_x.shape != values_arr.shape:
    raise ValueError('Initial guesses must match the shape of values.')

  for _ in range(max_iter):
    poly_val = np.polyval(coeffs, log_x)
    residual = poly_val - log_values
    if np.max(np.abs(residual)) < tolerance:
      break
    derivative = np.polyval(derivative_coeffs, log_x)
    small_derivative = np.abs(derivative) < 1e-12
    derivative = np.where(small_derivative, np.where(derivative < 0, -1e-12, 1e-12), derivative)
    log_x -= residual / derivative

  result = np.exp(log_x)
  invalid_mask = (~np.isfinite(result)) | (result <= 0)
  if np.any(invalid_mask):
    result = result.copy()
    result[invalid_mask] = fallback_arr[invalid_mask]
  return result


def identify_power_law_outliers(
    x: np.ndarray, y: np.ndarray, a: float, b: float, threshold: float = 3.5
) -> np.ndarray:
  """Return boolean mask for points treated as outliers in log-log space."""
  log_x = np.log(x)
  log_y = np.log(y)
  residuals = log_y - (np.log(a) + b * log_x)
  median = np.median(residuals)
  mad = np.median(np.abs(residuals - median))
  if mad == 0:
    return np.zeros_like(residuals, dtype=bool)
  modified_z = 0.6745 * (residuals - median) / mad
  return np.abs(modified_z) > threshold


def plot_data(
    x: np.ndarray,
    y: np.ndarray,
    trend_func: Callable[[np.ndarray], np.ndarray],
    trend_label: str,
    destination: Path,
    metadata: str,
    outlier_mask: np.ndarray | None = None,
    show_identity: bool = False,
) -> None:
  if np.any(x <= 0) or np.any(y <= 0):
    raise ValueError('Log-scale plots require strictly positive timeSpent values.')
  destination.parent.mkdir(parents=True, exist_ok=True)
  x_line = np.linspace(x.min(), x.max(), 500)
  y_line = trend_func(x_line)

  plt.figure(figsize=(10, 6))
  if outlier_mask is None:
    plt.scatter(x, y, label='timeSpent pairs', alpha=0.7, s=15)
  else:
    inlier_mask = ~outlier_mask
    if np.any(inlier_mask):
      plt.scatter(x[inlier_mask], y[inlier_mask], label='inliers', alpha=0.7, s=15)
    if np.any(outlier_mask):
      plt.scatter(
          x[outlier_mask],
          y[outlier_mask],
          label='removed outliers',
          alpha=0.9,
          s=25,
          color='red',
          edgecolors='black',
          linewidths=0.3,
      )
  plt.plot(x_line, y_line, color='red', linewidth=2, label=trend_label)
  if show_identity:
    plt.plot(x_line, x_line, color='green', linestyle=':', linewidth=1, label='reference: y = x')
  plt.xlabel('timeSpent (backup.0)')
  plt.ylabel('timeSpent (backup.1)')
  plt.title('timeSpent comparison (log-log scale)')
  plt.xscale('log')
  plt.yscale('log')
  plt.grid(True, alpha=0.3)
  plt.legend()
  plt.figtext(0.5, -0.02, metadata, ha='center', fontsize=8)
  plt.tight_layout()
  plt.savefig(destination, dpi=150, bbox_inches='tight')
  plt.close()


def normalize_backup_times(
    source: Path, destination: Path, transform: Callable[[float], float]
) -> JsonType:
  data = json.loads(source.read_text(encoding='utf-8'))

  def normalize(node: JsonType) -> None:
    if isinstance(node, dict):
      for key, value in node.items():
        if key == 'timeSpent' and isinstance(value, (int, float)):
          normalized = transform(float(value))
          node[key] = int(round(normalized)) if isinstance(value, int) else normalized
        else:
          normalize(value)
    elif isinstance(node, list):
      for item in node:
        normalize(item)

  normalize(data)
  destination.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')
  return data


def main(argv: Sequence[str] | None = None) -> None:
  parser = argparse.ArgumentParser(
      description='Compare timeSpent values between backups and visualize power-law trends.'
  )
  parser.add_argument(
      '--trend-polynomial-degree',
      type=int,
      default=1,
      help=(
          'Degree for the log-log polynomial drawn as the trend line '
          '(1 keeps the traditional power-law line).'
      ),
  )
  args = parser.parse_args(argv)
  trend_degree = args.trend_polynomial_degree
  if trend_degree < 1:
    raise ValueError('trend-polynomial-degree must be at least 1.')

  repo_root = Path(__file__).resolve().parent.parent
  backup0_path = repo_root / 'development-tools' / 'backup.0.json'
  backup1_path = repo_root / 'development-tools' / 'backup.1.json'

  game_map_0 = load_game_map(backup0_path)
  game_map_1 = load_game_map(backup1_path)

  shared_game_numbers = sorted(set(game_map_0) & set(game_map_1))
  if not shared_game_numbers:
    raise RuntimeError('No matching gameNumber entries were found between the backups.')

  x = np.array([game_map_0[num] for num in shared_game_numbers], dtype=float)
  y = np.array([game_map_1[num] for num in shared_game_numbers], dtype=float)

  initial_a, initial_b = compute_power_law_fit(x, y)
  outlier_mask = identify_power_law_outliers(x, y, initial_a, initial_b)
  inlier_mask = ~outlier_mask
  inlier_count = int(np.count_nonzero(inlier_mask))
  if inlier_count < 2:
    raise ValueError('Insufficient inliers after outlier removal to compute trend line.')

  forward_a, forward_b = compute_power_law_fit(x[inlier_mask], y[inlier_mask])
  forward_transform = lambda values: forward_a * np.power(values, forward_b)

  def power_law_inverse(values: np.ndarray) -> np.ndarray:
    values_arr = np.asarray(values, dtype=float)
    return compute_power_law_inverse(values_arr, forward_a, forward_b)

  polynomial_coeffs: np.ndarray | None = None
  if trend_degree == 1:
    trend_transform = forward_transform
    forward_label = f'power-law fit: y = {forward_a:.2f} * x^{forward_b:.3f}'

    def inverse_vector(values: np.ndarray) -> np.ndarray:
      return power_law_inverse(values)

  else:
    polynomial_coeffs = compute_log_polynomial_fit(x[inlier_mask], y[inlier_mask], trend_degree)

    def polynomial_forward(values: np.ndarray) -> np.ndarray:
      values_arr = np.asarray(values, dtype=float)
      if np.any(values_arr <= 0):
        raise ValueError('Trend evaluation requires strictly positive values.')
      return np.exp(np.polyval(polynomial_coeffs, np.log(values_arr)))

    def polynomial_inverse(values: np.ndarray) -> np.ndarray:
      values_arr = np.asarray(values, dtype=float)
      fallback = power_law_inverse(values_arr)
      fallback_safe = np.clip(fallback, 1e-12, None)
      initial_log = np.log(fallback_safe)
      return invert_log_polynomial(values_arr, polynomial_coeffs, initial_log, fallback_safe)

    trend_transform = polynomial_forward
    degree = len(polynomial_coeffs) - 1
    poly_terms: List[str] = []
    for index, coeff in enumerate(polynomial_coeffs):
      power = degree - index
      if power == 0:
        term = f'{coeff:.3f}'
      elif power == 1:
        term = f'{coeff:.3f} * log(x)'
      else:
        term = f'{coeff:.3f} * log(x)^{power}'
      poly_terms.append(term)
    forward_label = (
        f'log-log poly fit (degree {trend_degree}): log(y) = ' + ' + '.join(poly_terms)
    )
    inverse_vector = polynomial_inverse

  normalized_values = inverse_vector(y)

  def inverse_scalar(value: float) -> float:
    return float(inverse_vector(np.array([value], dtype=float))[0])

  output_path = repo_root / 'analysis' / 'time_spent_comparison.png'
  metadata = (
      f'matched games: {len(shared_game_numbers)} | '
      f'backup0 range: {x.min():.0f}-{x.max():.0f} | '
      f'backup1 range: {y.min():.0f}-{y.max():.0f} | '
      f'a={forward_a:.2f}, b={forward_b:.3f} | '
      f'trend degree: {trend_degree} | '
      f'outliers removed: {int(np.count_nonzero(outlier_mask))}'
  )
  plot_data(
      x,
      y,
      trend_transform,
      forward_label,
      output_path,
      metadata,
      outlier_mask,
      show_identity=True,
  )

  print(f'Matched gameNumbers: {len(shared_game_numbers)}')
  print(f'Plot saved to: {output_path.relative_to(repo_root)}')
  print('Power-law coefficients (y = a * x ** b) computed on inliers:')
  print(np.array([forward_a, forward_b]))
  if polynomial_coeffs is not None:
    print(f'Log-space polynomial coefficients (degree {trend_degree}):')
    print(polynomial_coeffs)
    print('Inverse mapping uses iterative inversion of the log-polynomial fit.')
  else:
    print('Inverse mapping formula (backup.1 -> backup.0): x = (y / a) ** (1 / b)')
  print(f'Inliers used: {inlier_count} / {len(x)}')
  normalized_a, normalized_b = compute_power_law_fit(x[inlier_mask], normalized_values[inlier_mask])
  normalized_label = f'power-law fit: y = {normalized_a:.2f} * x^{normalized_b:.3f}'

  normalized_output_path = repo_root / 'analysis' / 'time_spent_normalized_comparison.png'
  normalized_metadata = (
      f'normalized range: {normalized_values.min():.0f}-{normalized_values.max():.0f} | '
      f'a={normalized_a:.2f}, b={normalized_b:.3f}'
  )
  plot_data(
      x,
      normalized_values,
      lambda values: normalized_a * np.power(values, normalized_b),
      normalized_label,
      normalized_output_path,
      normalized_metadata,
      outlier_mask,
  )
  print(f'Normalized comparison plot saved to: {normalized_output_path.relative_to(repo_root)}')

  normalized_path = backup1_path.with_name(f'{backup1_path.stem}.normalized.json')
  normalized_backup = normalize_backup_times(
      backup1_path,
      normalized_path,
      inverse_scalar,
  )
  print(f'Normalized backup written to: {normalized_path.relative_to(repo_root)}')

  combined_path = backup0_path.with_name('backup.combined.json')
  combined_backup = json.loads(backup0_path.read_text(encoding='utf-8'))
  normalized_games = normalized_backup.get('inProgressGames', []) if isinstance(normalized_backup, dict) else []
  if normalized_games:
    combined_in_progress = combined_backup.setdefault('inProgressGames', [])
    combined_in_progress.extend(copy.deepcopy(normalized_games))
  combined_path.write_text(json.dumps(combined_backup, indent=2) + '\n', encoding='utf-8')
  print(f'Combined backup written to: {combined_path.relative_to(repo_root)} (appended normalized inProgressGames)')


if __name__ == '__main__':
  main()
