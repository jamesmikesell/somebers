from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import torch
from torch.utils.data import DataLoader, Dataset


@dataclass(frozen=True)
class BuiltFeatures:
  board: np.ndarray  # float32 (N,C,H,W)
  board_mask: np.ndarray  # float32 (N,C,H,W)
  globals_vec: np.ndarray  # float32 (N,G)
  target: np.ndarray  # float32 (N,)


class NpzDataset:
  def __init__(self, path: Path):
    self.path = path
    self._data = np.load(path, allow_pickle=False)
    self.X = self._data['X'].astype(np.float32, copy=False)
    self.X_mask = (
      self._data['X_mask'].astype(np.float32, copy=False) if 'X_mask' in self._data else np.isfinite(self.X).astype(np.float32)
    )
    self.y_time_spent = self._data['y_time_spent'].astype(np.float32, copy=False)
    self.game_date_as_percent = self._data['game_date_as_percent'].astype(np.float32, copy=False)
    self.height = self._data['height'].astype(np.float32, copy=False)
    self.width = self._data['width'].astype(np.float32, copy=False)
    self.group_number_map = self._data['group_number_map'].astype(np.int16, copy=False)
    self.group_goal = self._data['group_goal'].astype(np.float32, copy=False)
    self.group_goal_mask = (
      self._data['group_goal_mask'].astype(np.float32, copy=False)
      if 'group_goal_mask' in self._data
      else np.isfinite(self.group_goal).astype(np.float32)
    )
    self.group_role_map = self._data['group_role_map'].astype(np.int8, copy=False) if 'group_role_map' in self._data else None
    self.column_role_map = self._data['column_role_map'].astype(np.int8, copy=False) if 'column_role_map' in self._data else None
    self.row_role_map = self._data['row_role_map'].astype(np.int8, copy=False) if 'row_role_map' in self._data else None
    self.sample_count = int(self.X.shape[0])
    self.max_groups = int(self._data['max_group_number']) if 'max_group_number' in self._data else int(self.group_goal.shape[1] - 1)
    self.group_channel_count = 1 + self.max_groups
    self.column_header_channel_start = int(self._data['column_header_channel_start']) if 'column_header_channel_start' in self._data else int(self._data['column_header_channel_index']) if 'column_header_channel_index' in self._data else self.group_channel_count
    self.column_header_channel_count = int(self._data['column_header_channel_count']) if 'column_header_channel_count' in self._data else 1
    self.row_header_channel_start = int(self._data['row_header_channel_start']) if 'row_header_channel_start' in self._data else int(self._data['row_header_channel_index']) if 'row_header_channel_index' in self._data else (self.group_channel_count + self.column_header_channel_count)
    self.row_header_channel_count = int(self._data['row_header_channel_count']) if 'row_header_channel_count' in self._data else 1
    self.board_height = int(self.X.shape[2])
    self.board_width = int(self.X.shape[3])


def _group_goal_map(group_number_map: np.ndarray, group_goal: np.ndarray) -> np.ndarray:
  # group_number_map: (H,W) int16; group_goal: (C,) float32 where index == groupNumber
  return group_goal[group_number_map.astype(np.int64)]


def _mask_channels(group_number_map: np.ndarray, max_groups: int) -> np.ndarray:
  # returns (max_groups, H, W) float32
  H, W = group_number_map.shape
  out = np.zeros((max_groups, H, W), dtype=np.float32)
  for g in range(1, max_groups + 1):
    out[g - 1] = (group_number_map == g).astype(np.float32)
  return out


