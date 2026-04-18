# Tasks: Wire Piloting Skill Rolls

## 0. Prerequisites

Every upstream change below MUST be merged to main before starting. This change wires 26 PSR triggers driven by damage / heat / physical-attack outcomes — merging before the upstream path is real produces tests that validate stubs.

- [ ] 0.1 `fix-combat-rule-accuracy` merged (consciousness off-by-one)
- [x] 0.2 `wire-real-weapon-data` merged (damage values driving damage-triggered PSRs are real)
- [x] 0.3 `integrate-damage-pipeline` merged (the `DamageApplied` / `CriticalHit` events this change subscribes to carry real data)
- [x] 0.4 `wire-firing-arc-resolution` merged (hit-location table selection drives which location is exposed → which PSR trigger fires)
- [x] 0.5 `wire-heat-generation-and-effects` merged (heat-shutdown PSR path has a real trigger source)

## 0.5 Event Enum Alignment

Audit [src/types/gameplay/GameSessionInterfaces.ts](src/types/gameplay/GameSessionInterfaces.ts) and own the diff.

- [x] 0.5.1 Confirm existing: `PSRTriggered` (line 107, UPPERCASE P/S/R — use exactly this casing in all scenarios and code), `PSRResolved` (108), `UnitFell` (109), `PilotHit` (100)
- [x] 0.5.2 Add new enum value: `UnitStood = 'unit_stood'`
- [x] 0.5.3 Update this change's proposal + tasks + spec scenarios: rename `PsrTriggered` → `PSRTriggered`, `PsrResolved` → `PSRResolved` so they match the existing enum
- [x] 0.5.4 Define `IUnitStoodPayload { unitId, turn, roll, targetNumber }` and add to `IGameEventPayload` union
- [x] 0.5.5 Confirm `IPSRTriggeredPayload` and `IPSRResolvedPayload` carry enough fields (triggerId, baseModifier, sourceEventId, tn, roll, result) — extend if they don't
- [x] 0.5.6 Compile check: `tsc --noEmit` passes

## 1. PSR Queue State

- [x] 1.1 Add `psrQueue: IPsrQueuedEntry[]` to `IUnitGameState`
- [x] 1.2 Define `IPsrQueuedEntry { triggerId, baseModifier, sourceEventId, resolveAt: "Immediate" | "EndOfPhase" | "StartOfTurn" }`
- [ ] 1.3 Reset the queue at phase boundaries according to the rules

## 2. Damage-Based Triggers

- [x] 2.1 When `damageThisPhase` ≥ 20, enqueue `TwentyPlusPhaseDamage`
- [x] 2.2 When a leg location's structure is exposed, enqueue `LegStructureDamage`
- [ ] 2.3 When head structure is breached, apply pilot damage + enqueue `HeadStructureDamage`

## 3. Critical-Based Triggers

- [x] 3.1 Gyro crit → enqueue `GyroCrit` (resolveAt: Immediate); subsequent PSRs include +3 per gyro-hit counter
- [x] 3.2 Hip actuator crit → enqueue `HipActuatorCrit` and require PSR per hex moved
- [x] 3.3 Leg actuator crit (upper / lower / foot) → enqueue `LegActuatorCrit`
- [ ] 3.4 Engine crit heavy damage → enqueue `EngineHit` per rules
- [x] 3.5 Cockpit crit → pilot killed (no PSR; recorded as pilot death directly)

## 4. Movement-Based Triggers

- [ ] 4.1 Jump into water → enqueue `JumpIntoWater`
- [ ] 4.2 Skidding (failed run in poor terrain) → enqueue `Skid`
- [ ] 4.3 MASC failure → enqueue `MASCFailure`
- [ ] 4.4 Supercharger failure → enqueue `SuperchargerFailure`
- [x] 4.5 Attempting to stand → enqueue `AttemptStand`
- [ ] 4.6 Attempting to clear prone in same turn → enqueue per rules

## 5. Physical-Attack Triggers

