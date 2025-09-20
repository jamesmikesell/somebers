export interface FeatureSpec {
  keys: string[];
}

export interface TrainingSample {
  boardSize: number;
  gameNumber: number;
  target: number; // timeSpent in ms
  features: number[]; // in the order of FeatureSpec.keys
}

export type TargetTransform = 'none' | 'log1p';

export interface BaselineModelJson {
  version: 1;
  modelType: 'baseline';
  features: string[];
  perSizeMeans: Record<string, number>; // key is boardSize as string
  globalMean: number;
}

export interface RidgeModelJson {
  version: 1;
  modelType: 'ridge';
  features: string[];
  lambda: number;
  transform: TargetTransform;
  featureMeans: number[];
  featureStds: number[]; // stds with zeros replaced by 1 to avoid div by zero
  // weights includes intercept at index 0, then one per feature key in order
  weights: number[];
  perSizeMeans: Record<string, number>;
  globalMean: number;
}

export type ModelJson = BaselineModelJson | RidgeModelJson;

export interface EvaluationMetrics {
  rmse: number;
  mae: number;
  r2: number;
}

export interface ModelEvaluationResult<TModel extends ModelJson> {
  model: TModel;
  metrics: EvaluationMetrics;
  perSizeRmse: Record<string, number>;
  perSizeMae: Record<string, number>;
}
