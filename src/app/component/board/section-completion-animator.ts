import { Subject } from 'rxjs';
import { DisplayCell, GameBoard, SelectionStatus } from '../../model/game-board';

const CELL_CASCADE_DURATION = 200; // ms until last standard cell starts its glow
const HEADER_DELAY = 500; // time after last standard cell glow before header glow
const CELL_GLOW_DURATION = 600; // matches CSS animation duration

export type GlowVariant =
  | 'row'
  | 'column'
  | 'group'
  | 'row-header'
  | 'column-header'
  | 'group-header';

interface GlowSegment {
  cell: DisplayCell;
  variant: GlowVariant;
  delay: number;
}

interface SectionSchedule {
  segments: GlowSegment[];
  totalDuration: number;
}

interface CellLocation {
  rowIndex: number;
  colIndex: number;
}

interface CellWithIndex {
  cell: DisplayCell;
  row: number;
  col: number;
}

export class SectionCompletionAnimator {

  private enabled = true;
  private autoClearUnneededCells = false;
  private sequence = Promise.resolve();
  private readonly pendingTimers = new Set<number>();
  private readonly activeCells = new Set<DisplayCell>();
  private readonly animationCompletedSubject = new Subject<void>();
  readonly animationCompleted$ = this.animationCompletedSubject.asObservable();

  setAutoComplete(autoClearUnneededCells: boolean) {
    this.autoClearUnneededCells = autoClearUnneededCells;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    if (!enabled)
      this.resetAll();
  }

  dispose(): void {
    this.resetAll();
    this.animationCompletedSubject.complete();
  }

  handleCellUsed(board: GameBoard, cell: DisplayCell): void {
    if (!this.enabled)
      return;

    const location = this.findCellLocation(board, cell);
    if (!location)
      return;

    const sections = this.buildEligibleSections(board, cell, location);
    if (!sections.length)
      return;

    this.sequence = this.sequence
      .then(() => this.runInSeries(sections))
      .then(() => {
        if (!this.animationCompletedSubject.closed)
          this.animationCompletedSubject.next();
      });
  }

  private runInSeries(sections: SectionSchedule[]): Promise<void> {
    return sections.reduce(
      (prev, section) => prev.then(() => this.runSection(section)),
      Promise.resolve(),
    );
  }

  private runSection(section: SectionSchedule): Promise<void> {
    if (!section.segments.length)
      return Promise.resolve();

    section.segments.forEach(segment => this.scheduleGlow(segment));

    return new Promise(resolve => {
      const timer = window.setTimeout(() => {
        this.pendingTimers.delete(timer);
        resolve();
      }, section.totalDuration);

      this.pendingTimers.add(timer);
    });
  }

  private scheduleGlow(segment: GlowSegment): void {
    const timer = window.setTimeout(() => {
      this.pendingTimers.delete(timer);

      if (!this.enabled)
        return;

      this.activateCell(segment.cell, segment.variant);

      const clearTimer = window.setTimeout(() => {
        this.pendingTimers.delete(clearTimer);
        this.clearCell(segment.cell, segment.variant);
      }, CELL_GLOW_DURATION);

      this.pendingTimers.add(clearTimer);
    }, segment.delay);

    this.pendingTimers.add(timer);
  }

  private activateCell(cell: DisplayCell, variant: GlowVariant): void {
    cell.glowVariant = variant;
    cell.glowCycle = (cell.glowCycle ?? 0) + 1;
    cell.glowActive = true;
    this.activeCells.add(cell);

    if (this.autoClearUnneededCells && this.shouldAutoClearCell(cell, variant))
      cell.status = SelectionStatus.CLEARED;
  }

  private clearCell(cell: DisplayCell, variant: GlowVariant): void {
    if (cell.glowVariant === variant)
      cell.glowVariant = undefined;

    cell.glowActive = false;
    this.activeCells.delete(cell);
  }

  private resetAll(): void {
    this.pendingTimers.forEach(timer => window.clearTimeout(timer));
    this.pendingTimers.clear();

    this.activeCells.forEach(cell => {
      cell.glowVariant = undefined;
      cell.glowActive = false;
    });

    this.activeCells.clear();
    this.sequence = Promise.resolve();
  }

