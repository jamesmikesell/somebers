import { FeatureSpec } from '../model/ml-types';
import { BoardStats, SectionStats, TotalsStats } from './board-stat-analyzer';
import { RawGenericFeatureSet, solveLinearSystem } from './ml-core';

const SERIES_SUMMARY_SUFFIXES = ['First', 'Last', 'Delta', 'LinearCoef', 'QuadraticCoef', 'CubicCoef', 'Average', 'StdDev'] as const;


interface MetricConfig {
  key: keyof BasicStats;
  name: string;
  scale?: (value: number, boardSize: number) => number;
}

const divideByBoardSize = (value: number, boardSize: number): number => boardSize ? value / boardSize : 0;

const FALSE_POSITIVE_METRICS: readonly MetricConfig[] = [
  { key: 'mean', name: 'Mean' },
  {
    key: 'max',
    name: 'Max',
    scale: (value, _boardSize) => value,
  },
  { key: 'std', name: 'Std' },
];

const REQUIRED_CELL_METRICS: readonly MetricConfig[] = [
  { key: 'mean', name: 'Mean', scale: divideByBoardSize },
  { key: 'max', name: 'Max', scale: divideByBoardSize },
  { key: 'std', name: 'Std', scale: divideByBoardSize },
];

const UNUSABLE_CELL_METRICS: readonly MetricConfig[] = [
  { key: 'mean', name: 'Mean', scale: divideByBoardSize },
  { key: 'max', name: 'Max', scale: divideByBoardSize },
  { key: 'std', name: 'Std', scale: divideByBoardSize },
];

const REQUIRED_VS_GOAL_METRICS: readonly MetricConfig[] = [
  { key: 'mean', name: 'Mean' },
  { key: 'std', name: 'Std' },
  { key: 'max', name: 'Max' },
];

const UNUSABLE_VS_GOAL_METRICS: readonly MetricConfig[] = [
  { key: 'mean', name: 'Mean' },
  { key: 'std', name: 'Std' },
  { key: 'max', name: 'Max' },
];

const ACTIONABLE_CELL_METRICS: readonly MetricConfig[] = [
  { key: 'mean', name: 'Mean', scale: divideByBoardSize },
  { key: 'max', name: 'Max', scale: divideByBoardSize },
  { key: 'std', name: 'Std', scale: divideByBoardSize },
];

const UNACTIONABLE_CELL_METRICS: readonly MetricConfig[] = [
  { key: 'mean', name: 'Mean', scale: divideByBoardSize },
  { key: 'max', name: 'Max', scale: divideByBoardSize },
  { key: 'std', name: 'Std', scale: divideByBoardSize },
];

const CELL_COUNT_LARGER_METRICS: readonly MetricConfig[] = [
  { key: 'mean', name: 'Mean', scale: divideByBoardSize },
  { key: 'std', name: 'Std', scale: divideByBoardSize },
];

const GOAL_VS_TOTAL_METRICS: readonly MetricConfig[] = [
  { key: 'mean', name: 'Mean', scale: divideByBoardSize },
  { key: 'max', name: 'Max', scale: divideByBoardSize },
  { key: 'std', name: 'Std', scale: divideByBoardSize },
];

const GOAL_VS_TOTAL_ALL_METRICS: readonly MetricConfig[] = [
  { key: 'mean', name: 'Mean' },
  { key: 'max', name: 'Max' },
  { key: 'std', name: 'Std' },
];

const ITERATION_SERIES_DEFINITIONS = [
  { prefix: 'falsePositive', metrics: FALSE_POSITIVE_METRICS },
  { prefix: 'requiredCells', metrics: REQUIRED_CELL_METRICS },
  { prefix: 'unusableCells', metrics: UNUSABLE_CELL_METRICS },
  { prefix: 'requiredVsGoal', metrics: REQUIRED_VS_GOAL_METRICS },
  { prefix: 'unusableVsGoal', metrics: UNUSABLE_VS_GOAL_METRICS },
  { prefix: 'actionableCells', metrics: ACTIONABLE_CELL_METRICS },
  { prefix: 'unactionableCells', metrics: UNACTIONABLE_CELL_METRICS },
  { prefix: 'crossFalsePositive', metrics: FALSE_POSITIVE_METRICS },
  { prefix: 'crossRequiredCells', metrics: REQUIRED_CELL_METRICS },
  { prefix: 'crossUnusableCells', metrics: UNUSABLE_CELL_METRICS },
  { prefix: 'crossRequiredVsGoal', metrics: REQUIRED_VS_GOAL_METRICS },
  { prefix: 'crossUnusableVsGoal', metrics: UNUSABLE_VS_GOAL_METRICS },
  { prefix: 'crossActionableCells', metrics: ACTIONABLE_CELL_METRICS },
  { prefix: 'crossUnactionableCells', metrics: UNACTIONABLE_CELL_METRICS },
  { prefix: 'crossAppliedActedUponCells', metrics: ACTIONABLE_CELL_METRICS },
  { prefix: 'crossReferenceUnresolvedCells', metrics: ACTIONABLE_CELL_METRICS },
  { prefix: 'crossReferenceResolvableCells', metrics: ACTIONABLE_CELL_METRICS },
  { prefix: 'crossAppliedSelectedCells', metrics: REQUIRED_CELL_METRICS },
  { prefix: 'crossAppliedClearedCells', metrics: UNUSABLE_CELL_METRICS },
  { prefix: 'cellsLargerThanTarget', metrics: CELL_COUNT_LARGER_METRICS },
  { prefix: 'goalVsTotal', metrics: GOAL_VS_TOTAL_METRICS },
  { prefix: 'goalVsTotalAll', metrics: GOAL_VS_TOTAL_ALL_METRICS },
] as const;

