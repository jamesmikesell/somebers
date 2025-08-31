import { SelectionStatus } from "../game-board";
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
  inProgressGames: GameInProgress[] = [];

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

export interface GameInProgress {
  gameNumber: number;
  mistakes: number;
  grid?: CellDto[][];
  completed: boolean;
}

export interface CellDto {
  status: SelectionStatus;
  required: boolean;
  value: number;
  groupNumber: number;
}