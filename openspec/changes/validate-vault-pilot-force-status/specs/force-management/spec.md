## ADDED Requirements

### Requirement: Force Status Validation

Force PATCH SHALL accept supplied status only when it exactly matches `ForceStatus`. Invalid supplied status SHALL return HTTP 400 without changing any force field. Omitted status SHALL preserve the stored status. The public repository update boundary SHALL also reject invalid supplied status. Every transition between valid force statuses SHALL remain allowed.

#### Scenario: Invalid force status leaves a mixed update untouched
- **GIVEN** an existing force
- **WHEN** PATCH supplies a new name and an invalid, null, or non-string status
- **THEN** the response is 400 with one short sentence-case error
- **AND** every persisted field remains unchanged

#### Scenario: Valid and omitted status
- **GIVEN** an existing force
- **WHEN** PATCH supplies any exact `ForceStatus` value or omits status
- **THEN** the status is accepted or preserved respectively

### Requirement: Unknown Pilot Status Refuses Assignment

Force assignment and validation SHALL consider unknown persisted pilot statuses unavailable. Existing Active/Injured availability and MIA/KIA/Retired refusal SHALL remain unchanged.

#### Scenario: Invalid legacy status cannot enable assignment
- **GIVEN** a persisted pilot whose status is unrecognized
- **WHEN** the pilot is assigned alone or with a unit, or its force is validated
- **THEN** availability is refused with a useful reason
- **AND** assignment attempts leave the force unchanged
