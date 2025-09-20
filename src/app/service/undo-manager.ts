import { DisplayCell, GameBoard, SelectionStatus } from '../model/game-board';
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


  pushCells(actions: UndoCellActionPayload[], options?: UndoPushOptions): void {
    const resolved = actions
      .map(action => this.buildUndoCellAction(action))
      .filter((action): action is UndoCellAction => action != null);

    if (!resolved.length)
      return;

    if (options?.appendToPrevious) {
      const last = this.peekLast();
      if (last?.kind === 'cells') {
        last.actions.push(...resolved);
        this.deps.undoEnabledStateChange(true);
        return;
      }
    }

    this.stack.push({ kind: 'cells', actions: resolved });
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
      case 'cells': {
        const gb = this.deps.getGameBoard();
        last.actions.forEach(action => {
          const cell = gb.playArea[action.row]?.[action.col];
          if (cell) {
            cell.status = SelectionStatus.NONE;
            cell.invalidMove = false;
          }
        });
        break;
      }
      case 'mistake': {
        //no-op
        break;
      }
    }

    this.deps.getMoveHistory().pop();
    this.deps.moveUndone();
    this.deps.undoEnabledStateChange(this.stack.length > 0);
  }


  private peekLast(): UndoEntry | undefined {
    return this.stack[this.stack.length - 1];
  }


  private buildUndoCellAction(action: UndoCellActionPayload): UndoCellAction | null {
    const coords = this.findCellCoordinates(action.cell);
    if (!coords)
      return null;

    return {
      kind: action.kind,
      row: coords.row,
      col: coords.col,
    };
  }


  private findCellCoordinates(target: DisplayCell): { row: number; col: number } | null {
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


type UndoEntry = UndoCellsEntry | UndoMistakeEntry;


interface UndoCellsEntry {
  kind: 'cells';
  actions: UndoCellAction[];
}


interface UndoMistakeEntry {
  kind: 'mistake';
}


interface UndoCellAction {
  kind: 'select' | 'clear';
  row: number;
  col: number;
}


export interface UndoCellActionPayload {
  kind: 'select' | 'clear';
  cell: DisplayCell;
}


export interface UndoPushOptions {
  appendToPrevious?: boolean;
}


export interface UndoManagerDeps {
  getGameBoard: () => GameBoard;
  getMoveHistory: () => MoveHistoryDtoV1[];
  moveUndone: () => void;
  undoEnabledStateChange: (value: boolean) => void; // for UI state
}
