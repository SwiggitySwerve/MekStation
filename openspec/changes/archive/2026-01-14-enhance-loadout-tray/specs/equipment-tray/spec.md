## ADDED Requirements

### Requirement: Category Filter Bar
The Loadout Tray SHALL provide a category filter bar to filter displayed equipment by type.

#### Scenario: Filter bar display
- **WHEN** tray is expanded
- **THEN** category filter bar SHALL appear below header
- **AND** filter bar SHALL show icon buttons for: All, Energy, Ballistic, Missile, Ammo, Electronics, Other

#### Scenario: Default filter state
- **WHEN** tray is first opened
- **THEN** "All" filter SHALL be active
- **AND** all equipment SHALL be visible

#### Scenario: Filter by category
- **WHEN** user clicks a category filter button (e.g., Energy)
- **THEN** only equipment matching that category SHALL be displayed
- **AND** active filter button SHALL be visually highlighted
- **AND** equipment from other categories SHALL be hidden

#### Scenario: Other category grouping
- **WHEN** user selects "Other" filter
- **THEN** equipment from Misc, Physical, Movement, Artillery, and Structural categories SHALL be shown
- **AND** equipment from Energy, Ballistic, Missile, Ammo, Electronics SHALL be hidden

#### Scenario: Empty filter state
- **WHEN** active filter matches no equipment
- **THEN** message SHALL show "No items in filter"
- **AND** hint text SHALL show "Try another category"

#### Scenario: Return to all
- **WHEN** user clicks "All" filter button
- **THEN** all equipment SHALL be visible again
- **AND** "All" button SHALL be highlighted as active

## MODIFIED Requirements

### Requirement: Context Menu Quick Assignment
Loadout tray SHALL provide context menu for quick equipment assignment.

#### Scenario: Show context menu on right-click
- **GIVEN** equipment exists in the loadout tray
- **WHEN** user right-clicks on equipment item
- **THEN** context menu SHALL appear at cursor position
- **AND** menu SHALL show equipment name and slot count
- **AND** menu SHALL list valid assignment locations

#### Scenario: Filter locations by restrictions
- **GIVEN** equipment has location restrictions (e.g., jump jets)
- **WHEN** context menu is displayed
- **THEN** only valid locations SHALL show "Add to [Location]" option
- **AND** invalid locations SHALL NOT appear or SHALL be disabled
- **AND** available slot count SHALL be shown for each location

#### Scenario: Filter locations by available space
- **GIVEN** equipment requires N slots
- **WHEN** a location has fewer than N contiguous empty slots
- **THEN** that location SHALL NOT appear in quick assign options
- **OR** SHALL be marked as unavailable

#### Scenario: Context menu for allocated equipment
- **GIVEN** equipment is allocated to a location
- **WHEN** user right-clicks on the equipment
- **THEN** context menu SHALL show "Unassign from [Location]" option
- **AND** clicking option SHALL unassign the equipment

#### Scenario: Context menu row layout
- **GIVEN** context menu is displayed with location options
- **WHEN** location names and slot counts are rendered
- **THEN** each row SHALL display on a single line without wrapping
- **AND** menu width SHALL be at least 200px
- **AND** location label and "X free" text SHALL have consistent spacing
