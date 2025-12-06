import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SaveDataService } from './save-data.service';
import { DifficultyPredictorService } from './difficulty-predictor.service';
import { GameInProgressDtoV3 } from '../model/saved-game-data/game-in-progress.v3';
import { MoveHistoryDtoV1 } from '../model/saved-game-data/move-history-dto.v1';


@Injectable({ providedIn: 'root' })
export class SessionService implements OnDestroy {
  private readonly storageKeys = {
    start: 'sessionStartTs',
    end: 'sessionEndTs',
    difficulty: 'sessionBoardDifficulties',
  } as const;

  private stateSubject = new BehaviorSubject<SessionState>({
    startTime: null,
    endTime: null,
    active: false,
    difficulties: [],
  });

  private storageListener = (event: StorageEvent) => {
    const key = event.key;
    if (!key)
      return;

    const observedKeys = Object.values(this.storageKeys) as string[];
    if (!observedKeys.includes(key))
      return;

    this.refreshFromStorage();
  };


  
  constructor(
    private saveDataService: SaveDataService,
    private difficultyPredictor: DifficultyPredictorService,
  ) {
    this.refreshFromStorage();
    if (typeof window !== 'undefined')
      window.addEventListener('storage', this.storageListener);
  }


  ngOnDestroy(): void {
    if (typeof window !== 'undefined')
      window.removeEventListener('storage', this.storageListener);
  }


  get state$(): Observable<SessionState> {
    return this.stateSubject.asObservable();
  }

  get currentState(): SessionState {
    return this.stateSubject.value;
  }


  startSession(): void {
    const now = Date.now();
    this.persistState({
      startTime: now,
      endTime: null,
      active: true,
      difficulties: [],
    });
  }


  endSession(): void {
    const current = this.stateSubject.value;
    if (!current.startTime)
      return;

    const end = Date.now();
    this.persistState({
      ...current,
      endTime: end,
      active: false,
    });
  }


  refreshFromStorage(): void {
    const start = this.safeGetNumber(this.storageKeys.start);
    const end = this.safeGetNumber(this.storageKeys.end);
    const difficulties = this.loadDifficulties();
    this.stateSubject.next({
      startTime: start,
      endTime: end,
      active: !!start && !end,
      difficulties,
    });
  }


  addDifficultyEntry(entry: SessionDifficultyEntry): void {
    const state = this.stateSubject.value;
    if (!state.startTime || state.endTime)
      return;

    const filtered = state.difficulties.filter(d => d.boardNumber !== entry.boardNumber);
    const updated = [...filtered, entry];
    this.persistState({
      ...state,
      active: true,
      difficulties: updated,
    });
  }


  removeDifficultyEntry(boardNumber: number): void {
    const state = this.stateSubject.value;
    const updated = state.difficulties.filter(d => d.boardNumber !== boardNumber);
    if (updated.length === state.difficulties.length)
      return;

    this.persistState({
      ...state,
      active: !!state.startTime && !state.endTime,
      difficulties: updated,
    });
  }


  isGameWithinSession(game: GameInProgressDtoV3): boolean {
    const { startTime, endTime } = this.stateSubject.value;
    if (!startTime)
      return false;

    const moves = game.moveHistory ?? [];
    if (!moves.length)
      return false;

    const { earliest, latest } = this.findBounds(moves);
    const endBoundary = endTime ?? Date.now();
    return earliest >= startTime && latest <= endBoundary && game.completed === true;
  }


  isMoveHistoryWithinSession(moveHistory: MoveHistoryDtoV1[]): boolean {
    const { startTime, endTime } = this.stateSubject.value;
    if (!startTime)
      return false;

    if (!moveHistory?.length)
      return false;

    const { earliest, latest } = this.findBounds(moveHistory);
    const endBoundary = endTime ?? Date.now();
    return earliest >= startTime && latest <= endBoundary;
  }


