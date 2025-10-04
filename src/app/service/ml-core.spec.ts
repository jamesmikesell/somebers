import { computeFeatureDiagnostics, predictRidge, RawGenericFeatureSet, toSample, trainBestModel } from './ml-core';
import { RidgeModelJson } from '../model/ml-types';
import { FEATURE_SPEC } from './ml-difficulty-stats';

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

describe('ml-core k-fold cross validation (optional)', () => {
  function makeRawFromFeatures(gameNumber: number, boardSize: number, features: number[], timeSpent: number): any {
    const obj: any = { gameNumber, boardSize, timeSpent };
    for (let i = 0; i < FEATURE_SPEC.keys.length; i++) obj[FEATURE_SPEC.keys[i]] = features[i] ?? 0;
    return obj;
  }

  it('selects a reasonable model using 5-fold CV', () => {
    const d = FEATURE_SPEC.keys.length;
    const rng = (() => { let t = 1234; return () => { t = (t * 1664525 + 1013904223) >>> 0; return (t >>> 8) / 0x01000000; }; })();
    const samples: any[] = [];
    const N = 60;
    for (let i = 0; i < N; i++) {
      const boardSize = i % 2 === 0 ? 3 : 6;
      const x = i % 10;
      const feats = new Array(d).fill(0);
      // Inject signal in first few positions; others small values
      feats[0] = boardSize; // corresponds to 'boardSize'
      if (d > 1) feats[1] = x;
      if (d > 2) feats[2] = x + 2;
      if (d > 3) feats[3] = 10 - x;
      for (let j = 4; j < d; j++) feats[j] = (j % 3) + (x % 3);
      const noise = (rng() - 0.5) * 200; // +/- 100ms noise
      const timeSpent = 10000 + 1500 * boardSize + 120 * (feats[1] ?? 0) + 50 * (feats[3] ?? 0) + noise;
      samples.push(makeRawFromFeatures(i + 1, boardSize, feats, timeSpent));
    }

    const { best, baseline } = trainBestModel(samples, 1337, { useKFold: true, k: 5 });
    expect(isFinite(best.metrics.rmse)).toBeTrue();
    expect(isFinite(baseline.metrics.rmse)).toBeTrue();
    // Expect ridge to do at least as well as baseline on this synthetic linear data
    // Allow equality due to potential tie-breakers.
    expect(best.metrics.rmse).toBeLessThanOrEqual(baseline.metrics.rmse + 1e-6);
  });
});

describe('ml-core configurable feature keys', () => {
  it('supports training with custom feature subsets', () => {
    const featureKeys = ['fooFeature', 'barFeature'];
    const rawSamples: RawGenericFeatureSet[] = [];
    for (let i = 0; i < 40; i++) {
      const boardSize = i % 2 === 0 ? 5 : 7;
      const foo = i;
      const bar = (i % 3) - 1; // cycles -1, 0, 1
      const base = boardSize === 5 ? 12000 : 15000;
      const timeSpent = base + 600 * foo - 800 * bar;
      rawSamples.push({
        gameNumber: i + 1,
        boardSize,
        timeSpent,
        fooFeature: foo,
        barFeature: bar,
      });
    }

    const { best, baseline } = trainBestModel(rawSamples, 2024, { useKFold: true, k: 4, featureKeys });
    expect(best.model.features).toEqual(featureKeys);
    expect(best.model.modelType).toBe('ridge');
    expect(best.metrics.rmse).toBeLessThan(baseline.metrics.rmse);

    const sample = toSample(rawSamples[0], featureKeys);
    expect(sample?.features).toEqual([
      rawSamples[0]['fooFeature'],
      rawSamples[0]['barFeature'],
    ]);
  });
});
