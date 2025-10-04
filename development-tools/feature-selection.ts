import { writeFileSync } from 'fs';
import { FEATURE_SPEC } from '../src/app/service/ml-difficulty-stats';
import { RawGenericFeatureSet, trainBestModel } from '../src/app/service/ml-core';
import { ModelEvaluationResult, ModelJson, BaselineModelJson } from '../src/app/model/ml-types';
import { computeStatsFromBackupFile } from './training-data-loader';

interface CliOptions {
  maxFeatures?: number;
  minDelta: number;
  forced: string[];
  start: string[];
  startEmpty: boolean;
  candidates?: string[];
  seed: number;
  kFold: number;
  useKFold: boolean;
  outputPath?: string;
}

interface EvalResult {
  best: ModelEvaluationResult<ModelJson>;
  baseline: ModelEvaluationResult<BaselineModelJson>;
}

interface HistoryEntry {
  action: 'init' | 'add' | 'remove';
  feature?: string;
  rmse: number;
  delta?: number;
  featureCount: number;
}

const DEFAULT_MIN_DELTA = 25; // milliseconds
const DEFAULT_OUTPUT = 'development-tools/feature-selection-results.json';

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const opts: CliOptions = {
    minDelta: DEFAULT_MIN_DELTA,
    forced: [],
    start: [],
    startEmpty: false,
    seed: 1337,
    kFold: 5,
    useKFold: true,
    outputPath: DEFAULT_OUTPUT,
  };

  for (const arg of args) {
    if (arg === '--start-empty') opts.startEmpty = true;
    else if (arg === '--no-kfold') opts.useKFold = false;
    else if (arg.startsWith('--min-delta=')) opts.minDelta = parseFloat(arg.split('=')[1] ?? '');
    else if (arg.startsWith('--max=')) opts.maxFeatures = parseInt(arg.split('=')[1] ?? '', 10);
    else if (arg.startsWith('--force=')) opts.forced = parseList(arg.split('=')[1]);
    else if (arg.startsWith('--start=')) opts.start = parseList(arg.split('=')[1]);
    else if (arg.startsWith('--candidates=')) opts.candidates = parseList(arg.split('=')[1]);
    else if (arg.startsWith('--seed=')) opts.seed = parseInt(arg.split('=')[1] ?? '', 10);
    else if (arg.startsWith('--k=')) opts.kFold = Math.max(2, parseInt(arg.split('=')[1] ?? '', 10) || 5);
    else if (arg.startsWith('--out=')) opts.outputPath = arg.split('=')[1];
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: npx ts-node -P tsconfig.node.json --compiler-options "{\"module\":\"CommonJS\"}" development-tools/feature-selection.ts [options]');
      console.log('Options:');
      console.log('  --start-empty           Begin search with no features (default uses FEATURE_SPEC.keys)');
      console.log('  --start=foo,bar         Pre-select features before search (applied after --force)');
      console.log('  --force=foo,bar         Features that must always remain selected');
      console.log('  --candidates=a,b,c      Restrict the search to the provided feature list');
      console.log('  --max=N                 Maximum number of features to keep');
      console.log('  --min-delta=ms          Minimum RMSE improvement (ms) required to add/remove a feature');
      console.log('  --no-kfold              Use a single stratified split instead of K-fold CV');
      console.log('  --k=K                   Number of folds when using K-fold CV (default 5)');
      console.log('  --seed=S                Seed for data splits (default 1337)');
      console.log('  --out=path.json         Where to write the JSON summary results');
      process.exit(0);
    }
  }

  if (!Number.isFinite(opts.minDelta) || opts.minDelta < 0) opts.minDelta = DEFAULT_MIN_DELTA;
  if (opts.maxFeatures != null && opts.maxFeatures <= 0) opts.maxFeatures = undefined;
  return opts;
}

function fmt(value: number): string {
  return value.toFixed(2);
}

