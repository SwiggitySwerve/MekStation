# validation-rules-master Spec Delta

## MODIFIED Requirements

### Requirement: Slot Validation

The system SHALL validate critical slot allocation based on mech configuration type.

#### Scenario: Biped slot limits

- **WHEN** validating critical slots for Biped mechs
- **THEN** total used slots MUST NOT exceed 78

#### Scenario: Quad slot limits

- **WHEN** validating critical slots for Quad mechs
- **THEN** total used slots MUST NOT exceed 90
- **AND** slot count SHALL be calculated as: 6 (head) + 36 (torsos) + 48 (4x12 quad legs)

#### Scenario: Tripod slot limits

- **WHEN** validating critical slots for Tripod mechs
- **THEN** total used slots MUST NOT exceed 84
- **AND** slot count SHALL be calculated as: 6 (head) + 36 (torsos) + 24 (arms) + 18 (3x6 legs)

#### Scenario: QuadVee slot limits

- **WHEN** validating critical slots for QuadVee mechs
- **THEN** total used slots MUST NOT exceed 90
- **AND** slot count SHALL match Quad configuration

#### Scenario: LAM slot limits

- **WHEN** validating critical slots for LAM mechs in Mech mode
- **THEN** total used slots MUST NOT exceed 78
- **AND** slot count SHALL match Biped configuration

## ADDED Requirements

### Requirement: Configuration-Specific Slot Validation

The system SHALL use configuration-aware slot validation.

#### Scenario: Dynamic slot count calculation

- **WHEN** validating total slot usage
- **THEN** maximum slots SHALL be determined by mech configuration
- **AND** slot counts SHALL be imported from canonical source (CriticalSlotAllocation.ts)
- **AND** validation SHALL NOT use hardcoded slot limits
