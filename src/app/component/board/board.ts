import { CommonModule } from '@angular/common';
import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { filter, first, interval, pairwise, Subject, takeUntil } from 'rxjs';
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
import { GameStats, StatCalculator } from '../../service/stat-calculator';
import { TimeTracker } from '../../service/time-tracker';
import { UndoManager } from '../../service/undo-manager';
import { WakeLock } from '../../service/wake-lock';
import { AFFIRMATIONS } from '../celebration/affirmations';
import { CellComponent } from '../cell/cell.component';
import { StatsComponent } from '../stats/stats';
import { Title } from "../title/title";

@Component({
  selector: 'app-board',
  imports: [...MATERIAL_IMPORTS, CommonModule, CellComponent, StatsComponent, Title],
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
  solvable = true;
  gamePreviouslyCompleted = false;
  devMode = false;
  shapesMode: boolean = false;
  showNextGameButton = false;
  disableAnimations = false;
  stats: GameStats;


  private previousGames = new Map<number, GameInProgressDtoV3>();
  private moveHistory: MoveHistoryDtoV1[] = [];
  private undoManager: UndoManager;
  private destroy = new Subject<void>();
  private statCalculator: StatCalculator;
  private timeTracker = new TimeTracker();

  constructor(
    private celebrationService: CelebrationService,
    private saveDataService: SaveDataService,
    private boardUiService: BoardUiService,
    private wakeLock: WakeLock,
  ) {
    this.devMode = AppVersion.VERSION as string === "000000-0000000000";

    this.configureTimeTracking();
    this.statCalculator = new StatCalculator(this.previousGames);
    this.configureUndo();

    const savedShapesMode = localStorage.getItem('shapesModeEnabled');
    if (savedShapesMode !== null)
      this.shapesMode = JSON.parse(savedShapesMode);
  }


  async ngOnInit(): Promise<void> {
    this.boardUiService.boardVisible$.next(true);
    this.wakeLock.enable();
    this.destroy.pipe(first()).subscribe(() => this.wakeLock.disable());
    this.boardUiService.undoRequested$
      .pipe(takeUntil(this.destroy))
      .subscribe(() => this.undoManager.undoLast())
    this.boardUiService.setCanUndo(this.undoManager.hasUndo());
    if (!(await this.tryLoadGameFromStorage()))
      this.updateGameNumber(this.gameNumber || 1);
  }


  ngOnDestroy(): void {
    this.destroy.next()
    this.boardUiService.boardVisible$.next(false);
    this.timeTracker.destroy();
    this.saveGameState();
  }


  private configureUndo(): void {
    this.undoManager = new UndoManager({
      getGameBoard: () => this.gameBoard,
      getMoveHistory: () => this.moveHistory,
      moveUndone: () => {
        this.gameBoard.recalculateSelectedHeaders();
        this.saveGameState();
      },
      undoEnabledStateChange: (canUndo: boolean) => this.boardUiService.setCanUndo(canUndo),
    });
  }


  private configureTimeTracking(): void {
    interval(1000).pipe(
      takeUntil(this.destroy)
    ).subscribe(() => {
      if (this.stats) {
        let previous = this.previousGames.get(this.gameNumber);
        if (previous && previous.completed)
          return

        this.stats.timeSpent = this.timeTracker.getTotalTime()
      }
    })

    this.timeTracker.browserState$
      .pipe(
        takeUntil(this.destroy),
        filter(state => !state.active && state.reason !== 'manualPause'
        ),
      ).subscribe(() => {
        this.saveGameState()
      })
  }


  changeGameNumberFromUi(gameNumber: number): void {
    this.saveGameState()

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
    this.gamePreviouslyCompleted = false;
    this.moveHistory = [];
    this.showNextGameButton = false;
    this.undoManager.clear();
    this.timeTracker.reset(0)
    this.timeTracker.manualStart();
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

    if (cell.required) {
      cell.status = SelectionStatus.SELECTED;
      this.updateMoveHistory(true)
      this.undoManager.pushCell('select', cell, SelectionStatus.SELECTED);
      this.gameBoard.recalculateSelectedHeaders();
    } else {
      this.updateMoveHistory(false)
      this.undoManager.pushMistake();
      this.handleIncorrectMove(cell);
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
      this.updateMoveHistory(true)
      this.undoManager.pushCell('clear', cell, SelectionStatus.CLEARED);
    } else {
      this.updateMoveHistory(false)
      this.undoManager.pushMistake();
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


  autoCompleteGame(): void {
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


  private async tryLoadGameFromStorage(): Promise<boolean> {
    let savedData = await this.saveDataService.service.load();
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
    this.gamePreviouslyCompleted = previous.completed ?? false;
    this.moveHistory = previous.moveHistory ?? [];
    this.showNextGameButton = false;
    this.undoManager.clear();
    this.timeTracker.reset(previous.timeSpent ?? 0)
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
        this.timeTracker.manualStart();
      } else {
        this.updateGameNumber(this.gameNumber);
      }
    }

    this.calculateStats();
  }


  private async handleIncorrectMove(cell: Cell): Promise<void> {
    this.vibrate();
    cell.invalidMove = true;
    await new Promise(resolve => setTimeout(resolve, 1000));
    cell.invalidMove = false;
  }


  private saveGameState(): void {
    let state = this.saveDataService.service.generateSaverDto();

    let isInProgress = this.gameBoard.inProgress()
      || this.previousGames.get(this.gameNumber)?.moveHistory.length > 0
      || this.moveHistory?.length > 0;
    let isComplete = this.gameBoard.isComplete()
    let wasComplete = this.previousGames.get(this.gameNumber)?.completed ?? false;
    let someLevelOfComplete = isComplete || wasComplete

    if (someLevelOfComplete)
      this.timeTracker.manualPause()

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
        grid: !someLevelOfComplete ? grid : undefined,
        moveHistory: this.moveHistory,
        timeSpent: this.timeTracker.getTotalTime(),
      }
      this.previousGames.set(this.gameNumber, progress)
    } else {
      this.previousGames.delete(this.gameNumber);
    }

    state.currentGameNumber = this.gameNumber
    state.inProgressGames = Array.from(this.previousGames.values())

    this.saveDataService.service.saveNoWait(state);

    this.calculateStats();
  }


  private calculateStats(): void {
    this.stats = this.statCalculator.calculateStats(this.gameNumber);
  }


  private checkComplete(): void {
    if (this.gameBoard.isComplete()) {
      this.undoManager.clear();
      const boardSize = this.gameBoard.playArea.length;
      const mistakes = this.stats.mistakesCurrentBoard;
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
