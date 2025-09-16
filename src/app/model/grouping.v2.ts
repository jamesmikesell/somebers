import { Random } from './random';


/**
 * V2 Generator. Faster (3x faster than V1). Used for bulk predictions of game times for difficult / percentile stats.
 * 
 * Cannot be used during training, without accounting for which generator was used to generate the training data.
 */
export class BoardGroupGeneratorV2 {

  private randomNumberGenerator: Random;
  private neighborCache = new Map<number, number[][]>();

  constructor(seed: number) {
    this.randomNumberGenerator = new Random(Random.generateFromSeed(seed) * Number.MAX_SAFE_INTEGER);
  }

  /**
   * Generate an n×n matrix where numbers 1..n each appear exactly n times,
   * and each number's cells form a single 4-connected, randomly shaped region.
   *
   * Strategy: multi-source randomized region growing from n random seeds.
   * If we get stuck (enclosed leftovers), we retry up to maxAttempts times.
   */
  generateRandomContiguousGroups(n: number): number[][] {
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error('n must be a positive integer');
    }

    if (n === 1) {
      return [[1]];
    }

    const totalElements = n * n;
    // max attemtps required per grid size was just based on trial and error observation... not guranateed to be correct, we could still fail to find a solution
    const maxAttempts = 2 ** ((n * 2) - 2);

    const lab = new Int16Array(totalElements);
    const sizes = new Int16Array(n + 1); // sizes[label]
    const frontierPositions = new Int32Array(totalElements);
    const frontierCells: number[][] = Array.from({ length: n + 1 }, () => new Array<number>());
    const activeLabels: number[] = [];
    const activeIndexByLabel = new Int32Array(n + 1);
    const neighborLists = this.getNeighborsForSize(n);
    const scratchOptions = new Int32Array(4);
    const allIdx = new Array<number>(totalElements);
    for (let i = 0; i < totalElements; i++) allIdx[i] = i;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      lab.fill(0);
      sizes.fill(0);
      frontierPositions.fill(-1);
      activeLabels.length = 0;
      activeIndexByLabel.fill(-1);
      for (let label = 1; label <= n; label++) frontierCells[label].length = 0;

      // --- Seed phase: choose n distinct random cells for labels 1..n
      this.shuffleInPlace(allIdx);
      for (let label = 1; label <= n; label++) {
        const seed = allIdx[label - 1];
        lab[seed] = label;
        sizes[label] = 1;

        if (this.hasUnassignedNeighbor(seed, lab, neighborLists)) {
          this.addFrontier(label, seed, frontierCells, frontierPositions, sizes, n, activeLabels, activeIndexByLabel);
        }
      }

      let assigned = n; // seeds assigned
      let stuck = false;

      // --- Growth phase: randomly expand labels until each reaches size n
      while (assigned < totalElements) {
        if (activeLabels.length === 0) {
          stuck = true;
          break;
        }

        const labelIndex = (this.randomNumberGenerator.next() * activeLabels.length) | 0;
        const label = activeLabels[labelIndex];
        const arr = frontierCells[label];
        if (arr.length === 0) {
          this.removeActive(label, activeLabels, activeIndexByLabel);
          continue;
        }

        const frontierIdx = (this.randomNumberGenerator.next() * arr.length) | 0;
        const fCell = arr[frontierIdx];

        let optionCount = 0;
        const neighbors = neighborLists[fCell];
        for (let i = 0; i < neighbors.length; i++) {
          const candidate = neighbors[i];
          if (lab[candidate] === 0) {
            scratchOptions[optionCount++] = candidate;
          }
        }

        if (optionCount === 0) {
          this.removeFrontier(label, fCell, frontierCells, frontierPositions, sizes, n, activeLabels, activeIndexByLabel);
          continue;
        }

        const pick = scratchOptions[(this.randomNumberGenerator.next() * optionCount) | 0];

        // Assign picked cell to the label
        lab[pick] = label;
        sizes[label]++;
        assigned++;

        if (sizes[label] >= n) {
          this.clearFrontier(label, frontierCells, frontierPositions, activeLabels, activeIndexByLabel);
        } else if (this.hasUnassignedNeighbor(pick, lab, neighborLists)) {
          this.addFrontier(label, pick, frontierCells, frontierPositions, sizes, n, activeLabels, activeIndexByLabel);
        }

        if (!this.hasUnassignedNeighbor(fCell, lab, neighborLists)) {
          this.removeFrontier(label, fCell, frontierCells, frontierPositions, sizes, n, activeLabels, activeIndexByLabel);
        }

        // Also, any neighboring cells of *other* labels that lost their last unassigned neighbor
        // will be lazily cleaned up when encountered; no need for global scans.
      }

