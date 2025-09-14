import { writeFileSync } from 'fs';
import { BaselineModelJson, ModelEvaluationResult, ModelJson, RidgeModelJson } from '../src/app/model/ml-types';
import { evaluate, stratifiedSplit, trainBestModel, TrainingSample } from '../src/app/service/ml-core';
import { buildRawGameStatForGameNumber, computeStatsFromBackupFile } from './training-data-loader';
import { predictBaseline, predictRidge, toSample } from '../src/app/service/ml-core';



/*
  Run with:
  npx ts-node -P tsconfig.node.json --compiler-options '{"module":"CommonJS"}' development-tools/train-time-predictor.ts
*/
function main(): void {
  console.log('Loading and computing stats');
  const rawStats = computeStatsFromBackupFile();

  console.log('Training start');
  const { best, baseline, ridgeCandidates } = trainBestModel(rawStats, 1337, { useKFold: true, k: 5 });
  console.log('Training complete');

  // Also compute training-set metrics for the selected model
  const samples = rawStats.map(toSample).filter((x): x is TrainingSample => !!x);
  const { train } = stratifiedSplit(samples, 1337);
  const trainEval: ModelEvaluationResult<ModelJson> = (best.model.modelType === 'baseline'
    ? evaluate((s) => predictBaseline(best.model as BaselineModelJson, s), train, best.model as BaselineModelJson)
    : evaluate((s) => predictRidge(best.model as RidgeModelJson, s), train, best.model as RidgeModelJson)) as unknown as ModelEvaluationResult<ModelJson>;

  // Predict for game #27
  const sample27 = toSample(buildRawGameStatForGameNumber(27))!;
  let pred27 = best.model.modelType === 'baseline'
    ? predictBaseline(best.model as BaselineModelJson, sample27)
    : predictRidge(best.model as RidgeModelJson, sample27);
  pred27 = pred27 / 1000 / 60;

  // Persist artifacts
  const modelPath = 'public/difficulty-ml-model.json';
  writeFileSync(modelPath, JSON.stringify(best.model, null, 2), 'utf8');

  const results = {
    selectedModel: best.model,
    metrics: best.metrics,
    perSizeRmse: best.perSizeRmse,
    baseline,
    ridgeCandidates: ridgeCandidates
      .map((e) => ({ model: { modelType: e.model.modelType, lambda: (e.model as RidgeModelJson).lambda, transform: (e.model as RidgeModelJson).transform }, metrics: e.metrics }))
      .sort((a, b) => a.metrics.rmse - b.metrics.rmse),
    predictionForGame27: pred27,
  };
  writeFileSync('development-tools/ml-training-results.json', JSON.stringify(results, null, 2), 'utf8');

  console.log('Training complete');
  console.log('');
  logWeights(best)
  console.log('');
  modelStats(best, trainEval);
  console.log('');
  console.log('Prediction for game #27 (minutes):', pred27.toFixed(1));


  // Generate predictions for game boards 10 -> 2010 (inclusive), sort, and persist
  let boardsToEvaluate = 2000
  console.log(`Evaluating difficulty of ${boardsToEvaluate} boards`)
  const predictions: { gameNumber: number; predictedMs: number }[] = [];
  for (let gameNumber = 0; gameNumber <= boardsToEvaluate; gameNumber++) {
    const sample = toSample(buildRawGameStatForGameNumber(gameNumber));
    
    if (!sample) continue;
    const yhat = best.model.modelType === 'baseline'
      ? predictBaseline(best.model as BaselineModelJson, sample)
      : predictRidge(best.model as RidgeModelJson, sample);
    predictions.push({ gameNumber, predictedMs: yhat });
  }

  predictions.forEach(x => x.predictedMs = Math.round(x.predictedMs))
  let next1kTimes = predictions.sort((a, b) => a.predictedMs - b.predictedMs).map(x => Math.round(x.predictedMs));
  writeFileSync('development-tools/ml-predictions-2k-times.json', JSON.stringify(next1kTimes, null, 2), 'utf8');
  writeFileSync('development-tools/ml-predictions-2k-games.json', JSON.stringify(predictions, null, 2), 'utf8');
  // Also persist a public copy with just the sorted times for use in-app
  try {
    writeFileSync('public/difficulty-ml-predicted-times.json', JSON.stringify(next1kTimes, null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed to write public/difficulty-ml-predicted-times.json', err);
  }

}

function modelStats(best: ModelEvaluationResult<ModelJson>, trainEval?: ModelEvaluationResult<ModelJson>): void {
  console.log('Best model:', best.model.modelType, best.model.modelType === 'ridge' ? (best.model as RidgeModelJson).lambda + '/' + (best.model as RidgeModelJson).transform : 'baseline');
  if (trainEval) console.log('Training RMSE:', trainEval.metrics.rmse.toFixed(2), 'MAE:', trainEval.metrics.mae.toFixed(2), 'R2:', trainEval.metrics.r2.toFixed(3));
  console.log('Validation RMSE:', best.metrics.rmse.toFixed(2), 'MAE:', best.metrics.mae.toFixed(2), 'R2:', best.metrics.r2.toFixed(3));
}


function logWeights(best: ModelEvaluationResult<ModelJson>): void {
  // Print weights sorted by absolute value (feature name and weight)
  if (best.model.modelType === 'ridge') {
    const ridge = best.model as RidgeModelJson;
    const names = ['intercept', ...ridge.features];
    const pairs = names.map((name, i) => ({ name, weight: ridge.weights[i] ?? 0 }));
    pairs.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
    console.log('');
    console.log('Weights (sorted by |weight| desc):');
    console.log('');
    for (const { name, weight } of pairs) console.log((weight >= 0 ? " " : "") + weight.toFixed(5) + ': ' + name);
  } else {
    console.log('Baseline model selected: no feature weights to display.');
  }

}


main();
