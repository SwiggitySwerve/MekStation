## ADDED Requirements

### Requirement: Construction Sequence
The system SHALL implement 12-step construction sequence.

#### Scenario: Construction steps
- **WHEN** constructing a BattleMech
- **THEN** follow: tonnage → structure → engine → gyro → cockpit → heat sinks → armor → weapons → equipment → slots → weight → finalize

### Requirement: Weight Budget
Total component weight MUST equal mech tonnage exactly.

#### Scenario: Weight validation
- **WHEN** validating construction
- **THEN** sum of all weights MUST equal tonnage
- **AND** overweight SHALL produce error
- **AND** underweight SHALL produce warning

### Requirement: Minimum Requirements
All mechs SHALL meet minimum requirements.

#### Scenario: Minimum heat sinks
- **WHEN** validating heat sinks
- **THEN** total MUST be >= 10
- **OR** total MUST be >= heat-generating weapons if higher

### Requirement: Maximum Limits
Component limits SHALL be enforced.

#### Scenario: Armor maximum
- **WHEN** validating armor
- **THEN** total SHALL not exceed maximum (2× structure per location)

#### Scenario: Slot maximum
- **WHEN** validating critical slots
- **THEN** total SHALL not exceed 78 available slots

