# E2E Agent Scope

## OVERVIEW

- `e2e/` is the browser-proof layer. It runs Playwright against the app server; root Jest excludes this tree.
- Assert user-visible routes, explicit state preconditions, and persisted outcomes. Keep product internals behind test harness/store exposure seams.

## STRUCTURE

- `*.spec.ts`: domain journeys; tag titles with `@smoke`, `@campaign`, `@encounter`, `@force`, `@game`, `@combat`, `@customizer`, `@compendium`, or `@slow`.
- `fixtures/`: domain data factories and API/setup fixtures. `helpers/`: navigation, waits, diagnostics, store reads, campaign/match-log seeders, and UX walkthrough utilities.
- `pages/`: page-object models when a route has repeated interaction vocabulary. `flows/manifest.ts`: named flow boundaries consumed by the flow-audit runner.
- `scenario-packs/`: checked-in campaign/encounter payloads and parity specs. `scenario-pack-minting.spec.ts` is generator tooling, not a normal suite test.
- Tactical-map fixtures/harnesses live under `src/testing/` and `src/pages/e2e/`; pair changes with the owning visual-smoke spec.

## WHERE TO LOOK

- Runner/projects: `../playwright.config.ts`; commands and baseline coverage: `TESTING_CHECKLIST.md`.
- Shared browser seams: `helpers/`, `fixtures/`, `pages/`, and `../src/lib/e2e/storeExposure.ts`.
- Visual/runtime artifacts: `.sisyphus/evidence/screenshots/` and `.sisyphus/e2e-runtime/<runId>/`.
- Flow evidence: `flow-audits.spec.ts`, `flows/manifest.ts`, and `../scripts/qc/run-flow-audit.mjs`.

## CONVENTIONS

- Import Playwright from `@playwright/test`; use explicit hydration/store readiness waits before actions.
- Specs do not import app modules or `@/` types. Read exposed Zustand state through `window.__ZUSTAND_STORES__` with local structural types; use e2e helpers for setup.
- Use unique run-scoped IDs, clean created campaigns/matches in teardown, and capture browser diagnostics on failures.
- `chromium` is the default project. `mobile-touch` selects only `@mobile-touch`; use local `test.use` for touch/viewport needs.
- `flow-audit` registers only with `MEKSTATION_FLOW_ID`; `scenario-pack-mint` registers only with `MEKSTATION_MINT_PACK_ID`.
- Keep screenshots deterministic (`animations: 'disabled'` where applicable); generated evidence belongs in the configured evidence directories.

## ANTI-PATTERNS

- Do not import production `@/` code/types into specs, rely on ambient cards, or skip hydration/store preconditions.
- Do not add `@mobile-touch` to anchor, deep-play, layout-sweep, or scenario-pack parity specs; this can reschedule contract suites.
- Do not run the scenario-pack minter through ordinary `npm run test:e2e`; it writes payloads and must be invoked through `scripts/qc/mint-scenario-pack.mjs <pack-id>`.
- Do not run flow-audit specs as a bare chromium/default suite; use `npm run qc:flow` so one selected flow owns its evidence.
- Do not create a new project that multiplies the entire suite by viewport; use tagged selection or an explicit viewport loop.

## COMMANDS

- `npm run test:e2e`; smoke: `npx playwright test --grep @smoke --project=chromium`.
- Debug: `npm run test:e2e:headed`, `npm run test:e2e:ui`, or `npm run test:e2e:debug`.
- Flow evidence: `npm run qc:flow`; scenario packs: `node scripts/qc/mint-scenario-pack.mjs <pack-id>`.
- Use `node scripts/playwright/run-playwright.mjs ...` in repo scripts so run IDs/server setup stay consistent.
