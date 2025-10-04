import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { filter, first, Subject, takeUntil } from 'rxjs';
import { AppVersion } from '../../app-version';
import { CelebrationLauncherService } from '../../dialog/celebration/celebration-launcher.service';
import { ConfirmStartOverDialogLauncher } from '../../dialog/confirm-start-over/confirm-start-over-dialog';
import { MATERIAL_IMPORTS } from '../../material-imports';
import { DisplayCell, GameBoard, SelectionStatus } from '../../model/game-board';
import { CellDtoV1 } from '../../model/saved-game-data/cell-dto-v1';
import { GameInProgressDtoV3 } from '../../model/saved-game-data/game-in-progress.v3';
import { MoveHistoryDtoV1 } from '../../model/saved-game-data/move-history-dto.v1';
import { LockService } from '../../service/app-lock.service';
import { BoardUiService } from '../../service/board-ui.service';
import { CachingBoardGeneratorService } from '../../service/caching-board-generator.service';
import { ColorGridOptimizerService } from '../../service/color-grid-optimizer.service';
import { SaveDataService } from '../../service/save-data.service';
import { SettingsService } from '../../service/settings.service';
import { GameStats, StatCalculator } from '../../service/stat-calculator';
import { TimeTracker } from '../../service/time-tracker';
import { UndoManager } from '../../service/undo-manager';
import { WakeLock } from '../../service/wake-lock';
import { CellComponent } from '../cell/cell.component';
import { EstimatedDifficultyComponent } from '../estimated-difficulty/estimated-difficulty';
import { ScratchPadComponent } from '../scratch-pad/scratch-pad';
import { StatsComponent } from '../stats/stats';
import { Title } from '../title/title';
import { AppColors } from './colors';
import { LayoutMode, ScratchPadLayoutController } from './scratch-pad-layout';
import { SectionCompletionAnimator } from './section-completion-animator';

