import { TestBed } from '@angular/core/testing';
import { ColorGridOptimizerService } from './color-grid-optimizer.service';
import { ColorContrastSortService } from './color-contrast-sort.service';

describe('ColorGridOptimizerService', () => {
  let svc: ColorGridOptimizerService;
  let contrast: ColorContrastSortService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    svc = TestBed.inject(ColorGridOptimizerService);
    contrast = TestBed.inject(ColorContrastSortService);
  });

  it('maximizes contrast for unique touching pair counted once', () => {
    const grid = [
      [1, 2],
      [2, 1],
    ];
    const colors = ['#000000', '#ffffff', '#777777'];
    const result = svc.assignColors(colors, grid);

    const c1 = result.colorByNumber.get(1)!;
    const c2 = result.colorByNumber.get(2)!;
    expect(c1).toBeDefined();
    expect(c2).toBeDefined();
    expect(c1).not.toBe(c2);

    // Only one unique touching pair exists: (1,2)
    const expected = contrast.deltaE(c1, c2);
    expect(result.score).toBeCloseTo(expected, 6);
  });

  it('reuses colors when palette is smaller than numbers and alternates to keep neighbors high-contrast', () => {
    const grid = [[1, 2, 3]];
    const colors = ['#000000', '#ffffff'];
    const result = svc.assignColors(colors, grid);

    const c1 = result.colorByNumber.get(1)!;
    const c2 = result.colorByNumber.get(2)!;
    const c3 = result.colorByNumber.get(3)!;
    expect(c1).toBeDefined();
    expect(c2).toBeDefined();
    expect(c3).toBeDefined();

    // Neighbors should differ to maximize each edge contribution
    expect(c1).not.toBe(c2);
    expect(c2).not.toBe(c3);

    // Score should be sum of two edges
    const expected = contrast.deltaE(c1, c2) + contrast.deltaE(c2, c3);
    expect(result.score).toBeCloseTo(expected, 6);
  });
});

