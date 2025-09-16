import { BoardGroupGeneratorV1 } from './grouping.v1';
import { BoardGroupGeneratorV2 } from './grouping.v2';

export class BoardGroupGenerator {

  private generator: BoardGroupGeneratorV1 | BoardGroupGeneratorV2;

  constructor(seed: number, private version: 1 | 2 = 1) {
    if (version === 1)
      this.generator = new BoardGroupGeneratorV1(seed);
    else if (version === 2)
      this.generator = new BoardGroupGeneratorV2(seed);
    else
      throw new Error("Illegal version");
  }

  generateRandomContiguousGroups(n: number): number[][] {
    return this.generator.generateRandomContiguousGroups(n);
  }

}

