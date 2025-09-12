import { Injectable } from '@angular/core';
import { ModelJson, RidgeModelJson, BaselineModelJson } from '../model/ml-types';

@Injectable({ providedIn: 'root' })
export class TimePredictorService {
  private modelPromise?: Promise<ModelJson | undefined>;
  private overrideModel?: ModelJson;

  private async loadModel(): Promise<ModelJson | undefined> {
    if (this.overrideModel) return this.overrideModel;
    if (!this.modelPromise) {
      this.modelPromise = fetch('difficulty-ml-model.json', { cache: 'no-cache' })
        .then(async (r: Response): Promise<ModelJson | undefined> => {
          if (!r.ok) return undefined;
          return (await r.json()) as ModelJson;
        })
        .catch((err: unknown): ModelJson | undefined => {
          console.warn('TimePredictorService: failed to load model', err);
          return undefined;
        });
    }
    return this.modelPromise;
  }

  // Allows in-session override of the model (not persisted). Useful for training in-browser.
  setModelOverride(model: ModelJson): void {
    this.overrideModel = model;
  }

  getCurrentModel(): ModelJson | undefined {
    return this.overrideModel;
  }

  async predict(features: GameStatFeatures): Promise<number | undefined> {
    try {
      const model = await this.loadModel();
      if (!model) return undefined;
      if (model.modelType === 'baseline') return this.predictBaseline(model, features);
      else return this.predictRidge(model, features);
    } catch (err) {
      console.warn('TimePredictorService.predict failed', err);
      return undefined;
    }
  }

  private predictBaseline(model: BaselineModelJson, f: GameStatFeatures): number {
    const perSize = model.perSizeMeans[String(f.boardSize)];
    return perSize ?? model.globalMean;
  }

  private predictRidge(model: RidgeModelJson, f: GameStatFeatures): number {
    const xs = model.features.map((k) => (f as any)[k] as number);
    const x = xs.map((v, j) => (v - model.featureMeans[j]) / (model.featureStds[j] || 1));
    let yhat = model.weights[0];
    for (let j = 0; j < x.length; j++) yhat += model.weights[j + 1] * x[j];
    if (model.transform === 'log1p') yhat = Math.max(0, Math.expm1(yhat));
    return yhat;
  }
}



export interface GameStatWithBoard {
  gameNumber: number;
}

export interface GameStatWithTimeSpent {
  timeSpent: number;
}

// Subset of GameStat features required for prediction. Excludes gameNumber and timeSpent.
export interface GameStatFeatures {
  boardSize: number;
  rowsAndColumnsRequiredSumAvg: number;
  rowsAndColumnsRequiredSumRms: number;
  rowsAndColumnsValuesRmsAvg: number;
  rowsAndColumnsValuesRmsRms: number;
  rowsAndColumnsRequiredSumMin: number;
  rowsAndColumnsRequiredSumMax: number;
  rowsAndColumnsValuesRmsMin: number;
  rowsAndColumnsValuesRmsMax: number;
  groupsRequiredSumAvg: number;
  groupsRequiredSumRms: number;
  groupsValuesRmsAvg: number;
  groupsValuesRmsRms: number;
  groupsRequiredSumMin: number;
  groupsRequiredSumMax: number;
  groupsValuesRmsMin: number;
  groupsValuesRmsMax: number;
  // Aggregates of exactCombinationCount for rows, columns, and groups
  rowExactCombinationCountMean: number;
  rowExactCombinationCountMin: number;
  rowExactCombinationCountMax: number;
  rowExactCombinationCountStd: number;
  rowExactCombinationCountSum: number;
  columnExactCombinationCountMean: number;
  columnExactCombinationCountMin: number;
  columnExactCombinationCountMax: number;
  columnExactCombinationCountStd: number;
  columnExactCombinationCountSum: number;
  groupExactCombinationCountMean: number;
  groupExactCombinationCountMin: number;
  groupExactCombinationCountMax: number;
  groupExactCombinationCountStd: number;
  groupExactCombinationCountSum: number;
  rowsAndColumnsExactCombinationCountMean: number;
  rowsAndColumnsExactCombinationCountMin: number;
  rowsAndColumnsExactCombinationCountMax: number;
  rowsAndColumnsExactCombinationCountStd: number;
  allExactCombinationCountMean: number;
  allExactCombinationCountMin: number;
  allExactCombinationCountMax: number;
  allExactCombinationCountStd: number;
  //
  maxStates: number;
  cellCount: number;
  rowRequiredRatioMean: number;
  rowRequiredRatioMin: number;
  rowRequiredRatioMax: number;
  rowRequiredRatioStd: number;
  colRequiredRatioMean: number;
  colRequiredRatioMin: number;
  colRequiredRatioMax: number;
  colRequiredRatioStd: number;
  groupRequiredRatioMean: number;
  groupRequiredRatioMin: number;
  groupRequiredRatioMax: number;
  groupRequiredRatioStd: number;
  rowAndColumnRequiredRatioMean: number;
  rowAndColumnRequiredRatioMin: number;
  rowAndColumnRequiredRatioMax: number;
  rowAndColumnRequiredRatioStd: number;
  allRequiredRatioMean: number;
  allRequiredRatioMin: number;
  allRequiredRatioMax: number;
  allRequiredRatioStd: number;
  //
}
