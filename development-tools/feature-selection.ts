import { writeFileSync } from 'fs';
import { FEATURE_SPEC } from '../src/app/service/ml-difficulty-stats';
import {
  ModelSelectionMetric,
  RawGenericFeatureSet,
  trainBestModel,
} from '../src/app/service/ml-core';
import {
  ModelEvaluationResult,
  ModelJson,
  BaselineModelJson,
} from '../src/app/model/ml-types';
import { computeStatsFromBackupFile } from './training-data-loader';

interface CliOptions {
  selectionMetric?: ModelSelectionMetric;
  maxFeatures?: number;
  minDelta: number;
  forced: string[];
  start: string[];
  startEmpty: boolean;
  candidates?: string[];
  excluded: string[];
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
  smape: number;
  r2: number;
  delta?: number;
  featureCount: number;
}

const DEFAULT_MIN_DELTA = 0.00005; // absolute metric improvement required (e.g., 0.005 = 0.5 pp)
const DEFAULT_OUTPUT = 'development-tools/feature-selection-results.json';

interface ProgressReporter {
  update(current: number, durationMs: number): void;
  finish(): void;
}

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
    excluded: [],
    seed: 1337,
    kFold: 5,
    useKFold: true,
    outputPath: DEFAULT_OUTPUT,
  };

  for (const arg of args) {
    if (arg === '--start-empty') opts.startEmpty = true;
    else if (arg === '--no-kfold') opts.useKFold = false;
    else if (arg.startsWith('--min-delta='))
      opts.minDelta = parseFloat(arg.split('=')[1] ?? '');
    else if (arg.startsWith('--max='))
      opts.maxFeatures = parseInt(arg.split('=')[1] ?? '', 10);
    else if (arg.startsWith('--force='))
      opts.forced = parseList(arg.split('=')[1]);
    else if (arg.startsWith('--start='))
      opts.start = parseList(arg.split('=')[1]);
    else if (arg.startsWith('--candidates='))
      opts.candidates = parseList(arg.split('=')[1]);
    else if (arg.startsWith('--exclude='))
      opts.excluded = parseList(arg.split('=')[1]);
    else if (arg.startsWith('--seed='))
      opts.seed = parseInt(arg.split('=')[1] ?? '', 10);
    else if (arg.startsWith('--k='))
      opts.kFold = Math.max(2, parseInt(arg.split('=')[1] ?? '', 10) || 5);
    else if (arg.startsWith('--out=')) opts.outputPath = arg.split('=')[1];
    else if (arg.startsWith('--select-metric=')) {
      const value = arg.split('=')[1]?.toLowerCase();
      if (value === 'smape' || value === 'rmse') opts.selectionMetric = value;
    }
    else if (arg === '--help' || arg === '-h') {
      console.log(
        'Usage: npx ts-node -P tsconfig.node.json --compiler-options "{\"module\":\"CommonJS\"}" development-tools/feature-selection.ts --select-metric=smape|rmse [options]',
      );
      console.log('Options:');
      console.log(
        '  --select-metric=smape|rmse  Required. Metric used to pick the best model',
      );
      console.log(
        '  --start-empty           Begin search with no features (default uses FEATURE_SPEC.keys)',
      );
      console.log(
        '  --start=foo,bar         Pre-select features before search (applied after --force)',
      );
      console.log(
        '  --force=foo,bar         Features that must always remain selected',
      );
      console.log(
        '  --candidates=a,b,c      Restrict the search to the provided feature list',
      );
      console.log(
        '  --exclude=a,b           Remove specific features from consideration',
      );
      console.log(
        '  --max=N                 Maximum number of features to keep',
      );
      console.log(
        '  --min-delta=x           Minimum metric improvement required to add/remove a feature (absolute, e.g., 0.005 = 0.5 pp)',
      );
      console.log(
        '  --no-kfold              Use a single stratified split instead of K-fold CV',
      );
      console.log(
        '  --k=K                   Number of folds when using K-fold CV (default 5)',
      );
      console.log(
        '  --seed=S                Seed for data splits (default 1337)',
      );
      console.log(
        '  --out=path.json         Where to write the JSON summary results',
      );
      process.exit(0);
    }
  }

  if (!Number.isFinite(opts.minDelta) || opts.minDelta < 0)
    opts.minDelta = DEFAULT_MIN_DELTA;
  if (opts.maxFeatures != null && opts.maxFeatures <= 0)
    opts.maxFeatures = undefined;
  if (!opts.selectionMetric) {
    console.error('[feature-selection] Missing required --select-metric=smape|rmse');
    process.exit(1);
  }
  return opts;
}

