import { SessionService } from './session.service';

describe('SessionService', () => {
  const startKey = 'sessionStartTs';
  const endKey = 'sessionEndTs';
  const difficultyKey = 'sessionBoardDifficulties';

  afterEach(() => {
    localStorage.clear();
  });

  function createServiceWithData(data: any) {
    const mockSaveDataService = {
      service: {
        load: jasmine.createSpy('load').and.returnValue(Promise.resolve(data)),
      },
    };
    const mockPredictor = {
      getDifficultyEstimates: jasmine.createSpy('getDifficultyEstimates').and.returnValue(
        Promise.resolve({
          percentile: 0.5,
          estimatedSolveTime: 800,
          firstPrincipalUnResoledCellCount: 0,
          firstPrincipalResolvableCellCount: 0,
        }),
      ),
    };
    return new SessionService(mockSaveDataService as any, mockPredictor as any);
  }

  it('starts and ends sessions with persisted timestamps', () => {
    const service = createServiceWithData(null);
    service.startSession();
    const firstState = service.currentState;
    expect(firstState.active).toBeTrue();
    expect(localStorage.getItem(startKey)).toBeTruthy();
    expect(localStorage.getItem(endKey)).toBeNull();

    service.endSession();
    const secondState = service.currentState;
    expect(secondState.active).toBeFalse();
    expect(localStorage.getItem(endKey)).toBeTruthy();
    service.ngOnDestroy();
  });

  it('filters games by session bounds and computes stats', async () => {
    localStorage.setItem(startKey, '1000');
    localStorage.setItem(endKey, '6000');
    localStorage.setItem(difficultyKey, JSON.stringify([{ boardNumber: 1, difficulty: 50, parTimeMs: 800 }]));

    const savedData = {
      inProgressGames: [
        {
          gameNumber: 1,
          completed: true,
          moveHistory: [
            { timestamp: 2000, correct: true },
            { timestamp: 3000, correct: false },
          ],
          timeSpent: 1000,
        },
        {
          gameNumber: 2,
          completed: true,
          moveHistory: [
            { timestamp: 500, correct: true }, // before session start
          ],
          timeSpent: 500,
        },
      ],
    };

    const service = createServiceWithData(savedData);
    const stats = await service.computeSessionStats();

    expect(stats.boardCount).toBe(1);
    expect(stats.maxMistakes).toBe(1);
    expect(stats.totalPlayTimeMs).toBe(1000);
    expect(stats.averageMistakes).toBeCloseTo(1, 5);
    expect(stats.cumulativeDifficulty).toBe(50);
    expect(stats.averageDifficulty).toBe(50);
    expect(stats.maxDifficulty).toBe(50);
    expect(stats.timeVariancePercent).toBeCloseTo(22.22222, 5);
    expect(stats.accuracyPercent).toBeCloseTo(50, 5);
    service.ngOnDestroy();
  });

  it('adds and removes difficulty entries only when active', () => {
    const service = createServiceWithData(null);
    service.addDifficultyEntry({ boardNumber: 1, difficulty: 10, parTimeMs: 100 });
    expect(service.currentState.difficulties.length).toBe(0);

    service.startSession();
    service.addDifficultyEntry({ boardNumber: 1, difficulty: 10, parTimeMs: 100 });
    expect(service.currentState.difficulties.length).toBe(1);

    service.removeDifficultyEntry(1);
    expect(service.currentState.difficulties.length).toBe(0);
    service.ngOnDestroy();
  });
});
