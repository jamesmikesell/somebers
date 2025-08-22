import { Component } from '@angular/core';
import { MATERIAL_IMPORTS } from '../../material-imports';
import { Random } from '../../random';
import { BoardGroupGenerator } from '../../grouping';

@Component({
  selector: 'app-board',
  imports: [...MATERIAL_IMPORTS],
  templateUrl: './board.html',
  styleUrl: './board.scss'
})
export class Board {

  gameNumber: number = 1;
  board: string;


  constructor() {
    this.updateGameNumber(this.gameNumber);
  }

  updateGameNumber(game: number) {
    this.gameNumber = game;

    let gridMin = 5;
    let gridMax = 9;
    const gridSize = Math.floor(Random.generateFromSeed(this.gameNumber) * (gridMax - gridMin + 1) + gridMin);
    const grid = new BoardGroupGenerator(this.gameNumber).generateRandomContiguousGroups(gridSize);

    const emojis: string[] = ["🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "🟤", "⚫", "⚪"];
    let gridString = grid.map(r => r.map(num => emojis[num - 1] ?? "?").join(" ")).join("\n");
    this.board = gridString;
  }

}
