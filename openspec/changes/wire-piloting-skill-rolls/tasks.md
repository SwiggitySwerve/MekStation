# Tasks: Wire Piloting Skill Rolls

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

## 11. Validation

- [ ] 11.1 `openspec validate wire-piloting-skill-rolls --strict`
- [ ] 11.2 End-to-end test: heavy damage → PSR queued → failure → fall → pilot hit → consciousness check
- [ ] 11.3 Gyro crit test: crit triggers PSR; all subsequent PSRs include +3 modifier
- [ ] 11.4 Stand-up test: prone unit costs MP + PSR; successful roll ends prone state
- [ ] 11.5 Autonomous fuzzer: no mech fell without an emitted `UnitFell`; every `UnitFell` has a preceding `PsrResolved { success: false }`
- [ ] 11.6 Build + lint clean
