# Tasks: Wire Piloting Skill Rolls

## 0. Prerequisites

Every upstream change below MUST be merged to main before starting. This change wires 26 PSR triggers driven by damage / heat / physical-attack outcomes — merging before the upstream path is real produces tests that validate stubs.

- [ ] 0.1 `fix-combat-rule-accuracy` merged (consciousness off-by-one)
- [ ] 0.2 `wire-real-weapon-data` merged (damage values driving damage-triggered PSRs are real)
- [ ] 0.3 `integrate-damage-pipeline` merged (the `DamageApplied` / `CriticalHit` events this change subscribes to carry real data)
- [ ] 0.4 `wire-firing-arc-resolution` merged (hit-location table selection drives which location is exposed → which PSR trigger fires)
- [ ] 0.5 `wire-heat-generation-and-effects` merged (heat-shutdown PSR path has a real trigger source)

## 0.5 Event Enum Alignment

Audit [src/types/gameplay/GameSessionInterfaces.ts](src/types/gameplay/GameSessionInterfaces.ts) and own the diff.

- [ ] 0.5.1 Confirm existing: `PSRTriggered` (line 107, UPPERCASE P/S/R — use exactly this casing in all scenarios and code), `PSRResolved` (108), `UnitFell` (109), `PilotHit` (100)
- [ ] 0.5.2 Add new enum value: `UnitStood = 'unit_stood'`
- [ ] 0.5.3 Update this change's proposal + tasks + spec scenarios: rename `PsrTriggered` → `PSRTriggered`, `PsrResolved` → `PSRResolved` so they match the existing enum
- [ ] 0.5.4 Define `IUnitStoodPayload { unitId, turn, roll, targetNumber }` and add to `IGameEventPayload` union
- [ ] 0.5.5 Confirm `IPSRTriggeredPayload` and `IPSRResolvedPayload` carry enough fields (triggerId, baseModifier, sourceEventId, tn, roll, result) — extend if they don't
- [ ] 0.5.6 Compile check: `tsc --noEmit` passes

## 1. PSR Queue State

- [ ] 1.1 Add `psrQueue: IPsrQueuedEntry[]` to `IUnitGameState`
- [ ] 1.2 Define `IPsrQueuedEntry { triggerId, baseModifier, sourceEventId, resolveAt: "Immediate" | "EndOfPhase" | "StartOfTurn" }`
- [ ] 1.3 Reset the queue at phase boundaries according to the rules

## 2. Damage-Based Triggers

- [ ] 2.1 When `damageThisPhase` ≥ 20, enqueue `TwentyPlusPhaseDamage`
- [ ] 2.2 When a leg location's structure is exposed, enqueue `LegStructureDamage`
- [ ] 2.3 When head structure is breached, apply pilot damage + enqueue `HeadStructureDamage`

## 3. Critical-Based Triggers

- [ ] 3.1 Gyro crit → enqueue `GyroCrit` (resolveAt: Immediate); subsequent PSRs include +3 per gyro-hit counter
- [ ] 3.2 Hip actuator crit → enqueue `HipActuatorCrit` and require PSR per hex moved
- [ ] 3.3 Leg actuator crit (upper / lower / foot) → enqueue `LegActuatorCrit`
- [ ] 3.4 Engine crit heavy damage → enqueue `EngineHit` per rules
- [ ] 3.5 Cockpit crit → pilot killed (no PSR; recorded as pilot death directly)

## 4. Movement-Based Triggers

- [ ] 4.1 Jump into water → enqueue `JumpIntoWater`
- [ ] 4.2 Skidding (failed run in poor terrain) → enqueue `Skid`
- [ ] 4.3 MASC failure → enqueue `MASCFailure`
- [ ] 4.4 Supercharger failure → enqueue `SuperchargerFailure`
- [ ] 4.5 Attempting to stand → enqueue `AttemptStand`
- [ ] 4.6 Attempting to clear prone in same turn → enqueue per rules

## 5. Physical-Attack Triggers

