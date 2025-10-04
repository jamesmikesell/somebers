
## Training

To train the ML model used for predicting how long it will take to solve a board, and therefore how difficult a board is, run the following command:

```shell
npx ts-node -P tsconfig.node.json --compiler-options '{"module":"CommonJS"}' development-tools/train-time-predictor.ts --threads=8
```

This process reads previous solve times from an app backup `development-tools/backup.json` for various boards, and then trains a ML model to be able to predict future solves times from this data.



## Automated Feature Suggestion

While there is a tool to automatically try different combinations of features in an attempt to find the optimal features. However, in practice I think this actually ends up over-fitting, as predicted "easy" end up taking 2x as long as predicted.

To explore which features contribute the most to model quality you can run the feature-selection helper:

```shell
npx ts-node -P tsconfig.node.json --compiler-options '{"module":"CommonJS"}' development-tools/feature-selection.ts --help
```

By default it starts from the current `FEATURE_SPEC` and applies greedy forward selection with floating backward elimination (using 5-fold CV). Use the CLI flags to experiment with alternate starting sets, force/limit specific features, or adjust the required RMSE improvement threshold.
