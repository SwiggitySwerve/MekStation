# PROJECT KNOWLEDGE BASE

**Generated:** 2026-07-27
**Commit:** ab6bab640
**Branch:** codex/init-deep-agent-guidance

## OVERVIEW

MekStation is a BattleTech construction and gameplay companion built as a
Next.js 16 Pages Router application with React 19, strict TypeScript, Zustand,
SQLite, a custom multiplayer WebSocket server, and an Electron desktop shell.
OpenSpec is the domain-rules workflow; executable code and fresh validation
remain the authority for runtime behavior.

## STRUCTURE

```text
MekStation/
|- server.js                 # Custom Next HTTP + authoritative WS entry
|- src/pages/                # Pages Router routes and API handlers
|- src/pages-modules/        # Route-adjacent composition and API helpers
|- src/components/           # UI, shell, gameplay, customizer, stories/tests
|- src/engine/               # Complete and interactive game lifecycle
|- src/simulation/           # Seeded autonomous runner and invariants
|- src/utils/gameplay/       # Event-sourced gameplay and replay reducers
|- src/lib/multiplayer/server/ # Authoritative match/campaign hosts
|- scripts/                  # Build, QC, conversion, maintenance, asset tools
|- e2e/                      # Playwright browser proof and scenario packs
|- desktop/                  # Separate Electron package and native build
|- openspec/                 # Canonical specs, active changes, validators
|- public/data/              # Generated canonical unit/equipment datasets
|- docs/audits/              # Dated audit deliverables
`- playtest/                 # Manual UAT ledgers and session evidence
```

## WHERE TO LOOK

| Task               | Location                                                                     | Notes                                                        |
| ------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------ |
| App startup/shell  | `server.js`, `src/pages/_app.tsx`                                            | Port 3600; custom server bootstraps multiplayer              |
| Routes and API     | `src/pages/`, `src/pages-modules/`                                           | Pages Router only; shared API setup in `routeHelpers.ts`     |
| UI work            | `src/components/`, `src/styles/globals.css`                                  | Reuse primitives, theme tokens, accessibility seams          |
| Construction rules | `openspec/specs/`, `src/services/construction/`, `src/utils/construction/`   | Verify spec and executable formula together                  |
| Validation         | `src/types/validation/`, `src/utils/validation/`, `src/services/validation/` | Dependency direction is types -> pure rules -> orchestration |
| Gameplay state     | `src/utils/gameplay/`, `src/engine/`                                         | Events are canonical; derived state must replay              |
| Simulation         | `src/simulation/`, `scripts/run-simulation-*.ts`                             | Seeded deterministic runs and invariant evidence             |
| Multiplayer        | `src/lib/multiplayer/server/`, `server.js`                                   | Server-authoritative WS; P2P is fallback only                |
| Persistence        | `src/services/persistence/`, `src/services/campaignPersistence/`             | SQLite server side, IndexedDB browser side                   |
| Browser proof      | `e2e/`, `playwright.config.ts`, `scripts/playwright/`                        | Tagged projects and per-run durable stores                   |
| QC/release proof   | `scripts/qc/`, `docs/qc/`, `.github/workflows/`                              | Registry-backed gates; reports can become stale              |
| Desktop            | `desktop/`, `electron-builder.yml`                                           | Separate lockfile, TS config, Jest, ABI rebuild              |
| Audit output       | `docs/audits/<date>-<topic>.md`                                              | Do not put audits in planning scratch                        |

## CODE MAP

`Refs` is the number of source/script files matched by a source-only text scan.
The TypeScript LSP is unavailable in this checkout, so treat counts as
navigation hints rather than semantic reference totals.

| Symbol                       | Type            | Location                                          | Refs | Role                                   |
| ---------------------------- | --------------- | ------------------------------------------------- | ---: | -------------------------------------- |
| `initializeBrowserServices`  | function        | `src/pages/_app.tsx`                              |    1 | Browser IndexedDB/equipment startup    |
| `bootstrapMultiplayerServer` | function        | `src/lib/multiplayer/server/MatchHostRegistry.ts` |    2 | Durable active-match recovery          |
| `MatchHostRegistry`          | class           | `src/lib/multiplayer/server/MatchHostRegistry.ts` |    8 | Process-local authoritative hosts      |
| `GameEngine`                 | class           | `src/engine/GameEngine.ts`                        |   26 | Seeded complete/interactive game entry |
| `InteractiveSession`         | class           | `src/engine/InteractiveSession.ts`                |   33 | Command, event, recovery lifecycle     |
| `SimulationRunner`           | class           | `src/simulation/runner/SimulationRunner.ts`       |    2 | Deterministic autonomous phase runner  |
| `useCampaignStore`           | store           | `src/stores/campaign/useCampaignStore.ts`         |   30 | Campaign client state                  |
| `getCanonicalUnitService`    | function        | `src/services/units/CanonicalUnitService.ts`      |   29 | Canonical unit lookup boundary         |
| `appendEvent`                | function family | `src/utils/gameplay/`                             |   32 | Event-sourced mutation boundary        |

## CONVENTIONS

- Use npm scripts. Live formatting/linting is `oxfmt` + `oxlint`, not ESLint.
- TypeScript is strict with `@/*` rooted at `src/`; use concrete enums, type
  guards, and established `I`-prefixed domain interfaces.
- Pages Router conventions (`next/router`, `next/link`, `next/head`) are
  intentional. There is no `src/app/`.
- OpenSpec annotations (`@spec ...`) connect rule code/tests to specs. Confirm
  current paths; `.cursorrules` and older architecture docs contain stale maps.
- Zustand unit stores deliberately split pure `xxxState.ts` from
  `useXxxStore.ts`. Preserve facade exports and registry/reset seams.
- Split modules by responsibility using `docs/FILE_MODULARITY_SPEC.md`; tests
  and generated catalogs are exempt from one-size line limits.
- Runtime diagnostics use `src/utils/logger.ts`; avoid new raw `console` calls
  in product code.

## ANTI-PATTERNS (THIS PROJECT)

- Do not use Open Brain, Jira, Outline, or AstraBit workflow infrastructure for
  MekStation. Keep work in this repository, OpenSpec, and local audit/draft
  surfaces.
- Do not copy missing/stale paths from `.cursorrules` or old docs into code or
  guidance; verify the live tree first.
- Do not hand-edit `src/types/contracts/generated/*.zod.ts`,
  `.next/standalone/**`, fetched `public/record-sheets/`, or generated QC/data
  indexes. Use their generators and check modes.
- Do not introduce ambient `Math.random()` into seeded simulation/gameplay
  paths or broaden the CI allowlist without an explicit compatibility reason.
- Do not import SQLite/filesystem/server resolvers into browser components.
- Do not let multiplayer clients resolve canonical actions or expose fogged
  events; clients submit intents and mirror server broadcasts.
- Do not treat dated audits, validation summaries, screenshots, or catalog
  presence as proof of current runtime behavior.
- Do not run destructive helpers such as `npm run docker:clean`, asset fetches,
  release publishing, or scenario-pack minting as routine verification.

## COMMANDS

```bash
npm run dev
npm run typecheck
npm run lint
npm run format:check
npm run test:stable
npm run verify
npm run test:e2e
npm run electron:test
npx openspec validate --all --strict
```

`npm run verify:full` adds perf-sensitive tests, strict rules, and a production
build; use it when the requested proof surface warrants the cost.

## NOTES

- Root `build` uses `scripts/next/run-next.mjs`, then hydrates the generated
  standalone server with multiplayer runtime files.
- Jest root projects are `unit` and `a11y`; root Jest excludes `e2e/` and
  `desktop/`.
- `postinstall` asset checks are intentionally non-blocking. CI-grade asset
  proof is `npm run validate:assets:strict`.
- This repository is often used through linked worktrees. Inspect live branch
  and status before changing Git state, and preserve unrelated worktree edits.

## Learned User Preferences

- Keep going until the assigned wave or task is closed or blocked with evidence; do not stop after a PR or a partial edit.
- Split internally parallelizable work across subagents rather than running it serially.
- Runtime files use the 500-line cap (not 400) unless a wave contract states a tighter product-pr cap; do not mix parked FILE_MODULARITY or oxlint cap bumps into CAMP PRs.
- CAMP product PRs merge as merge commits (`gh pr merge N --merge --delete-branch`), never squash, and the product head SHA must not change after reviewed-head.
- Do not treat CAMP controller "complete" or exit 0 as success without a real receipt; the official Windows production CLI can fake-exit with empty stdout.

## Learned Workspace Facts

- CAMP initiating clone is `E:/Projects/MekStation-proof`. Dirty primary `E:/Projects/MekStation` must not be used for CAMP commits, register, or controller runs.
- CAMP product worktrees live under `E:/CodexWorktrees/MekStation-<wave>` on `codex/<wave>`; controller state and playtest receipts live under `E:/Projects/MekStation-proof/.sisyphus/evidence/playtest/`.
- Wave close sequence is register (before product edits) → reviewed-head → merge-commit → exact-main → cleanup. Fast-forward the proof clone to GitHub main before exact-main and cleanup. Cap is `git diff --numstat` added+deleted versus register oldOid, including untracked files.
- WAVE_CONTRACTS live in `scripts/qc/camp01-authority-receipt.contract.mjs`. Repair kinds are only `proof` and `h`; do not invent repair rows. Run `node scripts/qc/run-camp01-production.mjs` from the proof clone.
- On Windows, use the launcher under `E:/t/` (`camp01-launch.mjs` / `camp00-launch.mjs`) with TEMP/TMP=`E:/t` and Node 22.22.0 (`C:\Users\wroll\AppData\Local\nvm\v22.22.0\node.exe`). The proof clone has no `node_modules`.
- Product worktrees must not have a `node_modules` junction during reviewed-head (`scanReparse`). Junction for local tests, then `rmdir` (no `/S`) before reviewed-head. Windows `git worktree remove` fails on leftover `node_modules` — `cmd rmdir /S /Q` then prune; `git worktree remove` can hang.
- Playwright CAMP authority reports must be body-only attachments (no `path` / caller file-drop). `wave-result.json` uses alphabetically sorted keys, `wx`, and skip-if-exists.
- Capture-owning waves in `CAPTURE_CONTRACTS` need dual-SHA capturePolicies (candidate and reviewed-head). Exact-main treeSha compares to `cap.headSha^{tree}`, not merge^{tree}.
- CAMP solo-maintainer approval is `solo-maintainer` / reviewer `SwiggitySwerve`. oxfmt printWidth is 80.
