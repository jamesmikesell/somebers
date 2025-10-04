import { Random } from './random';


/**
 * V1 Generator. Slower (2x slower than V2). Used for in-game board as switching to v2 would change game layouts.
 */
export class BoardGroupGeneratorV1 {

  private randomNumberGenerator: Random;

  constructor(
    seed: number,
  ) {
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
    if (!Number.isInteger(n) || n <= 0)
      throw new Error('n must be a positive integer');

    if (n === 1)
      return [[1]];

    const totalElements = n * n;
    const neighborsByIndex = this.buildNeighborCache(n);
    const shuffledIndices = new Array<number>(totalElements);
    const candidateBuffer = new Array<number>(n);
    const optionBuffer = new Array<number>(4);
    // max attemtps required per grid size was just based on trial and error observation... not guranateed to be correct, we could still fail to find a solution
    let maxAttempts = 2 ** ((n * 2) - 2);
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      for (let i = 0; i < totalElements; i++) shuffledIndices[i] = i;
      this.shuffleInPlace(shuffledIndices);

      // 0 = unassigned; otherwise label 1..n
      const lab = new Int16Array(totalElements);
      const sizes = new Int16Array(n + 1); // sizes[label]
      // Frontier: for each label, cells of that label that have at least one unassigned neighbor
      const frontier: Array<Set<number>> = Array.from({ length: n + 1 }, () => new Set<number>());

      // --- Seed phase: choose n distinct random cells for labels 1..n
      for (let label = 1; label <= n; label++) {
        const seed = shuffledIndices[label - 1];
        lab[seed] = label;
        sizes[label] = 1;

        // Initialize frontier with the seed if it borders any unassigned neighbor
        if (this.hasUnassignedNeighbor(seed, lab, neighborsByIndex[seed])) frontier[label].add(seed);
      }

      let assigned = n; // seeds assigned
      let stuck = false;

      // --- Growth phase: randomly expand labels until each reaches size n
      while (assigned < totalElements) {
        // Choose a random label that isn't full and has a frontier
        let candidateCount = 0;
        for (let label = 1; label <= n; label++) {
          if (sizes[label] < n && frontier[label].size > 0) candidateBuffer[candidateCount++] = label;
        }
        if (candidateCount === 0) { stuck = true; break; }

        const label = candidateBuffer[(this.randomNumberGenerator.next() * candidateCount) | 0];

        // Pick a random frontier cell for this label
        const fCell = this.pickRandomFromSet(frontier[label]);

        // Among its unassigned neighbors, pick one at random to claim
        const neighborsOfFCell = neighborsByIndex[fCell];
        let optionCount = 0;
        for (let i = 0; i < neighborsOfFCell.length; i++) {
          const neighbor = neighborsOfFCell[i];
          if (lab[neighbor] === 0) optionBuffer[optionCount++] = neighbor;
        }
        if (optionCount === 0) {
          // This frontier cell is stale; remove and continue
          frontier[label].delete(fCell);
          continue;
        }
        const pick = optionBuffer[(this.randomNumberGenerator.next() * optionCount) | 0];

        // Assign picked cell to the label
        lab[pick] = label;
        sizes[label]++;
        assigned++;

        // Update frontier for this label:
        //   - The picked cell becomes frontier if it borders any unassigned neighbor
        if (this.hasUnassignedNeighbor(pick, lab, neighborsByIndex[pick])) {
          frontier[label].add(pick);
        }
        //   - The original frontier cell might still border unassigned; keep or drop accordingly
        if (!this.hasUnassignedNeighbor(fCell, lab, neighborsByIndex[fCell])) {
          frontier[label].delete(fCell);
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

  private hasUnassignedNeighbor(idx: number, lab: Int16Array, neighbors: readonly number[]): boolean {
    for (let i = 0; i < neighbors.length; i++) {
      if (lab[neighbors[i]] === 0) return true;
    }
    return false;
  }


  private buildNeighborCache(gridSize: number): number[][] {
    const total = gridSize * gridSize;
    const cache = new Array<number[]>(total);
    for (let idx = 0; idx < total; idx++) {
      const row = Math.floor(idx / gridSize);
      const col = idx - (row * gridSize);
      const neighbors: number[] = [];
      if (row > 0) neighbors.push(idx - gridSize);
      if (row < gridSize - 1) neighbors.push(idx + gridSize);
      if (col > 0) neighbors.push(idx - 1);
      if (col < gridSize - 1) neighbors.push(idx + 1);
      cache[idx] = neighbors;
    }
    return cache;
  }


  private pickRandomFromSet(values: Set<number>): number {
    const target = (this.randomNumberGenerator.next() * values.size) | 0;
    let index = 0;
    for (const value of values) {
      if (index === target) return value;
      index++;
    }
    throw new Error('Attempted to pick from an empty set.');
  }


  // Shuffle helper (Fisher-Yates)
  private shuffleInPlace(arr: number[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (this.randomNumberGenerator.next() * (i + 1)) | 0;
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
  }

}
