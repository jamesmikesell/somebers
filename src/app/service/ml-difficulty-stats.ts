import { FeatureSpec } from "../model/ml-types";
import { BoardStats } from "./board-stat-analyzer";
import { RawGenericFeatureSet } from "./ml-core";





export const FEATURE_SPEC: FeatureSpec = {
  keys: [

    "percentUnresolvedCellsAfterDeductionI1",
    "percentUnresolvedCellsAfterDeductionI2",
    "percentUnresolvedCellsAfterDeductionI3",
    "percentUnresolvedCellsAfterDeductionI4",
    "percentUnresolvedCellsAfterDeductionI5",
    "percentUnresolvedCellsAfterDeductionI6",
    "boardSize",
    "gameDateAsPercent",
    "iteration_0_ActionableCellAllCountMean",
    "iteration_1_cellCountLargerThanTargetAllMean",
    "iteration_0_goalVsTotalMin",
    "iteration_0_UnusableCellCountVsGoalAllMax",
    "iteration_0_cellCountLargerThanTargetAllStd",
    "iteration_1_GuaranteedRequiredCellCountMax",
    "iteration_0_ActionableCellAllCountMax",
    "iteration_0_goalVsTotalStd",
    "iteration_0_ActionableCellAllCountStd",
    "percentUnresolvedCellsAfterDeduction",
    "iteration_0_GuaranteedRequiredCellCountStd",
    "iteration_0_goalVsTotalAllStd",
    "iteration_1_GuaranteedRequiredCellCountStd",
    "iteration_1_cellCountLargerThanTargetAllSum"


    // 'boardSize',
    // // 'iteration_0_FalsePositiveSolutionCountAllMean',
    // 'iteration_0_FalsePositiveSolutionCountAllMin',
    // // 'iteration_0_FalsePositiveSolutionCountAllMax',
    // // 'iteration_0_FalsePositiveSolutionCountAllStd',
    // // 'iteration_0_FalsePositiveSolutionCountAllSum',
    // // 
    // // 'iteration_0_GuaranteedRequiredCellCountMean',
    // // 'iteration_0_GuaranteedRequiredCellCountMin',
    // 'iteration_0_GuaranteedRequiredCellCountMax',
    // 'iteration_0_GuaranteedRequiredCellCountStd',
    // 'iteration_0_GuaranteedRequiredCellCountSum',
    // // 
    // // 'iteration_0_GuaranteedUnusableCellCountAllMean',
    // // 'iteration_0_GuaranteedUnusableCellCountAllMin',
    // 'iteration_0_GuaranteedUnusableCellCountAllMax',
    // 'iteration_0_GuaranteedUnusableCellCountAllStd',
    // 'iteration_0_GuaranteedUnusableCellCountAllSum',
    // //
    // 'iteration_0_RequiredCellCountVsGoalAllMean',
    // // 'iteration_0_RequiredCellCountVsGoalAllMin',
    // // 'iteration_0_RequiredCellCountVsGoalAllMax',
    // 'iteration_0_RequiredCellCountVsGoalAllStd',
    // // 'iteration_0_RequiredCellCountVsGoalAllSum',
    // //
    // 'iteration_0_UnusableCellCountVsGoalAllMean',
    // // 'iteration_0_UnusableCellCountVsGoalAllMin',
    // // 'iteration_0_UnusableCellCountVsGoalAllMax',
    // 'iteration_0_UnusableCellCountVsGoalAllStd',
    // 'iteration_0_UnusableCellCountVsGoalAllSum',
    // //
    // // 'iteration_0_ActionableCellAllCountMean',
    // // 'iteration_0_ActionableCellAllCountMin', // for all row/col/grp what is the min number of cells where an guaranteed action can be performed.. on many boards there tends to be at one row/col/grp where nothing can be done
    // 'iteration_0_ActionableCellAllCountMax',
    // 'iteration_0_ActionableCellAllCountStd',
    // 'iteration_0_ActionableCellAllCountSum',
    // //
    // 'iteration_0_goalVsTotalMean',
    // // 'iteration_0_goalVsTotalMin',
    // // 'iteration_0_goalVsTotalMax',
    // 'iteration_0_goalVsTotalStd',
    // // 'iteration_0_goalVsTotalSum',
    // // 
    // // 'iteration_0_cellCountLargerThanTargetAllMean',
    // // 'iteration_0_cellCountLargerThanTargetAllMin',
    // // 'iteration_0_cellCountLargerThanTargetAllMax',
    // // 'iteration_0_cellCountLargerThanTargetAllStd',
    // 'iteration_0_cellCountLargerThanTargetAllSum',
    // //
    // // 'iteration_0_goalVsTotalAllMean',
    // // 'iteration_0_goalVsTotalAllMin',
    // // 'iteration_0_goalVsTotalAllMax',
    // // 'iteration_0_goalVsTotalAllStd',
    // // 'iteration_0_goalVsTotalAllSum',
    // // 
    // 'deductionIterations',
    // // 'unresolvedCellCountAfterDeduction',
    // 'percentUnresolvedCellsAfterDeduction',
    // //
    // "percentUnresolvedCellsAfterDeductionI1",
    // "percentUnresolvedCellsAfterDeductionI2",
    // "percentUnresolvedCellsAfterDeductionI3",
    // "percentUnresolvedCellsAfterDeductionI4",
    // "percentUnresolvedCellsAfterDeductionI5",
    // "percentUnresolvedCellsAfterDeductionI6",
    // //
    // 'gameDateAsPercent',
    // //
    // // 'breaksMinutes',
  ],
};


