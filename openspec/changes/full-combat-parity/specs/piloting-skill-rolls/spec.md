## ADDED Requirements

### Requirement: PSR Resolution Mechanic

The system SHALL resolve piloting skill rolls (PSR) by rolling 2d6, requiring a result greater than or equal to the pilot's piloting skill plus all applicable modifiers.

#### Scenario: Successful PSR

- **WHEN** a PSR is triggered with piloting skill 5 and total modifiers +2
- **THEN** the target number SHALL be 7 (5 + 2)
- **AND** a 2d6 roll of 7 or higher SHALL succeed
- **AND** the unit SHALL remain standing

#### Scenario: Failed PSR causes fall

- **WHEN** a PSR is triggered with target number 7 and the roll result is 6 or less
- **THEN** the PSR SHALL fail
- **AND** the unit SHALL fall (triggering fall-mechanics)
- **AND** all remaining queued PSRs for this phase SHALL be cleared

### Requirement: PSR Trigger — 20+ Phase Damage

The system SHALL trigger a PSR when a unit takes 20 or more total damage in a single phase.

#### Scenario: Accumulating 20+ damage in weapon attack phase

- **WHEN** a unit accumulates 20 or more points of damage during the weapon attack phase
- **THEN** a PSR SHALL be queued with the trigger "20+ damage"
- **AND** the PSR SHALL have no additional modifiers beyond standard

### Requirement: PSR Trigger — Leg Damage

The system SHALL trigger a PSR when a leg location takes damage that exposes internal structure.

#### Scenario: Leg armor breached

- **WHEN** a leg location's armor is reduced to 0 and structure takes damage
- **THEN** a PSR SHALL be triggered for leg damage

### Requirement: PSR Trigger — Hip Actuator Damage

The system SHALL trigger a PSR when a hip actuator is critically hit.

#### Scenario: Hip actuator critical hit

- **WHEN** a hip actuator receives a critical hit
- **THEN** a PSR SHALL be triggered immediately
- **AND** future movement SHALL require a PSR for each hex moved

### Requirement: PSR Trigger — Gyro Damage

The system SHALL trigger a PSR when a gyro is critically hit.

#### Scenario: Gyro critical hit triggers PSR

- **WHEN** a gyro component receives a critical hit
- **THEN** a PSR SHALL be triggered immediately
- **AND** all future PSRs SHALL include a +3 modifier per gyro hit

### Requirement: PSR Trigger — Leg Actuator Damage

The system SHALL trigger a PSR when any leg actuator (upper leg, lower leg, foot) is critically hit.

#### Scenario: Lower leg actuator critical hit

- **WHEN** a lower leg actuator receives a critical hit
- **THEN** a PSR SHALL be triggered immediately

### Requirement: PSR Trigger — Physical Attack Hit

The system SHALL trigger a PSR when a unit is hit by a kick, charge, DFA, or push.

#### Scenario: Unit kicked

- **WHEN** a unit is successfully hit by a kick attack
- **THEN** the target unit SHALL make a PSR to avoid falling

#### Scenario: Unit charged

- **WHEN** a unit is successfully hit by a charge attack
- **THEN** both the target and attacker SHALL make PSRs to avoid falling

#### Scenario: Unit hit by DFA

- **WHEN** a unit is successfully hit by a death from above (DFA) attack
- **THEN** the target unit SHALL make a PSR to avoid falling

#### Scenario: Unit pushed

- **WHEN** a unit is successfully pushed
- **THEN** the target unit SHALL make a PSR to avoid falling

### Requirement: PSR Trigger — Physical Attack Miss

The system SHALL trigger a PSR for the attacker when certain physical attacks miss.

#### Scenario: Kick miss

- **WHEN** a kick attack misses
- **THEN** the attacker SHALL make a PSR to avoid falling

#### Scenario: DFA miss

- **WHEN** a DFA attack misses
- **THEN** the attacker SHALL make a PSR with a +4 modifier to avoid falling
- **AND** if the attacker falls, they SHALL take falling damage as normal

#### Scenario: Charge miss

- **WHEN** a charge attack misses
- **THEN** the attacker SHALL make a PSR to avoid falling

### Requirement: PSR Trigger — Terrain

The system SHALL trigger PSRs when entering difficult terrain.

#### Scenario: Entering rubble terrain

- **WHEN** a unit enters a rubble hex
- **THEN** a PSR SHALL be triggered

#### Scenario: Running through rough terrain

- **WHEN** a unit runs through rough terrain
- **THEN** a PSR SHALL be triggered

#### Scenario: Moving on ice

- **WHEN** a unit moves on ice terrain
- **THEN** a PSR SHALL be triggered to avoid breaking through

