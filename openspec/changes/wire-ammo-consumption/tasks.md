# Tasks: Wire Ammo Consumption

## 0. Prerequisites

- [x] 0.1 `fix-combat-rule-accuracy` merged
- [x] 0.2 `wire-real-weapon-data` merged (catalog reads stable; attack-resolved payload shape frozen before this change layers `ammoBinId` onto it)

## 0.5 Event Enum Alignment

Audit [src/types/gameplay/GameSessionInterfaces.ts](src/types/gameplay/GameSessionInterfaces.ts).

- [x] 0.5.1 Confirm existing: `AmmoConsumed` (line 114), `AmmoExplosion` (102)
- [x] 0.5.2 Add new enum value: `AttackInvalid = 'attack_invalid'`
- [x] 0.5.3 Define `IAttackInvalidPayload { attackerId, weaponId, reason: 'OutOfAmmo' | 'OutOfRange' | 'NoLineOfSight' | 'InvalidTarget', details?: string }`. The reason union is future-extensible — this change only uses `OutOfAmmo`, but the type anticipates ranges/LOS/target validation invalidations added by other changes
- [x] 0.5.4 Add `IAttackInvalidPayload` to `IGameEventPayload` discriminated union
- [x] 0.5.5 Confirm `IAmmoConsumedPayload` shape matches this change's spec (`{binId, weaponId, remainingRounds}`); extend if missing fields
- [ ] 0.5.6 Compile check: `tsc --noEmit` passes

## 1. Bin State Initialization

- [x] 1.1 Audit `ammoTracking.ts` — confirm `IAmmoBin` state shape (`binId`, `weaponType`, `location`, `remainingRounds`, `maxRounds`, `isExplosive`)
- [x] 1.2 At session creation, scan each unit's construction data for ammo components and produce one bin per ton
- [x] 1.3 Store the ammo bins on `IUnitGameState.ammoBins`
- [x] 1.4 Unit test: a mech with 2 tons AC/10 ammo produces 2 bins of 10 rounds each
- [x] 1.5 Unit test: a mech with an explosive ammo type (e.g., AC/20) marks the bin `isExplosive: true`

## 2. Bin Lookup Helper

- [x] 2.1 Add `findFirstMatchingBin(unit, weapon)` in `ammoTracking.ts` that returns the first non-empty bin whose `weaponType` matches the weapon's ammo category
- [x] 2.2 Return type is `IAmmoBin | null` — null means OutOfAmmo
- [x] 2.3 Deterministic ordering: bins scanned in declaration order; first non-empty wins
- [x] 2.4 Unit test: two bins, first empty, returns the second

## 3. Consumption in Attack Path

- [x] 3.1 In `gameSessionAttackResolution.ts`, before a weapon fires, call `findFirstMatchingBin`
- [x] 3.2 On match, decrement `remainingRounds` by 1 (single-shot) or 1 salvo (cluster)
- [x] 3.3 Emit `AmmoConsumed { binId, weaponId, remainingRounds }` after decrement
- [x] 3.4 On null (OutOfAmmo), emit `AttackInvalid { reason: 'OutOfAmmo', weaponId }` and return — no damage, no heat, no `AttackResolved`
- [x] 3.5 Unit test: firing an AC/10 with 1 bin of 10 rounds decrements to 9; firing 10 more times makes subsequent firings invalid
- [ ] 3.6 Unit test: cluster weapon (LRM-20) decrements by 1 salvo per firing, not 20

## 4. Energy Weapon Bypass

- [x] 4.1 Energy weapons (laser family, PPC family, flamer family) SHALL NOT call `findFirstMatchingBin`
- [x] 4.2 Energy weapons SHALL NOT produce `AmmoConsumed` events
- [x] 4.3 Unit test: firing a Medium Laser does not touch any ammo bin and emits no `AmmoConsumed`

## 5. Event Payload Extension

- [x] 5.1 Add `ammoBinId: string | null` to the `AttackResolved` payload — null for energy weapons, set for ammo-consuming weapons
- [ ] 5.2 Update event log UI consumer to display "from Bin X (N rounds left)" when `ammoBinId` is present
- [ ] 5.3 Confirm no other consumer breaks on the new field

## 6. Bot Ammo Awareness

- [ ] 6.1 Update `AttackAI.selectWeapons` to skip weapons whose ammo-type has zero non-empty bins
- [ ] 6.2 Bot SHALL NOT declare a firing for a dry weapon (even if the weapon is otherwise best-scored)
- [ ] 6.3 Unit test: a bot with a dry AC/20 and a non-dry Medium Laser picks the Medium Laser

## 7. Replay Fidelity

- [ ] 7.1 Replay test: reprocessing an event stream starting from session creation produces identical final bin states
- [ ] 7.2 `AmmoConsumed` events SHALL be idempotent — replaying the stream starts bins at `maxRounds` and applies each decrement in order
- [ ] 7.3 Replay does NOT re-fire the `AttackInvalid { OutOfAmmo }` validation — the originally-invalidated attack is a historical record and is not retried

## 8. Per-Change Smoke Test

- [x] 8.1 Fixture: 1 mech with an AC/10 + 1 ton ammo (10 rounds); 1 target at range 3
- [x] 8.2 Action: fire the AC/10 10 times in succession
- [ ] 8.3 Assert: 10 `AmmoConsumed` events with `remainingRounds` decreasing 9..0
- [x] 8.4 Action: fire the AC/10 an 11th time
- [x] 8.5 Assert: `AttackInvalid { reason: 'OutOfAmmo', weaponId }` fires; no `AttackResolved` for this attempt; no heat charged
- [x] 8.6 Energy weapon fixture: fire Medium Laser 10 times; assert zero `AmmoConsumed` events and no bin touched
- [ ] 8.7 Replay: reprocessing the event stream produces identical bin states at every step

## 9. Validation

- [x] 9.1 Run `openspec validate wire-ammo-consumption --strict`
- [ ] 9.2 Run the autonomous fuzzer and confirm no new invariant violations around bin state
- [ ] 9.3 Build + lint clean
