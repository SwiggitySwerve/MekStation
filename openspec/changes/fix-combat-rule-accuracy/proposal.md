# Change: Fix Combat Rule Accuracy

## Why

MekStation's combat engine is ~90% correct, but 8 rule-accuracy bugs make the remaining 10% produce wrong outcomes. Prone targets are harder to hit from adjacent hexes than from range (reversed), the TMM formula scales linearly instead of using the canonical bracket table, three separate heat-threshold tables disagree with each other and with MegaMek, the consciousness check is off by one, two SPAs have wrong numeric values (Weapon Specialist, Sniper), one SPA targets the wrong roll (Jumping Jack), and life support destructs after a single hit instead of two. Until these bugs are fixed, every downstream wiring change (weapon data, damage pipeline, PSRs) propagates incorrect math. This is the foundational cleanup: pure bug-fix delta on already-shipped specs. See `openspec/changes/archive/2026-02-12-full-combat-parity/proposal.md` Phase 0 for the source bug list.

## What Changes

- **BREAKING**: Reverse the target prone modifier — adjacent attackers SHALL receive -2, attackers beyond 1 hex SHALL receive +1 (currently reversed)
- **BREAKING**: Replace the `ceil(hexesMoved / 5)` TMM approximation with the canonical TechManual p.115 bracket table (0-2 hexes → +0, 3-4 → +1, 5-6 → +2, 7-9 → +3, 10-17 → +4, 18-24 → +5, 25+ → +6)
- **BREAKING**: Consolidate the three contradicting heat-threshold tables (`toHit.ts`, `HeatManagement.ts`, `constants/heat.ts`) to a single MegaMek canonical source: +1 at heat 8, +2 at heat 13, +3 at heat 17, +4 at heat 24
- Fix the consciousness check off-by-one in `damage.ts` (current `>` SHALL become `>=` so pilots at the threshold correctly roll)
- Fix Weapon Specialist SPA to grant -2 (not -1) to the designated weapon type
- Fix Sniper SPA to halve all range modifiers (floor division), not merely zero the medium-range penalty
- Fix Jumping Jack SPA to modify the attacker's to-hit when jumping, not the target's piloting roll
- Fix life support `hitsToDestroy` in `critical-hit-system` to 2 (currently 1)

## Dependencies

- **Requires**: None — this is a pure bug-fix delta on existing specs
- **Blocks**: `wire-real-weapon-data`, `wire-firing-arc-resolution`, `integrate-damage-pipeline`, `wire-heat-generation-and-effects`, `wire-piloting-skill-rolls` (all downstream wiring depends on correct underlying math)

## Impact

- **Affected specs**: `to-hit-resolution` (prone, TMM, heat modifier), `heat-overflow-effects` (threshold table), `piloting-skill-rolls` (consciousness), `spa-combat-integration` (Weapon Specialist, Sniper, Jumping Jack), `critical-hit-system` (life support hitsToDestroy)
- **Affected code**: `src/utils/gameplay/toHit/`, `src/utils/gameplay/damage.ts`, `src/utils/gameplay/spaModifiers/`, `src/lib/spa/catalog.ts`, `src/types/validation/CriticalHitSystem.ts`, `src/constants/heat.ts`
- **No new files**. No new dependencies.
- **Test fallout**: Existing tests that assert the wrong values will need updating; the authoritative MegaMek reference values replace them.
