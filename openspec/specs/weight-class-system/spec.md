# weight-class-system Specification

## Purpose
TBD - created by archiving change implement-phase1-foundation. Update Purpose after archive.
## Requirements
### Requirement: Weight Class Enumeration
The system SHALL define BattleMech weight classes.

#### Scenario: Weight class definition
- **WHEN** classifying mech by tonnage
- **THEN** system SHALL use WeightClass enum
- **AND** Light = 20-35 tons
- **AND** Medium = 40-55 tons
- **AND** Heavy = 60-75 tons
- **AND** Assault = 80-100 tons

### Requirement: Weight Class Determination
The system SHALL provide function to determine weight class from tonnage.

#### Scenario: Tonnage to weight class
- **WHEN** given a mech tonnage value
- **THEN** getWeightClass(tonnage) SHALL return correct WeightClass
- **AND** tonnages outside 20-100 range SHALL be handled appropriately

### Requirement: Weight Class Validation
Mech tonnage SHALL be validated against weight class rules.

#### Scenario: Valid mech tonnage
- **WHEN** validating mech tonnage
- **THEN** tonnage MUST be between 20 and 100
- **AND** tonnage MUST be a multiple of 5

