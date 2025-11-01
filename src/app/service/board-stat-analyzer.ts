import { GameCell, SelectionStatus, SimpleCell } from "../model/game-board";

export class BoardStatAnalyzer {
  private static LOG_ENABLED = false;

  /**
   * generate statistics about board 
   */
  static evaluate(cells: SimpleCell[][]): BoardStats {
    const start = performance.now();

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
    );


    const stats: BoardStats = {
      totals: {
        boardSize: grid.length,
        deductionIterations: deductionResults.iterations,
        unresolvedCellCountAfterDeduction: deductionResults.unresolved,
        unresolvedCountsPerIteration: deductionResults.unresolvedCountsPerIteration,
        iterationSectionStats: deductionResults.iterationSectionStats,
      },
    };

    if (this.LOG_ENABLED)
      console.log("Board stat analysis ", performance.now() - start)

    return stats;
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


  private static GenerateSectionStats(stat: SectionCells, possibleCorrect: PossiblyCorrectSolutions): SectionStats {
    const currentGoal = stat.currentGoal();
    const unselectedCells = stat.cells.filter(x => x.status === SelectionStatus.NONE);
    const unselectedCellSum = unselectedCells.reduce((sum, x) => sum + x.value, 0);

    return {
      goalSum: currentGoal,
      cellCountGreaterThanCurrentGoal: unselectedCells.filter(x => x.value > currentGoal).length,
      iterationFalsePositiveSolutionCount: possibleCorrect.possiblyCorrectCombinations - 1,
      iterationGuaranteedRequiredCellCount: possibleCorrect.alwaysRequiredCount,
      iterationGuaranteedUnusableCellCount: possibleCorrect.neverUsedCount,
      iterationGuaranteedRequiredCellCountVsGoalSum: currentGoal ? (possibleCorrect.alwaysRequiredCount / currentGoal) : 0,
      iterationGuaranteedUnusableCellCountVsGoalSum: currentGoal ? (possibleCorrect.neverUsedCount / currentGoal) : 0,
      goalVsTotal: unselectedCellSum ? (currentGoal / unselectedCellSum) : 0,
    };
  }


  private static countSubsets(section: SectionCells): SectionStats {
    const unselectedCells = section.cells.filter(x => x.status === SelectionStatus.NONE)
    const target = section.currentGoal();
    const n = unselectedCells.length;
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
    const alwaysRequiredCount = BoardStatAnalyzer.popCount(andMask & ((1 << n) - 1));
    const neverUsedCount = n - BoardStatAnalyzer.popCount(orMask & ((1 << n) - 1));
    const solutions: PossiblyCorrectSolutions = { possiblyCorrectCombinations, alwaysRequiredCount, neverUsedCount };

    return BoardStatAnalyzer.GenerateSectionStats(section, solutions)
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
  ): DeductionStats {
    const unresolvedCountsPerIteration: number[] = [];
    const iterationSectionStats: SectionStats[][] = [];
    let iterations = 0;
    while (true) {
      let changed = false;

      const rowReport: SectionStats[] = rowBases.map((stat) => BoardStatAnalyzer.countSubsets(stat));
      const colReport: SectionStats[] = colBases.map((stat) => BoardStatAnalyzer.countSubsets(stat));
      const groupReport: SectionStats[] = groupsMap.map((stat) => BoardStatAnalyzer.countSubsets(stat));
      iterationSectionStats.push([...rowReport, ...colReport, ...groupReport]);

      for (const row of rowBases) {
        if (BoardStatAnalyzer.deduceForSection(row))
          changed = true;
      }

      for (const column of colBases) {
        if (BoardStatAnalyzer.deduceForSection(column))
          changed = true;
      }

      for (const group of groupsMap) {
        if (BoardStatAnalyzer.deduceForSection(group))
          changed = true;
      }

      const unresolved = BoardStatAnalyzer.countUnresolved(rowBases);
      unresolvedCountsPerIteration.push(unresolved)

      if (!changed) {
        return {
          iterations,
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
  totals: {
    boardSize: number;
    deductionIterations: number;
    unresolvedCellCountAfterDeduction: number;
    unresolvedCountsPerIteration: number[];
    iterationSectionStats: SectionStats[][];
  };
}

export interface SectionStats {
  goalSum: number;
  cellCountGreaterThanCurrentGoal: number;
  iterationFalsePositiveSolutionCount: number;
  iterationGuaranteedRequiredCellCount: number;
  iterationGuaranteedUnusableCellCount: number;
  iterationGuaranteedRequiredCellCountVsGoalSum: number;
  iterationGuaranteedUnusableCellCountVsGoalSum: number;
  goalVsTotal: number;
}


interface DeductionStats {
  iterations: number;
  unresolved: number;
  unresolvedCountsPerIteration: number[];
  iterationSectionStats: SectionStats[][];
}
