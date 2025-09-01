import { CellDtoV1 } from "./cell-dto-v1";

export interface GameInProgressDtoV2 {
  gameNumber: number;
  mistakes: number;
  grid?: CellDtoV1[][];
  completed: boolean;
  lastMoveTime: number;
  correctMoveHistory: boolean[];
}

