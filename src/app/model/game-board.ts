import { Random } from "./random";


export class GameBoard {

  get fullBoard(): Cell[][] { return this._fullBoard; }
  playArea: Cell[][] = [];
  solvable: boolean;

  private _fullBoard: Cell[][] = [];
  private goalRows: Cell[] = [];
  private goalColumns: Cell[] = [];


  constructBoard(gameNumber: number): void {
    this.ensureMinimumsAndCalculateHeaders(gameNumber);
    this.solvable = this.checkIfSolvableAfterAttemptingFix();
    this.ensureMinimumsAndCalculateHeaders(gameNumber);

    this._fullBoard = [];

    // First row: first cell is blank, then all goalColumns
    this._fullBoard.push([undefined, ...this.goalColumns]);

    // Remaining rows: goalRows cell at start, then corresponding playArea row
    for (let i = 0; i < this.playArea.length; i++) {
      const row: Cell[] = [this.goalRows[i], ...this.playArea[i]];
      this._fullBoard.push(row);
    }

    this.computeCellBorders();

    this.isComplete();
  }


  private ensureMinimumsAndCalculateHeaders(gameNumber: number) {
    let gameSeed = Random.generateFromSeed(gameNumber) * Number.MAX_SAFE_INTEGER;
    let random = new Random(gameSeed);

    do {

      this.goalRows = [];
      this.goalColumns = [];
      let goalColorGroups = new Map<number, Cell>();
      let cellsByGroup = new Map<number, Cell[]>();

      this.playArea.forEach((row, rowIndex) => row.forEach((cell, colIndex) => {
        let cells = cellsByGroup.get(cell.groupNumber) ?? [];
        cells.push(cell)
        cellsByGroup.set(cell.groupNumber, cells);

        if (!goalColorGroups.get(cell.groupNumber)) {
          cell.colorGroupGoalDisplayValue = 0
          goalColorGroups.set(cell.groupNumber, cell);
        }

        if (!this.goalRows[rowIndex]) {
          let header = new Cell();
          header.value = 0
          this.goalRows[rowIndex] = header;
        }
        if (!this.goalColumns[colIndex]) {
          let header = new Cell();
          header.value = 0
          this.goalColumns[colIndex] = header;
        }

        if (cell.required) {
          this.goalRows[rowIndex].value += cell.value;
          this.goalColumns[colIndex].value += cell.value;

          goalColorGroups.get(cell.groupNumber).colorGroupGoalDisplayValue += cell.value;
        }
      }));


      {
        let rowIndex = this.goalRows.findIndex(cell => !cell.value)
        if (rowIndex >= 0) {
          let col = Math.floor(random.next() * (this.playArea[0].length - 1));

          this.playArea[rowIndex][col].required = true;
          continue;
        }
      }

      {
        let colIndex = this.goalColumns.findIndex(cell => !cell.value)
        if (colIndex >= 0) {
          let row = Math.floor(random.next() * (this.playArea.length - 1));

          this.playArea[row][colIndex].required = true;
          continue;
        }
      }

      {
        let headerCellFromEmptyGroup = Array.from(goalColorGroups.values()).find(cell => !cell.colorGroupGoalDisplayValue);
        if (headerCellFromEmptyGroup) {
          let groupCells = cellsByGroup.get(headerCellFromEmptyGroup.groupNumber);
          let cellIndex = Math.floor(random.next() * (groupCells.length - 1));
          groupCells[cellIndex].required = true
          continue;
        }
      }

      break;
    } while (true);
  }


