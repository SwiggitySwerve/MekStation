# Phase 0 Baseline

Snapshot of the green/red state of `main` immediately before the playtest begins. Every later regression is measured against this.

## Commit pinned

`f001f18900d6ea4ab2c2c213435824d722597ced` (head of `main` at 2026-05-19, branch `playtest/baseline-pin`).

## Verification commands

| Command                                                                                                                                               | Result      | Notes                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm install`                                                                                                                                         | PASS        | `up to date in 1s`; mm-data assets v0.3.1 (524 files) present.                                                                                                                                                                                                                                                          |
| `npm run verify:full`                                                                                                                                 | PASS        | Jest: **25,193 passed / 1 skipped**. oxlint: 0 errors, 2 max-lines warnings (`MoveAI.ts` 446 / `BotPlayer.ts` 582 — both > 400 limit). oxfmt: clean. typecheck: clean. Next.js build: clean (60/60 static pages in 1.37s, compiled in 41s). Quarantined flakes (`balance.test` opfor-BV / `CryptoDiceRoller`) inactive. |
| `npx playwright test --project=chromium`                                                                                                              | **MIXED**   | 552 specs / 450 passed / 14 skipped / **88 failed** (5.3 min wall-clock). Breakdown below. Desktop chromium project only for baseline; mobile/tablet projects deferred to later phases.                                                                                                                                 |
| `npm run simulate -- --config=scripts/swarm-configs/duel-3kbv-temperate.json --runs=50 --seed=20260519 --output=playtest/swarm-runs/baseline/...json` | PASS (runs) | 50 runs, 2070ms (41ms / run). Winners: 5 player / 3 opponent / 42 turn-limit-draws. 127 violations (50 critical `detector:state-cycle` + 77 warning `detector:heat-suicide`). 0 critical-halt.                                                                                                                          |

## Pre-existing project debt (already known; not new defects)

1. `src/simulation/ai/MoveAI.ts` — 446 lines vs 400-line max (oxlint `max-lines` warning, not error)
2. `src/simulation/ai/BotPlayer.ts` — 582 lines vs 400-line max (oxlint `max-lines` warning, not error)
3. Per MEMORY, both `balance.test` and `CryptoDiceRoller` distribution test are quarantined statistical flakes — neither fired on the baseline run.

These are noted for context. They are NOT counted as Phase-0 regressions and are out of scope for the playtest.

## Smoke-matrix axis findings (Phase 1 adjustment required)

The plan's matrix axes don't all map onto what the swarm runner actually exposes today. Captured here so Phase 1 doesn't waste cycles authoring no-op configs.

| Axis        | Plan said                                      | Runner reality                                                                                                                                                             | Phase-1 adjustment                                                                                                                             |
| ----------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| BV budget   | 3000 / 6000 / 10000                            | ✅ `sideA.bvBudget` / `sideB.bvBudget`                                                                                                                                     | Use as planned                                                                                                                                 |
| Biome       | temperate / desert / mountain / urban          | ❌ `terrainBiome` schema accepts strings but `swarmConfigSchema.ts:88-90` documents "none is the only implemented value — unknown biomes warn and fall back" (Phase 7 NYI) | **Log as gap.** Run all Phase-1 configs with `terrainBiome: "none"`; biome variation only meaningful at the in-app SP/Campaign UI in Phase 2-3 |
| AI tier     | Green / Regular / Veteran / Elite              | ❌ `aiVariant` enum is `default / aggressive / defensive / skirmisher` (legacy variants). The Wave-2 `AITierRegistry` is not exposed via the swarm config                  | **Log as gap.** Swap the axis to `aiVariant` (behavioral variants). AI tier difficulty exercised in Phase 2-3 only                             |
| Scenario    | Annihilation / Capture / Defend / Breakthrough | ❌ Swarm runner has no scenario field; uses `STANDARD_LANCE` preset hard-coded                                                                                             | **Log as gap.** Scenario coverage only meaningful at the in-app SP UI in Phase 2; objective-engine exercised through browser, not headless     |
| Pilot skill | (not on plan)                                  | ✅ `pilotSkillBand: green / regular / veteran / elite`                                                                                                                     | **Add to axis** as a proxy for "difficulty" in headless smoke                                                                                  |
| Map radius  | 12 / 20                                        | ✅ `mapRadius`                                                                                                                                                             | Use as planned, also add 8 (small) to surface chokepoint engagements                                                                           |

**Net effect:** Phase 1 stays headless and useful, but its scope narrows from a 4D axis to a 3D axis (BV × aiVariant × pilotSkillBand × mapRadius). Biome / scenario / AI-tier coverage shift entirely into Phase 2 (SP browser UAT) and Phase 3 (Campaign UAT).

## Anomaly / invariant summary

| Detector / Checker            | Hits (50 runs)                                       | Known-limitation? | Notes                                                                                                                                                                              |
| ----------------------------- | ---------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checkUnitPositionUniqueness` | 0                                                    | —                 | clean                                                                                                                                                                              |
| `checkHeatNonNegative`        | 0                                                    | —                 | clean                                                                                                                                                                              |
| `checkArmorBounds`            | 0                                                    | —                 | clean                                                                                                                                                                              |
| `detector:state-cycle`        | 50 (1/run, severity `critical`)                      | **suspect**       | Anomaly snapshot has `armor: {}` and `structure: {}` (only `heat` populated). Looks like the snapshot wiring isn't capturing unit damage — detector input bug. Filed as **PT-001** |
| `detector:heat-suicide`       | 77 (1.5/run avg, severity `warning`)                 | partial           | Likely expected for `aiVariant: default` heat behavior. Confirm against tier-spec in Phase 1. Filed as **PT-002**                                                                  |
| `KeyMomentDetector`           | (not separately counted; surfaces in event log only) | —                 | —                                                                                                                                                                                  |
| `LongGameDetector`            | (not separately counted in violations)               | —                 | 42/50 runs hit 50-turn limit. Filed as **PT-003**                                                                                                                                  |
| `NoProgressDetector`          | (not separately counted)                             | —                 | —                                                                                                                                                                                  |
| `PassiveUnitDetector`         | (not separately counted)                             | —                 | —                                                                                                                                                                                  |

