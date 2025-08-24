import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HammerSwipeDirective } from '../../directive/hammer/hammer-swipe.directive';
import { MATERIAL_IMPORTS } from '../../material-imports';
import { CelebrationService } from '../../service/celebration';
import { BoardGroupGenerator } from '../../service/grouping';
import { Random } from '../../service/random';

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


  constructor(
    private celebrationService: CelebrationService,
  ) {
    this.updateGameNumber(this.gameNumber);
  }


  updateGameNumber(game: number) {
    this.gameNumber = game;
    this.fails = 0;
    let gameSeed = Random.generateFromSeed(game) * Number.MAX_SAFE_INTEGER;

    let gridMin = 5;
    let gridMax = 9;
    const gridSize = Math.floor(Random.generateFromSeed(game) * (gridMax - gridMin + 1) + gridMin);
    const grid = new BoardGroupGenerator(game).generateRandomContiguousGroups(gridSize);

    let random = new Random(gameSeed);
    this.goalRows = [];
    this.goalColumns = [];
    let goalColorGroups: Cell[] = [];
    this.grid = grid.map((row, rowIndex) => row.map((cellGroupNumber, colIndex) => {
      let cell = new Cell();
      cell.value = Math.floor(random.next() * 9) + 1;
      cell.groupNumber = cellGroupNumber;
      cell.required = random.next() < 0.4;

      if (!goalColorGroups[cell.groupNumber]) {
        cell.colorGroupGoalDisplay = 0
        goalColorGroups[cell.groupNumber] = cell;
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

        goalColorGroups[cell.groupNumber].colorGroupGoalDisplay += cell.value;
      }

      return cell
    }));


    this.solvable = this.isSolvable(this.grid);

  }


  use(cell: Cell) {
    if (cell.status !== SelectionStatus.NONE)
      return;

    if (cell.required) {
      cell.status = SelectionStatus.SELECTED;
      this.recalculateHeaders();
    } else {
      this.fails++;
      this.vibrate();
    }

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

    this.checkComplete();
  }


  private recalculateHeaders(): void {
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
      this.celebrationService.show();
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

    let countsOfColorGroups = new Map<number, number>();

    // Check all possible rectangles
    for (let r1 = 0; r1 < rows; r1++) {
      for (let c1 = 0; c1 < cols; c1++) {
        // For each starting position, check all possible bottom-right corners
        for (let r2 = r1 + 1; r2 < rows; r2++) {
          for (let c2 = c1 + 1; c2 < cols; c2++) {
            // Check if all four corners have the same value
            let cellTl = cell[r1][c1];
            let cellTr = cell[r1][c2];
            let cellBl = cell[r2][c1];
            let cellBr = cell[r2][c2];

            let allCornersSameValue = cellTl.value === cellTr.value &&
              cellTl.value === cellBl.value &&
              cellTl.value === cellBr.value;

            let adjacentCornersHaveSameRequiredState = (cellTl.required === cellBr.required) && (cellBl.required === cellTr.required);
            let exactlyOneSetOfAdjacentCornersRequired = adjacentCornersHaveSameRequiredState && cellTl.required !== cellTr.required;

            const groupNumbers = [cellTl.groupNumber, cellTr.groupNumber, cellBl.groupNumber, cellBr.groupNumber];
            const groupCounts = new Map<number, number>();
            for (const groupNum of groupNumbers)
              groupCounts.set(groupNum, (groupCounts.get(groupNum) || 0) + 1);

            // Check if there are exactly 2 different group numbers, and each appearing exactly 2 times
            let onlyTwoDistinctGroups = groupCounts.size === 2;
            // Only need to check that one of the groups has a count of two, as that will ensure the other group has a count of two
            let eachGroupHasExactlyTwoCells = groupCounts.values().next().value === 2;

            if (allCornersSameValue && onlyTwoDistinctGroups && eachGroupHasExactlyTwoCells && exactlyOneSetOfAdjacentCornersRequired) {
              // console.log(`Unsolvable: [${c1}, ${r1}] x  [${c2}, ${r2}]`)
              return false;
            }
          }
        }
      }
    }

    // No rectangles found with same corner values
    return true;
  }

}



class Cell {
  status = SelectionStatus.NONE;
  required: boolean = false;
  colorGroupGoalDisplay: number;
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