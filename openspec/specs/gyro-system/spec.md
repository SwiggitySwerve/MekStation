# gyro-system Specification

## Purpose

TBD - created by archiving change implement-phase2-construction. Update Purpose after archive.

## Requirements

### Requirement: Gyro Type Classification

The system SHALL support 4 gyro types with distinct characteristics.

#### Scenario: Standard Gyro

- **WHEN** selecting Standard gyro
- **THEN** gyro SHALL require 4 critical slots
- **AND** weight SHALL be ceil(engineRating/100) tons

#### Scenario: XL Gyro

- **WHEN** selecting XL gyro
- **THEN** gyro SHALL require 6 critical slots
- **AND** weight SHALL be 50% of standard gyro weight

### Requirement: Gyro Weight Calculation

The system SHALL calculate gyro weight from engine rating.

#### Scenario: Gyro weight formula

- **WHEN** calculating gyro weight
- **THEN** base weight = ceil(engineRating / 100)
- **AND** multiplier applied based on gyro type

### Requirement: Gyro Placement

Gyros SHALL be placed immediately after engine in center torso.

#### Scenario: CT placement

- **WHEN** allocating gyro slots
- **THEN** gyro SHALL occupy CT slots after engine
- **AND** slots SHALL be contiguous
