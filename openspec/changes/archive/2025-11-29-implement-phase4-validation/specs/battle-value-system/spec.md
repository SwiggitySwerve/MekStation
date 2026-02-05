## ADDED Requirements

### Requirement: Defensive Battle Value

The system SHALL calculate defensive BV from armor, structure, and heat dissipation.

#### Scenario: Defensive BV calculation

- **WHEN** calculating defensive BV
- **THEN** armor factor SHALL be calculated from total armor points
- **AND** structure factor SHALL be calculated from internal structure
- **AND** heat factor SHALL modify based on heat sink capacity

### Requirement: Offensive Battle Value

The system SHALL calculate offensive BV from weapons and ammunition.

#### Scenario: Offensive BV calculation

- **WHEN** calculating offensive BV
- **THEN** each weapon SHALL contribute its base BV
- **AND** ammunition SHALL contribute based on damage potential
- **AND** targeting computer SHALL modify weapon BV

### Requirement: Speed Factor

Movement capability SHALL modify total BV.

#### Scenario: Speed factor calculation

- **WHEN** calculating speed factor
- **THEN** factor SHALL be based on walk/run/jump MP
- **AND** higher mobility SHALL increase BV
