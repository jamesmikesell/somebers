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

## Angular Material
- UI is built with Angular Material 20; use the v20 APIs/selectors/config (no legacy syntax from earlier releases).
- Prefer existing Angular Material components, themes, and styling primitives—do not create custom colors/themes/components when a Material option already covers the need.

## Build, Test, and Development Commands
- `npm start`: Start dev server with HMR at `http://localhost:4200`.
- `npm run startExternal`: Serve on `0.0.0.0` with local SSL certs.
- `npm run startExternalOffline`: Dev serve using production config.
- `npm run build`: Production build (base href `/`).
- `npm run testNoWatch -- [--include path/to/spec]`: Preferred command for running Karma unit tests without watch mode. If the sandbox blocks port 9876, re-run the same command with elevated permissions in the shell call so Karma can bind the port.
- `./deploy.sh`: Stamp version, update `public/version.json`, build, push static site to `deploy` branch (`docs/`).

## Coding Style & Naming Conventions
- Indentation: 2 spaces; UTF‑8; trim trailing whitespace (`.editorconfig`).
- TypeScript: single quotes; SCSS for styles. Avoid inline `style="..."` in templates.
- Angular control flow: prefer `@if`, `@for` over `*ngIf`, `*ngFor`.
- If statements: one-liner `if (cond) doThing();` is allowed for trivial actions; two-line without curly braces is also allowed; use braces for multi-line blocks or when needed for clarity.
- Naming: `thing.component.ts`, `thing.service.ts`, `thing.directive.ts`; selector prefix `app-`.
- Variables: prefer full words over abbreviations (e.g., `count` not `cnt`); reserved, widely-understood short forms are OK (`i/j` loop indices, `id`, `URL`, `API`).
- File layout: place model/utility classes at the bottom of a `.ts` file.
- Formatting: Prettier 3 (HTML uses Angular parser). Example: `npx prettier --check .`.

## Error Handling
- Never bury exceptions: every `catch` must handle the error (log, rethrow, or map to a clear user-visible/result state). Do not use empty `catch {}` blocks.
- Logging: include concise, contextual messages and the error object.
- Prefer specific error scopes; avoid over-broad try/catch that hides the root cause.

## Testing Guidelines
- Frameworks: Jasmine + Karma; run with `npm test`.
- Location: tests next to code (`*.spec.ts`).
- Scope: prioritize unit tests for `model/` and `service/`; mock dependencies; keep deterministic.

## Commit & Pull Request Guidelines
- Commits: imperative mood; one logical change per commit.
- Convention: `type(scope): summary` (e.g., `feat(board): add drag select`); history shows `style:` and `build(deploy):`.
- PRs: clear description, linked issues, screenshots/GIFs for UI; ensure tests/build pass.

## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Auto-syncs to JSONL for version control
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**
```bash
bd ready --json
```

**Create new issues:**
```bash
bd create "Issue title" -t bug|feature|task -p 0-4 --json
bd create "Issue title" -p 1 --deps discovered-from:bd-123 --json
bd create "Subtask" --parent <epic-id> --json  # Hierarchical subtask (gets ID like epic-id.1)
```

**Claim and update:**
```bash
bd update bd-42 --status in_progress --json
bd update bd-42 --priority 1 --json
```

**Complete work:**
```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task**: `bd update <id> --status in_progress`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`
6. **Commit together**: Always commit the `.beads/issues.jsonl` file together with the code changes so issue state stays in sync with code state

### Auto-Sync

bd automatically syncs with git:
- Exports to `.beads/issues.jsonl` after changes (5s debounce)
- Imports from JSONL when newer (e.g., after `git pull`)
- No manual export/import needed!

### GitHub Copilot Integration

If using GitHub Copilot, also create `.github/copilot-instructions.md` for automatic instruction loading.
Run `bd onboard` to get the content, or see step 2 of the onboard instructions.

### MCP Server (Recommended)

If using Claude or MCP-compatible clients, install the beads MCP server:

```bash
pip install beads-mcp
```

Add to MCP config (e.g., `~/.config/claude/config.json`):
```json
{
  "beads": {
    "command": "beads-mcp",
    "args": []
  }
}
```

Then use `mcp__beads__*` functions instead of CLI commands.

### Managing AI-Generated Planning Documents

AI assistants often create planning and design documents during development:
- PLAN.md, IMPLEMENTATION.md, ARCHITECTURE.md
- DESIGN.md, CODEBASE_SUMMARY.md, INTEGRATION_PLAN.md
- TESTING_GUIDE.md, TECHNICAL_DESIGN.md, and similar files

**Best Practice: Use a dedicated directory for these ephemeral files**

**Recommended approach:**
- Create a `history/` directory in the project root
- Store ALL AI-generated planning/design docs in `history/`
- Keep the repository root clean and focused on permanent project files
- Only access `history/` when explicitly asked to review past planning

**Example .gitignore entry (optional):**
```
# AI planning documents (ephemeral)
history/
```

**Benefits:**
- ✅ Clean repository root
- ✅ Clear separation between ephemeral and permanent documentation
- ✅ Easy to exclude from version control if desired
- ✅ Preserves planning history for archeological research
- ✅ Reduces noise when browsing the project

### CLI Help

Run `bd <command> --help` to see all available flags for any command.
For example: `bd create --help` shows `--parent`, `--deps`, `--assignee`, etc.

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ✅ Store AI planning docs in `history/` directory
- ✅ Run `bd <cmd> --help` to discover available flags
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems
- ❌ Do NOT clutter repo root with planning documents

## PWA, State & Docs
- PWA/offline: service worker configured via `ngsw-config.json`; test offline after changes.
- State migrations: when changing saved data, add/adjust versions under `model/saved-game-data/`.
- Documentation: update `GEMINI.md` and `component/documentation/` when interactions or UI change.
