# Tasks: Wire Real Weapon Data

## 1. Audit Hardcoded Values

- [ ] 1.1 Grep the engine and gameSession for `damage: 5`, `damage:5`, `damage = 5` and list every occurrence
- [ ] 1.2 Grep for `heat: 3`, `heat:3`, `heat = 3` and list every occurrence
- [ ] 1.3 Grep for the tuple `(3, 6, 9)` or range arrays `[3, 6, 9]` and list every occurrence
- [ ] 1.4 Grep for `weapons.length * 10` heat approximation and list every occurrence
- [ ] 1.5 Produce an audit list and check each call site against its fix

## 2. Weapon Catalog Integration

- [ ] 2.1 Confirm the weapon catalog exposes `IWeaponData` with damage, heat, shortRange, mediumRange, longRange, optional extremeRange, optional minimumRange
- [ ] 2.2 Add a helper `getWeaponData(weaponId: string): IWeaponData` if one doesn't already exist
- [ ] 2.3 Verify the helper resolves both IS and Clan weapon IDs via canonicalization

## 3. Replace Hardcoded Damage

- [ ] 3.1 In `gameSessionAttackResolution.ts`, read damage from the fired weapon's `IWeaponData` instead of using 5
- [ ] 3.2 In `GameEngine.ts` / `GameEngine.phases.ts`, thread the real damage value into the attack-resolved event payload
- [ ] 3.3 Update any default-damage fallbacks to throw / log a warning when a weapon has no data, instead of silently defaulting to 5
- [ ] 3.4 Update unit tests to assert real damage values per weapon

## 4. Replace Hardcoded Heat

- [ ] 4.1 Read heat from the fired weapon's `IWeaponData` in the attack-resolution path
- [ ] 4.2 Accumulate heat per firing unit for the current turn
- [ ] 4.3 Remove the `weapons.length * 10` approximation
- [ ] 4.4 Unit tests: firing 1 Medium Laser generates 3 heat; firing 1 PPC generates 10 heat; firing both generates 13

## 5. Replace Hardcoded Range

- [ ] 5.1 Remove the `(3, 6, 9)` constant from the to-hit path
- [ ] 5.2 Use `IWeaponData.shortRange / mediumRange / longRange` to determine the bracket
- [ ] 5.3 Apply `extremeRange` bracket when present and rules level allows
- [ ] 5.4 Unit tests: AC/20 short=3, med=6, long=9; LRM-20 short=7, med=14, long=21

## 6. Ammo State Initialization

- [ ] 6.1 Audit `ammoTracking.ts` — confirm `IAmmoBin` state shape (binId, weaponType, location, remainingRounds, maxRounds, isExplosive)
- [ ] 6.2 At session start, scan each unit's construction data for ammo components and produce one bin per ton
- [ ] 6.3 Store the ammo bins on `IUnitGameState`
- [ ] 6.4 Unit tests: a mech with 2 tons AC/10 ammo produces 2 bins of 10 rounds each

## 7. Ammo Consumption

- [ ] 7.1 On every weapon firing, locate the first non-empty bin matching the weapon's ammo type
- [ ] 7.2 Decrement `remainingRounds` by 1 (salvo count for cluster weapons)
- [ ] 7.3 Emit an `AmmoConsumed` event with the bin id and new remaining count
- [ ] 7.4 If no matching non-empty bin exists, emit `AttackInvalid` with reason `OutOfAmmo` and do NOT resolve the attack
- [ ] 7.5 Unit tests: firing an AC/10 with 1 bin of 10 rounds decrements to 9; firing 10 more times makes subsequent firings invalid

## 8. Energy Weapon Bypass

- [ ] 8.1 Energy weapons (lasers, PPCs, flamers) SHALL NOT consume ammo and SHALL NOT produce `AmmoConsumed` events
- [ ] 8.2 Unit test: firing a Medium Laser does not touch any ammo bin

## 9. Event Payload Updates

- [ ] 9.1 Add `damage`, `heat`, `weaponId`, `ammoBinId` fields to the attack-resolved event payload
- [ ] 9.2 Update the event-log UI consumer to display the new fields
- [ ] 9.3 Add a replay-fidelity test: replaying the same event sequence produces the same unit state

## 10. BotPlayer Integration

- [ ] 10.1 Update `AttackAI.ts` to use real weapon damage when scoring target priority
- [ ] 10.2 Update `AttackAI.ts` to respect ammo counts (don't pick a weapon with 0 rounds)
- [ ] 10.3 Update `AttackAI.ts` to respect heat cost when scoring weapon usage
- [ ] 10.4 Unit test: a dry AC/20 is never selected

## 11. Test Fixture Cleanup

- [ ] 11.1 Convert `src/__tests__/unit/utils/gameplay/attackResolution.test.ts` hardcoded fixtures to real weapon data or explicit mock
- [ ] 11.2 Document the reason for any remaining `damage: 5` literal (unit test on attack-flow plumbing only, damage value arbitrary)
- [ ] 11.3 Full test suite passes

## 12. Validation

- [ ] 12.1 Run `openspec validate wire-real-weapon-data --strict`
- [ ] 12.2 Run the autonomous fuzzer and confirm no new invariant violations
- [ ] 12.3 Build + lint clean
