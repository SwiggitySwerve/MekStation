## ADDED Requirements

### Requirement: Weapon Classification
The system SHALL classify weapons by type and category.

#### Scenario: Weapon types
- **WHEN** defining a weapon
- **THEN** weapon MUST be classified as ENERGY, BALLISTIC, MISSILE, or PHYSICAL
- **AND** weapon SHALL have damage, heat, and range properties

### Requirement: Range Brackets
Weapons SHALL define range brackets for to-hit modifiers.

#### Scenario: Range definition
- **WHEN** weapon has ranged attack
- **THEN** weapon SHALL define minimum range (optional)
- **AND** weapon SHALL define short, medium, long ranges

### Requirement: Weapon Stats
All weapons SHALL provide complete combat statistics.

#### Scenario: Weapon properties
- **WHEN** creating weapon definition
- **THEN** damage MUST be specified
- **AND** heat generation MUST be specified
- **AND** weight and critical slots MUST be specified