- [ ] 5.1 Unit is hit by kick / charge / DFA / push → enqueue `PhysicalAttackTarget`
- [ ] 5.2 Attacker misses a DFA → enqueue `MissedDFA`
- [ ] 5.3 Attacker misses a charge → enqueue `MissedCharge`
- [ ] 5.4 These are consumed by `implement-physical-attack-phase`; this change defines the trigger hooks

## 6. Environmental / Heat Triggers

- [ ] 6.1 Heat shutdown → enqueue `HeatShutdown` (result already rolled; this queue captures the consequences if rules require)
- [ ] 6.2 Fall-from-damage on high-elevation hex → enqueue appropriate environmental trigger

## 7. PSR Resolution Step

- [ ] 7.1 Add a PSR-resolution step that iterates the queue for each unit
- [ ] 7.2 Compute TN: pilotingSkill + sum of modifiers (gyro-hit counter × +3, pilot wounds × +1, base trigger modifier)
- [ ] 7.3 Roll 2d6 via seeded RNG
- [ ] 7.4 On success, mark the entry resolved successfully; emit `PsrResolved { success: true, tn, roll }`
- [ ] 7.5 On failure, emit `PsrResolved { success: false, tn, roll }` and invoke `applyFall`

## 8. Fall Resolution

- [ ] 8.1 On PSR failure, call `applyFall(unit, { height, direction })` from `fallMechanics.ts`
- [ ] 8.2 Roll 1d6 for fall direction (forward / left / backward / right per canonical table)
- [ ] 8.3 Compute fall damage: `ceil(weight / 10) × (fallHeight + 1)`
- [ ] 8.4 Apply damage in 5-point clusters to locations from the fall-direction hit-location table
- [ ] 8.5 Apply 1 pilot damage; queue consciousness check
- [ ] 8.6 Mark unit prone on `IUnitGameState`
- [ ] 8.7 Clear any remaining queued PSRs for this unit this phase (already fell)
- [ ] 8.8 Emit `UnitFell` event with direction, height, damage clusters, pilot damage

## 9. Standing-Up Rules

- [ ] 9.1 Attempting to stand costs walking MP
- [ ] 9.2 Attempting to stand requires an `AttemptStand` PSR
- [ ] 9.3 On success, unit is no longer prone; emit `UnitStood`
- [ ] 9.4 On failure, unit remains prone for this turn

## 10. Replay Fidelity

- [ ] 10.1 All PSR rolls use the seeded RNG
- [ ] 10.2 Replay test: reprocessing the event log produces identical fall outcomes

## 11. Per-Change Smoke Test

- [ ] 11.1 Fixture: 1 mech with gyro undamaged, pilot skill 4
- [ ] 11.2 Action: apply a single `DamageApplied` event totaling 20 damage to the unit this phase
- [ ] 11.3 Assert event stream: `PSRTriggered { triggerId: 'TwentyPlusPhaseDamage' }` within the phase → at phase end, `PSRResolved`
- [ ] 11.4 If the roll fails (force seed to guarantee failure): `UnitFell` fires with damage clusters + pilot damage payload
- [ ] 11.5 Stand-up flow: next turn, if unit opts to stand, `PSRTriggered { triggerId: 'AttemptStand' }` fires, then `PSRResolved`, then `UnitStood` on success
- [ ] 11.6 Replay: same seed reproduces the fall-or-stand outcome exactly

## 12. Validation

- [ ] 12.1 `openspec validate wire-piloting-skill-rolls --strict`
- [ ] 12.2 End-to-end test: heavy damage → PSR queued → failure → fall → pilot hit → consciousness check
- [ ] 12.3 Gyro crit test: crit triggers PSR; all subsequent PSRs include +3 modifier
- [ ] 12.4 Stand-up test: prone unit costs MP + PSR; successful roll ends prone state
- [ ] 12.5 Autonomous fuzzer: no mech fell without an emitted `UnitFell`; every `UnitFell` has a preceding `PSRResolved { success: false }`
- [ ] 12.6 Build + lint clean
