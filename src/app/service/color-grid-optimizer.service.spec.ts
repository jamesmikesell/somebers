import { TestBed } from '@angular/core/testing';
import { ColorGridOptimizerService } from './color-grid-optimizer.service';
import { ColorContrastSortService } from './color-contrast-sort.service';

describe('ColorGridOptimizerService', () => {
  let svc: ColorGridOptimizerService;
  let contrast: ColorContrastSortService;

  const permute = <T>(items: T[]): T[][] => {
    if (items.length === 0) return [[]];
    const [first, ...rest] = items;
    const tails = permute(rest);
    const result: T[][] = [];
    for (const tail of tails) {
      for (let i = 0; i <= tail.length; i++) {
        const copy = tail.slice();
        copy.splice(i, 0, first);
        result.push(copy);
      }
    }
    return result;
  };

  const collectEdges = (grid: number[][]): Array<[number, number]> => {
    const rows = grid.length;
    const cols = grid[0].length;
    const edges = new Set<string>();
    const keyForPair = (a: number, b: number) => (a < b ? `${a}|${b}` : `${b}|${a}`);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const current = grid[y][x];
        if (x + 1 < cols) {
          const right = grid[y][x + 1];
          if (current !== right) edges.add(keyForPair(current, right));
        }
        if (y + 1 < rows) {
          const down = grid[y + 1][x];
          if (current !== down) edges.add(keyForPair(current, down));
        }
      }
    }
    return Array.from(edges).map(pair => {
      const [a, b] = pair.split('|').map(Number);
      return [a, b] as [number, number];
    });
  };

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
    expect(result.minContrast).toBeCloseTo(expected, 6);
    expect(result.totalContrast).toBeCloseTo(expected, 6);
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

    const edge1 = contrast.deltaE(c1, c2);
    const edge2 = contrast.deltaE(c2, c3);
    const minEdge = Math.min(edge1, edge2);

    expect(result.score).toBeCloseTo(minEdge, 6);
    expect(result.minContrast).toBeCloseTo(minEdge, 6);
    expect(result.totalContrast).toBeCloseTo(edge1 + edge2, 6);
  });

  it('prioritizes the highest minimum contrast even if a higher total exists', () => {
    const grid = [
      [1, 2],
      [3, 2],
    ];
    const colors = ['#000000', '#111111', '#ffffff'];
    const result = svc.assignColors(colors, grid);

    const c1 = result.colorByNumber.get(1)!;
    const c2 = result.colorByNumber.get(2)!;
    const c3 = result.colorByNumber.get(3)!;

    const edgePairs = collectEdges(grid);
    const assignedEdges = edgePairs.map(([a, b]) => contrast.deltaE(result.colorByNumber.get(a)!, result.colorByNumber.get(b)!));
    const minEdge = Math.min(...assignedEdges);

    const numbers = Array.from(new Set(grid.flat())).sort((a, b) => a - b);
    let bestMin = -Infinity;
    for (const permutation of permute(colors)) {
      const mapping = new Map<number, string>();
      for (let i = 0; i < numbers.length; i++) mapping.set(numbers[i], permutation[i]);
      let candidateMin = Number.POSITIVE_INFINITY;
      for (const [a, b] of edgePairs) {
        const value = contrast.deltaE(mapping.get(a)!, mapping.get(b)!);
        if (value < candidateMin) candidateMin = value;
      }
      if (candidateMin > bestMin + 1e-9) bestMin = candidateMin;
    }

    expect(result.score).toBeCloseTo(bestMin, 6);
    expect(result.minContrast).toBeCloseTo(bestMin, 6);
    expect(minEdge).toBeCloseTo(bestMin, 6);
    const totalAssigned = assignedEdges.reduce((sum, value) => sum + value, 0);
    expect(result.totalContrast).toBeCloseTo(totalAssigned, 6);
  });
});