export interface GamePlayStats {
  timeSpent: number;
  gameNumber: number;
  gameDateAsPercent: number;
  breaksMinutes: number;
}


interface BasicStats {
  mean: number;
  min: number;
  max: number;
  std: number;
  sum: number;
}


export function difficultyReportToGameStat(stats: BoardStats, gamePlayStats: GamePlayStats): GameStatWithBoard & GameStatFeatures & GameStatWithTimeSpent & RawGenericFeatureSet {
  const agg = (xs: number[]): BasicStats => {
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

  const cellCountLargerThanTargetAllAgg = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.cellCountGreaterThanCurrentGoal)));
  const falsePositiveSolutionCountAllAgg = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.iterationFalsePositiveSolutionCount)));
  const guaranteedRequiredCellCountAllAgg = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.iterationGuaranteedRequiredCellCount)));
  const guaranteedUnusableCellCountAllAgg = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.iterationGuaranteedUnusableCellCount)));
  const requiredCellCountVsGoalAllAgg = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.iterationGuaranteedRequiredCellCountVsGoalSum)));
  const unusableCellCountVsGoalAllAgg = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.iterationGuaranteedUnusableCellCountVsGoalSum)));
  const actionableCellAllCountAllAgg = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.iterationGuaranteedRequiredCellCount + s.iterationGuaranteedUnusableCellCount)));

  const goalVsTotalAgg = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.goalSum)));
  const gaolVsTotalAllAgg = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.goalVsTotal)));

  const boardSize = stats.totals.boardSize
  const cellCount = boardSize * boardSize;
  // const maxCellCount = 9 * 9;
  // const minCellCount = 5 * 5;
  // const boardSizeCellCountRatio = (cellCount - minCellCount) / (maxCellCount - minCellCount)
  // const boardSizeRatio = (boardSize - 5) / (9 - 5);
  const boardSizeRatio = (Math.pow(boardSize, 2) - Math.pow(5, 2)) / (Math.pow(9, 2) - Math.pow(5, 2));
  let features: GameStatFeatures = {
    boardSize: boardSizeRatio,

    iteration_0_FalsePositiveSolutionCountAllMean: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[0]).mean,
    iteration_0_FalsePositiveSolutionCountAllMin: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[0]).min / Math.pow(2, boardSize),
    iteration_0_FalsePositiveSolutionCountAllMax: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[0]).max / Math.pow(2, boardSize),
    iteration_0_FalsePositiveSolutionCountAllStd: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[0]).std,
    iteration_0_FalsePositiveSolutionCountAllSum: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[0]).sum / (Math.pow(2, boardSize) * 3),

    iteration_1_FalsePositiveSolutionCountAllMean: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[1]).mean,
    iteration_1_FalsePositiveSolutionCountAllMin: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[1]).min / Math.pow(2, boardSize),
    iteration_1_FalsePositiveSolutionCountAllMax: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[1]).max / Math.pow(2, boardSize),
    iteration_1_FalsePositiveSolutionCountAllStd: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[1]).std,
    iteration_1_FalsePositiveSolutionCountAllSum: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[1]).sum / (Math.pow(2, boardSize) * 3),

    iteration_0_GuaranteedRequiredCellCountMean: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[0]).mean / boardSize,
    iteration_0_GuaranteedRequiredCellCountMin: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[0]).min / boardSize,
    iteration_0_GuaranteedRequiredCellCountMax: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[0]).max / boardSize,
    iteration_0_GuaranteedRequiredCellCountStd: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[0]).std / boardSize,
    iteration_0_GuaranteedRequiredCellCountSum: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[0]).sum / boardSize / 3,

    iteration_1_GuaranteedRequiredCellCountMean: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[1]).mean / boardSize,
    iteration_1_GuaranteedRequiredCellCountMin: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[1]).min / boardSize,
    iteration_1_GuaranteedRequiredCellCountMax: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[1]).max / boardSize,
    iteration_1_GuaranteedRequiredCellCountStd: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[1]).std / boardSize,
    iteration_1_GuaranteedRequiredCellCountSum: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[1]).sum / boardSize / 3,

    iteration_0_GuaranteedUnusableCellCountAllMean: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[0]).mean / boardSize,
    iteration_0_GuaranteedUnusableCellCountAllMin: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[0]).min / boardSize,
    iteration_0_GuaranteedUnusableCellCountAllMax: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[0]).max / boardSize,
    iteration_0_GuaranteedUnusableCellCountAllStd: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[0]).std / boardSize,
    iteration_0_GuaranteedUnusableCellCountAllSum: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[0]).sum / boardSize / 3,

    iteration_1_GuaranteedUnusableCellCountAllMean: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[1]).mean / boardSize,
    iteration_1_GuaranteedUnusableCellCountAllMin: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[1]).min / boardSize,
    iteration_1_GuaranteedUnusableCellCountAllMax: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[1]).max / boardSize,
    iteration_1_GuaranteedUnusableCellCountAllStd: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[1]).std / boardSize,
    iteration_1_GuaranteedUnusableCellCountAllSum: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[1]).sum / boardSize / 3,

    iteration_0_ActionableCellAllCountMean: nullSafeBasicStat(actionableCellAllCountAllAgg[0]).mean / boardSize,
    iteration_0_ActionableCellAllCountMin: nullSafeBasicStat(actionableCellAllCountAllAgg[0]).min / boardSize,
    iteration_0_ActionableCellAllCountMax: nullSafeBasicStat(actionableCellAllCountAllAgg[0]).max / boardSize,
    iteration_0_ActionableCellAllCountStd: nullSafeBasicStat(actionableCellAllCountAllAgg[0]).std / boardSize,
    iteration_0_ActionableCellAllCountSum: nullSafeBasicStat(actionableCellAllCountAllAgg[0]).sum / boardSize / 3,

    iteration_1_ActionableCellAllCountMean: nullSafeBasicStat(actionableCellAllCountAllAgg[1]).mean / boardSize,
    iteration_1_ActionableCellAllCountMin: nullSafeBasicStat(actionableCellAllCountAllAgg[1]).min / boardSize,
    iteration_1_ActionableCellAllCountMax: nullSafeBasicStat(actionableCellAllCountAllAgg[1]).max / boardSize,
    iteration_1_ActionableCellAllCountStd: nullSafeBasicStat(actionableCellAllCountAllAgg[1]).std / boardSize,
    iteration_1_ActionableCellAllCountSum: nullSafeBasicStat(actionableCellAllCountAllAgg[1]).sum / boardSize / 3,

    // TODO: compare to board size
    iteration_0_RequiredCellCountVsGoalAllMean: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[0]).mean,
    iteration_0_RequiredCellCountVsGoalAllMin: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[0]).min,
    iteration_0_RequiredCellCountVsGoalAllMax: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[0]).max,
    iteration_0_RequiredCellCountVsGoalAllStd: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[0]).std,
    iteration_0_RequiredCellCountVsGoalAllSum: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[0]).sum,

    iteration_1_RequiredCellCountVsGoalAllMean: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[1]).mean,
    iteration_1_RequiredCellCountVsGoalAllMin: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[1]).min,
    iteration_1_RequiredCellCountVsGoalAllMax: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[1]).max,
    iteration_1_RequiredCellCountVsGoalAllStd: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[1]).std,
    iteration_1_RequiredCellCountVsGoalAllSum: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[1]).sum,

    iteration_0_UnusableCellCountVsGoalAllMean: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[0]).mean,
    iteration_0_UnusableCellCountVsGoalAllMin: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[0]).min,
    iteration_0_UnusableCellCountVsGoalAllMax: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[0]).max,
    iteration_0_UnusableCellCountVsGoalAllStd: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[0]).std,
    iteration_0_UnusableCellCountVsGoalAllSum: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[0]).sum,

    iteration_1_UnusableCellCountVsGoalAllMean: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[1]).mean,
    iteration_1_UnusableCellCountVsGoalAllMin: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[1]).min,
    iteration_1_UnusableCellCountVsGoalAllMax: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[1]).max,
    iteration_1_UnusableCellCountVsGoalAllStd: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[1]).std,
    iteration_1_UnusableCellCountVsGoalAllSum: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[1]).sum,

    iteration_0_goalVsTotalMean: nullSafeBasicStat(goalVsTotalAgg[0]).mean / boardSize,
    iteration_0_goalVsTotalMin: nullSafeBasicStat(goalVsTotalAgg[0]).min / boardSize,
    iteration_0_goalVsTotalMax: nullSafeBasicStat(goalVsTotalAgg[0]).max / boardSize,
    iteration_0_goalVsTotalStd: nullSafeBasicStat(goalVsTotalAgg[0]).std / boardSize,
    iteration_0_goalVsTotalSum: nullSafeBasicStat(goalVsTotalAgg[0]).sum / boardSize / 3,

    iteration_1_goalVsTotalMean: nullSafeBasicStat(goalVsTotalAgg[1]).mean / boardSize,
    iteration_1_goalVsTotalMin: nullSafeBasicStat(goalVsTotalAgg[1]).min / boardSize,
    iteration_1_goalVsTotalMax: nullSafeBasicStat(goalVsTotalAgg[1]).max / boardSize,
    iteration_1_goalVsTotalStd: nullSafeBasicStat(goalVsTotalAgg[1]).std / boardSize,
    iteration_1_goalVsTotalSum: nullSafeBasicStat(goalVsTotalAgg[1]).sum / boardSize / 3,

    iteration_0_cellCountLargerThanTargetAllMean: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[0]).mean / boardSize,
    iteration_0_cellCountLargerThanTargetAllMin: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[0]).min / boardSize,
    iteration_0_cellCountLargerThanTargetAllMax: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[0]).max / boardSize,
    iteration_0_cellCountLargerThanTargetAllStd: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[0]).std / boardSize,
    iteration_0_cellCountLargerThanTargetAllSum: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[0]).sum / boardSize / 3,

    iteration_1_cellCountLargerThanTargetAllMean: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[1]).mean / boardSize,
    iteration_1_cellCountLargerThanTargetAllMin: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[1]).min / boardSize,
    iteration_1_cellCountLargerThanTargetAllMax: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[1]).max / boardSize,
    iteration_1_cellCountLargerThanTargetAllStd: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[1]).std / boardSize,
    iteration_1_cellCountLargerThanTargetAllSum: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[1]).sum / boardSize / 3,

    iteration_0_goalVsTotalAllMean: nullSafeBasicStat(gaolVsTotalAllAgg[0]).mean,
    iteration_0_goalVsTotalAllMin: nullSafeBasicStat(gaolVsTotalAllAgg[0]).min,
    iteration_0_goalVsTotalAllMax: nullSafeBasicStat(gaolVsTotalAllAgg[0]).max,
    iteration_0_goalVsTotalAllStd: nullSafeBasicStat(gaolVsTotalAllAgg[0]).std,
    iteration_0_goalVsTotalAllSum: nullSafeBasicStat(gaolVsTotalAllAgg[0]).sum,

    iteration_1_goalVsTotalAllMean: nullSafeBasicStat(gaolVsTotalAllAgg[1]).mean,
    iteration_1_goalVsTotalAllMin: nullSafeBasicStat(gaolVsTotalAllAgg[1]).min,
    iteration_1_goalVsTotalAllMax: nullSafeBasicStat(gaolVsTotalAllAgg[1]).max,
    iteration_1_goalVsTotalAllStd: nullSafeBasicStat(gaolVsTotalAllAgg[1]).std,
    iteration_1_goalVsTotalAllSum: nullSafeBasicStat(gaolVsTotalAllAgg[1]).sum,

    deductionIterations: stats.totals.deductionIterations,
    unresolvedCellCountAfterDeduction: stats.totals.unresolvedCellCountAfterDeduction,
    percentUnresolvedCellsAfterDeduction: stats.totals.unresolvedCellCountAfterDeduction / cellCount,

    percentUnresolvedCellsAfterDeductionI1: (stats.totals.unresolvedCountsPerIteration[0] ?? 0) / cellCount,
    percentUnresolvedCellsAfterDeductionI2: (stats.totals.unresolvedCountsPerIteration[1] ?? 0) / cellCount,
    percentUnresolvedCellsAfterDeductionI3: (stats.totals.unresolvedCountsPerIteration[2] ?? 0) / cellCount,
    percentUnresolvedCellsAfterDeductionI4: (stats.totals.unresolvedCountsPerIteration[3] ?? 0) / cellCount,
    percentUnresolvedCellsAfterDeductionI5: (stats.totals.unresolvedCountsPerIteration[4] ?? 0) / cellCount,
    percentUnresolvedCellsAfterDeductionI6: (stats.totals.unresolvedCountsPerIteration[5] ?? 0) / cellCount,

    gameDateAsPercent: gamePlayStats.gameDateAsPercent,

    breaksMinutes: gamePlayStats.breaksMinutes / boardSize,
  };

  let x: GameStatWithBoard = { gameNumber: gamePlayStats.gameNumber }
  let z: GameStatWithTimeSpent = { timeSpent: gamePlayStats.timeSpent }

  return { ...features, ...x, ...z };
}


