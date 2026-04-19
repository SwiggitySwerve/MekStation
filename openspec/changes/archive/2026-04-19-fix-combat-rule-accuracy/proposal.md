# Change: Fix Combat Rule Accuracy

## Why

The original proposal drafted from `openspec/changes/archive/2026-02-12-full-combat-parity/proposal.md` Phase 0 listed 8 rule-accuracy bugs in the combat engine. A pre-implementation audit on 2026-04-17 established that **7 of the 8 bugs have already been fixed** by intermediate commits landed between the full-combat-parity archive and today. The 8th bug — a divergent heat-threshold table in `src/types/validation/HeatManagement.ts` that uses 5/10/15/18/20 thresholds instead of the canonical 8/13/17/24 — is still present in the codebase. Although `HeatManagement.ts` is currently only consumed by its own test file (no production imports), leaving a second source of truth for heat thresholds is a rule-accuracy landmine: a future refactor or new consumer could inadvertently wire the wrong table back into production. This change completes the fix-combat-rule-accuracy objective by:

1. Consolidating `HeatManagement.ts` to reference or remove its divergent table so `src/constants/heat.ts` is unambiguously the single source of truth.
2. Adding regression-guard unit tests for each of the 7 already-correct behaviors so silent re-introduction of the original bugs will fail tests at merge time.

This is the last accuracy delta before Lane A's wiring work begins — downstream changes (`wire-real-weapon-data`, `integrate-damage-pipeline`, etc.) depend on every behavior in this list being provably stable.

## What Changes

**Remove divergent heat table:**

- Retarget `HeatManagement.ts` to import thresholds from `src/constants/heat.ts` instead of defining its own. The `HEAT_SCALE_EFFECTS` table SHALL either be deleted (if no consumer remains) or rebuilt from the canonical thresholds so the two sources cannot drift.
- `HeatLevel` enum stays (it's a UI-level label mapping, not a threshold table) but its numeric values SHALL align with canonical thresholds (8, 13, 17, 24) rather than the current 5/10/15/18/20.
- `getHeatScaleEffect`, `isShutdownRisk`, `getAmmoExplosionRisk` if still needed SHALL read from `HEAT_TO_HIT_TABLE` + `AMMO_EXPLOSION_TN_TABLE` + `getShutdownTN` in `constants/heat.ts` rather than the local `HEAT_SCALE_EFFECTS`.
- The duplicate `getHeatMovementPenalty` in `HeatManagement.ts` SHALL be removed in favor of the one in `constants/heat.ts`.

**Add regression tests** for each previously-fixed behavior so future refactors cannot silently reintroduce the bugs:

- Target-prone modifier: adjacent attacker → -2; 2 hexes → +1; 12 hexes → +1; standing target → 0
- TMM bracket table: 0/2 → 0; 3/4 → +1; 5/6 → +2; 7/8/9 → +3; 10/17 → +4; 18/24 → +5; 25/40 → +6
- Heat to-hit modifier: 0/7 → 0; 8/12 → +1; 13/16 → +2; 17/23 → +3; 24/40 → +4
- Consciousness check: roll of TN succeeds; roll of TN-1 fails; wound at threshold requires check
- Weapon Specialist SPA: matched weapon type → -2; unmatched → 0; no SPA → 0
- Sniper SPA: short mod +0 → 0 reduction; medium +2 → -1; long +4 → -2; extreme +6 → -3
- Jumping Jack SPA: attacker jumping → -2 to attacker to-hit; attacker walking → 0
- Life support crit: 1 hit → not destroyed; 2 hits → destroyed

## Dependencies

- **Requires**: None — this is a pure bug-fix + regression-guard delta
- **Blocks**: `wire-real-weapon-data`, `wire-firing-arc-resolution`, `integrate-damage-pipeline`, `wire-heat-generation-and-effects`, `wire-piloting-skill-rolls` (all downstream wiring depends on these behaviors being provably stable — the regression tests make that provable)

## Impact

- **Affected specs**: `to-hit-resolution` (MODIFIED — scenarios describe already-current behavior, added for regression coverage), `heat-overflow-effects` (MODIFIED — threshold table alignment), `piloting-skill-rolls` (MODIFIED — consciousness scenario), `spa-combat-integration` (MODIFIED — SPA scenarios), `critical-hit-system` (MODIFIED — life support scenario)
- **Affected code**: `src/types/validation/HeatManagement.ts` (consolidate), `src/__tests__/unit/types/validation/HeatManagement.test.ts` (update for new thresholds), new regression-guard test files under `src/utils/gameplay/toHit/__tests__/`, `src/utils/gameplay/spaModifiers/__tests__/`, `src/utils/gameplay/damage/__tests__/`, `src/types/validation/__tests__/`
- **No production-code changes to combat logic** — only the `HeatManagement.ts` consolidation is a real behavior change, and that change is a no-op for the combat engine today because no production code imports from it.
- **Test fallout**: the existing `HeatManagement.test.ts` uses the old 5/10/15/18/20 thresholds and will need updating to the canonical 8/13/17/24.
- **No new files or dependencies beyond test files**.

## Audit Evidence (2026-04-17)

| #   | Original Bug                    | Current State                                                                    | Verified At                 |
| --- | ------------------------------- | -------------------------------------------------------------------------------- | --------------------------- |
| 1   | Prone modifier reversed         | Fixed — `range <= 1 ? -2 : 1`                                                    | `damageModifiers.ts:16`     |
| 2   | TMM `ceil(/5)` approximation    | Fixed — canonical bracket table                                                  | `toHit/constants.ts:38`     |
| 3   | 3 divergent heat tables         | **Partial** — `constants/heat.ts` canonical; `HeatManagement.ts` still divergent | `HeatManagement.ts:60`      |
| 4   | Consciousness off-by-one `>`    | Fixed — uses `>=`                                                                | `damage/pilot.ts:28`        |
| 5   | Weapon Specialist -1            | Fixed — returns `-2`                                                             | `weaponSpecialists.ts:26`   |
| 6   | Sniper zeroes medium only       | Fixed — `-Math.floor(mod/2)`                                                     | `weaponSpecialists.ts:91`   |
| 7   | Jumping Jack on target piloting | Fixed — attacker to-hit on jump                                                  | `abilityModifiers.ts:64-76` |
| 8   | Life support hitsToDestroy = 1  | Fixed — `hitsToDestroy: 2`                                                       | `CriticalHitSystem.ts:122`  |