  recalculateSelectedHeaders(): void {
    this.goalColumns.forEach(single => single.groupNumber = 0)
    this.goalRows.forEach(single => single.groupNumber = 0)

    this.playArea.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell.status === SelectionStatus.SELECTED) {
          this.goalColumns[colIndex].groupNumber += cell.value;
          this.goalRows[rowIndex].groupNumber += cell.value;
        }
      })
    })

    this.goalColumns.forEach(single => single.groupNumber = single.groupNumber || undefined)
    this.goalRows.forEach(single => single.groupNumber = single.groupNumber || undefined)
  }


  private fixUnsolvableRectangle(rect: UnsolvableRect): void {
    const rectCells = [
      this.playArea[rect.r1][rect.c1],
      this.playArea[rect.r1][rect.c2],
      this.playArea[rect.r2][rect.c1],
      this.playArea[rect.r2][rect.c2]
    ];

    rectCells.find(c => !c.required).required = true;
  }


  private checkIfSolvableAfterAttemptingFix(): boolean {
    const rows = this.playArea.length;
    if (rows === 0) return true;
    const cols = this.playArea[0].length;
    if (cols === 0) return true;

    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      const unsolvableRect = this.findUnsolvableRectangle(this.playArea);
      if (!unsolvableRect)
        return true;

      this.fixUnsolvableRectangle(unsolvableRect);

      attempts++;
    }

    return false;
  }

  private findUnsolvableRectangle(cell: Cell[][]): UnsolvableRect | null {
    const rows = cell.length;
    const cols = cell[0].length;

    for (let r1 = 0; r1 < rows; r1++) {
      for (let c1 = 0; c1 < cols; c1++) {
        // For each starting position, check all possible bottom-right corners
        for (let r2 = r1 + 1; r2 < rows; r2++) {
          for (let c2 = c1 + 1; c2 < cols; c2++) {
            if (this.isRectangleUnsolvable(cell, r1, c1, r2, c2)) {
              return { r1, c1, r2, c2 };
            }
          }
        }
      }
    }

    return null;
  }


  private isRectangleUnsolvable(cell: Cell[][], r1: number, c1: number, r2: number, c2: number): boolean {
    const cellTl = cell[r1][c1];
    const cellTr = cell[r1][c2];
    const cellBl = cell[r2][c1];
    const cellBr = cell[r2][c2];

    const allCornersSameValue = cellTl.value === cellTr.value &&
      cellTl.value === cellBl.value &&
      cellTl.value === cellBr.value;

    const adjacentCornersHaveSameRequiredState = (cellTl.required === cellBr.required) &&
      (cellBl.required === cellTr.required);
    const exactlyOneSetOfAdjacentCornersRequired = adjacentCornersHaveSameRequiredState &&
      cellTl.required !== cellTr.required;

    const groupNumbers = [cellTl.groupNumber, cellTr.groupNumber, cellBl.groupNumber, cellBr.groupNumber];
    const groupCounts = new Map<number, number>();
    for (const groupNum of groupNumbers)
      groupCounts.set(groupNum, (groupCounts.get(groupNum) || 0) + 1);

    // If the cells all exist in the same color group, or are evenly split with 2 cells in one color group, and two cells in another color group
    // the board isn't solvable
    const eachGroupHasExactlyTwoCells = groupCounts.values().next().value === 2;
    const cellsEvenlySplitIntoOneOrTwoGroups = (groupCounts.size === 2 && eachGroupHasExactlyTwoCells) || groupCounts.size === 1;

    let unSolvable = allCornersSameValue && cellsEvenlySplitIntoOneOrTwoGroups && exactlyOneSetOfAdjacentCornersRequired;
    if (unSolvable)
      console.log(`Unsolvable: [${c1}, ${r1}] x  [${c2}, ${r2}]`)

    return unSolvable;
  }


  inProgress(): boolean {
    return this.playArea.some(row => row.some(cell => cell.status !== SelectionStatus.NONE))
  }


  isComplete(): boolean {
    this.clearCompleted();

    for (const row of this.playArea) {
      for (const cell of row) {
        if ((cell.required && cell.status !== SelectionStatus.SELECTED) || (!cell.required && cell.status !== SelectionStatus.CLEARED))
          return false;
      }
    }

    return true;
  }


  private clearCompleted(): void {
    let completedRows = new Set<number>();
    let completedColumns = new Set<number>();
    let completedGroups = new Set<number>();
    for (let i = 0; i < this.playArea.length; i++) {
      if (this.isRowComplete(i))
        completedRows.add(i);
      if (this.isColumnComplete(i))
        completedColumns.add(i);
      if (this.isColorGroupComplete(i + 1))
        completedGroups.add(i + 1);
    }

    this.playArea.forEach((row) => {
      row.forEach((cell) => {
        if (completedGroups.has(cell.groupNumber))
          cell.hideBackground = true;
      })
    })

    this.goalColumns.forEach((header, index) => {
      if (completedColumns.has(index))
        header.hideBackground = true;
    })

    this.goalRows.forEach((header, index) => {
      if (completedRows.has(index))
        header.hideBackground = true;
    })
  }


  private computeCellBorders(): void {
    const rows = this.playArea.length;
    const cols = this.playArea[0].length;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = this.playArea[r][c];

        cell.borderTop = r === 0 || this.playArea[r - 1][c].groupNumber !== cell.groupNumber;
        cell.borderLeft = c === 0 || this.playArea[r][c - 1].groupNumber !== cell.groupNumber;
        cell.borderRight = c === cols - 1 || this.playArea[r][c + 1].groupNumber !== cell.groupNumber;
        cell.borderBottom = r === rows - 1 || this.playArea[r + 1][c].groupNumber !== cell.groupNumber;
      }
    }
  }


  private isRowComplete(rowIndex: number): boolean {
    return this.playArea[rowIndex].every(cell =>
      (cell.required && cell.status === SelectionStatus.SELECTED) ||
      (!cell.required && cell.status === SelectionStatus.CLEARED)
    );
  }


  private isColumnComplete(colIndex: number): boolean {
    for (let i = 0; i < this.playArea.length; i++) {
      const cell = this.playArea[i][colIndex];
      if (!((cell.required && cell.status === SelectionStatus.SELECTED) ||
        (!cell.required && cell.status === SelectionStatus.CLEARED))) {
        return false;
      }
    }
    return true;
  }


  private isColorGroupComplete(groupNumber: number): boolean {
    return this.playArea
      .flat()
      .filter(cell => cell.groupNumber === groupNumber)
      .every(cell =>
        (cell.required && cell.status === SelectionStatus.SELECTED) ||
        (!cell.required && cell.status === SelectionStatus.CLEARED)
      );
  }

}




export class Cell {
  status = SelectionStatus.NONE;
  required: boolean = false;
  value: number;
  groupNumber: number;

  colorGroupGoalDisplayValue: number;
  invalidMove: boolean = false;
  hideBackground = false;
  highlighted = false
  processing = false;
  borderTop = false;
  borderLeft = false;
  borderRight = false;
  borderBottom = false;
  colorDark: string;
  colorLight: string;

  constructor(
  ) { }
}



export enum SelectionStatus {
  NONE,
  SELECTED,
  CLEARED,
}


interface UnsolvableRect {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}
