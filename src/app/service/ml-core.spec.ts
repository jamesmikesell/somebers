import { computeFeatureDiagnostics, predictRidge } from './ml-core';
import { RidgeModelJson, ModelJson } from '../model/ml-types';

describe('ml-core predictRidge', () => {
  function makeModel(overrides: Partial<RidgeModelJson>): RidgeModelJson {
    return {
      version: 1,
      modelType: 'ridge',
      features: ['f1', 'f2'],
      lambda: 1e-2,
      transform: 'none',
      featureMeans: [0, 0],
      featureStds: [1, 1],
      weights: [0, 0, 0], // intercept + 2 features
      perSizeMeans: {},
      globalMean: 0,
      ...overrides,
    };
  }

  it('clamps negative predictions to zero for transform "none"', () => {
    const model = makeModel({ weights: [-5, 0, 0], transform: 'none' });
    const y = predictRidge(model, { gameNumber: 1, boardSize: 3, features: [0, 0], target: 0 });
    expect(y).toBe(0);
  });

  it('produces non-negative predictions with log1p transform', () => {
    // raw linear output ~ ln(2) -> expm1 -> ~1
    const model = makeModel({ weights: [Math.log(2), 0, 0], transform: 'log1p' });
    const y = predictRidge(model, { gameNumber: 2, boardSize: 3, features: [0, 0], target: 0 });
    expect(y).toBeGreaterThanOrEqual(0);
    expect(Math.round(y)).toBe(1);
  });

  it('flags NZV and high correlation pairs', () => {
    // Build a tiny synthetic training set with:
    // - feature 0: constant (NZV)
    // - feature 1 and 2: perfectly correlated
    const train = [
      { gameNumber: 1, boardSize: 3, target: 10, features: [5, 1, 2] },
      { gameNumber: 2, boardSize: 3, target: 20, features: [5, 2, 4] },
      { gameNumber: 3, boardSize: 3, target: 30, features: [5, 3, 6] },
    ];
    const diag = computeFeatureDiagnostics(train, 0.98, 1e-9);
    expect(diag.nzvIndices).toContain(0);
    expect(diag.highCorrPairs.some((p) => (p.i === 1 && p.j === 2) || (p.i === 2 && p.j === 1))).toBeTrue();
  });
});
