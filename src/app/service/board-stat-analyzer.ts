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

    // Keep track of coordinates for each group
    const groupIndexMap = new Map<number, Array<{ r: number; c: number }>>();

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];

        let groupInfo = groupsMap.get(cell.groupNumber);
        if (!groupInfo) {
          groupInfo = new SectionCells();
          groupsMap.set(cell.groupNumber, groupInfo);
        }
        groupInfo.cells.push(cell);

        // Track coordinates for the group
        (groupIndexMap.get(cell.groupNumber) ?? (groupIndexMap.set(cell.groupNumber, []), groupIndexMap.get(cell.groupNumber)!))
          .push({ r, c });

        rowBases[r].cells[c] = cell;
        colBases[c].cells[r] = cell;
      }
    }


    const rowsReport: SectionStats[] = rowBases.map((stat) => {
      const possibleCorrect = BoardStatAnalyzer.countSubsets(stat);
      return BoardStatAnalyzer.GenerateSectionStats(stat, possibleCorrect)
    });

    const colsReport: SectionStats[] = colBases.map((stat) => {
      const possibleCorrect = BoardStatAnalyzer.countSubsets(stat);
      return BoardStatAnalyzer.GenerateSectionStats(stat, possibleCorrect)
    });

    const groupsReport: SectionStats[] = Array.from(groupsMap.values()).map(stat => {
      const possibleCorrect = BoardStatAnalyzer.countSubsets(stat);
      return BoardStatAnalyzer.GenerateSectionStats(stat, possibleCorrect)
    })

    // Run iterative deduction based on sums to select/clear guaranteed cells
    const { iterations: deductionIterations, unresolved: unresolvedCellCount, unresolvedCountsPerIteration } = BoardStatAnalyzer.iterativeDeduction(
      rowBases,
      colBases,
      groupsMap,
      groupIndexMap,
    );


    const stats: BoardStats = {
      rows: rowsReport,
      columns: colsReport,
      groups: groupsReport,
      totals: {
        rowsEvaluated: rowsReport.length,
        columnsEvaluated: colsReport.length,
        groupsEvaluated: groupsReport.length,
        deductionIterations,
        unresolvedCellCountAfterDeduction: unresolvedCellCount,
        unresolvedCountsPerIteration,
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
      // index: i,
      goalSum: currentGoal,
      cellCountGreaterThanCurrentGoal: unselectedCells.filter(x => x.value > currentGoal).length,
      firstIterationFalsePositiveSolutionCount: possibleCorrect.possiblyCorrectCombinations - 1,
      firstIterationGuaranteedRequiredCellCount: possibleCorrect.alwaysRequiredCount,
      firstIterationGuaranteedUnusableCellCount: possibleCorrect.neverUsedCount,
      firstIterationGuaranteedRequiredCellCountVsGoalSum: possibleCorrect.alwaysRequiredCount / currentGoal,
      firstIterationGuaranteedUnusableCellCountVsGoalSum: possibleCorrect.neverUsedCount / currentGoal,
      goalVsTotal: currentGoal / unselectedCellSum,
    };
  }


  private static countSubsets(section: SectionCells): PossiblyCorrectSolutions {
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
    if (possiblyCorrectCombinations === 0) return { possiblyCorrectCombinations: possiblyCorrectCombinations, alwaysRequiredCount: 0, neverUsedCount: 0 };
    return { possiblyCorrectCombinations, alwaysRequiredCount, neverUsedCount };
  }

  
  private static popCount(x: number): number {
    x = x >>> 0;
    x = x - ((x >>> 1) & 0x55555555);
    x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
    return (((x + (x >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24;
  }


  // Enumerate subsets under existing fixed selections and cleared cells to deduce guarantees
  private static deduceForSection(values: number[], statuses: SelectionStatus[], requiredSum: number): { selectIdxs: number[]; clearIdxs: number[] } {
    // Sum of values already selected
    let sumSelected = 0;
    for (let i = 0; i < values.length; i++) if (statuses[i] === SelectionStatus.SELECTED) sumSelected += values[i];

    const remainingTarget = requiredSum - sumSelected;
    if (remainingTarget < 0) return { selectIdxs: [], clearIdxs: [] };

    // Candidate indices are those not already selected or cleared
    const candidateIdxs: number[] = [];
    for (let i = 0; i < values.length; i++) if (statuses[i] === SelectionStatus.NONE) candidateIdxs.push(i);

    if (remainingTarget === 0) {
      // All remaining candidates must be cleared
      return { selectIdxs: [], clearIdxs: candidateIdxs };
    }

    const k = candidateIdxs.length;
    if (k === 0) return { selectIdxs: [], clearIdxs: [] };

    const total = 1 << k;
    let exact = 0;
    let andMask = (1 << k) - 1;
    let orMask = 0;
    for (let mask = 0; mask < total; mask++) {
      let s = 0;
      for (let j = 0; j < k; j++) if (mask & (1 << j)) s += values[candidateIdxs[j]];
      if (s === remainingTarget) {
        exact++;
        andMask &= mask;
        orMask |= mask;
      }
    }

    if (exact === 0) return { selectIdxs: [], clearIdxs: [] };

    const selectIdxs: number[] = [];
    const clearIdxs: number[] = [];
    for (let j = 0; j < k; j++) {
      const idx = candidateIdxs[j];
      const always = (andMask & (1 << j)) !== 0;
      const never = (orMask & (1 << j)) === 0;
      if (always) selectIdxs.push(idx);
      if (never) clearIdxs.push(idx);
    }
    return { selectIdxs, clearIdxs };
  }

  
  private static iterativeDeduction(
    rowBases: SectionCells[],
    colBases: SectionCells[],
    groupsMap: Map<number, SectionCells>,
    groupIndexMap: Map<number, Array<{ r: number; c: number }>>,
  ): DeductionStats {
    // Maintain a local status map; also reflect to grid cells if they expose a status field
    const rows = rowBases.length;
    const cols = colBases.length;
    const statusMap: SelectionStatus[][] = Array.from({ length: rows }, () => new Array<SelectionStatus>(cols).fill(SelectionStatus.NONE));

    const unresolvedCountsPerIteration: number[] = [];
    let iterations = 0;
    while (true) {
      let changed = false;

      // Rows
      for (let r = 0; r < rows; r++) {
        const sectionStatuses = statusMap[r].slice();
        const { selectIdxs, clearIdxs } = BoardStatAnalyzer.deduceForSection(rowBases[r].cells.map(x => x.value), sectionStatuses, rowBases[r].currentGoal());
        for (const c of selectIdxs) if (statusMap[r][c] !== SelectionStatus.SELECTED) { statusMap[r][c] = SelectionStatus.SELECTED; changed = true; }
        for (const c of clearIdxs) if (statusMap[r][c] !== SelectionStatus.CLEARED) { statusMap[r][c] = SelectionStatus.CLEARED; changed = true; }
      }

      // Columns
      for (let c = 0; c < cols; c++) {
        const colStatuses: SelectionStatus[] = new Array(rows);
        for (let r = 0; r < rows; r++) colStatuses[r] = statusMap[r][c];
        const { selectIdxs, clearIdxs } = BoardStatAnalyzer.deduceForSection(colBases[c].cells.map(x => x.value), colStatuses, colBases[c].currentGoal());
        for (const r of selectIdxs) if (statusMap[r][c] !== SelectionStatus.SELECTED) { statusMap[r][c] = SelectionStatus.SELECTED; changed = true; }
        for (const r of clearIdxs) if (statusMap[r][c] !== SelectionStatus.CLEARED) { statusMap[r][c] = SelectionStatus.CLEARED; changed = true; }
      }

      // Groups
      groupsMap.forEach((stat, g) => {
        const coords = groupIndexMap.get(g)!;
        const gStatuses = coords.map(({ r, c }) => statusMap[r][c]);
        const { selectIdxs, clearIdxs } = BoardStatAnalyzer.deduceForSection(stat.cells.map(x => x.value), gStatuses, stat.currentGoal());
        for (const localIdx of selectIdxs) {
          const { r, c } = coords[localIdx];
          if (statusMap[r][c] !== SelectionStatus.SELECTED) { statusMap[r][c] = SelectionStatus.SELECTED; changed = true; }
        }
        for (const localIdx of clearIdxs) {
          const { r, c } = coords[localIdx];
          if (statusMap[r][c] !== SelectionStatus.CLEARED) { statusMap[r][c] = SelectionStatus.CLEARED; changed = true; }
        }
      })

      let unresolved = 0;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (statusMap[r][c] === SelectionStatus.NONE) unresolved++;
      unresolvedCountsPerIteration.push(unresolved)

      if (!changed) break;
      iterations++;
    }

    let unresolved = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (statusMap[r][c] === SelectionStatus.NONE) unresolved++;
    return {
      iterations,
      unresolved,
      unresolvedCountsPerIteration,
    };
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
  rows: SectionStats[];
  columns: SectionStats[];
  groups: SectionStats[];
  totals: {
    rowsEvaluated: number;
    columnsEvaluated: number;
    groupsEvaluated: number;
    deductionIterations: number;
    unresolvedCellCountAfterDeduction: number;
    unresolvedCountsPerIteration: number[]
  };
}

export interface SectionStats {
  goalSum: number;
  cellCountGreaterThanCurrentGoal: number;
  // TODO: rename these
  firstIterationFalsePositiveSolutionCount: number;
  firstIterationGuaranteedRequiredCellCount: number;
  firstIterationGuaranteedUnusableCellCount: number;
  firstIterationGuaranteedRequiredCellCountVsGoalSum: number;
  firstIterationGuaranteedUnusableCellCountVsGoalSum: number;
  goalVsTotal: number;
}


interface DeductionStats {
  iterations: number;
  unresolved: number
  unresolvedCountsPerIteration: number[]
} 