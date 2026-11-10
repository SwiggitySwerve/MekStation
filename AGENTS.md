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

## Working invariants

1. **One owner per rule or table:** copied rules, tables, predicates and rule projections drift silently, so duplication blocks review; extract to one owner without changing behavior, switch all callers, then keep the behavior change separately verifiable.
2. **Test-first:** passing-only tests may miss the defect, so record red before the fix and green afterward, and kill a mutant that a weaker test would miss.
3. **Pinned-Java citations:** upstream rules change, so cite every parity value or rule as `file:line` at the pinned MegaMek, MegaMekLab, MekHQ or mm-data SHA, reading the pins from `goalPins` in `config/reference-policy/derivation.json`.
4. **Splice-only data applies:** whole-file postimages can revert later fixes, so splice approved catalog or data fields into current main's files and assert per file that only the approved fields changed.
5. **Merge, then post-merge:** trial results do not prove the merged tree, so require a passing trial and a recorded interval path audit of the PR's paths and suite inputs, then immediately run the same suites labelled `POST-MERGE` on the exact merge commit and report failures; schema, generated Zod, unit data, catalog and loader changes in the interval count as triggers requiring another trial before merge, which may be the targeted delta re-trial in 5a when the interval reaches the PR only through data or loader inputs.

5a. **Targeted delta re-trial:** a full re-trial for every data or loader change starves the queue, so when a full trial passed and the interval since reaches the PR only through data or loader inputs, re-trial only the suites that consume the changed inputs on current main plus the PR head, merge on pass, then run the full `POST-MERGE` on the exact merge commit, and revert within the hour if it is red. Code changes in the PR's own trigger area still require a full re-trial.

6. **No size or memory gates:** arbitrary size and memory thresholds are not acceptance criteria, so byte, heap and RSS measurements remain advisory trends and never fail CI or block merging; separate count limits for jobs, unkeyable tests, repo-wide keys, lint warnings and dependencies still apply.
7. **Exact replay state:** misleading replay state undermines gameplay review and recovery, so rebuild exact state at every event boundary, exact seeded continuation for server and multiplayer recovery, and review-exact replay elsewhere; any replay, digest or golden change is a STOP requiring attribution and an explicit decision before proceeding.
8. **Preserve committed evidence:** regeneration can erase regression evidence or introduce unapproved data changes, so never regenerate committed fixtures, digests or catalogs without an explicit decision.
9. **Never skip hooks:** temporary commits must pass required checks too, so never use `--no-verify` or otherwise bypass hooks.
10. **Fetch and merge moving main:** resets can stage reversions of merged work, so update an existing branch with `git fetch origin` followed by `git merge origin/main`, never by resetting onto a moving main.
11. **No result line is not a pass:** a suite that executes zero tests proves nothing, so a trial or gate must fail when a named suite runs zero tests or prints no result line; use `npm run test:roadmap` or `npm run test:corpus`, which set `JEST_SPLIT_CORPUS=true` and select `--selectProjects roadmap` or `--selectProjects corpus` respectively; with splitting unset these suites stay in `unit`, while split mode excludes them from `unit`.

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
