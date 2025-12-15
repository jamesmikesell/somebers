import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { DifficultyDisplayDetails } from './difficulty-predictor.service';

export type NextGameFilterMode = 'difficulty' | 'time' | 'boardSize';

export interface NextGameFilterOptions {
  enabled: boolean;
  excludeFpPlus: boolean;
  skipCompleted: boolean;
  mode: NextGameFilterMode;
  minDifficulty?: number;
  maxDifficulty?: number;
  minTimeSeconds?: number;
  maxTimeSeconds?: number;
  minBoardSize?: number;
  maxBoardSize?: number;
}

@Injectable({ providedIn: 'root' })
export class NextGameFilterService {
  private readonly storageKey = 'nextGameFilterOptions';
  private readonly optionsSubject: BehaviorSubject<NextGameFilterOptions>;

  constructor() {
    const stored = this.loadFromStorage();
    this.optionsSubject = new BehaviorSubject<NextGameFilterOptions>(stored);
  }

  get options$(): Observable<NextGameFilterOptions> {
    return this.optionsSubject.asObservable();
  }

  get enabled$(): Observable<boolean> {
    return this.options$.pipe(map(options => options.enabled === true));
  }

  getOptions(): NextGameFilterOptions {
    return this.optionsSubject.value;
  }

  setOptions(options: NextGameFilterOptions): void {
    const normalized = this.normalize(options);
    this.optionsSubject.next(normalized);
    this.saveToStorage(normalized);
  }

  matchesFilter(
    difficultyDetails: DifficultyDisplayDetails | undefined,
    options: NextGameFilterOptions = this.getOptions(),
  ): boolean {
    if (!options.enabled)
      return true;

    const normalized = this.normalize(options);
    const details = difficultyDetails;
    if (!details)
      return false;

    const isFpPlus = (details.firstPrincipalUnResoledCellCount ?? 0) > 0;
    if (normalized.excludeFpPlus && isFpPlus)
      return false;

    const difficultyPercent = Number.isFinite(details.percentile) ? details.percentile * 100 : undefined;
    const timeSeconds = Number.isFinite(details.estimatedSolveTime)
      ? Math.round(details.estimatedSolveTime / 1000)
      : undefined;

    if (normalized.mode === 'difficulty') {
      if (!Number.isFinite(difficultyPercent))
        return false;
      if (normalized.minDifficulty != null && difficultyPercent < normalized.minDifficulty)
        return false;
      if (normalized.maxDifficulty != null && difficultyPercent > normalized.maxDifficulty)
        return false;
    } else if (normalized.mode === 'time') {
      if (!Number.isFinite(timeSeconds))
        return false;
      if (normalized.minTimeSeconds != null && timeSeconds < normalized.minTimeSeconds)
        return false;
      if (normalized.maxTimeSeconds != null && timeSeconds > normalized.maxTimeSeconds)
        return false;
    } else {
      if (!Number.isFinite(details.boardSize))
        return false;
      if (normalized.minBoardSize != null && details.boardSize < normalized.minBoardSize)
        return false;
      if (normalized.maxBoardSize != null && details.boardSize > normalized.maxBoardSize)
        return false;
    }

    return true;
  }

  private normalize(options: NextGameFilterOptions): NextGameFilterOptions {
    const mode: NextGameFilterMode = options?.mode === 'time'
      ? 'time'
      : options?.mode === 'boardSize'
        ? 'boardSize'
        : 'difficulty';
    let minDifficulty = this.toDecimalInRange(options?.minDifficulty, 0, 100);
    let maxDifficulty = this.toDecimalInRange(options?.maxDifficulty, 0, 100);
    let minTimeSeconds = this.toIntInRange(options?.minTimeSeconds, 0, undefined);
    let maxTimeSeconds = this.toIntInRange(options?.maxTimeSeconds, 0, undefined);
    let minBoardSize = this.toIntInRange(options?.minBoardSize, 5, 9);
    let maxBoardSize = this.toIntInRange(options?.maxBoardSize, 5, 9);

    if (minDifficulty != null && maxDifficulty != null && minDifficulty > maxDifficulty)
      [minDifficulty, maxDifficulty] = [maxDifficulty, minDifficulty];

    if (minTimeSeconds != null && maxTimeSeconds != null && minTimeSeconds > maxTimeSeconds)
      [minTimeSeconds, maxTimeSeconds] = [maxTimeSeconds, minTimeSeconds];

    if (minBoardSize != null && maxBoardSize != null && minBoardSize > maxBoardSize)
      [minBoardSize, maxBoardSize] = [maxBoardSize, minBoardSize];

    return {
      enabled: options?.enabled === true,
      excludeFpPlus: options?.excludeFpPlus === true,
      skipCompleted: options?.skipCompleted !== false,
      mode,
      minDifficulty,
      maxDifficulty,
      minTimeSeconds,
      maxTimeSeconds,
      minBoardSize,
      maxBoardSize,
    };
  }

  private toDecimalInRange(value: number | undefined, min: number, max: number | undefined): number | undefined {
    if (!Number.isFinite(value))
      return undefined;

    const constrainedMax = max ?? Number.POSITIVE_INFINITY;
    const clamped = Math.min(Math.max(value, min), constrainedMax);
    return Math.round(clamped * 10) / 10;
  }

  private toIntInRange(value: number | undefined, min: number, max: number | undefined): number | undefined {
    if (!Number.isFinite(value))
      return undefined;

    const parsed = Math.round(value);
    if (max != null && parsed > max)
      return max;
    if (parsed < min)
      return min;

    return parsed;
  }

  private loadFromStorage(): NextGameFilterOptions {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw)
        return this.defaultOptions();

      const parsed = JSON.parse(raw) as NextGameFilterOptions;
      return this.normalize(parsed);
    } catch (error) {
      console.error('nextGameFilter: failed to load options', error);
      return this.defaultOptions();
    }
  }

  private saveToStorage(options: NextGameFilterOptions): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(options));
    } catch (error) {
      console.error('nextGameFilter: failed to persist options', error);
    }
  }

  private defaultOptions(): NextGameFilterOptions {
    return {
      enabled: false,
      excludeFpPlus: false,
      skipCompleted: true,
      mode: 'difficulty',
      minDifficulty: undefined,
      maxDifficulty: undefined,
      minTimeSeconds: undefined,
      maxTimeSeconds: undefined,
      minBoardSize: undefined,
      maxBoardSize: undefined,
    };
  }
}
