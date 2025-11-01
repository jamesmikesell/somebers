import { FeatureSpec } from "../model/ml-types";
import { BoardStats } from "./board-stat-analyzer";
import { RawGenericFeatureSet } from "./ml-core";





export const FEATURE_SPEC: FeatureSpec = {
  keys: [

    "boardSize",
    "gameDateAsPercent",
    "percentUnresolvedCellsAfterDeduction",
    "percentUnresolvedCellsAfterDeductionI1",
    "percentUnresolvedCellsAfterDeductionI3",
    "percentUnresolvedCellsAfterDeductionI4",
    "percentUnresolvedCellsAfterDeductionI5",
    "percentUnresolvedCellsAfterDeductionI6",
    "iteration_0_guaranteedUnusableCellCountAllMean",
    "iteration_0_goalVsTotalMin",
    "iteration_0_unusableCellCountVsGoalAllMax",
    "iteration_0_actionableCellAllCountStd",
    "iteration_0_goalVsTotalSum",
    "iteration_4_falsePositiveSolutionCountAllStd",
    "iteration_1_cellCountLargerThanTargetAllSum",
    "iteration_0_goalVsTotalStd",
    "iteration_1_falsePositiveSolutionCountAllMin",
    "iteration_1_goalVsTotalStd",
    "iteration_4_falsePositiveSolutionCountAllMax",
    "iteration_4_unusableCellCountVsGoalAllSum",
    "iteration_1_guaranteedRequiredCellCountStd",
    "iteration_2_goalVsTotalAllMax",
    "iteration_1_cellCountLargerThanTargetAllMean",
    "iteration_0_guaranteedRequiredCellCountMax",
    "iteration_0_actionableCellAllCountMin",
    "iteration_3_falsePositiveSolutionCountAllMean",
    "iteration_1_goalVsTotalMax",
    "iteration_1_unusableCellCountVsGoalAllMean",
    "iteration_1_guaranteedRequiredCellCountMax",
    "iteration_2_guaranteedUnusableCellCountAllMean",
    "iteration_2_unusableCellCountVsGoalAllMean",
    "iteration_0_guaranteedUnusableCellCountAllMax",
    "iteration_1_goalVsTotalAllStd",
    "iteration_1_guaranteedRequiredCellCountSum",
    "iteration_0_guaranteedRequiredCellCountSum",
    "iteration_0_goalVsTotalAllSum",
    "iteration_1_guaranteedUnusableCellCountAllSum",
    "iteration_2_falsePositiveSolutionCountAllMax",
    "iteration_5_actionableCellAllCountMax",
    "iteration_0_goalVsTotalMean",
    "iteration_0_goalVsTotalAllMean",


    // 'boardSize',
    // // 'iteration_0_falsePositiveSolutionCountAllMean',
    // 'iteration_0_falsePositiveSolutionCountAllMin',
    // // 'iteration_0_falsePositiveSolutionCountAllMax',
    // // 'iteration_0_falsePositiveSolutionCountAllStd',
    // // 'iteration_0_falsePositiveSolutionCountAllSum',
    // // 
    // // 'iteration_0_guaranteedRequiredCellCountMean',
    // // 'iteration_0_guaranteedRequiredCellCountMin',
    // 'iteration_0_guaranteedRequiredCellCountMax',
    // 'iteration_0_guaranteedRequiredCellCountStd',
    // 'iteration_0_guaranteedRequiredCellCountSum',
    // // 
    // // 'iteration_0_guaranteedUnusableCellCountAllMean',
    // // 'iteration_0_guaranteedUnusableCellCountAllMin',
    // 'iteration_0_guaranteedUnusableCellCountAllMax',
    // 'iteration_0_guaranteedUnusableCellCountAllStd',
    // 'iteration_0_guaranteedUnusableCellCountAllSum',
    // //
    // 'iteration_0_requiredCellCountVsGoalAllMean',
    // // 'iteration_0_requiredCellCountVsGoalAllMin',
    // // 'iteration_0_requiredCellCountVsGoalAllMax',
    // 'iteration_0_requiredCellCountVsGoalAllStd',
    // // 'iteration_0_requiredCellCountVsGoalAllSum',
    // //
    // 'iteration_0_unusableCellCountVsGoalAllMean',
    // // 'iteration_0_unusableCellCountVsGoalAllMin',
    // // 'iteration_0_unusableCellCountVsGoalAllMax',
    // 'iteration_0_unusableCellCountVsGoalAllStd',
    // 'iteration_0_unusableCellCountVsGoalAllSum',
    // //
    // // 'iteration_0_actionableCellAllCountMean',
    // // 'iteration_0_actionableCellAllCountMin', // for all row/col/grp what is the min number of cells where an guaranteed action can be performed.. on many boards there tends to be at one row/col/grp where nothing can be done
    // 'iteration_0_actionableCellAllCountMax',
    // 'iteration_0_actionableCellAllCountStd',
    // 'iteration_0_actionableCellAllCountSum',
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

  const cellCountLargerThanTarget = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.cellCountGreaterThanGoal)));
  const falsePositiveSolutionCount = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.falsePositiveSolutionCount)));
  const guaranteedRequiredCellCount = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.guaranteedRequiredCellCount)));
  const guaranteedUnusableCellCount = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.guaranteedUnusableCellCount)));
  const requiredCellCountVsGoal = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.guaranteedRequiredCellCountVsGoal)));
  const unusableCellCountVsGoal = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.guaranteedUnusableCellCountVsGoal)));
  const actionableCellCount = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.actionableCellsCount)));
  const unactionableCellCount = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.unactionableCellsCount)));

  const goal = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.goalSum)));
  const gaolVsUnselectedSum = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.goalVsUnselectedSum)));

  const boardSize = stats.totals.boardSize
  const cellCount = boardSize * boardSize;
  // const maxCellCount = 9 * 9;
  // const minCellCount = 5 * 5;
  // const boardSizeCellCountRatio = (cellCount - minCellCount) / (maxCellCount - minCellCount)
  // const boardSizeRatio = (boardSize - 5) / (9 - 5);
  const boardSizeRatio = (Math.pow(boardSize, 2) - Math.pow(5, 2)) / (Math.pow(9, 2) - Math.pow(5, 2));
  let features: GameStatFeatures = {
    boardSize: boardSizeRatio,

    iteration_0_falsePositiveSolutionCountAllMean: nullSafeBasicStat(falsePositiveSolutionCount[0]).mean,
    iteration_0_falsePositiveSolutionCountAllMin: nullSafeBasicStat(falsePositiveSolutionCount[0]).min / Math.pow(2, boardSize),
    iteration_0_falsePositiveSolutionCountAllMax: nullSafeBasicStat(falsePositiveSolutionCount[0]).max / Math.pow(2, boardSize),
    iteration_0_falsePositiveSolutionCountAllStd: nullSafeBasicStat(falsePositiveSolutionCount[0]).std,
    iteration_0_falsePositiveSolutionCountAllSum: nullSafeBasicStat(falsePositiveSolutionCount[0]).sum / (Math.pow(2, boardSize) * 3),

    iteration_1_falsePositiveSolutionCountAllMean: nullSafeBasicStat(falsePositiveSolutionCount[1]).mean,
    iteration_1_falsePositiveSolutionCountAllMin: nullSafeBasicStat(falsePositiveSolutionCount[1]).min / Math.pow(2, boardSize),
    iteration_1_falsePositiveSolutionCountAllMax: nullSafeBasicStat(falsePositiveSolutionCount[1]).max / Math.pow(2, boardSize),
    iteration_1_falsePositiveSolutionCountAllStd: nullSafeBasicStat(falsePositiveSolutionCount[1]).std,
    iteration_1_falsePositiveSolutionCountAllSum: nullSafeBasicStat(falsePositiveSolutionCount[1]).sum / (Math.pow(2, boardSize) * 3),

    iteration_2_falsePositiveSolutionCountAllMean: nullSafeBasicStat(falsePositiveSolutionCount[2]).mean,
    iteration_2_falsePositiveSolutionCountAllMin: nullSafeBasicStat(falsePositiveSolutionCount[2]).min / Math.pow(2, boardSize),
    iteration_2_falsePositiveSolutionCountAllMax: nullSafeBasicStat(falsePositiveSolutionCount[2]).max / Math.pow(2, boardSize),
    iteration_2_falsePositiveSolutionCountAllStd: nullSafeBasicStat(falsePositiveSolutionCount[2]).std,
    iteration_2_falsePositiveSolutionCountAllSum: nullSafeBasicStat(falsePositiveSolutionCount[2]).sum / (Math.pow(2, boardSize) * 3),

    iteration_3_falsePositiveSolutionCountAllMean: nullSafeBasicStat(falsePositiveSolutionCount[3]).mean,
    iteration_3_falsePositiveSolutionCountAllMin: nullSafeBasicStat(falsePositiveSolutionCount[3]).min / Math.pow(2, boardSize),
    iteration_3_falsePositiveSolutionCountAllMax: nullSafeBasicStat(falsePositiveSolutionCount[3]).max / Math.pow(2, boardSize),
    iteration_3_falsePositiveSolutionCountAllStd: nullSafeBasicStat(falsePositiveSolutionCount[3]).std,
    iteration_3_falsePositiveSolutionCountAllSum: nullSafeBasicStat(falsePositiveSolutionCount[3]).sum / (Math.pow(2, boardSize) * 3),

    iteration_4_falsePositiveSolutionCountAllMean: nullSafeBasicStat(falsePositiveSolutionCount[4]).mean,
    iteration_4_falsePositiveSolutionCountAllMin: nullSafeBasicStat(falsePositiveSolutionCount[4]).min / Math.pow(2, boardSize),
    iteration_4_falsePositiveSolutionCountAllMax: nullSafeBasicStat(falsePositiveSolutionCount[4]).max / Math.pow(2, boardSize),
    iteration_4_falsePositiveSolutionCountAllStd: nullSafeBasicStat(falsePositiveSolutionCount[4]).std,
    iteration_4_falsePositiveSolutionCountAllSum: nullSafeBasicStat(falsePositiveSolutionCount[4]).sum / (Math.pow(2, boardSize) * 3),

    iteration_5_falsePositiveSolutionCountAllMean: nullSafeBasicStat(falsePositiveSolutionCount[5]).mean,
    iteration_5_falsePositiveSolutionCountAllMin: nullSafeBasicStat(falsePositiveSolutionCount[5]).min / Math.pow(2, boardSize),
    iteration_5_falsePositiveSolutionCountAllMax: nullSafeBasicStat(falsePositiveSolutionCount[5]).max / Math.pow(2, boardSize),
    iteration_5_falsePositiveSolutionCountAllStd: nullSafeBasicStat(falsePositiveSolutionCount[5]).std,
    iteration_5_falsePositiveSolutionCountAllSum: nullSafeBasicStat(falsePositiveSolutionCount[5]).sum / (Math.pow(2, boardSize) * 3),




    iteration_0_guaranteedRequiredCellCountMean: nullSafeBasicStat(guaranteedRequiredCellCount[0]).mean / boardSize,
    iteration_0_guaranteedRequiredCellCountMin: nullSafeBasicStat(guaranteedRequiredCellCount[0]).min / boardSize,
    iteration_0_guaranteedRequiredCellCountMax: nullSafeBasicStat(guaranteedRequiredCellCount[0]).max / boardSize,
    iteration_0_guaranteedRequiredCellCountStd: nullSafeBasicStat(guaranteedRequiredCellCount[0]).std / boardSize,
    iteration_0_guaranteedRequiredCellCountSum: nullSafeBasicStat(guaranteedRequiredCellCount[0]).sum / boardSize / 3,

    iteration_1_guaranteedRequiredCellCountMean: nullSafeBasicStat(guaranteedRequiredCellCount[1]).mean / boardSize,
    iteration_1_guaranteedRequiredCellCountMin: nullSafeBasicStat(guaranteedRequiredCellCount[1]).min / boardSize,
    iteration_1_guaranteedRequiredCellCountMax: nullSafeBasicStat(guaranteedRequiredCellCount[1]).max / boardSize,
    iteration_1_guaranteedRequiredCellCountStd: nullSafeBasicStat(guaranteedRequiredCellCount[1]).std / boardSize,
    iteration_1_guaranteedRequiredCellCountSum: nullSafeBasicStat(guaranteedRequiredCellCount[1]).sum / boardSize / 3,

    iteration_2_guaranteedRequiredCellCountMean: nullSafeBasicStat(guaranteedRequiredCellCount[2]).mean / boardSize,
    iteration_2_guaranteedRequiredCellCountMin: nullSafeBasicStat(guaranteedRequiredCellCount[2]).min / boardSize,
    iteration_2_guaranteedRequiredCellCountMax: nullSafeBasicStat(guaranteedRequiredCellCount[2]).max / boardSize,
    iteration_2_guaranteedRequiredCellCountStd: nullSafeBasicStat(guaranteedRequiredCellCount[2]).std / boardSize,
    iteration_2_guaranteedRequiredCellCountSum: nullSafeBasicStat(guaranteedRequiredCellCount[2]).sum / boardSize / 3,

    iteration_3_guaranteedRequiredCellCountMean: nullSafeBasicStat(guaranteedRequiredCellCount[3]).mean / boardSize,
    iteration_3_guaranteedRequiredCellCountMin: nullSafeBasicStat(guaranteedRequiredCellCount[3]).min / boardSize,
    iteration_3_guaranteedRequiredCellCountMax: nullSafeBasicStat(guaranteedRequiredCellCount[3]).max / boardSize,
    iteration_3_guaranteedRequiredCellCountStd: nullSafeBasicStat(guaranteedRequiredCellCount[3]).std / boardSize,
    iteration_3_guaranteedRequiredCellCountSum: nullSafeBasicStat(guaranteedRequiredCellCount[3]).sum / boardSize / 3,

    iteration_4_guaranteedRequiredCellCountMean: nullSafeBasicStat(guaranteedRequiredCellCount[4]).mean / boardSize,
    iteration_4_guaranteedRequiredCellCountMin: nullSafeBasicStat(guaranteedRequiredCellCount[4]).min / boardSize,
    iteration_4_guaranteedRequiredCellCountMax: nullSafeBasicStat(guaranteedRequiredCellCount[4]).max / boardSize,
    iteration_4_guaranteedRequiredCellCountStd: nullSafeBasicStat(guaranteedRequiredCellCount[4]).std / boardSize,
    iteration_4_guaranteedRequiredCellCountSum: nullSafeBasicStat(guaranteedRequiredCellCount[4]).sum / boardSize / 3,

    iteration_5_guaranteedRequiredCellCountMean: nullSafeBasicStat(guaranteedRequiredCellCount[5]).mean / boardSize,
    iteration_5_guaranteedRequiredCellCountMin: nullSafeBasicStat(guaranteedRequiredCellCount[5]).min / boardSize,
    iteration_5_guaranteedRequiredCellCountMax: nullSafeBasicStat(guaranteedRequiredCellCount[5]).max / boardSize,
    iteration_5_guaranteedRequiredCellCountStd: nullSafeBasicStat(guaranteedRequiredCellCount[5]).std / boardSize,
    iteration_5_guaranteedRequiredCellCountSum: nullSafeBasicStat(guaranteedRequiredCellCount[5]).sum / boardSize / 3,





    iteration_0_guaranteedUnusableCellCountAllMean: nullSafeBasicStat(guaranteedUnusableCellCount[0]).mean / boardSize,
    iteration_0_guaranteedUnusableCellCountAllMin: nullSafeBasicStat(guaranteedUnusableCellCount[0]).min / boardSize,
    iteration_0_guaranteedUnusableCellCountAllMax: nullSafeBasicStat(guaranteedUnusableCellCount[0]).max / boardSize,
    iteration_0_guaranteedUnusableCellCountAllStd: nullSafeBasicStat(guaranteedUnusableCellCount[0]).std / boardSize,
    iteration_0_guaranteedUnusableCellCountAllSum: nullSafeBasicStat(guaranteedUnusableCellCount[0]).sum / boardSize / 3,

    iteration_1_guaranteedUnusableCellCountAllMean: nullSafeBasicStat(guaranteedUnusableCellCount[1]).mean / boardSize,
    iteration_1_guaranteedUnusableCellCountAllMin: nullSafeBasicStat(guaranteedUnusableCellCount[1]).min / boardSize,
    iteration_1_guaranteedUnusableCellCountAllMax: nullSafeBasicStat(guaranteedUnusableCellCount[1]).max / boardSize,
    iteration_1_guaranteedUnusableCellCountAllStd: nullSafeBasicStat(guaranteedUnusableCellCount[1]).std / boardSize,
    iteration_1_guaranteedUnusableCellCountAllSum: nullSafeBasicStat(guaranteedUnusableCellCount[1]).sum / boardSize / 3,

    iteration_2_guaranteedUnusableCellCountAllMean: nullSafeBasicStat(guaranteedUnusableCellCount[2]).mean / boardSize,
    iteration_2_guaranteedUnusableCellCountAllMin: nullSafeBasicStat(guaranteedUnusableCellCount[2]).min / boardSize,
    iteration_2_guaranteedUnusableCellCountAllMax: nullSafeBasicStat(guaranteedUnusableCellCount[2]).max / boardSize,
    iteration_2_guaranteedUnusableCellCountAllStd: nullSafeBasicStat(guaranteedUnusableCellCount[2]).std / boardSize,
    iteration_2_guaranteedUnusableCellCountAllSum: nullSafeBasicStat(guaranteedUnusableCellCount[2]).sum / boardSize / 3,

    iteration_3_guaranteedUnusableCellCountAllMean: nullSafeBasicStat(guaranteedUnusableCellCount[3]).mean / boardSize,
    iteration_3_guaranteedUnusableCellCountAllMin: nullSafeBasicStat(guaranteedUnusableCellCount[3]).min / boardSize,
    iteration_3_guaranteedUnusableCellCountAllMax: nullSafeBasicStat(guaranteedUnusableCellCount[3]).max / boardSize,
    iteration_3_guaranteedUnusableCellCountAllStd: nullSafeBasicStat(guaranteedUnusableCellCount[3]).std / boardSize,
    iteration_3_guaranteedUnusableCellCountAllSum: nullSafeBasicStat(guaranteedUnusableCellCount[3]).sum / boardSize / 3,

    iteration_4_guaranteedUnusableCellCountAllMean: nullSafeBasicStat(guaranteedUnusableCellCount[4]).mean / boardSize,
    iteration_4_guaranteedUnusableCellCountAllMin: nullSafeBasicStat(guaranteedUnusableCellCount[4]).min / boardSize,
    iteration_4_guaranteedUnusableCellCountAllMax: nullSafeBasicStat(guaranteedUnusableCellCount[4]).max / boardSize,
    iteration_4_guaranteedUnusableCellCountAllStd: nullSafeBasicStat(guaranteedUnusableCellCount[4]).std / boardSize,
    iteration_4_guaranteedUnusableCellCountAllSum: nullSafeBasicStat(guaranteedUnusableCellCount[4]).sum / boardSize / 3,

    iteration_5_guaranteedUnusableCellCountAllMean: nullSafeBasicStat(guaranteedUnusableCellCount[5]).mean / boardSize,
    iteration_5_guaranteedUnusableCellCountAllMin: nullSafeBasicStat(guaranteedUnusableCellCount[5]).min / boardSize,
    iteration_5_guaranteedUnusableCellCountAllMax: nullSafeBasicStat(guaranteedUnusableCellCount[5]).max / boardSize,
    iteration_5_guaranteedUnusableCellCountAllStd: nullSafeBasicStat(guaranteedUnusableCellCount[5]).std / boardSize,
    iteration_5_guaranteedUnusableCellCountAllSum: nullSafeBasicStat(guaranteedUnusableCellCount[5]).sum / boardSize / 3,






    iteration_0_actionableCellAllCountMean: nullSafeBasicStat(actionableCellCount[0]).mean / boardSize,
    iteration_0_actionableCellAllCountMin: nullSafeBasicStat(actionableCellCount[0]).min / boardSize,
    iteration_0_actionableCellAllCountMax: nullSafeBasicStat(actionableCellCount[0]).max / boardSize,
    iteration_0_actionableCellAllCountStd: nullSafeBasicStat(actionableCellCount[0]).std / boardSize,
    iteration_0_actionableCellAllCountSum: nullSafeBasicStat(actionableCellCount[0]).sum / boardSize / 3,

    iteration_1_actionableCellAllCountMean: nullSafeBasicStat(actionableCellCount[1]).mean / boardSize,
    iteration_1_actionableCellAllCountMin: nullSafeBasicStat(actionableCellCount[1]).min / boardSize,
    iteration_1_actionableCellAllCountMax: nullSafeBasicStat(actionableCellCount[1]).max / boardSize,
    iteration_1_actionableCellAllCountStd: nullSafeBasicStat(actionableCellCount[1]).std / boardSize,
    iteration_1_actionableCellAllCountSum: nullSafeBasicStat(actionableCellCount[1]).sum / boardSize / 3,

    iteration_2_actionableCellAllCountMean: nullSafeBasicStat(actionableCellCount[2]).mean / boardSize,
    iteration_2_actionableCellAllCountMin: nullSafeBasicStat(actionableCellCount[2]).min / boardSize,
    iteration_2_actionableCellAllCountMax: nullSafeBasicStat(actionableCellCount[2]).max / boardSize,
    iteration_2_actionableCellAllCountStd: nullSafeBasicStat(actionableCellCount[2]).std / boardSize,
    iteration_2_actionableCellAllCountSum: nullSafeBasicStat(actionableCellCount[2]).sum / boardSize / 3,

    iteration_3_actionableCellAllCountMean: nullSafeBasicStat(actionableCellCount[3]).mean / boardSize,
    iteration_3_actionableCellAllCountMin: nullSafeBasicStat(actionableCellCount[3]).min / boardSize,
    iteration_3_actionableCellAllCountMax: nullSafeBasicStat(actionableCellCount[3]).max / boardSize,
    iteration_3_actionableCellAllCountStd: nullSafeBasicStat(actionableCellCount[3]).std / boardSize,
    iteration_3_actionableCellAllCountSum: nullSafeBasicStat(actionableCellCount[3]).sum / boardSize / 3,

    iteration_4_actionableCellAllCountMean: nullSafeBasicStat(actionableCellCount[4]).mean / boardSize,
    iteration_4_actionableCellAllCountMin: nullSafeBasicStat(actionableCellCount[4]).min / boardSize,
    iteration_4_actionableCellAllCountMax: nullSafeBasicStat(actionableCellCount[4]).max / boardSize,
    iteration_4_actionableCellAllCountStd: nullSafeBasicStat(actionableCellCount[4]).std / boardSize,
    iteration_4_actionableCellAllCountSum: nullSafeBasicStat(actionableCellCount[4]).sum / boardSize / 3,

    iteration_5_actionableCellAllCountMean: nullSafeBasicStat(actionableCellCount[5]).mean / boardSize,
    iteration_5_actionableCellAllCountMin: nullSafeBasicStat(actionableCellCount[5]).min / boardSize,
    iteration_5_actionableCellAllCountMax: nullSafeBasicStat(actionableCellCount[5]).max / boardSize,
    iteration_5_actionableCellAllCountStd: nullSafeBasicStat(actionableCellCount[5]).std / boardSize,
    iteration_5_actionableCellAllCountSum: nullSafeBasicStat(actionableCellCount[5]).sum / boardSize / 3,





    iteration_0_unactionableCellAllCountMean: nullSafeBasicStat(unactionableCellCount[0]).mean / boardSize,
    iteration_0_unactionableCellAllCountMin: nullSafeBasicStat(unactionableCellCount[0]).min / boardSize,
    iteration_0_unactionableCellAllCountMax: nullSafeBasicStat(unactionableCellCount[0]).max / boardSize,
    iteration_0_unactionableCellAllCountStd: nullSafeBasicStat(unactionableCellCount[0]).std / boardSize,
    iteration_0_unactionableCellAllCountSum: nullSafeBasicStat(unactionableCellCount[0]).sum / boardSize / 3,

    iteration_1_unactionableCellAllCountMean: nullSafeBasicStat(unactionableCellCount[1]).mean / boardSize,
    iteration_1_unactionableCellAllCountMin: nullSafeBasicStat(unactionableCellCount[1]).min / boardSize,
    iteration_1_unactionableCellAllCountMax: nullSafeBasicStat(unactionableCellCount[1]).max / boardSize,
    iteration_1_unactionableCellAllCountStd: nullSafeBasicStat(unactionableCellCount[1]).std / boardSize,
    iteration_1_unactionableCellAllCountSum: nullSafeBasicStat(unactionableCellCount[1]).sum / boardSize / 3,

    iteration_2_unactionableCellAllCountMean: nullSafeBasicStat(unactionableCellCount[2]).mean / boardSize,
    iteration_2_unactionableCellAllCountMin: nullSafeBasicStat(unactionableCellCount[2]).min / boardSize,
    iteration_2_unactionableCellAllCountMax: nullSafeBasicStat(unactionableCellCount[2]).max / boardSize,
    iteration_2_unactionableCellAllCountStd: nullSafeBasicStat(unactionableCellCount[2]).std / boardSize,
    iteration_2_unactionableCellAllCountSum: nullSafeBasicStat(unactionableCellCount[2]).sum / boardSize / 3,

    iteration_3_unactionableCellAllCountMean: nullSafeBasicStat(unactionableCellCount[3]).mean / boardSize,
    iteration_3_unactionableCellAllCountMin: nullSafeBasicStat(unactionableCellCount[3]).min / boardSize,
    iteration_3_unactionableCellAllCountMax: nullSafeBasicStat(unactionableCellCount[3]).max / boardSize,
    iteration_3_unactionableCellAllCountStd: nullSafeBasicStat(unactionableCellCount[3]).std / boardSize,
    iteration_3_unactionableCellAllCountSum: nullSafeBasicStat(unactionableCellCount[3]).sum / boardSize / 3,

    iteration_4_unactionableCellAllCountMean: nullSafeBasicStat(unactionableCellCount[4]).mean / boardSize,
    iteration_4_unactionableCellAllCountMin: nullSafeBasicStat(unactionableCellCount[4]).min / boardSize,
    iteration_4_unactionableCellAllCountMax: nullSafeBasicStat(unactionableCellCount[4]).max / boardSize,
    iteration_4_unactionableCellAllCountStd: nullSafeBasicStat(unactionableCellCount[4]).std / boardSize,
    iteration_4_unactionableCellAllCountSum: nullSafeBasicStat(unactionableCellCount[4]).sum / boardSize / 3,

    iteration_5_unactionableCellAllCountMean: nullSafeBasicStat(unactionableCellCount[5]).mean / boardSize,
    iteration_5_unactionableCellAllCountMin: nullSafeBasicStat(unactionableCellCount[5]).min / boardSize,
    iteration_5_unactionableCellAllCountMax: nullSafeBasicStat(unactionableCellCount[5]).max / boardSize,
    iteration_5_unactionableCellAllCountStd: nullSafeBasicStat(unactionableCellCount[5]).std / boardSize,
    iteration_5_unactionableCellAllCountSum: nullSafeBasicStat(unactionableCellCount[5]).sum / boardSize / 3,





    // TODO: compare to board size
    iteration_0_requiredCellCountVsGoalAllMean: nullSafeBasicStat(requiredCellCountVsGoal[0]).mean,
    iteration_0_requiredCellCountVsGoalAllMin: nullSafeBasicStat(requiredCellCountVsGoal[0]).min,
    iteration_0_requiredCellCountVsGoalAllMax: nullSafeBasicStat(requiredCellCountVsGoal[0]).max,
    iteration_0_requiredCellCountVsGoalAllStd: nullSafeBasicStat(requiredCellCountVsGoal[0]).std,
    iteration_0_requiredCellCountVsGoalAllSum: nullSafeBasicStat(requiredCellCountVsGoal[0]).sum,

    iteration_1_requiredCellCountVsGoalAllMean: nullSafeBasicStat(requiredCellCountVsGoal[1]).mean,
    iteration_1_requiredCellCountVsGoalAllMin: nullSafeBasicStat(requiredCellCountVsGoal[1]).min,
    iteration_1_requiredCellCountVsGoalAllMax: nullSafeBasicStat(requiredCellCountVsGoal[1]).max,
    iteration_1_requiredCellCountVsGoalAllStd: nullSafeBasicStat(requiredCellCountVsGoal[1]).std,
    iteration_1_requiredCellCountVsGoalAllSum: nullSafeBasicStat(requiredCellCountVsGoal[1]).sum,

    iteration_2_requiredCellCountVsGoalAllMean: nullSafeBasicStat(requiredCellCountVsGoal[2]).mean,
    iteration_2_requiredCellCountVsGoalAllMin: nullSafeBasicStat(requiredCellCountVsGoal[2]).min,
    iteration_2_requiredCellCountVsGoalAllMax: nullSafeBasicStat(requiredCellCountVsGoal[2]).max,
    iteration_2_requiredCellCountVsGoalAllStd: nullSafeBasicStat(requiredCellCountVsGoal[2]).std,
    iteration_2_requiredCellCountVsGoalAllSum: nullSafeBasicStat(requiredCellCountVsGoal[2]).sum,

    iteration_3_requiredCellCountVsGoalAllMean: nullSafeBasicStat(requiredCellCountVsGoal[3]).mean,
    iteration_3_requiredCellCountVsGoalAllMin: nullSafeBasicStat(requiredCellCountVsGoal[3]).min,
    iteration_3_requiredCellCountVsGoalAllMax: nullSafeBasicStat(requiredCellCountVsGoal[3]).max,
    iteration_3_requiredCellCountVsGoalAllStd: nullSafeBasicStat(requiredCellCountVsGoal[3]).std,
    iteration_3_requiredCellCountVsGoalAllSum: nullSafeBasicStat(requiredCellCountVsGoal[3]).sum,

    iteration_4_requiredCellCountVsGoalAllMean: nullSafeBasicStat(requiredCellCountVsGoal[4]).mean,
    iteration_4_requiredCellCountVsGoalAllMin: nullSafeBasicStat(requiredCellCountVsGoal[4]).min,
    iteration_4_requiredCellCountVsGoalAllMax: nullSafeBasicStat(requiredCellCountVsGoal[4]).max,
    iteration_4_requiredCellCountVsGoalAllStd: nullSafeBasicStat(requiredCellCountVsGoal[4]).std,
    iteration_4_requiredCellCountVsGoalAllSum: nullSafeBasicStat(requiredCellCountVsGoal[4]).sum,

    iteration_5_requiredCellCountVsGoalAllMean: nullSafeBasicStat(requiredCellCountVsGoal[5]).mean,
    iteration_5_requiredCellCountVsGoalAllMin: nullSafeBasicStat(requiredCellCountVsGoal[5]).min,
    iteration_5_requiredCellCountVsGoalAllMax: nullSafeBasicStat(requiredCellCountVsGoal[5]).max,
    iteration_5_requiredCellCountVsGoalAllStd: nullSafeBasicStat(requiredCellCountVsGoal[5]).std,
    iteration_5_requiredCellCountVsGoalAllSum: nullSafeBasicStat(requiredCellCountVsGoal[5]).sum,





    iteration_0_unusableCellCountVsGoalAllMean: nullSafeBasicStat(unusableCellCountVsGoal[0]).mean,
    iteration_0_unusableCellCountVsGoalAllMin: nullSafeBasicStat(unusableCellCountVsGoal[0]).min,
    iteration_0_unusableCellCountVsGoalAllMax: nullSafeBasicStat(unusableCellCountVsGoal[0]).max,
    iteration_0_unusableCellCountVsGoalAllStd: nullSafeBasicStat(unusableCellCountVsGoal[0]).std,
    iteration_0_unusableCellCountVsGoalAllSum: nullSafeBasicStat(unusableCellCountVsGoal[0]).sum,

    iteration_1_unusableCellCountVsGoalAllMean: nullSafeBasicStat(unusableCellCountVsGoal[1]).mean,
    iteration_1_unusableCellCountVsGoalAllMin: nullSafeBasicStat(unusableCellCountVsGoal[1]).min,
    iteration_1_unusableCellCountVsGoalAllMax: nullSafeBasicStat(unusableCellCountVsGoal[1]).max,
    iteration_1_unusableCellCountVsGoalAllStd: nullSafeBasicStat(unusableCellCountVsGoal[1]).std,
    iteration_1_unusableCellCountVsGoalAllSum: nullSafeBasicStat(unusableCellCountVsGoal[1]).sum,

    iteration_2_unusableCellCountVsGoalAllMean: nullSafeBasicStat(unusableCellCountVsGoal[2]).mean,
    iteration_2_unusableCellCountVsGoalAllMin: nullSafeBasicStat(unusableCellCountVsGoal[2]).min,
    iteration_2_unusableCellCountVsGoalAllMax: nullSafeBasicStat(unusableCellCountVsGoal[2]).max,
    iteration_2_unusableCellCountVsGoalAllStd: nullSafeBasicStat(unusableCellCountVsGoal[2]).std,
    iteration_2_unusableCellCountVsGoalAllSum: nullSafeBasicStat(unusableCellCountVsGoal[2]).sum,

    iteration_3_unusableCellCountVsGoalAllMean: nullSafeBasicStat(unusableCellCountVsGoal[3]).mean,
    iteration_3_unusableCellCountVsGoalAllMin: nullSafeBasicStat(unusableCellCountVsGoal[3]).min,
    iteration_3_unusableCellCountVsGoalAllMax: nullSafeBasicStat(unusableCellCountVsGoal[3]).max,
    iteration_3_unusableCellCountVsGoalAllStd: nullSafeBasicStat(unusableCellCountVsGoal[3]).std,
    iteration_3_unusableCellCountVsGoalAllSum: nullSafeBasicStat(unusableCellCountVsGoal[3]).sum,

    iteration_4_unusableCellCountVsGoalAllMean: nullSafeBasicStat(unusableCellCountVsGoal[4]).mean,
    iteration_4_unusableCellCountVsGoalAllMin: nullSafeBasicStat(unusableCellCountVsGoal[4]).min,
    iteration_4_unusableCellCountVsGoalAllMax: nullSafeBasicStat(unusableCellCountVsGoal[4]).max,
    iteration_4_unusableCellCountVsGoalAllStd: nullSafeBasicStat(unusableCellCountVsGoal[4]).std,
    iteration_4_unusableCellCountVsGoalAllSum: nullSafeBasicStat(unusableCellCountVsGoal[4]).sum,

    iteration_5_unusableCellCountVsGoalAllMean: nullSafeBasicStat(unusableCellCountVsGoal[5]).mean,
    iteration_5_unusableCellCountVsGoalAllMin: nullSafeBasicStat(unusableCellCountVsGoal[5]).min,
    iteration_5_unusableCellCountVsGoalAllMax: nullSafeBasicStat(unusableCellCountVsGoal[5]).max,
    iteration_5_unusableCellCountVsGoalAllStd: nullSafeBasicStat(unusableCellCountVsGoal[5]).std,
    iteration_5_unusableCellCountVsGoalAllSum: nullSafeBasicStat(unusableCellCountVsGoal[5]).sum,






    iteration_0_goalVsTotalMean: nullSafeBasicStat(goal[0]).mean / boardSize,
    iteration_0_goalVsTotalMin: nullSafeBasicStat(goal[0]).min / boardSize,
    iteration_0_goalVsTotalMax: nullSafeBasicStat(goal[0]).max / boardSize,
    iteration_0_goalVsTotalStd: nullSafeBasicStat(goal[0]).std / boardSize,
    iteration_0_goalVsTotalSum: nullSafeBasicStat(goal[0]).sum / boardSize / 3,

    iteration_1_goalVsTotalMean: nullSafeBasicStat(goal[1]).mean / boardSize,
    iteration_1_goalVsTotalMin: nullSafeBasicStat(goal[1]).min / boardSize,
    iteration_1_goalVsTotalMax: nullSafeBasicStat(goal[1]).max / boardSize,
    iteration_1_goalVsTotalStd: nullSafeBasicStat(goal[1]).std / boardSize,
    iteration_1_goalVsTotalSum: nullSafeBasicStat(goal[1]).sum / boardSize / 3,

    iteration_2_goalVsTotalMean: nullSafeBasicStat(goal[2]).mean / boardSize,
    iteration_2_goalVsTotalMin: nullSafeBasicStat(goal[2]).min / boardSize,
    iteration_2_goalVsTotalMax: nullSafeBasicStat(goal[2]).max / boardSize,
    iteration_2_goalVsTotalStd: nullSafeBasicStat(goal[2]).std / boardSize,
    iteration_2_goalVsTotalSum: nullSafeBasicStat(goal[2]).sum / boardSize / 3,

    iteration_3_goalVsTotalMean: nullSafeBasicStat(goal[3]).mean / boardSize,
    iteration_3_goalVsTotalMin: nullSafeBasicStat(goal[3]).min / boardSize,
    iteration_3_goalVsTotalMax: nullSafeBasicStat(goal[3]).max / boardSize,
    iteration_3_goalVsTotalStd: nullSafeBasicStat(goal[3]).std / boardSize,
    iteration_3_goalVsTotalSum: nullSafeBasicStat(goal[3]).sum / boardSize / 3,

    iteration_4_goalVsTotalMean: nullSafeBasicStat(goal[4]).mean / boardSize,
    iteration_4_goalVsTotalMin: nullSafeBasicStat(goal[4]).min / boardSize,
    iteration_4_goalVsTotalMax: nullSafeBasicStat(goal[4]).max / boardSize,
    iteration_4_goalVsTotalStd: nullSafeBasicStat(goal[4]).std / boardSize,
    iteration_4_goalVsTotalSum: nullSafeBasicStat(goal[4]).sum / boardSize / 3,

    iteration_5_goalVsTotalMean: nullSafeBasicStat(goal[5]).mean / boardSize,
    iteration_5_goalVsTotalMin: nullSafeBasicStat(goal[5]).min / boardSize,
    iteration_5_goalVsTotalMax: nullSafeBasicStat(goal[5]).max / boardSize,
    iteration_5_goalVsTotalStd: nullSafeBasicStat(goal[5]).std / boardSize,
    iteration_5_goalVsTotalSum: nullSafeBasicStat(goal[5]).sum / boardSize / 3,






    iteration_0_cellCountLargerThanTargetAllMean: nullSafeBasicStat(cellCountLargerThanTarget[0]).mean / boardSize,
    iteration_0_cellCountLargerThanTargetAllMin: nullSafeBasicStat(cellCountLargerThanTarget[0]).min / boardSize,
    iteration_0_cellCountLargerThanTargetAllMax: nullSafeBasicStat(cellCountLargerThanTarget[0]).max / boardSize,
    iteration_0_cellCountLargerThanTargetAllStd: nullSafeBasicStat(cellCountLargerThanTarget[0]).std / boardSize,
    iteration_0_cellCountLargerThanTargetAllSum: nullSafeBasicStat(cellCountLargerThanTarget[0]).sum / boardSize / 3,

    iteration_1_cellCountLargerThanTargetAllMean: nullSafeBasicStat(cellCountLargerThanTarget[1]).mean / boardSize,
    iteration_1_cellCountLargerThanTargetAllMin: nullSafeBasicStat(cellCountLargerThanTarget[1]).min / boardSize,
    iteration_1_cellCountLargerThanTargetAllMax: nullSafeBasicStat(cellCountLargerThanTarget[1]).max / boardSize,
    iteration_1_cellCountLargerThanTargetAllStd: nullSafeBasicStat(cellCountLargerThanTarget[1]).std / boardSize,
    iteration_1_cellCountLargerThanTargetAllSum: nullSafeBasicStat(cellCountLargerThanTarget[1]).sum / boardSize / 3,

    iteration_2_cellCountLargerThanTargetAllMean: nullSafeBasicStat(cellCountLargerThanTarget[2]).mean / boardSize,
    iteration_2_cellCountLargerThanTargetAllMin: nullSafeBasicStat(cellCountLargerThanTarget[2]).min / boardSize,
    iteration_2_cellCountLargerThanTargetAllMax: nullSafeBasicStat(cellCountLargerThanTarget[2]).max / boardSize,
    iteration_2_cellCountLargerThanTargetAllStd: nullSafeBasicStat(cellCountLargerThanTarget[2]).std / boardSize,
    iteration_2_cellCountLargerThanTargetAllSum: nullSafeBasicStat(cellCountLargerThanTarget[2]).sum / boardSize / 3,

    iteration_3_cellCountLargerThanTargetAllMean: nullSafeBasicStat(cellCountLargerThanTarget[3]).mean / boardSize,
    iteration_3_cellCountLargerThanTargetAllMin: nullSafeBasicStat(cellCountLargerThanTarget[3]).min / boardSize,
    iteration_3_cellCountLargerThanTargetAllMax: nullSafeBasicStat(cellCountLargerThanTarget[3]).max / boardSize,
    iteration_3_cellCountLargerThanTargetAllStd: nullSafeBasicStat(cellCountLargerThanTarget[3]).std / boardSize,
    iteration_3_cellCountLargerThanTargetAllSum: nullSafeBasicStat(cellCountLargerThanTarget[3]).sum / boardSize / 3,

    iteration_4_cellCountLargerThanTargetAllMean: nullSafeBasicStat(cellCountLargerThanTarget[4]).mean / boardSize,
    iteration_4_cellCountLargerThanTargetAllMin: nullSafeBasicStat(cellCountLargerThanTarget[4]).min / boardSize,
    iteration_4_cellCountLargerThanTargetAllMax: nullSafeBasicStat(cellCountLargerThanTarget[4]).max / boardSize,
    iteration_4_cellCountLargerThanTargetAllStd: nullSafeBasicStat(cellCountLargerThanTarget[4]).std / boardSize,
    iteration_4_cellCountLargerThanTargetAllSum: nullSafeBasicStat(cellCountLargerThanTarget[4]).sum / boardSize / 3,

    iteration_5_cellCountLargerThanTargetAllMean: nullSafeBasicStat(cellCountLargerThanTarget[5]).mean / boardSize,
    iteration_5_cellCountLargerThanTargetAllMin: nullSafeBasicStat(cellCountLargerThanTarget[5]).min / boardSize,
    iteration_5_cellCountLargerThanTargetAllMax: nullSafeBasicStat(cellCountLargerThanTarget[5]).max / boardSize,
    iteration_5_cellCountLargerThanTargetAllStd: nullSafeBasicStat(cellCountLargerThanTarget[5]).std / boardSize,
    iteration_5_cellCountLargerThanTargetAllSum: nullSafeBasicStat(cellCountLargerThanTarget[5]).sum / boardSize / 3,






    iteration_0_goalVsTotalAllMean: nullSafeBasicStat(gaolVsUnselectedSum[0]).mean,
    iteration_0_goalVsTotalAllMin: nullSafeBasicStat(gaolVsUnselectedSum[0]).min,
    iteration_0_goalVsTotalAllMax: nullSafeBasicStat(gaolVsUnselectedSum[0]).max,
    iteration_0_goalVsTotalAllStd: nullSafeBasicStat(gaolVsUnselectedSum[0]).std,
    iteration_0_goalVsTotalAllSum: nullSafeBasicStat(gaolVsUnselectedSum[0]).sum,

    iteration_1_goalVsTotalAllMean: nullSafeBasicStat(gaolVsUnselectedSum[1]).mean,
    iteration_1_goalVsTotalAllMin: nullSafeBasicStat(gaolVsUnselectedSum[1]).min,
    iteration_1_goalVsTotalAllMax: nullSafeBasicStat(gaolVsUnselectedSum[1]).max,
    iteration_1_goalVsTotalAllStd: nullSafeBasicStat(gaolVsUnselectedSum[1]).std,
    iteration_1_goalVsTotalAllSum: nullSafeBasicStat(gaolVsUnselectedSum[1]).sum,

    iteration_2_goalVsTotalAllMean: nullSafeBasicStat(gaolVsUnselectedSum[2]).mean,
    iteration_2_goalVsTotalAllMin: nullSafeBasicStat(gaolVsUnselectedSum[2]).min,
    iteration_2_goalVsTotalAllMax: nullSafeBasicStat(gaolVsUnselectedSum[2]).max,
    iteration_2_goalVsTotalAllStd: nullSafeBasicStat(gaolVsUnselectedSum[2]).std,
    iteration_2_goalVsTotalAllSum: nullSafeBasicStat(gaolVsUnselectedSum[2]).sum,

    iteration_3_goalVsTotalAllMean: nullSafeBasicStat(gaolVsUnselectedSum[3]).mean,
    iteration_3_goalVsTotalAllMin: nullSafeBasicStat(gaolVsUnselectedSum[3]).min,
    iteration_3_goalVsTotalAllMax: nullSafeBasicStat(gaolVsUnselectedSum[3]).max,
    iteration_3_goalVsTotalAllStd: nullSafeBasicStat(gaolVsUnselectedSum[3]).std,
    iteration_3_goalVsTotalAllSum: nullSafeBasicStat(gaolVsUnselectedSum[3]).sum,

    iteration_4_goalVsTotalAllMean: nullSafeBasicStat(gaolVsUnselectedSum[4]).mean,
    iteration_4_goalVsTotalAllMin: nullSafeBasicStat(gaolVsUnselectedSum[4]).min,
    iteration_4_goalVsTotalAllMax: nullSafeBasicStat(gaolVsUnselectedSum[4]).max,
    iteration_4_goalVsTotalAllStd: nullSafeBasicStat(gaolVsUnselectedSum[4]).std,
    iteration_4_goalVsTotalAllSum: nullSafeBasicStat(gaolVsUnselectedSum[4]).sum,

    iteration_5_goalVsTotalAllMean: nullSafeBasicStat(gaolVsUnselectedSum[5]).mean,
    iteration_5_goalVsTotalAllMin: nullSafeBasicStat(gaolVsUnselectedSum[5]).min,
    iteration_5_goalVsTotalAllMax: nullSafeBasicStat(gaolVsUnselectedSum[5]).max,
    iteration_5_goalVsTotalAllStd: nullSafeBasicStat(gaolVsUnselectedSum[5]).std,
    iteration_5_goalVsTotalAllSum: nullSafeBasicStat(gaolVsUnselectedSum[5]).sum,




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
  iteration_0_falsePositiveSolutionCountAllMean: number;
  iteration_0_falsePositiveSolutionCountAllMin: number;
  iteration_0_falsePositiveSolutionCountAllMax: number;
  iteration_0_falsePositiveSolutionCountAllStd: number;
  iteration_0_falsePositiveSolutionCountAllSum: number;
  // 
  iteration_1_falsePositiveSolutionCountAllMean: number;
  iteration_1_falsePositiveSolutionCountAllMin: number;
  iteration_1_falsePositiveSolutionCountAllMax: number;
  iteration_1_falsePositiveSolutionCountAllStd: number;
  iteration_1_falsePositiveSolutionCountAllSum: number;
  // 
  iteration_2_falsePositiveSolutionCountAllMean: number;
  iteration_2_falsePositiveSolutionCountAllMin: number;
  iteration_2_falsePositiveSolutionCountAllMax: number;
  iteration_2_falsePositiveSolutionCountAllStd: number;
  iteration_2_falsePositiveSolutionCountAllSum: number;
  // 
  iteration_3_falsePositiveSolutionCountAllMean: number;
  iteration_3_falsePositiveSolutionCountAllMin: number;
  iteration_3_falsePositiveSolutionCountAllMax: number;
  iteration_3_falsePositiveSolutionCountAllStd: number;
  iteration_3_falsePositiveSolutionCountAllSum: number;
  // 
  iteration_4_falsePositiveSolutionCountAllMean: number;
  iteration_4_falsePositiveSolutionCountAllMin: number;
  iteration_4_falsePositiveSolutionCountAllMax: number;
  iteration_4_falsePositiveSolutionCountAllStd: number;
  iteration_4_falsePositiveSolutionCountAllSum: number;
  // 
  iteration_5_falsePositiveSolutionCountAllMean: number;
  iteration_5_falsePositiveSolutionCountAllMin: number;
  iteration_5_falsePositiveSolutionCountAllMax: number;
  iteration_5_falsePositiveSolutionCountAllStd: number;
  iteration_5_falsePositiveSolutionCountAllSum: number;





  // 
  iteration_0_guaranteedRequiredCellCountMean: number;
  iteration_0_guaranteedRequiredCellCountMin: number;
  iteration_0_guaranteedRequiredCellCountMax: number;
  iteration_0_guaranteedRequiredCellCountStd: number;
  iteration_0_guaranteedRequiredCellCountSum: number;
  // 
  iteration_1_guaranteedRequiredCellCountMean: number;
  iteration_1_guaranteedRequiredCellCountMin: number;
  iteration_1_guaranteedRequiredCellCountMax: number;
  iteration_1_guaranteedRequiredCellCountStd: number;
  iteration_1_guaranteedRequiredCellCountSum: number;
  //
  iteration_2_guaranteedRequiredCellCountMean: number;
  iteration_2_guaranteedRequiredCellCountMin: number;
  iteration_2_guaranteedRequiredCellCountMax: number;
  iteration_2_guaranteedRequiredCellCountStd: number;
  iteration_2_guaranteedRequiredCellCountSum: number;
  //
  iteration_3_guaranteedRequiredCellCountMean: number;
  iteration_3_guaranteedRequiredCellCountMin: number;
  iteration_3_guaranteedRequiredCellCountMax: number;
  iteration_3_guaranteedRequiredCellCountStd: number;
  iteration_3_guaranteedRequiredCellCountSum: number;
  //
  iteration_4_guaranteedRequiredCellCountMean: number;
  iteration_4_guaranteedRequiredCellCountMin: number;
  iteration_4_guaranteedRequiredCellCountMax: number;
  iteration_4_guaranteedRequiredCellCountStd: number;
  iteration_4_guaranteedRequiredCellCountSum: number;
  //
  iteration_5_guaranteedRequiredCellCountMean: number;
  iteration_5_guaranteedRequiredCellCountMin: number;
  iteration_5_guaranteedRequiredCellCountMax: number;
  iteration_5_guaranteedRequiredCellCountStd: number;
  iteration_5_guaranteedRequiredCellCountSum: number;




  //
  iteration_0_guaranteedUnusableCellCountAllMean: number;
  iteration_0_guaranteedUnusableCellCountAllMin: number;
  iteration_0_guaranteedUnusableCellCountAllMax: number;
  iteration_0_guaranteedUnusableCellCountAllStd: number;
  iteration_0_guaranteedUnusableCellCountAllSum: number;
  //
  iteration_1_guaranteedUnusableCellCountAllMean: number;
  iteration_1_guaranteedUnusableCellCountAllMin: number;
  iteration_1_guaranteedUnusableCellCountAllMax: number;
  iteration_1_guaranteedUnusableCellCountAllStd: number;
  iteration_1_guaranteedUnusableCellCountAllSum: number;
  //
  iteration_2_guaranteedUnusableCellCountAllMean: number;
  iteration_2_guaranteedUnusableCellCountAllMin: number;
  iteration_2_guaranteedUnusableCellCountAllMax: number;
  iteration_2_guaranteedUnusableCellCountAllStd: number;
  iteration_2_guaranteedUnusableCellCountAllSum: number;
  //
  iteration_3_guaranteedUnusableCellCountAllMean: number;
  iteration_3_guaranteedUnusableCellCountAllMin: number;
  iteration_3_guaranteedUnusableCellCountAllMax: number;
  iteration_3_guaranteedUnusableCellCountAllStd: number;
  iteration_3_guaranteedUnusableCellCountAllSum: number;
  //
  iteration_4_guaranteedUnusableCellCountAllMean: number;
  iteration_4_guaranteedUnusableCellCountAllMin: number;
  iteration_4_guaranteedUnusableCellCountAllMax: number;
  iteration_4_guaranteedUnusableCellCountAllStd: number;
  iteration_4_guaranteedUnusableCellCountAllSum: number;
  //
  iteration_5_guaranteedUnusableCellCountAllMean: number;
  iteration_5_guaranteedUnusableCellCountAllMin: number;
  iteration_5_guaranteedUnusableCellCountAllMax: number;
  iteration_5_guaranteedUnusableCellCountAllStd: number;
  iteration_5_guaranteedUnusableCellCountAllSum: number;





  //
  iteration_0_actionableCellAllCountMean: number;
  iteration_0_actionableCellAllCountMin: number;
  iteration_0_actionableCellAllCountMax: number;
  iteration_0_actionableCellAllCountStd: number;
  iteration_0_actionableCellAllCountSum: number;
  //
  iteration_1_actionableCellAllCountMean: number;
  iteration_1_actionableCellAllCountMin: number;
  iteration_1_actionableCellAllCountMax: number;
  iteration_1_actionableCellAllCountStd: number;
  iteration_1_actionableCellAllCountSum: number;
  //
  iteration_2_actionableCellAllCountMean: number;
  iteration_2_actionableCellAllCountMin: number;
  iteration_2_actionableCellAllCountMax: number;
  iteration_2_actionableCellAllCountStd: number;
  iteration_2_actionableCellAllCountSum: number;
  //
  iteration_3_actionableCellAllCountMean: number;
  iteration_3_actionableCellAllCountMin: number;
  iteration_3_actionableCellAllCountMax: number;
  iteration_3_actionableCellAllCountStd: number;
  iteration_3_actionableCellAllCountSum: number;
  //
  iteration_4_actionableCellAllCountMean: number;
  iteration_4_actionableCellAllCountMin: number;
  iteration_4_actionableCellAllCountMax: number;
  iteration_4_actionableCellAllCountStd: number;
  iteration_4_actionableCellAllCountSum: number;
  //
  iteration_5_actionableCellAllCountMean: number;
  iteration_5_actionableCellAllCountMin: number;
  iteration_5_actionableCellAllCountMax: number;
  iteration_5_actionableCellAllCountStd: number;
  iteration_5_actionableCellAllCountSum: number;




  //: number;
  iteration_0_unactionableCellAllCountMean: number;
  iteration_0_unactionableCellAllCountMin: number;
  iteration_0_unactionableCellAllCountMax: number;
  iteration_0_unactionableCellAllCountStd: number;
  iteration_0_unactionableCellAllCountSum: number;

  iteration_1_unactionableCellAllCountMean: number;
  iteration_1_unactionableCellAllCountMin: number;
  iteration_1_unactionableCellAllCountMax: number;
  iteration_1_unactionableCellAllCountStd: number;
  iteration_1_unactionableCellAllCountSum: number;

  iteration_2_unactionableCellAllCountMean: number;
  iteration_2_unactionableCellAllCountMin: number;
  iteration_2_unactionableCellAllCountMax: number;
  iteration_2_unactionableCellAllCountStd: number;
  iteration_2_unactionableCellAllCountSum: number;

  iteration_3_unactionableCellAllCountMean: number;
  iteration_3_unactionableCellAllCountMin: number;
  iteration_3_unactionableCellAllCountMax: number;
  iteration_3_unactionableCellAllCountStd: number;
  iteration_3_unactionableCellAllCountSum: number;

  iteration_4_unactionableCellAllCountMean: number;
  iteration_4_unactionableCellAllCountMin: number;
  iteration_4_unactionableCellAllCountMax: number;
  iteration_4_unactionableCellAllCountStd: number;
  iteration_4_unactionableCellAllCountSum: number;

  iteration_5_unactionableCellAllCountMean: number;
  iteration_5_unactionableCellAllCountMin: number;
  iteration_5_unactionableCellAllCountMax: number;
  iteration_5_unactionableCellAllCountStd: number;
  iteration_5_unactionableCellAllCountSum: number;




  //
  iteration_0_requiredCellCountVsGoalAllMean: number;
  iteration_0_requiredCellCountVsGoalAllMin: number;
  iteration_0_requiredCellCountVsGoalAllMax: number;
  iteration_0_requiredCellCountVsGoalAllStd: number;
  iteration_0_requiredCellCountVsGoalAllSum: number;
  //
  iteration_1_requiredCellCountVsGoalAllMean: number;
  iteration_1_requiredCellCountVsGoalAllMin: number;
  iteration_1_requiredCellCountVsGoalAllMax: number;
  iteration_1_requiredCellCountVsGoalAllStd: number;
  iteration_1_requiredCellCountVsGoalAllSum: number;
  //
  iteration_2_requiredCellCountVsGoalAllMean: number;
  iteration_2_requiredCellCountVsGoalAllMin: number;
  iteration_2_requiredCellCountVsGoalAllMax: number;
  iteration_2_requiredCellCountVsGoalAllStd: number;
  iteration_2_requiredCellCountVsGoalAllSum: number;
  //
  iteration_3_requiredCellCountVsGoalAllMean: number;
  iteration_3_requiredCellCountVsGoalAllMin: number;
  iteration_3_requiredCellCountVsGoalAllMax: number;
  iteration_3_requiredCellCountVsGoalAllStd: number;
  iteration_3_requiredCellCountVsGoalAllSum: number;
  //
  iteration_4_requiredCellCountVsGoalAllMean: number;
  iteration_4_requiredCellCountVsGoalAllMin: number;
  iteration_4_requiredCellCountVsGoalAllMax: number;
  iteration_4_requiredCellCountVsGoalAllStd: number;
  iteration_4_requiredCellCountVsGoalAllSum: number;
  //
  iteration_5_requiredCellCountVsGoalAllMean: number;
  iteration_5_requiredCellCountVsGoalAllMin: number;
  iteration_5_requiredCellCountVsGoalAllMax: number;
  iteration_5_requiredCellCountVsGoalAllStd: number;
  iteration_5_requiredCellCountVsGoalAllSum: number;




  //
  iteration_0_unusableCellCountVsGoalAllMean: number;
  iteration_0_unusableCellCountVsGoalAllMin: number;
  iteration_0_unusableCellCountVsGoalAllMax: number;
  iteration_0_unusableCellCountVsGoalAllStd: number;
  iteration_0_unusableCellCountVsGoalAllSum: number;
  //
  iteration_1_unusableCellCountVsGoalAllMean: number;
  iteration_1_unusableCellCountVsGoalAllMin: number;
  iteration_1_unusableCellCountVsGoalAllMax: number;
  iteration_1_unusableCellCountVsGoalAllStd: number;
  iteration_1_unusableCellCountVsGoalAllSum: number;
  //
  iteration_2_unusableCellCountVsGoalAllMean: number;
  iteration_2_unusableCellCountVsGoalAllMin: number;
  iteration_2_unusableCellCountVsGoalAllMax: number;
  iteration_2_unusableCellCountVsGoalAllStd: number;
  iteration_2_unusableCellCountVsGoalAllSum: number;
  //
  iteration_3_unusableCellCountVsGoalAllMean: number;
  iteration_3_unusableCellCountVsGoalAllMin: number;
  iteration_3_unusableCellCountVsGoalAllMax: number;
  iteration_3_unusableCellCountVsGoalAllStd: number;
  iteration_3_unusableCellCountVsGoalAllSum: number;
  //
  iteration_4_unusableCellCountVsGoalAllMean: number;
  iteration_4_unusableCellCountVsGoalAllMin: number;
  iteration_4_unusableCellCountVsGoalAllMax: number;
  iteration_4_unusableCellCountVsGoalAllStd: number;
  iteration_4_unusableCellCountVsGoalAllSum: number;
  //
  iteration_5_unusableCellCountVsGoalAllMean: number;
  iteration_5_unusableCellCountVsGoalAllMin: number;
  iteration_5_unusableCellCountVsGoalAllMax: number;
  iteration_5_unusableCellCountVsGoalAllStd: number;
  iteration_5_unusableCellCountVsGoalAllSum: number;




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
  iteration_2_goalVsTotalMean: number;
  iteration_2_goalVsTotalMin: number;
  iteration_2_goalVsTotalMax: number;
  iteration_2_goalVsTotalStd: number;
  iteration_2_goalVsTotalSum: number;
  //
  iteration_3_goalVsTotalMean: number;
  iteration_3_goalVsTotalMin: number;
  iteration_3_goalVsTotalMax: number;
  iteration_3_goalVsTotalStd: number;
  iteration_3_goalVsTotalSum: number;
  //
  iteration_4_goalVsTotalMean: number;
  iteration_4_goalVsTotalMin: number;
  iteration_4_goalVsTotalMax: number;
  iteration_4_goalVsTotalStd: number;
  iteration_4_goalVsTotalSum: number;
  //
  iteration_5_goalVsTotalMean: number;
  iteration_5_goalVsTotalMin: number;
  iteration_5_goalVsTotalMax: number;
  iteration_5_goalVsTotalStd: number;
  iteration_5_goalVsTotalSum: number;




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
  iteration_2_cellCountLargerThanTargetAllMean: number;
  iteration_2_cellCountLargerThanTargetAllMin: number;
  iteration_2_cellCountLargerThanTargetAllMax: number;
  iteration_2_cellCountLargerThanTargetAllStd: number;
  iteration_2_cellCountLargerThanTargetAllSum: number;
  //
  iteration_3_cellCountLargerThanTargetAllMean: number;
  iteration_3_cellCountLargerThanTargetAllMin: number;
  iteration_3_cellCountLargerThanTargetAllMax: number;
  iteration_3_cellCountLargerThanTargetAllStd: number;
  iteration_3_cellCountLargerThanTargetAllSum: number;
  //
  iteration_4_cellCountLargerThanTargetAllMean: number;
  iteration_4_cellCountLargerThanTargetAllMin: number;
  iteration_4_cellCountLargerThanTargetAllMax: number;
  iteration_4_cellCountLargerThanTargetAllStd: number;
  iteration_4_cellCountLargerThanTargetAllSum: number;
  //
  iteration_5_cellCountLargerThanTargetAllMean: number;
  iteration_5_cellCountLargerThanTargetAllMin: number;
  iteration_5_cellCountLargerThanTargetAllMax: number;
  iteration_5_cellCountLargerThanTargetAllStd: number;
  iteration_5_cellCountLargerThanTargetAllSum: number;




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
  iteration_2_goalVsTotalAllMean: number;
  iteration_2_goalVsTotalAllMin: number;
  iteration_2_goalVsTotalAllMax: number;
  iteration_2_goalVsTotalAllStd: number;
  iteration_2_goalVsTotalAllSum: number;
  //
  iteration_3_goalVsTotalAllMean: number;
  iteration_3_goalVsTotalAllMin: number;
  iteration_3_goalVsTotalAllMax: number;
  iteration_3_goalVsTotalAllStd: number;
  iteration_3_goalVsTotalAllSum: number;
  //
  iteration_4_goalVsTotalAllMean: number;
  iteration_4_goalVsTotalAllMin: number;
  iteration_4_goalVsTotalAllMax: number;
  iteration_4_goalVsTotalAllStd: number;
  iteration_4_goalVsTotalAllSum: number;
  //
  iteration_5_goalVsTotalAllMean: number;
  iteration_5_goalVsTotalAllMin: number;
  iteration_5_goalVsTotalAllMax: number;
  iteration_5_goalVsTotalAllStd: number;
  iteration_5_goalVsTotalAllSum: number;




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
}
