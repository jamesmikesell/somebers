import { isMainThread, parentPort, workerData } from 'worker_threads';
import { BoardGroupVersion } from '../../src/app/model/grouping';
import { BaselineModelJson, ModelJson, RidgeModelJson } from '../../src/app/model/ml-types';
import { predictBaseline, predictRidge, toSample } from '../../src/app/service/ml-core';
import { buildRawGameStatForGameNumber } from '../training-data-loader';

type InitData = {
  model: ModelJson;
};

export type MsgFromMain =
  | { t: 'task'; gameNumber: number; boardGeneratorVersion: BoardGroupVersion; }
  | { t: 'no-more' };

type MsgToMain =
  | { t: 'ready' }
  | { t: 'result'; gameNumber: number; predictedMs: number; boardSize: number; };

async function predictOne(model: ModelJson, gameNumber: number, boardGeneratorVersion: BoardGroupVersion): Promise<{ predictedMs: number, boardSize: number } | null> {
  const sample = toSample(await buildRawGameStatForGameNumber(gameNumber, boardGeneratorVersion), model.features);
  if (!sample) return null;
  const yhat = model.modelType === 'baseline'
    ? predictBaseline(model as BaselineModelJson, sample)
    : predictRidge(model as RidgeModelJson, sample);
  return { predictedMs: yhat, boardSize: sample.boardSize };
}

if (!isMainThread && parentPort) {
  const { model } = (workerData as InitData) ?? {} as InitData;
  if (!model) throw new Error('Worker started without model in workerData');

  const onMessage = (msg: MsgFromMain): void => {
    if (msg.t === 'task') {
      void (async () => {
        const prediction = await predictOne(model, msg.gameNumber, msg.boardGeneratorVersion);
        if (prediction != null) {
          const out: MsgToMain = { t: 'result', gameNumber: msg.gameNumber, predictedMs: prediction.predictedMs, boardSize: prediction.boardSize, };
          parentPort!.postMessage(out);
        }
        // Ask for the next task regardless of sample success
        parentPort!.postMessage({ t: 'ready' } satisfies MsgToMain);
      })();
    } else if (msg.t === 'no-more') {
      // Graceful shutdown
      parentPort!.off('message', onMessage);
      // Allow the event loop to drain and exit
      parentPort!.close();
    }
  };

  parentPort.on('message', onMessage);
  // Signal readiness to receive the first task
  parentPort.postMessage({ t: 'ready' } satisfies MsgToMain);
}
