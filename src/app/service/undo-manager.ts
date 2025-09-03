import { GameBoard, SelectionStatus } from '../model/game-board';
import { MoveHistoryDtoV1 } from '../model/saved-game-data/move-history-dto.v1';


export class UndoManager {
  private stack: UndoEntry[] = [];

  constructor(private deps: UndoManagerDeps) { }

  clear(): void {
    this.stack = [];
    this.deps.undoEnabledStateChange(false);
  }


  hasUndo(): boolean {
    return this.stack.length > 0;
  }


  pushCell(kind: "select" | "clear", cell: any, next: SelectionStatus,): void {
    const coords = this.findCellCoordinates(cell);
    const entry: UndoEntry = {
      kind,
      row: coords?.row,
      col: coords?.col,
      newStatus: next,
    };
    this.stack.push(entry);
    this.deps.undoEnabledStateChange(true);
  }


  pushMistake(): void {
    const entry: UndoEntry = { kind: 'mistake' };
    this.stack.push(entry);
    this.deps.undoEnabledStateChange(true);
  }


  undoLast(): void {
    const last = this.stack.pop();
    if (!last)
      return;

    switch (last.kind) {
      case 'select':
      case 'clear': {
        if (last.row == null || last.col == null)
          break;

        const gb = this.deps.getGameBoard();
        const cell = gb.playArea[last.row]?.[last.col];
        if (cell) {
          cell.status = SelectionStatus.NONE;
          cell.invalidMove = false;
        }
        break;
      }
      case 'mistake': {
        this.deps.decrementMistakes();
        break;
      }
    }

    this.deps.getMoveHistory().pop();
    this.deps.moveUndone();
    this.deps.undoEnabledStateChange(this.stack.length > 0);
  }


  private findCellCoordinates(target: any): { row: number; col: number } | null {
    const cells = this.deps.getGameBoard().playArea;
    for (let r = 0; r < cells.length; r++) {
      const row = cells[r];
      for (let c = 0; c < row.length; c++) {
        if (row[c] === target)
          return { row: r, col: c };
      }
    }

    return null;
  }
}


type UndoKind = 'select' | 'clear' | 'mistake';


interface UndoEntry {
  kind: UndoKind;
  row?: number;
  col?: number;
  newStatus?: SelectionStatus;
}


export interface UndoManagerDeps {
  getGameBoard: () => GameBoard;
  getMoveHistory: () => MoveHistoryDtoV1[];
  decrementMistakes: () => void;
  moveUndone: () => void;
  undoEnabledStateChange: (value: boolean) => void; // for UI state
}
