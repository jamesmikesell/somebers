import { FeatureSpec, ModelEvaluationResult, ModelJson, RidgeModelJson, BaselineModelJson, EvaluationMetrics, TargetTransform } from '../model/ml-types';
import { DifficultyReport } from './board-stat-analyzer';
import { GameStatFeatures, GameStatWithBoard, GameStatWithTimeSpent } from './difficulty-predictor.service';

export interface RawGenericFeatureSet extends RawGameStatBase, RawGameStateTime {
  // dynamic feature bag, keys listed in FEATURE_SPEC
  [key: string]: number | undefined;
}


export interface RawGameStateTime {
  timeSpent?: number;
}


export interface RawGameStatBase {
  gameNumber: number;
  boardSize: number;
}


export interface TrainingSample {
  gameNumber: number;
  boardSize: number;
  features: number[];
  target: number; // timeSpent in ms
}

// Ordered feature keys — excludes gameNumber and timeSpent
export const FEATURE_SPEC: FeatureSpec = {
  keys: [
    'boardSize',
    'rowsAndColumnsRequiredSumAvg',
    'rowsAndColumnsRequiredSumRms',
    'rowsAndColumnsValuesRmsAvg',
    'rowsAndColumnsValuesRmsRms',
    'rowsAndColumnsRequiredSumMin',
    'rowsAndColumnsRequiredSumMax',
    'rowsAndColumnsValuesRmsMin',
    'rowsAndColumnsValuesRmsMax',
    'groupsRequiredSumAvg',
    'groupsRequiredSumRms',
    'groupsValuesRmsAvg',
    'groupsValuesRmsRms',
    'groupsRequiredSumMin',
    'groupsRequiredSumMax',
    'groupsValuesRmsMin',
    'groupsValuesRmsMax',
    // Aggregates of exactCombinationCount for rows, columns, groups
    'rowExactCombinationCountMean',
    'rowExactCombinationCountMin',
    'rowExactCombinationCountMax',
    'rowExactCombinationCountStd',
    'rowExactCombinationCountSum',
    'columnExactCombinationCountMean',
    'columnExactCombinationCountMin',
    'columnExactCombinationCountMax',
    'columnExactCombinationCountStd',
    'columnExactCombinationCountSum',
    'groupExactCombinationCountMean',
    'groupExactCombinationCountMin',
    'groupExactCombinationCountMax',
    'groupExactCombinationCountStd',
    'groupExactCombinationCountSum',
    'rowsAndColumnsExactCombinationCountMean',
    'rowsAndColumnsExactCombinationCountMin',
    'rowsAndColumnsExactCombinationCountMax',
    'rowsAndColumnsExactCombinationCountStd',
    'allExactCombinationCountMean',
    'allExactCombinationCountMin',
    'allExactCombinationCountMax',
    'allExactCombinationCountStd',
    //
    'maxStates',
    'cellCount',
    'rowRequiredRatioMean',
    'rowRequiredRatioMin',
    'rowRequiredRatioMax',
    'rowRequiredRatioStd',
    'colRequiredRatioMean',
    'colRequiredRatioMin',
    'colRequiredRatioMax',
    'colRequiredRatioStd',
    'groupRequiredRatioMean',
    'groupRequiredRatioMin',
    'groupRequiredRatioMax',
    'groupRequiredRatioStd',
    'rowAndColumnRequiredRatioMean',
    'rowAndColumnRequiredRatioMin',
    'rowAndColumnRequiredRatioMax',
    'rowAndColumnRequiredRatioStd',
    'allRequiredRatioMean',
    'allRequiredRatioMin',
    'allRequiredRatioMax',
    'allRequiredRatioStd',

  ],
};


