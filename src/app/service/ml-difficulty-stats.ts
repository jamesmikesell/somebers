import { FeatureSpec } from '../model/ml-types';
import { BoardStats, SectionStats } from './board-stat-analyzer';
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
//   ...expandSeriesKeys('percentUnresolvedCells'),
//   ...ITERATION_SERIES_DEFINITIONS.flatMap((definition) =>
//     expandMetricKeys(definition.prefix, definition.metrics),
//   ),
// ];
const FEATURE_KEYS: string[] = [
  "boardSize",
  "crossUnusableCellsMaxStdDev",
  "unactionableCellsStdQuadraticCoef",
  "gameDateAsPercent",
  "falsePositiveStdFirst",
  "unactionableCellsStdAverage",
  "requiredCellsMeanStdDev",
  "goalVsTotalAllStdFirst",
  "crossUnusableCellsStdAverage",
  "goalVsTotalStdFirst",
  "crossAppliedClearedCellsStdQuadraticCoef",
  "goalVsTotalMeanQuadraticCoef",
  "crossRequiredCellsMeanStdDev",
  "crossAppliedActedUponCellsMaxDelta",
  "goalVsTotalStdAverage",
  "crossActionableCellsMaxDelta",
  "falsePositiveMaxDelta",
  "falsePositiveStdQuadraticCoef",
  "actionableCellsMaxStdDev",
  "crossAppliedSelectedCellsStdQuadraticCoef",
  "crossAppliedSelectedCellsMeanDelta",
  "crossAppliedActedUponCellsMeanStdDev",
  "goalVsTotalAllMeanQuadraticCoef",
  "actionableCellsMaxLinearCoef",
  "crossUnactionableCellsStdQuadraticCoef",
  "crossFalsePositiveStdQuadraticCoef",
  "unactionableCellsMaxLinearCoef",
  "crossAppliedSelectedCellsMaxStdDev",
  "requiredVsGoalMeanQuadraticCoef",
  "crossRequiredVsGoalStdQuadraticCoef"
];

