import { NextGameFilterOptions, NextGameFilterService } from './next-game-filter.service';
import { DifficultyDisplayDetails } from './difficulty-predictor.service';

describe('NextGameFilterService', () => {
  const storageKey = 'nextGameFilterOptions';
  let service: NextGameFilterService;

  const sampleDetails = (overrides?: Partial<DifficultyDisplayDetails>): DifficultyDisplayDetails => ({
    percentile: 0.5,
    estimatedSolveTime: 120000,
    firstPrincipalResolvableCellCount: 0,
    firstPrincipalUnResoledCellCount: 0,
    boardSize: 7,
    ...overrides,
  });

  beforeEach(() => {
    localStorage.removeItem(storageKey);
    service = new NextGameFilterService();
  });

  it('loads defaults when storage is empty', () => {
    const options = service.getOptions();
    expect(options.enabled).toBeFalse();
    expect(options.mode).toBe('difficulty');
    expect(options.skipCompleted).toBeTrue();
  });

  it('persists options to storage', () => {
    const options: NextGameFilterOptions = {
      enabled: true,
      excludeFpPlus: true,
      skipCompleted: false,
      mode: 'time',
      minDifficulty: 10,
      maxDifficulty: 90,
      minTimeSeconds: 30,
      maxTimeSeconds: 90,
    };

    service.setOptions(options);

    const stored = JSON.parse(localStorage.getItem(storageKey) || '{}') as NextGameFilterOptions;
    expect(stored.enabled).toBeTrue();
    expect(stored.excludeFpPlus).toBeTrue();
    expect(stored.skipCompleted).toBeFalse();
    expect(stored.mode).toBe('time');
    expect(stored.minTimeSeconds).toBe(30);
    expect(stored.maxTimeSeconds).toBe(90);
  });

  it('matches difficulty range when enabled', () => {
    service.setOptions({
      enabled: true,
      excludeFpPlus: false,
      skipCompleted: true,
      mode: 'difficulty',
      minDifficulty: 40,
      maxDifficulty: 60,
      minTimeSeconds: undefined,
      maxTimeSeconds: undefined,
    });

    expect(service.matchesFilter(sampleDetails({ percentile: 0.55 }))).toBeTrue();
    expect(service.matchesFilter(sampleDetails({ percentile: 0.30 }))).toBeFalse();
  });

  it('matches time range when enabled', () => {
    service.setOptions({
      enabled: true,
      excludeFpPlus: false,
      skipCompleted: true,
      mode: 'time',
      minTimeSeconds: 50,
      maxTimeSeconds: 80,
      minDifficulty: undefined,
      maxDifficulty: undefined,
    });

    expect(service.matchesFilter(sampleDetails({ estimatedSolveTime: 60000 }))).toBeTrue();
    expect(service.matchesFilter(sampleDetails({ estimatedSolveTime: 120000 }))).toBeFalse();
  });

  it('excludes FP+ boards when requested', () => {
    service.setOptions({
      enabled: true,
      excludeFpPlus: true,
      skipCompleted: true,
      mode: 'difficulty',
      minDifficulty: undefined,
      maxDifficulty: undefined,
      minTimeSeconds: undefined,
      maxTimeSeconds: undefined,
    });

    expect(service.matchesFilter(sampleDetails({ firstPrincipalUnResoledCellCount: 1 }))).toBeFalse();
    expect(service.matchesFilter(sampleDetails({ firstPrincipalUnResoledCellCount: 0 }))).toBeTrue();
  });

  it('matches board size range when enabled', () => {
    service.setOptions({
      enabled: true,
      excludeFpPlus: false,
      skipCompleted: true,
      mode: 'boardSize',
      minBoardSize: 6,
      maxBoardSize: 8,
    });

    expect(service.matchesFilter(sampleDetails({ boardSize: 7 }))).toBeTrue();
    expect(service.matchesFilter(sampleDetails({ boardSize: 5 }))).toBeFalse();
  });
});
