# Tasks: Wire Real Weapon Data

## 0. Prerequisites

Do NOT start this change until every box below is ticked. Starting early produces green-on-stub tests that mislead reviewers.

- [x] 0.1 `fix-combat-rule-accuracy` merged to main (canonical heat thresholds + TMM + consciousness fixes in place)

## 1. Audit Hardcoded Values

- [x] 1.1 Grep the engine and gameSession for `damage: 5`, `damage:5`, `damage = 5` and list every occurrence
- [x] 1.2 Grep for `heat: 3`, `heat:3`, `heat = 3` and list every occurrence
- [x] 1.3 Grep for the tuple `(3, 6, 9)` or range arrays `[3, 6, 9]` and list every occurrence
- [x] 1.4 Grep for `weapons.length * 10` heat approximation and list every occurrence
- [x] 1.5 Produce an audit list and check each call site against its fix

## 2. Weapon Catalog Integration

- [x] 2.1 Confirm the weapon catalog exposes `IWeaponData` with damage, heat, shortRange, mediumRange, longRange, optional extremeRange, optional minimumRange
- [x] 2.2 Add a helper `getWeaponData(weaponId: string): IWeaponData` if one doesn't already exist
- [ ] 2.3 Verify the helper resolves both IS and Clan weapon IDs via canonicalization

## 3. Replace Hardcoded Damage

- [x] 3.1 In `gameSessionAttackResolution.ts`, read damage from the fired weapon's `IWeaponData` instead of using 5
- [x] 3.2 In `GameEngine.ts` / `GameEngine.phases.ts`, thread the real damage value into the attack-resolved event payload
- [x] 3.3 Update any default-damage fallbacks to throw / log a warning when a weapon has no data, instead of silently defaulting to 5
- [x] 3.4 Update unit tests to assert real damage values per weapon

## 4. Replace Hardcoded Heat

- [x] 4.1 Read heat from the fired weapon's `IWeaponData` in the attack-resolution path
- [x] 4.2 Accumulate heat per firing unit for the current turn
- [x] 4.3 Remove the `weapons.length * 10` approximation
- [x] 4.4 Unit tests: firing 1 Medium Laser generates 3 heat; firing 1 PPC generates 10 heat; firing both generates 13

## 5. Replace Hardcoded Range

- [x] 5.1 Remove the `(3, 6, 9)` constant from the to-hit path
- [x] 5.2 Use `IWeaponData.shortRange / mediumRange / longRange` to determine the bracket
- [x] 5.3 Apply `extremeRange` bracket when present and rules level allows
- [x] 5.4 Unit tests: AC/20 short=3, med=6, long=9; LRM-20 short=7, med=14, long=21

## 6. Event Payload Updates

- [x] 6.1 Add `damage`, `heat`, `weaponId` fields to the attack-resolved event payload (NOT `ammoBinId` — that's `wire-ammo-consumption`)
- [x] 6.2 Update the event-log UI consumer to display the new fields
- [ ] 6.3 Replay-fidelity test: replaying the same event sequence produces identical damage + heat numbers on the resolved payloads

## 7. BotPlayer Integration (damage + heat only)

- [x] 7.1 Update `AttackAI.ts` to use real weapon damage when scoring target priority
- [x] 7.2 Update `AttackAI.ts` to respect heat cost when scoring weapon usage
- [x] 7.3 Unit test: a PPC scores higher than a Medium Laser for a target that can absorb the heat
- [x] 7.4 Bot ammo-awareness (skipping dry weapons) is explicitly deferred to `wire-ammo-consumption`

## 8. Test Fixture Cleanup

- [x] 8.1 Convert `src/__tests__/unit/utils/gameplay/attackResolution.test.ts` hardcoded fixtures to real weapon data or explicit mock
- [ ] 8.2 Document the reason for any remaining `damage: 5` literal (unit test on attack-flow plumbing only, damage value arbitrary)
- [x] 8.3 Full test suite passes

## 9. Scope Boundaries

- [x] 9.1 This change SHALL NOT add, modify, or consume `IAmmoBin` state
- [x] 9.2 This change SHALL NOT emit `AmmoConsumed` or `AttackInvalid { reason: OutOfAmmo }` events
- [x] 9.3 If during implementation an ammo-related call site is encountered, leave it stubbed (or matching the pre-existing infinite-ammo placeholder) and annotate with a `// TODO(wire-ammo-consumption)` comment

## 10. Per-Change Smoke Test

Proves this change's contribution to the event stream without running a full match. If the Phase 1 capstone in `add-victory-and-post-battle-summary` later fails, this smoke test isolates whether the regression is in THIS change or downstream.

- [x] 10.1 Fixture: 1 attacker mech (Hunchback HBK-4G — catalog AC/20 + 2 ML) vs. 1 target at range 3 hexes, front arc
- [x] 10.2 Action: one attack phase, AC/20 + both ML fire and hit
- [x] 10.3 Assert: the `AttackResolved` event payloads carry `damage` matching catalog values (20, 5, 5 not 5, 5, 5), `heat` matching catalog (6, 3, 3 not 3, 3, 3), and `weaponId` matching each fired weapon
- [x] 10.4 Assert: firing-unit heat generated this turn = 12 (6 + 3 + 3), NOT `weapons.length * 10` = 30
- [ ] 10.5 Replay assertion: replaying the event log produces identical payloads byte-for-byte

## 11. Validation

- [ ] 11.1 Run `openspec validate wire-real-weapon-data --strict`
- [ ] 11.2 Run the autonomous fuzzer and confirm no new invariant violations
- [x] 11.3 Build + lint clean
