## ADDED Requirements

### Requirement: Rules-level filter, sort and label read the stored level

The compendium unit list and the custom unit list SHALL decode a unit's stored rules level through the single `parseRulesLevel` owner in `src/types/enums/RulesLevel.ts`, accepting both the contract tag (`STANDARD`) and the enum value (`Standard`), and SHALL use that decoded level for filtering, sorting and the table label.

#### Scenario: Filter by a level stored as the contract tag
- **GIVEN** index entries whose rulesLevel is stored as the contract tag
- **WHEN** the user selects a rules-level filter
- **THEN** exactly the entries of that level SHALL be shown
- **AND** a saved record that stores the enum value spelling SHALL also match

#### Scenario: Sort by rules level
- **WHEN** the list is sorted by rules level
- **THEN** entries SHALL be ordered by `RULES_LEVEL_ORDER`
- **AND** an entry with a missing or unrecognised level SHALL sort last in either direction

#### Scenario: Table label
- **WHEN** an entry's level is recognised
- **THEN** the table SHALL show its short label
- **AND** an unrecognised stored value SHALL be shown as written, and a missing one as a dash