      if (!stuck) {
        // Build grid from labels
        const grid = Array.from({ length: n }, () => Array(n).fill(0));
        for (let idx = 0; idx < totalElements; idx++) {
          grid[Math.floor(idx / n)][idx % n] = lab[idx];
        }
        return grid;
      }
      // else retry
    }

    throw new Error('Failed to generate after retries; try increasing maxAttempts or using a different n.');
  }

  private addActive(
    label: number,
    sizes: Int16Array,
    maxSize: number,
    activeLabels: number[],
    activeIndexByLabel: Int32Array,
  ): void {
    if (sizes[label] >= maxSize) return;
    if (activeIndexByLabel[label] !== -1) return;
    activeIndexByLabel[label] = activeLabels.length;
    activeLabels.push(label);
  }

  private removeActive(
    label: number,
    activeLabels: number[],
    activeIndexByLabel: Int32Array,
  ): void {
    const idx = activeIndexByLabel[label];
    if (idx === -1) return;
    const lastIdx = activeLabels.length - 1;
    const lastLabel = activeLabels[lastIdx];
    activeLabels[idx] = lastLabel;
    activeIndexByLabel[lastLabel] = idx;
    activeLabels.pop();
    activeIndexByLabel[label] = -1;
  }

  private addFrontier(
    label: number,
    cell: number,
    frontierCells: number[][],
    frontierPositions: Int32Array,
    sizes: Int16Array,
    maxSize: number,
    activeLabels: number[],
    activeIndexByLabel: Int32Array,
  ): void {
    if (frontierPositions[cell] !== -1) return;
    const arr = frontierCells[label];
    frontierPositions[cell] = arr.length;
    arr.push(cell);
    if (arr.length === 1) {
      this.addActive(label, sizes, maxSize, activeLabels, activeIndexByLabel);
    }
  }

  private removeFrontier(
    label: number,
    cell: number,
    frontierCells: number[][],
    frontierPositions: Int32Array,
    sizes: Int16Array,
    maxSize: number,
    activeLabels: number[],
    activeIndexByLabel: Int32Array,
  ): void {
    const pos = frontierPositions[cell];
    if (pos === -1) return;
    const arr = frontierCells[label];
    const lastIdx = arr.length - 1;
    const lastCell = arr[lastIdx];
    if (pos !== lastIdx) {
      arr[pos] = lastCell;
      frontierPositions[lastCell] = pos;
    }
    arr.pop();
    frontierPositions[cell] = -1;
    if (arr.length === 0 || sizes[label] >= maxSize) {
      this.removeActive(label, activeLabels, activeIndexByLabel);
    }
  }

  private clearFrontier(
    label: number,
    frontierCells: number[][],
    frontierPositions: Int32Array,
    activeLabels: number[],
    activeIndexByLabel: Int32Array,
  ): void {
    const arr = frontierCells[label];
    for (let i = 0; i < arr.length; i++) frontierPositions[arr[i]] = -1;
    arr.length = 0;
    this.removeActive(label, activeLabels, activeIndexByLabel);
  }

  private hasUnassignedNeighbor(
    cell: number,
    lab: Int16Array,
    neighborLists: number[][],
  ): boolean {
    const neighbors = neighborLists[cell];
    for (let i = 0; i < neighbors.length; i++) {
      if (lab[neighbors[i]] === 0) {
        return true;
      }
    }
    return false;
  }

  private getNeighborsForSize(gridSize: number): number[][] {
    let cache = this.neighborCache.get(gridSize);
    if (cache) return cache;

    cache = Array.from({ length: gridSize * gridSize }, (_, idx) => {
      const r = Math.floor(idx / gridSize);
      const c = idx % gridSize;
      const res: number[] = [];
      if (r > 0) res.push(idx - gridSize);
      if (r < gridSize - 1) res.push(idx + gridSize);
      if (c > 0) res.push(idx - 1);
      if (c < gridSize - 1) res.push(idx + 1);
      return res;
    });
    this.neighborCache.set(gridSize, cache);
    return cache;
  }

  // Shuffle helper (Fisher-Yates)
  private shuffleInPlace<T>(arr: T[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (this.randomNumberGenerator.next() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

}
