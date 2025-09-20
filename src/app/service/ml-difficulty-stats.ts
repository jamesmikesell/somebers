import { FeatureSpec } from "../model/ml-types";
import { DifficultyReport } from "./board-stat-analyzer";
import { RawGenericFeatureSet } from "./ml-core";





// Ordered feature keys — excludes gameNumber and timeSpent
export const FEATURE_SPEC: FeatureSpec = {
  keys: [
    'boardSize',

    // 'firstIterationFalsePositiveSolutionCountAllMean',
    'firstIterationFalsePositiveSolutionCountAllMin',
    // 'firstIterationFalsePositiveSolutionCountAllMax',
    // 'firstIterationFalsePositiveSolutionCountAllStd',
    // 'firstIterationFalsePositiveSolutionCountAllSum',
    // 
    // 'firstIterationGuaranteedRequiredCellCountMean',
    // 'firstIterationGuaranteedRequiredCellCountMin',
    'firstIterationGuaranteedRequiredCellCountMax',
    'firstIterationGuaranteedRequiredCellCountStd',
    // 'firstIterationGuaranteedRequiredCellCountSum',
    // 
    // 'firstIterationGuaranteedUnusableCellCountAllMean',
    // 'firstIterationGuaranteedUnusableCellCountAllMin',
    'firstIterationGuaranteedUnusableCellCountAllMax',
    'firstIterationGuaranteedUnusableCellCountAllStd',
    // 'firstIterationGuaranteedUnusableCellCountAllSum',
    // 
    // 'firstIterationActionableCellCountMean',
    // 'firstIterationActionableCellCountMin', // for all row/col/grp what is the min number of cells where an guaranteed action can be performed.. on many boards there tends to be at one row/col/grp where nothing can be done
    'firstIterationActionableCellCountMax',
    'firstIterationActionableCellCountStd',
    // 'firstIterationActionableCellCountSum',
    //
    // 'requiredSumAllMean',
    // 'requiredSumAllMin',
    // 'requiredSumAllMax',
    // 'requiredSumAllStd',
    // 'requiredSumAllSum',
    // 
    // 'cellCountLargerThanTargetAllMean',
    // 'cellCountLargerThanTargetAllMin',
    // 'cellCountLargerThanTargetAllMax',
    // 'cellCountLargerThanTargetAllStd',
    // 'cellCountLargerThanTargetAllSum',
    // 'cellCountLargerThanTargetAllPercent',
    // 
    // 'deductionIterations',
    // 'unresolvedCellCountAfterDeduction',
    'percentUnresolvedCellsAfterDeduction',

  ],
};