function expandSeriesKeys(prefix: string): string[] {
  return SERIES_SUMMARY_SUFFIXES.map((suffix) => `${prefix}${suffix}`);
}

function expandMetricKeys(prefix: string, metrics: readonly MetricConfig[]): string[] {
  return metrics.flatMap((metric) =>
    SERIES_SUMMARY_SUFFIXES.map((suffix) => `${prefix}${metric.name}${suffix}`),
  );
}

/** 
 * The following trains on all available keys
 * 
 * This can be used to train on all keys, however keys with zero weight, or high corelation with other 
 * keys will be removed. Manually using only these reduced keys to define this array, can then allow those keys
 * to be used to run the automatic feature selection script.
 *  */
// const FEATURE_KEYS: string[] = [
//   'boardSize',
//   'gameDateAsPercent',
//   'deductionIterations',
//   'unresolvedCellCountAfterDeduction',
//   'percentUnresolvedCellsAfterDeduction',
//   'firstPrincipalDeductionIterations',
//   'firstPrincipalUnresolvedCellCountAfterDeduction',
//   'firstPrincipalPercentUnresolvedCellsAfterDeduction',
//   'firstPrincipalUnResoledCellCount',

//   ...expandSeriesKeys('percentUnresolvedCells'),
//   ...expandSeriesKeys('firstPrincipalPercentUnresolvedCells'),
//   ...ITERATION_SERIES_DEFINITIONS.flatMap((definition) =>
//     expandMetricKeys(definition.prefix, definition.metrics),
//   ),
// ];
const FEATURE_KEYS: string[] = [
  'crossReferenceResolvableCellsMeanAverage',
  'crossReferenceResolvableCellsMeanFirst',
  'gameDateAsPercent',
  'boardSize',
  'crossFalsePositiveMeanFirst',
  'cellsLargerThanTargetStdFirst',
  'firstPrincipalDeductionIterations',
  'percentUnresolvedCellsQuadraticCoef',
  'crossAppliedSelectedCellsMeanStdDev',
  'actionableCellsMaxQuadraticCoef',
  'crossRequiredCellsMeanFirst',
  'percentUnresolvedCellsFirst',
  'crossAppliedClearedCellsStdAverage',
  'crossFalsePositiveStdFirst',
  'firstPrincipalPercentUnresolvedCellsAverage',
  'crossRequiredCellsStdQuadraticCoef',
  'falsePositiveStdQuadraticCoef',
  'crossUnusableCellsMeanFirst',
  'percentUnresolvedCellsDelta',
  'percentUnresolvedCellsAverage',
  'unusableCellsMaxQuadraticCoef',
  'crossAppliedClearedCellsStdFirst',
  'crossActionableCellsMaxStdDev',
  'requiredCellsMaxQuadraticCoef',
  'unusableCellsMeanQuadraticCoef',
  'crossAppliedSelectedCellsStdFirst',
  'unactionableCellsStdCubicCoef',
  'unusableCellsMeanFirst',
  'falsePositiveMeanStdDev',
  'crossActionableCellsMaxFirst',
  'actionableCellsStdQuadraticCoef',
  'requiredCellsMeanQuadraticCoef',
  'requiredCellsStdFirst',
  'cellsLargerThanTargetStdQuadraticCoef',
  'crossUnusableVsGoalMeanQuadraticCoef',
  'goalVsTotalAllMeanQuadraticCoef',
  'goalVsTotalAllMaxQuadraticCoef',
  'requiredVsGoalMeanQuadraticCoef',
  'crossActionableCellsStdQuadraticCoef',
  'crossAppliedActedUponCellsMeanQuadraticCoef',
  'crossAppliedActedUponCellsMaxQuadraticCoef',
  'crossAppliedActedUponCellsStdAverage',
  'crossAppliedActedUponCellsStdFirst',
  'goalVsTotalAllStdFirst',
  'goalVsTotalMeanFirst',
  'unactionableCellsMeanAverage',
  'goalVsTotalAllStdLinearCoef',
  'falsePositiveMeanAverage',
  'goalVsTotalAllMaxStdDev',
  'cellsLargerThanTargetMeanCubicCoef',
  'unactionableCellsStdAverage',
  'goalVsTotalAllStdStdDev',
  'crossUnusableVsGoalStdQuadraticCoef',
  'actionableCellsStdFirst',
  'crossActionableCellsMaxQuadraticCoef',
  'crossUnusableVsGoalStdFirst',
  'unusableCellsMaxCubicCoef',
  'goalVsTotalAllMaxAverage',
  'crossUnactionableCellsMeanCubicCoef',
  'falsePositiveMeanFirst',
  'crossRequiredCellsMaxQuadraticCoef',
  'unresolvedCellCountAfterDeduction',
  'actionableCellsMeanFirst',
  'crossAppliedClearedCellsMaxFirst',
  'falsePositiveMeanDelta',
  'goalVsTotalMeanCubicCoef',
  'falsePositiveMeanQuadraticCoef',
  'unusableCellsStdCubicCoef',
  'goalVsTotalMeanQuadraticCoef',
  'unactionableCellsMeanCubicCoef',
  'crossRequiredCellsStdFirst',
  'deductionIterations',
  'crossFalsePositiveMaxFirst',
  'falsePositiveMaxAverage',
  'goalVsTotalMeanAverage',
  'firstPrincipalPercentUnresolvedCellsFirst',
  'firstPrincipalUnResoledCellCount',
  'unusableVsGoalStdAverage',
  'falsePositiveMeanLast',
  'actionableCellsStdAverage',
  'unusableVsGoalMaxAverage',
  'crossRequiredVsGoalStdCubicCoef',
  'goalVsTotalMaxQuadraticCoef',
  'crossAppliedClearedCellsMaxAverage',
  'crossActionableCellsStdAverage',
  'unusableVsGoalStdQuadraticCoef',
  'unactionableCellsMeanStdDev',
  'actionableCellsMaxStdDev',
  'crossUnusableCellsStdStdDev',
  'goalVsTotalAllMaxLinearCoef',
  'crossRequiredCellsMaxFirst',
  'crossRequiredVsGoalMaxQuadraticCoef',
  'unusableVsGoalMeanFirst',
  'goalVsTotalMaxFirst',
  'cellsLargerThanTargetStdCubicCoef',
  'actionableCellsMeanQuadraticCoef',
  'crossRequiredCellsMaxCubicCoef',
  'crossUnusableVsGoalMaxFirst',
  'crossRequiredVsGoalMeanQuadraticCoef',
  'crossUnactionableCellsStdCubicCoef',
  'unusableCellsMaxAverage',
  'goalVsTotalAllMeanStdDev',
  'falsePositiveMeanLinearCoef',
  'percentUnresolvedCellsCubicCoef',
  'requiredCellsMaxCubicCoef',
  'falsePositiveMaxQuadraticCoef',
  'unusableVsGoalMaxFirst',
  'falsePositiveStdCubicCoef',
  'falsePositiveMaxCubicCoef',
  'crossAppliedSelectedCellsStdCubicCoef',
  'crossRequiredVsGoalMaxFirst',
  'crossUnusableCellsMaxStdDev',
  'crossUnusableCellsMaxFirst',
  'unusableVsGoalStdFirst',
  'goalVsTotalAllStdAverage',
  'actionableCellsMaxAverage',
  'crossAppliedActedUponCellsMeanCubicCoef',
  'goalVsTotalAllMaxFirst',
  'crossAppliedClearedCellsMaxQuadraticCoef',
  'crossRequiredVsGoalStdAverage',
  'falsePositiveStdLast',
  'falsePositiveStdDelta',
  'unactionableCellsStdStdDev',
  'crossUnactionableCellsStdLast',
  'crossRequiredCellsStdAverage',
  'requiredVsGoalStdQuadraticCoef',
  'goalVsTotalStdQuadraticCoef',
  'crossActionableCellsMaxAverage',
  'crossRequiredCellsMaxAverage',
  'unusableCellsMaxStdDev',
  'goalVsTotalStdAverage',
  'cellsLargerThanTargetMeanFirst',
  'goalVsTotalAllMaxCubicCoef',
  'crossAppliedActedUponCellsMaxFirst',
  'crossAppliedSelectedCellsStdAverage',
  'requiredCellsMaxFirst',
  'unusableVsGoalMaxCubicCoef',
  'crossRequiredVsGoalStdQuadraticCoef',
  'crossUnusableCellsStdFirst',
  'crossRequiredVsGoalMeanFirst',
  'crossUnusableVsGoalMeanCubicCoef',
  'crossRequiredVsGoalStdFirst',
  'crossUnusableCellsMaxAverage',
  'crossUnusableCellsMaxQuadraticCoef',
  'cellsLargerThanTargetMeanQuadraticCoef',
  'firstPrincipalPercentUnresolvedCellsCubicCoef',
  'crossAppliedSelectedCellsMaxQuadraticCoef',
  'crossUnusableCellsStdAverage',
  'unactionableCellsMaxAverage',
  'requiredVsGoalMeanFirst',
  'crossUnusableCellsStdCubicCoef',
  'crossUnusableCellsMeanQuadraticCoef',
  'goalVsTotalAllStdCubicCoef',
  'crossUnusableVsGoalStdCubicCoef',
  'firstPrincipalPercentUnresolvedCellsQuadraticCoef',
  'crossAppliedActedUponCellsMeanAverage',
  'crossRequiredCellsMeanCubicCoef',
  'goalVsTotalMeanStdDev',
  'crossFalsePositiveStdLinearCoef',
  'crossUnusableVsGoalMeanFirst',
  'crossRequiredVsGoalMaxAverage',
  'goalVsTotalStdStdDev',
  'unusableVsGoalMeanQuadraticCoef',
  'crossActionableCellsStdFirst',
  'goalVsTotalMaxCubicCoef',
  'unactionableCellsMaxStdDev',
  'falsePositiveMeanCubicCoef',
  'unactionableCellsMaxCubicCoef',
  'crossRequiredVsGoalMeanAverage',
  'crossAppliedClearedCellsMaxCubicCoef',
  'unactionableCellsMaxFirst',
  'crossUnusableVsGoalMaxAverage',
  'crossRequiredVsGoalMeanCubicCoef',
  'requiredVsGoalMaxCubicCoef',
  'falsePositiveMaxLast',
  'goalVsTotalAllMeanAverage',
  'crossAppliedSelectedCellsMaxCubicCoef',
  'crossRequiredCellsMeanQuadraticCoef',
  'crossUnactionableCellsStdAverage',
  'crossAppliedActedUponCellsMaxCubicCoef',
  'requiredVsGoalMaxFirst',
  'unactionableCellsStdQuadraticCoef',
  'falsePositiveStdLinearCoef',
  'crossRequiredCellsStdCubicCoef',
  'falsePositiveMaxDelta',
  'unactionableCellsMaxDelta',
  'crossActionableCellsStdCubicCoef',
  'actionableCellsMaxCubicCoef',
  'crossUnusableCellsMeanCubicCoef',
  'crossFalsePositiveMaxStdDev',
  'crossUnactionableCellsMaxCubicCoef',
  'requiredVsGoalStdCubicCoef',
  'goalVsTotalMaxStdDev',
  'requiredVsGoalMeanCubicCoef',
  'goalVsTotalMaxAverage',
  'actionableCellsMeanCubicCoef',
  'unusableCellsMeanCubicCoef',
  'crossUnactionableCellsMaxAverage',
  'crossAppliedActedUponCellsMaxAverage',
  'requiredVsGoalMaxAverage',
  'requiredCellsStdCubicCoef',
  'requiredCellsMeanCubicCoef',
  'crossUnactionableCellsMaxFirst',
  'crossAppliedActedUponCellsMeanFirst',
  'crossActionableCellsMeanQuadraticCoef',
  'requiredVsGoalStdAverage',
  'unactionableCellsMeanQuadraticCoef',
  'crossUnactionableCellsMeanQuadraticCoef',
  'unusableCellsStdQuadraticCoef',
  'goalVsTotalAllStdQuadraticCoef',
  'falsePositiveMaxStdDev',
  'crossAppliedSelectedCellsMaxFirst',
  'goalVsTotalAllMeanCubicCoef',
  'crossUnactionableCellsStdQuadraticCoef',
  'requiredVsGoalMeanAverage',
  'falsePositiveStdFirst',
  'actionableCellsStdCubicCoef',
  'crossFalsePositiveStdDelta',
  'goalVsTotalAllStdLast',
  'crossUnactionableCellsMeanAverage',
  'goalVsTotalStdFirst',
  'requiredVsGoalStdFirst',
  'crossUnusableCellsStdQuadraticCoef',
  'requiredVsGoalMaxQuadraticCoef',
  'crossActionableCellsMaxCubicCoef',
  'crossRequiredVsGoalMaxCubicCoef',
  'crossUnactionableCellsMaxQuadraticCoef',
  'goalVsTotalStdCubicCoef',
  'requiredCellsMeanFirst',
  'crossAppliedSelectedCellsMaxAverage',
  'crossActionableCellsMeanCubicCoef',
  'crossActionableCellsStdStdDev',
  'crossFalsePositiveMaxDelta',
  'actionableCellsMaxFirst',
  'crossFalsePositiveMaxLinearCoef',
  'crossUnactionableCellsMaxStdDev',
  'goalVsTotalAllMeanFirst',
  'unactionableCellsMaxQuadraticCoef',
  'unusableCellsStdAverage',
  'crossActionableCellsMeanFirst',
  'crossUnusableCellsMaxCubicCoef',
  'unusableCellsMaxFirst',
  'falsePositiveMaxFirst',
  'unusableVsGoalMeanCubicCoef',
  'requiredCellsStdQuadraticCoef',
  'unusableCellsStdFirst',
];

