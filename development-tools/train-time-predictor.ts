import { rmSync, writeFileSync } from 'fs';
import * as path from 'path';
import { BoardGroupVersion } from '../src/app/model/grouping';
import { BaselineModelJson, ModelEvaluationResult, ModelJson, RidgeModelJson } from '../src/app/model/ml-types';
import { evaluate, predictBaseline, predictRidge, stratifiedSplit, toSample, trainBestModel, TrainingSample } from '../src/app/service/ml-core';
import { logWeights, modelStats, parseThreadCount } from './predictor-utils';
import { buildRawGameStatForGameNumber, computeStatsFromBackupFile } from './training-data-loader';
import { WorkerPool } from './workers/worker-pool';



/*
  Run with:
    npx ts-node -P tsconfig.node.json --compiler-options '{"module":"CommonJS"}' development-tools/train-time-predictor.ts --threads=8
*/
async function main(): Promise<void> {
  console.log('Loading and computing stats');
  const rawStats = await computeStatsFromBackupFile();

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
  const sample27 = toSample(await buildRawGameStatForGameNumber(27))!;
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
    perSizeMae: best.perSizeMae,
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
  console.log('');


  let startBoardNumber = 1;
  let boardsToEvaluate = 2000;
  const threadCount = parseThreadCount();
  console.log(`Evaluating difficulty of ${boardsToEvaluate} boards using ${threadCount} thread(s)`);

  const predictions: { gameNumber: number; predictedMs: number }[] = [];
  const genStart = Date.now();

  let boardGeneratorVersion: BoardGroupVersion = 1;
  if (threadCount <= 1) {
    predictions.push(...await predictSequential(best.model, startBoardNumber, startBoardNumber + boardsToEvaluate, boardGeneratorVersion));
  } else {
    const workerPath = path.resolve(__dirname, 'workers', 'predict-pull.worker.ts');
    const numbers: number[] = [];
    for (let gameNumber = startBoardNumber; gameNumber < boardsToEvaluate + startBoardNumber; gameNumber++)
      numbers.push(gameNumber);

    const pool = new WorkerPool({ workerPath, threads: threadCount, model: best.model, numbers, boardGeneratorVersion });
    const parallelResults = await pool.run();
    predictions.push(...parallelResults);
  }

  const genSeconds = (Date.now() - genStart) / 1000;
  console.log(`Generated predictions for ${predictions.length} boards in ${genSeconds.toFixed(2)}s`);

  predictions.forEach(x => x.predictedMs = Math.round(x.predictedMs))
  // Keep deterministic order like the original loop
  predictions.sort((a, b) => a.gameNumber - b.gameNumber);
  let next1kTimes = predictions.sort((a, b) => a.predictedMs - b.predictedMs).map(x => Math.round(x.predictedMs));

  const predictedGameTimes = 'development-tools/ml-predictions-2k-games.json';
  const predictedTimes = 'public/difficulty-ml-predicted-times.json';
  rmSync(predictedGameTimes, { force: true })
  rmSync(predictedTimes, { force: true })
  if ((next1kTimes[0] ?? 0) <= 0) {
    rmSync(modelPath, { force: true })
    console.error("\n!!!!!!!\n!  Negative or instant completion time predicted... There's a problem with the model.\n!!!!!!!\n")
    process.exit(1);
  }

  writeFileSync(predictedGameTimes, JSON.stringify(predictions, null, 2), 'utf8');
  writeFileSync(predictedTimes, JSON.stringify(next1kTimes, null, 2), 'utf8');
}

async function predictSequential(model: ModelJson, startInclusive: number, endExclusive: number, boardGeneratorVersion: BoardGroupVersion): Promise<{ gameNumber: number; predictedMs: number }[]> {
  const out: { gameNumber: number; predictedMs: number }[] = [];
  for (let gameNumber = startInclusive; gameNumber < endExclusive; gameNumber++) {
    const sample = toSample(await buildRawGameStatForGameNumber(gameNumber, boardGeneratorVersion));
    if (!sample) continue;
    const yhat = model.modelType === 'baseline'
      ? predictBaseline(model as BaselineModelJson, sample)
      : predictRidge(model as RidgeModelJson, sample);
    out.push({ gameNumber, predictedMs: yhat });
  }
  return out;
}

main().catch((err) => {
  console.error('train-time-predictor failed', err);
  process.exit(1);
});