export function difficultyReportToGameStat(stats: DifficultyReport, timeSpent: number, gameNumber: number): GameStatWithBoard & GameStatFeatures & GameStatWithTimeSpent & RawGenericFeatureSet {
  const agg = (xs: number[]) => {
    const n = xs.length || 1;
    let sum = 0;
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < xs.length; i++) {
      const v = xs[i];
      sum += v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (!xs.length) { min = 0; max = 0; }
    const mean = sum / n;
    let vsum = 0;
    for (let i = 0; i < xs.length; i++) {
      const d = xs[i] - mean;
      vsum += d * d;
    }
    const std = Math.sqrt(vsum / n);
    return { mean, min, max, std, sum };
  };

  const cellCountLargerThanTargetRow = stats.rows.map(s => s.cellValues.filter(c => c > s.requiredSum).length)
  const cellCountLargerThanTargetCol = stats.columns.map(s => s.cellValues.filter(c => c > s.requiredSum).length)
  const cellCountLargerThanTargetGrp = stats.groups.map(s => s.cellValues.filter(c => c > s.requiredSum).length)
  const cellCountLargerThanTargetAllAgg = agg([...cellCountLargerThanTargetRow, ...cellCountLargerThanTargetCol, ...cellCountLargerThanTargetGrp]);

  const firstIterationFalsePositiveSolutionCountRow = stats.rows.map(s => s.firstIterationFalsePositiveSolutionCount);
  const firstIterationFalsePositiveSolutionCountCol = stats.columns.map(s => s.firstIterationFalsePositiveSolutionCount);
  const firstIterationFalsePositiveSolutionCountGrp = stats.groups.map(s => s.firstIterationFalsePositiveSolutionCount);
  const firstIterationFalsePositiveSolutionCountAllAgg = agg([...firstIterationFalsePositiveSolutionCountRow, ...firstIterationFalsePositiveSolutionCountCol, ...firstIterationFalsePositiveSolutionCountGrp]);


  // New metrics: alwaysRequiredCount and neverUsedCount
  const firstIterationGuaranteedRequiredCellCountRow = stats.rows.map(s => s.firstIterationGuaranteedRequiredCellCount);
  const firstIterationGuaranteedRequiredCellCountCol = stats.columns.map(s => s.firstIterationGuaranteedRequiredCellCount);
  const firstIterationGuaranteedRequiredCellCountGrp = stats.groups.map(s => s.firstIterationGuaranteedRequiredCellCount);
  const firstIterationGuaranteedRequiredCellCountAllAgg = agg([...firstIterationGuaranteedRequiredCellCountRow, ...firstIterationGuaranteedRequiredCellCountCol, ...firstIterationGuaranteedRequiredCellCountGrp]);

  const firstIterationGuaranteedUnusableCellCountRow = stats.rows.map(s => s.firstIterationGuaranteedUnusableCellCount);
  const firstIterationGuaranteedUnusableCellCountCol = stats.columns.map(s => s.firstIterationGuaranteedUnusableCellCount);
  const firstIterationGuaranteedUnusableCellCountGrp = stats.groups.map(s => s.firstIterationGuaranteedUnusableCellCount);
  const firstIterationGuaranteedUnusableCellCountAllAgg = agg([...firstIterationGuaranteedUnusableCellCountRow, ...firstIterationGuaranteedUnusableCellCountCol, ...firstIterationGuaranteedUnusableCellCountGrp]);

  const firstIterationActionableCellCountRow = stats.rows.map(s => s.firstIterationGuaranteedRequiredCellCount + s.firstIterationGuaranteedUnusableCellCount);
  const firstIterationActionableCellCountCol = stats.columns.map(s => s.firstIterationGuaranteedRequiredCellCount + s.firstIterationGuaranteedUnusableCellCount);
  const firstIterationActionableCellCountGrp = stats.groups.map(s => s.firstIterationGuaranteedRequiredCellCount + s.firstIterationGuaranteedUnusableCellCount);
  const firstIterationActionableCellCountAllAgg = agg([...firstIterationActionableCellCountRow, ...firstIterationActionableCellCountCol, ...firstIterationActionableCellCountGrp])

  const requiredSumRow = stats.rows.map(s => s.requiredSum);
  const requiredSumCol = stats.columns.map(s => s.requiredSum);
  const requiredSumGrp = stats.groups.map(s => s.requiredSum);
  const requiredSumAllAgg = agg([...requiredSumRow, ...requiredSumCol, ...requiredSumGrp])

  const boardSize = stats.totals.rowsEvaluated
  const cellCount = boardSize * boardSize;

  let features: GameStatFeatures = {
    boardSize: boardSize,

    firstIterationFalsePositiveSolutionCountAllMean: firstIterationFalsePositiveSolutionCountAllAgg.mean,
    firstIterationFalsePositiveSolutionCountAllMin: firstIterationFalsePositiveSolutionCountAllAgg.min,
    firstIterationFalsePositiveSolutionCountAllMax: firstIterationFalsePositiveSolutionCountAllAgg.max,
    firstIterationFalsePositiveSolutionCountAllStd: firstIterationFalsePositiveSolutionCountAllAgg.std,
    firstIterationFalsePositiveSolutionCountAllSum: firstIterationFalsePositiveSolutionCountAllAgg.sum,

    firstIterationGuaranteedRequiredCellCountMean: firstIterationGuaranteedRequiredCellCountAllAgg.mean,
    firstIterationGuaranteedRequiredCellCountMin: firstIterationGuaranteedRequiredCellCountAllAgg.min,
    firstIterationGuaranteedRequiredCellCountMax: firstIterationGuaranteedRequiredCellCountAllAgg.max,
    firstIterationGuaranteedRequiredCellCountStd: firstIterationGuaranteedRequiredCellCountAllAgg.std,
    firstIterationGuaranteedRequiredCellCountSum: firstIterationGuaranteedRequiredCellCountAllAgg.sum,

    firstIterationGuaranteedUnusableCellCountAllMean: firstIterationGuaranteedUnusableCellCountAllAgg.mean,
    firstIterationGuaranteedUnusableCellCountAllMin: firstIterationGuaranteedUnusableCellCountAllAgg.min,
    firstIterationGuaranteedUnusableCellCountAllMax: firstIterationGuaranteedUnusableCellCountAllAgg.max,
    firstIterationGuaranteedUnusableCellCountAllStd: firstIterationGuaranteedUnusableCellCountAllAgg.std,
    firstIterationGuaranteedUnusableCellCountAllSum: firstIterationGuaranteedUnusableCellCountAllAgg.sum,

    firstIterationActionableCellCountMean: firstIterationActionableCellCountAllAgg.mean,
    firstIterationActionableCellCountMin: firstIterationActionableCellCountAllAgg.min,
    firstIterationActionableCellCountMax: firstIterationActionableCellCountAllAgg.max,
    firstIterationActionableCellCountStd: firstIterationActionableCellCountAllAgg.std,
    firstIterationActionableCellCountSum: firstIterationActionableCellCountAllAgg.sum,

    requiredSumAllMean: requiredSumAllAgg.mean,
    requiredSumAllMin: requiredSumAllAgg.min,
    requiredSumAllMax: requiredSumAllAgg.max,
    requiredSumAllStd: requiredSumAllAgg.std,
    requiredSumAllSum: requiredSumAllAgg.sum,

    cellCountLargerThanTargetAllMean: cellCountLargerThanTargetAllAgg.mean,
    cellCountLargerThanTargetAllMin: cellCountLargerThanTargetAllAgg.min,
    cellCountLargerThanTargetAllMax: cellCountLargerThanTargetAllAgg.max,
    cellCountLargerThanTargetAllStd: cellCountLargerThanTargetAllAgg.std,
    cellCountLargerThanTargetAllSum: cellCountLargerThanTargetAllAgg.sum,
    cellCountLargerThanTargetAllPercent: cellCountLargerThanTargetAllAgg.sum / cellCount,

    deductionIterations: stats.totals.deductionIterations,
    unresolvedCellCountAfterDeduction: stats.totals.unresolvedCellCountAfterDeduction,
    percentUnresolvedCellsAfterDeduction: stats.totals.unresolvedCellCountAfterDeduction / cellCount,
  };

  let x: GameStatWithBoard = { gameNumber }
  let z: GameStatWithTimeSpent = { timeSpent }

  return { ...features, ...x, ...z };
}