export const FEATURE_SPEC: FeatureSpec = {
  keys: FEATURE_KEYS,
};


export interface GamePlayStats {
  timeSpent: number;
  gameNumber: number;
  gameDateAsPercent: number;
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

  const boardSize = stats.boardSize;
  const rowColStats = (iteration: SectionStats[]): SectionStats[] => iteration.slice(0, boardSize * 2);

  const buildTotalsSeries = (totals: TotalsStats) => {
    const iterationSectionStats = totals.iterationSectionStats;
    return {
      cellCountLargerThanTarget: iterationSectionStats.map(iter => agg(iter.map(s => s.cellCountGreaterThanGoal))),
      falsePositiveSolutionCount: iterationSectionStats.map(iter => agg(iter.map(s => s.falsePositiveSolutionCount))),
      guaranteedRequiredCellCount: iterationSectionStats.map(iter => agg(iter.map(s => s.guaranteedRequiredCellCount))),
      guaranteedUnusableCellCount: iterationSectionStats.map(iter => agg(iter.map(s => s.guaranteedUnusableCellCount))),
      requiredCellCountVsGoal: iterationSectionStats.map(iter => agg(iter.map(s => s.guaranteedRequiredCellCountVsGoal))),
      unusableCellCountVsGoal: iterationSectionStats.map(iter => agg(iter.map(s => s.guaranteedUnusableCellCountVsGoal))),
      actionableCellCount: iterationSectionStats.map(iter => agg(iter.map(s => s.actionableCellsCount))),
      unactionableCellCount: iterationSectionStats.map(iter => agg(iter.map(s => s.unactionableCellsCount))),
      crossFalsePositiveSolutionCount: iterationSectionStats.map(iter => agg(rowColStats(iter).map(s => s.crossFalsePositiveSolutionCount))),
      crossGuaranteedRequiredCellCount: iterationSectionStats.map(iter => agg(rowColStats(iter).map(s => s.crossGuaranteedRequiredCellCount))),
      crossGuaranteedUnusableCellCount: iterationSectionStats.map(iter => agg(rowColStats(iter).map(s => s.crossGuaranteedUnusableCellCount))),
      crossRequiredCellCountVsGoal: iterationSectionStats.map(iter => agg(rowColStats(iter).map(s => s.crossGuaranteedRequiredCellCountVsGoal))),
      crossUnusableCellCountVsGoal: iterationSectionStats.map(iter => agg(rowColStats(iter).map(s => s.crossGuaranteedUnusableCellCountVsGoal))),
      crossActionableCellCount: iterationSectionStats.map(iter => agg(rowColStats(iter).map(s => s.crossActionableCellsCount))),
      crossUnactionableCellCount: iterationSectionStats.map(iter => agg(rowColStats(iter).map(s => s.crossUnactionableCellsCount))),
      crossAppliedSelectedCellCount: iterationSectionStats.map(iter => agg(rowColStats(iter).map(s => s.crossAppliedSelectedCellCount))),
      crossAppliedClearedCellCount: iterationSectionStats.map(iter => agg(rowColStats(iter).map(s => s.crossAppliedClearedCellCount))),
      crossAppliedActedUponCellCount: iterationSectionStats.map(iter => agg(rowColStats(iter).map(s => s.crossAppliedActedUponCellCount))),
      crossReferenceUnresolvedCells: totals.unresolvedCountsPerIteration.map(value => agg([value])),
      crossReferenceResolvableCells: totals.unresolvedCountsPerIteration.map(
        value => agg([Math.max(0, Math.pow(boardSize, 2) - value)]),
      ),
      goal: iterationSectionStats.map(iter => agg(iter.map(s => s.goalSum))),
      goalVsUnselectedSum: iterationSectionStats.map(iter => agg(iter.map(s => s.goalVsUnselectedSum))),
    };
  };

