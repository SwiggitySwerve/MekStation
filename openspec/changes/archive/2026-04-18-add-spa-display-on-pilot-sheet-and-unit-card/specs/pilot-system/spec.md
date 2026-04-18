# pilot-system Specification Delta

## ADDED Requirements

### Requirement: Special Abilities Section on Pilot Detail Sheet

The pilot detail sheet at `/gameplay/pilots/[id]` SHALL include a
"Special Abilities" section that groups owned SPAs by category and
renders them as expanded badges.

#### Scenario: Section renders grouped by category

- **GIVEN** a pilot that owns one Gunnery SPA and one Piloting SPA
- **WHEN** the pilot detail sheet renders
- **THEN** the Special Abilities section SHALL contain a "Gunnery"
  subheader followed by the gunnery badge
- **AND** a "Piloting" subheader followed by the piloting badge

#### Scenario: Expanded badges render designation and description

- **GIVEN** a pilot that owns `range_master` with designation
  `{ type: "range_bracket", value: "Long" }`
- **WHEN** the Special Abilities section renders the row
- **THEN** the expanded badge SHALL display "Range Master (Long)"
- **AND** the description from the catalog SHALL render inline below
  the displayName

#### Scenario: Empty pilot shows "No special abilities" text

- **GIVEN** a pilot with no abilities
- **WHEN** the pilot detail sheet renders
- **THEN** the Special Abilities section SHALL display "No special
  abilities." in place of the grouped list

#### Scenario: Unknown ability id is skipped silently

- **GIVEN** a pilot whose `abilities` array contains an id unknown to
  the catalog
- **WHEN** the Special Abilities section renders
- **THEN** the unknown id SHALL be omitted from the output
- **AND** remaining abilities SHALL render normally
- **AND** no runtime error SHALL be thrown
