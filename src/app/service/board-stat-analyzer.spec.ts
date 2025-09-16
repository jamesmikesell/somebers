import { TestBed } from '@angular/core/testing';
import { BoardStatAnalyzer } from './board-stat-analyzer';
import { SimpleCell } from '../model/game-board';

describe('DifficultyEstimatorService', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  function cell(v: number, req: boolean, g: number): SimpleCell {
    return { value: v, required: req, groupNumber: g };
  }

  it('evaluates rows, columns, and groups with correct sums and combinations (2x3 grid)', () => {
    // Grid (rows x cols):
    // r0: [ (1,R,g1), (2, ,g2), (3,R,g1) ]   requiredSum row0 = 1 + 3 = 4
    // r1: [ (2, ,g2), (1,R,g1), (1, ,g2) ]   requiredSum row1 = 1
    // Columns requiredSum: c0=1, c1=1, c2=3
    // Group 1 positions (row-major): (0,0)=1[R], (0,2)=3[R], (1,1)=1[R] => requiredSum=5
    // Group 2 positions: (0,1)=2, (1,0)=2, (1,2)=1 => requiredSum=0
    const grid: SimpleCell[][] = [
      [cell(1, true, 1), cell(2, false, 2), cell(3, true, 1)],
      [cell(2, false, 2), cell(1, true, 1), cell(1, false, 2)],
    ];

    const report = BoardStatAnalyzer.evaluate(grid);

    // Totals
    expect(report.totals.rowsEvaluated).toBe(2);
    expect(report.totals.columnsEvaluated).toBe(3);
    expect(report.totals.groupsEvaluated).toBe(2);

    // Rows
    expect(report.rows[0].requiredSum).toBe(4);
    expect(report.rows[0].cellValues).toEqual([1, 2, 3]);
    expect(report.rows[0].requiredIndices).toEqual([0, 2]);
    expect(report.rows[0].firstIterationFalsePositiveSolutionCount).toBe(0); // {1,3}
    expect(report.rows[0].valuesRms).toBeCloseTo(Math.sqrt(14 / 3), 10);

    expect(report.rows[1].requiredSum).toBe(1);
    expect(report.rows[1].cellValues).toEqual([2, 1, 1]);
    expect(report.rows[1].requiredIndices).toEqual([1]);
    expect(report.rows[1].firstIterationFalsePositiveSolutionCount).toBe(1); // either 1 of the two ones
    expect(report.rows[1].valuesRms).toBeCloseTo(Math.sqrt(2), 10);

    // Columns
    expect(report.columns[0].requiredSum).toBe(1);
    expect(report.columns[0].cellValues).toEqual([1, 2]);
    expect(report.columns[0].requiredIndices).toEqual([0]);
    expect(report.columns[0].firstIterationFalsePositiveSolutionCount).toBe(0);
    expect(report.columns[0].valuesRms).toBeCloseTo(Math.sqrt(2.5), 10);

    expect(report.columns[1].requiredSum).toBe(1);
    expect(report.columns[1].cellValues).toEqual([2, 1]);
    expect(report.columns[1].requiredIndices).toEqual([1]);
    expect(report.columns[1].firstIterationFalsePositiveSolutionCount).toBe(0);
    expect(report.columns[1].valuesRms).toBeCloseTo(Math.sqrt(2.5), 10);

    expect(report.columns[2].requiredSum).toBe(3);
    expect(report.columns[2].cellValues).toEqual([3, 1]);
    expect(report.columns[2].requiredIndices).toEqual([0]);
    expect(report.columns[2].firstIterationFalsePositiveSolutionCount).toBe(0);
    expect(report.columns[2].valuesRms).toBeCloseTo(Math.sqrt(5), 10);

    // Groups: sorted by index (groupNumber)
    expect(report.groups.map(g => g.index)).toEqual([1, 2]);

    const g1 = report.groups[0];
    expect(g1.index).toBe(1);
    expect(g1.requiredSum).toBe(5);
    expect(g1.cellValues).toEqual([1, 3, 1]);
    expect(g1.requiredIndices).toEqual([0, 1, 2]);
    expect(g1.firstIterationFalsePositiveSolutionCount).toBe(0); // only {1,3,1}
    expect(g1.valuesRms).toBeCloseTo(Math.sqrt(11 / 3), 10);

    const g2 = report.groups[1];
    expect(g2.index).toBe(2);
    expect(g2.requiredSum).toBe(0);
    expect(g2.cellValues).toEqual([2, 2, 1]);
    expect(g2.requiredIndices).toEqual([]);
    expect(g2.firstIterationFalsePositiveSolutionCount).toBe(0); // empty subset
    expect(g2.valuesRms).toBeCloseTo(Math.sqrt(3), 10);

  });

  it('counts empty subset as exact when requiredSum=0 (row case)', () => {
    const grid: SimpleCell[][] = [
      [cell(1, false, 1), cell(2, false, 1)],
    ];
    const report = BoardStatAnalyzer.evaluate(grid);
    expect(report.rows[0].requiredSum).toBe(0);
    expect(report.rows[0].cellValues).toEqual([1, 2]);
    expect(report.rows[0].requiredIndices).toEqual([]);
    expect(report.rows[0].firstIterationFalsePositiveSolutionCount).toBe(0);
    expect(report.rows[0].valuesRms).toBeCloseTo(Math.sqrt((1 * 1 + 2 * 2) / 2), 10);
  });

  it('handles a column with multiple required cells', () => {
    // 2x1 grid, both required in the single column
    const grid: SimpleCell[][] = [
      [cell(2, true, 1)],
      [cell(3, true, 2)],
    ];
    const report = BoardStatAnalyzer.evaluate(grid);
    expect(report.columns.length).toBe(1);
    expect(report.columns[0].cellValues).toEqual([2, 3]);
    expect(report.columns[0].requiredSum).toBe(5);
    expect(report.columns[0].requiredIndices).toEqual([0, 1]);
    expect(report.columns[0].firstIterationFalsePositiveSolutionCount).toBe(0); // {2,3}
    expect(report.columns[0].valuesRms).toBeCloseTo(Math.sqrt((2 * 2 + 3 * 3) / 2), 10);
  });


});
