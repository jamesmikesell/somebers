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
    // 'rowsAndColumnsRequiredSumAvg',
    // 'rowsAndColumnsRequiredSumRms',
    // 'rowsAndColumnsValuesRmsAvg',
    // 'rowsAndColumnsValuesRmsRms',
    // 'rowsAndColumnsRequiredSumMin',
    // 'rowsAndColumnsRequiredSumMax',
    // 'rowsAndColumnsValuesRmsMin',
    // 'rowsAndColumnsValuesRmsMax',
    // 'groupsRequiredSumAvg',
    // 'groupsRequiredSumRms',
    // 'groupsValuesRmsAvg',
    // 'groupsValuesRmsRms',
    // 'groupsRequiredSumMin',
    // 'groupsRequiredSumMax',
    // 'groupsValuesRmsMin',
    // 'groupsValuesRmsMax',
    // Aggregates of exactCombinationCount for rows, columns, groups
    // 'rowExactCombinationCountMean',
    // 'rowExactCombinationCountMin',
    // 'rowExactCombinationCountMax',
    // 'rowExactCombinationCountStd',
    // 'rowExactCombinationCountSum',
    // 'columnExactCombinationCountMean',
    // 'columnExactCombinationCountMin',
    // 'columnExactCombinationCountMax',
    // 'columnExactCombinationCountStd',
    // 'columnExactCombinationCountSum',
    // 'groupExactCombinationCountMean',
    // 'groupExactCombinationCountMin',
    // 'groupExactCombinationCountMax',
    // 'groupExactCombinationCountStd',
    // 'groupExactCombinationCountSum',
    // 'rowsAndColumnsExactCombinationCountMean',
    // 'rowsAndColumnsExactCombinationCountMin',
    // 'rowsAndColumnsExactCombinationCountMax',
    // 'rowsAndColumnsExactCombinationCountStd',
    // 'rowsAndColumnsExactCombinationCountSum',
    // 'allExactCombinationCountMean',
    'allExactCombinationCountMin',
    'allExactCombinationCountMax',
    'allExactCombinationCountStd',
    // 'allExactCombinationCountSum',
    //
    // 'maxStates',
    // 'cellCount',
    // 'rowRequiredRatioMean',
    // 'rowRequiredRatioMin',
    // 'rowRequiredRatioMax',
    // 'rowRequiredRatioStd',
    // 'colRequiredRatioMean',
    // 'colRequiredRatioMin',
    // 'colRequiredRatioMax',
    // 'colRequiredRatioStd',
    // 'groupRequiredRatioMean',
    // 'groupRequiredRatioMin',
    // 'groupRequiredRatioMax',
    // 'groupRequiredRatioStd',
    // 'rowAndColumnRequiredRatioMean',
    // 'rowAndColumnRequiredRatioMin',
    // 'rowAndColumnRequiredRatioMax',
    // 'rowAndColumnRequiredRatioStd',
    // 'allRequiredRatioMean',
    // 'allRequiredRatioMin',
    // 'allRequiredRatioMax',
    // 'allRequiredRatioStd',

    // Aggregates for alwaysRequiredCount
    // 'rowAlwaysRequiredCountMean',
    // 'rowAlwaysRequiredCountMin',
    // 'rowAlwaysRequiredCountMax',
    // 'rowAlwaysRequiredCountStd',
    // 'columnAlwaysRequiredCountMean',
    // 'columnAlwaysRequiredCountMin',
    // 'columnAlwaysRequiredCountMax',
    // 'columnAlwaysRequiredCountStd',
    // 'rowsAndColumnsAlwaysRequiredCountMean',
    // 'rowsAndColumnsAlwaysRequiredCountMin',
    // 'rowsAndColumnsAlwaysRequiredCountMax',
    // 'rowsAndColumnsAlwaysRequiredCountStd',

    // Aggregates for neverUsedCount
    // 'rowNeverUsedCountMean',
    // 'rowNeverUsedCountMin',
    // 'rowNeverUsedCountMax',
    // 'rowNeverUsedCountStd',
    // 'columnNeverUsedCountMean',
    // 'columnNeverUsedCountMin',
    // 'columnNeverUsedCountMax',
    // 'columnNeverUsedCountStd',
    // 'rowsAndColumnsNeverUsedCountMean',
    // 'rowsAndColumnsNeverUsedCountMin',
    // 'rowsAndColumnsNeverUsedCountMax',
    // 'rowsAndColumnsNeverUsedCountStd',

    // Group aggregates for new metrics
    // 'groupAlwaysRequiredCountMean',
    // 'groupAlwaysRequiredCountMin',
    // 'groupAlwaysRequiredCountMax',
    // 'groupAlwaysRequiredCountStd',
    // 'groupAlwaysRequiredCountSum',
    // 'groupNeverUsedCountMean',
    // 'groupNeverUsedCountMin',
    // 'groupNeverUsedCountMax',
    // 'groupNeverUsedCountStd',

    // All (rows+columns+groups) aggregates for new metrics
    // 'allAlwaysRequiredCountMean',
    // 'allAlwaysRequiredCountMin',
    'allAlwaysRequiredCountMax',
    'allAlwaysRequiredCountStd',
    // 'allAlwaysRequiredCountSum',
    // 'allNeverUsedCountMean',
    // 'allNeverUsedCountMin',
    'allNeverUsedCountMax',
    'allNeverUsedCountStd',
    // 'allNeverUsedCountSum',

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

  // New metrics: alwaysRequiredCount and neverUsedCount
  const rowAlways = stats.rows.map(s => s.alwaysRequiredCount);
  const colAlways = stats.columns.map(s => s.alwaysRequiredCount);
  const grpAlways = stats.groups.map(s => s.alwaysRequiredCount);
  const rcAlways = [...rowAlways, ...colAlways];
  const rowAlwaysAgg = agg(rowAlways);
  const colAlwaysAgg = agg(colAlways);
  const rcAlwaysAgg = agg(rcAlways);
  const grpAlwaysAgg = agg(grpAlways);
  const allAlwaysAgg = agg([...rcAlways, ...grpAlways]);

  const rowNever = stats.rows.map(s => s.neverUsedCount);
  const colNever = stats.columns.map(s => s.neverUsedCount);
  const grpNever = stats.groups.map(s => s.neverUsedCount);
  const rcNever = [...rowNever, ...colNever];
  const rowNeverAgg = agg(rowNever);
  const colNeverAgg = agg(colNever);
  const rcNeverAgg = agg(rcNever);
  const grpNeverAgg = agg(grpNever);
  const allNeverAgg = agg([...rcNever, ...grpNever]);


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
    rowsAndColumnsExactCombinationCountSum: rowsAndColumnsAgg.sum,
    allExactCombinationCountMean: allAgg.mean,
    allExactCombinationCountMin: allAgg.min,
    allExactCombinationCountMax: allAgg.max,
    allExactCombinationCountStd: allAgg.std,
    allExactCombinationCountSum: allAgg.sum,
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

    // alwaysRequiredCount aggregates
    rowAlwaysRequiredCountMean: rowAlwaysAgg.mean,
    rowAlwaysRequiredCountMin: rowAlwaysAgg.min,
    rowAlwaysRequiredCountMax: rowAlwaysAgg.max,
    rowAlwaysRequiredCountStd: rowAlwaysAgg.std,
    columnAlwaysRequiredCountMean: colAlwaysAgg.mean,
    columnAlwaysRequiredCountMin: colAlwaysAgg.min,
    columnAlwaysRequiredCountMax: colAlwaysAgg.max,
    columnAlwaysRequiredCountStd: colAlwaysAgg.std,
    rowsAndColumnsAlwaysRequiredCountMean: rcAlwaysAgg.mean,
    rowsAndColumnsAlwaysRequiredCountMin: rcAlwaysAgg.min,
    rowsAndColumnsAlwaysRequiredCountMax: rcAlwaysAgg.max,
    rowsAndColumnsAlwaysRequiredCountStd: rcAlwaysAgg.std,

    // neverUsedCount aggregates
    rowNeverUsedCountMean: rowNeverAgg.mean,
    rowNeverUsedCountMin: rowNeverAgg.min,
    rowNeverUsedCountMax: rowNeverAgg.max,
    rowNeverUsedCountStd: rowNeverAgg.std,
    columnNeverUsedCountMean: colNeverAgg.mean,
    columnNeverUsedCountMin: colNeverAgg.min,
    columnNeverUsedCountMax: colNeverAgg.max,
    columnNeverUsedCountStd: colNeverAgg.std,
    rowsAndColumnsNeverUsedCountMean: rcNeverAgg.mean,
    rowsAndColumnsNeverUsedCountMin: rcNeverAgg.min,
    rowsAndColumnsNeverUsedCountMax: rcNeverAgg.max,
    rowsAndColumnsNeverUsedCountStd: rcNeverAgg.std,

    // group aggregates for new metrics
    groupAlwaysRequiredCountMean: grpAlwaysAgg.mean,
    groupAlwaysRequiredCountMin: grpAlwaysAgg.min,
    groupAlwaysRequiredCountMax: grpAlwaysAgg.max,
    groupAlwaysRequiredCountStd: grpAlwaysAgg.std,
    groupAlwaysRequiredCountSum: grpAlwaysAgg.sum,
    groupNeverUsedCountMean: grpNeverAgg.mean,
    groupNeverUsedCountMin: grpNeverAgg.min,
    groupNeverUsedCountMax: grpNeverAgg.max,
    groupNeverUsedCountStd: grpNeverAgg.std,

    // all aggregates (rows+columns+groups)
    allAlwaysRequiredCountMean: allAlwaysAgg.mean,
    allAlwaysRequiredCountMin: allAlwaysAgg.min,
    allAlwaysRequiredCountMax: allAlwaysAgg.max,
    allAlwaysRequiredCountStd: allAlwaysAgg.std,
    allAlwaysRequiredCountSum: allAlwaysAgg.sum,
    allNeverUsedCountMean: allNeverAgg.mean,
    allNeverUsedCountMin: allNeverAgg.min,
    allNeverUsedCountMax: allNeverAgg.max,
    allNeverUsedCountStd: allNeverAgg.std,
    allNeverUsedCountSum: allNeverAgg.sum,
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
export function solveLinearSystem(A: number[][], b: number[], warn?: (msg: string) => void): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
    if (Math.abs(M[maxRow][i]) < 1e-12) {
      if (warn) warn(`solve: near-singular pivot at row ${i} (|pivot|<1e-12); solution may be unstable`);
      continue;
    }
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

