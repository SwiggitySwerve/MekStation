# compendium-browser Delta Specification

## MODIFIED Requirements

### Requirement: Equipment Browser View Modes

The equipment browser SHALL support three view modes: grid, list, and table. In every view mode, navigation to the equipment detail page SHALL use real anchor links with client-side routing — keyboard operable and supporting browser link affordances (middle-click/ctrl-click new tab) — not script-only click handlers or full-page reloads.

#### Scenario: Grid view layout

- **GIVEN** user is on equipment browser
- **WHEN** user selects "Grid" view mode
- **THEN** equipment is displayed in a 3-column grid (1 column on mobile, 2 on tablet)
- **AND** each card shows equipment name, tech base badge, stats (weight, slots, damage, heat), and category badge
- **AND** each card is an anchor link that navigates to the equipment detail page via client-side routing

#### Scenario: List view layout

- **GIVEN** user is on equipment browser
- **WHEN** user selects "List" view mode
- **THEN** equipment is displayed in compact rows
- **AND** each row shows category indicator bar (colored), name, quick stats, category badge, and tech base badge
- **AND** each row is an anchor link that navigates to the equipment detail page via client-side routing

#### Scenario: Table view layout

- **GIVEN** user is on equipment browser
- **WHEN** user selects "Table" view mode
- **THEN** equipment is displayed in a data table
- **AND** columns show Name, Type, Tech, Weight, Slots, Damage, Heat
- **AND** each row's navigation is a real anchor link (keyboard operable, new-tab capable) that navigates to the equipment detail page via client-side routing without a full page reload

#### Scenario: Keyboard user opens equipment detail from table

- **GIVEN** user is on equipment browser in "Table" view mode
- **WHEN** the user tabs to a row's link and presses Enter
- **THEN** the equipment detail page for that row opens

#### Scenario: View mode persistence

- **GIVEN** user selects "List" view mode
- **WHEN** user applies a filter
- **THEN** view mode remains "List"
- **AND** filtered results are displayed in list view
