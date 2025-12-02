import { Injectable } from '@angular/core';
import { GameInProgressDtoV3 } from '../model/saved-game-data/game-in-progress.v3';
import { DifficultyDisplayDetails, DifficultyPredictorService } from './difficulty-predictor.service';
import { NextGameFilterService } from './next-game-filter.service';

export type NextGameSelectionStatus = 'match' | 'none' | 'disabled' | 'cancelled';

export interface NextGameSelectionResult {
  status: NextGameSelectionStatus;
  gameNumber?: number;
}

@Injectable({ providedIn: 'root' })
export class NextGameSelectorService {

  constructor(
    private predictor: DifficultyPredictorService,
    private filterService: NextGameFilterService,
  ) { }


  async findNextGame(
    currentGameNumber: number,
    previousGames: Map<number, GameInProgressDtoV3>,
    abortSignal?: AbortSignal,
    direction: SearchDirection = 'forward',
    onProgress?: (gameNumber: number) => void,
    skipCompletedOverride?: boolean,
    gameSearchMaxCount = 10000,
  ): Promise<NextGameSelectionResult> {
    const baseOptions = this.filterService.getOptions();
    const options = skipCompletedOverride == null
      ? baseOptions
      : { ...baseOptions, skipCompleted: skipCompletedOverride };
    if (!options.enabled)
      return { status: 'disabled' };


    const completedGames = options.skipCompleted
      ? new Set<number>(
        Array.from(previousGames.values())
          .filter(game => game.completed)
          .map(game => game.gameNumber),
      )
      : new Set<number>();
    let directionAmount = direction === 'forward' ? 1 : -1;
    const start = Math.max(1, currentGameNumber + directionAmount);
    let lastPause = Date.now();
    let gamesSearched = 0;

    for (let game = start; game > 0 && gamesSearched < gameSearchMaxCount; game += directionAmount, gamesSearched++) {
      if (abortSignal?.aborted)
        return { status: 'cancelled' };

      if (completedGames.has(game))
        continue;

      onProgress?.(game);

      const details = await this.getDifficultyDetails(game);
      if (abortSignal?.aborted)
        return { status: 'cancelled' };

      if (!details)
        continue;

      if (this.filterService.matchesFilter(details, options))
        return { status: 'match', gameNumber: game };

      // Yield to allow UI (e.g., search dialog) to render between iterations
      if (Date.now() - lastPause > 250) {
        lastPause = Date.now();
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return { status: 'none' };
  }


  private async getDifficultyDetails(gameNumber: number): Promise<DifficultyDisplayDetails | undefined> {
    try {
      return await this.predictor.getDifficultyEstimates(gameNumber);
    } catch (error) {
      console.warn(`nextGameFilter: failed to get difficulty for game ${gameNumber}`, error);
      return undefined;
    }
  }
}


export type SearchDirection = 'forward' | 'backward';
