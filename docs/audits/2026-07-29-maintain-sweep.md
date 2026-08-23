# Maintenance Report — src (+ scripts / full-repo) — 2026-07-29

Product gate scanner: `scripts/maintenance/scan-maintenance.mjs`  
Commands:

```bash
npm run maintain:scan:gate
node scripts/maintenance/scan-maintenance.mjs --scope=src --json --limit=500
node scripts/maintenance/scan-maintenance.mjs --scope=scripts --json --limit=500
node scripts/maintenance/scan-maintenance.mjs --json --limit=200
```

Raw artifacts: `.tmp/maintain-scan-src-2026-07-29.json`, `.tmp/maintain-scan-scripts-2026-07-29.json`, `.tmp/maintain-report-aggregates-2026-07-29.json`

## Funnel (computed in code)

```text
src:      detected=390  criticalHigh=0  bySev={info:390}
scripts:  detected=100  criticalHigh=0  bySev={info:100}
full-repo detected=510  criticalHigh=0  bySev={medium:2, info:508}
gate:     Baseline regressions: 0  (criticalHigh baseline=0, current=0)
```

| Detected pre-cap | Emitted candidates                   | REFUTE-verified severe | Refuted                      | Severe after REFUTE |
| ---------------- | ------------------------------------ | ---------------------- | ---------------------------- | ------------------- |
| 510 (full-repo)  | 390 src / 100 scripts / 4 stale-todo | 0 defect               | n/a (no high/critical queue) | 0                   |

## Excluded (Not Scanned / out of product gate)

| Surface                                                            | Reason                                                                             |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `node_modules`, `.next`, `.tmp`, coverage, dist, playwright-report | Scanner `skipDirs`                                                                 |
| Generated / fixtures / seeds / mocks                               | Bloat + duplicate exclusions                                                       |
| Ephemeral BV/debug scripts under `scripts/`                        | Complexity not gated; bloat/dupes still reported as info                           |
| Oxlint / `tsc`                                                     | Not part of `maintain:scan` categories (separate CI / parked from 2026-07-11 pass) |

## Defect Severity (REFUTE-minted only)

| Category | Critical | High | Medium | Low |
| -------- | -------- | ---- | ------ | --- |
| _(none)_ | 0        | 0    | 0      | 0   |

No candidate reached defect-critical/high. Zero `critical`/`high` scanner findings under `src`, `scripts`, or full-repo.

## Debt Magnitude (shape / advisory; never summed with defects)

| Category                                                                                        | High | Medium | Low | Info |
| ----------------------------------------------------------------------------------------------- | ---- | ------ | --- | ---- |
| file-bloat (`src`)                                                                              | 0    | 0      | 0   | 331  |
| near-duplicate (`src`)                                                                          | 0    | 0      | 0   | 59   |
| file-bloat (`scripts`)                                                                          | 0    | 0      | 0   | 34   |
| near-duplicate (`scripts`)                                                                      | 0    | 0      | 0   | 66   |
| stale-todo (full-repo / e2e)                                                                    | 0    | 2      | 0   | 2    |
| type-safety / dead-code / import-health / complexity / code-smell / design-violation / test-gap | 0    | 0      | 0   | 0    |

Baseline drift (info only; does not fail gate): file-bloat info **306 → 331** (+25), near-duplicate info **64 → 59** (−5).

## Fix-Hazard Findings

None — no deletion/unify/suppression fixes were queued (empty critical/high + deletion-target queue).

## Critical & High Findings (Action Required)

None.

## Medium Findings (Address When Touching)

### stale-todo (REFUTE)

| #   | File                        | Line | Days | Verdict                                                                                                                                                                                |
| --- | --------------------------- | ---- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `e2e/audit-capture.spec.ts` | 142  | 31   | `{status: CONFIRMED, severity: medium, scenarioGrade: NONE, fix: FIX-OK, evidence: [e2e/audit-capture.spec.ts:142], scenario: "NONE — parked screenshot baseline with tracker T2-F1"}` |
| 2   | `e2e/audit-capture.spec.ts` | 319  | 31   | same as #1 at line 319                                                                                                                                                                 |

Comments are `fixme(RC2 / tracker T2-F1)` on `test.fixme` screenshot cases. Debt only — no runtime failure scenario. Options: leave parked, rewrite wording to drop TODO-like tokens, or resolve the tracker and un-skip.

## Low/Info Findings (Track — unverified shape debt)

### Top `src` file-bloat (advisory LOC)

| LOC | File                                                                       | Profile      |
| --- | -------------------------------------------------------------------------- | ------------ |
| 549 | `src/utils/gameplay/physicalAttacks/restrictionActionValidationHelpers.ts` | validation   |
| 537 | `src/simulation/runner/SimulationRunnerState.ts`                           | orchestrator |
| 537 | `src/stores/campaign/useCampaignPersistenceStore.ts`                       | standard     |
| 535 | `src/lib/multiplayer/server/bindCampaignSyncConnection.ts`                 | standard     |
| 528 | `src/stores/useGameplayStore.ts`                                           | standard     |
| 517 | `src/utils/gameplay/physicalAttacks/displacementValidationCore.ts`         | validation   |
| 508 | `src/types/multiplayer/Protocol.ts`                                        | standard     |
| 507 | `src/components/gameplay/GameplayLayout.tsx`                               | standard     |
| 493 | `src/components/customizer/vehicle/VehicleTurretTab.tsx`                   | standard     |
| 485 | `src/pages-modules/gameplay/campaigns/CampaignCoopEntryPanel.tsx`          | standard     |

### Top `src` near-duplicate clusters (info)

| Copies | Anchor                                                                | Notes                                                        |
| ------ | --------------------------------------------------------------------- | ------------------------------------------------------------ |
| 24     | `src/components/campaign/bays/MedicalBay.tsx:8`                       | Likely shared import/UI boilerplate across campaign/gameplay |
| 17     | `src/simulation/runner/CombatActionSupport.gameIntentSourceRefs.ts:6` | Combat SOURCE_REFS catalog pattern                           |
| 16     | `src/components/audit/diff/NestedDiff.tsx:110`                        | Cross-feature 8-line cluster                                 |
| 14     | `src/components/common/icons/NavigationIcons.tsx:243`                 | Icon/JSX pattern                                             |

### Top `scripts` file-bloat (info; separate lane per AGENTS.md)

| LOC | File                                |
| --- | ----------------------------------- |
| 593 | `scripts/validate-bv-crit-scan.ts`  |
| 586 | `scripts/validate-bv-calculator.ts` |
| 577 | `scripts/audit-ammo-matching.ts`    |
| 490 | `scripts/validate-bv-ammo-rules.ts` |

## Structural Referral

Skipped — no Scanner 1 critical/high file-bloat candidates, no Scanner 10 god-class critical/high, no Scanner 7 high test-gap pile, no Scanner 11 critical 4+ semantic-divergent copies. Product gate remains at 0 critical/high.

## Notes

- Local branch `main` was **24 commits behind** `origin/main` at scan time; re-run after pull if comparing to CI HEAD.
- Uncommitted local change: `AGENTS.md` only (not part of this scan).
- Prior floor: [2026-07-11-maintain-remaining-debt.md](./2026-07-11-maintain-remaining-debt.md) left parked oxlint `max-lines` / `exhaustive-deps` and BV script architecture as follow-ups — still out of `maintain:scan:gate`.
