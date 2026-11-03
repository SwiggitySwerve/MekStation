## MODIFIED Requirements

### Requirement: Universal Validation Rules

The system SHALL provide validation rules that apply to ALL unit types.

#### Scenario: VAL-UNIV-001 Entity ID Required

- **WHEN** validating any unit
- **THEN** unit SHALL have non-empty id
- **AND** empty or whitespace-only id SHALL produce ERROR
- **AND** error message SHALL be "Entity must have non-empty id"

#### Scenario: VAL-UNIV-002 Entity Name Required

- **WHEN** validating any unit
- **THEN** unit SHALL have non-empty name
- **AND** empty or whitespace-only name SHALL produce ERROR
- **AND** error message SHALL be "Entity must have non-empty name"

#### Scenario: VAL-UNIV-003 Valid Unit Type

- **WHEN** validating any unit
- **THEN** unit type SHALL be valid UnitType enum value
- **AND** invalid unit type SHALL produce ERROR
- **AND** error message SHALL be "Unit type must be valid UnitType enum value"

#### Scenario: VAL-UNIV-004 Tech Base Required

- **WHEN** validating any unit
- **THEN** unit SHALL have tech base (INNER_SPHERE, CLAN, or MIXED)
- **AND** missing tech base SHALL produce ERROR
- **AND** error message SHALL be "Unit must have a valid tech base"

#### Scenario: VAL-UNIV-005 Rules Level Required

- **WHEN** validating any unit
- **THEN** unit SHALL have valid rules level
- **AND** invalid rules level SHALL produce ERROR
- **AND** error message SHALL be "Unit must have a valid rules level"

#### Scenario: VAL-UNIV-006 Introduction Year Valid

- **WHEN** validating any unit
- **THEN** introduction year SHALL be within BattleTech timeline (2005-3250)
- **AND** year outside range SHALL produce ERROR
- **AND** error message SHALL be "Introduction year must be between 2005 and 3250"

#### Scenario: VAL-UNIV-007 Temporal Consistency

- **WHEN** validating any unit with extinction year
- **THEN** extinction year SHALL be after introduction year
- **AND** temporal inconsistency SHALL produce ERROR
- **AND** error message SHALL be "Extinction year must be after introduction year"

#### Scenario: VAL-UNIV-008 Weight Non-Negative

- **WHEN** validating any unit
- **THEN** weight SHALL be finite and non-negative
- **AND** negative or non-finite weight SHALL produce ERROR
- **AND** error message SHALL be "Unit weight must be a non-negative finite number"

#### Scenario: VAL-UNIV-009 Cost Non-Negative

- **WHEN** validating any unit
- **THEN** cost SHALL be finite and non-negative
- **AND** negative or non-finite cost SHALL produce ERROR
- **AND** error message SHALL be "Unit cost must be a non-negative finite number"

#### Scenario: VAL-UNIV-010 Battle Value Non-Negative

- **WHEN** validating any unit
- **THEN** battle value SHALL be finite and non-negative
- **AND** negative or non-finite BV SHALL produce ERROR
- **AND** error message SHALL be "Battle value must be a non-negative finite number"

#### Scenario: VAL-UNIV-011 Era Availability

- **GIVEN** a campaign year is specified in validation context
- **WHEN** validating any unit
- **THEN** unit introduction year SHALL be <= campaign year
- **AND** unit extinction year (if present) SHALL be > campaign year
- **AND** unavailable unit SHALL produce ERROR
- **AND** error message SHALL be "{Unit} not available in year {campaignYear}"

#### Scenario: VAL-UNIV-012 Rules Level Compliance

- **GIVEN** a rules level filter is specified in validation context
- **WHEN** validating any unit
- **THEN** unit rules level SHALL not exceed filter
- **AND** non-compliant unit SHALL produce ERROR
- **AND** error message SHALL be "Unit rules level {level} exceeds allowed level {filter}"

#### Scenario: VAL-UNIV-013 Armor Allocation Validation

- **WHEN** validating armor allocation per location
- **THEN** armor below 20% of expected max, including zero armor, SHALL produce WARNING without invalidating construction
- **AND** armor between 20-40% of expected max SHALL produce WARNING
- **AND** armor at or above 40% SHALL pass validation
- **AND** front torso expected max SHALL be 75% of total location max
- **AND** rear torso expected max SHALL be 25% of total location max

#### Scenario: VAL-UNIV-014 Weight Overflow

- **WHEN** validating unit weight
- **THEN** allocated weight exceeding max tonnage SHALL produce CRITICAL_ERROR
- **AND** error message SHALL be "Unit exceeds maximum tonnage by {overage} tons"
- **AND** validation SHALL be skipped if weight data unavailable

#### Scenario: VAL-UNIV-015 Critical Slot Overflow

- **WHEN** validating critical slot allocation
- **THEN** any location exceeding slot capacity SHALL produce CRITICAL_ERROR
- **AND** error message SHALL be "{Location} exceeds slot capacity by {overage}"
- **AND** multiple overflowing locations SHALL produce separate errors

#### Scenario: Unplaced equipment makes a unit not legal

- **GIVEN** mounted equipment requires a location and critical slot assignment
- **WHEN** its location is missing or its required critical slots are not fully assigned
- **THEN** the placement owner SHALL report ERROR, including "<item> needs a location." for a missing location
- **AND** VAL-UNIV-015 SHALL retain the error severity and identify the item in `criticalSlots.<instanceId>`
- **AND** even when placement is the unit's only issue, validation SHALL return `isValid: false` with an error, not a warning; this regular ERROR SHALL NOT become CRITICAL_ERROR
- **AND** assigning all required critical slots to a valid location SHALL clear the placement error
- **AND** validation SHALL be skipped if slot data unavailable

---

## ADDED Requirements

### Requirement: Source CASE placement legality

Native combat-vehicle, VTOL and support-vehicle construction validation SHALL reject explicitly mounted CASE outside the body, independently of equipment catalog availability, matching pinned TestTank.java:979-981,1079-1089.

#### Scenario: Retain an invalid source and report the mount

- **GIVEN** the pinned Bellona Hover Tank (Laser) source mounts CLCASE in Rear Equipment
- **WHEN** the source is loaded and validated
- **THEN** loading SHALL succeed and construction SHALL be invalid with a body-placement diagnostic

#### Scenario: Move CASE into the body

- **GIVEN** the same source with CASE moved into Body Equipment
- **WHEN** validating construction
- **THEN** the CASE placement error SHALL clear