export function difficultyReportToGameStat(stats: DifficultyReport, timeSpent: number, gameNumber: number): GameStatWithBoard & GameStatFeatures & GameStatWithTimeSpent & RawGenericFeatureSet {
  const rowExact = stats.rows.map(s => s.exactCombinationCount);
  const colExact = stats.columns.map(s => s.exactCombinationCount);
  const groupExact = stats.groups.map(s => s.exactCombinationCount);
  const rowsAndColumnsExact = [...rowExact, ...colExact];
  const allExact = [...rowExact, ...colExact, ...groupExact];

  const agg = (xs: number[]) => {
    const n = xs.length || 1;
    let sum = 0;
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < xs.length; i++) {
      const v = xs[i];
      sum += v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (!xs.length) { min = 0; max = 0; }
    const mean = sum / n;
    let vsum = 0;
    for (let i = 0; i < xs.length; i++) {
      const d = xs[i] - mean;
      vsum += d * d;
    }
    const std = Math.sqrt(vsum / n);
    return { mean, min, max, std, sum };
  };

  const rowAgg = agg(rowExact);
  const colAgg = agg(colExact);
  const groupAgg = agg(groupExact);
  const rowsAndColumnsAgg = agg(rowsAndColumnsExact);
  const allAgg = agg(allExact);


  const rowRatio = stats.rows.map(x => x.exactCombinationCount / x.nonExactCombinationCount)
  const colRatio = stats.columns.map(x => x.exactCombinationCount / x.nonExactCombinationCount)
  const groupRatio = stats.groups.map(x => x.exactCombinationCount / x.nonExactCombinationCount)

  const rowRatioAgg = agg(rowRatio);
  const colRatioAgg = agg(colRatio);
  const groupRatioAgg = agg(groupRatio);
  const rowAndColRatioAgg = agg([...rowRatio, ...colRatio])
  const allRatioAgg = agg([...rowRatio, ...colRatio, ...groupRatio])


  let features: GameStatFeatures = {
    boardSize: stats.totals.rowsEvaluated,
    rowsAndColumnsRequiredSumAvg: stats.summaries.rowsAndColumns.requiredSumAvg,
    rowsAndColumnsRequiredSumRms: stats.summaries.rowsAndColumns.requiredSumRms,
    rowsAndColumnsValuesRmsAvg: stats.summaries.rowsAndColumns.valuesRmsAvg,
    rowsAndColumnsValuesRmsRms: stats.summaries.rowsAndColumns.valuesRmsRms,
    rowsAndColumnsRequiredSumMin: Math.min(stats.summaries.rowsAndColumns.requiredSumAvg, stats.summaries.rowsAndColumns.requiredSumRms),
    rowsAndColumnsRequiredSumMax: Math.max(stats.summaries.rowsAndColumns.requiredSumAvg, stats.summaries.rowsAndColumns.requiredSumRms),
    rowsAndColumnsValuesRmsMin: Math.min(stats.summaries.rowsAndColumns.valuesRmsAvg, stats.summaries.rowsAndColumns.valuesRmsRms),
    rowsAndColumnsValuesRmsMax: Math.max(stats.summaries.rowsAndColumns.valuesRmsAvg, stats.summaries.rowsAndColumns.valuesRmsRms),
    groupsRequiredSumAvg: stats.summaries.groups.requiredSumAvg,
    groupsRequiredSumRms: stats.summaries.groups.requiredSumRms,
    groupsValuesRmsAvg: stats.summaries.groups.valuesRmsAvg,
    groupsValuesRmsRms: stats.summaries.groups.valuesRmsRms,
    groupsRequiredSumMin: Math.min(stats.summaries.groups.requiredSumAvg, stats.summaries.groups.requiredSumRms),
    groupsRequiredSumMax: Math.max(stats.summaries.groups.requiredSumAvg, stats.summaries.groups.requiredSumRms),
    groupsValuesRmsMin: Math.min(stats.summaries.groups.valuesRmsAvg, stats.summaries.groups.valuesRmsRms),
    groupsValuesRmsMax: Math.max(stats.summaries.groups.valuesRmsAvg, stats.summaries.groups.valuesRmsRms),
    // exactCombinationCount aggregates
    rowExactCombinationCountMean: rowAgg.mean,
    rowExactCombinationCountMin: rowAgg.min,
    rowExactCombinationCountMax: rowAgg.max,
    rowExactCombinationCountStd: rowAgg.std,
    rowExactCombinationCountSum: rowAgg.sum,
    columnExactCombinationCountMean: colAgg.mean,
    columnExactCombinationCountMin: colAgg.min,
    columnExactCombinationCountMax: colAgg.max,
    columnExactCombinationCountStd: colAgg.std,
    columnExactCombinationCountSum: colAgg.sum,
    groupExactCombinationCountMean: groupAgg.mean,
    groupExactCombinationCountMin: groupAgg.min,
    groupExactCombinationCountMax: groupAgg.max,
    groupExactCombinationCountStd: groupAgg.std,
    groupExactCombinationCountSum: groupAgg.sum,
    // Combined rows+columns exactCombinationCount aggregates (groups unchanged)
    rowsAndColumnsExactCombinationCountMean: rowsAndColumnsAgg.mean,
    rowsAndColumnsExactCombinationCountMin: rowsAndColumnsAgg.min,
    rowsAndColumnsExactCombinationCountMax: rowsAndColumnsAgg.max,
    rowsAndColumnsExactCombinationCountStd: rowsAndColumnsAgg.std,
    allExactCombinationCountMean: allAgg.mean,
    allExactCombinationCountMin: allAgg.min,
    allExactCombinationCountMax: allAgg.max,
    allExactCombinationCountStd: allAgg.std,
    //
    maxStates: Math.pow(2, stats.totals.columnsEvaluated * stats.totals.columnsEvaluated),
    cellCount: stats.totals.columnsEvaluated * stats.totals.columnsEvaluated,

    rowRequiredRatioMean: rowRatioAgg.mean,
    rowRequiredRatioMin: rowRatioAgg.min,
    rowRequiredRatioMax: rowRatioAgg.max,
    rowRequiredRatioStd: rowRatioAgg.std,
    colRequiredRatioMean: colRatioAgg.mean,
    colRequiredRatioMin: colRatioAgg.min,
    colRequiredRatioMax: colRatioAgg.max,
    colRequiredRatioStd: colRatioAgg.std,
    groupRequiredRatioMean: groupRatioAgg.mean,
    groupRequiredRatioMin: groupRatioAgg.min,
    groupRequiredRatioMax: groupRatioAgg.max,
    groupRequiredRatioStd: groupRatioAgg.std,
    rowAndColumnRequiredRatioMean: rowAndColRatioAgg.mean,
    rowAndColumnRequiredRatioMin: rowAndColRatioAgg.min,
    rowAndColumnRequiredRatioMax: rowAndColRatioAgg.max,
    rowAndColumnRequiredRatioStd: rowAndColRatioAgg.std,
    allRequiredRatioMean: allRatioAgg.mean,
    allRequiredRatioMin: allRatioAgg.min,
    allRequiredRatioMax: allRatioAgg.max,
    allRequiredRatioStd: allRatioAgg.std,

  };

  let x: GameStatWithBoard = { gameNumber }
  let z: GameStatWithTimeSpent = { timeSpent }

  return { ...features, ...x, ...z };
}


