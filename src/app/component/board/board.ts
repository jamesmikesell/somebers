import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { BoardGroupGenerator } from '../../grouping';
import { MATERIAL_IMPORTS } from '../../material-imports';
import { Random } from '../../random';

@Component({
  selector: 'app-board',
  imports: [...MATERIAL_IMPORTS, CommonModule],
  templateUrl: './board.html',
  styleUrl: './board.scss'
})
export class Board {

  gameNumber: number = 1;
  grid: number[][] = [];


  constructor() {
    this.updateGameNumber(this.gameNumber);
  }

  updateGameNumber(game: number) {
    this.gameNumber = game;

    let gridMin = 5;
    let gridMax = 9;
    const gridSize = Math.floor(Random.generateFromSeed(this.gameNumber) * (gridMax - gridMin + 1) + gridMin);
    const grid = new BoardGroupGenerator(this.gameNumber).generateRandomContiguousGroups(gridSize);
    this.grid = grid.map(r => r.slice());
  }

}
