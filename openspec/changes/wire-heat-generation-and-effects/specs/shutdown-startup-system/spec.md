# shutdown-startup-system (delta)

## ADDED Requirements

### Requirement: Shutdown Check Fired During Heat Phase

When a unit's heat is ≥ 14, the heat phase SHALL fire the shutdown check using TN `4 + floor((heat - 14) / 4) * 2` on a 2d6 roll.

#### Scenario: Shutdown check at heat 14

- **GIVEN** a unit with heat 14
- **WHEN** the heat phase runs
- **THEN** a shutdown check SHALL fire with TN 4

#### Scenario: Shutdown check at heat 22

- **GIVEN** a unit with heat 22
- **WHEN** the heat phase runs
- **THEN** the shutdown check TN SHALL be `4 + floor((22 - 14) / 4) * 2 = 8`

#### Scenario: Failure marks unit shut down

- **GIVEN** a unit with heat 18 rolling 5 on 2d6
- **WHEN** the shutdown check resolves
- **THEN** the unit SHALL be marked shut down
- **AND** a `HeatShutdown` event SHALL be emitted

### Requirement: Automatic Shutdown at Heat 30+

At heat 30 or above, the unit SHALL shut down automatically without a roll.

#### Scenario: Auto shutdown at heat 30

- **GIVEN** a unit with heat 30
- **WHEN** the heat phase runs
- **THEN** the unit SHALL be marked shut down automatically
- **AND** the `HeatShutdown` event SHALL have reason `Automatic`

### Requirement: Startup Roll Offered on Subsequent Turn

A shut-down unit SHALL get a startup roll at the start of each subsequent turn using the shutdown TN at its current heat (provided heat < 30).

#### Scenario: Startup succeeds and unit re-activates

- **GIVEN** a shut-down unit at heat 15
- **WHEN** the startup step runs with 2d6 roll 10 vs TN 4
- **THEN** the unit SHALL be marked active
- **AND** a `HeatStartup` event SHALL be emitted

#### Scenario: Startup still blocked at heat ≥ 30

- **GIVEN** a shut-down unit at heat 30
- **WHEN** the startup step runs
- **THEN** no roll SHALL be offered
- **AND** the unit SHALL remain shut down
