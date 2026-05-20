# Phase 1 Smoke Matrix Triage

**Date**: 2026-05-19
**Plan**: `~/.claude/plans/snappy-sprouting-giraffe.md` Phase 1
**Driver**: `scripts/swarm-configs/smoke/run-matrix.js`
**Raw output**: `playtest/swarm-runs/smoke/aggregate.json`, `matrix-run.log` (gitignored — regenerate via `node scripts/swarm-configs/smoke/run-matrix.js`)

## Headline

- **130 runs across 13 configs** (2 configs failed BudgetUnsatisfiable — see PT-010)
- **0 critical-halt runs**
- **0 P0 invariant violations** (no armor-below-zero, no negative heat, no duplicate positions)
- **283 detector hits** — all false-positive or expected-behavior:
  - 125× `state-cycle` (critical severity, but detector design false-positive — see PT-001)
  - 158× `heat-suicide` (warning severity, expected for default AI tier — see PT-002)
- **Draw rate strongly correlates with map size** (see PT-003):
  - r8 (small) → 30–40% draws
  - r12 (medium) → 60–90% draws
  - r20 (large) → **100% draws** (all 4 r20 configs)

## Conclusion

**Phase 1 surfaced zero new P0/P1 defects.** Findings confirm three pre-existing Phase 0 baseline P2/P3 observations (PT-001/-002/-003) at higher confidence with broader evidence, plus one new low-severity P3 finding (PT-010: BudgetUnsatisfiable at 10kBV/2-unit). The combat engine + AI + scenario-objective + morale interactions are all internally consistent at the invariant level — no crashes, no corruption, no impossible states.

The user-facing observation that "battles draw on large maps" is a **tuning concern**, not a defect: combat events fire correctly (191 attacks → 35 hits → 5 component-destroys per typical 50-turn run), units just don't accumulate enough damage within the default 50-turn limit when the map is large enough that the AI doesn't reliably close to range.

## Per-Config Outcomes

| Config                          | runs | no-winner | avgT | Notes                                     |
| ------------------------------- | ---- | --------- | ---- | ----------------------------------------- |
| 10k_default_r12                 | —    | —         | —    | **FAILED** — BudgetUnsatisfiable (PT-010) |
| 10k_default_r20                 | —    | —         | —    | **FAILED** — BudgetUnsatisfiable (PT-010) |
| 3k_default_r8                   | 10   | 4/10      | 36.2 | r8 forces engagement                      |
| 3k_default_r12                  | 10   | 9/10      | 49.5 | turn-limit stalls                         |
| 3k_default_r20                  | 10   | 10/10     | 50.0 | full 100% draw                            |
| 6k_aggressive-vs-defensive_r12  | 10   | 6/10      | 47.3 | aggressive variant closes faster          |
| 6k_aggressive-vs-skirmisher_r12 | 10   | 8/10      | 49.4 | skirmisher kites; near-100% draw          |
| 6k_default_r8                   | 10   | 3/10      | 38.8 | r8 forces engagement                      |
| 6k_default_r12                  | 10   | 9/10      | 49.9 | turn-limit stalls                         |
| 6k_default_r20                  | 10   | 10/10     | 50.0 | full 100% draw                            |
| 6k_default_elite_r12            | 10   | 7/10      | 45.9 | elite resolves slightly more              |
| 6k_default_veteran_r12          | 10   | 9/10      | 49.6 | comparable to regular                     |
| 6k_default_green_r12            | 10   | 10/10     | 50.0 | green never resolves                      |
| 6k_elite-vs-green_r12           | 10   | 6/10      | 47.5 | asymmetric pulls more decisions           |
| 6k_skirmisher-vs-skirmisher_r20 | 10   | 10/10     | 50.0 | both kite; full draw                      |

Pilot-skill ordering, r12 resolution rate: **elite > regular > veteran > green** (elite 30% → green 0%). Veteran underperforms regular slightly — single sample, may be noise.

## Detector Hit Distribution

### state-cycle (125 hits)

Fires on **every config**, first hit at turn 3 in all r12+ configs and most r8 configs. Root cause: `BattleStateSnapshot` captures only `{armor, structure, heat}` per unit (see `src/simulation/detectors/shared/snapshots.ts:12-17`). When two snapshots have identical armor + structure + heat — common in opening turns before units have closed to range — the detector reports "state repeating", even though units have legitimately moved several hexes between turns. **Not a combat-engine bug**; the detector lacks positional awareness.

### heat-suicide (158 hits)

Threshold = 30 heat in a single turn. Most hits are 31–35 heat (1–5 over threshold), spread across all configs. Default Wave-2 AI tier prioritizes weapon usage over heat budget when no heat-shutdown rule fires (heat-shutdown is in the project's known-limitations list). **Expected behavior at warning severity, not a defect.**

## Cross-reference: Known-Limitations Exclusion List

| Detector hit | In KL list?                            | Action                                                                |
| ------------ | -------------------------------------- | --------------------------------------------------------------------- |
| state-cycle  | NO                                     | Detector improvement candidate, not engine fix (PT-001 stays open P2) |
| heat-suicide | adjacent (`heat-shutdown` is excluded) | warning-severity behavior, log not fix (PT-002 stays open P3)         |

## Findings → Issue Ledger

| ID                                        | Severity    | Effect of Phase 1 evidence                                                                                                                                |
| ----------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PT-001** state-cycle false-positive     | P2 (was P2) | Confirmed at higher confidence — 125 hits / 130 runs (96%). Snapshot scope is the root cause.                                                             |
| **PT-002** heat-suicide warnings          | P3 (was P3) | Confirmed at similar rate — 158/130 = 1.21 per run vs baseline 77/50 = 1.54 per run. Trending normal.                                                     |
| **PT-003** turn-limit draws               | P3 (was P3) | Phase 1 quantifies the map-radius correlation. Confirms turnLimit=50 is too short for r20 maps with default AI. Tuning question for follow-up wave.       |
| **PT-010** BudgetUnsatisfiable @ 10kBV/2u | P3 (NEW)    | Force generator can't produce 2-unit pairs summing to 10,000 BV from current unit catalog. Either widen catalog or default unitCount up at high BV bands. |

## Deepening Trigger Evaluation

> Plan rule: "if a single config produces >2 defect classes, expand its surrounding cells"

No config triggered the rule. The two detector classes are uniform across configs (not clustered to one cell), and the BudgetUnsatisfiable failure is a catalog/generator issue, not a per-cell anomaly. **No deepening needed for Phase 1.**

## Decisions

1. **Phase 1 closes here.** No P0/P1 defects, no critical-halt, all P2/P3 findings logged.
2. **Move to Phase 2** (Single-Player Browser UAT) per plan.
3. **PT-001 / PT-003 fixes are non-blocking**: detector improvement + turnLimit raise are good polish wave candidates, not playtest blockers.
4. **PT-010 fix is non-blocking**: matrix runs fine without 10kBV / 2-unit configs; widen `unitCount` for the high-BV band in a follow-up sweep if desired.