function fmt(value: number): string {
  return value.toFixed(2);
}

function fmtR2(value: number): string {
  return value.toFixed(3);
}

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
}

function createProgressReporter(label: string, total: number): ProgressReporter {
  if (total <= 0) {
    return {
      update() {},
      finish() {},
    };
  }

  const barWidth = 24;
  const isTty = Boolean(process.stdout.isTTY);
  let avgMs = 0;
  let seen = 0;
  let lastPercent = -1;

  const render = (current: number): void => {
    const percent = Math.min(1, Math.max(0, current / total));
    const etaMs = avgMs > 0 ? avgMs * (total - current) : 0;
    const eta = formatDuration(etaMs / 1000);
    const percentLabel = Math.round(percent * 100);
    if (!isTty) {
      if (percentLabel === lastPercent) return;
      if (percentLabel % 10 !== 0 && current !== total) return;
      lastPercent = percentLabel;
      console.log(
        `${label}: ${current}/${total} (${percentLabel}%) ETA ${eta}`,
      );
      return;
    }
    const filled = Math.round(barWidth * percent);
    const bar =
      '='.repeat(filled) + '-'.repeat(Math.max(0, barWidth - filled));
    process.stdout.write(
      `\r${label} [${bar}] ${current}/${total} ${percentLabel}% ETA ${eta}`,
    );
  };

  return {
    update(current: number, durationMs: number): void {
      seen += 1;
      avgMs = avgMs === 0 ? durationMs : avgMs + (durationMs - avgMs) / seen;
      render(current);
    },
    finish(): void {
      if (isTty) process.stdout.write('\n');
    },
  };
}

