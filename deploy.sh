#!/bin/bash
set -euo pipefail

if [ -z "$(git status --porcelain)" ]; then
  old_branch=$(git branch --show-current)
  git checkout -d

  cleanup() {
    git restore .
    git checkout $old_branch
  }
  trap cleanup EXIT

  npm run test -- --watch=false
  rm -rf docs
  rm -rf dist
  version="$(git rev-parse --short HEAD)-$(date +%m%d%y%H%M)"
  echo "export class AppVersion { static readonly VERSION = \"$version\"; }" > src/app/app-version.ts
  echo "{\"version\": \"$version\"}" > public/version.json
  npm run build
  mv dist/numbers/browser docs
  cp CNAME docs/CNAME

  git add -A
  git commit -m "build(deploy): deploying "$(git rev-parse --short HEAD)
  git push origin HEAD:deploy --force
else 
  echo "Error: commit all changes before attempting deploying"
  exit 1
fi
