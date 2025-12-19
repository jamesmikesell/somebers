import { GameCell, SelectionStatus, SimpleCell } from '../model/game-board';

export class BoardStatAnalyzer {
  private static LOG_ENABLED = false;

  /**
   * generate statistics about board 
   */
  static evaluate(cells: SimpleCell[][]): BoardStats {
    const start = performance.now();

    // First pass: cross-reference only after base stalls (used for FP+ detection).
    const firstPrincipalsInitialSolve = BoardStatAnalyzer.analyzeWithCrossMode(
      cells,
      CrossReferenceMode.AfterBaseStall,
    );

    // Second pass: cross-reference allowed every iteration (used for stats/ML).
    const totals = BoardStatAnalyzer.analyzeWithCrossMode(
      cells,
      CrossReferenceMode.Always,
    );

    if (this.LOG_ENABLED)
      console.log('Board stat analysis ', performance.now() - start)

    return { totals, firstPrincipalsInitialSolve };
  }


  private static convertBoardToSelectable(cells: SimpleCell[][]): GameCell[][] {
    return cells.map(r => r.map(c => {
      let casted: GameCell = {
        ...c,
        status: SelectionStatus.NONE,
      }

      return casted;
    }))
  }


  private static analyzeWithCrossMode(cells: SimpleCell[][], crossMode: CrossReferenceMode): TotalsStats {
    let grid = this.convertBoardToSelectable(cells);

    // Pre-allocate row and column bases
    const rowBases: SectionCells[] = Array.from({ length: grid.length }, (): SectionCells => new SectionCells());
    const colBases: Array<SectionCells> = Array.from({ length: grid[0].length }, (): SectionCells => new SectionCells());
    const groupsMap = new Map<number, SectionCells>();

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];

