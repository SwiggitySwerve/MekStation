# protomech-unit-system (delta)

## ADDED Requirements

### Requirement: ProtoMech Combat State

Each ProtoMech SHALL carry combat state covering per-location armor / structure and pilot status.

#### Scenario: Combat state initialization

- **GIVEN** a Medium Biped ProtoMech entering combat
- **WHEN** combat state is initialized
- **THEN** `unit.combatState.proto.armorByLocation` SHALL contain entries for Head, Torso, LeftArm, RightArm, Legs, and MainGun (if present)
- **AND** `unit.combatState.proto.structureByLocation` SHALL mirror the armor keys
- **AND** `unit.combatState.proto.pilotWounded` SHALL be `false`
- **AND** `unit.combatState.proto.destroyed` SHALL be `false`

#### Scenario: Quad proto legs layout

- **GIVEN** a Quad ProtoMech
- **WHEN** combat state is initialized
- **THEN** the leg entries SHALL be `FrontLegs` and `RearLegs` instead of `Legs`
- **AND** no Arm entries SHALL be present

### Requirement: ProtoMech Heat Rules

The system SHALL apply simplified proto heat rules separate from the mech heat table.

#### Scenario: Proto shutdown threshold

- **GIVEN** a proto whose heat reaches 4
- **WHEN** heat effects are computed
- **THEN** a shutdown check SHALL be triggered (lower threshold than mechs)

#### Scenario: Proto heat sink baseline

- **GIVEN** any proto
- **WHEN** heat-sink count is read
- **THEN** the base SHALL be 2 (engine-integrated)
- **AND** extra heat sinks SHALL be the only configurable additions
