import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HammerSwipeDirective } from '../../directive/hammer/hammer-swipe.directive';
import { MATERIAL_IMPORTS } from '../../material-imports';
import { CelebrationService } from '../../service/celebration';
import { BoardGroupGenerator } from '../../service/grouping';
import { Random } from '../../service/random';
import { AFFIRMATIONS } from '../celebration/afirmations';

@Component({
  selector: 'app-board',
  imports: [...MATERIAL_IMPORTS, CommonModule, HammerSwipeDirective],
  templateUrl: './board.html',
  styleUrl: './board.scss'
})
export class Board {

  gameNumber: number = 1;
  SelectionStatus = SelectionStatus;
  grid: Cell[][] = [];
  goalRows: Cell[] = [];
  goalColumns: Cell[] = [];
  fails = 0;
  solvable = false;

  private readonly GAME_NUMBER = "gameNumberV1";
  private readonly SAVED_STATE = "gameStateV3";


  constructor(
    private celebrationService: CelebrationService,
  ) {
    let savedGameString = localStorage.getItem(this.SAVED_STATE)
    if (savedGameString) {
      let savedState: SavedGameState = JSON.parse(savedGameString);
      this.fails = savedState.fails;
      this.grid = savedState.grid;
      this.gameNumber = savedState.gameNumber;
      this.ensureMinimumsAndCalculateHeaders();
      this.solvable = this.isSolvable(this.grid);
      this.ensureMinimumsAndCalculateHeaders();
      this.recalculateSelectedHeaders();
    } else {
      this.gameNumber = +(localStorage.getItem(this.GAME_NUMBER) ?? 1);
      this.updateGameNumber(this.gameNumber);
    }
  }


  updateGameNumber(game: number) {
    localStorage.setItem(this.GAME_NUMBER, game.toString());
    localStorage.removeItem(this.SAVED_STATE);

    this.gameNumber = game;
    this.fails = 0;
    let gameSeed = Random.generateFromSeed(game) * Number.MAX_SAFE_INTEGER;

    let gridMin = 5;
    let gridMax = 9;
    const gridSize = Math.floor(Random.generateFromSeed(game) * (gridMax - gridMin + 1) + gridMin);
    const grid = new BoardGroupGenerator(game).generateRandomContiguousGroups(gridSize);

    let random = new Random(gameSeed);
    this.grid = grid.map((row, rowIndex) => row.map((cellGroupNumber, colIndex) => {
      let cell = new Cell();
      cell.value = Math.floor(random.next() * 9) + 1;
      cell.groupNumber = cellGroupNumber;
      cell.required = random.next() < 0.4;

      return cell
    }));


    this.ensureMinimumsAndCalculateHeaders();
    this.solvable = this.isSolvable(this.grid);
    this.ensureMinimumsAndCalculateHeaders();
  }


  use(cell: Cell) {
    if (cell.status !== SelectionStatus.NONE)
      return;

    if (cell.required) {
      cell.status = SelectionStatus.SELECTED;
      this.recalculateSelectedHeaders();
    } else {
      this.fails++;
      this.vibrate();
    }

    this.saveGameState();
    this.checkComplete();
  }


  clear(cell: Cell) {
    if (cell.status !== SelectionStatus.NONE)
      return;

    if (!cell.required) {
      cell.status = SelectionStatus.CLEARED;
    } else {
      this.fails++;
      this.vibrate();
    }

    this.saveGameState();
    this.checkComplete();
  }


  private saveGameState(): void {
    let state: SavedGameState = {
      fails: this.fails,
      grid: this.grid,
      gameNumber: this.gameNumber,
    }
    localStorage.setItem(this.SAVED_STATE, JSON.stringify(state));
  }


  private ensureMinimumsAndCalculateHeaders() {
    let gameSeed = Random.generateFromSeed(this.gameNumber) * Number.MAX_SAFE_INTEGER;
    let random = new Random(gameSeed);

    do {
      this.goalRows = [];
      this.goalColumns = [];
      let goalColorGroups = new Map<number, Cell>();
      let cellsByGroup = new Map<number, Cell[]>();

      this.grid.forEach((row, rowIndex) => row.forEach((cell, colIndex) => {
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
          let col = Math.floor(random.next() * (this.grid[0].length - 1));

          this.grid[rowIndex][col].required = true;
          continue;
        }
      }

      {
        let colIndex = this.goalColumns.findIndex(cell => !cell.value)
        if (colIndex >= 0) {
          let row = Math.floor(random.next() * (this.grid.length - 1));

          this.grid[row][colIndex].required = true;
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


  private recalculateSelectedHeaders(): void {
    this.goalColumns.forEach(single => single.groupNumber = 0)
    this.goalRows.forEach(single => single.groupNumber = 0)

    this.grid.forEach((row, rowIndex) => {
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


  private checkComplete(): void {
    if (this.isComplete()) {
      const randomIndex = Math.floor(Math.random() * AFFIRMATIONS.length);
      let affirmation = AFFIRMATIONS[randomIndex];

      this.celebrationService.show({
        title: affirmation.title,
        subtitle: affirmation.subTitle,
      });
    }
  }


  private isComplete(): boolean {
    for (const row of this.grid) {
      for (const cell of row) {
        if ((cell.required && cell.status !== SelectionStatus.SELECTED) || (!cell.required && cell.status !== SelectionStatus.CLEARED))
          return false;
      }
    }

    return true;
  }


  private vibrate(): void {
    if ("vibrate" in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  }


  private isSolvable(cell: Cell[][]): boolean {
    const rows = cell.length;
    if (rows === 0) return true;
    const cols = cell[0].length;
    if (cols === 0) return true;

    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      const unsolvableRect = this.findUnsolvableRectangle(cell);
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


  private fixUnsolvableRectangle(rect: UnsolvableRect): void {
    const rectCells = [
      this.grid[rect.r1][rect.c1],
      this.grid[rect.r1][rect.c2],
      this.grid[rect.r2][rect.c1],
      this.grid[rect.r2][rect.c2]
    ];

    rectCells.find(c => !c.required).required = true;
  }

}



class Cell {
  status = SelectionStatus.NONE;
  required: boolean = false;
  colorGroupGoalDisplayValue: number;
  value: number;
  groupNumber: number;

  constructor(
  ) { }
}



enum SelectionStatus {
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


interface SavedGameState {
  fails: number;
  gameNumber: number;
  grid: Cell[][];
}