export function trainRidge(train: TrainingSample[], lambda: number, transform: TargetTransform, logWarn?: (msg: string) => void): RidgeModelJson {
  const warn = (msg: string) => console.warn(`[ml-core] ${msg}`);
  const xRaw = train.map((s) => s.features);
  const yRaw = train.map((s) => s.target);
  // Detect non-finite or extremely large inputs
  let badCount = 0;
  const badExamples: string[] = [];
  for (let i = 0; i < xRaw.length; i++) {
    const row = xRaw[i];
    for (let j = 0; j < row.length; j++) {
      const v = row[j];
      if (!Number.isFinite(v) || Math.abs(v) > 1e12) {
        badCount++;
        if (badExamples.length < 5) badExamples.push(`game=${train[i].gameNumber} featIdx=${j} val=${v}`);
        break;
      }
    }
  }
  if (badCount > 0) (logWarn ?? warn)(`trainRidge: detected ${badCount} samples with non-finite or huge feature values; examples: ${badExamples.join('; ')}`);
  if (lambda === 0) (logWarn ?? warn)('trainRidge: lambda=0 (no regularization); solution may be unstable');
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
  const weights = solveLinearSystem(ZtZ, Zty, (m) => (logWarn ?? warn)(`ridge: ${m}`));
  if (weights.some((w) => !Number.isFinite(w))) (logWarn ?? warn)('trainRidge: solved weights contain non-finite values');

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
  const normalizedFeatureValues = sample.features.map((value, index) => (value - model.featureMeans[index]) / (model.featureStds[index] || 1));
  let yhat = model.weights[0];
  for (let j = 0; j < normalizedFeatureValues.length; j++) yhat += model.weights[j + 1] * normalizedFeatureValues[j];
  if (model.transform === 'log1p') yhat = Math.max(0, Math.expm1(yhat));
  return yhat;
}