## E2E failure breakdown (88 failures across 13 spec files)

| Bucket                           | Count | Action                                                                                                                                                                                                                                                                                                                       |
| -------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Screenshot baseline drift        | 31    | **Noise** — recent UI polish PR #603 invalidated snapshots. Rebaseline as a separate operational PR (`chore(e2e): refresh audit snapshots`).                                                                                                                                                                                 |
| Mobile-nav project misfit        | 23    | **Noise** — `mobile-navigation.spec.ts` asserts the hamburger button which only renders at mobile viewport. The chromium-project run shouldn't include these. Fix is `test.skip(({project}) => project.name !== 'Mobile Chrome')` or scope `testMatch` in `playwright.config.ts`. Filed as **PT-008** (P3 test-infra) below. |
| Store-API regression (~30 specs) | ~30   | **Defect** — `PT-004` (P0). `page.evaluate(() => stores.campaign.getState())` returns "not a function". Likely PR #601 Zod-at-boundaries changed `window.stores`.                                                                                                                                                            |
| Homepage WS console errors       | 1     | **Defect** — `PT-005` (P0). 3 critical console errors on `/`, including a WebSocket connection failure.                                                                                                                                                                                                                      |
| Compendium UI locators stale     | 4     | **Defect** — `PT-006` (P1). `getByPlaceholder(/search units/i)` not matched.                                                                                                                                                                                                                                                 |
| Replay strict-mode selector      | 2     | **Defect** — `PT-007` (P2). `getByRole('button', { name: /Game/i })` matches two buttons.                                                                                                                                                                                                                                    |

Net: **4 real defects** (PT-004..PT-007) totaling ~37 broken specs, plus **2 noise buckets** (~54 specs) that are operational, not defects. Phase-0 fix wave will address PT-004 + PT-005 first (P0), then PT-006 / PT-007 / PT-008. Phase 1 may proceed in parallel once PT-004 is resolved because the headless swarm doesn't depend on the e2e harness.

## Phase-0 exit decision

- [x] All headless baseline gates green (modulo the 2 quarantined flakes — neither fired)
- [x] Pre-existing red findings filed as `PT-001..PT-007` in `ISSUES.md`
- [x] Smoke-matrix axis gaps captured above; Phase 1 will adapt
- [x] `test:e2e --project=chromium` result captured (450 pass / 14 skip / 88 fail; root-cause buckets identified)
- [ ] PT-004 (store-API regression) fixed → unblocks ~30 specs
- [ ] PT-005 (homepage WS errors) fixed → unblocks `app-routes.spec.ts`
- [ ] PT-006 / PT-007 / PT-008 fixed → unblocks remaining 6 functional specs
- [ ] Screenshot rebaseline shipped as a separate operational PR

## Phase-0 PR sequence

1. `chore(playtest): baseline pin` — this branch (`playtest/baseline-pin`) — commits `playtest/` working tree + this baseline doc + the 4 UAT checklists + the 7 filed issues. No code fixes.
2. `fix(stores): restore window.stores.*.getState() for e2e tooling` — branch `fix/playtest-pt-004-store-api`. Resolves PT-004.
3. `fix(home): scrub critical console errors on /` — branch `fix/playtest-pt-005-homepage-ws`. Resolves PT-005.
4. `chore(e2e): unbreak compendium + replay locators` — branch `fix/playtest-pt-006-pt-007-locators`. Resolves PT-006 + PT-007 (small fixes, batched).
5. `chore(e2e): scope mobile-navigation specs to Mobile Chrome project` — branch `chore/playtest-pt-008-mobile-nav-scope`. Resolves PT-008.
6. (Operational, post-playtest-Phase-0) `chore(e2e): refresh audit snapshots` — rebaselines the 31 screenshot drifts.
