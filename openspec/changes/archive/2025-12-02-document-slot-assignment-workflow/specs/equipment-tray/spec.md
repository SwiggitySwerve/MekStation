# equipment-tray Spec Delta

## ADDED Requirements

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

### Requirement: Equipment Selection State

Loadout tray SHALL support equipment selection for slot assignment workflow.

#### Scenario: Select equipment for assignment

- **GIVEN** user is on Critical Slots tab
- **WHEN** user clicks on unallocated equipment in tray
- **THEN** equipment SHALL be marked as selected
- **AND** selection SHALL be indicated visually (highlight/ring)
- **AND** valid assignment slots SHALL be highlighted in grid

#### Scenario: Clear selection after assignment

- **GIVEN** equipment is selected for assignment
- **WHEN** equipment is successfully assigned to slots
- **THEN** selection SHALL be cleared
- **AND** visual indicators SHALL be removed

#### Scenario: Toggle selection

- **GIVEN** equipment is already selected
- **WHEN** user clicks the same equipment again
- **THEN** selection SHALL be cleared

### Requirement: Unassign Button Interaction

Allocated equipment SHALL show inline unassign control.

#### Scenario: Show unassign button on hover

- **GIVEN** equipment is in "Allocated" section
- **WHEN** user hovers over the equipment item
- **THEN** unassign button (↩) SHALL appear
- **AND** button SHALL be clickable

#### Scenario: Unassign via button click

- **GIVEN** unassign button is visible
- **WHEN** user clicks the button
- **THEN** equipment location SHALL be cleared
- **AND** equipment SHALL move to "Unallocated" section

### Requirement: Allocated vs Unallocated Sections

Loadout tray SHALL display equipment in separate sections by allocation status.

#### Scenario: Unallocated section display

- **GIVEN** equipment has `location: undefined`
- **THEN** equipment SHALL appear in "Unallocated" section
- **AND** section SHALL show count of unallocated items
- **AND** section SHALL be collapsible

#### Scenario: Allocated section display

- **GIVEN** equipment has `location` set to a MechLocation
- **THEN** equipment SHALL appear in "Allocated" section
- **AND** equipment SHALL show location name (e.g., "@ Left Torso")
- **AND** section SHALL show count of allocated items
- **AND** section SHALL be collapsible
