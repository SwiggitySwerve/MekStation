# piloting-skill-rolls (delta)

## ADDED Requirements

### Requirement: PSR Queue on Unit State

Each unit SHALL maintain a `psrQueue` on its game state. Trigger events SHALL enqueue an `IPsrQueuedEntry` at the moment they fire, and the resolution step SHALL drain the queue per the `resolveAt` policy.

#### Scenario: Damage triggers enqueue

- **GIVEN** a unit taking 22 damage during the weapon phase
- **WHEN** the 20-point boundary is crossed
- **THEN** the unit's `psrQueue` SHALL contain an entry with `triggerId: TwentyPlusPhaseDamage`

#### Scenario: Multiple triggers queue independently

- **GIVEN** a unit that suffers both a gyro crit and heavy damage in the same phase
- **WHEN** both triggers fire
- **THEN** the `psrQueue` SHALL contain both entries
- **AND** the gyro-crit entry SHALL resolve immediately
- **AND** the damage-based entry SHALL resolve at end of phase

### Requirement: PSR Resolution Fires 2d6 vs Pilot + Modifiers

For each queued PSR, the system SHALL roll 2d6 (via seeded RNG) against a target number equal to `pilotingSkill + sum(modifiers)`.

#### Scenario: Successful roll

- **GIVEN** a pilot with skill 4 and gyro-hit counter 1 (modifier +3), facing a 20+ damage trigger (base +0)
- **WHEN** the PSR resolves with roll 8
- **THEN** TN = 4 + 3 + 0 = 7
- **AND** roll 8 ≥ 7 → success
- **AND** a `PsrResolved { success: true, tn: 7, roll: 8 }` event SHALL be emitted

#### Scenario: Failed roll triggers fall

- **GIVEN** a pilot with skill 5 facing TN 7 with roll 6
- **WHEN** the PSR resolves
- **THEN** the PSR SHALL fail
- **AND** `applyFall` SHALL be invoked
- **AND** remaining queued PSRs for this unit this phase SHALL be cleared

### Requirement: PSR Trigger Catalog

The system SHALL implement the canonical PSR trigger set including (but not limited to): `TwentyPlusPhaseDamage`, `LegStructureDamage`, `HipActuatorCrit`, `GyroCrit`, `LegActuatorCrit`, `EngineHit`, `JumpIntoWater`, `Skid`, `MASCFailure`, `SuperchargerFailure`, `AttemptStand`, `PhysicalAttackTarget`, `MissedDFA`, `MissedCharge`, `HeatShutdown`, `HeadStructureDamage`.

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

### Requirement: Gyro Modifier Stacking

Each gyro-hit counter SHALL add +3 to every future PSR's TN until the gyro is destroyed.

#### Scenario: Two gyro hits stack to +6

- **GIVEN** a mech with gyro-hit counter = 2
- **WHEN** a PSR resolves for any trigger
- **THEN** the TN SHALL include +6 from gyro hits

### Requirement: Pilot Wound Modifier

Each pilot-damage point SHALL add +1 to every future PSR's TN.

#### Scenario: Wounded pilot suffers PSR penalty

- **GIVEN** a pilot with 2 wounds
- **WHEN** a PSR resolves
- **THEN** the TN SHALL include +2 from wounds
