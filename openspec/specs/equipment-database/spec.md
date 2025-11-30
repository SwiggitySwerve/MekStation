# equipment-database Specification

## Purpose
TBD - created by archiving change implement-phase3-equipment. Update Purpose after archive.
## Requirements
### Requirement: Equipment Catalog
The system SHALL maintain a complete equipment database.

#### Scenario: Equipment lookup
- **WHEN** searching for equipment
- **THEN** database SHALL support filtering by type, tech base, era
- **AND** results SHALL include complete equipment stats

### Requirement: Equipment Categories
Equipment SHALL be categorized by type.

#### Scenario: Category filtering
- **WHEN** filtering equipment
- **THEN** support categories: Weapons, Ammunition, Electronics, Physical, Misc
- **AND** subcategories for weapons (Energy, Ballistic, Missile)

### Requirement: Equipment Data Completeness
All equipment SHALL have complete data.

#### Scenario: Required fields
- **WHEN** equipment is in database
- **THEN** it MUST have id, name, weight, criticalSlots
- **AND** it MUST have techBase and rulesLevel
- **AND** it MUST have cost and battleValue

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

