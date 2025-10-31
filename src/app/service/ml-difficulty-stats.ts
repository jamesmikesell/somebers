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
      "iteration_4_GuaranteedUnusableCellCountAllStd",
      "iteration_0_GuaranteedUnusableCellCountAllMean",
      "gameDateAsPercent",
      "boardSize",
      "iteration_2_FalsePositiveSolutionCountAllStd",
      "iteration_1_GuaranteedRequiredCellCountMax",
      "iteration_0_goalVsTotalMin",
      "iteration_0_UnusableCellCountVsGoalAllMax",
      "iteration_1_GuaranteedRequiredCellCountStd",
      "iteration_2_GuaranteedUnusableCellCountAllSum",
      "iteration_2_FalsePositiveSolutionCountAllMax",
      "iteration_0_ActionableCellAllCountStd",
      "iteration_0_goalVsTotalSum",
      "iteration_4_FalsePositiveSolutionCountAllStd",
      "iteration_1_cellCountLargerThanTargetAllSum",
      "iteration_0_ActionableCellAllCountMax",
      "iteration_0_goalVsTotalAllMax",
      "iteration_0_cellCountLargerThanTargetAllStd",
      "iteration_0_goalVsTotalAllMean",
      "iteration_0_FalsePositiveSolutionCountAllMean",
      "iteration_0_cellCountLargerThanTargetAllMean",
      "iteration_0_UnusableCellCountVsGoalAllMin",
      "iteration_0_GuaranteedRequiredCellCountSum",
      "iteration_0_ActionableCellAllCountMean",
      "iteration_2_cellCountLargerThanTargetAllMean",
      "iteration_1_goalVsTotalStd"


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

    iteration_2_FalsePositiveSolutionCountAllMean: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[2]).mean,
    iteration_2_FalsePositiveSolutionCountAllMin: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[2]).min / Math.pow(2, boardSize),
    iteration_2_FalsePositiveSolutionCountAllMax: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[2]).max / Math.pow(2, boardSize),
    iteration_2_FalsePositiveSolutionCountAllStd: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[2]).std,
    iteration_2_FalsePositiveSolutionCountAllSum: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[2]).sum / (Math.pow(2, boardSize) * 3),

    iteration_3_FalsePositiveSolutionCountAllMean: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[3]).mean,
    iteration_3_FalsePositiveSolutionCountAllMin: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[3]).min / Math.pow(2, boardSize),
    iteration_3_FalsePositiveSolutionCountAllMax: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[3]).max / Math.pow(2, boardSize),
    iteration_3_FalsePositiveSolutionCountAllStd: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[3]).std,
    iteration_3_FalsePositiveSolutionCountAllSum: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[3]).sum / (Math.pow(2, boardSize) * 3),

    iteration_4_FalsePositiveSolutionCountAllMean: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[4]).mean,
    iteration_4_FalsePositiveSolutionCountAllMin: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[4]).min / Math.pow(2, boardSize),
    iteration_4_FalsePositiveSolutionCountAllMax: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[4]).max / Math.pow(2, boardSize),
    iteration_4_FalsePositiveSolutionCountAllStd: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[4]).std,
    iteration_4_FalsePositiveSolutionCountAllSum: nullSafeBasicStat(falsePositiveSolutionCountAllAgg[4]).sum / (Math.pow(2, boardSize) * 3),

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

    iteration_2_GuaranteedRequiredCellCountMean: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[2]).mean / boardSize,
    iteration_2_GuaranteedRequiredCellCountMin: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[2]).min / boardSize,
    iteration_2_GuaranteedRequiredCellCountMax: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[2]).max / boardSize,
    iteration_2_GuaranteedRequiredCellCountStd: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[2]).std / boardSize,
    iteration_2_GuaranteedRequiredCellCountSum: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[2]).sum / boardSize / 3,

    iteration_3_GuaranteedRequiredCellCountMean: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[3]).mean / boardSize,
    iteration_3_GuaranteedRequiredCellCountMin: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[3]).min / boardSize,
    iteration_3_GuaranteedRequiredCellCountMax: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[3]).max / boardSize,
    iteration_3_GuaranteedRequiredCellCountStd: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[3]).std / boardSize,
    iteration_3_GuaranteedRequiredCellCountSum: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[3]).sum / boardSize / 3,

    iteration_4_GuaranteedRequiredCellCountMean: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[4]).mean / boardSize,
    iteration_4_GuaranteedRequiredCellCountMin: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[4]).min / boardSize,
    iteration_4_GuaranteedRequiredCellCountMax: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[4]).max / boardSize,
    iteration_4_GuaranteedRequiredCellCountStd: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[4]).std / boardSize,
    iteration_4_GuaranteedRequiredCellCountSum: nullSafeBasicStat(guaranteedRequiredCellCountAllAgg[4]).sum / boardSize / 3,

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

    iteration_2_GuaranteedUnusableCellCountAllMean: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[2]).mean / boardSize,
    iteration_2_GuaranteedUnusableCellCountAllMin: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[2]).min / boardSize,
    iteration_2_GuaranteedUnusableCellCountAllMax: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[2]).max / boardSize,
    iteration_2_GuaranteedUnusableCellCountAllStd: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[2]).std / boardSize,
    iteration_2_GuaranteedUnusableCellCountAllSum: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[2]).sum / boardSize / 3,

    iteration_3_GuaranteedUnusableCellCountAllMean: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[3]).mean / boardSize,
    iteration_3_GuaranteedUnusableCellCountAllMin: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[3]).min / boardSize,
    iteration_3_GuaranteedUnusableCellCountAllMax: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[3]).max / boardSize,
    iteration_3_GuaranteedUnusableCellCountAllStd: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[3]).std / boardSize,
    iteration_3_GuaranteedUnusableCellCountAllSum: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[3]).sum / boardSize / 3,

    iteration_4_GuaranteedUnusableCellCountAllMean: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[4]).mean / boardSize,
    iteration_4_GuaranteedUnusableCellCountAllMin: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[4]).min / boardSize,
    iteration_4_GuaranteedUnusableCellCountAllMax: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[4]).max / boardSize,
    iteration_4_GuaranteedUnusableCellCountAllStd: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[4]).std / boardSize,
    iteration_4_GuaranteedUnusableCellCountAllSum: nullSafeBasicStat(guaranteedUnusableCellCountAllAgg[4]).sum / boardSize / 3,

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

    iteration_2_ActionableCellAllCountMean: nullSafeBasicStat(actionableCellAllCountAllAgg[2]).mean / boardSize,
    iteration_2_ActionableCellAllCountMin: nullSafeBasicStat(actionableCellAllCountAllAgg[2]).min / boardSize,
    iteration_2_ActionableCellAllCountMax: nullSafeBasicStat(actionableCellAllCountAllAgg[2]).max / boardSize,
    iteration_2_ActionableCellAllCountStd: nullSafeBasicStat(actionableCellAllCountAllAgg[2]).std / boardSize,
    iteration_2_ActionableCellAllCountSum: nullSafeBasicStat(actionableCellAllCountAllAgg[2]).sum / boardSize / 3,

    iteration_3_ActionableCellAllCountMean: nullSafeBasicStat(actionableCellAllCountAllAgg[3]).mean / boardSize,
    iteration_3_ActionableCellAllCountMin: nullSafeBasicStat(actionableCellAllCountAllAgg[3]).min / boardSize,
    iteration_3_ActionableCellAllCountMax: nullSafeBasicStat(actionableCellAllCountAllAgg[3]).max / boardSize,
    iteration_3_ActionableCellAllCountStd: nullSafeBasicStat(actionableCellAllCountAllAgg[3]).std / boardSize,
    iteration_3_ActionableCellAllCountSum: nullSafeBasicStat(actionableCellAllCountAllAgg[3]).sum / boardSize / 3,

    iteration_4_ActionableCellAllCountMean: nullSafeBasicStat(actionableCellAllCountAllAgg[4]).mean / boardSize,
    iteration_4_ActionableCellAllCountMin: nullSafeBasicStat(actionableCellAllCountAllAgg[4]).min / boardSize,
    iteration_4_ActionableCellAllCountMax: nullSafeBasicStat(actionableCellAllCountAllAgg[4]).max / boardSize,
    iteration_4_ActionableCellAllCountStd: nullSafeBasicStat(actionableCellAllCountAllAgg[4]).std / boardSize,
    iteration_4_ActionableCellAllCountSum: nullSafeBasicStat(actionableCellAllCountAllAgg[4]).sum / boardSize / 3,

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

    iteration_2_RequiredCellCountVsGoalAllMean: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[2]).mean,
    iteration_2_RequiredCellCountVsGoalAllMin: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[2]).min,
    iteration_2_RequiredCellCountVsGoalAllMax: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[2]).max,
    iteration_2_RequiredCellCountVsGoalAllStd: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[2]).std,
    iteration_2_RequiredCellCountVsGoalAllSum: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[2]).sum,

    iteration_3_RequiredCellCountVsGoalAllMean: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[3]).mean,
    iteration_3_RequiredCellCountVsGoalAllMin: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[3]).min,
    iteration_3_RequiredCellCountVsGoalAllMax: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[3]).max,
    iteration_3_RequiredCellCountVsGoalAllStd: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[3]).std,
    iteration_3_RequiredCellCountVsGoalAllSum: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[3]).sum,

    iteration_4_RequiredCellCountVsGoalAllMean: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[4]).mean,
    iteration_4_RequiredCellCountVsGoalAllMin: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[4]).min,
    iteration_4_RequiredCellCountVsGoalAllMax: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[4]).max,
    iteration_4_RequiredCellCountVsGoalAllStd: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[4]).std,
    iteration_4_RequiredCellCountVsGoalAllSum: nullSafeBasicStat(requiredCellCountVsGoalAllAgg[4]).sum,

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

    iteration_2_UnusableCellCountVsGoalAllMean: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[2]).mean,
    iteration_2_UnusableCellCountVsGoalAllMin: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[2]).min,
    iteration_2_UnusableCellCountVsGoalAllMax: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[2]).max,
    iteration_2_UnusableCellCountVsGoalAllStd: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[2]).std,
    iteration_2_UnusableCellCountVsGoalAllSum: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[2]).sum,

    iteration_3_UnusableCellCountVsGoalAllMean: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[3]).mean,
    iteration_3_UnusableCellCountVsGoalAllMin: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[3]).min,
    iteration_3_UnusableCellCountVsGoalAllMax: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[3]).max,
    iteration_3_UnusableCellCountVsGoalAllStd: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[3]).std,
    iteration_3_UnusableCellCountVsGoalAllSum: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[3]).sum,

    iteration_4_UnusableCellCountVsGoalAllMean: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[4]).mean,
    iteration_4_UnusableCellCountVsGoalAllMin: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[4]).min,
    iteration_4_UnusableCellCountVsGoalAllMax: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[4]).max,
    iteration_4_UnusableCellCountVsGoalAllStd: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[4]).std,
    iteration_4_UnusableCellCountVsGoalAllSum: nullSafeBasicStat(unusableCellCountVsGoalAllAgg[4]).sum,

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
  iteration_2_FalsePositiveSolutionCountAllMean: number;
  iteration_2_FalsePositiveSolutionCountAllMin: number;
  iteration_2_FalsePositiveSolutionCountAllMax: number;
  iteration_2_FalsePositiveSolutionCountAllStd: number;
  iteration_2_FalsePositiveSolutionCountAllSum: number;
  // 
  iteration_3_FalsePositiveSolutionCountAllMean: number;
  iteration_3_FalsePositiveSolutionCountAllMin: number;
  iteration_3_FalsePositiveSolutionCountAllMax: number;
  iteration_3_FalsePositiveSolutionCountAllStd: number;
  iteration_3_FalsePositiveSolutionCountAllSum: number;
  // 
  iteration_4_FalsePositiveSolutionCountAllMean: number;
  iteration_4_FalsePositiveSolutionCountAllMin: number;
  iteration_4_FalsePositiveSolutionCountAllMax: number;
  iteration_4_FalsePositiveSolutionCountAllStd: number;
  iteration_4_FalsePositiveSolutionCountAllSum: number;
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
  iteration_2_GuaranteedRequiredCellCountMean: number;
  iteration_2_GuaranteedRequiredCellCountMin: number;
  iteration_2_GuaranteedRequiredCellCountMax: number;
  iteration_2_GuaranteedRequiredCellCountStd: number;
  iteration_2_GuaranteedRequiredCellCountSum: number;
  //
  iteration_3_GuaranteedRequiredCellCountMean: number;
  iteration_3_GuaranteedRequiredCellCountMin: number;
  iteration_3_GuaranteedRequiredCellCountMax: number;
  iteration_3_GuaranteedRequiredCellCountStd: number;
  iteration_3_GuaranteedRequiredCellCountSum: number;
  //
  iteration_4_GuaranteedRequiredCellCountMean: number;
  iteration_4_GuaranteedRequiredCellCountMin: number;
  iteration_4_GuaranteedRequiredCellCountMax: number;
  iteration_4_GuaranteedRequiredCellCountStd: number;
  iteration_4_GuaranteedRequiredCellCountSum: number;
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
  iteration_2_GuaranteedUnusableCellCountAllMean: number;
  iteration_2_GuaranteedUnusableCellCountAllMin: number;
  iteration_2_GuaranteedUnusableCellCountAllMax: number;
  iteration_2_GuaranteedUnusableCellCountAllStd: number;
  iteration_2_GuaranteedUnusableCellCountAllSum: number;
  //
  iteration_3_GuaranteedUnusableCellCountAllMean: number;
  iteration_3_GuaranteedUnusableCellCountAllMin: number;
  iteration_3_GuaranteedUnusableCellCountAllMax: number;
  iteration_3_GuaranteedUnusableCellCountAllStd: number;
  iteration_3_GuaranteedUnusableCellCountAllSum: number;
  //
  iteration_4_GuaranteedUnusableCellCountAllMean: number;
  iteration_4_GuaranteedUnusableCellCountAllMin: number;
  iteration_4_GuaranteedUnusableCellCountAllMax: number;
  iteration_4_GuaranteedUnusableCellCountAllStd: number;
  iteration_4_GuaranteedUnusableCellCountAllSum: number;
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
  iteration_2_ActionableCellAllCountMean: number;
  iteration_2_ActionableCellAllCountMin: number;
  iteration_2_ActionableCellAllCountMax: number;
  iteration_2_ActionableCellAllCountStd: number;
  iteration_2_ActionableCellAllCountSum: number;
  //
  iteration_3_ActionableCellAllCountMean: number;
  iteration_3_ActionableCellAllCountMin: number;
  iteration_3_ActionableCellAllCountMax: number;
  iteration_3_ActionableCellAllCountStd: number;
  iteration_3_ActionableCellAllCountSum: number;
  //
  iteration_4_ActionableCellAllCountMean: number;
  iteration_4_ActionableCellAllCountMin: number;
  iteration_4_ActionableCellAllCountMax: number;
  iteration_4_ActionableCellAllCountStd: number;
  iteration_4_ActionableCellAllCountSum: number;
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
  iteration_2_RequiredCellCountVsGoalAllMean: number;
  iteration_2_RequiredCellCountVsGoalAllMin: number;
  iteration_2_RequiredCellCountVsGoalAllMax: number;
  iteration_2_RequiredCellCountVsGoalAllStd: number;
  iteration_2_RequiredCellCountVsGoalAllSum: number;
  //
  iteration_3_RequiredCellCountVsGoalAllMean: number;
  iteration_3_RequiredCellCountVsGoalAllMin: number;
  iteration_3_RequiredCellCountVsGoalAllMax: number;
  iteration_3_RequiredCellCountVsGoalAllStd: number;
  iteration_3_RequiredCellCountVsGoalAllSum: number;
  //
  iteration_4_RequiredCellCountVsGoalAllMean: number;
  iteration_4_RequiredCellCountVsGoalAllMin: number;
  iteration_4_RequiredCellCountVsGoalAllMax: number;
  iteration_4_RequiredCellCountVsGoalAllStd: number;
  iteration_4_RequiredCellCountVsGoalAllSum: number;
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
  iteration_2_UnusableCellCountVsGoalAllMean: number;
  iteration_2_UnusableCellCountVsGoalAllMin: number;
  iteration_2_UnusableCellCountVsGoalAllMax: number;
  iteration_2_UnusableCellCountVsGoalAllStd: number;
  iteration_2_UnusableCellCountVsGoalAllSum: number;
  //
  iteration_3_UnusableCellCountVsGoalAllMean: number;
  iteration_3_UnusableCellCountVsGoalAllMin: number;
  iteration_3_UnusableCellCountVsGoalAllMax: number;
  iteration_3_UnusableCellCountVsGoalAllStd: number;
  iteration_3_UnusableCellCountVsGoalAllSum: number;
  //
  iteration_4_UnusableCellCountVsGoalAllMean: number;
  iteration_4_UnusableCellCountVsGoalAllMin: number;
  iteration_4_UnusableCellCountVsGoalAllMax: number;
  iteration_4_UnusableCellCountVsGoalAllStd: number;
  iteration_4_UnusableCellCountVsGoalAllSum: number;
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
