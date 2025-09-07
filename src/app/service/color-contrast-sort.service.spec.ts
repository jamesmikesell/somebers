import { TestBed } from '@angular/core/testing';
import { ColorContrastSortService } from './color-contrast-sort.service';

describe('ColorContrastSortService', () => {
  let service: ColorContrastSortService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ColorContrastSortService);
  });

  it('sorts by smallest hue then greedy nearest-neighbor by Delta E', () => {
    const input = ['#00ff00', '#0000ff', '#ff0000', '#ffff00', '#00ffff', '#ff00ff'];
    const sorted = service.sortByHueThenDeltaE(input);

    // Smallest hue should be red (#ff0000, hue ~0)
    expect(sorted[0]).toBe('#ff0000');

    // Greedy nearest-neighbor property: at each step, next is the closest among remaining to the last picked
    for (let i = 0; i < sorted.length - 1; i++) {
      const last = sorted[i];
      const remaining = sorted.slice(i + 1);
      const distances = remaining.map(c => ({ c, d: service.deltaE(last, c) }));
      const minD = Math.min(...distances.map(x => x.d));
      expect(distances[0].d).withContext(`element at position ${i + 2} is not the closest to previous`).toBeCloseTo(minD, 10);
    }

    // Stability: must contain same elements
    expect(sorted.sort()).toEqual(input.slice().sort());
  });

  it('accepts #rgb and rgb(r,g,b) formats', () => {
    const input = ['#f00', 'rgb(0,255,0)', '#00f']; // red, green, blue
    const sorted = service.sortByHueThenDeltaE(input);
    expect(sorted[0]).toBe('#f00'); // smallest hue is red (0deg)

    // Verify greedy nearest-neighbor condition for each step
    for (let i = 0; i < sorted.length - 1; i++) {
      const last = sorted[i];
      const remaining = sorted.slice(i + 1);
      const distances = remaining.map(c => ({ c, d: service.deltaE(last, c) }));
      const minD = Math.min(...distances.map(x => x.d));
      expect(distances[0].d).toBeCloseTo(minD, 10);
    }
  });
});
