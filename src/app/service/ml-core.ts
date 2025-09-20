import { BaselineModelJson, EvaluationMetrics, ModelEvaluationResult, ModelJson, RidgeModelJson, TargetTransform } from '../model/ml-types';
import { FEATURE_SPEC } from './ml-difficulty-stats';


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

// Create stratified K-fold splits preserving the distribution of boardSize across folds.
export function stratifiedKFolds(samples: TrainingSample[], k = 5, seed = 1337): { train: TrainingSample[]; valid: TrainingSample[] }[] {
  if (k < 2) throw new Error('K-fold requires k >= 2');
  const bySize = groupBy(samples, (s) => s.boardSize);
  const rng = mulberry32(seed);
  // Prepare k buckets for validation indices per class
  const foldBuckets: Record<string, TrainingSample[][]> = {};
  for (const size of Object.keys(bySize)) {
    const bucket = [...bySize[size]];
    shuffleInPlace(bucket, rng);
    const foldsForSize: TrainingSample[][] = Array.from({ length: k }, () => [] as TrainingSample[]);
    for (let i = 0; i < bucket.length; i++) foldsForSize[i % k].push(bucket[i]);
    foldBuckets[size] = foldsForSize;
  }
  const folds: { train: TrainingSample[]; valid: TrainingSample[] }[] = [];
  for (let f = 0; f < k; f++) {
    const valid: TrainingSample[] = [];
    const train: TrainingSample[] = [];
    for (const size of Object.keys(foldBuckets)) {
      const foldsForSize = foldBuckets[size];
      for (let j = 0; j < k; j++) {
        const list = foldsForSize[j];
        if (j === f) valid.push(...list);
        else train.push(...list);
      }
    }
    folds.push({ train, valid });
  }
  return folds;
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

export interface FeatureDiagnostics {
  stds: number[];
  nzvIndices: number[];
  highCorrPairs: { i: number; j: number; corr: number }[];
  maxAbsCorr: number;
}

export function computeFeatureDiagnostics(train: TrainingSample[], corrThreshold = 0.98, nzvThreshold = 1e-6): FeatureDiagnostics {
  const Xraw = train.map((s) => s.features);
  const n = Xraw.length;
  const d = Xraw[0]?.length ?? 0;
  const means = new Array(d).fill(0);
  const vars = new Array(d).fill(0);
  for (let j = 0; j < d; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += Xraw[i][j];
    const m = sum / (n || 1);
    means[j] = m;
    let vs = 0;
    for (let i = 0; i < n; i++) {
      const d0 = Xraw[i][j] - m;
      vs += d0 * d0;
    }
    vars[j] = vs / (n || 1);
  }
  const stds = vars.map((v) => Math.sqrt(v));
  const nzvIndices: number[] = [];
  for (let j = 0; j < d; j++) if (!Number.isFinite(stds[j]) || stds[j] < nzvThreshold) nzvIndices.push(j);

  // Build standardized X for correlation using raw stds but fallback to 1 to avoid NaN
  const X: number[][] = Array.from({ length: n }, () => new Array(d).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) X[i][j] = (Xraw[i][j] - means[j]) / (stds[j] || 1);

  const highCorrPairs: { i: number; j: number; corr: number }[] = [];
  let maxAbsCorr = 0;
  const cols: number[][] = Array.from({ length: d }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) cols[j][i] = X[i][j];
  for (let i = 0; i < d; i++) {
    for (let j = i + 1; j < d; j++) {
      let dot = 0;
      for (let k = 0; k < n; k++) dot += cols[i][k] * cols[j][k];
      const corr = dot / (n || 1);
      const a = Math.abs(corr);
      if (a > maxAbsCorr) maxAbsCorr = a;
      if (a >= corrThreshold) highCorrPairs.push({ i, j, corr });
    }
  }
  return { stds, nzvIndices, highCorrPairs, maxAbsCorr };
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

export function predictRidge(model: RidgeModelJson, sample: TrainingSample, options?: { allowNegative?: boolean }): number {
  const normalizedFeatureValues = sample.features.map((value, index) => (value - model.featureMeans[index]) / (model.featureStds[index] || 1));
  let yhat = model.weights[0];
  for (let j = 0; j < normalizedFeatureValues.length; j++) yhat += model.weights[j + 1] * normalizedFeatureValues[j];
  if (model.transform === 'log1p') yhat = Math.max(0, Math.expm1(yhat));
  else if (!options?.allowNegative) yhat = Math.max(0, yhat);
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
  const perSizeMae: Record<string, number> = {};
  for (const size of Object.keys(bySize)) {
    const idxs = bySize[size].map((o) => o.i);
    const yTrueSize = idxs.map((i) => yTrue[i]);
    const yPredSize = idxs.map((i) => yPred[i]);
    perSizeRmse[size] = rmse(yTrueSize, yPredSize);
    perSizeMae[size] = mae(yTrueSize, yPredSize);
  }
  return { model, metrics, perSizeRmse, perSizeMae };
}

function evaluateOnArrays<T extends ModelJson>(yTrue: number[], yPred: number[], model: T, valid: TrainingSample[]): ModelEvaluationResult<T> {
  const metrics: EvaluationMetrics = { rmse: rmse(yTrue, yPred), mae: mae(yTrue, yPred), r2: r2(yTrue, yPred) };
  const bySize = groupBy(valid.map((v, i) => ({ v, i })), (o) => o.v.boardSize);
  const perSizeRmse: Record<string, number> = {};
  const perSizeMae: Record<string, number> = {};
  for (const size of Object.keys(bySize)) {
    const idxs = bySize[size].map((o) => o.i);
    const yTrueSize = idxs.map((i) => yTrue[i]);
    const yPredSize = idxs.map((i) => yPred[i]);
    perSizeRmse[size] = rmse(yTrueSize, yPredSize);
    perSizeMae[size] = mae(yTrueSize, yPredSize);
  }
  return { model, metrics, perSizeRmse, perSizeMae };
}

export interface TrainBestOptions {
  useKFold?: boolean;
  k?: number;
  seed?: number;
}

export function trainBestModel(rawStats: RawGenericFeatureSet[], seed = 1337, options?: TrainBestOptions): { best: ModelEvaluationResult<ModelJson>; baseline: ModelEvaluationResult<BaselineModelJson>; ridgeCandidates: ModelEvaluationResult<RidgeModelJson>[] } {
  console.log(`Training Set Size: ${rawStats.length}`)
  const warn = (msg: string) => console.warn(`[ml-core] ${msg}`);
  const mapped = rawStats.map((r) => ({ raw: r, sample: toSample(r) }));
  const dropped = mapped.filter((m) => !m.sample);
  if (dropped.length) warn(`toSample: skipped ${dropped.length} record(s) due to missing/invalid features; examples gameNumbers: ${dropped.slice(0, 5).map((m) => m.raw.gameNumber).join(', ')}`);
  const samples = mapped.map((m) => m.sample).filter((x): x is TrainingSample => !!x);
  if (!samples.length) throw new Error('No training samples available.');
  const useK = !!options?.useKFold;
  const k = options?.k && options.k >= 2 ? options.k : 5;
  const seedToUse = options?.seed ?? seed;
  let folds: { train: TrainingSample[]; valid: TrainingSample[] }[] = [];
  let train: TrainingSample[] = [];
  let valid: TrainingSample[] = [];
  if (useK) {
    folds = stratifiedKFolds(samples, k, seedToUse);
    train = samples;
    valid = [];
  } else {
    ({ train, valid } = stratifiedSplit(samples, seedToUse));
  }
  const d = FEATURE_SPEC.keys.length;
  const trainCounts = useK ? folds.map((f) => f.train.length) : [train.length];
  const minTrain = trainCounts.length ? Math.min(...trainCounts) : 0;
  const ratioLabel = useK ? 'min fold training samples' : 'training samples';
  if (minTrain < d)
    warn(`dataset: ${ratioLabel} (${minTrain}) < feature count (${d}); model may be underdetermined or singular`);
  else if (minTrain / d < 5)
    warn(`dataset: low samples-to-features ratio ${(minTrain / d).toFixed(2)} (based on ${ratioLabel}); consider reducing features or adding data`);

  const baseline = trainBaseline(train);
  const baselineEvalSingle = evaluate((s) => predictBaseline(baseline, s), valid, baseline);

  // Feature diagnostics: NZV and high collinearity warnings
  const diag = computeFeatureDiagnostics(train);
  if (diag.nzvIndices.length) {
    const names = diag.nzvIndices.slice(0, 8).map((i) => FEATURE_SPEC.keys[i]).join(', ');
    warn(`features: ${diag.nzvIndices.length} near-zero-variance feature(s) detected (e.g., ${names})`);
  }
  if (diag.highCorrPairs.length) {
    const examples = diag.highCorrPairs
      .slice(0, 5)
      .map((p) => `${FEATURE_SPEC.keys[p.i]}~${FEATURE_SPEC.keys[p.j]}=${p.corr.toFixed(3)}`)
      .join('; ');
    warn(`features: ${diag.highCorrPairs.length} highly correlated pair(s) (|corr|>=0.98); examples: ${examples}`);
  }
  if (diag.maxAbsCorr > 0.999) warn(`features: max absolute correlation extremely high (${diag.maxAbsCorr.toFixed(5)}); model may be ill-conditioned`);

  // Exclude 0 (unregularized) to avoid unstable weight blow-ups on singular/collinear data
  const lambdas = [1e-4, 1e-3, 1e-2, 1e-1, 1, 10];
  // Prefer log transform for strictly-positive targets; we will tie-break later
  const transforms: TargetTransform[] = ['log1p', 'none'];
  const ridgeEvals: ModelEvaluationResult<RidgeModelJson>[] = [];
  if (!useK) {
    for (const t of transforms) for (const l of lambdas) {
      const model = trainRidge(train, l, t, warn);
      ridgeEvals.push(evaluate((s) => predictRidge(model, s), valid, model));
    }
  } else {
    // K-fold: aggregate metrics across folds to choose hyperparameters
    for (const t of transforms) for (const l of lambdas) {
      const yTrueAll: number[] = [];
      const yPredAll: number[] = [];
      const validAll: TrainingSample[] = [];
      for (const fold of folds) {
        const model = trainRidge(fold.train, l, t, warn);
        const preds = fold.valid.map((s) => predictRidge(model, s));
        yTrueAll.push(...fold.valid.map((s) => s.target));
        yPredAll.push(...preds);
        validAll.push(...fold.valid);
      }
      // Train a final model on all samples for the returned artifact
      const finalModel = trainRidge(samples, l, t, warn);
      ridgeEvals.push(evaluateOnArrays(yTrueAll, yPredAll, finalModel, validAll));
    }
  }

  // Pick by lowest RMSE; tie-break on smaller weight L2 norm, then prefer log1p
  const baselineEval = useK
    ? (() => {
      const yTrueAll: number[] = [];
      const yPredAll: number[] = [];
      const validAll: TrainingSample[] = [];
      for (const fold of folds) {
        const b = trainBaseline(fold.train);
        const preds = fold.valid.map((s) => predictBaseline(b, s));
        yTrueAll.push(...fold.valid.map((s) => s.target));
        yPredAll.push(...preds);
        validAll.push(...fold.valid);
      }
      const finalB = trainBaseline(samples);
      return evaluateOnArrays(yTrueAll, yPredAll, finalB, validAll);
    })()
    : baselineEvalSingle;

  let best: ModelEvaluationResult<ModelJson> = baselineEval as unknown as ModelEvaluationResult<ModelJson>;
  const weightL2 = (m: RidgeModelJson) => Math.sqrt(m.weights.reduce((s, w) => s + w * w, 0));
  const isBetter = (a: ModelEvaluationResult<ModelJson>, b: ModelEvaluationResult<ModelJson>): boolean => {
    const eps = 1e-9;
    if (a.metrics.rmse + eps < b.metrics.rmse) return true;
    if (Math.abs(a.metrics.rmse - b.metrics.rmse) <= eps) {
      if (a.model.modelType === 'ridge' && b.model.modelType === 'ridge') {
        const la = weightL2(a.model as RidgeModelJson);
        const lb = weightL2(b.model as RidgeModelJson);
        if (la + eps < lb) return true;
        if (Math.abs(la - lb) <= eps) {
          // final tie-break: prefer log1p
          const ta = (a.model as RidgeModelJson).transform;
          const tb = (b.model as RidgeModelJson).transform;
          if (ta === 'log1p' && tb !== 'log1p') return true;
        }
      } else if (a.model.modelType === 'ridge' && b.model.modelType === 'baseline') {
        return true; // prefer any proper model over baseline with same RMSE
      }
    }
    return false;
  };
  for (const r of ridgeEvals) if (isBetter(r as ModelEvaluationResult<ModelJson>, best)) best = r as ModelEvaluationResult<ModelJson>;
  // If using a single split, retrain the chosen model on all samples for production use
  if (!useK) {
    const baselineFinal = trainBaseline(samples);
    const baselineEvalRet: ModelEvaluationResult<BaselineModelJson> = {
      model: baselineFinal,
      metrics: baselineEval.metrics,
      perSizeRmse: baselineEval.perSizeRmse,
      perSizeMae: baselineEval.perSizeMae,
    };
    if (best.model.modelType === 'ridge') {
      const m = best.model as RidgeModelJson;
      const finalRidge = trainRidge(samples, m.lambda, m.transform, warn);
      best = {
        model: finalRidge,
        metrics: best.metrics,
        perSizeRmse: best.perSizeRmse,
        perSizeMae: best.perSizeMae,
      } as ModelEvaluationResult<ModelJson>;
    }
    return { best, baseline: baselineEvalRet, ridgeCandidates: ridgeEvals };
  }
  return { best, baseline: baselineEval, ridgeCandidates: ridgeEvals };
}
