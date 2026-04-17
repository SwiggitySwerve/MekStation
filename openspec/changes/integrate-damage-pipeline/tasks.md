# Tasks: Integrate Damage Pipeline

## 0. Prerequisites

- [ ] 0.1 `fix-combat-rule-accuracy` merged to main (life-support 2-hit + consciousness fixes feed into `resolveDamage` semantics)
- [ ] 0.2 `wire-real-weapon-data` merged to main (real damage values arrive at the pipeline; otherwise every integration test runs at `damage: 5`)
- [ ] 0.3 `wire-firing-arc-resolution` merged to main (real arc is the primary input to the hit-location table selector)

## 0.5 Event Enum Alignment (type-file ownership)

Audit [src/types/gameplay/GameSessionInterfaces.ts](src/types/gameplay/GameSessionInterfaces.ts) and own the diff within THIS change. Every downstream UI spec assumes these events exist; this is the change that makes them real.

- [ ] 0.5.1 Confirm existing: `DamageApplied` (line 94), `CriticalHit` (103), `CriticalHitResolved` (106), `PilotHit` (100), `UnitDestroyed` (101)
- [ ] 0.5.2 Add new enum values: `LocationDestroyed = 'location_destroyed'`, `TransferDamage = 'transfer_damage'`, `ComponentDestroyed = 'component_destroyed'`
- [ ] 0.5.3 Reconcile name: spec text uses `AmmoExploded`; enum already has `AmmoExplosion = 'ammo_explosion'` (line 102). Align the spec and code to the enum name `AmmoExplosion` — do NOT add a second alias
- [ ] 0.5.4 Define payload interfaces for the three new events: `ILocationDestroyedPayload { unitId, location, cascadedTo?: location }`, `ITransferDamagePayload { unitId, fromLocation, toLocation, damage }`, `IComponentDestroyedPayload { unitId, location, componentType, slotIndex }`
- [ ] 0.5.5 Add each new payload to the `IGameEventPayload` discriminated union
- [ ] 0.5.6 Compile check: `tsc --noEmit` passes; every new event has a payload and every new payload is in the union

## 1. Attack Path Hookup

- [ ] 1.1 In `gameSessionAttackResolution.ts`, after a hit is confirmed, call `resolveDamage()` from `damage.ts`
- [ ] 1.2 Pass: damage amount, hit location, arc, attacker state, target state, seeded RNG
- [ ] 1.3 Receive the `ILocationDamageResult` (or equivalent) and translate to events
- [ ] 1.4 Remove or deprecate `applySimpleDamage()` from the simulation runner path

## 2. Hit Location Integration

- [ ] 2.1 Use the computed firing arc (from `wire-firing-arc-resolution`) to pick the hit-location table
- [ ] 2.2 Confirm `hitLocation.ts` accepts the seeded RNG parameter (not `Math.random`)
- [ ] 2.3 Emit the hit-location roll result as part of the attack event chain

## 3. Armor → Structure → Transfer Chain

- [ ] 3.1 Reduce armor first; excess transfers to internal structure
- [ ] 3.2 If structure reaches 0, mark the location destroyed and transfer excess per the canonical diagram (arms → side torso; legs → side torso; side torso → center torso; center torso destruction destroys the unit)
- [ ] 3.3 Transferred damage applies to the adjacent location's armor first, then its structure, then further transfers
- [ ] 3.4 Emit `TransferDamage` events for each transfer step
- [ ] 3.5 Emit `LocationDestroyed` events when a location reaches 0 structure

## 4. Side Torso Cascade

- [ ] 4.1 When left torso is destroyed, mark the left arm destroyed too (and all equipment in the left arm)
- [ ] 4.2 Same rule for right torso → right arm
- [ ] 4.3 Test: destroying the left torso emits `LocationDestroyed` for LT then for LA

## 5. Head Damage Cap

- [ ] 5.1 Cap a single standard-weapon hit to the head at 3 damage applied
- [ ] 5.2 Excess SHALL be discarded (not transferred)
- [ ] 5.3 Cluster weapons SHALL cap per cluster group independently
- [ ] 5.4 Unit tests: AC/20 to head applies 3, discards 17; LRM-20 with 6 hits caps each cluster at 3

## 6. Pilot Damage From Head Hits

- [ ] 6.1 When head damage penetrates armor and reaches structure, apply 1 pilot damage
- [ ] 6.2 Queue a consciousness check (uses the corrected `>=` from `fix-combat-rule-accuracy`)
- [ ] 6.3 Emit `PilotHit` event