  private shouldAutoClearCell(cell: DisplayCell, variant: GlowVariant): boolean {
    if (cell.required)
      return false;

    if (cell.status === SelectionStatus.CLEARED)
      return false;

    return variant === 'row' || variant === 'column' || variant === 'group';
  }

  private findCellLocation(board: GameBoard, target: DisplayCell): CellLocation | null {
    for (let rowIndex = 0; rowIndex < board.playArea.length; rowIndex++) {
      const colIndex = board.playArea[rowIndex].indexOf(target);
      if (colIndex !== -1)
        return { rowIndex, colIndex };
    }

    return null;
  }

  private buildEligibleSections(board: GameBoard, cell: DisplayCell, location: CellLocation): SectionSchedule[] {
    const sections: SectionSchedule[] = [];

    const rowSection = this.buildRowSection(board, location);
    if (rowSection)
      sections.push(rowSection);

    const columnSection = this.buildColumnSection(board, location);
    if (columnSection)
      sections.push(columnSection);

    const groupSection = this.buildGroupSection(board, cell);
    if (groupSection)
      sections.push(groupSection);

    return sections;
  }

  private buildRowSection(board: GameBoard, location: CellLocation): SectionSchedule | null {
    const { rowIndex } = location;
    const header = this.getRowHeader(board, rowIndex);
    if (!header)
      return null;

    const target = header.value ?? 0;
    const current = header.groupNumber ?? 0;
    if (!target || current !== target)
      return null;

    const rowCells = board.playArea[rowIndex];
    if (!rowCells?.length)
      return null;

    if (!this.hasUnresolvedCells(rowCells))
      return null;

    const orderedCells = rowCells
      .map((cell, col) => ({ cell, col }))
      .sort((a, b) => b.col - a.col);

    return this.buildSectionSchedule(
      orderedCells.map(item => item.cell),
      header,
      'row',
    );
  }

  private buildColumnSection(board: GameBoard, location: CellLocation): SectionSchedule | null {
    const { colIndex } = location;
    const header = this.getColumnHeader(board, colIndex);
    if (!header)
      return null;

    const target = header.value ?? 0;
    const current = header.groupNumber ?? 0;
    if (!target || current !== target)
      return null;

    const columnCells: CellWithIndex[] = [];
    for (let row = 0; row < board.playArea.length; row++) {
      const cell = board.playArea[row][colIndex];
      if (!cell)
        continue;

      columnCells.push({ cell, row, col: colIndex });
    }

    if (!columnCells.length)
      return null;

    if (!this.hasUnresolvedCells(columnCells.map(item => item.cell)))
      return null;

    columnCells.sort((a, b) => b.row - a.row);

    return this.buildSectionSchedule(
      columnCells.map(item => item.cell),
      header,
      'column',
    );
  }

  private buildGroupSection(board: GameBoard, cell: DisplayCell): SectionSchedule | null {
    const groupNumber = cell.groupNumber;
    if (!groupNumber)
      return null;

    const groupCells: CellWithIndex[] = [];
    for (let row = 0; row < board.playArea.length; row++) {
      for (let col = 0; col < board.playArea[row].length; col++) {
        const candidate = board.playArea[row][col];
        if (candidate?.groupNumber === groupNumber)
          groupCells.push({ cell: candidate, row, col });
      }
    }

    if (!groupCells.length)
      return null;

    const target = this.extractGroupTarget(groupCells);
    if (!target)
      return null;

    const current = groupCells
      .filter(item => item.cell.status === SelectionStatus.SELECTED)
      .reduce((sum, item) => sum + (item.cell.value ?? 0), 0);

    if (current !== target)
      return null;

    if (!this.hasUnresolvedCells(groupCells.map(item => item.cell)))
      return null;

    const headerCandidate = this.findGroupHeader(groupCells);
    const includeHeaderInClearSequence = this.autoClearUnneededCells
      && this.shouldAutoClearCell(headerCandidate.cell, 'group');
    const orderingCandidates = includeHeaderInClearSequence
      ? [...groupCells]
      : groupCells.filter(item => item !== headerCandidate);

    const { cells: orderedCells, delays } = this.orderGroupCells(orderingCandidates, headerCandidate);

    const schedule = this.buildSectionSchedule(
      orderedCells,
      headerCandidate.cell,
      'group',
      { delays },
    );

    if (!schedule)
      return null;

    return schedule;
  }

