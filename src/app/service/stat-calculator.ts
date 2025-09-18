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

    let previousGame = this.gameHistories.get(currentGameNumber);
    const mistakesCurrentBoard = previousGame?.moveHistory.filter(hist => !hist.correct).length ?? 0;
    const timeSpent = previousGame?.timeSpent

    return {
      streaks: [
        {
          displayTimelineFull: "Past 24 hours",
          displayTimelineAbbreviated: "24h",
          streak: this.getMaxStreakSinceDays(1),
        },
        {
          displayTimelineFull: "Past 3 days",
          displayTimelineAbbreviated: "3d",
          streak: this.getMaxStreakSinceDays(3),
        },
        {
          displayTimelineFull: "Past 5 days",
          displayTimelineAbbreviated: "5d",
          streak: this.getMaxStreakSinceDays(5),
        },
        {
          displayTimelineFull: "Past 7 days",
          displayTimelineAbbreviated: "7d",
          streak: this.getMaxStreakSinceDays(7),
        },
        {
          displayTimelineFull: "Past 14 days",
          displayTimelineAbbreviated: "14d",
          streak: this.getMaxStreakSinceDays(14),
        },
        {
          displayTimelineFull: "Past 30 days",
          displayTimelineAbbreviated: "30d",
          streak: this.getMaxStreakSinceDays(30),
        },
        {
          displayTimelineFull: "Past year",
          displayTimelineAbbreviated: "1y",
          streak: this.getMaxStreakSinceDays(365.25),
        },
        {
          displayTimelineFull: "Forever",
          displayTimelineAbbreviated: "Forever",
          streak: this.getMaxStreakSinceDays(undefined),
        },
      ],
      accuracyHistoryMoveCount: accuracyHistory,
      accuracyPercent: accuracy,
      previousStreak: previousStreak,
      currentStreak: this.currentStreak,
      mistakesCurrentBoard: mistakesCurrentBoard,
      timeSpent: timeSpent,
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
  streaks: StreakPeriod[],
  accuracyHistoryMoveCount: number;
  accuracyPercent: number;
  previousStreak: number;
  currentStreak: number;
  mistakesCurrentBoard: number;
  timeSpent: number;
}


export interface StreakPeriod {
  displayTimelineFull: string;
  displayTimelineAbbreviated: string;
  streak: number;
}