function deriveCandidateFeatures(samples: RawGenericFeatureSet[], allowed?: string[]): string[] {
  const exclude = new Set(['gameNumber', 'timeSpent']);
  const allowSet = allowed ? new Set(allowed) : undefined;
  const counts = new Map<string, number>();
  for (const sample of samples) {
    for (const [key, value] of Object.entries(sample)) {
      if (exclude.has(key)) continue;
      if (allowSet && !allowSet.has(key)) continue;
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const requiredCount = samples.length;
  const present = Array.from(counts.entries())
    .filter(([, count]) => count === requiredCount)
    .map(([key]) => key);

  const currentSpec = FEATURE_SPEC.keys.filter((key) => present.includes(key));
  const extras = present.filter((key) => !currentSpec.includes(key)).sort();
  return [...currentSpec, ...extras];
}

async function evaluateFeatureSet(
  rawStats: RawGenericFeatureSet[],
  features: readonly string[],
  cache: Map<string, EvalResult>,
  opts: CliOptions,
): Promise<EvalResult> {
  const key = features.join('|');
  const cached = cache.get(key);
  if (cached) return cached;
  const trainOpts = opts.useKFold
    ? { useKFold: true, k: opts.kFold, seed: opts.seed, featureKeys: features }
    : { useKFold: false, seed: opts.seed, featureKeys: features };
  const { best, baseline } = trainBestModel(rawStats, opts.seed, trainOpts);
  const result: EvalResult = { best, baseline };
  cache.set(key, result);
  return result;
}

function uniquePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function filterAvailable(list: string[], available: Set<string>, label: string): string[] {
  const out: string[] = [];
  for (const key of list) {
    if (!available.has(key)) {
      console.warn(`[feature-selection] ${label}: feature "${key}" not present in dataset and will be ignored`);
      continue;
    }
    out.push(key);
  }
  return out;
}

async function attemptBackwardElimination(
  rawStats: RawGenericFeatureSet[],
  selected: string[],
  currentEval: EvalResult,
  forced: Set<string>,
  cache: Map<string, EvalResult>,
  opts: CliOptions,
  history: HistoryEntry[],
): Promise<{ selected: string[]; eval: EvalResult }> {
  while (true) {
    let bestRemoval: { idx: number; eval: EvalResult; delta: number } | undefined;
    for (let i = 0; i < selected.length; i++) {
      const feature = selected[i];
      if (forced.has(feature)) continue;
      const next = [...selected.slice(0, i), ...selected.slice(i + 1)];
      const evalResult = await evaluateFeatureSet(rawStats, next, cache, opts);
      const delta = currentEval.best.metrics.rmse - evalResult.best.metrics.rmse;
      if (delta > opts.minDelta && (!bestRemoval || delta > bestRemoval.delta)) {
        bestRemoval = { idx: i, eval: evalResult, delta };
      }
    }
    if (!bestRemoval) break;
    const removedFeature = selected[bestRemoval.idx];
    selected = [...selected.slice(0, bestRemoval.idx), ...selected.slice(bestRemoval.idx + 1)];
    currentEval = bestRemoval.eval;
    history.push({ action: 'remove', feature: removedFeature, rmse: currentEval.best.metrics.rmse, delta: bestRemoval.delta, featureCount: selected.length });
    console.log(`[-] Removed ${removedFeature} -> RMSE ${fmt(currentEval.best.metrics.rmse)} (Δ ${fmt(bestRemoval.delta)})`);
  }
  return { selected, eval: currentEval };
}

async function main(): Promise<void> {
  const opts = parseArgs();
  console.log('[feature-selection] Loading training data...');
  const rawStats = await computeStatsFromBackupFile();
  if (!rawStats.length) {
    console.error('[feature-selection] No training examples were generated.');
    process.exit(1);
  }

  const candidatePool = deriveCandidateFeatures(rawStats, opts.candidates);
  if (!candidatePool.length) {
    console.error('[feature-selection] No candidate features detected.');
    process.exit(1);
  }
  const availableSet = new Set(candidatePool);
  console.log(`[feature-selection] Candidate features: ${candidatePool.length}`);

  const forced = new Set(filterAvailable(uniquePreserveOrder(opts.forced), availableSet, 'forced'));
  const startList = opts.startEmpty
    ? []
    : FEATURE_SPEC.keys;
  const preselected = uniquePreserveOrder([
    ...forced,
    ...filterAvailable(opts.start.length ? opts.start : startList, availableSet, 'start'),
  ]);

  const maxFeatures = opts.maxFeatures ?? candidatePool.length;
  if (preselected.length > maxFeatures) {
    console.warn(`[feature-selection] Truncating initial feature set to max=${maxFeatures}`);
    preselected.length = maxFeatures;
  }

  const cache = new Map<string, EvalResult>();
  const history: HistoryEntry[] = [];

  let selected = [...preselected];
  let currentEval = await evaluateFeatureSet(rawStats, selected, cache, opts);
  history.push({ action: 'init', rmse: currentEval.best.metrics.rmse, featureCount: selected.length });
  console.log(`[feature-selection] Starting with ${selected.length} feature(s); RMSE ${fmt(currentEval.best.metrics.rmse)} (baseline ${fmt(currentEval.baseline.metrics.rmse)})`);

  ({ selected, eval: currentEval } = await attemptBackwardElimination(rawStats, selected, currentEval, forced, cache, opts, history));

  const remainingCandidates = () => candidatePool.filter((key) => !selected.includes(key));

  while (selected.length < maxFeatures) {
    const candidates = remainingCandidates();
    if (!candidates.length) break;
    let bestAddition: { feature: string; eval: EvalResult; delta: number } | undefined;
    for (const feature of candidates) {
      const next = [...selected, feature];
      if (next.length > maxFeatures) continue;
      const evalResult = await evaluateFeatureSet(rawStats, next, cache, opts);
      const delta = currentEval.best.metrics.rmse - evalResult.best.metrics.rmse;
      if (delta > opts.minDelta && (!bestAddition || delta > bestAddition.delta)) {
        bestAddition = { feature, eval: evalResult, delta };
      }
    }
    if (!bestAddition) break;
    selected = [...selected, bestAddition.feature];
    currentEval = bestAddition.eval;
    history.push({ action: 'add', feature: bestAddition.feature, rmse: currentEval.best.metrics.rmse, delta: bestAddition.delta, featureCount: selected.length });
    console.log(`[+] Added ${bestAddition.feature} -> RMSE ${fmt(currentEval.best.metrics.rmse)} (Δ ${fmt(bestAddition.delta)})`);
    ({ selected, eval: currentEval } = await attemptBackwardElimination(rawStats, selected, currentEval, forced, cache, opts, history));
  }

  const improvement = history.length > 0
    ? history[0].rmse - currentEval.best.metrics.rmse
    : 0;

  console.log('');
  console.log('== Feature Selection Complete ==');
  console.log(`Selected ${selected.length} feature(s)`);
  console.log(`Final RMSE: ${fmt(currentEval.best.metrics.rmse)} (baseline ${fmt(currentEval.baseline.metrics.rmse)})`);
  console.log(`Total improvement vs initial: ${fmt(improvement)}`);
  console.log('Features:');
  selected.forEach((f, idx) => console.log(`  ${idx + 1}. ${f}`));

  const summary = {
    options: {
      ...opts,
      forced: Array.from(forced),
      initialFeatures: preselected,
      maxFeatures,
    },
    final: {
      features: selected,
      rmse: currentEval.best.metrics.rmse,
      baselineRmse: currentEval.baseline.metrics.rmse,
      mae: currentEval.best.metrics.mae,
      r2: currentEval.best.metrics.r2,
    },
    history,
  };

  if (opts.outputPath) {
    writeFileSync(opts.outputPath, JSON.stringify(summary, null, 2), 'utf8');
    console.log(`
[feature-selection] Results written to ${opts.outputPath}`);
  }
}

main().catch((err) => {
  console.error('[feature-selection] Failed', err);
  process.exit(1);
});

