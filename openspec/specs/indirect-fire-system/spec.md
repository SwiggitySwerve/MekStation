# indirect-fire-system Specification

## Purpose

TBD - created by archiving change full-combat-parity. Update Purpose after archive.

## Requirements

### Requirement: LRM Indirect Fire Mode

LRM weapons SHALL support indirect fire, allowing attacks against targets without direct line of sight, provided a friendly spotter unit has LOS to the target.

#### Scenario: Indirect fire with valid spotter

- **WHEN** an LRM weapon fires indirectly at a target
- **THEN** a friendly unit MUST have line of sight to the target
- **AND** the spotter MUST NOT have run or jumped that turn (stationary or walked only)
- **AND** the attack SHALL be resolved using the standard to-hit calculation plus indirect fire modifiers

#### Scenario: Indirect fire without spotter

- **WHEN** an LRM weapon attempts indirect fire and no friendly unit has LOS to the target
- **THEN** the indirect fire attack SHALL NOT be permitted

### Requirement: Indirect Fire To-Hit Penalty

Indirect fire SHALL impose a +1 to-hit penalty in addition to normal modifiers.

#### Scenario: Indirect fire base penalty

- **WHEN** calculating the to-hit number for an indirect LRM attack
- **THEN** a +1 to-hit modifier SHALL be added for indirect fire
- **AND** this modifier SHALL be in addition to all other applicable modifiers (range, movement, terrain, etc.)

### Requirement: Spotter Movement Penalty

If the spotter unit walked during its movement phase, an additional +1 to-hit penalty SHALL apply to the indirect fire attack.

#### Scenario: Spotter walked this turn

- **WHEN** the spotter unit walked during its movement phase
- **THEN** the indirect fire attack SHALL receive an additional +1 to-hit modifier
- **AND** the total indirect fire penalty SHALL be +2 (base +1, spotter walked +1)

#### Scenario: Spotter stood still

- **WHEN** the spotter unit did not move during its movement phase (MovementType.Stationary)
- **THEN** only the base +1 indirect fire penalty SHALL apply

#### Scenario: Spotter ran or jumped

- **WHEN** the spotter unit ran or jumped during its movement phase
- **THEN** the spotter SHALL NOT be eligible to act as a spotter for indirect fire

### Requirement: Indirect Fire Minimum Range

Indirect fire SHALL still be subject to the weapon's minimum range penalties, calculated to the target.

#### Scenario: LRM minimum range applies

- **WHEN** the target is within the LRM's minimum range of the firing unit
- **THEN** the minimum range penalty SHALL still apply to the indirect fire attack

### Requirement: Semi-Guided LRM with TAG

Semi-guided LRM attacks SHALL require TAG designation and use a different hit determination method.

#### Scenario: Semi-guided LRM with active TAG

- **WHEN** a semi-guided LRM fires at a TAG-designated target
- **THEN** the attack SHALL use the semi-guided hit table
- **AND** the TAG designation MUST be active on the target

#### Scenario: Semi-guided LRM without TAG

- **WHEN** a semi-guided LRM fires at a target without active TAG designation
- **THEN** the weapon SHALL fire as a standard LRM (not semi-guided)

### Requirement: Arrow IV Indirect Fire (Future)

> **Note**: Arrow IV artillery is not currently implemented. This requirement is reserved for future implementation.

Arrow IV artillery SHALL use a separate indirect fire mechanic from standard LRM indirect fire.

#### Scenario: Arrow IV indirect fire

- **WHEN** an Arrow IV system fires indirectly
- **THEN** the attack SHALL use artillery deviation rules
- **AND** the attack SHALL NOT require a spotter (though a spotter improves accuracy)

> **Implementation Status**: Not implemented. Arrow IV mechanics are planned for future development.

### Requirement: Indirect Fire LOS Validation

The system SHALL validate line of sight from the spotter to the target, not from the attacker.

#### Scenario: Attacker has no LOS but spotter does

- **WHEN** the attacker has no line of sight to the target but a friendly spotter does
- **THEN** the indirect fire attack SHALL be permitted
- **AND** range SHALL be calculated from the attacker to the target (not spotter to target)
