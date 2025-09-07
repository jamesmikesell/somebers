import { DataSaveVersion } from "./saved-game-data";
import { SavedGameStateV2 } from "./saved-game-data.v2";
import { GameInProgressDtoV3 } from "./game-in-progress.v3";
import { MoveHistoryDtoV1 } from "./move-history-dto.v1";


/**
 *
 * DO NOT MODIFY!!!
 *
 * Create new version
 *
 */
export class SavedGameStateV3 implements DataSaveVersion {

  readonly version = 3;

  currentGameNumber: number;
  inProgressGames: GameInProgressDtoV3[] = [];

  constructor(previous?: SavedGameStateV2) {
    if (previous) {
      this.currentGameNumber = previous.currentGameNumber;
      if (previous.inProgressGames) {
        this.inProgressGames = previous.inProgressGames.map(prevProgress => {
          let moveHistory: MoveHistoryDtoV1[] = [];
          if (prevProgress.correctMoveHistory && prevProgress.lastMoveTime) {
            // Migrate old boolean[] to new MoveHistoryEntry[] using lastMoveTime for all entries
            moveHistory = prevProgress.correctMoveHistory.map(correct => ({
              timestamp: prevProgress.lastMoveTime,
              correct: correct
            }));
          }

          let newProgress: GameInProgressDtoV3 = {
            gameNumber: prevProgress.gameNumber,
            grid: prevProgress.grid,
            completed: prevProgress.completed,
            moveHistory: moveHistory,
            timeSpent: undefined,
          }

          return newProgress;
        })
      }
    }
  }
}