export interface GameStatWithBoard {
  gameNumber: number;
}


export interface GameStatWithTimeSpent {
  timeSpent: number;
}




// Subset of GameStat features required for prediction. Excludes gameNumber and timeSpent.
export interface GameStatFeatures {
  boardSize: number;
  // 
  firstIterationFalsePositiveSolutionCountAllMean: number;
  firstIterationFalsePositiveSolutionCountAllMin: number;
  firstIterationFalsePositiveSolutionCountAllMax: number;
  firstIterationFalsePositiveSolutionCountAllStd: number;
  firstIterationFalsePositiveSolutionCountAllSum: number;
  // 
  firstIterationGuaranteedRequiredCellCountMean: number;
  firstIterationGuaranteedRequiredCellCountMin: number;
  firstIterationGuaranteedRequiredCellCountMax: number;
  firstIterationGuaranteedRequiredCellCountStd: number;
  firstIterationGuaranteedRequiredCellCountSum: number;
  firstIterationGuaranteedUnusableCellCountAllMean: number;
  firstIterationGuaranteedUnusableCellCountAllMin: number;
  firstIterationGuaranteedUnusableCellCountAllMax: number;
  firstIterationGuaranteedUnusableCellCountAllStd: number;
  firstIterationGuaranteedUnusableCellCountAllSum: number;
  //
  firstIterationActionableCellCountMean: number;
  firstIterationActionableCellCountMin: number;
  firstIterationActionableCellCountMax: number;
  firstIterationActionableCellCountStd: number;
  firstIterationActionableCellCountSum: number;
  //
  requiredSumAllMean: number;
  requiredSumAllMin: number;
  requiredSumAllMax: number;
  requiredSumAllStd: number;
  requiredSumAllSum: number;
  //
  cellCountLargerThanTargetAllMean: number;
  cellCountLargerThanTargetAllMin: number;
  cellCountLargerThanTargetAllMax: number;
  cellCountLargerThanTargetAllStd: number;
  cellCountLargerThanTargetAllSum: number;
  cellCountLargerThanTargetAllPercent: number;
  //
  deductionIterations: number;
  unresolvedCellCountAfterDeduction: number;
  percentUnresolvedCellsAfterDeduction: number;
}
