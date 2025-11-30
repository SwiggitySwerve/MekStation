## MODIFIED Requirements

### Requirement: Movement Enhancements
The system SHALL support MASC, TSM, Supercharger, and Partial Wing with accurate variable calculations.

#### Scenario: MASC weight calculation (IS)
- **WHEN** calculating Inner Sphere MASC weight
- **THEN** weight = ceil(engineRating / 20)
- **AND** criticalSlots = ceil(engineRating / 20)
- **AND** cost = mechTonnage × 1000 C-Bills

#### Scenario: MASC weight calculation (Clan)
- **WHEN** calculating Clan MASC weight
- **THEN** weight = ceil(engineRating / 25)
- **AND** criticalSlots = ceil(engineRating / 25)
- **AND** cost = mechTonnage × 1000 C-Bills

#### Scenario: MASC placement restrictions
- **WHEN** placing MASC on mech
- **THEN** MASC MUST be placed in leg locations only
- **AND** MASC requires functional leg actuators

#### Scenario: Supercharger weight calculation
- **WHEN** calculating Supercharger weight
- **THEN** weight = ceil(engineWeight / 10) rounded to 0.5 tons
- **AND** criticalSlots = 1
- **AND** cost = engineWeight × 10000 C-Bills

#### Scenario: Supercharger placement restrictions
- **WHEN** placing Supercharger on mech
- **THEN** Supercharger MUST be adjacent to engine
- **AND** Supercharger MUST be in torso location

#### Scenario: Partial Wing weight calculation
- **WHEN** calculating Partial Wing weight
- **THEN** weight = mechTonnage × 0.05 rounded to 0.5 tons
- **AND** criticalSlots = 3 per side torso (6 total)
- **AND** cost = weight × 50000 C-Bills

#### Scenario: TSM cost calculation
- **WHEN** calculating Triple Strength Myomer cost
- **THEN** cost = mechTonnage × 16000 C-Bills
- **AND** weight = 0 (replaces standard myomer)
- **AND** criticalSlots = 6 distributed across torso/legs

## ADDED Requirements

### Requirement: Variable Equipment Context
The system SHALL provide calculation context for variable equipment.

#### Scenario: Context availability
- **WHEN** calculating variable equipment properties
- **THEN** context SHALL provide mechTonnage
- **AND** context SHALL provide engineRating
- **AND** context SHALL provide engineWeight
- **AND** context SHALL provide directFireWeaponTonnage

