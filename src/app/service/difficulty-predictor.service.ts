import { Injectable } from '@angular/core';
import { ModelJson } from '../model/ml-types';
import { TrainingSample, predictRidge } from './ml-core';

@Injectable({ providedIn: 'root' })
export class DifficultyPredictorService {
  private packagedModelPromise?: Promise<ModelJson | undefined>;

  constructor() { }

  // Predict strictly using the downloaded packaged model (for Difficulty percentile display)
  async predictGameModel(features: TrainingSample): Promise<number | undefined> {
    try {
      const model = await this.loadPackagedModel();
      if (!model || model.modelType === 'baseline')
        return undefined;
      else
        return predictRidge(model, features);
    } catch (err) {
      console.warn('TimePredictorService.predictFromPackaged failed', err);
      return undefined;
    }
  }


  private async loadPackagedModel(): Promise<ModelJson | undefined> {
    if (!this.packagedModelPromise) {
      this.packagedModelPromise = fetch('difficulty-ml-model.json', { cache: 'no-cache' })
        .then(async (r: Response): Promise<ModelJson | undefined> => {
          if (!r.ok)
            return undefined;
          return (await r.json()) as ModelJson;
        })
        .catch((err: unknown): ModelJson | undefined => {
          console.warn('TimePredictorService: failed to load packaged model', err);
          return undefined;
        });
    }
    return this.packagedModelPromise;
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
  rowsAndColumnsExactCombinationCountSum: number;
  allExactCombinationCountMean: number;
  allExactCombinationCountMin: number;
  allExactCombinationCountMax: number;
  allExactCombinationCountStd: number;
  allExactCombinationCountSum: number;
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
  // New metrics: alwaysRequired and neverUsed counts (aggregated)
  rowAlwaysRequiredCountMean: number;
  rowAlwaysRequiredCountMin: number;
  rowAlwaysRequiredCountMax: number;
  rowAlwaysRequiredCountStd: number;
  columnAlwaysRequiredCountMean: number;
  columnAlwaysRequiredCountMin: number;
  columnAlwaysRequiredCountMax: number;
  columnAlwaysRequiredCountStd: number;
  rowsAndColumnsAlwaysRequiredCountMean: number;
  rowsAndColumnsAlwaysRequiredCountMin: number;
  rowsAndColumnsAlwaysRequiredCountMax: number;
  rowsAndColumnsAlwaysRequiredCountStd: number;

  rowNeverUsedCountMean: number;
  rowNeverUsedCountMin: number;
  rowNeverUsedCountMax: number;
  rowNeverUsedCountStd: number;
  columnNeverUsedCountMean: number;
  columnNeverUsedCountMin: number;
  columnNeverUsedCountMax: number;
  columnNeverUsedCountStd: number;
  rowsAndColumnsNeverUsedCountMean: number;
  rowsAndColumnsNeverUsedCountMin: number;
  rowsAndColumnsNeverUsedCountMax: number;
  rowsAndColumnsNeverUsedCountStd: number;
  // Group aggregates for new metrics
  groupAlwaysRequiredCountMean: number;
  groupAlwaysRequiredCountMin: number;
  groupAlwaysRequiredCountMax: number;
  groupAlwaysRequiredCountStd: number;
  groupAlwaysRequiredCountSum: number;
  groupNeverUsedCountMean: number;
  groupNeverUsedCountMin: number;
  groupNeverUsedCountMax: number;
  groupNeverUsedCountStd: number;
  // All aggregates (rows+columns+groups)
  allAlwaysRequiredCountMean: number;
  allAlwaysRequiredCountMin: number;
  allAlwaysRequiredCountMax: number;
  allAlwaysRequiredCountStd: number;
  allNeverUsedCountMean: number;
  allNeverUsedCountMin: number;
  allNeverUsedCountMax: number;
  allNeverUsedCountStd: number;
  //
  allAlwaysRequiredCountSum: number;
  allNeverUsedCountSum: number;
}
