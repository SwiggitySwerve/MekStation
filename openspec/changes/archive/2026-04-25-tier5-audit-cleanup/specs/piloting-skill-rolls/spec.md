## ADDED Requirements

### Requirement: Pending PSR Queue Cleared At Turn Boundary (Regression Protection)

The `pendingPSRs` queue SHALL be cleared when the game state transitions from the End phase of one turn into the first phase of the next turn. PSRs that have not been resolved by the end of their turn of origin do NOT carry over into subsequent turns.

This behavior is **already implemented** in `src/utils/gameplay/gameState/phaseManagement.ts::applyTurnStarted` (lines 45-72; clear at line 60), citing `wire-piloting-skill-rolls` task 1.3 and TW p.52. The original audit incorrectly flagged `applyPhaseChanged` as the implementation site — the live behavior is correctly attached to `TurnStarted` events, NOT phase transitions (per the archived change's deliberate task-1.3 decision: "PSRs within a turn are deliberately NOT cleared at phase change — they accumulate and resolve in the End phase").

This requirement is therefore **regression-protection-only**: it adds an explicit test scenario that locks in the existing `applyTurnStarted` clear behavior so a future refactor cannot silently drop it. No production code change is required.

#### Scenario: applyTurnStarted clears pending PSRs at turn-N+1 start

- **WHEN** a unit's `pendingPSRs` array contains one or more entries at the moment a `TurnStarted` event arrives for turn N+1
- **AND** `applyTurnStarted(state, event)` runs against that state
- **THEN** every unit in the resulting state has `pendingPSRs: []`
- **AND** the unit's other per-turn flags (`weaponsFiredThisTurn`) are also reset

#### Scenario: applyPhaseChanged within a turn does NOT clear pending PSRs

- **WHEN** a PSR is queued during the Weapon Attack phase of turn N
- **AND** the phase transitions from Weapon Attack to Physical Attack within the same turn (via `applyPhaseChanged`)
- **THEN** `state.pendingPSRs` retains the queued PSR (intended for resolution at turn N's End phase per archived `wire-piloting-skill-rolls` task 1.3 decision)

## MODIFIED Requirements

### Requirement: PSR Trigger Catalog

The system SHALL implement the canonical PSR trigger set including (but not limited to): `TwentyPlusPhaseDamage`, `LegStructureDamage`, `HipActuatorCrit`, `GyroCrit`, `LegActuatorCrit`, `EngineHit`, `JumpIntoWater`, `Skid`, `MASCFailure`, `SuperchargerFailure`, `AttemptStand`, `PhysicalAttackTarget`, `MissedDFA`, `MissedCharge`, `HeatShutdown`.

`HeadStructureDamage` is intentionally absent from this catalog — canonical Total Warfare treats head hits as a wound + consciousness check (handled by the damage pipeline via `applyPilotDamage` and the consciousness-roll system), not as a stability PSR. The original task in archived `wire-piloting-skill-rolls` (task 2.3) conflated two separate mechanics. Consumers requiring head-breach pilot effects SHALL use `applyPilotDamage` (cluster damage when head front + rear armor is breached) and the existing pilot consciousness-roll path. No replacement PSR factory or queue entry is required.

#### Scenario: Hip actuator crit fires PSR

- **GIVEN** a hip actuator takes a critical hit
- **WHEN** the crit effect is applied
- **THEN** a `HipActuatorCrit` PSR SHALL be queued with `resolveAt: Immediate`

#### Scenario: MASC failure queues PSR

- **GIVEN** a unit uses MASC and the activation roll fails
- **WHEN** the failure is processed
- **THEN** a `MASCFailure` PSR SHALL be queued

#### Scenario: Physical attack hit queues PSR

- **GIVEN** a unit is hit by a kick / charge / DFA / push
- **WHEN** the physical attack resolves
- **THEN** a `PhysicalAttackTarget` PSR SHALL be queued for the target
