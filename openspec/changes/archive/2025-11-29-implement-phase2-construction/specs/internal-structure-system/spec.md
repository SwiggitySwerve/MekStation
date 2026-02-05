## ADDED Requirements

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
