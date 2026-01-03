
npx ts-node -P tsconfig.node.json --compiler-options '{"module":"CommonJS"}' \
  development-tools/train-time-predictor.ts \
  --threads=8 \
  --select-metric=rmse