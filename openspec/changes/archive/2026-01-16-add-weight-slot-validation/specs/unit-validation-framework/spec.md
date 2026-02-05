# unit-validation-framework Specification Delta

## ADDED Requirements

### Requirement: Weight and Slot Validation Data

The system SHALL provide weight and slot data for validation.

#### Scenario: IValidatableUnit includes weight data

- **WHEN** building a validatable unit for validation
- **THEN** unit SHALL include `allocatedWeight` (total weight used)
- **AND** unit SHALL include `maxWeight` (tonnage limit)

#### Scenario: IValidatableUnit includes slot data

- **WHEN** building a validatable unit for validation
- **THEN** unit SHALL include `slotsByLocation` (per-location slot usage)
- **AND** each location entry SHALL include `used`, `max`, and `displayName`

---

### Requirement: Per-Location Armor Allocation Validation

The system SHALL validate armor allocation per location with aligned thresholds.

#### Scenario: VAL-UNIV-013 Critical armor produces error

- **WHEN** validating armor allocation
- **AND** any location has armor below 20% of expected max
- **THEN** validation SHALL produce CRITICAL_ERROR
- **AND** error message SHALL indicate critical armor level

#### Scenario: VAL-UNIV-013 Low armor produces warning

- **WHEN** validating armor allocation
- **AND** any location has armor between 20-40% of expected max
- **THEN** validation SHALL produce WARNING
- **AND** warning message SHALL indicate low armor level

#### Scenario: VAL-UNIV-013 Adequate armor passes

- **WHEN** validating armor allocation
- **AND** all locations have armor at or above 40% of expected max
- **THEN** validation SHALL pass with no errors or warnings

#### Scenario: VAL-UNIV-013 Torso front uses 75% expected max

- **WHEN** validating front torso armor (CT, LT, RT)
- **THEN** expected max SHALL be 75% of total location max
- **AND** thresholds SHALL apply to this expected max

#### Scenario: VAL-UNIV-013 Torso rear uses 25% expected max

- **WHEN** validating rear torso armor (CT rear, LT rear, RT rear)
- **THEN** expected max SHALL be 25% of total location max
- **AND** thresholds SHALL apply to this expected max

---

### Requirement: Weight Overflow Validation

The system SHALL validate that total weight does not exceed maximum tonnage.

#### Scenario: VAL-UNIV-014 Weight within limits passes

- **WHEN** validating unit weight
- **AND** allocated weight is less than or equal to max weight
- **THEN** validation SHALL pass with no errors

#### Scenario: VAL-UNIV-014 Weight overflow produces critical error

- **WHEN** validating unit weight
- **AND** allocated weight exceeds max weight
- **THEN** validation SHALL produce CRITICAL_ERROR
- **AND** error message SHALL indicate overage amount
- **AND** error message SHALL be "Unit exceeds maximum tonnage by {overage} tons"

#### Scenario: VAL-UNIV-014 Skipped when data unavailable

- **WHEN** validating unit weight
- **AND** allocatedWeight or maxWeight is undefined
- **THEN** validation rule SHALL be skipped

---

### Requirement: Critical Slot Overflow Validation

The system SHALL validate that no location exceeds its critical slot capacity.

#### Scenario: VAL-UNIV-015 Slots within limits passes

- **WHEN** validating critical slots
- **AND** all locations have used slots less than or equal to max
- **THEN** validation SHALL pass with no errors

#### Scenario: VAL-UNIV-015 Slot overflow produces critical error

- **WHEN** validating critical slots
- **AND** any location has used slots exceeding max
- **THEN** validation SHALL produce CRITICAL_ERROR for each overflowing location
- **AND** error message SHALL indicate location and overage
- **AND** error message SHALL be "{Location} exceeds slot capacity by {overage}"

#### Scenario: VAL-UNIV-015 Multiple overflows produce multiple errors

- **WHEN** validating critical slots
- **AND** multiple locations exceed their slot capacity
- **THEN** validation SHALL produce separate CRITICAL_ERROR for each location

#### Scenario: VAL-UNIV-015 Skipped when data unavailable

- **WHEN** validating critical slots
- **AND** slotsByLocation is undefined
- **THEN** validation rule SHALL be skipped