function nullSafeBasicStat(stats: BasicStats): BasicStats {
  if (stats)
    return stats;

  return {
    max: 0,
    mean: 0,
    min: 0,
    std: 0,
    sum: 0,
  }
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
  iteration_0_FalsePositiveSolutionCountAllMean: number;
  iteration_0_FalsePositiveSolutionCountAllMin: number;
  iteration_0_FalsePositiveSolutionCountAllMax: number;
  iteration_0_FalsePositiveSolutionCountAllStd: number;
  iteration_0_FalsePositiveSolutionCountAllSum: number;
  // 
  iteration_1_FalsePositiveSolutionCountAllMean: number;
  iteration_1_FalsePositiveSolutionCountAllMin: number;
  iteration_1_FalsePositiveSolutionCountAllMax: number;
  iteration_1_FalsePositiveSolutionCountAllStd: number;
  iteration_1_FalsePositiveSolutionCountAllSum: number;
  // 
  iteration_0_GuaranteedRequiredCellCountMean: number;
  iteration_0_GuaranteedRequiredCellCountMin: number;
  iteration_0_GuaranteedRequiredCellCountMax: number;
  iteration_0_GuaranteedRequiredCellCountStd: number;
  iteration_0_GuaranteedRequiredCellCountSum: number;
  // 
  iteration_1_GuaranteedRequiredCellCountMean: number;
  iteration_1_GuaranteedRequiredCellCountMin: number;
  iteration_1_GuaranteedRequiredCellCountMax: number;
  iteration_1_GuaranteedRequiredCellCountStd: number;
  iteration_1_GuaranteedRequiredCellCountSum: number;
  //
  iteration_0_GuaranteedUnusableCellCountAllMean: number;
  iteration_0_GuaranteedUnusableCellCountAllMin: number;
  iteration_0_GuaranteedUnusableCellCountAllMax: number;
  iteration_0_GuaranteedUnusableCellCountAllStd: number;
  iteration_0_GuaranteedUnusableCellCountAllSum: number;
  //
  iteration_1_GuaranteedUnusableCellCountAllMean: number;
  iteration_1_GuaranteedUnusableCellCountAllMin: number;
  iteration_1_GuaranteedUnusableCellCountAllMax: number;
  iteration_1_GuaranteedUnusableCellCountAllStd: number;
  iteration_1_GuaranteedUnusableCellCountAllSum: number;
  //
  iteration_0_ActionableCellAllCountMean: number;
  iteration_0_ActionableCellAllCountMin: number;
  iteration_0_ActionableCellAllCountMax: number;
  iteration_0_ActionableCellAllCountStd: number;
  iteration_0_ActionableCellAllCountSum: number;
  //
  iteration_1_ActionableCellAllCountMean: number;
  iteration_1_ActionableCellAllCountMin: number;
  iteration_1_ActionableCellAllCountMax: number;
  iteration_1_ActionableCellAllCountStd: number;
  iteration_1_ActionableCellAllCountSum: number;
  //
  iteration_0_RequiredCellCountVsGoalAllMean: number;
  iteration_0_RequiredCellCountVsGoalAllMin: number;
  iteration_0_RequiredCellCountVsGoalAllMax: number;
  iteration_0_RequiredCellCountVsGoalAllStd: number;
  iteration_0_RequiredCellCountVsGoalAllSum: number;
  //
  iteration_1_RequiredCellCountVsGoalAllMean: number;
  iteration_1_RequiredCellCountVsGoalAllMin: number;
  iteration_1_RequiredCellCountVsGoalAllMax: number;
  iteration_1_RequiredCellCountVsGoalAllStd: number;
  iteration_1_RequiredCellCountVsGoalAllSum: number;
  //
  iteration_0_UnusableCellCountVsGoalAllMean: number;
  iteration_0_UnusableCellCountVsGoalAllMin: number;
  iteration_0_UnusableCellCountVsGoalAllMax: number;
  iteration_0_UnusableCellCountVsGoalAllStd: number;
  iteration_0_UnusableCellCountVsGoalAllSum: number;
  //
  iteration_1_UnusableCellCountVsGoalAllMean: number;
  iteration_1_UnusableCellCountVsGoalAllMin: number;
  iteration_1_UnusableCellCountVsGoalAllMax: number;
  iteration_1_UnusableCellCountVsGoalAllStd: number;
  iteration_1_UnusableCellCountVsGoalAllSum: number;
  //
  iteration_0_goalVsTotalMean: number;
  iteration_0_goalVsTotalMin: number;
  iteration_0_goalVsTotalMax: number;
  iteration_0_goalVsTotalStd: number;
  iteration_0_goalVsTotalSum: number;
  //
  iteration_1_goalVsTotalMean: number;
  iteration_1_goalVsTotalMin: number;
  iteration_1_goalVsTotalMax: number;
  iteration_1_goalVsTotalStd: number;
  iteration_1_goalVsTotalSum: number;
  //
  iteration_0_cellCountLargerThanTargetAllMean: number;
  iteration_0_cellCountLargerThanTargetAllMin: number;
  iteration_0_cellCountLargerThanTargetAllMax: number;
  iteration_0_cellCountLargerThanTargetAllStd: number;
  iteration_0_cellCountLargerThanTargetAllSum: number;
  //
  iteration_1_cellCountLargerThanTargetAllMean: number;
  iteration_1_cellCountLargerThanTargetAllMin: number;
  iteration_1_cellCountLargerThanTargetAllMax: number;
  iteration_1_cellCountLargerThanTargetAllStd: number;
  iteration_1_cellCountLargerThanTargetAllSum: number;
  //
  iteration_0_goalVsTotalAllMean: number;
  iteration_0_goalVsTotalAllMin: number;
  iteration_0_goalVsTotalAllMax: number;
  iteration_0_goalVsTotalAllStd: number;
  iteration_0_goalVsTotalAllSum: number;
  //
  iteration_1_goalVsTotalAllMean: number;
  iteration_1_goalVsTotalAllMin: number;
  iteration_1_goalVsTotalAllMax: number;
  iteration_1_goalVsTotalAllStd: number;
  iteration_1_goalVsTotalAllSum: number;
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
  percentUnresolvedCellsAfterDeductionI6: number;
  //
  gameDateAsPercent: number;
  //
  breaksMinutes: number;
}
