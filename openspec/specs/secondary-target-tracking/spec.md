# secondary-target-tracking Specification

## Purpose

TBD - created by archiving change full-combat-parity. Update Purpose after archive.

## Requirements

### Requirement: Primary/Secondary Target Designation

The system SHALL track which targets each unit has declared attacks against during a turn, designating the first target as primary and all subsequent targets as secondary.

#### Scenario: First target is primary

- **WHEN** a unit declares its first attack of the turn against Target A
- **THEN** Target A SHALL be designated as the primary target
- **AND** no secondary target penalty SHALL apply to attacks against Target A

#### Scenario: Additional targets are secondary

- **WHEN** a unit that has already attacked Target A now declares an attack against Target B
- **THEN** Target B SHALL be designated as a secondary target
- **AND** the secondary target penalty SHALL apply to attacks against Target B

### Requirement: Secondary Target Penalty — Front Arc

Attacks against secondary targets in the attacker's front arc SHALL receive a +1 to-hit penalty.

#### Scenario: Secondary target in front arc

- **WHEN** a unit fires at a secondary target located in the attacker's front arc
- **THEN** the attack SHALL receive a +1 to-hit modifier

### Requirement: Secondary Target Penalty — Other Arcs

Attacks against secondary targets outside the attacker's front arc SHALL receive a +2 to-hit penalty.

#### Scenario: Secondary target in side or rear arc

- **WHEN** a unit fires at a secondary target located in the attacker's side or rear arc
- **THEN** the attack SHALL receive a +2 to-hit modifier

### Requirement: Multi-Tasker SPA Interaction

The Multi-Tasker SPA SHALL reduce the secondary target penalty by 1.

#### Scenario: Multi-Tasker reduces front arc secondary penalty

- **WHEN** a pilot with Multi-Tasker fires at a secondary target in the front arc
- **THEN** the secondary target penalty SHALL be 0 (+1 - 1)

#### Scenario: Multi-Tasker reduces other arc secondary penalty

- **WHEN** a pilot with Multi-Tasker fires at a secondary target outside the front arc
- **THEN** the secondary target penalty SHALL be +1 (+2 - 1)

### Requirement: Multi-Trac Quirk Interaction

The Multi-Trac unit quirk SHALL eliminate the secondary target penalty for front-arc targets entirely.

#### Scenario: Multi-Trac eliminates front arc penalty

- **WHEN** a unit with Multi-Trac quirk fires at a secondary target in the front arc
- **THEN** no secondary target penalty SHALL apply (treated as primary for penalty purposes)

#### Scenario: Multi-Trac does not affect other arcs

- **WHEN** a unit with Multi-Trac quirk fires at a secondary target outside the front arc
- **THEN** the normal +2 secondary target penalty SHALL apply

### Requirement: Target Tracking Per Turn

The system SHALL track declared attack targets per unit per turn and reset at the beginning of each new turn.

#### Scenario: Target tracking resets each turn

- **WHEN** a new turn begins
- **THEN** all units' declared target lists SHALL be cleared
- **AND** the first target attacked in the new turn SHALL be primary

#### Scenario: Multiple weapons at same target

- **WHEN** a unit fires multiple weapons at the same target
- **THEN** only one target designation SHALL be recorded (not one per weapon)
- **AND** all weapons at the same target SHALL use the same primary/secondary status

### Requirement: Target Tracking State

The system SHALL store target tracking data in the unit's per-turn game state.

#### Scenario: Target tracking in game state

- **WHEN** a unit declares an attack against a target
- **THEN** the target's identifier SHALL be added to the unit's `declaredTargetsThisTurn` list
- **AND** the state SHALL be updated immutably via events