  const totalsSeries = buildTotalsSeries(stats.totals);
  const firstPrincipalSeries = buildTotalsSeries(stats.firstPrincipalsInitialSolve);

  const cellCount = Math.max(1, boardSize * boardSize);
  const boardSizeRatioDenominator = Math.pow(9, 2) - Math.pow(5, 2);
  const boardSizeRatio =
    boardSizeRatioDenominator !== 0
      ? (Math.pow(boardSize, 2) - Math.pow(5, 2)) / boardSizeRatioDenominator
      : 0;
  const features: GameStatFeatures = {
    boardSize: boardSizeRatio,
    gameDateAsPercent: gamePlayStats.gameDateAsPercent,
    deductionIterations: stats.totals.deductionIterations,
    unresolvedCellCountAfterDeduction: stats.totals.unresolvedCellCountAfterDeduction,
    percentUnresolvedCellsAfterDeduction: stats.totals.unresolvedCellCountAfterDeduction / cellCount,
    firstPrincipalDeductionIterations: stats.firstPrincipalsInitialSolve.deductionIterations,
    firstPrincipalUnresolvedCellCountAfterDeduction: stats.firstPrincipalsInitialSolve.unresolvedCellCountAfterDeduction,
    firstPrincipalPercentUnresolvedCellsAfterDeduction: stats.firstPrincipalsInitialSolve.unresolvedCellCountAfterDeduction / cellCount,
    firstPrincipalUnResoledCellCount: stats.firstPrincipalsInitialSolve.unresolvedCellCountAfterBaseDeduction / cellCount,
  };

