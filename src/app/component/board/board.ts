import { CommonModule } from '@angular/common';
import { Component, HostBinding } from '@angular/core';
import { HammerDirective } from '../../directive/hammer/hammer.directive';
import { MATERIAL_IMPORTS } from '../../material-imports';
import { CelebrationService } from '../../service/celebration';
import { BoardGroupGenerator } from '../../service/grouping';
import { Random } from '../../service/random';
import { AFFIRMATIONS } from '../celebration/affirmations';
import { Cell, GameBoard, SelectionStatus } from './game-board';

@Component({
  selector: 'app-board',
  imports: [...MATERIAL_IMPORTS, CommonModule, HammerDirective],
  templateUrl: './board.html',
  styleUrl: './board.scss'
})
export class Board {

  @HostBinding('style.--columnCount')
  get columnCount() {
    return this.gameBoard?.fullBoard.length;
  }

  gameNumber: number = 1;
  SelectionStatus = SelectionStatus;
  gameBoard = new GameBoard();
  mistakes = 0;
  solvable = false;


  private readonly GAME_NUMBER = "gameNumberV2";
  private readonly SAVED_STATE = "gameStateV4";


  constructor(
    private celebrationService: CelebrationService,
  ) {
    let savedGameString = localStorage.getItem(this.SAVED_STATE)
    if (savedGameString) {
      let savedState: SavedGameState = JSON.parse(savedGameString);
      this.mistakes = savedState.fails;
      this.gameBoard = new GameBoard();
      this.gameBoard.playArea = savedState.grid;
      this.gameNumber = savedState.gameNumber;
      this.gameBoard.constructBoard(this.gameNumber);
      this.solvable = this.gameBoard.solvable;
      this.gameBoard.recalculateSelectedHeaders();
    } else {
      this.gameNumber = +(localStorage.getItem(this.GAME_NUMBER) ?? 1);
      this.updateGameNumber(this.gameNumber);
    }
  }


  updateGameNumber(game: number) {
    localStorage.setItem(this.GAME_NUMBER, game.toString());
    localStorage.removeItem(this.SAVED_STATE);

    this.gameNumber = game;
    this.mistakes = 0;
    let gameSeed = Random.generateFromSeed(game) * Number.MAX_SAFE_INTEGER;

    // This grid offset is to ensure the first few games a player completes start off with small and easy grid sizes [5, 5, 5, 6, 6, 6, 7, 7, 8]
    const gridStartOffset = game + 87228;
    let gridMin = 5;
    let gridMax = 9;
    const gridSize = Math.floor(Random.generateFromSeed(gridStartOffset) * (gridMax - gridMin + 1) + gridMin);
    const grid = new BoardGroupGenerator(game).generateRandomContiguousGroups(gridSize);

    let random = new Random(gameSeed);
    this.gameBoard = new GameBoard();
    this.gameBoard.playArea = grid.map((row, rowIndex) => row.map((cellGroupNumber, colIndex) => {
      let cell = new Cell();
      cell.value = Math.floor(random.next() * 9) + 1;
      cell.groupNumber = cellGroupNumber;
      cell.required = random.next() < 0.4;

      return cell
    }));

    this.gameBoard.constructBoard(this.gameNumber);
    this.solvable = this.gameBoard.solvable;
  }


  touchStart(cell: Cell): void {
    if (cell.status === SelectionStatus.NONE && !cell.processing)
      cell.processing = true;
  }


  async use(cell: Cell): Promise<void> {
    cell.processing = false;

    if (cell.status !== SelectionStatus.NONE)
      return;

    if (cell.required) {
      cell.status = SelectionStatus.SELECTED;
      this.gameBoard.recalculateSelectedHeaders();
    } else {
      await this.handleIncorrectMove(cell);
    }

    this.saveGameState();
    this.checkComplete();
  }


  async clear(cell: Cell): Promise<void> {
    cell.processing = false;

    if (cell.status !== SelectionStatus.NONE)
      return;

    if (!cell.required) {
      cell.status = SelectionStatus.CLEARED;
    } else {
      await this.handleIncorrectMove(cell);
    }

    this.saveGameState();
    this.checkComplete();
  }


  private async handleIncorrectMove(cell: Cell): Promise<void> {
    this.mistakes++;
    this.vibrate();
    cell.invalidMove = true;
    await new Promise(resolve => setTimeout(resolve, 1000));
    cell.invalidMove = false;
  }


  private saveGameState(): void {
    let state: SavedGameState = {
      fails: this.mistakes,
      grid: this.gameBoard.playArea,
      gameNumber: this.gameNumber,
    }
    localStorage.setItem(this.SAVED_STATE, JSON.stringify(state));
  }



  private checkComplete(): void {
    if (this.gameBoard.isComplete()) {
      const boardSize = this.gameBoard.playArea.length;
      const mistakes = this.mistakes;
      const affirmationsCount = AFFIRMATIONS.length;

      // Normalize board size (5-9) to a 0-1 range
      const normalizedBoardSize = Math.max(0, Math.min(1, (boardSize - 5) / 4));

      // Normalize mistakes. More mistakes on a larger board is less of a factor.
      // Making mistakes on more than 5% of cells is considered max penalty.
      const mistakeFactor = Math.min(1, mistakes / (boardSize * boardSize * 0.05));

      // Bias: 0 for "bad" performance (high mistakes, small board), 1 for "good" performance (low mistakes, large board)
      const bias = (normalizedBoardSize * 0.2) + ((1 - mistakeFactor) * 0.8);

      // Convert bias to a power for Math.pow.
      // A power > 1 biases random numbers towards 0 (start of the list).
      // A power < 1 biases random numbers towards 1 (end of the list).
      const power = Math.pow(4, 1 - 2 * bias);

      const randomValue = Math.pow(Math.random(), power);
      const randomIndex = Math.max(0, Math.min(affirmationsCount - 1, Math.floor(randomValue * affirmationsCount)));

      let affirmation = AFFIRMATIONS[randomIndex];

      this.celebrationService.show({
        title: affirmation.title,
        subtitle: affirmation.subTitle,
      });
    }
  }


  private vibrate(): void {
    if ("vibrate" in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  }

}



interface SavedGameState {
  fails: number;
  gameNumber: number;
  grid: Cell[][];
}
