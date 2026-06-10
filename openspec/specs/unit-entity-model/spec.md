# unit-entity-model Specification

## Purpose

TBD - created by archiving change implement-phase5-data-models. Update Purpose after archive.
## Requirements
### Requirement: Unit Entity Structure

The system SHALL define a complete unit data model.

#### Scenario: BattleMech entity

- **WHEN** defining a BattleMech
- **THEN** entity SHALL include chassis metadata (name, tonnage, tech base)
- **AND** entity SHALL include all structural components
- **AND** entity SHALL include equipment loadout

### Requirement: Component References

The unit entity SHALL reference components by type. When represented unit data
includes a gyro type, runtime combat-state initialization SHALL preserve that
gyro type so movement and piloting rules can evaluate represented gyro
thresholds.

#### Scenario: Represented gyro type reaches runtime state

- **GIVEN** imported unit data identifies a heavy-duty gyro
- **WHEN** the compendium adapter creates the game unit and combat state is
  initialized
- **THEN** the game unit SHALL carry the represented gyro type
- **AND** the runtime unit state SHALL carry the same represented gyro type
- **AND** stand-up projection and PSR resolution SHALL consume that runtime
  gyro type instead of defaulting to standard-gyro thresholds

### Requirement: Unit Calculations

Unit entity SHALL support derived calculations.

#### Scenario: Calculated properties

- **WHEN** accessing unit properties
- **THEN** total weight SHALL be calculated from components
- **AND** battle value SHALL be calculated
- **AND** movement profile SHALL be calculated

