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

Unit entity SHALL reference components by type.

#### Scenario: Component composition

- **WHEN** unit contains components
- **THEN** engine, gyro, cockpit SHALL be single references
- **AND** equipment SHALL be array of placed items
- **AND** armor SHALL be allocation per location

### Requirement: Unit Calculations

Unit entity SHALL support derived calculations.

#### Scenario: Calculated properties

- **WHEN** accessing unit properties
- **THEN** total weight SHALL be calculated from components
- **AND** battle value SHALL be calculated
- **AND** movement profile SHALL be calculated
