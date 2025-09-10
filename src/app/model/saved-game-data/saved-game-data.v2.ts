import { GameInProgressDtoV2 } from "./game-in-progress.v2";
import { DataSaveVersion } from "./saved-game-data";
import { SavedGameStateV1 } from "./saved-game-data.v1";


/**
 *
 * DO NOT MODIFY!!!
 *
 * Create new version
 *
 */
export class SavedGameStateV2 implements DataSaveVersion {

  readonly version = 2;

  currentGameNumber: number;
  inProgressGames: GameInProgressDtoV2[] = [];

  constructor(previous?: SavedGameStateV1) {
    if (previous) {
      this.currentGameNumber = previous.currentGameNumber;
      if (previous.inProgressGames) {
        this.inProgressGames = previous.inProgressGames.map(prevProgress => {
          let newProgress: GameInProgressDtoV2 = {
            gameNumber: prevProgress.gameNumber,
            mistakes: prevProgress.mistakes,
            grid: prevProgress.grid,
            completed: prevProgress.completed,
            lastMoveTime: undefined,
            correctMoveHistory: [],
          }

          return newProgress;
        })
      }
    }
  }
}