export function evaluate<T extends ModelJson>(pred: (s: TrainingSample) => number, valid: TrainingSample[], model: T): ModelEvaluationResult<T> {
  const yTrue = valid.map((s) => s.target);
  const yPred = valid.map(pred);
  const metrics: EvaluationMetrics = { rmse: rmse(yTrue, yPred), mae: mae(yTrue, yPred), r2: r2(yTrue, yPred) };
  if (!Number.isFinite(metrics.rmse) || !Number.isFinite(metrics.mae) || !Number.isFinite(metrics.r2))
    console.warn('[ml-core] evaluate: metrics contain non-finite values (rmse/mae/r2) — check features and model conditioning');
  const bySize = groupBy(valid.map((v, i) => ({ v, i })), (o) => o.v.boardSize);
  const perSizeRmse: Record<string, number> = {};
  for (const size of Object.keys(bySize)) {
    const idxs = bySize[size].map((o) => o.i);
    perSizeRmse[size] = rmse(idxs.map((i) => yTrue[i]), idxs.map((i) => yPred[i]));
  }
  return { model, metrics, perSizeRmse };
}

export function trainBestModel(rawStats: RawGenericFeatureSet[], seed = 1337): { best: ModelEvaluationResult<ModelJson>; baseline: ModelEvaluationResult<BaselineModelJson>; ridgeCandidates: ModelEvaluationResult<RidgeModelJson>[] } {
  const warn = (msg: string) => console.warn(`[ml-core] ${msg}`);
  const mapped = rawStats.map((r) => ({ raw: r, sample: toSample(r) }));
  const dropped = mapped.filter((m) => !m.sample);
  if (dropped.length) warn(`toSample: skipped ${dropped.length} record(s) due to missing/invalid features; examples gameNumbers: ${dropped.slice(0, 5).map((m) => m.raw.gameNumber).join(', ')}`);
  const samples = mapped.map((m) => m.sample).filter((x): x is TrainingSample => !!x);
  if (!samples.length) throw new Error('No training samples available.');
  const { train, valid } = stratifiedSplit(samples, seed);
  const d = FEATURE_SPEC.keys.length;
  if (train.length < d) warn(`dataset: training samples (${train.length}) < feature count (${d}); model may be underdetermined or singular`);
  else if (train.length / d < 5) warn(`dataset: low samples-to-features ratio ${(train.length / d).toFixed(2)}; consider reducing features or adding data`);

  const baseline = trainBaseline(train);
  const baselineEval = evaluate((s) => predictBaseline(baseline, s), valid, baseline);

  const lambdas = [0, 1e-4, 1e-3, 1e-2, 1e-1, 1];
  const transforms: TargetTransform[] = ['none', 'log1p'];
  const ridgeEvals: ModelEvaluationResult<RidgeModelJson>[] = [];
  for (const t of transforms) for (const l of lambdas) {
    const model = trainRidge(train, l, t, warn);
    ridgeEvals.push(evaluate((s) => predictRidge(model, s), valid, model));
  }

  let best: ModelEvaluationResult<ModelJson> = baselineEval;
  for (const r of ridgeEvals) if (r.metrics.rmse < best.metrics.rmse) best = r as ModelEvaluationResult<ModelJson>;
  return { best, baseline: baselineEval, ridgeCandidates: ridgeEvals };
}
