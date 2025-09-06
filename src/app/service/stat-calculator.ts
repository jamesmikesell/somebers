import { GameInProgressDtoV3 } from "../model/saved-game-data/game-in-progress.v3";

export class StatCalculator {

  private currentStreak: number;

  constructor(
    private gameHistories: Map<number, GameInProgressDtoV3>,
  ) { }


  calculateStats(currentGameNumber: number): GameStats {
    let previousStreak = this.currentStreak ?? 0;
    const allGameData = Array.from(this.gameHistories.values());

    const allMoves = allGameData
      .flatMap(game => game.moveHistory ?? [])
      .sort((a, b) => a.timestamp - b.timestamp);

    this.currentStreak = this.getMaxStreakSinceDays(0);
    let longestStreak = this.getMaxStreakSinceDays(undefined);

    const mostRecentMoves = allMoves.slice(-1000);
    let accuracyHistory: number;
    let accuracy: number;
    if (mostRecentMoves.length > 0) {
      accuracyHistory = mostRecentMoves.length;
      const correctMoves = mostRecentMoves.filter(move => move.correct).length;
      accuracy = (correctMoves / mostRecentMoves.length) * 100;
    } else {
      accuracyHistory = 0
      accuracy = null;
    }

    const mistakesCurrentBoard = this.gameHistories.get(currentGameNumber)?.moveHistory.filter(hist => !hist.correct).length ?? 0;

    return {
      longestStreak: longestStreak,
      accuracyHistoryMoveCount: accuracyHistory,
      accuracyPercent: accuracy,
      previousStreak: previousStreak,
      currentStreak: this.currentStreak,
      mistakesCurrentBoard: mistakesCurrentBoard,
    }
  }


  /**
   * Returns the maximum streak whose end is within the last `daysAgo` days,
   * or any ongoing streak regardless of when its last move occurred.
   *
   * A streak is a run of consecutive correct moves; it ends at the last
   * correct move before an incorrect move (or is ongoing if there has been
   * no incorrect move since). If a streak started before the window but ended
   * within the window, the entire streak length is considered.
   * 
   * 0 days == current streak
   * 
   * undefined days = max streak forever
   */
  getMaxStreakSinceDays(daysAgo: number): number {
    const allMovesReverseHistory = Array.from(this.gameHistories.values())
      .flatMap(game => game.moveHistory ?? [])
      .sort((a, b) => b.timestamp - a.timestamp);

    if (allMovesReverseHistory.length === 0) return 0;

    const includeAll = daysAgo == null || !isFinite(daysAgo);
    const windowStart = includeAll ? Number.NEGATIVE_INFINITY : Date.now() - daysAgo * 24 * 60 * 60 * 1000;

    let currentStreak = 0;
    let maxStreak = 0;
    for (const move of allMovesReverseHistory) {
      if (move.correct) {
        currentStreak++;
      } else {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 0
        if (move.timestamp < windowStart)
          break
      }
    }
    maxStreak = Math.max(maxStreak, currentStreak);

    return maxStreak;
  }

}


export interface GameStats {
  longestStreak: number;
  accuracyHistoryMoveCount: number;
  accuracyPercent: number;
  previousStreak: number;
  currentStreak: number;
  mistakesCurrentBoard: number;
}
