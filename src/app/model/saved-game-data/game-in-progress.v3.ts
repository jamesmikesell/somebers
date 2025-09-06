import { CellDtoV1 } from "./cell-dto-v1";
import { MoveHistoryDtoV1 } from "./move-history-dto.v1";

/**
 *
 * DO NOT MODIFY!!!
 *
 * Create new version
 *
 */
export interface GameInProgressDtoV3 {
  gameNumber: number;
  grid?: CellDtoV1[][];
  completed: boolean;
  moveHistory: MoveHistoryDtoV1[];
}