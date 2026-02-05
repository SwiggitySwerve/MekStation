## ADDED Requirements

### Requirement: Heat Sink Types

The system SHALL support 5 heat sink types.

#### Scenario: Single heat sinks

- **WHEN** using single heat sinks
- **THEN** each sink dissipates 1 heat per turn
- **AND** external sinks require 1 critical slot each

#### Scenario: Double heat sinks

- **WHEN** using double heat sinks
- **THEN** each sink dissipates 2 heat per turn
- **AND** IS double sinks require 3 slots external
- **AND** Clan double sinks require 2 slots external

### Requirement: Engine Integration

Heat sinks up to engine capacity SHALL be integral.

#### Scenario: Integral heat sinks

- **WHEN** engine has integral capacity
- **THEN** integral heat sinks require 0 slots
- **AND** integral heat sinks add 0 weight
- **AND** capacity = floor(engineRating / 25), max 10

### Requirement: Minimum Heat Sinks

All mechs SHALL have at least 10 heat sinks.

#### Scenario: Minimum requirement

- **WHEN** validating heat sink count
- **THEN** total MUST be >= 10
- **AND** shortfall SHALL be calculated as external sinks needed
