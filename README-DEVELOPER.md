
To train the ML model used for predicting how long it will take to solve a board, and therefore how difficult a board is, run the following command:

```shell
npx ts-node -P tsconfig.node.json --compiler-options '{"module":"CommonJS"}' development-tools/train-time-predictor.ts --threads=8
```

This process reads previous solve times from an app backup `development-tools/backup.json` for various boards, and then trains a ML model to be able to predict future solves times from this data.