  private buildSectionSchedule(
    cells: DisplayCell[],
    header: DisplayCell,
    type: 'row' | 'column' | 'group',
    options?: { delays?: number[] },
  ): SectionSchedule | null {
    const segments: GlowSegment[] = [];

    let lastCellDelay = 0;

    const customDelays = options?.delays;

    if (customDelays && customDelays.length) {
      cells.forEach((cell, index) => {
        const delay = customDelays[index] ?? 0;
        segments.push({ cell, variant: type, delay });
        lastCellDelay = Math.max(lastCellDelay, delay);
      });
    } else {
      const cellCount = cells.length;
      const step = cellCount > 1 ? CELL_CASCADE_DURATION / (cellCount - 1) : 0;

      cells.forEach((cell, index) => {
        const delay = index === 0 ? 0 : Math.round(step * index);
        segments.push({ cell, variant: type, delay });
        lastCellDelay = delay;
      });
    }

    const headerDelay = lastCellDelay + HEADER_DELAY;
    const headerVariant: GlowVariant =
      type === 'row'
        ? 'row-header'
        : type === 'column'
          ? 'column-header'
          : 'group-header';

    segments.push({ cell: header, variant: headerVariant, delay: headerDelay });

    const totalDuration = headerDelay + CELL_GLOW_DURATION;

    return { segments, totalDuration };
  }

  private orderGroupCells(
    cells: CellWithIndex[],
    header: CellWithIndex,
  ): { cells: DisplayCell[]; delays: number[] } {
    if (!cells.length)
      return { cells: [], delays: [] };

    const annotated = cells.map(item => {
      const rowOffset = Math.max(0, item.row - header.row);
      const colOffset = Math.max(0, item.col - header.col);
      const stage = Math.max(rowOffset, colOffset);

      return {
        cell: item.cell,
        row: item.row,
        col: item.col,
        stage,
      };
    });

    const stageLevels = Array.from(new Set(annotated.map(item => item.stage))).sort((a, b) => b - a);
    const step = stageLevels.length > 1 ? CELL_CASCADE_DURATION / (stageLevels.length - 1) : 0;
    const delayByStage = new Map<number, number>();

    stageLevels.forEach((stage, index) => {
      let delay = index === 0 ? 0 : Math.round(step * index);
      if (index === stageLevels.length - 1 && stageLevels.length > 1)
        delay = CELL_CASCADE_DURATION;
      delayByStage.set(stage, delay);
    });

    annotated.sort((a, b) => {
      if (a.stage !== b.stage)
        return b.stage - a.stage;
      if (a.row !== b.row)
        return b.row - a.row;
      return b.col - a.col;
    });

    const orderedCells = annotated.map(item => item.cell);
    const delays = annotated.map(item => delayByStage.get(item.stage) ?? 0);

    return { cells: orderedCells, delays };
  }

  private hasUnresolvedCells(cells: DisplayCell[]): boolean {
    return cells.some(cell => cell.status === SelectionStatus.NONE);
  }

  private extractGroupTarget(cells: CellWithIndex[]): number {
    const withTargets = cells.find(item => typeof item.cell.colorGroupGoalDisplayValue === 'number');
    return withTargets?.cell.colorGroupGoalDisplayValue ?? 0;
  }

  private findGroupHeader(cells: CellWithIndex[]): CellWithIndex {
    let topLeft = cells[0];
    for (let i = 1; i < cells.length; i++) {
      const current = cells[i];
      if (current.row < topLeft.row || (current.row === topLeft.row && current.col < topLeft.col))
        topLeft = current;
    }

    return topLeft;
  }

  private getRowHeader(board: GameBoard, rowIndex: number): DisplayCell | undefined {
    return board.fullBoard[rowIndex + 1]?.[0];
  }

  private getColumnHeader(board: GameBoard, colIndex: number): DisplayCell | undefined {
    return board.fullBoard[0]?.[colIndex + 1];
  }
}