  summarizeNumericSeries(
    'percentUnresolvedCells',
    stats.totals.unresolvedCountsPerIteration.map(
      (value) => (value ?? 0) / cellCount,
    ),
    features,
  );
  summarizeNumericSeries(
    'firstPrincipalPercentUnresolvedCells',
    stats.firstPrincipalsInitialSolve.unresolvedCountsPerIteration.map(
      (value) => (value ?? 0) / cellCount,
    ),
    features,
  );

  summarizeBasicStatsSeries(
    totalsSeries.falsePositiveSolutionCount,
    'falsePositive',
    FALSE_POSITIVE_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    totalsSeries.guaranteedRequiredCellCount,
    'requiredCells',
    REQUIRED_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    totalsSeries.guaranteedUnusableCellCount,
    'unusableCells',
    UNUSABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    totalsSeries.requiredCellCountVsGoal,
    'requiredVsGoal',
    REQUIRED_VS_GOAL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    totalsSeries.unusableCellCountVsGoal,
    'unusableVsGoal',
    UNUSABLE_VS_GOAL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    totalsSeries.actionableCellCount,
    'actionableCells',
    ACTIONABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    totalsSeries.unactionableCellCount,
    'unactionableCells',
    UNACTIONABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    totalsSeries.crossFalsePositiveSolutionCount,
    'crossFalsePositive',
    FALSE_POSITIVE_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    totalsSeries.crossGuaranteedRequiredCellCount,
    'crossRequiredCells',
    REQUIRED_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    totalsSeries.crossGuaranteedUnusableCellCount,
    'crossUnusableCells',
    UNUSABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    totalsSeries.crossRequiredCellCountVsGoal,
    'crossRequiredVsGoal',
    REQUIRED_VS_GOAL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    totalsSeries.crossUnusableCellCountVsGoal,
    'crossUnusableVsGoal',
    UNUSABLE_VS_GOAL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    totalsSeries.crossActionableCellCount,
    'crossActionableCells',
    ACTIONABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    totalsSeries.crossUnactionableCellCount,
    'crossUnactionableCells',
    UNACTIONABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    totalsSeries.crossAppliedActedUponCellCount,
    'crossAppliedActedUponCells',
    ACTIONABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    totalsSeries.crossAppliedSelectedCellCount,
    'crossAppliedSelectedCells',
    REQUIRED_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    totalsSeries.crossAppliedClearedCellCount,
    'crossAppliedClearedCells',
    UNUSABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    totalsSeries.crossReferenceUnresolvedCells,
    'crossReferenceUnresolvedCells',
    ACTIONABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    totalsSeries.crossReferenceResolvableCells,
    'crossReferenceResolvableCells',
    ACTIONABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    totalsSeries.cellCountLargerThanTarget,
    'cellsLargerThanTarget',
    CELL_COUNT_LARGER_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    totalsSeries.goal,
    'goalVsTotal',
    GOAL_VS_TOTAL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    totalsSeries.goalVsUnselectedSum,
    'goalVsTotalAll',
    GOAL_VS_TOTAL_ALL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    firstPrincipalSeries.falsePositiveSolutionCount,
    'firstPrincipalFalsePositive',
    FALSE_POSITIVE_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    firstPrincipalSeries.guaranteedRequiredCellCount,
    'firstPrincipalRequiredCells',
    REQUIRED_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    firstPrincipalSeries.guaranteedUnusableCellCount,
    'firstPrincipalUnusableCells',
    UNUSABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    firstPrincipalSeries.requiredCellCountVsGoal,
    'firstPrincipalRequiredVsGoal',
    REQUIRED_VS_GOAL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    firstPrincipalSeries.unusableCellCountVsGoal,
    'firstPrincipalUnusableVsGoal',
    UNUSABLE_VS_GOAL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    firstPrincipalSeries.actionableCellCount,
    'firstPrincipalActionableCells',
    ACTIONABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    firstPrincipalSeries.unactionableCellCount,
    'firstPrincipalUnactionableCells',
    UNACTIONABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    firstPrincipalSeries.crossFalsePositiveSolutionCount,
    'firstPrincipalCrossFalsePositive',
    FALSE_POSITIVE_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    firstPrincipalSeries.crossGuaranteedRequiredCellCount,
    'firstPrincipalCrossRequiredCells',
    REQUIRED_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    firstPrincipalSeries.crossGuaranteedUnusableCellCount,
    'firstPrincipalCrossUnusableCells',
    UNUSABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    firstPrincipalSeries.crossRequiredCellCountVsGoal,
    'firstPrincipalCrossRequiredVsGoal',
    REQUIRED_VS_GOAL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    firstPrincipalSeries.crossUnusableCellCountVsGoal,
    'firstPrincipalCrossUnusableVsGoal',
    UNUSABLE_VS_GOAL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    firstPrincipalSeries.crossActionableCellCount,
    'firstPrincipalCrossActionableCells',
    ACTIONABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    firstPrincipalSeries.crossUnactionableCellCount,
    'firstPrincipalCrossUnactionableCells',
    UNACTIONABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    firstPrincipalSeries.crossAppliedActedUponCellCount,
    'firstPrincipalCrossAppliedActedUponCells',
    ACTIONABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    firstPrincipalSeries.crossAppliedSelectedCellCount,
    'firstPrincipalCrossAppliedSelectedCells',
    REQUIRED_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    firstPrincipalSeries.crossAppliedClearedCellCount,
    'firstPrincipalCrossAppliedClearedCells',
    UNUSABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    firstPrincipalSeries.crossReferenceUnresolvedCells,
    'firstPrincipalCrossReferenceUnresolvedCells',
    ACTIONABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    firstPrincipalSeries.crossReferenceResolvableCells,
    'firstPrincipalCrossReferenceResolvableCells',
    ACTIONABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    firstPrincipalSeries.cellCountLargerThanTarget,
    'firstPrincipalCellsLargerThanTarget',
    CELL_COUNT_LARGER_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    firstPrincipalSeries.goal,
    'firstPrincipalGoalVsTotal',
    GOAL_VS_TOTAL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    firstPrincipalSeries.goalVsUnselectedSum,
    'firstPrincipalGoalVsTotalAll',
    GOAL_VS_TOTAL_ALL_METRICS,
    boardSize,
    features,
  );