## 7. 20+ Phase Damage PSR Trigger

- [ ] 7.1 Maintain per-unit `damageThisPhase` counter on `IUnitGameState`
- [ ] 7.2 When `damageThisPhase` crosses 20, queue a PSR with trigger `TwentyPlusPhaseDamage`
- [ ] 7.3 Reset `damageThisPhase` at phase boundary
- [ ] 7.4 PSR firing itself is handled by `wire-piloting-skill-rolls`; this task only queues

## 8. Critical Hit Resolution Hookup

- [ ] 8.1 When structure is exposed at a location by damage, call `resolveCriticalHits()` on that location
- [ ] 8.2 Pass the seeded RNG so replay reproduces the same slot selection
- [ ] 8.3 Roll 2d6 per exposed-structure hit; the table is: 2-7 → 0 crits, 8-9 → 1 crit, 10-11 → 2 crits, 12 → location-specific (limb blown off / head destroyed / 3 torso crits)

## 9. Critical Slot Selection

- [ ] 9.1 Build the slot manifest from occupied non-destroyed slots in the hit location
- [ ] 9.2 Select a slot uniformly at random via the seeded RNG
- [ ] 9.3 If no slot is selectable (all destroyed), the critical is discarded

## 10. Critical Effect Application

- [ ] 10.1 Engine crit: engine-hit counter +1; +5 heat per turn per engine hit; 3 hits → unit destroyed
- [ ] 10.2 Gyro crit: gyro-hit counter +1; +3 to all PSR TNs per hit; 2 hits → standard gyro destroyed → unit cannot stand
- [ ] 10.3 Cockpit crit: pilot killed immediately
- [ ] 10.4 Sensor crit: +1 to all attack to-hit at 1 hit, +2 at 2 hits
- [ ] 10.5 Life support crit: `hitsToDestroy = 2` (from `fix-combat-rule-accuracy`)
- [ ] 10.6 Heat sink crit: heat sink destroyed; dissipation capacity reduced
- [ ] 10.7 Jump jet crit: jump jet destroyed; max jump MP -1
- [ ] 10.8 Weapon crit: weapon destroyed; cannot fire
- [ ] 10.9 Actuator crit: per actuator type (shoulder / upper arm / lower arm / hand / hip / upper leg / lower leg / foot) with distinct effects; hip crit queues a PSR
- [ ] 10.10 Ammo crit: explosion of remaining rounds × weapon damage; CASE / CASE II protection honored

## 11. TAC Processing

- [ ] 11.1 When the hit-location roll is 2, call `resolveCriticalHits()` regardless of remaining armor
- [ ] 11.2 TAC location: Front/Rear → CT, Left → LT, Right → RT

## 12. Seeded RNG Plumbing

- [ ] 12.1 Ensure `resolveDamage`, `hitLocation`, `resolveCriticalHits` all accept an injected `IDiceRoller` parameter
- [ ] 12.2 Remove residual `Math.random()` from the damage/crit path
- [ ] 12.3 Replay test: replaying the same event log with the same seed produces identical unit state

## 13. Simulation Runner Parity

- [ ] 13.1 Replace `applySimpleDamage()` in `SimulationRunner.ts` with a call to `resolveDamage`
- [ ] 13.2 Ensure the autonomous fuzzer still passes invariants (no negative armor, no locations with > max armor, etc.)

## 14. Per-Change Smoke Test

- [ ] 14.1 Fixture: 1 target mech with CT armor reduced to 1, CT structure full
- [ ] 14.2 Action: fire 1 Medium Laser (5 damage) at CT front
- [ ] 14.3 Assert event stream contains in order: `AttackResolved` → `DamageApplied { location: CT, fromArmor: 1, fromStructure: 4 }` → `CriticalHit` (structure was exposed) → `CriticalHitResolved`
- [ ] 14.4 Assert event payload types are well-formed per the new interfaces added in 0.5.4
- [ ] 14.5 If the crit destroys a component, assert `ComponentDestroyed` fires with `{componentType, slotIndex}`

## 15. Validation

- [ ] 15.1 `openspec validate integrate-damage-pipeline --strict`
- [ ] 15.2 End-to-end test: fire 1 AC/20 to exposed CT structure → `DamageApplied` → `CriticalHit` → engine hit → `ComponentDestroyed` chain
- [ ] 15.3 Side torso cascade test: destroy LT → LA also destroyed with `LocationDestroyed { cascadedTo: LA }`
- [ ] 15.4 Head-cap test: single AC/20 to head applies only 3 damage
- [ ] 15.5 Build + lint clean
