import { SelectionStatus } from "../game-board";
import { GameInProgressDtoV1 } from "./game-in-progress.v1";
import { DataSaveVersion } from "./saved-game-data";
import { SavedGameStateV0 } from "./saved-game-data.v0";


/**
 *
 * DO NOT MODIFY!!!
 *
 * Create new version
 *
 */
export class SavedGameStateV1 implements DataSaveVersion {

  readonly version = 1;

  currentGameNumber: number;
  inProgressGames: GameInProgressDtoV1[] = [];

  constructor(previous?: SavedGameStateV0) {
    if (previous) {
      this.currentGameNumber = previous.gameNumber;
      if (previous.grid) {
        this.inProgressGames.push({
          gameNumber: previous.gameNumber,
          mistakes: previous.fails,
          grid: previous.grid,
          completed: false
        });
      }
    }
  }
}