#### Scenario: Entering or exiting water

- **WHEN** a unit enters or exits a water hex (depth 1+)
- **THEN** a PSR SHALL be triggered

### Requirement: PSR Trigger — Skidding

The system SHALL trigger a PSR when skidding conditions occur.

#### Scenario: Skidding on pavement or ice

- **WHEN** a unit attempts to change facing on pavement or ice at running speed
- **THEN** a PSR SHALL be triggered to avoid skidding

### Requirement: PSR Trigger — Movement with Damage

The system SHALL trigger PSRs during movement with damaged components.

#### Scenario: Running with damaged hip

- **WHEN** a unit with a damaged hip actuator attempts to run
- **THEN** a PSR SHALL be required for each hex of movement

#### Scenario: Running with damaged gyro

- **WHEN** a unit with gyro damage attempts to run
- **THEN** a PSR SHALL be required with the +3 per gyro hit modifier

### Requirement: PSR Trigger — Collapse and Failure

The system SHALL trigger PSRs for building/bridge collapse and equipment failure scenarios.

#### Scenario: Building collapse under unit

- **WHEN** a building collapses while a unit is standing on it
- **THEN** a PSR SHALL be triggered

#### Scenario: MASC failure

- **WHEN** MASC fails during a turn
- **THEN** a PSR SHALL be triggered

#### Scenario: Supercharger failure

- **WHEN** a supercharger fails during a turn
- **THEN** a PSR SHALL be triggered

### Requirement: PSR Trigger — Shutdown and Startup

The system SHALL trigger a PSR when a unit shuts down.

#### Scenario: Shutdown triggers PSR

- **WHEN** a unit shuts down (voluntarily or from heat)
- **THEN** a PSR SHALL be triggered with target number 3
- **AND** failure SHALL cause the unit to fall

### Requirement: PSR Trigger — Standing Up

The system SHALL trigger a PSR when a prone unit attempts to stand.

#### Scenario: Attempting to stand

- **WHEN** a prone unit attempts to stand up
- **THEN** a PSR SHALL be required
- **AND** failure SHALL leave the unit prone
- **AND** the unit SHALL have expended its walking MP regardless of success or failure

### Requirement: PSR Modifier — Gyro Damage

Each gyro hit SHALL add +3 to all PSR target numbers.

#### Scenario: One gyro hit modifier

- **WHEN** a unit with 1 gyro hit makes a PSR
- **THEN** the PSR target number SHALL include a +3 modifier

#### Scenario: Two gyro hits (standard gyro destroyed)

- **WHEN** a unit with 2 gyro hits on a standard gyro
- **THEN** the gyro SHALL be destroyed and the unit SHALL fall automatically

### Requirement: PSR Modifier — Pilot Wounds

Each pilot wound SHALL add +1 to all PSR target numbers.

#### Scenario: Wounded pilot PSR modifier

- **WHEN** a pilot with 2 wounds makes a PSR
- **THEN** the PSR target number SHALL include a +2 modifier (1 per wound)

### Requirement: PSR Modifier — Leg Actuator Damage

Leg actuator damage SHALL add modifiers to PSRs.

#### Scenario: Damaged leg actuator PSR modifier

- **WHEN** a unit with a damaged lower leg actuator makes a PSR
- **THEN** the PSR target number SHALL include the appropriate actuator modifier

### Requirement: PSR Modifier — Terrain

Terrain conditions SHALL add modifiers to PSRs.

#### Scenario: Rough terrain PSR modifier

- **WHEN** making a PSR triggered by rough terrain while running
- **THEN** the terrain PSR modifier SHALL be applied

### Requirement: PSR Queue — First Failure Clears Remaining

When multiple PSRs are queued in a single phase, the first failure SHALL cause a fall and clear all remaining PSRs.

#### Scenario: Multiple PSRs with first failure

- **WHEN** a unit has 3 PSRs queued (20+ damage, leg damage, gyro hit)
- **THEN** the PSRs SHALL be resolved in order
- **AND** if the first PSR fails, the unit SHALL fall
- **AND** the remaining 2 PSRs SHALL be cleared without rolling

#### Scenario: All PSRs succeed

- **WHEN** a unit has 2 PSRs queued and both rolls succeed
- **THEN** the unit SHALL remain standing

### Requirement: Injectable Randomness for PSRs

All PSR resolution SHALL use injectable DiceRoller for deterministic testing.

#### Scenario: Deterministic PSR resolution

- **WHEN** resolving PSRs with a seeded DiceRoller
- **THEN** identical inputs and seeds SHALL produce identical PSR outcomes
