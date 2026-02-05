# equipment-database Specification

## Purpose

Maintains a complete equipment database for BattleTech BattleMechs including weapons, ammunition, electronics, and miscellaneous equipment.

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

### Requirement: Multi-Category Equipment

The system SHALL support equipment belonging to multiple filter categories.

#### Scenario: Additional categories field

- **WHEN** equipment is defined
- **THEN** it MAY have additionalCategories array
- **AND** additionalCategories lists secondary categories for filtering

#### Scenario: Dual-purpose equipment

- **WHEN** equipment serves multiple roles (e.g., AMS is both weapon and defensive)
- **THEN** primary category reflects main classification
- **AND** additionalCategories includes secondary classifications
- **AND** equipment appears in filter results for all assigned categories

#### Scenario: AMS equipment categorization

- **WHEN** Anti-Missile System equipment is defined
- **THEN** Standard AMS has primary category BALLISTIC_WEAPON
- **AND** Laser AMS has primary category ENERGY_WEAPON
- **AND** both have additionalCategories containing MISC_EQUIPMENT

### Requirement: Equipment Retrieval Functions

The system SHALL provide separate functions for browsing vs lookup.

#### Scenario: Browser equipment list

- **WHEN** getAllEquipmentItems() is called
- **THEN** Jump Jets are excluded (configured via Structure tab)
- **AND** Heat Sinks are excluded (configured via Structure tab)
- **AND** all other equipment is included

#### Scenario: Lookup equipment list

- **WHEN** getAllEquipmentItemsForLookup() is called
- **THEN** ALL equipment is included
- **AND** Jump Jets and Heat Sinks are included
- **AND** function is used for unit conversion and equipment resolution

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
