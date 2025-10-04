import type { BoardGroupGeneratorV1 } from './grouping.v1';
import type { BoardGroupGeneratorV2 } from './grouping.v2';

/** Version 1 was default generator logic. V2 generates boards 2x faster than V1, however produces 
 * different layouts compared to V1 so can't be used in situations where we need to redraw a V1 board. 
 * Additionally the ML estimates that V2 boards are slightly easier to solve. */
export type BoardGroupVersion = 1 | 1.1 | 2;
type GenericBoardGroupGenerator = BoardGroupGeneratorV1 | BoardGroupGeneratorV2
type GeneratorCtor = new (seed: number) => GenericBoardGroupGenerator;

/**
 * Lazily loads the requested group generator version. Each version module is fetched at most once and cached for reuse.
 */
export class BoardGroupGenerator {
  private static readonly generatorCache = new Map<BoardGroupVersion, GeneratorCtor>();
  private static readonly loadingCache = new Map<BoardGroupVersion, Promise<GeneratorCtor>>();
  private LOG_GENERATION_TIME = false;

  private constructor(private readonly generator: GenericBoardGroupGenerator) { }

  static async create(seed: number, version: BoardGroupVersion = 1): Promise<BoardGroupGenerator> {
    const ctor = await BoardGroupGenerator.loadGenerator(version);
    return new BoardGroupGenerator(new ctor(seed));
  }

  generateRandomContiguousGroups(n: number): number[][] {
    const start = performance.now();
    const board = this.generator.generateRandomContiguousGroups(n);
    if (this.LOG_GENERATION_TIME)
      console.log(performance.now() - start)
    return board;
  }

  private static async loadGenerator(version: BoardGroupVersion): Promise<GeneratorCtor> {
    const cached = BoardGroupGenerator.generatorCache.get(version);
    if (cached)
      return cached;

    let loading = BoardGroupGenerator.loadingCache.get(version);
    if (!loading) {
      loading = BoardGroupGenerator.fetchGeneratorCtor(version)
        .then((ctor) => {
          BoardGroupGenerator.generatorCache.set(version, ctor);
          return ctor;
        })
        .finally(() => {
          BoardGroupGenerator.loadingCache.delete(version);
        });
      BoardGroupGenerator.loadingCache.set(version, loading);
    }

    return loading;
  }


  private static async fetchGeneratorCtor(version: BoardGroupVersion): Promise<GeneratorCtor> {
    switch (version) {
      case 1:
        return (await import('./grouping.v1')).BoardGroupGeneratorV1;
      case 2:
        return (await import('./grouping.v2')).BoardGroupGeneratorV2;
      default:
        throw new Error('Illegal version');
    }
  }
}

