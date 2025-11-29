## ADDED Requirements

### Requirement: Walk/Run MP Calculation
Movement points SHALL be calculated from engine rating and tonnage.

#### Scenario: Walk MP
- **WHEN** calculating walk MP
- **THEN** walkMP = floor(engineRating / tonnage)
- **AND** minimum walk MP = 1

#### Scenario: Run MP
- **WHEN** calculating run MP
- **THEN** runMP = floor(walkMP × 1.5)

### Requirement: Jump Jets
The system SHALL support 8 jump jet types.

#### Scenario: Standard jump jets
- **WHEN** using standard jump jets
- **THEN** jump MP = number of jump jets
- **AND** jump jets SHALL not exceed walk MP
- **AND** weight varies by tonnage class

### Requirement: Movement Enhancements
The system SHALL support MASC, TSM, and Supercharger.

#### Scenario: MASC
- **WHEN** using MASC
- **THEN** run MP bonus SHALL apply
- **AND** MASC failure risk SHALL be tracked

