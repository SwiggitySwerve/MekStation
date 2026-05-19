# Playtest Issue Ledger

Append-only ledger for the Waves 1-5 end-to-end playtest. One row per defect. Feature-gaps (anything matching the **Known-Limitations Exclusion List** in [snappy-sprouting-giraffe.md](../../../Users/wroll/.claude/plans/snappy-sprouting-giraffe.md)) go to `playtest/CLOSEOUT.md` "gaps" section, **not here**.

## Severity

- **P0** — crash, data corruption, invariant violation, security/auth, can't progress
- **P1** — behavior contradicts spec, AI does opposite-of-intended, multiplayer desync
- **P2** — cosmetic/UX defect, late-game-only edge, recovery-needed-but-non-corrupting
- **P3** — polish, nit, accessibility miss

## Status values

`open`, `in-progress`, `closed`, `open-deferred` (only for P2/P3 explicitly bumped to a later wave)

## Ledger

| ID     | Phase | Surface                  | Severity | Status | Title                                                                                 | Repro                                                                                                                           | Notes / Fix PR                                                                                                                                                                                         |
| ------ | ----- | ------------------------ | -------- | ------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PT-001 | 0     | simulation/state-cycle   | P2       | open   | StateCycleDetector fires on every run with empty armor/structure map                  | `npm run simulate -- --config=scripts/swarm-configs/duel-3kbv-temperate.json --runs=50 --seed=20260519`; 50/50                  | Anomaly snapshot has `armor: {}`, `structure: {}` (only `heat` populated). Detector input wiring bug, not engine bug. Investigate in Phase 1 triage.                                                   |
| PT-002 | 0     | simulation/heat-suicide  | P3       | open   | 77 heat-suicide warnings across 50 runs (default AI tier)                             | same as PT-001                                                                                                                  | Likely expected for default/Green-tier AI heat behavior; confirm against Wave-2 AITierRegistry green-tier spec before reclassifying.                                                                   |
| PT-003 | 0     | simulation/game-duration | P3       | open   | 42/50 baseline runs hit 50-turn limit (draw)                                          | same as PT-001                                                                                                                  | 3kbv 2v2 small forces in radius-12 hexmap with biome=none rarely engage. Configure smoke matrix with larger forces / smaller maps to find decisions.                                                   |
| PT-004 | 0     | e2e/store-api            | P0       | open   | `stores.campaign.getState is not a function` breaks ~30 e2e tests                     | `npx playwright test --project=chromium`; affects `campaign.spec.ts` + `campaign-round-trip.spec.ts` + `agent-autonomy.spec.ts` | Tests use `page.evaluate(() => stores.campaign.getState())`. Likely PR #601 Zod-at-boundaries changed `window.stores` shape. Either expose `getState()` back on the global OR migrate the test helper. |
| PT-005 | 0     | e2e/homepage             | P0       | open   | Homepage emits 3 critical console errors incl. WebSocket connection                   | `npx playwright test --project=chromium -- e2e/app-routes.spec.ts`                                                              | `expect(criticalErrors).toHaveLength(0)` got `3`. First error mentions "WebSocket conne..." — homepage tries to open a WS that's not accepting connections. Root-cause WS init order on `/`.           |
| PT-006 | 0     | e2e/compendium           | P1       | open   | Compendium search/filter locators stale (4 specs)                                     | `npx playwright test --project=chromium -- e2e/compendium.spec.ts`                                                              | `getByPlaceholder(/search units/i)` and `getByLabel(/filter by unit type/i)` no longer match. UI rename in Wave-1 polish PR #603? Update tests OR restore labels.                                      |
| PT-007 | 0     | e2e/replay-player        | P2       | open   | `getByRole('button', { name: /Game/i })` matches 2 buttons (strict mode)              | `npx playwright test --project=chromium -- e2e/replay-player.spec.ts`                                                           | Add an `exact: true` or disambiguate via scoped locator (timeline category dropdown menu vs filter chip).                                                                                              |
| PT-008 | 0     | e2e/mobile-navigation    | P3       | open   | 23 mobile-nav specs run on chromium project; hamburger button not visible at 1280×720 | `npx playwright test --project=chromium -- e2e/mobile-navigation.spec.ts`                                                       | Either `test.skip(({project}) => project.name !== 'Mobile Chrome')` at the spec head, or restrict via `testMatch` in playwright config. Test-infra fix, not a UI defect.                               |

## Counts (auto-update at phase boundaries)

| Phase | P0 open | P1 open | P2 open | P3 open | Closed | Deferred |
| ----- | ------- | ------- | ------- | ------- | ------ | -------- |
| 0     | 2       | 1       | 2       | 3       | 0      | 0        |
| 1     | —       | —       | —       | —       | —      | —        |
| 2     | —       | —       | —       | —       | —      | —        |
| 3     | —       | —       | —       | —       | —      | —        |
| 4     | —       | —       | —       | —       | —      | —        |
| 5     | —       | —       | —       | —       | —      | —        |