export function toSample(s: RawGenericFeatureSet): TrainingSample | undefined {
  if (s.timeSpent == null) return undefined;
  const features = FEATURE_SPEC.keys.map((k) => s[k] as number);
  if (features.some((v) => typeof v !== 'number' || Number.isNaN(v))) return undefined;
  return {
    gameNumber: s.gameNumber,
    boardSize: s.boardSize,
    features,
    target: s.timeSpent,
  };
}

export function groupBy<T, K extends string | number>(arr: T[], key: (t: T) => K): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of arr) {
    const k = String(key(item));
    (out[k] ||= []).push(item);
  }
  return out;
}

// Simple deterministic PRNG for shuffling
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function stratifiedSplit(samples: TrainingSample[], seed = 1337): { train: TrainingSample[]; valid: TrainingSample[] } {
  const bySize = groupBy(samples, (s) => s.boardSize);
  const train: TrainingSample[] = [];
  const valid: TrainingSample[] = [];
  const rng = mulberry32(seed);
  for (const size of Object.keys(bySize)) {
    const bucket = [...bySize[size]];
    shuffleInPlace(bucket, rng);
    const mid = Math.floor(bucket.length / 2);
    train.push(...bucket.slice(0, mid));
    valid.push(...bucket.slice(mid));
  }
  return { train, valid };
}

