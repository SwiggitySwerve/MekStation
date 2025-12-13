# battle-value-system Specification

## Purpose
Defines how Battle Value (BV) is calculated for BattleMech units following BV2 rules from the TechManual.

## Requirements

### Requirement: Defensive Battle Value
The system SHALL calculate defensive BV from armor, structure, and heat dissipation.

#### Scenario: Defensive BV calculation
- **WHEN** calculating defensive BV
- **THEN** armor factor SHALL be calculated from total armor points
- **AND** structure factor SHALL be calculated from internal structure
- **AND** heat factor SHALL modify based on heat sink capacity

#### Scenario: Armor BV calculation
- **WHEN** calculating armor BV component
- **THEN** armor BV SHALL equal total armor points × 2.5

#### Scenario: Structure BV calculation
- **WHEN** calculating structure BV component
- **THEN** structure BV SHALL equal total structure points × 1.5

### Requirement: Offensive Battle Value
The system SHALL calculate offensive BV from weapons and ammunition.

#### Scenario: Offensive BV calculation
- **WHEN** calculating offensive BV
- **THEN** each weapon SHALL contribute its base BV
- **AND** ammunition SHALL contribute based on damage potential
- **AND** targeting computer SHALL modify weapon BV

### Requirement: Speed Factor
Movement capability SHALL modify total BV using TMM-based speed factor.

#### Scenario: Speed factor from TMM
- **WHEN** calculating speed factor for BV2
- **THEN** TMM SHALL be calculated from the higher of run MP or jump MP
- **AND** speed factor SHALL be looked up from TMM-based table
- **AND** TMM 0 gives factor 1.0
- **AND** TMM 2 (Run 6 MP) gives factor 1.2
- **AND** factor increases by 0.1 per TMM level

#### Scenario: TMM calculation from movement
- **WHEN** calculating Target Movement Modifier
- **THEN** 0-2 MP SHALL give TMM 0
- **AND** 3-4 MP SHALL give TMM 1
- **AND** 5-6 MP SHALL give TMM 2
- **AND** 7-9 MP SHALL give TMM 3
- **AND** 10-17 MP SHALL give TMM 4
- **AND** 18-24 MP SHALL give TMM 5
- **AND** 25+ MP SHALL give TMM 6

### Requirement: Heat Efficiency Adjustment
Offensive BV SHALL be adjusted based on heat efficiency.

#### Scenario: Heat neutral mech
- **WHEN** heat dissipation equals or exceeds heat generation
- **THEN** heat adjustment factor SHALL be 1.0
- **AND** no penalty applied to offensive BV

#### Scenario: Heat inefficient mech
- **WHEN** heat dissipation is less than heat generation
- **THEN** heat efficiency ratio SHALL be calculated as dissipation / generation
- **AND** 90%+ efficiency SHALL have adjustment factor 1.0
- **AND** 70-90% efficiency SHALL have adjustment factor 0.95-1.0
- **AND** below 70% efficiency SHALL have scaling adjustment down to 0.5

#### Scenario: BV calculation with heat adjustment
- **WHEN** calculating final BV
- **THEN** formula SHALL be: (Defensive BV + (Offensive BV × Heat Adjustment)) × Speed Factor
- **AND** result SHALL be rounded to nearest integer

### Requirement: Registry Initialization Check
BV calculation SHALL handle uninitialized equipment registry gracefully.

#### Scenario: Registry not ready
- **WHEN** equipment registry is not initialized
- **THEN** offensive BV SHALL return 0
- **AND** registry initialization SHALL be triggered asynchronously
- **AND** calculation SHALL be retried when registry becomes ready