def build_features_for_indices(dataset: NpzDataset, indices: list[int], variant: str) -> BuiltFeatures:
  X = dataset.X[indices]  # (N,C,H,W)
  X_mask = dataset.X_mask[indices]  # (N,C,H,W)
  y = dataset.y_time_spent[indices]  # (N,)
  date_pct = dataset.game_date_as_percent[indices]
  h = dataset.height[indices]
  w = dataset.width[indices]
  group_number_map = dataset.group_number_map[indices]  # (N,H,W)
  group_goal = dataset.group_goal[indices]  # (N,C)
  group_goal_mask = dataset.group_goal_mask[indices]  # (N,C)

  # Normalize height/width to roughly 0..1 (post-header-extraction max is 9x9).
  max_dim = float(max(dataset.board_height, dataset.board_width, 1))
  h_norm = (h / max_dim).astype(np.float32)
  w_norm = (w / max_dim).astype(np.float32)

  globals_list: list[np.ndarray] = [date_pct.reshape(-1, 1), h_norm.reshape(-1, 1), w_norm.reshape(-1, 1)]

  if variant == 'goal_channels':
    board = X
    board_mask = X_mask
  elif variant == 'goal_channels_plus_goalmap':
    goal_maps = np.stack([_group_goal_map(group_number_map[i], group_goal[i]) for i in range(len(indices))], axis=0)
    goal_map_mask = np.stack([_group_goal_map(group_number_map[i], group_goal_mask[i]) for i in range(len(indices))], axis=0)
    goal_maps = goal_maps[:, None, :, :].astype(np.float32)
    goal_map_mask = goal_map_mask[:, None, :, :].astype(np.float32)
    goal_maps = goal_maps * goal_map_mask
    board = np.concatenate([X, goal_maps], axis=1)
    board_mask = np.concatenate([X_mask, goal_map_mask], axis=1)
  elif variant == 'value_plus_goalmap':
    value = X[:, 0:1, :, :]
    col_hdr = X[:, dataset.column_header_channel_start:dataset.column_header_channel_start + dataset.column_header_channel_count, :, :]
    row_hdr = X[:, dataset.row_header_channel_start:dataset.row_header_channel_start + dataset.row_header_channel_count, :, :]
    goal_maps = np.stack([_group_goal_map(group_number_map[i], group_goal[i]) for i in range(len(indices))], axis=0)
    goal_map_mask = np.stack([_group_goal_map(group_number_map[i], group_goal_mask[i]) for i in range(len(indices))], axis=0)
    goal_maps = goal_maps[:, None, :, :].astype(np.float32)
    goal_map_mask = goal_map_mask[:, None, :, :].astype(np.float32)
    goal_maps = goal_maps * goal_map_mask
    board = np.concatenate([value, col_hdr, row_hdr, goal_maps], axis=1)
    value_mask = X_mask[:, 0:1, :, :]
    col_mask = X_mask[:, dataset.column_header_channel_start:dataset.column_header_channel_start + dataset.column_header_channel_count, :, :]
    row_mask = X_mask[:, dataset.row_header_channel_start:dataset.row_header_channel_start + dataset.row_header_channel_count, :, :]
    board_mask = np.concatenate([value_mask, col_mask, row_mask, goal_map_mask], axis=1)
  elif variant == 'mask_channels_plus_goalvec':
    value = X[:, 0:1, :, :]
    col_hdr = X[:, dataset.column_header_channel_start:dataset.column_header_channel_start + dataset.column_header_channel_count, :, :]
    row_hdr = X[:, dataset.row_header_channel_start:dataset.row_header_channel_start + dataset.row_header_channel_count, :, :]
    masks = np.stack([_mask_channels(group_number_map[i], dataset.max_groups) for i in range(len(indices))], axis=0)
    board = np.concatenate([value, col_hdr, row_hdr, masks], axis=1)
    value_mask = X_mask[:, 0:1, :, :]
    col_mask = X_mask[:, dataset.column_header_channel_start:dataset.column_header_channel_start + dataset.column_header_channel_count, :, :]
    row_mask = X_mask[:, dataset.row_header_channel_start:dataset.row_header_channel_start + dataset.row_header_channel_count, :, :]
    mask_mask = np.ones_like(masks, dtype=np.float32)
    board_mask = np.concatenate([value_mask, col_mask, row_mask, mask_mask], axis=1)
    # Append the per-group goal vector (excluding index 0) as global features.
    globals_list.append(np.nan_to_num(group_goal[:, 1:], nan=0.0).astype(np.float32))
    globals_list.append(group_goal_mask[:, 1:].astype(np.float32))
  else:
    raise ValueError(f'Unknown feature variant: {variant}')

  board = np.nan_to_num(board, nan=0.0).astype(np.float32, copy=False)
  board_mask = board_mask.astype(np.float32, copy=False)
  globals_vec = np.nan_to_num(np.concatenate(globals_list, axis=1), nan=0.0).astype(np.float32)
  return BuiltFeatures(
    board=board,
    board_mask=board_mask,
    globals_vec=globals_vec,
    target=y.astype(np.float32, copy=False),
  )


