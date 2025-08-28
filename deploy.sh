#!/bin/sh

if [ -z "$(git status --porcelain)" ]; then
  old_branch=$(git branch --show-current)
  git branch -f deploy
  git checkout deploy

  rm -rf ../docs
  rm -rf dist
  version="$(git rev-parse --short HEAD)-$(date +%m%d%y%H%M)"
  echo "export class AppVersion { static readonly VERSION = \"$version\"; }" > src/app/app-version.ts
  echo "{\"version\": \"$version\"}" > public/version.json
  npm run build
  mv dist/numbers/browser docs

  git add -A
  git commit -m "build(deploy): deploying "$(git rev-parse --short HEAD)
  git push --force
  git checkout $old_branch
else 
  echo "Error: commit all changes before attempting deploying"
  exit 1
fi
