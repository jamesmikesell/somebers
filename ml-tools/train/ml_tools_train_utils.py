from __future__ import annotations

import random
from dataclasses import dataclass

import numpy as np
import torch


@dataclass(frozen=True)
class Metrics:
  mae: float
  rmse: float
  r2: float
  smape: float


def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Metrics:
  y_true = np.asarray(y_true, dtype=np.float64)
  y_pred = np.asarray(y_pred, dtype=np.float64)

  err = y_pred - y_true
  mae = float(np.mean(np.abs(err)))
  rmse = float(np.sqrt(np.mean(err ** 2)))

  ss_res = float(np.sum(err ** 2))
  ss_tot = float(np.sum((y_true - float(np.mean(y_true))) ** 2))
  r2 = float(1.0 - ss_res / ss_tot) if ss_tot > 0 else float('nan')

  denom = np.abs(y_true) + np.abs(y_pred)
  # Standard sMAPE in percent: mean(200 * |y - yhat| / (|y| + |yhat|)).
  # When both are 0, define the term as 0 (avoid division-by-zero).
  smape_terms = np.divide(
    200.0 * np.abs(err),
    denom,
    out=np.zeros_like(denom, dtype=np.float64),
    where=denom > 0,
  )
  smape = float(np.mean(smape_terms))

  return Metrics(mae=mae, rmse=rmse, r2=r2, smape=smape)


def seed_everything(seed: int) -> None:
  random.seed(seed)
  np.random.seed(seed)
  torch.manual_seed(seed)
  if torch.cuda.is_available():
    torch.cuda.manual_seed_all(seed)