  async computeSessionStats(): Promise<SessionStats> {
    const state = this.stateSubject.value;
    const savedData = await this.saveDataService.service.load();
    const games = savedData?.inProgressGames ?? [];

    const qualifyingGames = games.filter(game => this.isGameWithinSession(game));
    const boardCount = qualifyingGames.length;

    let maxMistakes: number | null = null;
    let totalMistakes = 0;
    let totalPlayTimeMs = 0;
    let totalMoves = 0;

    for (const game of qualifyingGames) {
      const moves = game.moveHistory ?? [];
      const mistakes = moves.filter(m => !m.correct).length;
      maxMistakes = maxMistakes == null ? mistakes : Math.max(maxMistakes, mistakes);
      totalMistakes += mistakes;
      totalPlayTimeMs += game.timeSpent ?? 0;
      totalMoves += moves.length;
    }

    const difficultyMap = new Map(
      state.difficulties.map(entry => [entry.boardNumber, entry]),
    );
    const gamesWithDifficulty = qualifyingGames
      .map(game => ({ game, difficulty: difficultyMap.get(game.gameNumber) }))
      .filter(({ difficulty }) => !!difficulty);

    const difficultyCount = gamesWithDifficulty.length;
    const cumulativeDifficulty = difficultyCount
      ? gamesWithDifficulty.reduce((sum, { difficulty }) => sum + (difficulty?.difficulty ?? 0), 0)
      : null;

    const averageDifficulty = difficultyCount && cumulativeDifficulty != null
      ? cumulativeDifficulty / difficultyCount
      : null;

    const maxDifficulty = difficultyCount
      ? Math.max(...gamesWithDifficulty.map(({ difficulty }) => difficulty!.difficulty))
      : null;

    const totalParMs = gamesWithDifficulty.reduce((sum, { difficulty }) => sum + (difficulty?.parTimeMs ?? 0), 0);
    const averageTimeAgainstParMs = boardCount
      ? (totalPlayTimeMs - totalParMs) / boardCount
      : null;

    const accuracyPercent = totalMoves
      ? Math.max(0, Math.min(100, ((totalMoves - totalMistakes) / totalMoves) * 100))
      : null;

    return {
      startTime: state.startTime,
      endTime: state.endTime,
      ongoing: !!state.startTime && !state.endTime,
      boardCount,
      maxMistakes,
      totalPlayTimeMs,
      averageMistakes: boardCount ? totalMistakes / boardCount : null,
      cumulativeDifficulty,
      averageDifficulty,
      maxDifficulty,
      averageTimeAgainstParMs,
      accuracyPercent,
    };
  }


  async recordCompletion(gameNumber: number, moveHistory: MoveHistoryDtoV1[]): Promise<void> {
    if (!this.currentState.active)
      return;

    if (!this.isMoveHistoryWithinSession(moveHistory))
      return;

    try {
      const difficultyDetails = await this.difficultyPredictor.getDifficultyEstimates(gameNumber);
      if (!difficultyDetails)
        return;

      this.addDifficultyEntry({
        boardNumber: gameNumber,
        difficulty: difficultyDetails.percentile * 100,
        parTimeMs: difficultyDetails.estimatedSolveTime,
      });
    } catch (error) {
      console.warn('session: failed to record completion', error);
    }
  }


  private loadDifficulties(): SessionDifficultyEntry[] {
    try {
      const raw = localStorage.getItem(this.storageKeys.difficulty);
      if (!raw)
        return [];

      const parsed = JSON.parse(raw) as SessionDifficultyEntry[];
      if (!Array.isArray(parsed))
        return [];

      return parsed
        .map(entry => ({
          boardNumber: Number(entry.boardNumber),
          difficulty: Number(entry.difficulty),
          parTimeMs: Number(entry.parTimeMs),
        }))
        .filter(entry =>
          Number.isFinite(entry.boardNumber) &&
          Number.isFinite(entry.difficulty) &&
          Number.isFinite(entry.parTimeMs),
        );
    } catch (error) {
      console.error('session: failed to load difficulty store', error);
      return [];
    }
  }


  private persistState(state: SessionState): void {
    this.safeSetItem(this.storageKeys.start, state.startTime);
    this.safeSetItem(this.storageKeys.end, state.endTime);
    this.safeSetItem(this.storageKeys.difficulty, state.difficulties);
    this.stateSubject.next({
      ...state,
      active: !!state.startTime && !state.endTime,
    });
  }


  private safeGetNumber(key: string): number | null {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null)
        return null;

      const num = Number(raw);
      return Number.isFinite(num) ? num : null;
    } catch (error) {
      console.error(`session: failed to read key ${key}`, error);
      return null;
    }
  }


  private safeSetItem(key: string, value: unknown): void {
    try {
      if (value === null || value === undefined) {
        localStorage.removeItem(key);
      } else {
        const toStore = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, toStore);
      }
    } catch (error) {
      console.error(`session: failed to write key ${key}`, error);
    }
  }


  private findBounds(moveHistory: MoveHistoryDtoV1[]): { earliest: number; latest: number } {
    let earliest = Number.POSITIVE_INFINITY;
    let latest = Number.NEGATIVE_INFINITY;
    for (const move of moveHistory) {
      if (Number.isFinite(move.timestamp)) {
        earliest = Math.min(earliest, move.timestamp);
        latest = Math.max(latest, move.timestamp);
      }
    }
    if (!Number.isFinite(earliest) || !Number.isFinite(latest))
      return { earliest: Number.NaN, latest: Number.NaN };

    return { earliest, latest };
  }
}



export interface SessionState {
  startTime: number | null;
  endTime: number | null;
  active: boolean;
  difficulties: SessionDifficultyEntry[];
}


export interface SessionDifficultyEntry {
  boardNumber: number;
  difficulty: number; // percentile 0-100
  parTimeMs: number;
}


export interface SessionStats {
  startTime: number | null;
  endTime: number | null;
  ongoing: boolean;
  boardCount: number;
  maxMistakes: number | null;
  totalPlayTimeMs: number;
  averageMistakes: number | null;
  cumulativeDifficulty: number | null;
  averageDifficulty: number | null;
  maxDifficulty: number | null;
  averageTimeAgainstParMs: number | null;
  accuracyPercent: number | null;
}
