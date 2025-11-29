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

