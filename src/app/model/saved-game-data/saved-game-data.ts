

export interface DataSaveWrapper<T extends DataSaveVersion> {
  version: number;
  data: T;
}

export interface DataSaveVersion {
  version: number;
}