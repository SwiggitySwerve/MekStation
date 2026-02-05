# internal-structure-system Specification

## Purpose

TBD - created by archiving change implement-phase2-construction. Update Purpose after archive.

## Requirements

### Requirement: Structure Types

The system SHALL support 7 internal structure types.

#### Scenario: Standard structure

- **WHEN** using standard internal structure
- **THEN** weight SHALL be 10% of mech tonnage
- **AND** structure SHALL require 0 critical slots

#### Scenario: Endo Steel structure

- **WHEN** using Endo Steel
- **THEN** weight SHALL be 5% of mech tonnage
- **AND** IS Endo Steel requires 14 critical slots
- **AND** Clan Endo Steel requires 7 critical slots

### Requirement: Structure Points Table

The system SHALL define structure points per location by tonnage.

#### Scenario: Structure point lookup

- **WHEN** determining location structure points
- **THEN** lookup table SHALL be used for tonnage 20-100
- **AND** head always = 3 structure points
- **AND** other locations scale with tonnage

### Requirement: Structure Weight Calculation

Structure weight SHALL be calculated from mech tonnage.

#### Scenario: Weight calculation

- **WHEN** calculating structure weight
- **THEN** weight = tonnage × multiplier
- **AND** result SHALL be rounded to nearest 0.5 ton

### Requirement: Individual Structure Slot Items

Endo Steel and similar structure types SHALL create individual equipment items for each required critical slot.

#### Scenario: Endo Steel IS individual slots

- **WHEN** using Inner Sphere Endo Steel
- **THEN** system SHALL create 14 individual equipment items
- **AND** each item SHALL have `criticalSlots: 1`
- **AND** each item SHALL have unique `instanceId`
- **AND** each item SHALL have `equipmentId` starting with `internal-structure-slot`
- **AND** each item SHALL have `isRemovable: false`

#### Scenario: Endo Steel Clan individual slots

- **WHEN** using Clan Endo Steel
- **THEN** system SHALL create 7 individual equipment items
- **AND** each item SHALL have `criticalSlots: 1`

#### Scenario: Endo-Composite individual slots

- **WHEN** using Endo-Composite structure
- **THEN** system SHALL create 7 individual equipment items
- **AND** each item SHALL have `criticalSlots: 1`

#### Scenario: Standard structure no slots

- **WHEN** using Standard internal structure
- **THEN** system SHALL NOT create any equipment items
- **AND** critical slots requirement is 0

### Requirement: Structure Slot Equipment Sync

Structure equipment items SHALL be synchronized when internal structure type changes.

#### Scenario: Type change removes old slots

- **WHEN** internal structure type is changed
- **THEN** all existing structure slot equipment SHALL be removed
- **AND** new structure slot equipment SHALL be created for new type

#### Scenario: Switch to standard clears slots

- **WHEN** switching from Endo Steel to Standard
- **THEN** all Endo Steel equipment items SHALL be removed
- **AND** no new structure equipment items SHALL be created
