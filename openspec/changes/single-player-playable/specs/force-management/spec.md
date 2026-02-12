## ADDED Requirements

### Requirement: Unit Selection from Compendium

The system SHALL allow selecting units from the full compendium when assigning units to force slots.

#### Scenario: Open unit selector modal

- **WHEN** the user clicks "Assign Unit" on an empty force slot
- **THEN** a unit selector modal SHALL open displaying compendium units
- **AND** at least 20 units SHALL be displayed initially

#### Scenario: Search units by name

- **WHEN** the user types "Atlas" in the search field
- **THEN** results SHALL show Atlas variants (AS7-D, AS7-K, etc.)
- **AND** search SHALL use UnitSearchService with fuzzy matching

#### Scenario: Filter by weight class

- **WHEN** the user selects the "Assault" weight class filter
- **THEN** only units with weight 80-100 SHALL be displayed
- **AND** lighter units SHALL be excluded from results

#### Scenario: Filter by tech base

- **WHEN** the user selects "Clan" tech base filter
- **THEN** only Clan tech base units SHALL be displayed

#### Scenario: Select unit assigns to force

- **WHEN** the user clicks a unit in the selector modal
- **THEN** the modal SHALL close
- **AND** the unit SHALL be assigned to the force slot
- **AND** the force roster SHALL display the unit's name, weight, and BV

#### Scenario: Paginate large result sets

- **WHEN** the result set exceeds 20 units
- **THEN** pagination or infinite scroll SHALL allow loading additional units
- **AND** the full 4,200+ unit compendium SHALL be navigable

#### Scenario: Include custom variants

- **WHEN** the user has created custom unit variants
- **THEN** custom variants SHALL appear in search results alongside canonical units
- **AND** custom variants SHALL be visually distinguished from canonical units
