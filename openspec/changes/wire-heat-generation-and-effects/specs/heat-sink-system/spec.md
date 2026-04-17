# heat-sink-system (delta)

## ADDED Requirements

### Requirement: Engine Reads Actual Heat Sink Count

The heat phase SHALL query the unit's current heat-sink state (engine-integrated + external, minus destroyed) to compute dissipation. A fixed `baseHeatSinks = 10` constant SHALL NOT be used.

#### Scenario: High-dissipation mech reads actual count

- **GIVEN** a mech with 16 double heat sinks
- **WHEN** the heat phase computes dissipation
- **THEN** dissipation SHALL be 32 (not 10 or 20)

#### Scenario: Destroyed sink removed from dissipation

- **GIVEN** a mech with 10 single sinks, one destroyed by critical hit
- **WHEN** the heat phase computes dissipation
- **THEN** dissipation SHALL be 9

#### Scenario: Unit state updated on destruction

- **GIVEN** a heat sink takes a critical hit
- **WHEN** the critical effect is applied
- **THEN** the unit state SHALL mark that heat sink destroyed
- **AND** the next heat phase SHALL compute dissipation excluding it
