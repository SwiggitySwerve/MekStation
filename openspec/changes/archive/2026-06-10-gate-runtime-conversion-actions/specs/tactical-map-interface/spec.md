# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

For each projected movement hex, the map SHALL expose at least movement mode,
cumulative MP cost, terrain cost, elevation delta/cost, heat impact where
applicable, path/facing preview where applicable, and invalid reason when
blocked. Runtime unit-state fields that alter rules height or motive behavior
SHALL be replayable gameplay state, and movement projection plus commit
validation SHALL consume the same replayed state. The movement command surface
SHALL expose supported runtime state controls when the active unit carries a
represented conversion or infantry mount profile. Conversion controls SHALL
explain source-backed legality before dispatch and SHALL include represented
conversion step count and MP cost metadata in replayable runtime
movement-state events.

#### Scenario: Conversion command blocks after movement planning starts

- **GIVEN** a selected movement-phase unit has a represented LAM or QuadVee
  conversion profile
- **AND** the unit already has a movement preview or plan queued
- **WHEN** the player inspects another conversion mode
- **THEN** the command SHALL be disabled with a reason telling the player to
  clear the current movement preview before converting.

#### Scenario: LAM conversion command explains damage blockers

- **GIVEN** a selected movement-phase LAM has a represented conversion profile
- **WHEN** the target conversion crosses a source-backed damaged gyro,
  Mek-mode arm actuator, or Fighter-mode leg actuator restriction
- **THEN** the command SHALL be disabled with a player-facing damage reason
  before dispatch.

#### Scenario: QuadVee conversion command explains unaffordable conversion

- **GIVEN** a selected movement-phase QuadVee has a represented conversion
  profile
- **AND** represented component damage raises its conversion cost above run MP
- **WHEN** the player inspects the other conversion mode
- **THEN** the command SHALL be disabled with the required conversion MP and
  available run MP.