- [x] 5.1 Unit is hit by kick / charge / DFA / push → enqueue `PhysicalAttackTarget`
- [x] 5.2 Attacker misses a DFA → enqueue `MissedDFA`
- [x] 5.3 Attacker misses a charge → enqueue `MissedCharge`
- [x] 5.4 These are consumed by `implement-physical-attack-phase`; this change defines the trigger hooks

## 6. Environmental / Heat Triggers

- [x] 6.1 Heat shutdown → enqueue `HeatShutdown` (result already rolled; this queue captures the consequences if rules require)
- [ ] 6.2 Fall-from-damage on high-elevation hex → enqueue appropriate environmental trigger

## 7. PSR Resolution Step

- [x] 7.1 Add a PSR-resolution step that iterates the queue for each unit
- [x] 7.2 Compute TN: pilotingSkill + sum of modifiers (gyro-hit counter × +3, pilot wounds × +1, base trigger modifier)
- [x] 7.3 Roll 2d6 via seeded RNG
- [x] 7.4 On success, mark the entry resolved successfully; emit `PsrResolved { success: true, tn, roll }`
- [x] 7.5 On failure, emit `PsrResolved { success: false, tn, roll }` and invoke `applyFall`

## 8. Fall Resolution

- [x] 8.1 On PSR failure, call `applyFall(unit, { height, direction })` from `fallMechanics.ts`
- [x] 8.2 Roll 1d6 for fall direction (forward / left / backward / right per canonical table)
- [x] 8.3 Compute fall damage: `ceil(weight / 10) × (fallHeight + 1)`
- [x] 8.4 Apply damage in 5-point clusters to locations from the fall-direction hit-location table
- [x] 8.5 Apply 1 pilot damage; queue consciousness check
- [x] 8.6 Mark unit prone on `IUnitGameState`
- [x] 8.7 Clear any remaining queued PSRs for this unit this phase (already fell)
- [x] 8.8 Emit `UnitFell` event with direction, height, damage clusters, pilot damage

## 9. Standing-Up Rules

- [ ] 9.1 Attempting to stand costs walking MP
- [x] 9.2 Attempting to stand requires an `AttemptStand` PSR
- [x] 9.3 On success, unit is no longer prone; emit `UnitStood`
- [x] 9.4 On failure, unit remains prone for this turn

## 10. Replay Fidelity

- [x] 10.1 All PSR rolls use the seeded RNG
- [ ] 10.2 Replay test: reprocessing the event log produces identical fall outcomes

## 11. Per-Change Smoke Test

- [x] 11.1 Fixture: 1 mech with gyro undamaged, pilot skill 4
- [x] 11.2 Action: apply a single `DamageApplied` event totaling 20 damage to the unit this phase
- [x] 11.3 Assert event stream: `PSRTriggered { triggerId: 'TwentyPlusPhaseDamage' }` within the phase → at phase end, `PSRResolved`
- [x] 11.4 If the roll fails (force seed to guarantee failure): `UnitFell` fires with damage clusters + pilot damage payload
- [x] 11.5 Stand-up flow: next turn, if unit opts to stand, `PSRTriggered { triggerId: 'AttemptStand' }` fires, then `PSRResolved`, then `UnitStood` on success
- [ ] 11.6 Replay: same seed reproduces the fall-or-stand outcome exactly

## 12. Validation

- [x] 12.1 `openspec validate wire-piloting-skill-rolls --strict`
- [x] 12.2 End-to-end test: heavy damage → PSR queued → failure → fall → pilot hit → consciousness check
- [x] 12.3 Gyro crit test: crit triggers PSR; all subsequent PSRs include +3 modifier
- [x] 12.4 Stand-up test: prone unit costs MP + PSR; successful roll ends prone state
- [ ] 12.5 Autonomous fuzzer: no mech fell without an emitted `UnitFell`; every `UnitFell` has a preceding `PSRResolved { success: false }`
- [x] 12.6 Build + lint clean
