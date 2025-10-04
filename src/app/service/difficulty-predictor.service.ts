import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DisplayCell } from '../model/game-board';
import { ModelJson } from '../model/ml-types';
import { BoardStatAnalyzer } from './board-stat-analyzer';
import { CachingBoardGeneratorService } from './caching-board-generator.service';
import { predictRidge, toSample, TrainingSample } from './ml-core';
import { difficultyReportToGameStat, GamePlayStats } from './ml-difficulty-stats';

@Injectable({ providedIn: 'root' })
export class DifficultyPredictorService {
  private packagedModelPromise?: Promise<ModelJson | undefined>;
  private timesPromise?: Promise<number[] | undefined>;

  constructor(
    private http: HttpClient,
    private cachingBoardGenerator: CachingBoardGeneratorService,
  ) { }

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


  async getDifficultyEstimates(gameNumberOrArea: DisplayCell[][] | number): Promise<DifficultyDisplayDetails> {
    let effectivePlayArea: DisplayCell[][];
    if (typeof gameNumberOrArea === "number")
      effectivePlayArea = (await this.cachingBoardGenerator.generateOrGetGameBoard(gameNumberOrArea)).playArea;
    else
      effectivePlayArea = gameNumberOrArea;

    if (!effectivePlayArea || effectivePlayArea.length === 0)
      return undefined;

    const difficultyAnalysis = BoardStatAnalyzer.evaluate(effectivePlayArea);

    const unresolvedCells = difficultyAnalysis.totals.unresolvedCellCountAfterDeduction;
    const resolvableCells = Math.pow(difficultyAnalysis.totals.rowsEvaluated, 2) - unresolvedCells;

    const gamePlayStats: GamePlayStats = {
      timeSpent: 0,
      gameNumber: 0,
      gameDateAsPercent: 1,
      breaksMinutes: 0,
    }

    const stats = toSample(difficultyReportToGameStat(difficultyAnalysis, gamePlayStats))!;
    const estimatedSolveTime = await this.predictGameModel(stats);
    const percentile = await this.getPercentile(estimatedSolveTime);


    return {
      estimatedSolveTime: estimatedSolveTime,
      percentile: percentile,
      firstPrincipalUnResoledCellCount: unresolvedCells,
      firstPrincipalResolvableCellCount: resolvableCells,
    };
  }


  private async getPercentile(ms: number): Promise<number> {
    const times = await this.loadPredictedSolveTimesList();
    if (!times || times.length === 0)
      return undefined;

    const n = times.length;
    // Binary search insertion index (number of values <= ms)
    let lo = 0, hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (times[mid] <= ms)
        lo = mid + 1;
      else
        hi = mid;
    }
    const percentile = (lo / n);
    return percentile;
  }


  private async loadPackagedModel(): Promise<ModelJson | undefined> {
    if (!this.packagedModelPromise) {
      this.packagedModelPromise = firstValueFrom(this.http.get<ModelJson>('difficulty-ml-model.json'))
        .catch((err: unknown): ModelJson | undefined => {
          console.warn('TimePredictorService: failed to load packaged model', err);
          return undefined;
        });
    }
    return this.packagedModelPromise;
  }


  private async loadPredictedSolveTimesList(): Promise<number[] | undefined> {
    if (!this.timesPromise) {
      this.timesPromise = firstValueFrom(this.http.get<number[]>('difficulty-ml-predicted-times.json'))
        .then((data: number[]): number[] | undefined => {
          if (!Array.isArray(data))
            return undefined;

          const times = data.filter((value) => Number.isFinite(value));
          times.sort((a, b) => a - b);
          return times;
        })
        .catch((err: unknown): number[] | undefined => {
          console.warn('EstimatedDifficultyComponent: failed to load times', err);
          return undefined;
        });
    }
    return this.timesPromise;
  }

}


export interface DifficultyDisplayDetails {
  percentile: number;
  estimatedSolveTime: number;
  firstPrincipalUnResoledCellCount: number;
  firstPrincipalResolvableCellCount: number;
}