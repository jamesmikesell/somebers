import { cpus } from 'os';
import { ModelEvaluationResult, ModelJson, RidgeModelJson } from '../src/app/model/ml-types';

export function modelStats(best: ModelEvaluationResult<ModelJson>, trainEval?: ModelEvaluationResult<ModelJson>): void {
  console.log(
    'Best model:',
    best.model.modelType,
    best.model.modelType === 'ridge' ? (best.model as RidgeModelJson).lambda + '/' + (best.model as RidgeModelJson).transform : 'baseline'
  );
  if (trainEval) console.log('Training RMSE:', trainEval.metrics.rmse.toFixed(2), 'MAE:', trainEval.metrics.mae.toFixed(2), 'R2:', trainEval.metrics.r2.toFixed(3));
  console.log('Validation RMSE:', best.metrics.rmse.toFixed(2), 'MAE:', best.metrics.mae.toFixed(2), 'R2:', best.metrics.r2.toFixed(3));
  if (trainEval && Object.keys(trainEval.perSizeRmse ?? {}).length) {
    console.log('Training RMSE by board size:');
    for (const size of Object.keys(trainEval.perSizeRmse).sort((a, b) => Number(a) - Number(b)))
      console.log(`  ${size}: ${trainEval.perSizeRmse[size].toFixed(2)}`);
  }
  if (Object.keys(best.perSizeRmse ?? {}).length) {
    console.log('Validation RMSE by board size:');
    for (const size of Object.keys(best.perSizeRmse).sort((a, b) => Number(a) - Number(b)))
      console.log(`  ${size}: ${best.perSizeRmse[size].toFixed(2)}`);
  }
}

export function logWeights(best: ModelEvaluationResult<ModelJson>): void {
  if (best.model.modelType === 'ridge') {
    const ridge = best.model as RidgeModelJson;
    const names = ['intercept', ...ridge.features];
    const pairs = names.map((name, i) => ({ name, weight: ridge.weights[i] ?? 0 }));
    pairs.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
    console.log('');
    console.log('Weights (sorted by |weight| desc):');
    console.log('');
    for (const { name, weight } of pairs) console.log((weight >= 0 ? ' ' : '') + weight.toFixed(5) + ': ' + name);
  } else {
    console.log('Baseline model selected: no feature weights to display.');
  }
}

export function parseThreadCount(): number {
  // Priority: CLI --threads=N -> env PREDICT_THREADS -> CPU count - 1
  const arg = process.argv.find((a) => a.startsWith('--threads='));
  if (arg) {
    const n = parseInt(arg.split('=')[1] ?? '', 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  const env = process.env['PREDICT_THREADS'];
  if (env) {
    const n = parseInt(env, 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  const cpuCount = cpus()?.length ?? 1;
  return Math.max(1, cpuCount - 1);
}
