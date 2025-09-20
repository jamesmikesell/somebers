import { DisplayCell } from '../../model/game-board';
import { SectionCompletionAnimator } from './section-completion-animator';

describe('SectionCompletionAnimator', () => {
  let animator: SectionCompletionAnimator;

  beforeEach(() => {
    animator = new SectionCompletionAnimator();
  });

  it('assigns equal delays to group cells with matching distance from the header', () => {
    const header = { cell: createCell(0), row: 0, col: 0 } as any;
    const cells = [
      { cell: createCell(1), row: 0, col: 1 },
      { cell: createCell(2), row: 0, col: 2 },
      { cell: createCell(3), row: 1, col: 0 },
      { cell: createCell(4), row: 1, col: 1 },
      { cell: createCell(5), row: 1, col: 2 },
      { cell: createCell(6), row: 2, col: 0 },
      { cell: createCell(7), row: 2, col: 1 },
      { cell: createCell(8), row: 2, col: 2 },
    ] as any[];

    const { cells: orderedCells, delays } = (animator as any).orderGroupCells(cells, header);

    const delayMap = new Map<DisplayCell, number>();
    orderedCells.forEach((cell: DisplayCell, index: number) => delayMap.set(cell, delays[index]));

    expect(delayMap.get(cells[1].cell)).toBe(delayMap.get(cells[5].cell));
    expect(delayMap.get(cells[1].cell)).toBe(0);
    expect(delayMap.get(cells[0].cell)).toBe(delayMap.get(cells[2].cell));
    expect(delayMap.get(cells[0].cell)).toBe(200);
    expect(Math.max(...delays)).toBe(200);
    expect(Math.min(...delays)).toBe(0);
  });

  it('cascades row cells across 500ms and schedules the header 250ms later', () => {
    const cells = [createCell(1), createCell(2), createCell(3)];
    const header = createCell(99);

    const schedule = (animator as any).buildSectionSchedule(cells, header, 'row');

    const bodyDelays = schedule.segments
      .filter((segment: any) => segment.variant === 'row')
      .map((segment: any) => segment.delay);

    expect(bodyDelays).toEqual([0, 100, 200]);

    const headerSegment = schedule.segments.find((segment: any) => segment.variant === 'row-header');
    expect(headerSegment?.delay).toBe(700);
    expect(schedule.totalDuration).toBe(1300);
  });
});

function createCell(id: number): DisplayCell {
  const cell = new DisplayCell();
  cell.value = id;
  return cell;
}
