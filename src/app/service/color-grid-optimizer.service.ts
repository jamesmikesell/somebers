import { Injectable } from '@angular/core';
import { ColorContrastSortService } from './color-contrast-sort.service';

/**
 * Assigns colors to each distinct number in a 2D grid so the minimum
 * Delta E (CIEDE2000) contrast across touching pairs (up, down, left, right)
 * is as large as possible.
 *
 * Notes:
 * - Uses only ColorContrastSortService.deltaE for color distance metrics.
 * - If two numbers touch in multiple places, that pair is counted once.
 * - If the palette has at least as many colors as distinct numbers, a
 *   no-reuse constraint is applied (unique colors per number). Otherwise,
 *   colors may be reused.
 * - Uses depth-first search with pruning to satisfy uniqueness constraints
 *   while maximizing the minimum contrast.
 */
@Injectable({ providedIn: 'root' })
export class ColorGridOptimizerService {
  constructor(private readonly contrast: ColorContrastSortService) {}

  /**
   * Compute an assignment of colors (strings) to each distinct number in the grid.
   * Returns a map from number -> color and the resulting minimum contrast score.
   */
  assignColors(colors: string[], grid: number[][]): ColorAssignmentResult {
    if (!Array.isArray(colors) || colors.length === 0) {
      throw new Error('colors must be a non-empty array of strings');
    }
    if (!Array.isArray(grid) || grid.length === 0 || !Array.isArray(grid[0]) || grid[0].length === 0) {
      throw new Error('grid must be a non-empty number[][]');
    }

    const rows = grid.length;
    const cols = grid[0].length;
    for (let r = 1; r < rows; r++) {
      if (!Array.isArray(grid[r]) || grid[r].length !== cols) {
        throw new Error('grid must be rectangular');
      }
    }

    // Collect distinct numbers
    const numberSet = new Set<number>();
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) numberSet.add(grid[y][x]);
    const numbers = Array.from(numberSet.values()).sort((a, b) => a - b);
    const n = numbers.length;

