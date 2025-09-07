import { Injectable } from '@angular/core';
import { ColorContrastSortService } from './color-contrast-sort.service';

/**
 * Assigns colors to each distinct number in a 2D grid to maximize total
 * Delta E (CIEDE2000) contrast across touching pairs (up, down, left, right).
 *
 * Notes:
 * - Uses only ColorContrastSortService.deltaE for color distance.
 * - If two numbers touch in multiple places, that pair is counted once.
 * - If the palette has at least as many colors as distinct numbers, a
 *   no-reuse constraint is applied (unique colors per number). Otherwise,
 *   colors may be reused.
 * - Uses greedy initialization plus local hill-climbing refinements.
 */
@Injectable({ providedIn: 'root' })
export class ColorGridOptimizerService {
  constructor(private readonly contrast: ColorContrastSortService) {}

  /**
   * Compute an assignment of colors (strings) to each distinct number in the grid.
   * Returns a map from number -> color and the resulting total contrast score.
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
      return { colorByNumber: map, score: 0 };
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

    // Greedy initialization
    const order = Array.from({ length: n }, (_, i) => i).sort((i, j) => degree[j] - degree[i]);
    const assignment: number[] = Array(n).fill(-1); // color index per node
    const used = new Set<number>();

    // For a seed node, pick color with largest average distance from palette center
    if (order.length > 0) {
      const seed = order[0];
      let bestC = 0; let bestScore = -Infinity;
      for (let c = 0; c < m; c++) {
        // Average contrast to all palette colors (heuristic)
        let s = 0; for (let d = 0; d < m; d++) if (d !== c) s += contrastMatrix[c][d];
        const avg = s / Math.max(1, m - 1);
        if (avg > bestScore) { bestScore = avg; bestC = c; }
      }
      assignment[seed] = bestC; used.add(bestC);
    }

    for (let k = 1; k < order.length; k++) {
      const node = order[k];
      const candidateColors: number[] = [];
      if (enforceUnique) {
        for (let c = 0; c < m; c++) if (!used.has(c)) candidateColors.push(c);
        // If palette nearly exhausted (should not happen when m>=n), fall back to any color
        if (candidateColors.length === 0) for (let c = 0; c < m; c++) candidateColors.push(c);
      } else {
        for (let c = 0; c < m; c++) candidateColors.push(c);
      }

      let bestC = candidateColors[0];
      let bestScore = -Infinity;
      for (const c of candidateColors) {
        let s = 0;
        for (const nb of neighbors[node]) {
          const nbColor = assignment[nb];
          if (nbColor >= 0) s += contrastMatrix[c][nbColor];
        }
        if (s > bestScore) { bestScore = s; bestC = c; }
      }
      assignment[node] = bestC; if (enforceUnique) used.add(bestC);
    }

    // Local improvement: hill climbing on single-node reassignments
    const maxPasses = 20;
    let improved = true; let pass = 0;
    while (improved && pass++ < maxPasses) {
      improved = false;
      for (const node of order) {
        const current = assignment[node];
        const candidateColors: number[] = [];
        if (enforceUnique) {
          for (let c = 0; c < m; c++) if (c === current || !used.has(c)) candidateColors.push(c);
        } else {
          for (let c = 0; c < m; c++) candidateColors.push(c);
        }

        const currentGain = this.localNodeContribution(node, assignment, neighbors, contrastMatrix);
        let bestC = current; let bestGain = currentGain;
        for (const c of candidateColors) {
          if (c === current) continue;
          const delta = this.localNodeContributionWithColor(node, c, assignment, neighbors, contrastMatrix);
          if (delta > bestGain + 1e-9) { bestGain = delta; bestC = c; }
        }
        if (bestC !== current) {
          if (enforceUnique) { used.delete(current); used.add(bestC); }
          assignment[node] = bestC;
          improved = true;
        }
      }

      // Optional pairwise swap improvement when enforcing uniqueness
      if (enforceUnique) {
        outer: for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            const ai = assignment[i], aj = assignment[j];
            const before = this.localNodeContribution(i, assignment, neighbors, contrastMatrix)
              + this.localNodeContribution(j, assignment, neighbors, contrastMatrix);
            assignment[i] = aj; assignment[j] = ai;
            const after = this.localNodeContribution(i, assignment, neighbors, contrastMatrix)
              + this.localNodeContribution(j, assignment, neighbors, contrastMatrix);
            if (after > before + 1e-9) {
              improved = true; // keep swap
            } else {
              // revert
              assignment[i] = ai; assignment[j] = aj;
            }
            if (improved) break outer;
          }
        }
      }
    }

    const total = this.totalScore(assignment, edges, contrastMatrix);
    const result = new Map<number, string>();
    for (let i = 0; i < n; i++) result.set(numbers[i], colors[assignment[i]]);
    return { colorByNumber: result, score: total };
  }

  // --- Scoring helpers ---
  private totalScore(assign: number[], edges: Array<[number, number]>, cm: number[][]): number {
    let s = 0;
    for (const [a, b] of edges) s += cm[assign[a]][assign[b]];
    return s;
  }

  private localNodeContribution(node: number, assign: number[], neighbors: number[][], cm: number[][]): number {
    let s = 0; const c = assign[node];
    for (const nb of neighbors[node]) s += cm[c][assign[nb]];
    return s;
  }

  private localNodeContributionWithColor(node: number, colorIdx: number, assign: number[], neighbors: number[][], cm: number[][]): number {
    let s = 0;
    for (const nb of neighbors[node]) s += cm[colorIdx][assign[nb]];
    return s;
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
}
