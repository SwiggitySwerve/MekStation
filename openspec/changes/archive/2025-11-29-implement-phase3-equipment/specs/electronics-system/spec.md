## ADDED Requirements

### Requirement: C3 Computer Systems

The system SHALL support C3 networking computers.

#### Scenario: C3 types

- **WHEN** installing C3 system
- **THEN** system SHALL support C3 Master, Slave, and Improved variants
- **AND** network limitations SHALL be enforced

### Requirement: ECM Systems

The system SHALL support electronic countermeasures.

#### Scenario: ECM variants

- **WHEN** installing ECM
- **THEN** Guardian ECM and Angel ECM SHALL be supported
- **AND** ECM range and effects SHALL be defined

### Requirement: Targeting Systems

The system SHALL support targeting computers and probes.

#### Scenario: Targeting computer

- **WHEN** installing targeting computer
- **THEN** weight SHALL scale with weapon weight
- **AND** to-hit bonuses SHALL be calculated
