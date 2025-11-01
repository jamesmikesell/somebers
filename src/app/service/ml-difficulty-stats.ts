import { FeatureSpec } from "../model/ml-types";
import { BoardStats } from "./board-stat-analyzer";
import { RawGenericFeatureSet } from "./ml-core";





export const FEATURE_SPEC: FeatureSpec = {
  keys: [

    "percentUnresolvedCellsAfterDeductionI2",
    "percentUnresolvedCellsAfterDeductionI3",
    "percentUnresolvedCellsAfterDeductionI5",
    "percentUnresolvedCellsAfterDeductionI6",
    "iteration_4_guaranteedUnusableCellCountAllStd",
    "iteration_0_guaranteedUnusableCellCountAllMean",
    "gameDateAsPercent",
    "boardSize",
    "iteration_2_falsePositiveSolutionCountAllStd",
    "iteration_1_guaranteedRequiredCellCountMax",
    "iteration_0_goalVsTotalMin",
    "iteration_0_unusableCellCountVsGoalAllMax",
    "iteration_1_guaranteedRequiredCellCountStd",
    "iteration_2_guaranteedUnusableCellCountAllSum",
    "iteration_2_falsePositiveSolutionCountAllMax",
    "iteration_0_actionableCellAllCountStd",
    "iteration_0_goalVsTotalSum",
    "iteration_4_falsePositiveSolutionCountAllStd",
    "iteration_1_cellCountLargerThanTargetAllSum",
    "iteration_0_actionableCellAllCountMax",
    "iteration_0_goalVsTotalAllMax",
    "iteration_0_unusableCellCountVsGoalAllMin",
    "iteration_0_guaranteedRequiredCellCountSum",
    "iteration_0_goalVsTotalMean",
    "iteration_1_falsePositiveSolutionCountAllMax",
    "iteration_4_falsePositiveSolutionCountAllMax",
    "iteration_1_falsePositiveSolutionCountAllStd",
    "iteration_0_guaranteedRequiredCellCountStd"


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

    iteration_0_falsePositiveSolutionCountAllMean: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[0]).mean,
    iteration_0_falsePositiveSolutionCountAllMin: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[0]).min / Math.pow(2, boardSize),
    iteration_0_falsePositiveSolutionCountAllMax: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[0]).max / Math.pow(2, boardSize),
    iteration_0_falsePositiveSolutionCountAllStd: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[0]).std,
    iteration_0_falsePositiveSolutionCountAllSum: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[0]).sum / (Math.pow(2, boardSize) * 3),

    iteration_1_falsePositiveSolutionCountAllMean: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[1]).mean,
    iteration_1_falsePositiveSolutionCountAllMin: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[1]).min / Math.pow(2, boardSize),
    iteration_1_falsePositiveSolutionCountAllMax: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[1]).max / Math.pow(2, boardSize),
    iteration_1_falsePositiveSolutionCountAllStd: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[1]).std,
    iteration_1_falsePositiveSolutionCountAllSum: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[1]).sum / (Math.pow(2, boardSize) * 3),

    iteration_2_falsePositiveSolutionCountAllMean: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[2]).mean,
    iteration_2_falsePositiveSolutionCountAllMin: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[2]).min / Math.pow(2, boardSize),
    iteration_2_falsePositiveSolutionCountAllMax: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[2]).max / Math.pow(2, boardSize),
    iteration_2_falsePositiveSolutionCountAllStd: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[2]).std,
    iteration_2_falsePositiveSolutionCountAllSum: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[2]).sum / (Math.pow(2, boardSize) * 3),

    iteration_3_falsePositiveSolutionCountAllMean: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[3]).mean,
    iteration_3_falsePositiveSolutionCountAllMin: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[3]).min / Math.pow(2, boardSize),
    iteration_3_falsePositiveSolutionCountAllMax: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[3]).max / Math.pow(2, boardSize),
    iteration_3_falsePositiveSolutionCountAllStd: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[3]).std,
    iteration_3_falsePositiveSolutionCountAllSum: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[3]).sum / (Math.pow(2, boardSize) * 3),

    iteration_4_falsePositiveSolutionCountAllMean: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[4]).mean,
    iteration_4_falsePositiveSolutionCountAllMin: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[4]).min / Math.pow(2, boardSize),
    iteration_4_falsePositiveSolutionCountAllMax: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[4]).max / Math.pow(2, boardSize),
    iteration_4_falsePositiveSolutionCountAllStd: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[4]).std,
    iteration_4_falsePositiveSolutionCountAllSum: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[4]).sum / (Math.pow(2, boardSize) * 3),

    iteration_5_falsePositiveSolutionCountAllMean: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[5]).mean,
    iteration_5_falsePositiveSolutionCountAllMin: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[5]).min / Math.pow(2, boardSize),
    iteration_5_falsePositiveSolutionCountAllMax: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[5]).max / Math.pow(2, boardSize),
    iteration_5_falsePositiveSolutionCountAllStd: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[5]).std,
    iteration_5_falsePositiveSolutionCountAllSum: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[5]).sum / (Math.pow(2, boardSize) * 3),

    iteration_0_guaranteedRequiredCellCountMean: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[0]).mean / boardSize,
    iteration_0_guaranteedRequiredCellCountMin: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[0]).min / boardSize,
    iteration_0_guaranteedRequiredCellCountMax: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[0]).max / boardSize,
    iteration_0_guaranteedRequiredCellCountStd: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[0]).std / boardSize,
    iteration_0_guaranteedRequiredCellCountSum: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[0]).sum / boardSize / 3,

    iteration_1_guaranteedRequiredCellCountMean: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[1]).mean / boardSize,
    iteration_1_guaranteedRequiredCellCountMin: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[1]).min / boardSize,
    iteration_1_guaranteedRequiredCellCountMax: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[1]).max / boardSize,
    iteration_1_guaranteedRequiredCellCountStd: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[1]).std / boardSize,
    iteration_1_guaranteedRequiredCellCountSum: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[1]).sum / boardSize / 3,

    iteration_2_guaranteedRequiredCellCountMean: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[2]).mean / boardSize,
    iteration_2_guaranteedRequiredCellCountMin: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[2]).min / boardSize,
    iteration_2_guaranteedRequiredCellCountMax: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[2]).max / boardSize,
    iteration_2_guaranteedRequiredCellCountStd: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[2]).std / boardSize,
    iteration_2_guaranteedRequiredCellCountSum: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[2]).sum / boardSize / 3,

    iteration_3_guaranteedRequiredCellCountMean: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[3]).mean / boardSize,
    iteration_3_guaranteedRequiredCellCountMin: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[3]).min / boardSize,
    iteration_3_guaranteedRequiredCellCountMax: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[3]).max / boardSize,
    iteration_3_guaranteedRequiredCellCountStd: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[3]).std / boardSize,
    iteration_3_guaranteedRequiredCellCountSum: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[3]).sum / boardSize / 3,

    iteration_4_guaranteedRequiredCellCountMean: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[4]).mean / boardSize,
    iteration_4_guaranteedRequiredCellCountMin: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[4]).min / boardSize,
    iteration_4_guaranteedRequiredCellCountMax: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[4]).max / boardSize,
    iteration_4_guaranteedRequiredCellCountStd: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[4]).std / boardSize,
    iteration_4_guaranteedRequiredCellCountSum: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[4]).sum / boardSize / 3,

    iteration_5_guaranteedRequiredCellCountMean: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[5]).mean / boardSize,
    iteration_5_guaranteedRequiredCellCountMin: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[5]).min / boardSize,
    iteration_5_guaranteedRequiredCellCountMax: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[5]).max / boardSize,
    iteration_5_guaranteedRequiredCellCountStd: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[5]).std / boardSize,
    iteration_5_guaranteedRequiredCellCountSum: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[5]).sum / boardSize / 3,

    iteration_0_guaranteedUnusableCellCountAllMean: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[0]).mean / boardSize,
    iteration_0_guaranteedUnusableCellCountAllMin: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[0]).min / boardSize,
    iteration_0_guaranteedUnusableCellCountAllMax: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[0]).max / boardSize,
    iteration_0_guaranteedUnusableCellCountAllStd: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[0]).std / boardSize,
    iteration_0_guaranteedUnusableCellCountAllSum: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[0]).sum / boardSize / 3,

    iteration_1_guaranteedUnusableCellCountAllMean: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[1]).mean / boardSize,
    iteration_1_guaranteedUnusableCellCountAllMin: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[1]).min / boardSize,
    iteration_1_guaranteedUnusableCellCountAllMax: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[1]).max / boardSize,
    iteration_1_guaranteedUnusableCellCountAllStd: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[1]).std / boardSize,
    iteration_1_guaranteedUnusableCellCountAllSum: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[1]).sum / boardSize / 3,

    iteration_2_guaranteedUnusableCellCountAllMean: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[2]).mean / boardSize,
    iteration_2_guaranteedUnusableCellCountAllMin: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[2]).min / boardSize,
    iteration_2_guaranteedUnusableCellCountAllMax: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[2]).max / boardSize,
    iteration_2_guaranteedUnusableCellCountAllStd: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[2]).std / boardSize,
    iteration_2_guaranteedUnusableCellCountAllSum: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[2]).sum / boardSize / 3,

    iteration_3_guaranteedUnusableCellCountAllMean: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[3]).mean / boardSize,
    iteration_3_guaranteedUnusableCellCountAllMin: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[3]).min / boardSize,
    iteration_3_guaranteedUnusableCellCountAllMax: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[3]).max / boardSize,
    iteration_3_guaranteedUnusableCellCountAllStd: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[3]).std / boardSize,
    iteration_3_guaranteedUnusableCellCountAllSum: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[3]).sum / boardSize / 3,

    iteration_4_guaranteedUnusableCellCountAllMean: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[4]).mean / boardSize,
    iteration_4_guaranteedUnusableCellCountAllMin: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[4]).min / boardSize,
    iteration_4_guaranteedUnusableCellCountAllMax: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[4]).max / boardSize,
    iteration_4_guaranteedUnusableCellCountAllStd: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[4]).std / boardSize,
    iteration_4_guaranteedUnusableCellCountAllSum: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[4]).sum / boardSize / 3,

    iteration_5_guaranteedUnusableCellCountAllMean: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[5]).mean / boardSize,
    iteration_5_guaranteedUnusableCellCountAllMin: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[5]).min / boardSize,
    iteration_5_guaranteedUnusableCellCountAllMax: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[5]).max / boardSize,
    iteration_5_guaranteedUnusableCellCountAllStd: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[5]).std / boardSize,
    iteration_5_guaranteedUnusableCellCountAllSum: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[5]).sum / boardSize / 3,

    iteration_0_actionableCellAllCountMean: nullSafeBasicStat(actionableCellAllCountAllAgg[0]).mean / boardSize,
    iteration_0_actionableCellAllCountMin: nullSafeBasicStat(actionableCellAllCountAllAgg[0]).min / boardSize,
    iteration_0_actionableCellAllCountMax: nullSafeBasicStat(actionableCellAllCountAllAgg[0]).max / boardSize,
    iteration_0_actionableCellAllCountStd: nullSafeBasicStat(actionableCellAllCountAllAgg[0]).std / boardSize,
    iteration_0_actionableCellAllCountSum: nullSafeBasicStat(actionableCellAllCountAllAgg[0]).sum / boardSize / 3,

    iteration_1_actionableCellAllCountMean: nullSafeBasicStat(actionableCellAllCountAllAgg[1]).mean / boardSize,
    iteration_1_actionableCellAllCountMin: nullSafeBasicStat(actionableCellAllCountAllAgg[1]).min / boardSize,
    iteration_1_actionableCellAllCountMax: nullSafeBasicStat(actionableCellAllCountAllAgg[1]).max / boardSize,
    iteration_1_actionableCellAllCountStd: nullSafeBasicStat(actionableCellAllCountAllAgg[1]).std / boardSize,
    iteration_1_actionableCellAllCountSum: nullSafeBasicStat(actionableCellAllCountAllAgg[1]).sum / boardSize / 3,

    iteration_2_actionableCellAllCountMean: nullSafeBasicStat(actionableCellAllCountAllAgg[2]).mean / boardSize,
    iteration_2_actionableCellAllCountMin: nullSafeBasicStat(actionableCellAllCountAllAgg[2]).min / boardSize,
    iteration_2_actionableCellAllCountMax: nullSafeBasicStat(actionableCellAllCountAllAgg[2]).max / boardSize,
    iteration_2_actionableCellAllCountStd: nullSafeBasicStat(actionableCellAllCountAllAgg[2]).std / boardSize,
    iteration_2_actionableCellAllCountSum: nullSafeBasicStat(actionableCellAllCountAllAgg[2]).sum / boardSize / 3,

    iteration_3_actionableCellAllCountMean: nullSafeBasicStat(actionableCellAllCountAllAgg[3]).mean / boardSize,
    iteration_3_actionableCellAllCountMin: nullSafeBasicStat(actionableCellAllCountAllAgg[3]).min / boardSize,
    iteration_3_actionableCellAllCountMax: nullSafeBasicStat(actionableCellAllCountAllAgg[3]).max / boardSize,
    iteration_3_actionableCellAllCountStd: nullSafeBasicStat(actionableCellAllCountAllAgg[3]).std / boardSize,
    iteration_3_actionableCellAllCountSum: nullSafeBasicStat(actionableCellAllCountAllAgg[3]).sum / boardSize / 3,

    iteration_4_actionableCellAllCountMean: nullSafeBasicStat(actionableCellAllCountAllAgg[4]).mean / boardSize,
    iteration_4_actionableCellAllCountMin: nullSafeBasicStat(actionableCellAllCountAllAgg[4]).min / boardSize,
    iteration_4_actionableCellAllCountMax: nullSafeBasicStat(actionableCellAllCountAllAgg[4]).max / boardSize,
    iteration_4_actionableCellAllCountStd: nullSafeBasicStat(actionableCellAllCountAllAgg[4]).std / boardSize,
    iteration_4_actionableCellAllCountSum: nullSafeBasicStat(actionableCellAllCountAllAgg[4]).sum / boardSize / 3,

    iteration_5_actionableCellAllCountMean: nullSafeBasicStat(actionableCellAllCountAllAgg[5]).mean / boardSize,
    iteration_5_actionableCellAllCountMin: nullSafeBasicStat(actionableCellAllCountAllAgg[5]).min / boardSize,
    iteration_5_actionableCellAllCountMax: nullSafeBasicStat(actionableCellAllCountAllAgg[5]).max / boardSize,
    iteration_5_actionableCellAllCountStd: nullSafeBasicStat(actionableCellAllCountAllAgg[5]).std / boardSize,
    iteration_5_actionableCellAllCountSum: nullSafeBasicStat(actionableCellAllCountAllAgg[5]).sum / boardSize / 3,

    // TODO: compare to board size
    iteration_0_requiredCellCountVsGoalAllMean: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[0]).mean,
    iteration_0_requiredCellCountVsGoalAllMin: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[0]).min,
    iteration_0_requiredCellCountVsGoalAllMax: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[0]).max,
    iteration_0_requiredCellCountVsGoalAllStd: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[0]).std,
    iteration_0_requiredCellCountVsGoalAllSum: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[0]).sum,

    iteration_1_requiredCellCountVsGoalAllMean: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[1]).mean,
    iteration_1_requiredCellCountVsGoalAllMin: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[1]).min,
    iteration_1_requiredCellCountVsGoalAllMax: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[1]).max,
    iteration_1_requiredCellCountVsGoalAllStd: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[1]).std,
    iteration_1_requiredCellCountVsGoalAllSum: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[1]).sum,

    iteration_2_requiredCellCountVsGoalAllMean: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[2]).mean,
    iteration_2_requiredCellCountVsGoalAllMin: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[2]).min,
    iteration_2_requiredCellCountVsGoalAllMax: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[2]).max,
    iteration_2_requiredCellCountVsGoalAllStd: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[2]).std,
    iteration_2_requiredCellCountVsGoalAllSum: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[2]).sum,

    iteration_3_requiredCellCountVsGoalAllMean: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[3]).mean,
    iteration_3_requiredCellCountVsGoalAllMin: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[3]).min,
    iteration_3_requiredCellCountVsGoalAllMax: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[3]).max,
    iteration_3_requiredCellCountVsGoalAllStd: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[3]).std,
    iteration_3_requiredCellCountVsGoalAllSum: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[3]).sum,

    iteration_4_requiredCellCountVsGoalAllMean: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[4]).mean,
    iteration_4_requiredCellCountVsGoalAllMin: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[4]).min,
    iteration_4_requiredCellCountVsGoalAllMax: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[4]).max,
    iteration_4_requiredCellCountVsGoalAllStd: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[4]).std,
    iteration_4_requiredCellCountVsGoalAllSum: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[4]).sum,

    iteration_5_requiredCellCountVsGoalAllMean: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[5]).mean,
    iteration_5_requiredCellCountVsGoalAllMin: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[5]).min,
    iteration_5_requiredCellCountVsGoalAllMax: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[5]).max,
    iteration_5_requiredCellCountVsGoalAllStd: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[5]).std,
    iteration_5_requiredCellCountVsGoalAllSum: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[5]).sum,

    iteration_0_unusableCellCountVsGoalAllMean: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[0]).mean,
    iteration_0_unusableCellCountVsGoalAllMin: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[0]).min,
    iteration_0_unusableCellCountVsGoalAllMax: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[0]).max,
    iteration_0_unusableCellCountVsGoalAllStd: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[0]).std,
    iteration_0_unusableCellCountVsGoalAllSum: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[0]).sum,

    iteration_1_unusableCellCountVsGoalAllMean: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[1]).mean,
    iteration_1_unusableCellCountVsGoalAllMin: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[1]).min,
    iteration_1_unusableCellCountVsGoalAllMax: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[1]).max,
    iteration_1_unusableCellCountVsGoalAllStd: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[1]).std,
    iteration_1_unusableCellCountVsGoalAllSum: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[1]).sum,

    iteration_2_unusableCellCountVsGoalAllMean: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[2]).mean,
    iteration_2_unusableCellCountVsGoalAllMin: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[2]).min,
    iteration_2_unusableCellCountVsGoalAllMax: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[2]).max,
    iteration_2_unusableCellCountVsGoalAllStd: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[2]).std,
    iteration_2_unusableCellCountVsGoalAllSum: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[2]).sum,

    iteration_3_unusableCellCountVsGoalAllMean: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[3]).mean,
    iteration_3_unusableCellCountVsGoalAllMin: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[3]).min,
    iteration_3_unusableCellCountVsGoalAllMax: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[3]).max,
    iteration_3_unusableCellCountVsGoalAllStd: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[3]).std,
    iteration_3_unusableCellCountVsGoalAllSum: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[3]).sum,

    iteration_4_unusableCellCountVsGoalAllMean: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[4]).mean,
    iteration_4_unusableCellCountVsGoalAllMin: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[4]).min,
    iteration_4_unusableCellCountVsGoalAllMax: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[4]).max,
    iteration_4_unusableCellCountVsGoalAllStd: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[4]).std,
    iteration_4_unusableCellCountVsGoalAllSum: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[4]).sum,

    iteration_5_unusableCellCountVsGoalAllMean: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[5]).mean,
    iteration_5_unusableCellCountVsGoalAllMin: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[5]).min,
    iteration_5_unusableCellCountVsGoalAllMax: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[5]).max,
    iteration_5_unusableCellCountVsGoalAllStd: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[5]).std,
    iteration_5_unusableCellCountVsGoalAllSum: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[5]).sum,

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

    iteration_2_goalVsTotalMean: nullSafeBasicStat(goalVsTotalAgg[2]).mean / boardSize,
    iteration_2_goalVsTotalMin: nullSafeBasicStat(goalVsTotalAgg[2]).min / boardSize,
    iteration_2_goalVsTotalMax: nullSafeBasicStat(goalVsTotalAgg[2]).max / boardSize,
    iteration_2_goalVsTotalStd: nullSafeBasicStat(goalVsTotalAgg[2]).std / boardSize,
    iteration_2_goalVsTotalSum: nullSafeBasicStat(goalVsTotalAgg[2]).sum / boardSize / 3,

    iteration_3_goalVsTotalMean: nullSafeBasicStat(goalVsTotalAgg[3]).mean / boardSize,
    iteration_3_goalVsTotalMin: nullSafeBasicStat(goalVsTotalAgg[3]).min / boardSize,
    iteration_3_goalVsTotalMax: nullSafeBasicStat(goalVsTotalAgg[3]).max / boardSize,
    iteration_3_goalVsTotalStd: nullSafeBasicStat(goalVsTotalAgg[3]).std / boardSize,
    iteration_3_goalVsTotalSum: nullSafeBasicStat(goalVsTotalAgg[3]).sum / boardSize / 3,

    iteration_4_goalVsTotalMean: nullSafeBasicStat(goalVsTotalAgg[4]).mean / boardSize,
    iteration_4_goalVsTotalMin: nullSafeBasicStat(goalVsTotalAgg[4]).min / boardSize,
    iteration_4_goalVsTotalMax: nullSafeBasicStat(goalVsTotalAgg[4]).max / boardSize,
    iteration_4_goalVsTotalStd: nullSafeBasicStat(goalVsTotalAgg[4]).std / boardSize,
    iteration_4_goalVsTotalSum: nullSafeBasicStat(goalVsTotalAgg[4]).sum / boardSize / 3,

    iteration_5_goalVsTotalMean: nullSafeBasicStat(goalVsTotalAgg[5]).mean / boardSize,
    iteration_5_goalVsTotalMin: nullSafeBasicStat(goalVsTotalAgg[5]).min / boardSize,
    iteration_5_goalVsTotalMax: nullSafeBasicStat(goalVsTotalAgg[5]).max / boardSize,
    iteration_5_goalVsTotalStd: nullSafeBasicStat(goalVsTotalAgg[5]).std / boardSize,
    iteration_5_goalVsTotalSum: nullSafeBasicStat(goalVsTotalAgg[5]).sum / boardSize / 3,

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

    iteration_2_cellCountLargerThanTargetAllMean: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[2]).mean / boardSize,
    iteration_2_cellCountLargerThanTargetAllMin: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[2]).min / boardSize,
    iteration_2_cellCountLargerThanTargetAllMax: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[2]).max / boardSize,
    iteration_2_cellCountLargerThanTargetAllStd: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[2]).std / boardSize,
    iteration_2_cellCountLargerThanTargetAllSum: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[2]).sum / boardSize / 3,

    iteration_3_cellCountLargerThanTargetAllMean: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[3]).mean / boardSize,
    iteration_3_cellCountLargerThanTargetAllMin: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[3]).min / boardSize,
    iteration_3_cellCountLargerThanTargetAllMax: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[3]).max / boardSize,
    iteration_3_cellCountLargerThanTargetAllStd: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[3]).std / boardSize,
    iteration_3_cellCountLargerThanTargetAllSum: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[3]).sum / boardSize / 3,

    iteration_4_cellCountLargerThanTargetAllMean: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[4]).mean / boardSize,
    iteration_4_cellCountLargerThanTargetAllMin: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[4]).min / boardSize,
    iteration_4_cellCountLargerThanTargetAllMax: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[4]).max / boardSize,
    iteration_4_cellCountLargerThanTargetAllStd: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[4]).std / boardSize,
    iteration_4_cellCountLargerThanTargetAllSum: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[4]).sum / boardSize / 3,

    iteration_5_cellCountLargerThanTargetAllMean: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[5]).mean / boardSize,
    iteration_5_cellCountLargerThanTargetAllMin: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[5]).min / boardSize,
    iteration_5_cellCountLargerThanTargetAllMax: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[5]).max / boardSize,
    iteration_5_cellCountLargerThanTargetAllStd: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[5]).std / boardSize,
    iteration_5_cellCountLargerThanTargetAllSum: nullSafeBasicStat(cellCountLargerThanTargetAllAgg[5]).sum / boardSize / 3,

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

    iteration_2_goalVsTotalAllMean: nullSafeBasicStat(gaolVsTotalAllAgg[2]).mean,
    iteration_2_goalVsTotalAllMin: nullSafeBasicStat(gaolVsTotalAllAgg[2]).min,
    iteration_2_goalVsTotalAllMax: nullSafeBasicStat(gaolVsTotalAllAgg[2]).max,
    iteration_2_goalVsTotalAllStd: nullSafeBasicStat(gaolVsTotalAllAgg[2]).std,
    iteration_2_goalVsTotalAllSum: nullSafeBasicStat(gaolVsTotalAllAgg[2]).sum,

    iteration_3_goalVsTotalAllMean: nullSafeBasicStat(gaolVsTotalAllAgg[3]).mean,
    iteration_3_goalVsTotalAllMin: nullSafeBasicStat(gaolVsTotalAllAgg[3]).min,
    iteration_3_goalVsTotalAllMax: nullSafeBasicStat(gaolVsTotalAllAgg[3]).max,
    iteration_3_goalVsTotalAllStd: nullSafeBasicStat(gaolVsTotalAllAgg[3]).std,
    iteration_3_goalVsTotalAllSum: nullSafeBasicStat(gaolVsTotalAllAgg[3]).sum,

    iteration_4_goalVsTotalAllMean: nullSafeBasicStat(gaolVsTotalAllAgg[4]).mean,
    iteration_4_goalVsTotalAllMin: nullSafeBasicStat(gaolVsTotalAllAgg[4]).min,
    iteration_4_goalVsTotalAllMax: nullSafeBasicStat(gaolVsTotalAllAgg[4]).max,
    iteration_4_goalVsTotalAllStd: nullSafeBasicStat(gaolVsTotalAllAgg[4]).std,
    iteration_4_goalVsTotalAllSum: nullSafeBasicStat(gaolVsTotalAllAgg[4]).sum,

    iteration_5_goalVsTotalAllMean: nullSafeBasicStat(gaolVsTotalAllAgg[5]).mean,
    iteration_5_goalVsTotalAllMin: nullSafeBasicStat(gaolVsTotalAllAgg[5]).min,
    iteration_5_goalVsTotalAllMax: nullSafeBasicStat(gaolVsTotalAllAgg[5]).max,
    iteration_5_goalVsTotalAllStd: nullSafeBasicStat(gaolVsTotalAllAgg[5]).std,
    iteration_5_goalVsTotalAllSum: nullSafeBasicStat(gaolVsTotalAllAgg[5]).sum,

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
  //
  breaksMinutes: number;
}
