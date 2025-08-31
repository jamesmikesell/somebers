import { SelectionStatus } from "../game-board";


export interface CellDtoV1 {
  status: SelectionStatus;
  required: boolean;
  value: number;
  groupNumber: number;
}
