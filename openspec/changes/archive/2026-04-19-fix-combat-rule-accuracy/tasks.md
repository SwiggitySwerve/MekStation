# Tasks: Fix Combat Rule Accuracy

## 0. Audit Context

A pre-implementation audit (2026-04-17) confirmed 7 of the 8 originally-listed bugs have already been fixed. This change now targets:
(a) the remaining bug — duplicate `HeatManagement.ts` heat-threshold table, and
(b) regression-guard tests so the 7 already-fixed behaviors cannot silently re-break.

See `proposal.md` "Audit Evidence" section for file-by-file verification.

## 1. Consolidate Divergent Heat Table (Bug #3 — only live bug)

- [x] 1.1 Open `src/types/validation/HeatManagement.ts`. The local `HEAT_SCALE_EFFECTS` table uses thresholds 5/10/15/18/20, divergent from the canonical 8/13/17/24 in `src/constants/heat.ts`.
- [x] 1.2 Determine consumers of `HEAT_SCALE_EFFECTS`, `getHeatScaleEffect`, `isShutdownRisk`, `getAmmoExplosionRisk`, `getHeatMovementPenalty`, `calculateMovementHeat`, `HeatLevel`, `TSM_ACTIVATION_THRESHOLD`. Grep shows only the file itself + its own test file as consumers today.
- [x] 1.3 Replace the `HEAT_SCALE_EFFECTS` table with one derived from `constants/heat.ts` primitives — either: - (a) Delete `HEAT_SCALE_EFFECTS` + `getHeatScaleEffect` entirely if no external consumer remains, and rewrite the three downstream helpers (`isShutdownRisk`, `getAmmoExplosionRisk`, `getHeatMovementPenalty`) to call `getShutdownTN`, `getAmmoExplosionTN`, `getHeatMovementPenalty` from `constants/heat.ts` directly. Re-export from HeatManagement.ts for backwards compatibility if any external type-level consumer exists. - (b) OR rebuild `HEAT_SCALE_EFFECTS` as a derived view over the canonical tables so it stays a convenience shape but cannot drift from `constants/heat.ts`.
- [x] 1.4 Update `HeatLevel` enum values to align with canonical thresholds: `COOL = 0`, `WARM = 8` (first to-hit penalty), `HOT = 13` (second), `DANGEROUS = 17` (third), `CRITICAL = 24` (fourth), `SHUTDOWN_RISK = 14` (shutdown-check threshold), `SHUTDOWN_LIKELY = 20`, `MELTDOWN = 30`.
- [x] 1.5 Remove the duplicate `getHeatMovementPenalty` in `HeatManagement.ts`; re-export from `constants/heat.ts` if needed.
- [x] 1.6 Update `src/__tests__/unit/types/validation/HeatManagement.test.ts` — any test asserting the old 5/10/15/18/20 thresholds SHALL be updated to the canonical thresholds.

## 2. Regression Test: Target Prone Modifier

- [x] 2.1 Create `src/utils/gameplay/toHit/__tests__/damageModifiers.regression.test.ts`
- [x] 2.2 Test: `calculateProneModifier(true, 1)` returns `{value: -2}` (adjacent)
- [x] 2.3 Test: `calculateProneModifier(true, 2)` returns `{value: 1}` (2 hexes = penalty)
- [x] 2.4 Test: `calculateProneModifier(true, 12)` returns `{value: 1}` (long range)
- [x] 2.5 Test: `calculateProneModifier(false, 1)` returns `null` (standing target)

## 3. Regression Test: TMM Bracket Table

- [x] 3.1 Create `src/utils/gameplay/toHit/__tests__/movementModifiers.regression.test.ts`
- [x] 3.2 Test every TMM bracket boundary: hexesMoved values `0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 17, 18, 24, 25, 40` against expected TMM values `0, 0, 1, 1, 2, 2, 3, 3, 3, 4, 4, 5, 5, 6, 6`
- [x] 3.3 Test: `MovementType.Stationary` + 0 hexes returns `tmm = 0`
- [x] 3.4 Test: `MovementType.Jump` + 5 hexes still uses hex-count-based bracket (jump bonus handled separately in aggregator)