class _TorchDataset(Dataset):
  def __init__(self, features: BuiltFeatures, augment: bool):
    self.board = features.board
    self.globals_vec = features.globals_vec
    self.target = features.target
    self.augment = augment

  def __len__(self) -> int:
    return int(self.board.shape[0])

  def __getitem__(self, idx: int):
    board = torch.from_numpy(self.board[idx]).to(dtype=torch.float32)
    globals_vec = torch.from_numpy(self.globals_vec[idx]).to(dtype=torch.float32)
    y = torch.tensor(self.target[idx], dtype=torch.float32)

    if self.augment:
      k = int(torch.randint(0, 4, ()).item())
      if k:
        board = torch.rot90(board, k=k, dims=(-2, -1))
      if bool(torch.randint(0, 2, ()).item()):
        board = torch.flip(board, dims=(-1,))

    return board, globals_vec, y


@dataclass(frozen=True)
class FeatureSpec:
  board_channels: int
  board_height: int
  board_width: int
  globals_dim: int
  board_mean: list[float]
  board_std: list[float]
  globals_mean: list[float]
  globals_std: list[float]

  @staticmethod
  def from_features(features: BuiltFeatures) -> 'FeatureSpec':
    board = features.board
    board_mask = features.board_mask
    globals_vec = features.globals_vec

    if board.ndim != 4:
      raise ValueError(f'Expected board to be (N,C,H,W), got {board.shape}')
    if board_mask.shape != board.shape:
      raise ValueError(f'Expected board_mask to match board shape {board.shape}, got {board_mask.shape}')

    board_channels = int(board.shape[1])
    board_height = int(board.shape[2])
    board_width = int(board.shape[3])
    globals_dim = int(globals_vec.shape[1])

    mask_sum = board_mask.sum(axis=(0, 2, 3))
    mask_sum = np.where(mask_sum < 1.0, 1.0, mask_sum)
    board_mean = (board * board_mask).sum(axis=(0, 2, 3)) / mask_sum
    variance = ((board - board_mean.reshape(1, -1, 1, 1)) ** 2 * board_mask).sum(axis=(0, 2, 3)) / mask_sum
    board_std = np.sqrt(variance)
    board_std = np.where(board_std < 1e-8, 1.0, board_std)

    globals_mean = globals_vec.mean(axis=0)
    globals_std = globals_vec.std(axis=0)
    globals_std = np.where(globals_std < 1e-8, 1.0, globals_std)

    return FeatureSpec(
      board_channels=board_channels,
      board_height=board_height,
      board_width=board_width,
      globals_dim=globals_dim,
      board_mean=[float(x) for x in board_mean.tolist()],
      board_std=[float(x) for x in board_std.tolist()],
      globals_mean=[float(x) for x in globals_mean.tolist()],
      globals_std=[float(x) for x in globals_std.tolist()],
    )

  def make_loader(
    self,
    features: BuiltFeatures,
    batch_size: int,
    shuffle: bool,
    augment: bool,
  ) -> DataLoader:
    ds = _TorchDataset(features, augment=augment)
    return DataLoader(ds, batch_size=batch_size, shuffle=shuffle, drop_last=False)

  def to_dict(self) -> dict[str, Any]:
    return {
      'board_channels': self.board_channels,
      'board_height': self.board_height,
      'board_width': self.board_width,
      'globals_dim': self.globals_dim,
      'board_mean': self.board_mean,
      'board_std': self.board_std,
      'globals_mean': self.globals_mean,
      'globals_std': self.globals_std,
    }