function mean(xs: number[]): number { return xs.reduce((a, b) => a + b, 0) / (xs.length || 1); }
function variance(xs: number[], m: number): number { return xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length || 1); }

export function standardize(features: number[][]): { means: number[]; stds: number[]; X: number[][] } {
  const n = features.length;
  const d = features[0]?.length ?? 0;
  const means = new Array(d).fill(0);
  const stds = new Array(d).fill(0);
  for (let j = 0; j < d; j++) {
    const col = features.map((r) => r[j]);
    const m = mean(col);
    const v = variance(col, m);
    means[j] = m;
    stds[j] = Math.sqrt(v) || 1;
  }
  const X = features.map((row) => row.map((v, j) => (v - means[j]) / (stds[j] || 1)));
  return { means, stds, X };
}

export function rmse(yTrue: number[], yPred: number[]): number {
  const n = yTrue.length;
  return Math.sqrt(yTrue.reduce((s, yi, i) => s + (yi - yPred[i]) ** 2, 0) / (n || 1));
}

export function mae(yTrue: number[], yPred: number[]): number {
  const n = yTrue.length;
  return yTrue.reduce((s, yi, i) => s + Math.abs(yi - yPred[i]), 0) / (n || 1);
}

export function r2(yTrue: number[], yPred: number[]): number {
  const m = mean(yTrue);
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < yTrue.length; i++) {
    ssTot += (yTrue[i] - m) ** 2;
    ssRes += (yTrue[i] - yPred[i]) ** 2;
  }
  return 1 - (ssRes / (ssTot || 1));
}

// Solve (A)x = b using Gaussian elimination with partial pivoting
export function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
    if (Math.abs(M[maxRow][i]) < 1e-12) continue;
    [M[i], M[maxRow]] = [M[maxRow], M[i]];
    const pivot = M[i][i];
    for (let j = i; j <= n; j++) M[i][j] /= pivot;
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = M[k][i];
      for (let j = i; j <= n; j++) M[k][j] -= factor * M[i][j];
    }
  }
  return M.map((row) => row[n]);
}

export function trainBaseline(train: TrainingSample[]): BaselineModelJson {
  const bySize = groupBy(train, (s) => s.boardSize);
  const perSizeMeans: Record<string, number> = {};
  for (const size of Object.keys(bySize)) perSizeMeans[size] = mean(bySize[size].map((s) => s.target));
  const globalMean = mean(train.map((s) => s.target));
  return { version: 1, modelType: 'baseline', features: FEATURE_SPEC.keys, perSizeMeans, globalMean };
}

export function predictBaseline(model: BaselineModelJson, sample: TrainingSample): number {
  const m = model.perSizeMeans[String(sample.boardSize)];
  return m ?? model.globalMean;
}

