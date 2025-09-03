import { CommonModule } from '@angular/common';
import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { first, pairwise, Subject, takeUntil } from 'rxjs';
import { AppVersion } from '../../app-version';
import { MATERIAL_IMPORTS } from '../../material-imports';
import { Cell, GameBoard, SelectionStatus } from '../../model/game-board';
import { BoardGroupGenerator } from '../../model/grouping';
import { Random } from '../../model/random';
import { CellDtoV1 } from '../../model/saved-game-data/cell-dto-v1';
import { GameInProgressDtoV3 } from '../../model/saved-game-data/game-in-progress.v3';
import { MoveHistoryDtoV1 } from '../../model/saved-game-data/move-history-dto.v1';
import { BoardUiService } from '../../service/board-ui.service';
import { CelebrationService } from '../../service/celebration';
import { SaveDataService } from '../../service/save-data.service';
import { UndoManager } from '../../service/undo-manager';
import { AFFIRMATIONS } from '../celebration/affirmations';
import { CellComponent } from '../cell/cell.component';
import { StatsComponent } from '../stats/stats';

@Component({
  selector: 'app-board',
  imports: [...MATERIAL_IMPORTS, CommonModule, CellComponent, StatsComponent],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board implements OnInit, OnDestroy {

  @HostBinding('style.--columnCount')
  get columnCount() {
    return this.gameBoard?.fullBoard.length;
  }

  gameNumber: number = 1;
  SelectionStatus = SelectionStatus;
  gameBoard = new GameBoard();
  mistakes = 0;
  streak = 0;
  previousStreak = 0;
  longestStreak = 0;
  accuracy: number | null = null;
  solvable = true;
  gamePreviouslyCompleted = false;
  devMode = false;
  shapesMode: boolean = false;
  accuracyHistory = 0;
  showNextGameButton = false;
  disableAnimations = false;

  private previousGames = new Map<number, GameInProgressDtoV3>();
  private moveHistory: MoveHistoryDtoV1[] = [];
  private undo: UndoManager;
  private destroy = new Subject<void>();


  constructor(
    private celebrationService: CelebrationService,
    private saveDataService: SaveDataService,
    private boardUiService: BoardUiService,
  ) {
    this.devMode = AppVersion.VERSION as string === "000000-0000000000";

    this.configureUndo();

    if (!this.tryLoadGameFromStorage())
      this.updateGameNumber(this.gameNumber || 1);

    const savedShapesMode = localStorage.getItem('shapesModeEnabled');
    if (savedShapesMode !== null)
      this.shapesMode = JSON.parse(savedShapesMode);
  }


  ngOnInit(): void {
    this.boardUiService.boardVisible$.next(true);
    this.boardUiService.undoRequested$
      .pipe(takeUntil(this.destroy))
      .subscribe(() => this.undo.undoLast())
    this.boardUiService.setCanUndo(this.undo.hasUndo());
  }


  ngOnDestroy(): void {
    this.destroy.next()
    this.boardUiService.boardVisible$.next(false);
  }


  private configureUndo(): void {
    this.undo = new UndoManager({
      getGameBoard: () => this.gameBoard,
      getMoveHistory: () => this.moveHistory,
      decrementMistakes: () => { this.mistakes-- },
      moveUndone: () => { this.saveGameState() },
      undoEnabledStateChange: (canUndo: boolean) => this.boardUiService.setCanUndo(canUndo),
    });
  }


  changeGameNumberFromUi(gameNumber: number): void {
    let previous = this.previousGames.get(gameNumber);
    if (previous) {
      this.constructBoardFromPreviousState(previous);
    } else {
      this.updateGameNumber(gameNumber);
    }

    this.saveGameState()
  }


  private updateGameNumber(game: number) {
    this.gameNumber = game;
    this.mistakes = 0;
    this.gamePreviouslyCompleted = false;
    this.moveHistory = [];
    this.showNextGameButton = false;
    this.undo.clear();
    let gameSeed = Random.generateFromSeed(game) * Number.MAX_SAFE_INTEGER;

    // This grid offset is to ensure the first few games a player completes start off with small and easy grid sizes [5, 5, 5, 6, 6, 6, 7, 7, 8]
    const gridStartOffset = game + 87228;
    let gridMin = 5;
    let gridMax = 9;
    const gridSize = Math.floor(Random.generateFromSeed(gridStartOffset) * (gridMax - gridMin + 1) + gridMin);
    const grid = new BoardGroupGenerator(game).generateRandomContiguousGroups(gridSize);

    let random = new Random(gameSeed);
    this.gameBoard = new GameBoard();
    this.gameBoard.playArea = grid.map((row) => row.map((cellGroupNumber) => {
      let cell = new Cell();
      cell.value = Math.floor(random.next() * 9) + 1;
      cell.groupNumber = cellGroupNumber;
      cell.required = random.next() < 0.4;

      return cell
    }));

    this.gameBoard.constructBoard(this.gameNumber);
    this.solvable = this.gameBoard.solvable;

    this.disableAnimationsTemporarily();

    this.saveGameState();
  }


  async use(cell: Cell): Promise<void> {
    cell.processing = false;

    if (cell.status !== SelectionStatus.NONE)
      return;

    this.previousStreak = this.streak;

    if (cell.required) {
      cell.status = SelectionStatus.SELECTED;
      this.updateMoveHistory(true)
      this.undo.pushCell('select', cell, SelectionStatus.SELECTED);
      this.gameBoard.recalculateSelectedHeaders();
    } else {
      this.updateMoveHistory(false)
      this.undo.pushMistake();
      this.handleIncorrectMove(cell);
    }

    this.saveGameState();
    this.checkComplete();
  }


  async clear(cell: Cell): Promise<void> {
    cell.processing = false;

    if (cell.status !== SelectionStatus.NONE)
      return;

    this.previousStreak = this.streak;

    if (!cell.required) {
      cell.status = SelectionStatus.CLEARED;
      this.updateMoveHistory(true)
      this.undo.pushCell('clear', cell, SelectionStatus.CLEARED);
    } else {
      this.updateMoveHistory(false)
      this.undo.pushMistake();
      this.handleIncorrectMove(cell);
    }

    this.saveGameState();
    this.checkComplete();
  }


  playGameAgain(): void {
    this.previousGames.delete(this.gameNumber);
    this.updateGameNumber(this.gameNumber);
    this.saveGameState()
  }


  autoCompleteGame(mistakes: number): void {
    this.mistakes = mistakes;
    this.gameBoard.playArea.forEach(row => row.forEach(cell => cell.status = cell.required ? SelectionStatus.SELECTED : SelectionStatus.CLEARED))
    let cell = this.gameBoard.playArea[0][0];
    cell.status = SelectionStatus.NONE;
    if (cell.required)
      this.use(cell)
    else
      this.clear(cell)
  }


  platNextUnfinishedGame(): void {
    this.gamePreviouslyCompleted = false;
    const allGameNumbers = Array.from(this.previousGames.keys()).sort((a, b) => a - b);

    // Find the next game number after current
    for (let i = this.gameNumber + 1; i <= Math.max(...allGameNumbers) + 1; i++) {
      const previousGame = this.previousGames.get(i);
      if (previousGame && !previousGame.completed) {
        // Found a partially completed game
        this.constructBoardFromPreviousState(previousGame);
        return;
      } else if (!previousGame) {
        // Found an unstarted game number
        this.changeGameNumberFromUi(i);
        return;
      }
    }

    // Fallback: create next sequential game
    const maxGameNumber = Math.max(...allGameNumbers);
    this.changeGameNumberFromUi(maxGameNumber + 1);
  }


  private async disableAnimationsTemporarily(): Promise<void> {
    this.disableAnimations = true
    await new Promise(resolve => setTimeout(resolve, 0));
    this.disableAnimations = false
  }


  private updateMoveHistory(correctMove: boolean): void {
    this.moveHistory.push({ timestamp: Date.now(), correct: correctMove });
  }


  private tryLoadGameFromStorage(): boolean {
    let savedData = this.saveDataService.service.load();
    if (savedData) {
      this.gameNumber = savedData.currentGameNumber || 1;

      if (savedData.inProgressGames) {
        savedData.inProgressGames.forEach(prev => this.previousGames.set(prev.gameNumber, prev))

        let previous = this.previousGames.get(this.gameNumber);
        if (previous) {
          this.constructBoardFromPreviousState(previous);
          return true
        }
      }
    }

    return false;
  }


  private constructBoardFromPreviousState(previous: GameInProgressDtoV3): void {
    this.gameNumber = previous.gameNumber || 1;
    this.mistakes = previous.mistakes || 0;
    this.gamePreviouslyCompleted = previous.completed ?? false;
    this.moveHistory = previous.moveHistory ?? [];
    this.showNextGameButton = false;
    this.undo.clear();
    if (!previous.completed) {
      if (previous.grid) {

        let grid = previous.grid
          .map(row => row
            .map(cell => {
              let newCell = new Cell();
              newCell.status = cell.status;
              newCell.required = cell.required;
              newCell.value = cell.value;
              newCell.groupNumber = cell.groupNumber;

              return newCell;
            }));

        this.gameBoard = new GameBoard();
        this.gameBoard.playArea = grid;
        this.gameBoard.constructBoard(this.gameNumber);
        this.solvable = this.gameBoard.solvable;
        this.gameBoard.recalculateSelectedHeaders();
        this.disableAnimationsTemporarily();
      } else {
        this.updateGameNumber(this.gameNumber);
      }
    }

    this.calculateStats();
  }


  private async handleIncorrectMove(cell: Cell): Promise<void> {
    this.mistakes++;
    this.vibrate();
    cell.invalidMove = true;
    await new Promise(resolve => setTimeout(resolve, 1000));
    cell.invalidMove = false;
  }


  private saveGameState(): void {
    let state = this.saveDataService.service.generateSaverDto();

    let isInProgress = this.gameBoard.inProgress() || this.mistakes !== 0;
    let isComplete = this.gameBoard.isComplete()
    let wasComplete = this.previousGames.get(this.gameNumber)?.completed ?? false;
    let someLevelOfComplete = isComplete || wasComplete

    let grid = this.gameBoard.playArea
      .map(row => row
        .map(cell => {
          let cellDto: CellDtoV1 = {
            status: cell.status,
            required: cell.required,
            value: cell.value,
            groupNumber: cell.groupNumber,
          };

          return cellDto;
        }))

    // console.log({ isInProgress, someLevelOfComplete, isComplete, wasComplete, hist: this.moveHistory })

    // we only want a record if they partially or fully played a given game
    if (isInProgress || someLevelOfComplete) {
      let progress: GameInProgressDtoV3 = {
        completed: someLevelOfComplete,
        gameNumber: this.gameNumber,
        mistakes: this.mistakes,
        grid: !someLevelOfComplete ? grid : undefined,
        moveHistory: this.moveHistory,
      }
      this.previousGames.set(this.gameNumber, progress)
    } else {
      this.previousGames.delete(this.gameNumber);
    }

    state.currentGameNumber = this.gameNumber
    state.inProgressGames = Array.from(this.previousGames.values())

    this.saveDataService.service.save(state);

    this.calculateStats();
  }


  private calculateStats(): void {
    const allGameData = Array.from(this.previousGames.values());

    const allMoves = allGameData
      .sort((a, b) => (a.moveHistory[0]?.timestamp || 0) - (b.moveHistory[0]?.timestamp || 0))
      .flatMap(game => game.moveHistory ?? []);

    this.streak = 0;
    for (let i = allMoves.length - 1; i >= 0; i--) {
      if (allMoves[i].correct) {
        this.streak++;
      } else {
        break;
      }
    }

    let currentStreak = 0;
    this.longestStreak = 0;
    for (const move of allMoves) {
      if (move.correct) {
        currentStreak++;
      } else {
        this.longestStreak = Math.max(this.longestStreak, currentStreak);
        currentStreak = 0;
      }
    }
    this.longestStreak = Math.max(this.longestStreak, currentStreak);

    const mostRecentMoves = allMoves.slice(-1000);
    if (mostRecentMoves.length > 0) {
      this.accuracyHistory = mostRecentMoves.length;
      const correctMoves = mostRecentMoves.filter(move => move.correct).length;
      this.accuracy = (correctMoves / mostRecentMoves.length) * 100;
    } else {
      this.accuracyHistory = 0
      this.accuracy = null;
    }
  }


  private checkComplete(): void {
    if (this.gameBoard.isComplete()) {
      this.undo.clear();
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

      this.celebrationService.isActive$.pipe(
        pairwise(),
        first(([wasActive, isActive]) => wasActive && !isActive),
      ).subscribe(() => {
        setTimeout(() => {
          this.showNextGameButton = true;
        }, 250);
      });

    }
  }


  private vibrate(): void {
    if ("vibrate" in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  }

}
