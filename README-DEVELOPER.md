## Suggested workflow:

1. Use the "Automated Feature Suggestion" to find which features should be used
1. See `ml-difficulty-stats.ts` and paste the suggested features into the `FEATURE_SPEC` array
1. Use the "Training" steps below to train the model / generate estimated board completion times

## Automated Feature Suggestion

To explore which features contribute the most to model quality you can run the feature-selection helper:

```shell
npx ts-node -P tsconfig.node.json --compiler-options '{"module":"CommonJS"}' development-tools/feature-selection.ts --help
```

By default it starts from the current `FEATURE_SPEC` and applies greedy forward selection with floating backward elimination (using 5-fold CV). Use the CLI flags to experiment with alternate starting sets, force/limit specific features, or adjust the required RMSE improvement threshold.

## Training

To train the ML model used for predicting how long it will take to solve a board, and therefore how difficult a board is, run the following command:

```shell
npx ts-node -P tsconfig.node.json --compiler-options '{"module":"CommonJS"}' development-tools/train-time-predictor.ts --threads=8
```

This process reads previous solve times from an app backup `development-tools/backup.json` for various boards, and then trains a ML model to be able to predict future solves times from this data.
