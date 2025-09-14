import { SelectionStatus, SimpleCell } from "../model/game-board";

export class BoardStatAnalyzer {

  /**
   * Pure evaluation of a grid for difficulty statistics.
   */
  static evaluate(grid: SimpleCell[][]): DifficultyReport {

    // Pre-allocate row and column bases
    const rowBases: LinearStat[] = Array.from({ length: grid.length }, (): LinearStat => new LinearStat());
    const colBases: Array<LinearStat> = Array.from({ length: grid[0].length }, (): LinearStat => new LinearStat());
    const groupsMap = new Map<number, LinearStat>();

    // Keep track of coordinates for each group
    const groupIndexMap = new Map<number, Array<{ r: number; c: number }>>();

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];

        let groupInfo = groupsMap.get(cell.groupNumber);
        if (!groupInfo) {
          groupInfo = new LinearStat();
          groupsMap.set(cell.groupNumber, groupInfo);
        }
        const groupIndex = groupInfo.values.length;
        groupInfo.values.push(cell.value);

        // Track coordinates for the group
        (groupIndexMap.get(cell.groupNumber) ?? (groupIndexMap.set(cell.groupNumber, []), groupIndexMap.get(cell.groupNumber)!))
          .push({ r, c });

        rowBases[r].values[c] = cell.value;
        colBases[c].values[r] = cell.value;
        if (cell.required) {
          rowBases[r].requiredIndices.push(c);
          rowBases[r].requiredSum += cell.value;

          colBases[c].requiredIndices.push(r);
          colBases[c].requiredSum += cell.value;

          groupInfo.requiredIndices.push(groupIndex);
          groupInfo.requiredSum += cell.value;
        }
      }
    }

    // Subset counting and assembling report
    let subsetsEvaluated = 0;

    const rowsReport: SectionStats[] = rowBases.map((stat, i) => {
      const possibleCorrect = BoardStatAnalyzer.countSubsets(stat.values, stat.requiredSum);
      subsetsEvaluated += possibleCorrect.total;
      return BoardStatAnalyzer.GenerateSectionStats(stat, i, possibleCorrect)
    });

    const colsReport: SectionStats[] = colBases.map((stat, i) => {
      const possibleCorrect = BoardStatAnalyzer.countSubsets(stat.values, stat.requiredSum);
      subsetsEvaluated += possibleCorrect.total;
      return BoardStatAnalyzer.GenerateSectionStats(stat, i, possibleCorrect)
    });

    const groupsSorted = Array.from(groupsMap.keys()).sort((a, b) => a - b);
    const groupsReport: SectionStats[] = groupsSorted.map(groupNumber => {
      const stat = groupsMap.get(groupNumber)!;
      const possibleCorrect = BoardStatAnalyzer.countSubsets(stat.values, stat.requiredSum);
      subsetsEvaluated += possibleCorrect.total;
      return BoardStatAnalyzer.GenerateSectionStats(stat, groupNumber, possibleCorrect)
    });

    // Run iterative deduction based on sums to select/clear guaranteed cells
    const { iterations: deductionIterations, unresolved: unresolvedCellCount } = BoardStatAnalyzer.iterativeDeduction(
      grid,
      rowBases,
      colBases,
      groupsSorted,
      groupsMap,
      groupIndexMap,
    );

    return {
      rows: rowsReport,
      columns: colsReport,
      groups: groupsReport,
      summaries: {
        rowsAndColumns: BoardStatAnalyzer.summarize([...rowsReport, ...colsReport]),
        groups: BoardStatAnalyzer.summarize(groupsReport),
      },
      totals: {
        rowsEvaluated: grid.length,
        columnsEvaluated: grid[0].length,
        groupsEvaluated: groupsSorted.length,
        subsetsEvaluated,
        deductionIterations,
        unresolvedCellCountAfterDeduction: unresolvedCellCount,
      },
    };
  }


  private static GenerateSectionStats(stat: LinearStat, i: number, possibleCorrect: PossiblyCorrectSolutions): SectionStats {
    const nonExact = possibleCorrect.total - possibleCorrect.exact;
    return {
      index: i,
      requiredSum: stat.requiredSum,
      values: stat.values.slice(),
      requiredIndices: stat.requiredIndices.slice(),
      exactCombinationCount: possibleCorrect.exact,
      nonExactCombinationCount: nonExact,
      firstIterationGuaranteedRequiredCellCount: possibleCorrect.alwaysRequiredCount,
      firstIterationGuaranteedUnusableCellCount: possibleCorrect.neverUsedCount,
      valuesRms: BoardStatAnalyzer.rms(stat.values),
    };
  }


  private static summarize(sections: SectionStats[]): SectionAggregates {
    const requiredSums = sections.map(s => s.requiredSum);
    const valuesRms = sections.map(s => s.valuesRms);
    return {
      requiredSumAvg: BoardStatAnalyzer.mean(requiredSums),
      requiredSumRms: BoardStatAnalyzer.rms(requiredSums),
      valuesRmsAvg: BoardStatAnalyzer.mean(valuesRms),
      valuesRmsRms: BoardStatAnalyzer.rms(valuesRms),
    };
  };


  private static countSubsets(values: number[], target: number): PossiblyCorrectSolutions {
    const n = values.length;
    const total = 1 << n; // includes empty subset
    let exact = 0;
    let andMask = (1 << n) - 1; // start with all bits set within n
    let orMask = 0;
    for (let mask = 0; mask < total; mask++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) sum += values[i];
      }
      if (sum === target) {
        exact++;
        andMask &= mask;
        orMask |= mask;
      }
    }
    const alwaysRequiredCount = BoardStatAnalyzer.popcount(andMask & ((1 << n) - 1));
    const neverUsedCount = n - BoardStatAnalyzer.popcount(orMask & ((1 << n) - 1));
    if (exact === 0) return { exact, total, alwaysRequiredCount: 0, neverUsedCount: 0 };
    return { exact, total, alwaysRequiredCount, neverUsedCount };
  }

  private static mean(values: number[]): number {
    if (values.length === 0) return 0;
    let s = 0;
    for (let i = 0; i < values.length; i++) s += values[i];
    return s / values.length;
  }

  private static rms(values: number[]): number {
    if (values.length === 0) return 0;
    let s2 = 0;
    for (let i = 0; i < values.length; i++) s2 += values[i] * values[i];
    return Math.sqrt(s2 / values.length);
  }

  private static popcount(x: number): number {
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
    grid: SimpleCell[][],
    rowBases: LinearStat[],
    colBases: LinearStat[],
    groupsSorted: number[],
    groupsMap: Map<number, LinearStat>,
    groupIndexMap: Map<number, Array<{ r: number; c: number }>>,
  ): { iterations: number; unresolved: number } {
    // Maintain a local status map; also reflect to grid cells if they expose a status field
    const rows = grid.length;
    const cols = grid[0].length;
    const statusMap: SelectionStatus[][] = Array.from({ length: rows }, () => new Array<SelectionStatus>(cols).fill(SelectionStatus.NONE));

    let iterations = 0;
    while (true) {
      let changed = false;

      // Rows
      for (let r = 0; r < rows; r++) {
        const sectionStatuses = statusMap[r].slice();
        const { selectIdxs, clearIdxs } = BoardStatAnalyzer.deduceForSection(rowBases[r].values, sectionStatuses, rowBases[r].requiredSum);
        for (const c of selectIdxs) if (statusMap[r][c] !== SelectionStatus.SELECTED) { statusMap[r][c] = SelectionStatus.SELECTED; changed = true; }
        for (const c of clearIdxs) if (statusMap[r][c] !== SelectionStatus.CLEARED) { statusMap[r][c] = SelectionStatus.CLEARED; changed = true; }
      }

      // Columns
      for (let c = 0; c < cols; c++) {
        const colStatuses: SelectionStatus[] = new Array(rows);
        for (let r = 0; r < rows; r++) colStatuses[r] = statusMap[r][c];
        const { selectIdxs, clearIdxs } = BoardStatAnalyzer.deduceForSection(colBases[c].values, colStatuses, colBases[c].requiredSum);
        for (const r of selectIdxs) if (statusMap[r][c] !== SelectionStatus.SELECTED) { statusMap[r][c] = SelectionStatus.SELECTED; changed = true; }
        for (const r of clearIdxs) if (statusMap[r][c] !== SelectionStatus.CLEARED) { statusMap[r][c] = SelectionStatus.CLEARED; changed = true; }
      }

      // Groups
      for (const g of groupsSorted) {
        const coords = groupIndexMap.get(g)!;
        const stat = groupsMap.get(g)!;
        const gStatuses = coords.map(({ r, c }) => statusMap[r][c]);
        const { selectIdxs, clearIdxs } = BoardStatAnalyzer.deduceForSection(stat.values, gStatuses, stat.requiredSum);
        for (const localIdx of selectIdxs) {
          const { r, c } = coords[localIdx];
          if (statusMap[r][c] !== SelectionStatus.SELECTED) { statusMap[r][c] = SelectionStatus.SELECTED; changed = true; }
        }
        for (const localIdx of clearIdxs) {
          const { r, c } = coords[localIdx];
          if (statusMap[r][c] !== SelectionStatus.CLEARED) { statusMap[r][c] = SelectionStatus.CLEARED; changed = true; }
        }
      }

      if (!changed) break;
      iterations++;
    }

    let unresolved = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (statusMap[r][c] === SelectionStatus.NONE) unresolved++;
    return { iterations, unresolved };
  }
}


class LinearStat {
  values: number[] = [];
  requiredIndices: number[] = [];
  requiredSum = 0;
}

interface PossiblyCorrectSolutions {
  exact: number;
  total: number
  alwaysRequiredCount: number;
  neverUsedCount: number;
}


export interface DifficultyReport {
  rows: SectionStats[];
  columns: SectionStats[];
  groups: SectionStats[];
  summaries: {
    rowsAndColumns: SectionAggregates;
    groups: SectionAggregates;
  };
  totals: {
    rowsEvaluated: number;
    columnsEvaluated: number;
    groupsEvaluated: number;
    subsetsEvaluated: number;
    deductionIterations: number;
    unresolvedCellCountAfterDeduction: number;
  };
}

export interface SectionStats {
  index: number;
  requiredSum: number;
  values: number[];
  requiredIndices: number[];
  exactCombinationCount: number;
  nonExactCombinationCount: number;
  firstIterationGuaranteedRequiredCellCount: number;
  firstIterationGuaranteedUnusableCellCount: number;
  valuesRms: number;
}

export interface SectionAggregates {
  requiredSumAvg: number;
  requiredSumRms: number;
  valuesRmsAvg: number;
  valuesRmsRms: number;
}
