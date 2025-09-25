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
    'firstIterationGuaranteedRequiredCellCountSum',
    // 
    // 'firstIterationGuaranteedUnusableCellCountAllMean',
    // 'firstIterationGuaranteedUnusableCellCountAllMin',
    'firstIterationGuaranteedUnusableCellCountAllMax',
    'firstIterationGuaranteedUnusableCellCountAllStd',
    'firstIterationGuaranteedUnusableCellCountAllSum',
    //
    // 'firstIterationActionableCellCountGrpMean',
    // 'firstIterationActionableCellCountGrpMin',
    // 'firstIterationActionableCellCountGrpMax',
    // 'firstIterationActionableCellCountGrpStd',
    // 'firstIterationActionableCellCountGrpSum',
    // 
    // 'firstIterationActionableCellAllCountMean',
    // 'firstIterationActionableCellAllCountMin', // for all row/col/grp what is the min number of cells where an guaranteed action can be performed.. on many boards there tends to be at one row/col/grp where nothing can be done
    'firstIterationActionableCellAllCountMax',
    'firstIterationActionableCellAllCountStd',
    'firstIterationActionableCellAllCountSum',
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
    'cellCountLargerThanTargetAllSum',
    // 
    // 'deductionIterations',
    // 'unresolvedCellCountAfterDeduction',
    'percentUnresolvedCellsAfterDeduction',
    //
    'percentUnresolvedCellsAfterDeductionI1',
    'percentUnresolvedCellsAfterDeductionI2',
    // 'percentUnresolvedCellsAfterDeductionI3',
    // 'percentUnresolvedCellsAfterDeductionI4',
    // 'percentUnresolvedCellsAfterDeductionI5',
    //
    'autoCompleteWasAvailable',
    //
    'gameDateAsPercent',
  ],
};


