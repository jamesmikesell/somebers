import { Random } from "./random";


/**
 * V1 Generator. Slower (3x slower than V2). Used for in-game board as switching to v2 would change game layouts.
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
      throw new Error("n must be a positive integer");

    if (n === 1)
      return [[1]];

    const totalElements = n * n;
    // max attemtps required per grid size was just based on trial and error observation... not guranateed to be correct, we could still fail to find a solution
    let maxAttempts = 2 ** ((n * 2) - 2);
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // 0 = unassigned; otherwise label 1..n
      const lab = new Int16Array(totalElements);
      const sizes = new Int16Array(n + 1); // sizes[label]
      // Frontier: for each label, cells of that label that have at least one unassigned neighbor
      const frontier: Array<Set<number>> = Array.from({ length: n + 1 }, () => new Set<number>());

      // --- Seed phase: choose n distinct random cells for labels 1..n
      const allIdx = Array.from({ length: totalElements }, (_, i) => i);
      this.shuffleInPlace(allIdx);
      for (let label = 1; label <= n; label++) {
        const seed = allIdx[label - 1];
        lab[seed] = label;
        sizes[label] = 1;

        // Initialize frontier with the seed if it borders any unassigned neighbor
        const neigh = this.neighbors(seed, n);
        if (neigh.some(k => lab[k] === 0)) frontier[label].add(seed);
      }

      let assigned = n; // seeds assigned
      let stuck = false;

      // --- Growth phase: randomly expand labels until each reaches size n
      while (assigned < totalElements) {
        // Choose a random label that isn't full and has a frontier
        const candidates: number[] = [];
        for (let label = 1; label <= n; label++) {
          if (sizes[label] < n && frontier[label].size > 0) candidates.push(label);
        }
        if (candidates.length === 0) { stuck = true; break; }

        const label = candidates[(this.randomNumberGenerator.next() * candidates.length) | 0];

        // Pick a random frontier cell for this label
        const fArr = Array.from(frontier[label]);
        const fCell = fArr[(this.randomNumberGenerator.next() * fArr.length) | 0];

        // Among its unassigned neighbors, pick one at random to claim
        const options = this.neighbors(fCell, n).filter(k => lab[k] === 0);
        if (options.length === 0) {
          // This frontier cell is stale; remove and continue
          frontier[label].delete(fCell);
          continue;
        }
        const pick = options[(this.randomNumberGenerator.next() * options.length) | 0];

        // Assign picked cell to the label
        lab[pick] = label;
        sizes[label]++;
        assigned++;

        // Update frontier for this label:
        //   - The picked cell becomes frontier if it borders any unassigned neighbor
        if (this.neighbors(pick, n).some(k => lab[k] === 0)) {
          frontier[label].add(pick);
        }
        //   - The original frontier cell might still border unassigned; keep or drop accordingly
        if (!this.neighbors(fCell, n).some(k => lab[k] === 0)) {
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

    throw new Error("Failed to generate after retries; try increasing maxAttempts or using a different n.");
  }


  private neighbors(idx: number, gridSize: number): number[] {
    const r = Math.floor(idx / gridSize), c = idx % gridSize;
    const res: number[] = [];
    if (r > 0) res.push(idx - gridSize);
    if (r < gridSize - 1) res.push(idx + gridSize);
    if (c > 0) res.push(idx - 1);
    if (c < gridSize - 1) res.push(idx + 1);
    return res;
  };


  // Shuffle helper (Fisher-Yates)
  private shuffleInPlace<T>(arr: T[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (this.randomNumberGenerator.next() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  };

}