## 4. Regression Test: Heat To-Hit Modifier

- [x] 4.1 Create `src/constants/__tests__/heat.regression.test.ts` (new file, or append to existing heat test if present)
- [x] 4.2 Test `getHeatToHitModifier` at every threshold boundary: `0, 7, 8, 12, 13, 16, 17, 23, 24, 40` → `0, 0, 1, 1, 2, 2, 3, 3, 4, 4`
- [x] 4.3 Test: the function returns the max bracket for values beyond the last threshold (not cumulative)

## 5. Regression Test: Consciousness Check

- [x] 5.1 Extend `src/__tests__/unit/utils/gameplay/combat.test.ts` `applyPilotDamage` block with boundary tests
- [x] 5.2 Test: a pilot with 3 wounds taking 1 more wound has `consciousnessCheckRequired = true` and `consciousnessTarget = 3 + 4 = 7`
- [x] 5.3 Test: when `consciousnessRoll.total === consciousnessTarget`, `conscious = true` (boundary case succeeds — this is the `>=` fix)
- [x] 5.4 Test: when `consciousnessRoll.total === consciousnessTarget - 1`, `conscious = false`

## 6. Regression Test: Weapon Specialist SPA

- [x] 6.1 Create `src/utils/gameplay/spaModifiers/__tests__/weaponSpecialists.regression.test.ts`
- [x] 6.2 Test: `calculateWeaponSpecialistModifier(['weapon_specialist'], 'PPC', 'PPC')` → `{value: -2}`
- [x] 6.3 Test: `calculateWeaponSpecialistModifier(['weapon_specialist'], 'PPC', 'AC20')` → `null` (unmatched)
- [x] 6.4 Test: `calculateWeaponSpecialistModifier([], 'PPC', 'PPC')` → `null` (no SPA)

## 7. Regression Test: Sniper SPA

- [x] 7.1 Append to `weaponSpecialists.regression.test.ts`
- [x] 7.2 Test: `calculateSniperModifier(['sniper'], 0)` → `null` (short range — no reduction)
- [x] 7.3 Test: `calculateSniperModifier(['sniper'], 2)` → `{value: -1}` (medium halved)
- [x] 7.4 Test: `calculateSniperModifier(['sniper'], 4)` → `{value: -2}` (long halved)
- [x] 7.5 Test: `calculateSniperModifier(['sniper'], 6)` → `{value: -3}` (extreme halved)
- [x] 7.6 Test: `calculateSniperModifier([], 4)` → `null` (no SPA)

## 8. Regression Test: Jumping Jack SPA

- [x] 8.1 Create `src/utils/gameplay/spaModifiers/__tests__/abilityModifiers.regression.test.ts`
- [x] 8.2 Test: `calculateJumpingJackModifier(['jumping_jack'], MovementType.Jump)` → `{value: -2}` (attacker to-hit bonus when jumping)
- [x] 8.3 Test: `calculateJumpingJackModifier(['jumping_jack'], MovementType.Walk)` → `null` (not jumping)
- [x] 8.4 Test: `calculateJumpingJackModifier([], MovementType.Jump)` → `null` (no SPA)

## 9. Regression Test: Life Support HitsToDestroy

- [x] 9.1 Create `src/types/validation/__tests__/CriticalHitSystem.regression.test.ts` (or append to existing if present)
- [x] 9.2 Test: `getCriticalHitEffect(CriticalComponentType.LIFE_SUPPORT)?.hitsToDestroy === 2`
- [x] 9.3 Test: life-support effect description mentions "Pilot takes 1 damage at end of turn"

## 10. Validation

- [x] 10.1 Run `openspec validate fix-combat-rule-accuracy --strict` — structural check
- [x] 10.2 Run `npm test` — all new regression tests pass
- [x] 10.3 Run `npm run build` — build clean
- [x] 10.4 Run `npm run lint` — lint clean
- [x] 10.5 Verify no production code paths broken by `HeatManagement.ts` consolidation (grep for any imports of removed exports)