export function difficultyReportToGameStat(stats: DifficultyReport, timeSpent: number, gameNumber: number, gameDateAsPercent: number, autoCompletionAvailable = true): GameStatWithBoard & GameStatFeatures & GameStatWithTimeSpent & RawGenericFeatureSet {
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

  const firstIterationActionableCellAllCountRow = stats.rows.map(s => s.firstIterationGuaranteedRequiredCellCount + s.firstIterationGuaranteedUnusableCellCount);
  const firstIterationActionableCellAllCountCol = stats.columns.map(s => s.firstIterationGuaranteedRequiredCellCount + s.firstIterationGuaranteedUnusableCellCount);
  const firstIterationActionableCellCountGrp = stats.groups.map(s => s.firstIterationGuaranteedRequiredCellCount + s.firstIterationGuaranteedUnusableCellCount);
  const firstIterationActionableCellAllCountAllAgg = agg([...firstIterationActionableCellAllCountRow, ...firstIterationActionableCellAllCountCol, ...firstIterationActionableCellCountGrp])
  const firstIterationActionableCellAllCountGroupAgg = agg([...firstIterationActionableCellCountGrp])

  const requiredSumRow = stats.rows.map(s => s.requiredSum);
  const requiredSumCol = stats.columns.map(s => s.requiredSum);
  const requiredSumGrp = stats.groups.map(s => s.requiredSum);
  const requiredSumAllAgg = agg([...requiredSumRow, ...requiredSumCol, ...requiredSumGrp])

  const boardSize = stats.totals.rowsEvaluated
  const cellCount = boardSize * boardSize;
  // const maxCellCount = 9 * 9;
  // const minCellCount = 5 * 5;
  // const boardSizeCellCountRatio = (cellCount - minCellCount) / (maxCellCount - minCellCount)
  const boardSizeRatio = (boardSize - 5) / (9 - 5);
  let features: GameStatFeatures = {
    boardSize: boardSizeRatio,

    firstIterationFalsePositiveSolutionCountAllMean: firstIterationFalsePositiveSolutionCountAllAgg.mean,
    firstIterationFalsePositiveSolutionCountAllMin: firstIterationFalsePositiveSolutionCountAllAgg.min / Math.pow(2, boardSize),
    firstIterationFalsePositiveSolutionCountAllMax: firstIterationFalsePositiveSolutionCountAllAgg.max / Math.pow(2, boardSize),
    firstIterationFalsePositiveSolutionCountAllStd: firstIterationFalsePositiveSolutionCountAllAgg.std,
    firstIterationFalsePositiveSolutionCountAllSum: firstIterationFalsePositiveSolutionCountAllAgg.sum / (Math.pow(2, boardSize) * 3),

    firstIterationGuaranteedRequiredCellCountMean: firstIterationGuaranteedRequiredCellCountAllAgg.mean / boardSize,
    firstIterationGuaranteedRequiredCellCountMin: firstIterationGuaranteedRequiredCellCountAllAgg.min / boardSize,
    firstIterationGuaranteedRequiredCellCountMax: firstIterationGuaranteedRequiredCellCountAllAgg.max / boardSize,
    firstIterationGuaranteedRequiredCellCountStd: firstIterationGuaranteedRequiredCellCountAllAgg.std / boardSize,
    firstIterationGuaranteedRequiredCellCountSum: firstIterationGuaranteedRequiredCellCountAllAgg.sum / boardSize / 3,

    firstIterationGuaranteedUnusableCellCountAllMean: firstIterationGuaranteedUnusableCellCountAllAgg.mean / boardSize,
    firstIterationGuaranteedUnusableCellCountAllMin: firstIterationGuaranteedUnusableCellCountAllAgg.min / boardSize,
    firstIterationGuaranteedUnusableCellCountAllMax: firstIterationGuaranteedUnusableCellCountAllAgg.max / boardSize,
    firstIterationGuaranteedUnusableCellCountAllStd: firstIterationGuaranteedUnusableCellCountAllAgg.std / boardSize,
    firstIterationGuaranteedUnusableCellCountAllSum: firstIterationGuaranteedUnusableCellCountAllAgg.sum / boardSize / 3,

    firstIterationActionableCellAllCountMean: firstIterationActionableCellAllCountAllAgg.mean / boardSize,
    firstIterationActionableCellAllCountMin: firstIterationActionableCellAllCountAllAgg.min / boardSize,
    firstIterationActionableCellAllCountMax: firstIterationActionableCellAllCountAllAgg.max / boardSize,
    firstIterationActionableCellAllCountStd: firstIterationActionableCellAllCountAllAgg.std / boardSize,
    firstIterationActionableCellAllCountSum: firstIterationActionableCellAllCountAllAgg.sum / boardSize / 3,

    firstIterationActionableCellCountGrpMean: firstIterationActionableCellAllCountGroupAgg.mean / boardSize,
    firstIterationActionableCellCountGrpMin: firstIterationActionableCellAllCountGroupAgg.min / boardSize,
    firstIterationActionableCellCountGrpMax: firstIterationActionableCellAllCountGroupAgg.max / boardSize,
    firstIterationActionableCellCountGrpStd: firstIterationActionableCellAllCountGroupAgg.std / boardSize,
    firstIterationActionableCellCountGrpSum: firstIterationActionableCellAllCountGroupAgg.sum / boardSize / 3,

    requiredSumAllMean: requiredSumAllAgg.mean,
    requiredSumAllMin: requiredSumAllAgg.min,
    requiredSumAllMax: requiredSumAllAgg.max,
    requiredSumAllStd: requiredSumAllAgg.std,
    requiredSumAllSum: requiredSumAllAgg.sum,

    cellCountLargerThanTargetAllMean: cellCountLargerThanTargetAllAgg.mean / boardSize,
    cellCountLargerThanTargetAllMin: cellCountLargerThanTargetAllAgg.min / boardSize,
    cellCountLargerThanTargetAllMax: cellCountLargerThanTargetAllAgg.max / boardSize,
    cellCountLargerThanTargetAllStd: cellCountLargerThanTargetAllAgg.std / boardSize,
    cellCountLargerThanTargetAllSum: cellCountLargerThanTargetAllAgg.sum / boardSize / 3,

    deductionIterations: stats.totals.deductionIterations,
    unresolvedCellCountAfterDeduction: stats.totals.unresolvedCellCountAfterDeduction,
    percentUnresolvedCellsAfterDeduction: stats.totals.unresolvedCellCountAfterDeduction / cellCount,

    percentUnresolvedCellsAfterDeductionI1: (stats.totals.unresolvedCountsPerIteration[0] ?? 0) / cellCount,
    percentUnresolvedCellsAfterDeductionI2: (stats.totals.unresolvedCountsPerIteration[1] ?? 0) / cellCount,
    percentUnresolvedCellsAfterDeductionI3: (stats.totals.unresolvedCountsPerIteration[2] ?? 0) / cellCount,
    percentUnresolvedCellsAfterDeductionI4: (stats.totals.unresolvedCountsPerIteration[3] ?? 0) / cellCount,
    percentUnresolvedCellsAfterDeductionI5: (stats.totals.unresolvedCountsPerIteration[4] ?? 0) / cellCount,

    autoCompleteWasAvailable: autoCompletionAvailable ? 1 : 0,

    gameDateAsPercent: gameDateAsPercent,
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
  firstIterationActionableCellAllCountMean: number;
  firstIterationActionableCellAllCountMin: number;
  firstIterationActionableCellAllCountMax: number;
  firstIterationActionableCellAllCountStd: number;
  firstIterationActionableCellAllCountSum: number;
  //
  firstIterationActionableCellCountGrpMean: number;
  firstIterationActionableCellCountGrpMin: number;
  firstIterationActionableCellCountGrpMax: number;
  firstIterationActionableCellCountGrpStd: number;
  firstIterationActionableCellCountGrpSum: number;
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
  //
  deductionIterations: number;
  unresolvedCellCountAfterDeduction: number;
  percentUnresolvedCellsAfterDeduction: number;
  //
  percentUnresolvedCellsAfterDeductionI1: number;
  percentUnresolvedCellsAfterDeductionI2: number;
  percentUnresolvedCellsAfterDeductionI3: number;
  percentUnresolvedCellsAfterDeductionI4: number;
  percentUnresolvedCellsAfterDeductionI5: number;
  //
  autoCompleteWasAvailable: number;
  //
  gameDateAsPercent: number;
}
