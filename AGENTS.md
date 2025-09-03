# Repository Guidelines

This repo hosts Somebers, an Angular SPA deployed as static pages. Follow these conventions to keep changes consistent and safe to ship.

## Project Structure & Module Organization
- Source: `src/app` by feature: `component/`, `service/`, `model/`, `directive/` (Angular Material UI, HammerJS for gestures).
- Entrypoints: `src/main.ts`; app shell `src/app/app.ts` with template `app.html`.
- Assets: `public/` copied as‑is; global styles in `src/styles.scss`.
- Persistence: game state via LocalStorage (`service/save-data.service.ts`); schema versions in `src/app/model/saved-game-data/`.
- Docs: user help under `src/app/component/documentation/`; high‑level notes in `GEMINI.md`.
- Tests: colocated `*.spec.ts` (e.g., `src/app/model/random.spec.ts`).
- Builds: production output in `dist/numbers/browser/`; deploy copies to `docs/`.

## Build, Test, and Development Commands
- `npm start`: Start dev server with HMR at `http://localhost:4200`.
- `npm run startExternal`: Serve on `0.0.0.0` with local SSL certs.
- `npm run startExternalOffline`: Dev serve using production config.
- `npm run build`: Production build (base href `/`).
- `npm test`: Run unit tests (Karma + Jasmine).
- `./deploy.sh`: Stamp version, update `public/version.json`, build, push static site to `deploy` branch (`docs/`).

## Coding Style & Naming Conventions
- Indentation: 2 spaces; UTF‑8; trim trailing whitespace (`.editorconfig`).
- TypeScript: single quotes; SCSS for styles. Avoid inline `style="..."` in templates.
- Angular control flow: prefer `@if`, `@for` over `*ngIf`, `*ngFor`.
- If statements: put the action on a separate line (no single-line `if (cond) doThing();`).
- Naming: `thing.component.ts`, `thing.service.ts`, `thing.directive.ts`; selector prefix `app-`.
- File layout: place model/utility classes at the bottom of a `.ts` file.
- Formatting: Prettier 3 (HTML uses Angular parser). Example: `npx prettier --check .`.

## Testing Guidelines
- Frameworks: Jasmine + Karma; run with `npm test`.
- Location: tests next to code (`*.spec.ts`).
- Scope: prioritize unit tests for `model/` and `service/`; mock dependencies; keep deterministic.

## Commit & Pull Request Guidelines
- Commits: imperative mood; one logical change per commit.
- Convention: `type(scope): summary` (e.g., `feat(board): add drag select`); history shows `style:` and `build(deploy):`.
- PRs: clear description, linked issues, screenshots/GIFs for UI; ensure tests/build pass.

## PWA, State & Docs
- PWA/offline: service worker configured via `ngsw-config.json`; test offline after changes.
- State migrations: when changing saved data, add/adjust versions under `model/saved-game-data/`.
- Documentation: update `GEMINI.md` and `component/documentation/` when interactions or UI change.
