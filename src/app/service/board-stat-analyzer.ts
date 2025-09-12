import { SimpleCell } from "../model/game-board";

export class BoardStatAnalyzer {

  /**
   * Pure evaluation of a grid for difficulty statistics.
   */
  static evaluate(grid: SimpleCell[][]): DifficultyReport {

    // Pre-allocate row and column bases
    const rowBases: LinearStat[] = Array.from({ length: grid.length }, (): LinearStat => new LinearStat());
    const colBases: Array<LinearStat> = Array.from({ length: grid[0].length }, (): LinearStat => new LinearStat());
    const groupsMap = new Map<number, LinearStat>();

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
    for (let mask = 0; mask < total; mask++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) sum += values[i];
      }
      if (sum === target) exact++;
    }
    return { exact, total };
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
}


class LinearStat {
  values: number[] = [];
  requiredIndices: number[] = [];
  requiredSum = 0;
}

interface PossiblyCorrectSolutions {
  exact: number;
  total: number
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
  };
}

export interface SectionStats {
  index: number;
  requiredSum: number;
  values: number[];
  requiredIndices: number[];
  exactCombinationCount: number;
  nonExactCombinationCount: number;
  valuesRms: number;
}

export interface SectionAggregates {
  requiredSumAvg: number;
  requiredSumRms: number;
  valuesRmsAvg: number;
  valuesRmsRms: number;
}