function deriveCandidateFeatures(
  samples: RawGenericFeatureSet[],
  allowed?: string[],
): string[] {
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
  const key = [...features].sort().join('|');
  const cached = cache.get(key);
  if (cached) return cached;
  const trainOpts = opts.useKFold
    ? { selectionMetric: opts.selectionMetric!, useKFold: true, k: opts.kFold, seed: opts.seed, featureKeys: features }
    : { selectionMetric: opts.selectionMetric!, useKFold: false, seed: opts.seed, featureKeys: features };
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

function filterAvailable(
  list: string[],
  available: Set<string>,
  label: string,
): string[] {
  const out: string[] = [];
  for (const key of list) {
    if (!available.has(key)) {
      console.warn(
        `[feature-selection] ${label}: feature "${key}" not present in dataset and will be ignored`,
      );
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
  const metricLabel = opts.selectionMetric === 'rmse' ? 'RMSE' : 'SMAPE';
  let pass = 0;
  while (true) {
    pass += 1;
    const eligible = selected.filter((feature) => !forced.has(feature));
    const progress = createProgressReporter(
      `[feature-selection] Backward elimination (pass ${pass})`,
      eligible.length,
    );
    let bestRemoval:
      | { idx: number; eval: EvalResult; delta: number }
      | undefined;
    let evalIndex = 0;
    for (let i = 0; i < selected.length; i++) {
      const feature = selected[i];
      if (forced.has(feature)) continue;
      const next = [...selected.slice(0, i), ...selected.slice(i + 1)];
      const start = Date.now();
      const evalResult = await evaluateFeatureSet(rawStats, next, cache, opts);
      const durationMs = Date.now() - start;
      evalIndex += 1;
      progress.update(evalIndex, durationMs);
      const currentMetric = opts.selectionMetric === 'rmse'
        ? currentEval.best.metrics.rmse
        : currentEval.best.metrics.smape;
      const nextMetric = opts.selectionMetric === 'rmse'
        ? evalResult.best.metrics.rmse
        : evalResult.best.metrics.smape;
      const delta = currentMetric - nextMetric;
      if (
        delta > opts.minDelta &&
        (!bestRemoval || delta > bestRemoval.delta)
      ) {
        bestRemoval = { idx: i, eval: evalResult, delta };
      }
    }
    progress.finish();
    if (!bestRemoval) break;
    const removedFeature = selected[bestRemoval.idx];
    selected = [
      ...selected.slice(0, bestRemoval.idx),
      ...selected.slice(bestRemoval.idx + 1),
    ];
    currentEval = bestRemoval.eval;
    history.push({
      action: 'remove',
      feature: removedFeature,
      rmse: currentEval.best.metrics.rmse,
      smape: currentEval.best.metrics.smape,
      r2: currentEval.best.metrics.r2,
      delta: bestRemoval.delta,
      featureCount: selected.length,
    });
    console.log(
      `[-] Removed ${removedFeature} -> RMSE ${fmt(currentEval.best.metrics.rmse)} SMAPE ${fmt(currentEval.best.metrics.smape)} R2 ${fmtR2(currentEval.best.metrics.r2)} (Δ ${metricLabel} ${fmt(bestRemoval.delta)})`,
    );
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

  let candidatePool = deriveCandidateFeatures(rawStats, opts.candidates);
  if (!candidatePool.length) {
    console.error('[feature-selection] No candidate features detected.');
    process.exit(1);
  }

  const rawCandidateSet = new Set(candidatePool);
  const excluded = new Set(
    filterAvailable(
      uniquePreserveOrder(opts.excluded),
      rawCandidateSet,
      'exclude',
    ),
  );
  if (excluded.size) {
    candidatePool = candidatePool.filter((key) => !excluded.has(key));
  }

  if (!candidatePool.length) {
    console.error(
      '[feature-selection] No candidate features remain after applying exclusions.',
    );
    process.exit(1);
  }

  const availableSet = new Set(candidatePool);
  console.log(
    `[feature-selection] Candidate features: ${candidatePool.length}${excluded.size ? ` (excluded ${excluded.size})` : ''}`,
  );

  const forced = new Set(
    filterAvailable(uniquePreserveOrder(opts.forced), availableSet, 'forced'),
  );
  const startList = opts.startEmpty ? [] : FEATURE_SPEC.keys;
  const preselected = uniquePreserveOrder([
    ...forced,
    ...filterAvailable(
      opts.start.length ? opts.start : startList,
      availableSet,
      'start',
    ),
  ]);

  const maxFeatures = opts.maxFeatures ?? candidatePool.length;
  if (preselected.length > maxFeatures) {
    console.warn(
      `[feature-selection] Truncating initial feature set to max=${maxFeatures}`,
    );
    preselected.length = maxFeatures;
  }

  const cache = new Map<string, EvalResult>();
  const history: HistoryEntry[] = [];
  const metricLabel = opts.selectionMetric === 'rmse' ? 'RMSE' : 'SMAPE';

  let selected = [...preselected];
  let currentEval = await evaluateFeatureSet(rawStats, selected, cache, opts);
  history.push({
    action: 'init',
    rmse: currentEval.best.metrics.rmse,
    smape: currentEval.best.metrics.smape,
    r2: currentEval.best.metrics.r2,
    featureCount: selected.length,
  });
  console.log(
    `[feature-selection] Starting with ${selected.length} feature(s); RMSE ${fmt(currentEval.best.metrics.rmse)} SMAPE ${fmt(currentEval.best.metrics.smape)} R2 ${fmtR2(currentEval.best.metrics.r2)} (baseline RMSE ${fmt(currentEval.baseline.metrics.rmse)} SMAPE ${fmt(currentEval.baseline.metrics.smape)} R2 ${fmtR2(currentEval.baseline.metrics.r2)})`,
  );

  ({ selected, eval: currentEval } = await attemptBackwardElimination(
    rawStats,
    selected,
    currentEval,
    forced,
    cache,
    opts,
    history,
  ));

  const remainingCandidates = () =>
    candidatePool.filter((key) => !selected.includes(key));

  let forwardPass = 0;
  while (selected.length < maxFeatures) {
    forwardPass += 1;
    const candidates = remainingCandidates();
    if (!candidates.length) break;
    const progress = createProgressReporter(
      `[feature-selection] Forward selection (pass ${forwardPass})`,
      candidates.length,
    );
    let bestAddition:
      | { feature: string; eval: EvalResult; delta: number }
      | undefined;
    let evalIndex = 0;
    for (const feature of candidates) {
      const next = [...selected, feature];
      if (next.length > maxFeatures) continue;
      const start = Date.now();
      const evalResult = await evaluateFeatureSet(rawStats, next, cache, opts);
      const durationMs = Date.now() - start;
      evalIndex += 1;
      progress.update(evalIndex, durationMs);
      const currentMetric = opts.selectionMetric === 'rmse'
        ? currentEval.best.metrics.rmse
        : currentEval.best.metrics.smape;
      const nextMetric = opts.selectionMetric === 'rmse'
        ? evalResult.best.metrics.rmse
        : evalResult.best.metrics.smape;
      const delta = currentMetric - nextMetric;
      if (
        delta > opts.minDelta &&
        (!bestAddition || delta > bestAddition.delta)
      ) {
        bestAddition = { feature, eval: evalResult, delta };
      }
    }
    progress.finish();
    if (!bestAddition) break;
    selected = [...selected, bestAddition.feature];
    currentEval = bestAddition.eval;
    history.push({
      action: 'add',
      feature: bestAddition.feature,
      rmse: currentEval.best.metrics.rmse,
      smape: currentEval.best.metrics.smape,
      r2: currentEval.best.metrics.r2,
      delta: bestAddition.delta,
      featureCount: selected.length,
    });
    console.log(
      `[+] Added ${bestAddition.feature} -> RMSE ${fmt(currentEval.best.metrics.rmse)} SMAPE ${fmt(currentEval.best.metrics.smape)} R2 ${fmtR2(currentEval.best.metrics.r2)} (Δ ${metricLabel} ${fmt(bestAddition.delta)})`,
    );
    ({ selected, eval: currentEval } = await attemptBackwardElimination(
      rawStats,
      selected,
      currentEval,
      forced,
      cache,
      opts,
      history,
    ));
  }

  const improvement =
    history.length > 0
      ? (opts.selectionMetric === 'rmse'
        ? history[0].rmse - currentEval.best.metrics.rmse
        : history[0].smape - currentEval.best.metrics.smape)
      : 0;

  console.log('');
  console.log('== Feature Selection Complete ==');
  console.log(`Selected ${selected.length} feature(s)`);
  console.log(
    `Final RMSE: ${fmt(currentEval.best.metrics.rmse)} (baseline ${fmt(currentEval.baseline.metrics.rmse)})`,
  );
  console.log(
    `Final SMAPE: ${fmt(currentEval.best.metrics.smape)} (baseline ${fmt(currentEval.baseline.metrics.smape)})`,
  );
  console.log(
    `Final R2: ${fmtR2(currentEval.best.metrics.r2)} (baseline ${fmtR2(currentEval.baseline.metrics.r2)})`,
  );
  console.log(`Total ${metricLabel} improvement vs initial: ${fmt(improvement)}`);
  console.log('Features:');
  selected.forEach((f, idx) => console.log(`  ${idx + 1}. ${f}`));

  const summary = {
    options: {
      ...opts,
      forced: Array.from(forced),
      excluded: Array.from(excluded),
      initialFeatures: preselected,
      maxFeatures,
    },
    final: {
      features: selected,
      rmse: currentEval.best.metrics.rmse,
      baselineRmse: currentEval.baseline.metrics.rmse,
      mae: currentEval.best.metrics.mae,
      smape: currentEval.best.metrics.smape,
      baselineSmape: currentEval.baseline.metrics.smape,
      r2: currentEval.best.metrics.r2,
      baselineR2: currentEval.baseline.metrics.r2,
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