  const gameMeta: GameStatWithBoard = { gameNumber: gamePlayStats.gameNumber };
  const timeMeta: GameStatWithTimeSpent = { timeSpent: gamePlayStats.timeSpent };

  return { ...features, ...gameMeta, ...timeMeta };
}


function nullSafeBasicStat(stats?: BasicStats): BasicStats {
  if (stats) return stats;
  return { mean: 0, min: 0, max: 0, std: 0, sum: 0 };
}

function summarizeBasicStatsSeries(
  series: (BasicStats | undefined)[],
  prefix: string,
  metrics: readonly MetricConfig[],
  boardSize: number,
  features: Record<string, number>,
): void {
  for (const metric of metrics) {
    const values = series.map((stats, iteration) => {
      const safe = nullSafeBasicStat(stats);
      const raw = safe[metric.key];
      const scaled = metric.scale ? metric.scale(raw, boardSize) : raw;
      return sanitizeNumber(scaled);
    });
    addSeriesSummaries(`${prefix}${metric.name}`, values, features);
  }
}

function summarizeNumericSeries(
  prefix: string,
  values: number[],
  features: Record<string, number>,
): void {
  addSeriesSummaries(prefix, values, features);
}

function addSeriesSummaries(
  prefix: string,
  rawValues: number[],
  features: Record<string, number>,
): void {
  const values = rawValues.length
    ? rawValues.map((value) => sanitizeNumber(value))
    : [0];
  const count = values.length;
  const first = values[0];
  const last = values[count - 1];
  const delta = last - first;
  const xs =
    count > 1
      ? values.map((_, index) => index / (count - 1))
      : values.map(() => 0);
  const linearCoef = computeLinearCoefficient(xs, values);
  const quadraticCoef = computeQuadraticCoefficient(xs, values);
  const cubicCoef = computeCubicCoefficient(xs, values);
  const average = values.reduce((sum, value) => sum + value, 0) / count;
  const variance =
    values.reduce((sum, value) => sum + (value - average) * (value - average), 0) / count;
  const stdDev = Math.sqrt(variance);
  features[`${prefix}First`] = first;
  features[`${prefix}Last`] = last;
  features[`${prefix}Delta`] = delta;
  features[`${prefix}LinearCoef`] = linearCoef;
  features[`${prefix}QuadraticCoef`] = quadraticCoef;
  features[`${prefix}CubicCoef`] = cubicCoef;
  features[`${prefix}Average`] = average;
  features[`${prefix}StdDev`] = stdDev;
}