        let groupInfo = groupsMap.get(cell.groupNumber);
        if (!groupInfo) {
          groupInfo = new SectionCells();
          groupsMap.set(cell.groupNumber, groupInfo);
        }
        groupInfo.cells.push(cell);
        rowBases[r].cells[c] = cell;
        colBases[c].cells[r] = cell;
      }
    }

    const groupsBases = Array.from(groupsMap.values());

    // Run iterative deduction based on sums to select/clear guaranteed cells
    const deductionResults = BoardStatAnalyzer.iterativeDeduction(
      rowBases,
      colBases,
      groupsBases,
      crossMode,
    );

    return {
      boardSize: grid.length,
      deductionIterations: deductionResults.iterations,
      baseDeductionIterations: deductionResults.baseDeductionIterations,
      unresolvedCellCountAfterBaseDeduction: deductionResults.unresolvedAfterBaseDeduction,
      unresolvedCellCountAfterDeduction: deductionResults.unresolved,
      unresolvedCountsPerIteration: deductionResults.unresolvedCountsPerIteration,
      iterationSectionStats: deductionResults.iterationSectionStats,
    };
  }


  private static generateSectionStats(
    stat: SectionCells,
    possibleCorrect: PossiblyCorrectSolutions,
    crossPossibleCorrect?: PossiblyCorrectSolutions,
  ): SectionStats {
    const currentGoal = stat.currentGoal();
    const unselectedCells = stat.cells.filter(x => x.status === SelectionStatus.NONE);
    const unselectedCellSum = unselectedCells.reduce((sum, x) => sum + x.value, 0);
    const totalPossibleCombinations = Math.pow(2, unselectedCells.length);

    const actionableCellsCount = possibleCorrect.alwaysRequiredCount + possibleCorrect.neverUsedCount;

    const crossActionableCellsCount = crossPossibleCorrect
      ? crossPossibleCorrect.alwaysRequiredCount + crossPossibleCorrect.neverUsedCount
      : 0;

    return {
      goalSum: currentGoal,
      cellCountGreaterThanGoal: unselectedCells.filter(x => x.value > currentGoal).length,
      actionableCellsCount: actionableCellsCount,
      unactionableCellsCount: unselectedCells.length - actionableCellsCount,
      falsePositiveSolutionCount: (possibleCorrect.possiblyCorrectCombinations - 1) / totalPossibleCombinations,
      guaranteedRequiredCellCount: possibleCorrect.alwaysRequiredCount,
      guaranteedUnusableCellCount: possibleCorrect.neverUsedCount,
      guaranteedRequiredCellCountVsGoal: currentGoal ? (possibleCorrect.alwaysRequiredCount / currentGoal) : 0,
      guaranteedUnusableCellCountVsGoal: currentGoal ? (possibleCorrect.neverUsedCount / currentGoal) : 0,
      goalVsUnselectedSum: unselectedCellSum ? (currentGoal / unselectedCellSum) : 0,

      crossFalsePositiveSolutionCount: crossPossibleCorrect ? (crossPossibleCorrect.possiblyCorrectCombinations - 1) / totalPossibleCombinations : 0,
      crossActionableCellsCount: crossActionableCellsCount,
      crossUnactionableCellsCount: crossPossibleCorrect ? (unselectedCells.length - crossActionableCellsCount) : 0,
      crossGuaranteedRequiredCellCount: crossPossibleCorrect?.alwaysRequiredCount ?? 0,
      crossGuaranteedUnusableCellCount: crossPossibleCorrect?.neverUsedCount ?? 0,
      crossGuaranteedRequiredCellCountVsGoal: (crossPossibleCorrect && currentGoal) ? (crossPossibleCorrect.alwaysRequiredCount / currentGoal) : 0,
      crossGuaranteedUnusableCellCountVsGoal: (crossPossibleCorrect && currentGoal) ? (crossPossibleCorrect.neverUsedCount / currentGoal) : 0,

      crossAppliedSelectedCellCount: 0,
      crossAppliedClearedCellCount: 0,
      crossAppliedActedUponCellCount: 0,
    };
  }


  private static countSubsetsSolutions(section: SectionCells): PossiblyCorrectSolutions {
    const unselectedCells = section.cells.filter(x => x.status === SelectionStatus.NONE);
    const target = section.currentGoal();
    const n = unselectedCells.length;
    if (target < 0 || !n)
      return { possiblyCorrectCombinations: 0, alwaysRequiredCount: 0, neverUsedCount: 0 };

    const total = 1 << n; // includes empty subset
    let possiblyCorrectCombinations = 0;
    let andMask = (1 << n) - 1; // start with all bits set within n
    let orMask = 0;
    for (let mask = 0; mask < total; mask++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) sum += unselectedCells[i].value;
      }
      if (sum === target) {
        possiblyCorrectCombinations++;
        andMask &= mask;
        orMask |= mask;
      }
    }

    if (!possiblyCorrectCombinations)
      return { possiblyCorrectCombinations: 0, alwaysRequiredCount: 0, neverUsedCount: 0 };

    const alwaysRequiredCount = BoardStatAnalyzer.popCount(andMask & ((1 << n) - 1));
    const neverUsedCount = n - BoardStatAnalyzer.popCount(orMask & ((1 << n) - 1));
    return { possiblyCorrectCombinations, alwaysRequiredCount, neverUsedCount };
  }


  private static enumerateSolutionMasks(cells: GameCell[], target: number): number[] {
    const n = cells.length;
    if (target < 0) return [];
    if (!n) return target === 0 ? [0] : [];

    const total = 1 << n;
    const masks: number[] = [];
    for (let mask = 0; mask < total; mask++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) sum += cells[i].value;
      }
      if (sum === target) masks.push(mask);
    }
    return masks;
  }


  private static buildGroupSolutionData(groups: SectionCells[]): Map<number, GroupSolutionData> {
    const map = new Map<number, GroupSolutionData>();
    for (const group of groups) {
      const groupNumber = group.cells[0]?.groupNumber;
      if (groupNumber == null) continue;

      const unselectedCells = group.cells.filter(x => x.status === SelectionStatus.NONE);
      const target = group.currentGoal();
      const solutionMasks = BoardStatAnalyzer.enumerateSolutionMasks(unselectedCells, target);
      const cellIndexByCell = new Map<GameCell, number>();
      for (let i = 0; i < unselectedCells.length; i++)
        cellIndexByCell.set(unselectedCells[i], i);

      map.set(groupNumber, {
        groupNumber,
        unselectedCells,
        solutionMasks,
        cellIndexByCell,
      });
    }
    return map;
  }


  private static analyzeCrossReferenceLine(
    line: SectionCells,
    groupDataByNumber: Map<number, GroupSolutionData>,
  ): CrossReferenceLineResult {
    const unselectedCells = line.cells.filter(x => x.status === SelectionStatus.NONE);
    const target = line.currentGoal();
    const n = unselectedCells.length;
    if (target < 0 || !n)
      return { unselectedCells, validCount: 0, andMask: 0, orMask: 0 };

    const indexPairsByGroupNumber = new Map<number, LineGroupIndexPair[]>();
    for (let i = 0; i < n; i++) {
      const cell = unselectedCells[i];
      const groupData = groupDataByNumber.get(cell.groupNumber);
      const groupIndex = groupData?.cellIndexByCell.get(cell);
      if (!groupData || groupIndex == null) continue;

      const list = indexPairsByGroupNumber.get(cell.groupNumber) ?? [];
      list.push({ lineIndex: i, groupIndex });
      indexPairsByGroupNumber.set(cell.groupNumber, list);
    }

    const total = 1 << n;
    let validCount = 0;
    let andMask = (1 << n) - 1;
    let orMask = 0;

    for (let mask = 0; mask < total; mask++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) sum += unselectedCells[i].value;
      }
      if (sum !== target) continue;

      let supportedByAllGroups = true;
      for (const [groupNumber, pairs] of indexPairsByGroupNumber) {
        const groupData = groupDataByNumber.get(groupNumber);
        if (!groupData) continue;

        let mustSelect = 0;
        let mustClear = 0;
        for (const pair of pairs) {
          const selected = (mask & (1 << pair.lineIndex)) !== 0;
          if (selected) mustSelect |= (1 << pair.groupIndex);
          else mustClear |= (1 << pair.groupIndex);
        }

        let groupHasSupport = false;
        for (const groupMask of groupData.solutionMasks) {
          if ((groupMask & mustSelect) !== mustSelect) continue;
          if (groupMask & mustClear) continue;
          groupHasSupport = true;
          break;
        }

        if (!groupHasSupport) {
          supportedByAllGroups = false;
          break;
        }
      }

      if (!supportedByAllGroups) continue;

      validCount++;
      andMask &= mask;
      orMask |= mask;
    }

    if (!validCount)
      return { unselectedCells, validCount: 0, andMask: 0, orMask: 0 };

    return { unselectedCells, validCount, andMask, orMask };
  }


  private static crossReferenceLineSolutions(line: SectionCells, groupDataByNumber: Map<number, GroupSolutionData>): PossiblyCorrectSolutions {
    const analysis = BoardStatAnalyzer.analyzeCrossReferenceLine(line, groupDataByNumber);
    const n = analysis.unselectedCells.length;
    if (!analysis.validCount)
      return { possiblyCorrectCombinations: 0, alwaysRequiredCount: 0, neverUsedCount: 0 };

    const alwaysRequiredCount = BoardStatAnalyzer.popCount(analysis.andMask & ((1 << n) - 1));
    const neverUsedCount = n - BoardStatAnalyzer.popCount(analysis.orMask & ((1 << n) - 1));
    return { possiblyCorrectCombinations: analysis.validCount, alwaysRequiredCount, neverUsedCount };
  }


  private static deduceForCrossReferenceLine(line: SectionCells, groupDataByNumber: Map<number, GroupSolutionData>): CrossDeductionResult {
    const analysis = BoardStatAnalyzer.analyzeCrossReferenceLine(line, groupDataByNumber);
    const n = analysis.unselectedCells.length;
    if (!analysis.validCount) return { changed: false, selectedCount: 0, clearedCount: 0, actedUponCount: 0 };

    let changed = false;
    let selectedCount = 0;
    let clearedCount = 0;
    for (let i = 0; i < n; i++) {
      const cell = analysis.unselectedCells[i];
      const always = (analysis.andMask & (1 << i)) !== 0;
      const never = (analysis.orMask & (1 << i)) === 0;

      if (always) {
        cell.status = SelectionStatus.SELECTED;
        changed = true;
        selectedCount++;
        continue;
      }

      if (never) {
        cell.status = SelectionStatus.CLEARED;
        changed = true;
        clearedCount++;
      }
    }

    return { changed, selectedCount, clearedCount, actedUponCount: selectedCount + clearedCount };
  }


  private static popCount(x: number): number {
    x = x >>> 0;
    x = x - ((x >>> 1) & 0x55555555);
    x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
    return (((x + (x >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24;
  }


  // Enumerate subsets under existing fixed selections and cleared cells to deduce guarantees
  private static deduceForSection(section: SectionCells): boolean {
    const remainingTarget = section.currentGoal();
    const unselectedCells = section.cells.filter(x => x.status === SelectionStatus.NONE);
    if (remainingTarget < 0 || !unselectedCells.length) return false;

    if (remainingTarget === 0) {
      unselectedCells.forEach(x => x.status = SelectionStatus.CLEARED)
      return true;
    }

    const k = unselectedCells.length;
    if (k === 0) return false;

    const total = 1 << k;
    let exact = 0;
    let andMask = (1 << k) - 1;
    let orMask = 0;

    for (let mask = 0; mask < total; mask++) {
      let sum = 0;
      for (let j = 0; j < k; j++) if (mask & (1 << j)) sum += unselectedCells[j].value;
      if (sum === remainingTarget) {
        exact++;
        andMask &= mask;
        orMask |= mask;
      }
    }

    if (exact === 0) return false;

    let changed = false;
    for (let j = 0; j < k; j++) {
      const cell = unselectedCells[j];
      const always = (andMask & (1 << j)) !== 0;
      const never = (orMask & (1 << j)) === 0;

      if (always) {
        cell.status = SelectionStatus.SELECTED;
        changed = true;
        continue;
      }

      if (never) {
        cell.status = SelectionStatus.CLEARED;
        changed = true;
      }
    }

    return changed;
  }


  private static iterativeDeduction(
    rowBases: SectionCells[],
    colBases: SectionCells[],
    groupsMap: SectionCells[],
    crossMode: CrossReferenceMode,
  ): DeductionStats {
    const unresolvedCountsPerIteration: number[] = [];
    const iterationSectionStats: SectionStats[][] = [];
    let iterations = 0;
    let baseDeductionIterations: number | undefined;
    let unresolvedAfterBaseDeduction: number | undefined;
    while (true) {
      let baseChanged = false;

      const groupDataByNumber = BoardStatAnalyzer.buildGroupSolutionData(groupsMap);

      const rowReport: SectionStats[] = rowBases.map((stat) => {
        const baseSolutions = BoardStatAnalyzer.countSubsetsSolutions(stat);
        const crossSolutions = BoardStatAnalyzer.crossReferenceLineSolutions(stat, groupDataByNumber);
        return BoardStatAnalyzer.generateSectionStats(stat, baseSolutions, crossSolutions);
      });
      const colReport: SectionStats[] = colBases.map((stat) => {
        const baseSolutions = BoardStatAnalyzer.countSubsetsSolutions(stat);
        const crossSolutions = BoardStatAnalyzer.crossReferenceLineSolutions(stat, groupDataByNumber);
        return BoardStatAnalyzer.generateSectionStats(stat, baseSolutions, crossSolutions);
      });
      const groupReport: SectionStats[] = groupsMap.map((stat) => {
        const baseSolutions = BoardStatAnalyzer.countSubsetsSolutions(stat);
        return BoardStatAnalyzer.generateSectionStats(stat, baseSolutions);
      });
      iterationSectionStats.push([...rowReport, ...colReport, ...groupReport]);

      for (const row of rowBases) {
        if (BoardStatAnalyzer.deduceForSection(row))
          baseChanged = true;
      }

      for (const column of colBases) {
        if (BoardStatAnalyzer.deduceForSection(column))
          baseChanged = true;
      }

      for (const group of groupsMap) {
        if (BoardStatAnalyzer.deduceForSection(group))
          baseChanged = true;
      }

      let crossChanged = false;
      const shouldRunCross = crossMode === CrossReferenceMode.Always || !baseChanged;
      if (shouldRunCross) {
        if (!baseChanged && unresolvedAfterBaseDeduction == null) {
          const unresolvedAtBase = BoardStatAnalyzer.countUnresolved(rowBases);
          unresolvedAfterBaseDeduction = unresolvedAtBase;
          baseDeductionIterations = iterations;
        }

        for (let rowIndex = 0; rowIndex < rowBases.length; rowIndex++) {
          const liveGroupData = BoardStatAnalyzer.buildGroupSolutionData(groupsMap);
          const result = BoardStatAnalyzer.deduceForCrossReferenceLine(rowBases[rowIndex], liveGroupData);
          rowReport[rowIndex].crossAppliedSelectedCellCount = result.selectedCount;
          rowReport[rowIndex].crossAppliedClearedCellCount = result.clearedCount;
          rowReport[rowIndex].crossAppliedActedUponCellCount = result.actedUponCount;
          if (result.changed)
            crossChanged = true;
        }

        for (let colIndex = 0; colIndex < colBases.length; colIndex++) {
          const liveGroupData = BoardStatAnalyzer.buildGroupSolutionData(groupsMap);
          const result = BoardStatAnalyzer.deduceForCrossReferenceLine(colBases[colIndex], liveGroupData);
          colReport[colIndex].crossAppliedSelectedCellCount = result.selectedCount;
          colReport[colIndex].crossAppliedClearedCellCount = result.clearedCount;
          colReport[colIndex].crossAppliedActedUponCellCount = result.actedUponCount;
          if (result.changed)
            crossChanged = true;
        }
      }
      const changed = baseChanged || crossChanged;

      const unresolved = BoardStatAnalyzer.countUnresolved(rowBases);
      unresolvedCountsPerIteration.push(unresolved)

      if (!changed) {
        return {
          iterations,
          baseDeductionIterations: baseDeductionIterations ?? iterations,
          unresolvedAfterBaseDeduction: unresolvedAfterBaseDeduction ?? unresolved,
          unresolved,
          unresolvedCountsPerIteration,
          iterationSectionStats,
        };
      }
      iterations++;
    }
  }


  private static countUnresolved(sections: SectionCells[]): number {
    let unresolved = 0;
    for (const section of sections) {
      for (const cell of section.cells) {
        if (cell && cell.status === SelectionStatus.NONE) unresolved++;
      }
    }
    return unresolved;
  }
}


class SectionCells {
  cells: GameCell[] = [];

  /** section target minus any selected cell values */
  currentGoal(): number {
    let target = 0;
    let selected = 0;
    this.cells.forEach(c => {
      if (c.required)
        target += c.value;

      if (c.status === SelectionStatus.SELECTED)
        selected += c.value;
    })

    return target - selected;
  }
}

interface PossiblyCorrectSolutions {
  possiblyCorrectCombinations: number;
  alwaysRequiredCount: number;
  neverUsedCount: number;
}


export interface BoardStats {
  totals: TotalsStats;
  firstPrincipalsInitialSolve: TotalsStats;
}

export interface TotalsStats {
  boardSize: number;
  deductionIterations: number;
  baseDeductionIterations: number;
  unresolvedCellCountAfterBaseDeduction: number;
  unresolvedCellCountAfterDeduction: number;
  unresolvedCountsPerIteration: number[];
  iterationSectionStats: SectionStats[][];
}

export interface SectionStats {
  /** This is the difference between the section target and currently selected total */
  goalSum: number;
  cellCountGreaterThanGoal: number;
  falsePositiveSolutionCount: number;
  actionableCellsCount: number;
  unactionableCellsCount: number;
  guaranteedRequiredCellCount: number;
  guaranteedUnusableCellCount: number;
  guaranteedRequiredCellCountVsGoal: number;
  guaranteedUnusableCellCountVsGoal: number;
  /** This is the goalSum (difference between the section target and currently selected total) divide by sum of unselected cells */
  goalVsUnselectedSum: number;

  crossFalsePositiveSolutionCount: number;
  crossActionableCellsCount: number;
  crossUnactionableCellsCount: number;
  crossGuaranteedRequiredCellCount: number;
  crossGuaranteedUnusableCellCount: number;
  crossGuaranteedRequiredCellCountVsGoal: number;
  crossGuaranteedUnusableCellCountVsGoal: number;

  crossAppliedSelectedCellCount: number;
  crossAppliedClearedCellCount: number;
  crossAppliedActedUponCellCount: number;
}


interface DeductionStats {
  iterations: number;
  baseDeductionIterations: number;
  unresolvedAfterBaseDeduction: number;
  unresolved: number;
  unresolvedCountsPerIteration: number[];
  iterationSectionStats: SectionStats[][];
}

interface CrossReferenceLineResult {
  unselectedCells: GameCell[];
  validCount: number;
  andMask: number;
  orMask: number;
}

interface LineGroupIndexPair {
  lineIndex: number;
  groupIndex: number;
}

interface GroupSolutionData {
  groupNumber: number;
  unselectedCells: GameCell[];
  solutionMasks: number[];
  cellIndexByCell: Map<GameCell, number>;
}

interface CrossDeductionResult {
  changed: boolean;
  selectedCount: number;
  clearedCount: number;
  actedUponCount: number;
}

export enum CrossReferenceMode {
  AfterBaseStall = 'AfterBaseStall',
  Always = 'Always',
}
