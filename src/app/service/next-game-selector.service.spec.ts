import { GameInProgressDtoV3 } from '../model/saved-game-data/game-in-progress.v3';
import { DifficultyDisplayDetails } from './difficulty-predictor.service';
import { NextGameFilterService } from './next-game-filter.service';
import { NextGameSelectorService } from './next-game-selector.service';

class DifficultyPredictorStub {
  results = new Map<number, DifficultyDisplayDetails | undefined>();

  async getDifficultyEstimates(gameNumber: number): Promise<DifficultyDisplayDetails | undefined> {
    return this.results.get(gameNumber);
  }
}

describe('NextGameSelectorService', () => {
  const storageKey = 'nextGameFilterOptions';
  let filterService: NextGameFilterService;
  let predictorStub: DifficultyPredictorStub;
  let selector: NextGameSelectorService;
  const makeDetails = (overrides?: Partial<DifficultyDisplayDetails>): DifficultyDisplayDetails => ({
    percentile: 0.5,
    estimatedSolveTime: 60000,
    firstPrincipalResolvableCellCount: 0,
    firstPrincipalUnResoledCellCount: 0,
    boardSize: 7,
    ...overrides,
  });

  const makeGame = (gameNumber: number): GameInProgressDtoV3 => ({
    gameNumber,
    completed: true,
    grid: [],
    moveHistory: [],
    timeSpent: 0,
  });

  beforeEach(() => {
    localStorage.removeItem(storageKey);
    filterService = new NextGameFilterService();
    predictorStub = new DifficultyPredictorStub();
    selector = new NextGameSelectorService(predictorStub as any, filterService);
  });

  it('returns disabled when filter is off', async () => {
    filterService.setOptions({ ...filterService.getOptions(), enabled: false });
    const result = await selector.findNextGame(1, new Map());
    expect(result.status).toBe('disabled');
  });

  it('finds the first matching unplayed game', async () => {
    filterService.setOptions({
      enabled: true,
      excludeFpPlus: false,
      skipCompleted: true,
      mode: 'difficulty',
      minDifficulty: 40,
      maxDifficulty: 60,
      minTimeSeconds: undefined,
      maxTimeSeconds: undefined,
    });

    predictorStub.results.set(2, makeDetails({ percentile: 0.3 }));
    predictorStub.results.set(3, makeDetails({ percentile: 0.5 }));

    const previous = new Map<number, GameInProgressDtoV3>([
      [1, makeGame(1)],
      [2, makeGame(2)],
    ]);

    const result = await selector.findNextGame(1, previous);
    expect(result.status).toBe('match');
    expect(result.gameNumber).toBe(3);
  });

  it('falls back to next unplayed when no match found', async () => {
    filterService.setOptions({
      enabled: true,
      excludeFpPlus: false,
      skipCompleted: true,
      mode: 'difficulty',
      minDifficulty: 80,
      maxDifficulty: 90,
      minTimeSeconds: undefined,
      maxTimeSeconds: undefined,
    });

    predictorStub.results.set(2, makeDetails({ percentile: 0.1 }));

    const previous = new Map<number, GameInProgressDtoV3>([
      [1, makeGame(1)],
    ]);

    const result = await selector.findNextGame(1, previous, undefined, undefined, undefined, undefined, 5);
    expect(result.status).toBe('none');
  });

  it('returns cancelled when abort signal is triggered', async () => {
    filterService.setOptions({
      enabled: true,
      excludeFpPlus: false,
      skipCompleted: true,
      mode: 'difficulty',
      minDifficulty: undefined,
      maxDifficulty: undefined,
      minTimeSeconds: undefined,
      maxTimeSeconds: undefined,
    });

    predictorStub.results.set(2, makeDetails({ percentile: 0.1 }));

    const controller = new AbortController();
    const promise = selector.findNextGame(1, new Map(), controller.signal);
    controller.abort();
    const result = await promise;

    expect(result.status).toBe('cancelled');
    expect(result.gameNumber).toBeUndefined();
  });

  it('can return an in-progress game that matches the filter', async () => {
    filterService.setOptions({
      enabled: true,
      excludeFpPlus: false,
      skipCompleted: true,
      mode: 'difficulty',
      minDifficulty: 40,
      maxDifficulty: 60,
      minTimeSeconds: undefined,
      maxTimeSeconds: undefined,
    });

    predictorStub.results.set(2, makeDetails({ percentile: 0.5 }));

    const previous = new Map<number, GameInProgressDtoV3>([
      [1, makeGame(1)],
      [2, { ...makeGame(2), completed: false }],
    ]);

    const result = await selector.findNextGame(1, previous, undefined, undefined, undefined, undefined, 5);
    expect(result.status).toBe('match');
    expect(result.gameNumber).toBe(2);
  });

  it('returns a completed game when skipCompleted is false', async () => {
    filterService.setOptions({
      enabled: true,
      excludeFpPlus: false,
      skipCompleted: false,
      mode: 'difficulty',
      minDifficulty: 40,
      maxDifficulty: 60,
      minTimeSeconds: undefined,
      maxTimeSeconds: undefined,
    });

    predictorStub.results.set(2, makeDetails({ percentile: 0.5 }));

    const previous = new Map<number, GameInProgressDtoV3>([
      [1, makeGame(1)],
      [2, { ...makeGame(2), completed: true }],
    ]);

    const result = await selector.findNextGame(1, previous);
    expect(result.status).toBe('match');
    expect(result.gameNumber).toBe(2);
  });
});