function computeLinearCoefficient(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n <= 1) return 0;
  const meanX = xs.reduce((sum, value) => sum + value, 0) / n;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / n;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    numerator += dx * (ys[i] - meanY);
    denominator += dx * dx;
  }
  if (Math.abs(denominator) < 1e-9) return 0;
  return sanitizeNumber(numerator / denominator);
}

function computeQuadraticCoefficient(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  let sumX = 0;
  let sumX2 = 0;
  let sumX3 = 0;
  let sumX4 = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2Y = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const y = ys[i];
    const x2 = x * x;
    const x3 = x2 * x;
    const x4 = x2 * x2;
    sumX += x;
    sumX2 += x2;
    sumX3 += x3;
    sumX4 += x4;
    sumY += y;
    sumXY += x * y;
    sumX2Y += x2 * y;
  }
  const A = [
    [n, sumX, sumX2],
    [sumX, sumX2, sumX3],
    [sumX2, sumX3, sumX4],
  ];
  const b = [sumY, sumXY, sumX2Y];
  const coefficients = solveLinearSystem(A, b);
  const quad = coefficients[2] ?? 0;
  return sanitizeNumber(Number.isFinite(quad) ? quad : 0);
}

function computeCubicCoefficient(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 4) return 0;
  let sumX = 0;
  let sumX2 = 0;
  let sumX3 = 0;
  let sumX4 = 0;
  let sumX5 = 0;
  let sumX6 = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2Y = 0;
  let sumX3Y = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const y = ys[i];
    const x2 = x * x;
    const x3 = x2 * x;
    const x4 = x2 * x2;
    const x5 = x3 * x2;
    const x6 = x3 * x3;
    sumX += x;
    sumX2 += x2;
    sumX3 += x3;
    sumX4 += x4;
    sumX5 += x5;
    sumX6 += x6;
    sumY += y;
    sumXY += x * y;
    sumX2Y += x2 * y;
    sumX3Y += x3 * y;
  }
  const A = [
    [n, sumX, sumX2, sumX3],
    [sumX, sumX2, sumX3, sumX4],
    [sumX2, sumX3, sumX4, sumX5],
    [sumX3, sumX4, sumX5, sumX6],
  ];
  const b = [sumY, sumXY, sumX2Y, sumX3Y];
  const coefficients = solveLinearSystem(A, b);
  const cubic = coefficients[3] ?? 0;
  return sanitizeNumber(Number.isFinite(cubic) ? cubic : 0);
}

function sanitizeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}




export interface GameStatWithBoard {
  gameNumber: number;
}


export interface GameStatWithTimeSpent {
  timeSpent: number;
}




// Subset of GameStat features required for prediction. Excludes gameNumber and timeSpent.
export interface GameStatFeatures {
  [key: string]: number;
  boardSize: number;
  gameDateAsPercent: number;
  deductionIterations: number;
  unresolvedCellCountAfterDeduction: number;
  percentUnresolvedCellsAfterDeduction: number;
  firstPrincipalDeductionIterations: number;
  firstPrincipalUnresolvedCellCountAfterDeduction: number;
  firstPrincipalPercentUnresolvedCellsAfterDeduction: number;
  firstPrincipalUnResoledCellCount: number;
}