    // Build adjacency (unique touching pairs, no duplicates)
    const edgeKeySet = new Set<string>();
    const idxByNumber = new Map<number, number>();
    numbers.forEach((num, i) => idxByNumber.set(num, i));
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const a = grid[y][x];
        if (x + 1 < cols) {
          const b = grid[y][x + 1];
          if (a !== b) edgeKeySet.add(keyForPair(a, b));
        }
        if (y + 1 < rows) {
          const b = grid[y + 1][x];
          if (a !== b) edgeKeySet.add(keyForPair(a, b));
        }
      }
    }
    const edges: Array<[number, number]> = [];
    edgeKeySet.forEach(k => {
      const [a, b] = parseKey(k);
      edges.push([idxByNumber.get(a)!, idxByNumber.get(b)!]);
    });

    // If no touching pairs, assign arbitrary colors
    if (edges.length === 0) {
      const map = new Map<number, string>();
      for (let i = 0; i < n; i++) map.set(numbers[i], colors[i % colors.length]);
      return { colorByNumber: map, score: 0, minContrast: 0, totalContrast: 0 };
    }

    // Precompute color contrast matrix (Delta E)
    const m = colors.length;
    const contrastMatrix: number[][] = Array.from({ length: m }, () => Array(m).fill(0));
    for (let i = 0; i < m; i++) {
      for (let j = i + 1; j < m; j++) {
        try {
          const de = this.contrast.deltaE(colors[i], colors[j]);
          contrastMatrix[i][j] = de;
          contrastMatrix[j][i] = de;
        } catch (err) {
          console.error('Failed computing deltaE for colors', colors[i], colors[j], err);
          throw err;
        }
      }
    }

    // Graph structure helpers
    const neighbors: number[][] = Array.from({ length: n }, () => [] as number[]);
    for (const [a, b] of edges) { neighbors[a].push(b); neighbors[b].push(a); }
    const degree: number[] = neighbors.map(ns => ns.length);

    // Decision: if enough colors, enforce uniqueness across all numbers.
    const enforceUnique = m >= n;

    const order = Array.from({ length: n }, (_, i) => i).sort((i, j) => {
      const diff = degree[j] - degree[i];
      return diff !== 0 ? diff : i - j;
    });

    const paletteAverages = this.computePaletteAverages(contrastMatrix);
    const { assignment, stats } = this.optimizeAssignment(
      order,
      neighbors,
      contrastMatrix,
      edges,
      enforceUnique,
      paletteAverages,
    );
    const result = new Map<number, string>();
    for (let i = 0; i < n; i++) result.set(numbers[i], colors[assignment[i]]);
    return {
      colorByNumber: result,
      score: stats.minContrast,
      minContrast: stats.minContrast,
      totalContrast: stats.totalContrast,
    };
  }

  private computePaletteAverages(cm: number[][]): number[] {
    const m = cm.length;
    const averages: number[] = Array(m).fill(0);
    for (let i = 0; i < m; i++) {
      let sum = 0;
      for (let j = 0; j < m; j++) if (i !== j) sum += cm[i][j];
      averages[i] = sum / Math.max(1, m - 1);
    }
    return averages;
  }

  private evaluateAssignment(assign: number[], edges: Array<[number, number]>, cm: number[][]): AssignmentStats {
    let minContrast = Number.POSITIVE_INFINITY;
    let totalContrast = 0;
    for (const [a, b] of edges) {
      const value = cm[assign[a]][assign[b]];
      if (value < minContrast) minContrast = value;
      totalContrast += value;
    }
    if (!Number.isFinite(minContrast)) minContrast = 0;
    return { minContrast, totalContrast };
  }

  private optimizeAssignment(
    order: number[],
    neighbors: number[][],
    contrastMatrix: number[][],
    edges: Array<[number, number]>,
    enforceUnique: boolean,
    paletteAverages: number[],
  ): { assignment: number[]; stats: AssignmentStats } {
    const n = order.length;
    const m = contrastMatrix.length;
    const assignment = Array(n).fill(-1);
    const used = enforceUnique ? Array(m).fill(false) : undefined;
    const eps = 1e-9;
    let bestAssignment: number[] | null = null;
    let bestStats: AssignmentStats | null = null;

    const dfs = (pos: number, partialMin: number): void => {
      if (pos === n) {
        const stats = this.evaluateAssignment(assignment, edges, contrastMatrix);
        if (
          !bestStats
          || stats.minContrast > bestStats.minContrast + eps
          || (Math.abs(stats.minContrast - bestStats.minContrast) <= eps
            && stats.totalContrast > bestStats.totalContrast + eps)
        ) {
          bestStats = stats;
          bestAssignment = assignment.slice();
        }
        return;
      }

      const node = order[pos];
      const candidates: Array<{ color: number; nextMin: number; deltaSum: number; priority: number }> = [];

      for (let color = 0; color < m; color++) {
        if (enforceUnique && used && used[color]) continue;
        let nextMin = partialMin;
        let deltaSum = 0;
        let valid = true;
        let neighborCount = 0;
        for (const nb of neighbors[node]) {
          const nbColor = assignment[nb];
          if (nbColor === -1) continue;
          neighborCount++;
          const contrast = contrastMatrix[color][nbColor];
          nextMin = Math.min(nextMin, contrast);
          deltaSum += contrast;
          if (bestStats && contrast + eps < bestStats.minContrast) { valid = false; break; }
        }
        if (!valid) continue;
        if (bestStats && nextMin + eps < bestStats.minContrast) continue;
        const priority = neighborCount > 0 ? nextMin : paletteAverages[color];
        candidates.push({ color, nextMin, deltaSum, priority });
      }

      candidates.sort((a, b) => {
        if (Math.abs(b.priority - a.priority) > eps) return b.priority - a.priority;
        if (Math.abs(b.nextMin - a.nextMin) > eps) return b.nextMin - a.nextMin;
        if (Math.abs(b.deltaSum - a.deltaSum) > eps) return b.deltaSum - a.deltaSum;
        return a.color - b.color;
      });

      for (const candidate of candidates) {
        const color = candidate.color;
        assignment[node] = color;
        if (enforceUnique && used) used[color] = true;
        dfs(pos + 1, candidate.nextMin);
        if (enforceUnique && used) used[color] = false;
        assignment[node] = -1;
      }
    };

    dfs(0, Number.POSITIVE_INFINITY);

    if (!bestAssignment || !bestStats) {
      throw new Error('Failed to assign colors with provided palette');
    }

    return { assignment: bestAssignment, stats: bestStats };
  }
}

// ---------- Local helpers & types ----------
function keyForPair(a: number, b: number): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
function parseKey(k: string): [number, number] {
  const [a, b] = k.split('|').map(Number);
  return [a, b];
}

export interface ColorAssignmentResult {
  colorByNumber: Map<number, string>;
  score: number;
  minContrast: number;
  totalContrast: number;
}

interface AssignmentStats {
  minContrast: number;
  totalContrast: number;
}
