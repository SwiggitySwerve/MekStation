# Tasks: Fix Combat Rule Accuracy

## 1. Target Prone Modifier Fix

- [ ] 1.1 Locate the prone-modifier branch in `src/utils/gameplay/toHit/` (damageModifiers or movementModifiers)
- [ ] 1.2 Swap the constants — adjacent attacker SHALL yield -2, non-adjacent SHALL yield +1
- [ ] 1.3 Add/update unit tests covering adjacent vs. 2-hex vs. 5-hex attackers against a prone target
- [ ] 1.4 Update scenario in `to-hit-resolution` spec delta to encode the corrected direction

## 2. TMM Bracket Table

- [ ] 2.1 Delete `ceil(hexesMoved / 5)` formula usage
- [ ] 2.2 Introduce a constant lookup array representing the canonical brackets [0-2:+0, 3-4:+1, 5-6:+2, 7-9:+3, 10-17:+4, 18-24:+5, 25+:+6]
- [ ] 2.3 Wire the bracket lookup into `calculateToHit()` target-movement modifier
- [ ] 2.4 Unit tests for each bracket boundary (0, 2, 3, 4, 6, 9, 10, 17, 18, 24, 25, 40)
- [ ] 2.5 Update `to-hit-resolution` spec delta with new scenarios

## 3. Heat Threshold Consolidation

- [ ] 3.1 Identify the three heat-threshold definitions (`src/utils/gameplay/toHit.ts`, `src/types/validation/HeatManagement.ts`, `src/constants/heat.ts`)
- [ ] 3.2 Designate `src/constants/heat.ts` as the single source of truth
- [ ] 3.3 Set canonical thresholds: heat 8 → +1 to-hit, heat 13 → +2, heat 17 → +3, heat 24 → +4
- [ ] 3.4 Remove the other two definitions; update imports to reference the constants module
- [ ] 3.5 Confirm the threshold constants are used by `toHit/damageModifiers.ts` (heat mod)
- [ ] 3.6 Unit tests across all four threshold boundaries plus interior values (0, 7, 8, 12, 13, 16, 17, 23, 24, 40)
- [ ] 3.7 Update `heat-overflow-effects` spec delta

## 4. Consciousness Off-By-One

- [ ] 4.1 Locate the consciousness threshold comparison in `src/utils/gameplay/damage.ts` (~line 461)
- [ ] 4.2 Change the `>` comparison to `>=` so the boundary case rolls (per TechManual p.87)
- [ ] 4.3 Regression test: pilot at damage == threshold SHALL be required to make consciousness roll
- [ ] 4.4 Update `piloting-skill-rolls` spec delta for consciousness scenarios

## 5. Weapon Specialist SPA Value

- [ ] 5.1 Find Weapon Specialist definition in `src/lib/spa/catalog.ts` or equivalent
- [ ] 5.2 Change modifier from -1 to -2
- [ ] 5.3 Update SPA combat integration tests
- [ ] 5.4 Update `spa-combat-integration` spec delta (MODIFIED Requirement)

## 6. Sniper SPA Mechanic

- [ ] 6.1 Rewrite the Sniper SPA modifier logic so it halves (floor-div) every range modifier, not just zero medium
- [ ] 6.2 Short +0 → +0, Medium +2 → +1, Long +4 → +2, Extreme +6 → +3
- [ ] 6.3 Add unit tests for all four range brackets while Sniper is active
- [ ] 6.4 Update `spa-combat-integration` spec delta (MODIFIED Requirement)

## 7. Jumping Jack SPA Mechanic

- [ ] 7.1 Rewrite the Jumping Jack SPA so it applies to the attacker's to-hit when the attacker jumped, not to the target's piloting roll
- [ ] 7.2 Remove the incorrect wiring to `pilotingSkillRolls`
- [ ] 7.3 Wire into `toHit/movementModifiers.ts` or `abilityModifiers.ts` as a -1 when attacker movement type is Jump
- [ ] 7.4 Unit tests: jumping attacker with Jumping Jack receives -1 reduction on the +3 jump penalty
- [ ] 7.5 Update `spa-combat-integration` spec delta (MODIFIED Requirement)

## 8. Life Support HitsToDestroy

- [ ] 8.1 Update `src/types/validation/CriticalHitSystem.ts` life-support entry to `hitsToDestroy: 2`
- [ ] 8.2 Update any crit-resolution logic that assumes 1 hit destroys life support
- [ ] 8.3 Unit test: 1 life-support crit SHALL NOT destroy life support; 2 crits SHALL destroy it
- [ ] 8.4 Update `critical-hit-system` spec delta (MODIFIED Requirement)

## 9. Validation

- [ ] 9.1 Run full test suite; fix all downstream tests asserting the previously-wrong values
- [ ] 9.2 Run `openspec validate fix-combat-rule-accuracy --strict` and clear any structural issues
- [ ] 9.3 Confirm the autonomous-fuzzer invariants still pass (simulation-system harness)
- [ ] 9.4 Verify build + lint clean
