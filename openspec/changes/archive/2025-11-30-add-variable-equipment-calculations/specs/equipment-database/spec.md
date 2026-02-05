## ADDED Requirements

### Requirement: Variable Equipment Interface

Equipment with variable properties SHALL be identifiable and calculable.

#### Scenario: Variable equipment identification

- **WHEN** equipment has variable properties
- **THEN** equipment SHALL have `isVariable: true` flag
- **AND** equipment SHALL specify which properties are variable
- **AND** equipment SHALL specify input requirements for calculation

#### Scenario: Variable property enumeration

- **WHEN** defining variable properties
- **THEN** system SHALL support WEIGHT as variable
- **AND** system SHALL support SLOTS as variable
- **AND** system SHALL support COST as variable
- **AND** system SHALL support BATTLE_VALUE as variable
- **AND** system SHALL support DAMAGE as variable

### Requirement: Equipment Calculation Context

The system SHALL provide a standardized calculation context.

#### Scenario: Context structure

- **WHEN** calculating variable equipment
- **THEN** context SHALL include mechTonnage (number)
- **AND** context SHALL include engineRating (number)
- **AND** context SHALL include engineWeight (number)
- **AND** context SHALL include directFireWeaponTonnage (number)
- **AND** context SHALL include techBase (TechBase enum)

### Requirement: Calculation Function Registry

Variable equipment SHALL link to calculation functions.

#### Scenario: Calculation dispatch

- **WHEN** equipment has calculationId
- **THEN** system SHALL resolve calculation function by ID
- **AND** system SHALL invoke function with context
- **AND** system SHALL return calculated properties

#### Scenario: Registered calculations

- **WHEN** querying calculation registry
- **THEN** registry SHALL include 'targeting-computer' calculation
- **AND** registry SHALL include 'masc' calculation
- **AND** registry SHALL include 'supercharger' calculation
- **AND** registry SHALL include 'partial-wing' calculation
- **AND** registry SHALL include 'tsm' calculation
- **AND** registry SHALL include 'physical-weapon' calculation
