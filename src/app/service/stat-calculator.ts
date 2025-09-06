import { GameInProgressDtoV3 } from "../model/saved-game-data/game-in-progress.v3";

export class StatCalculator {

  private streak: number;

  constructor(
    private gameHistories: Map<number, GameInProgressDtoV3>,
  ) { }


  calculateStats(currentGameNumber: number): GameStats {
    let previousStreak = this.streak ?? 0;
    const allGameData = Array.from(this.gameHistories.values());

    const allMoves = allGameData
      .sort((a, b) => (a.moveHistory[0]?.timestamp || 0) - (b.moveHistory[0]?.timestamp || 0))
      .flatMap(game => game.moveHistory ?? []);

    this.streak = 0;
    for (let i = allMoves.length - 1; i >= 0; i--) {
      if (allMoves[i].correct) {
        this.streak++;
      } else {
        break;
      }
    }

    let currentStreak = 0;
    let longestStreak = 0;
    for (const move of allMoves) {
      if (move.correct) {
        currentStreak++;
      } else {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 0;
      }
    }
    longestStreak = Math.max(longestStreak, currentStreak);

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
      currentStreak: this.streak,
      mistakesCurrentBoard: mistakesCurrentBoard,
    }
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