export const FEATURE_SPEC: FeatureSpec = {
  keys: FEATURE_KEYS,
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

  const boardSize = stats.totals.boardSize;
  const rowColStats = (iteration: SectionStats[]): SectionStats[] => iteration.slice(0, boardSize * 2);

  const cellCountLargerThanTarget = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.cellCountGreaterThanGoal)));
  const falsePositiveSolutionCount = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.falsePositiveSolutionCount)));
  const guaranteedRequiredCellCount = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.guaranteedRequiredCellCount)));
  const guaranteedUnusableCellCount = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.guaranteedUnusableCellCount)));
  const requiredCellCountVsGoal = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.guaranteedRequiredCellCountVsGoal)));
  const unusableCellCountVsGoal = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.guaranteedUnusableCellCountVsGoal)));
  const actionableCellCount = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.actionableCellsCount)));
  const unactionableCellCount = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.unactionableCellsCount)));

  const crossFalsePositiveSolutionCount = stats.totals.iterationSectionStats.map(iter => agg(rowColStats(iter).map(s => s.crossFalsePositiveSolutionCount)));
  const crossGuaranteedRequiredCellCount = stats.totals.iterationSectionStats.map(iter => agg(rowColStats(iter).map(s => s.crossGuaranteedRequiredCellCount)));
  const crossGuaranteedUnusableCellCount = stats.totals.iterationSectionStats.map(iter => agg(rowColStats(iter).map(s => s.crossGuaranteedUnusableCellCount)));
  const crossRequiredCellCountVsGoal = stats.totals.iterationSectionStats.map(iter => agg(rowColStats(iter).map(s => s.crossGuaranteedRequiredCellCountVsGoal)));
  const crossUnusableCellCountVsGoal = stats.totals.iterationSectionStats.map(iter => agg(rowColStats(iter).map(s => s.crossGuaranteedUnusableCellCountVsGoal)));
  const crossActionableCellCount = stats.totals.iterationSectionStats.map(iter => agg(rowColStats(iter).map(s => s.crossActionableCellsCount)));
  const crossUnactionableCellCount = stats.totals.iterationSectionStats.map(iter => agg(rowColStats(iter).map(s => s.crossUnactionableCellsCount)));
  const crossAppliedSelectedCellCount = stats.totals.iterationSectionStats.map(iter => agg(rowColStats(iter).map(s => s.crossAppliedSelectedCellCount)));
  const crossAppliedClearedCellCount = stats.totals.iterationSectionStats.map(iter => agg(rowColStats(iter).map(s => s.crossAppliedClearedCellCount)));
  const crossAppliedActedUponCellCount = stats.totals.iterationSectionStats.map(iter => agg(rowColStats(iter).map(s => s.crossAppliedActedUponCellCount)));
  const crossReferenceUnresolvedCells = stats.totals.unresolvedCountsPerIteration.map(value => agg([value]));
  const crossReferenceResolvableCells = stats.totals.unresolvedCountsPerIteration.map(value => agg([Math.max(0, Math.pow(boardSize, 2) - value)]));

  const goal = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.goalSum)));
  const goalVsUnselectedSum = stats.totals.iterationSectionStats.map(iter => agg(iter.map(s => s.goalVsUnselectedSum)));

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
    percentUnresolvedCellsAfterDeduction:
      stats.totals.unresolvedCellCountAfterDeduction / cellCount,
  };

  summarizeNumericSeries(
    'percentUnresolvedCells',
    stats.totals.unresolvedCountsPerIteration.map(
      (value) => (value ?? 0) / cellCount,
    ),
    features,
  );

  summarizeBasicStatsSeries(
    falsePositiveSolutionCount,
    'falsePositive',
    FALSE_POSITIVE_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    guaranteedRequiredCellCount,
    'requiredCells',
    REQUIRED_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    guaranteedUnusableCellCount,
    'unusableCells',
    UNUSABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    requiredCellCountVsGoal,
    'requiredVsGoal',
    REQUIRED_VS_GOAL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    unusableCellCountVsGoal,
    'unusableVsGoal',
    UNUSABLE_VS_GOAL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    actionableCellCount,
    'actionableCells',
    ACTIONABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    unactionableCellCount,
    'unactionableCells',
    UNACTIONABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    crossFalsePositiveSolutionCount,
    'crossFalsePositive',
    FALSE_POSITIVE_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    crossGuaranteedRequiredCellCount,
    'crossRequiredCells',
    REQUIRED_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    crossGuaranteedUnusableCellCount,
    'crossUnusableCells',
    UNUSABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    crossRequiredCellCountVsGoal,
    'crossRequiredVsGoal',
    REQUIRED_VS_GOAL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    crossUnusableCellCountVsGoal,
    'crossUnusableVsGoal',
    UNUSABLE_VS_GOAL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    crossActionableCellCount,
    'crossActionableCells',
    ACTIONABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    crossUnactionableCellCount,
    'crossUnactionableCells',
    UNACTIONABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    crossAppliedActedUponCellCount,
    'crossAppliedActedUponCells',
    ACTIONABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    crossAppliedSelectedCellCount,
    'crossAppliedSelectedCells',
    REQUIRED_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    crossAppliedClearedCellCount,
    'crossAppliedClearedCells',
    UNUSABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    crossReferenceUnresolvedCells,
    'crossReferenceUnresolvedCells',
    ACTIONABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    crossReferenceResolvableCells,
    'crossReferenceResolvableCells',
    ACTIONABLE_CELL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    cellCountLargerThanTarget,
    'cellsLargerThanTarget',
    CELL_COUNT_LARGER_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    goal,
    'goalVsTotal',
    GOAL_VS_TOTAL_METRICS,
    boardSize,
    features,
  );
  summarizeBasicStatsSeries(
    goalVsUnselectedSum,
    'goalVsTotalAll',
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
}
