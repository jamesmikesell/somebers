import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HammerSwipeDirective } from '../../directive/hammer/hammer-swipe.directive';
import { MATERIAL_IMPORTS } from '../../material-imports';
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
  goalRows: number[] = [];
  goalColumns: number[] = [];
  fails = 0;


  constructor() {
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
      cell.required = random.next() < 0.5;

      if (!goalColorGroups[cell.groupNumber]) {
        cell.colorGroupGoalDisplay = 0
        goalColorGroups[cell.groupNumber] = cell;
      }

      if (!this.goalRows[rowIndex])
        this.goalRows[rowIndex] = 0
      if (!this.goalColumns[colIndex])
        this.goalColumns[colIndex] = 0

      if (cell.required) {
        this.goalRows[rowIndex] += cell.value;
        this.goalColumns[colIndex] += cell.value;

        goalColorGroups[cell.groupNumber].colorGroupGoalDisplay += cell.value;
      }

      return cell
    }));

  }


  use(cell: Cell) {
    if (cell.status !== SelectionStatus.NONE)
      return;

    if (cell.required) {
      cell.status = SelectionStatus.SELECTED;
    } else {
      this.fails++;
      this.vibrate();
    }
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
  }


  private vibrate(): void {
    if ("vibrate" in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
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