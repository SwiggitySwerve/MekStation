# shutdown-startup-system Specification

## Purpose

TBD - created by archiving change full-combat-parity. Update Purpose after archive.

## Requirements

### Requirement: Shutdown Check

At heat level 14 or above, the system SHALL perform a shutdown check during the heat phase by rolling 2d6 against a target number calculated as `4 + floor((heat - 14) / 4) * 2`.

#### Scenario: Shutdown check at heat 14

- **WHEN** a unit has heat level 14 during the heat phase
- **THEN** the shutdown target number SHALL be `4 + floor((14 - 14) / 4) * 2 = 4`
- **AND** a 2d6 roll of 4 or higher SHALL avoid shutdown

#### Scenario: Shutdown check at heat 18

- **WHEN** a unit has heat level 18 during the heat phase
- **THEN** the shutdown target number SHALL be `4 + floor((18 - 14) / 4) * 2 = 6`
- **AND** a 2d6 roll of 6 or higher SHALL avoid shutdown

#### Scenario: Shutdown check at heat 22

- **WHEN** a unit has heat level 22 during the heat phase
- **THEN** the shutdown target number SHALL be `4 + floor((22 - 14) / 4) * 2 = 8`

#### Scenario: Shutdown check at heat 26

- **WHEN** a unit has heat level 26 during the heat phase
- **THEN** the shutdown target number SHALL be `4 + floor((26 - 14) / 4) * 2 = 10`

### Requirement: Automatic Shutdown

At heat level 30 or above, the system SHALL automatically shut down the unit without a roll.

#### Scenario: Auto shutdown at heat 30

- **WHEN** a unit's heat level reaches 30 or above
- **THEN** the unit SHALL automatically shut down
- **AND** no shutdown avoidance roll SHALL be permitted
- **AND** a ShutdownCheck event SHALL be emitted with automatic=true

### Requirement: Shutdown Effects

A shutdown unit SHALL be unable to move, fire, or take any actions, but SHALL still be targetable normally.

#### Scenario: Shutdown unit cannot act

- **WHEN** a unit is in shutdown state
- **THEN** the unit SHALL NOT be permitted to move
- **AND** the unit SHALL NOT be permitted to fire weapons
- **AND** the unit SHALL NOT be permitted to make physical attacks

#### Scenario: Shutdown unit can be targeted

- **WHEN** an attacker targets a shutdown unit
- **THEN** the attack SHALL be resolved normally
- **AND** the shutdown unit SHALL provide no additional defensive bonuses

#### Scenario: Shutdown triggers PSR

- **WHEN** a unit shuts down
- **THEN** a PSR SHALL be triggered with target number 3
- **AND** if the PSR fails, the unit SHALL fall

### Requirement: Startup Roll

A shutdown unit SHALL attempt to restart at the beginning of its turn by rolling 2d6 against the same shutdown target number.

#### Scenario: Successful startup

- **WHEN** a shutdown unit rolls 2d6 at the beginning of its turn and meets or exceeds the shutdown TN
- **THEN** the unit SHALL restart successfully
- **AND** the unit SHALL be able to act normally for the remainder of that turn
- **AND** a StartupAttempt event SHALL be emitted with success=true

#### Scenario: Failed startup

- **WHEN** a shutdown unit rolls 2d6 at the beginning of its turn and rolls below the shutdown TN
- **THEN** the unit SHALL remain shutdown for this turn
- **AND** the unit SHALL NOT be able to move, fire, or act
- **AND** a StartupAttempt event SHALL be emitted with success=false

### Requirement: Shutdown Override

A pilot MAY attempt to override automatic shutdown by accepting a consciousness check risk.

#### Scenario: Override shutdown attempt

- **WHEN** a pilot chooses to override an automatic shutdown
- **THEN** the pilot SHALL make a consciousness check
- **AND** if the consciousness check succeeds, the unit SHALL remain operational
- **AND** if the consciousness check fails, the unit SHALL shut down and the pilot is knocked unconscious

### Requirement: Hot Dog SPA Interaction

The Hot Dog special pilot ability SHALL increase the shutdown threshold by +3.

#### Scenario: Hot Dog delays shutdown checks

- **WHEN** a pilot with the Hot Dog SPA has heat level 14
- **THEN** the effective shutdown threshold SHALL be 17 (14 + 3)
- **AND** no shutdown check SHALL be required at heat 14-16

#### Scenario: Hot Dog modifies shutdown TN

- **WHEN** a pilot with Hot Dog SPA has heat level 17
- **THEN** the shutdown TN calculation SHALL use `4 + floor((17 - 17) / 4) * 2 = 4`

### Requirement: Shutdown State in Game State

The system SHALL track shutdown state as a boolean field on the unit's game state.

#### Scenario: Shutdown state persistence

- **WHEN** a unit shuts down
- **THEN** `IUnitGameState.shutdown` SHALL be set to true
- **AND** the state SHALL persist across turns until a successful startup

#### Scenario: Startup clears shutdown state

- **WHEN** a unit successfully starts up
- **THEN** `IUnitGameState.shutdown` SHALL be set to false

### Requirement: Injectable Randomness for Shutdown/Startup

All shutdown and startup rolls SHALL use injectable DiceRoller for deterministic testing.

#### Scenario: Deterministic shutdown resolution

- **WHEN** resolving shutdown checks with a seeded DiceRoller
- **THEN** identical inputs and seeds SHALL produce identical shutdown/startup outcomes
