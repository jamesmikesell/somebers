import { Injectable } from '@angular/core';
import { generateGameBoard } from './gameboard-generator';
import { DisplayCell, GameBoard, SimpleCell } from '../model/game-board';

export type ColorModeSetting = 'auto' | 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class CachingBoardGeneratorService {
  private cache = new Map<number, SimpleCell[][]>();

  async generateOrGetGameBoard(game: number): Promise<GameBoard> {
    let grid = this.cache.get(game);
    if (!grid) {
      grid = (await generateGameBoard(game)).playArea.map(r => r.map<SimpleCell>(c => (
        {
          groupNumber: c.groupNumber,
          required: c.required,
          value: c.value,
        }
      )))
      this.cache.set(game, grid);
    }

    let gameBoard = new GameBoard();
    gameBoard.playArea = grid.map((r) => r.map((c) => {
      let cell = new DisplayCell();
      cell.groupNumber = c.groupNumber;
      cell.required = c.required;
      cell.value = c.value;
      return cell;
    }));

    gameBoard.constructBoard(game);

    return gameBoard;
  }

}