@Component({
  selector: 'app-board',
  imports: [
    ...MATERIAL_IMPORTS,
    CommonModule,
    CellComponent,
    StatsComponent,
    Title,
    EstimatedDifficultyComponent,
    ScratchPadComponent,
  ],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board implements OnInit, OnDestroy, AfterViewInit {

  @HostBinding('style.--columnCount')
  get columnCount() {
    return this.gameBoard?.fullBoard.length;
  }

  gameNumber: number = 1;
  SelectionStatus = SelectionStatus;
  gameBoard = new GameBoard();
  devMode = false;
  shapesMode: boolean = false;
  scratchPadVisible: boolean = true;
  nextGameButtonState: "hidden" | "show-animated" | "show-instant" = "hidden";
  disableAnimations = false;
  stats: GameStats;
  rowColCurrentSumVisible: boolean = true;
  colorGroupCurrentSumVisible: boolean = false;


  layoutMode: LayoutMode = 'vertical';
  boardHorizontalOffset = 0;
  private previousGames = new Map<number, GameInProgressDtoV3>();
  private moveHistory: MoveHistoryDtoV1[] = [];
  private undoManager: UndoManager;
  private destroy = new Subject<void>();
  private statCalculator: StatCalculator;
  private timeTracker = new TimeTracker();
  private layoutController: ScratchPadLayoutController;
  private sectionAnimator = new SectionCompletionAnimator();
  private lockLostNavigated = false;
  private celebratingGameNumber: number = undefined;

  @ViewChild('boardLayout')
  set boardLayout(ref: ElementRef<HTMLElement> | undefined) {
    this.layoutController.setBoardLayout(ref?.nativeElement);
  }

  @ViewChild('boardContainer')
  set boardContainer(ref: ElementRef<HTMLElement> | undefined) {
    this.layoutController.setBoardContainer(ref?.nativeElement);
  }

  @ViewChild('scratchContainer')
  set scratchContainer(ref: ElementRef<HTMLElement> | undefined) {
    this.layoutController.setScratchContainer(ref?.nativeElement);
  }

  @ViewChild('boardSection', { static: true })
  set boardSection(ref: ElementRef<HTMLElement>) {
    this.layoutController.setBoardSection(ref.nativeElement);
  }

  @ViewChild('scratchMeasureHorizontal')
  set scratchMeasureHorizontal(ref: ElementRef<HTMLElement> | undefined) {
    this.layoutController.setScratchMeasureHorizontal(ref?.nativeElement);
  }

  @ViewChild('scratchMeasureVertical')
  set scratchMeasureVertical(ref: ElementRef<HTMLElement> | undefined) {
    this.layoutController.setScratchMeasureVertical(ref?.nativeElement);
  }

  constructor(
    private celebrationLauncherService: CelebrationLauncherService,
    private saveDataService: SaveDataService,
    private boardUiService: BoardUiService,
    private wakeLock: WakeLock,
    private colorOptimizer: ColorGridOptimizerService,
    private confirmStartOverLauncher: ConfirmStartOverDialogLauncher,
    private ngZone: NgZone,
    private settingsService: SettingsService,
    private lockService: LockService,
    private router: Router,
    private cachingBoardGenerator: CachingBoardGeneratorService,
  ) {
    this.devMode = AppVersion.VERSION as string === "000000-0000000000";

    this.configureTimeTracking();
    this.statCalculator = new StatCalculator(this.previousGames);
    this.configureUndo();

    this.shapesMode = this.settingsService.getShapesModeEnabled();
    this.scratchPadVisible = this.settingsService.getScratchPadVisible();
    let sectionCompletionAnimationEnabled = this.settingsService.getSectionCompletionAnimationEnabled();
    this.sectionAnimator.setEnabled(sectionCompletionAnimationEnabled);
    let autoClearUnneededCells = this.settingsService.getAutoClearUnneededCells();
    this.sectionAnimator.setAutoComplete(autoClearUnneededCells);
    this.rowColCurrentSumVisible = this.settingsService.getRowAndColumnCurrentSelectionSumVisible();
    this.colorGroupCurrentSumVisible = this.settingsService.getColorGroupCurrentSelectionSumVisible();
    this.sectionAnimator.setAutoClearHandler(cells => this.recordAutoClearedCells(cells));
    this.sectionAnimator.animationCompleted$
      .pipe(takeUntil(this.destroy))
      .subscribe(() => {
        this.saveGameState();
        this.checkComplete();
      });

    this.layoutController = new ScratchPadLayoutController(
      this.ngZone,
      state => {
        this.layoutMode = state.layoutMode;
        this.boardHorizontalOffset = state.boardOffset;
      },
    );
  }


  async ngOnInit(): Promise<void> {
    const hasLock = await this.ensureAppLock();
    if (!hasLock)
      return;

    this.monitorLock();

    this.boardUiService.boardVisible$.next(true);
    this.destroy.pipe(first()).subscribe(() => this.wakeLock.disable());

    this.boardUiService.undoRequested$
      .pipe(takeUntil(this.destroy))
      .subscribe(() => this.undoManager.undoLast());
    this.boardUiService.setCanUndo(this.undoManager.hasUndo());

    if (!(await this.tryLoadGameFromStorage()))
      await this.updateGameNumber(this.gameNumber || 1);

    this.setupStartOverMenuHandling();
    this.boardUiService.setShowStartOver(true);
  }


  ngAfterViewInit(): void {
    this.layoutController.scheduleMeasurement();
  }


  ngOnDestroy(): void {
    this.destroy.next()
    this.boardUiService.boardVisible$.next(false);
    this.boardUiService.setShowStartOver(false);
    this.timeTracker.destroy();
    this.saveGameState();
    this.layoutController.destroy();
    this.sectionAnimator.dispose();
    this.lockService.releaseLock().catch(error => {
      if (this.isAbortError(error))
        return;

      console.error('Failed to release app lock', error);
    });
  }


  @HostListener('window:beforeunload')
  handleBeforeUnload() {
    this.saveGameState();
  }


  private monitorLock(): void {
    this.lockService.lockLost$
      .pipe(takeUntil(this.destroy))
      .subscribe(() => this.handleLockLost());
  }


  private async ensureAppLock(): Promise<boolean> {
    if (this.lockService.hasLock)
      return true;

    try {
      await this.lockService.acquireLock();
    } catch (error) {
      console.error('Failed to acquire lock', error);
      await this.router.navigateByUrl('/resume');
      return false;
    }

    if (!this.lockService.hasLock) {
      await this.router.navigateByUrl('/resume');
      return false;
    }

    return true;
  }


  private handleLockLost(): void {
    if (this.lockLostNavigated)
      return;

    this.lockLostNavigated = true;
    this.ngZone.run(() => {
      this.boardUiService.boardVisible$.next(false);
      this.boardUiService.setShowStartOver(false);
      this.router.navigateByUrl('/resume').catch(error => {
        console.error('Failed to navigate after losing app lock', error);
      });
    });
  }


  private isAbortError(error: unknown): error is DOMException {
    return error instanceof DOMException && error.name === 'AbortError';
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


  private recordAutoClearedCells(cells: DisplayCell[]): void {
    if (!cells.length)
      return;

    this.undoManager.pushCells(
      cells.map(cell => ({ kind: 'clear', cell, nextStatus: SelectionStatus.CLEARED })),
      { appendToPrevious: true },
    );
  }


  private configureTimeTracking(): void {
    this.timeTracker.syncedTimer$.pipe(
      takeUntil(this.destroy)
    ).subscribe(time => {
      if (this.stats) {
        let previous = this.previousGames.get(this.gameNumber);
        if (previous && previous.completed)
          return

        this.stats.timeSpent = time;
      }
    });

    this.timeTracker.browserState$
      .pipe(
        takeUntil(this.destroy),
        filter(state => !state.active && state.reason !== 'manualPause'
        ),
      ).subscribe(() => {
        this.saveGameState()
      })
  }


  async changeGameNumberFromUi(gameNumber: number): Promise<void> {
    this.saveGameState();
    const previous = this.previousGames.get(gameNumber);
    if (previous) {
      await this.constructBoardFromPreviousState(previous);
    } else {
      await this.updateGameNumber(gameNumber);
    }

    this.saveGameState();
  }


  private async updateGameNumber(game: number): Promise<void> {
    this.gameNumber = game;
    this.celebratingGameNumber = undefined;
    this.moveHistory = [];
    this.nextGameButtonState = "hidden";
    this.undoManager.clear();
    this.timeTracker.reset(0)
    this.timeTracker.manualStart();
    this.wakeLock.enable()

    await this.buildAndDisplayBoard(game)

    this.saveGameState();
  }


  private async buildAndDisplayBoard(game: number): Promise<void> {
    this.gameBoard = await this.cachingBoardGenerator.generateOrGetGameBoard(game);

    let groupGrid = this.gameBoard.playArea.map(row => row.map(cell => cell.groupNumber))
    let colorAssignmentsDark = this.colorOptimizer.assignColors(AppColors.COLORS_DARK, groupGrid);
    let colorAssignmentsLight = this.colorOptimizer.assignColors(AppColors.COLORS_LIGHT, groupGrid);

    this.gameBoard.playArea.forEach(row => row.forEach(cell => {
      cell.colorDark = colorAssignmentsDark.colorByNumber.get(cell.groupNumber);
      cell.colorLight = colorAssignmentsLight.colorByNumber.get(cell.groupNumber);
    }))

    this.disableAnimationsTemporarily();
    this.layoutController.scheduleMeasurement();
  }


  async use(cell: DisplayCell): Promise<void> {
    cell.processing = false;

    if (cell.status !== SelectionStatus.NONE)
      return;

    if (cell.required) {
      cell.status = SelectionStatus.SELECTED;
      this.updateMoveHistory(true)
      this.undoManager.pushCells([
        { kind: 'select', cell },
      ]);
      this.gameBoard.recalculateSelectedHeaders();
      this.sectionAnimator.handleCellUsed(this.gameBoard, cell);
    } else {
      this.updateMoveHistory(false)
      this.undoManager.pushMistake();
      this.handleIncorrectMove(cell);
    }

    this.saveGameState();
    this.checkComplete();
  }


  async clear(cell: DisplayCell): Promise<void> {
    cell.processing = false;

    if (cell.status !== SelectionStatus.NONE)
      return;

    if (!cell.required) {
      cell.status = SelectionStatus.CLEARED;
      this.updateMoveHistory(true)
      this.undoManager.pushCells([
        { kind: 'clear', cell },
      ]);
    } else {
      this.updateMoveHistory(false)
      this.undoManager.pushMistake();
      this.handleIncorrectMove(cell);
    }

    this.saveGameState();
    this.checkComplete();
  }


  async onHeaderDoubleTap(rowIndex: number, colIndex: number): Promise<void> {
    if (rowIndex > 0 && colIndex > 0)
      return;

    let autoCleared: DisplayCell[] = [];
    if (rowIndex === 0 && colIndex > 0)
      autoCleared = this.gameBoard.clearColumn(colIndex - 1);
    else if (colIndex === 0 && rowIndex > 0)
      autoCleared = this.gameBoard.clearRow(rowIndex - 1);

    if (autoCleared.length)
      this.undoManager.pushCells(
        autoCleared.map(cell => ({ kind: 'clear', cell, nextStatus: SelectionStatus.CLEARED })),
      );

    this.saveGameState();
    this.checkComplete();
  }


  async playGameAgain(): Promise<void> {
    this.confirmStartOverLauncher
      .open(this.gameNumber)
      .pipe(takeUntil(this.destroy))
      .subscribe(async confirmed => {
        if (confirmed) {
          this.previousGames.delete(this.gameNumber);
          await this.updateGameNumber(this.gameNumber);
          this.saveGameState()
        }
      });
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


  async platNextUnfinishedGame(): Promise<void> {
    const allGameNumbers = Array.from(this.previousGames.keys()).sort((a, b) => a - b);
    // Find the next game number after current
    for (let i = this.gameNumber + 1; i <= Math.max(...allGameNumbers) + 1; i++) {
      const previousGame = this.previousGames.get(i);
      if (previousGame && !previousGame.completed) {
        // Found a partially completed game
        await this.constructBoardFromPreviousState(previousGame);
        return;
      } else if (!previousGame) {
        // Found an unstarted game number
        await this.changeGameNumberFromUi(i);
        return;
      }
    }

    // Fallback: create next sequential game
    const maxGameNumber = Math.max(...allGameNumbers);
    await this.changeGameNumberFromUi(maxGameNumber + 1);
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
          await this.constructBoardFromPreviousState(previous);
          return true
        }
      }
    }

    return false;
  }


  private async constructBoardFromPreviousState(previous: GameInProgressDtoV3): Promise<void> {
    this.gameNumber = previous.gameNumber || 1;
    this.celebratingGameNumber = undefined;
    this.moveHistory = previous.moveHistory ?? [];
    this.nextGameButtonState = "hidden";
    this.undoManager.clear();
    this.timeTracker.reset(previous.timeSpent ?? 0)
    if (previous.completed) {
      await this.buildAndDisplayBoard(this.gameNumber);
      this.gameBoard.playArea.forEach(row => row.forEach(cell => {
        cell.required = false;
        cell.status = SelectionStatus.CLEARED;
        cell.value = 0;
      }))
      this.gameBoard.recalculateSelectedHeaders();
      this.gameBoard.isComplete()
      this.nextGameButtonState = "show-instant";
      this.wakeLock.disable();
    } else {
      if (previous.grid) {
        let colorGroupGrid = previous.grid.map(row => row.map(cell => cell.groupNumber))
        let colorAssignmentsDark = this.colorOptimizer.assignColors(AppColors.COLORS_DARK, colorGroupGrid);
        let colorAssignmentsLight = this.colorOptimizer.assignColors(AppColors.COLORS_LIGHT, colorGroupGrid);

        let grid = previous.grid
          .map(row => row
            .map(cell => {
              let newCell = new DisplayCell();
              newCell.status = cell.status;
              newCell.required = cell.required;
              newCell.value = cell.value;
              newCell.groupNumber = cell.groupNumber;
              newCell.colorDark = colorAssignmentsDark.colorByNumber.get(cell.groupNumber);
              newCell.colorLight = colorAssignmentsLight.colorByNumber.get(cell.groupNumber);

              return newCell;
            }));

        this.gameBoard = new GameBoard();
        this.gameBoard.playArea = grid;
        this.gameBoard.constructBoard(this.gameNumber);
        this.gameBoard.recalculateSelectedHeaders();
        this.disableAnimationsTemporarily();
        this.timeTracker.manualStart();
        this.wakeLock.enable();
      } else {
        await this.updateGameNumber(this.gameNumber);
      }
    }

    this.calculateStats();
    this.layoutController.scheduleMeasurement();
  }


  private async handleIncorrectMove(cell: DisplayCell): Promise<void> {
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


  private setupStartOverMenuHandling(): void {
    this.boardUiService.restartRequested$
      .pipe(takeUntil(this.destroy))
      .subscribe(() => {
        this.playGameAgain();
      });
  }


  private async checkComplete(): Promise<void> {
    if (this.gameBoard.isComplete() && this.celebratingGameNumber === undefined) {
      this.celebratingGameNumber = this.gameNumber;
      this.undoManager.clear();
      const mistakes = this.stats.mistakesCurrentBoard;
      const playArea = this.gameBoard.playArea;

      (await this.celebrationLauncherService.openAutoPickMessage(mistakes, playArea))
        .pipe(takeUntil(this.destroy))
        .subscribe(() => {
          this.wakeLock.disable();
          setTimeout(() => {
            this.nextGameButtonState = "show-animated";
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