export function trainRidge(train: TrainingSample[], lambda: number, transform: TargetTransform): RidgeModelJson {
  const xRaw = train.map((s) => s.features);
  const yRaw = train.map((s) => s.target);
  const { means, stds, X } = standardize(xRaw);
  const y = transform === 'log1p' ? yRaw.map((v) => Math.log1p(Math.max(0, v))) : yRaw.slice();

  const n = X.length;
  const d = FEATURE_SPEC.keys.length;
  const Z: number[][] = new Array(n);
  for (let i = 0; i < n; i++) Z[i] = [1, ...X[i]];
  const ZtZ: number[][] = Array.from({ length: d + 1 }, () => new Array(d + 1).fill(0));
  const Zty: number[] = new Array(d + 1).fill(0);
  for (let i = 0; i < n; i++) {
    const zi = Z[i];
    for (let j = 0; j <= d; j++) {
      Zty[j] += zi[j] * y[i];
      for (let k = 0; k <= d; k++) ZtZ[j][k] += zi[j] * zi[k];
    }
  }
  for (let j = 1; j <= d; j++) ZtZ[j][j] += lambda; // no penalty on intercept
  const weights = solveLinearSystem(ZtZ, Zty);

  const perSizeMeans: Record<string, number> = {};
  const globalMean = mean(train.map((s) => s.target));
  return {
    version: 1,
    modelType: 'ridge',
    features: FEATURE_SPEC.keys,
    lambda,
    transform,
    featureMeans: means,
    featureStds: stds,
    weights,
    perSizeMeans,
    globalMean,
  };
}

export function predictRidge(model: RidgeModelJson, sample: TrainingSample): number {
  const x = sample.features.map((v, j) => (v - model.featureMeans[j]) / (model.featureStds[j] || 1));
  let yhat = model.weights[0];
  for (let j = 0; j < x.length; j++) yhat += model.weights[j + 1] * x[j];
  if (model.transform === 'log1p') yhat = Math.max(0, Math.expm1(yhat));
  return yhat;
}

export function evaluate<T extends ModelJson>(pred: (s: TrainingSample) => number, valid: TrainingSample[], model: T): ModelEvaluationResult<T> {
  const yTrue = valid.map((s) => s.target);
  const yPred = valid.map(pred);
  const metrics: EvaluationMetrics = { rmse: rmse(yTrue, yPred), mae: mae(yTrue, yPred), r2: r2(yTrue, yPred) };
  const bySize = groupBy(valid.map((v, i) => ({ v, i })), (o) => o.v.boardSize);
  const perSizeRmse: Record<string, number> = {};
  for (const size of Object.keys(bySize)) {
    const idxs = bySize[size].map((o) => o.i);
    perSizeRmse[size] = rmse(idxs.map((i) => yTrue[i]), idxs.map((i) => yPred[i]));
  }
  return { model, metrics, perSizeRmse };
}

export function trainBestModel(rawStats: RawGenericFeatureSet[], seed = 1337): { best: ModelEvaluationResult<ModelJson>; baseline: ModelEvaluationResult<BaselineModelJson>; ridgeCandidates: ModelEvaluationResult<RidgeModelJson>[] } {
  const samples = rawStats.map(toSample).filter((x): x is TrainingSample => !!x);
  if (!samples.length) throw new Error('No training samples available.');
  const { train, valid } = stratifiedSplit(samples, seed);

  const baseline = trainBaseline(train);
  const baselineEval = evaluate((s) => predictBaseline(baseline, s), valid, baseline);

  const lambdas = [0, 1e-4, 1e-3, 1e-2, 1e-1, 1];
  const transforms: TargetTransform[] = ['none', 'log1p'];
  const ridgeEvals: ModelEvaluationResult<RidgeModelJson>[] = [];
  for (const t of transforms) for (const l of lambdas) {
    const model = trainRidge(train, l, t);
    ridgeEvals.push(evaluate((s) => predictRidge(model, s), valid, model));
  }

  let best: ModelEvaluationResult<ModelJson> = baselineEval;
  for (const r of ridgeEvals) if (r.metrics.rmse < best.metrics.rmse) best = r as ModelEvaluationResult<ModelJson>;
  return { best, baseline: baselineEval, ridgeCandidates: ridgeEvals };
}
