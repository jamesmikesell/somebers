from __future__ import annotations

import random
from dataclasses import dataclass

import numpy as np

from ml_tools_train_data import NpzDataset


@dataclass(frozen=True)
class Fold:
  train_indices: list[int]
  val_indices: list[int]


def make_folds(dataset: NpzDataset, split: str, k: int, val_fraction: float, seed: int) -> list[Fold]:
  n = dataset.sample_count
  indices = list(range(n))

  if split == 'time':
    if not (0.0 < val_fraction < 1.0):
      raise ValueError('val_fraction must be in (0,1).')
    order = np.argsort(dataset.game_date_as_percent, kind='mergesort').tolist()
    cut = int(round(n * (1.0 - val_fraction)))
    train = [int(i) for i in order[:cut]]
    val = [int(i) for i in order[cut:]]
    return [Fold(train_indices=train, val_indices=val)]

  if split != 'kfold':
    raise ValueError(f'Unknown split: {split}')

  if k < 2:
    raise ValueError('k must be >= 2')

  rng = random.Random(seed)
  rng.shuffle(indices)

  folds: list[Fold] = []
  for fold_idx in range(k):
    val = [indices[i] for i in range(n) if i % k == fold_idx]
    train = [indices[i] for i in range(n) if i % k != fold_idx]
    folds.append(Fold(train_indices=train, val_indices=val))

  return folds

