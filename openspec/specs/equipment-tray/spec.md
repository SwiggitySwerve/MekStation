# equipment-tray Specification

## Purpose

TBD - created by archiving change add-customizer-ui-components. Update Purpose after archive.

## Requirements

### Requirement: Summary Statistics Panel

The Equipment Tray SHALL display aggregate statistics for all equipment in a header section.

#### Scenario: Statistics grid display

- **WHEN** tray is expanded
- **THEN** 2x2 grid shows Items count, Total weight, Total slots, Total heat
- **AND** weight shows as X.Xt format

#### Scenario: Overweight indication

- **WHEN** equipment weight exceeds remaining tonnage
- **THEN** weight value displays in red
- **AND** capacity warning banner appears

#### Scenario: Over-slots indication

- **WHEN** critical slots exceed available critical slots
- **THEN** slots value displays in red
- **AND** capacity warning specifies overage amount

### Requirement: Categorized Equipment List

The Equipment Tray SHALL group equipment by type category.

#### Scenario: Category grouping

- **WHEN** equipment exists in tray
- **THEN** items are grouped into categories
- **AND** each category has header with name and item count
- **AND** categories with no items are hidden

#### Scenario: Category visual separator

- **WHEN** category header renders
- **THEN** header shows category name on left
- **AND** horizontal line spans remaining width
- **AND** item count badge on right

### Requirement: Equipment Item Display

Each equipment item SHALL display key information in a compact, color-coded format.

#### Scenario: Item card rendering

- **WHEN** equipment item renders
- **THEN** background color matches equipment type
- **AND** border color is slightly darker variant
- **AND** name is displayed with tech base abbreviation badge

#### Scenario: Stats line

- **WHEN** equipment item renders
- **THEN** stats show slots, weight, heat (if non-zero)
- **AND** stats are separated by bullet characters

### Requirement: Equipment Removal

The Equipment Tray SHALL allow users to remove equipment using a click-to-confirm pattern.

#### Scenario: Single item removal with confirmation

- **WHEN** user clicks the remove (X) button on a removable equipment item
- **THEN** button displays confirmation indicator (?)
- **AND** clicking again within 3 seconds removes the item
- **AND** item disappears from tray
- **AND** statistics update immediately

#### Scenario: Confirmation timeout

- **WHEN** user clicks the remove button showing confirmation indicator
- **AND** 3 seconds pass without a second click
- **THEN** confirmation state resets to normal remove button
- **AND** item remains in tray

#### Scenario: Confirmation cancel on blur

- **WHEN** confirmation indicator is showing
- **AND** user clicks elsewhere in the interface
- **THEN** confirmation state resets to normal remove button

#### Scenario: Non-removable configuration components

- **WHEN** user views a configuration component (engine, gyro, structure, armor type)
- **THEN** remove button is NOT displayed
- **AND** tooltip shows which tab manages that component

#### Scenario: Fixed OmniMech equipment

- **WHEN** unit is an OmniMech
- **AND** equipment is marked as fixed (not pod-mounted)
- **THEN** remove button is NOT displayed
- **AND** item shows "(Fixed)" suffix
- **AND** opacity is reduced to indicate non-removable status

### Requirement: Hide Structural Toggle

The Equipment Tray SHALL provide option to hide structural components.

#### Scenario: Toggle behavior

- **WHEN** user checks hide structural option
- **THEN** Structural category is hidden from list
- **AND** structural items remain on unit

### Requirement: Empty State

The Equipment Tray SHALL display helpful guidance when no equipment is added.

#### Scenario: Empty state rendering

- **WHEN** no equipment exists on unit
- **THEN** centered message shows gear emoji icon
- **AND** No Equipment Added heading is displayed
- **AND** Go to Equipment Tab button is shown

### Requirement: Capacity Warning Banner

The Equipment Tray SHALL display warnings when unit limits are exceeded.

#### Scenario: Warning banner display

- **WHEN** weight or slots exceed capacity
- **THEN** red warning banner appears below statistics
- **AND** warning icon is shown

#### Scenario: Warning content

- **WHEN** weight is exceeded
- **THEN** message shows Weight over by X.Xt

### Requirement: Global Loadout Tray

The Equipment Loadout Tray SHALL render as an expandable sidebar on the RIGHT edge of the customizer, visible across ALL tabs.

#### Scenario: Tray visibility

- **WHEN** user is on any customizer tab (Overview, Structure, Armor, Equipment, Criticals, Fluff)
- **THEN** loadout tray toggle is visible at right edge of screen
- **AND** tray can be expanded/collapsed independently of active tab
- **AND** tray state persists across tab switches

#### Scenario: Expanded state

- **WHEN** user clicks tray toggle to expand
- **THEN** tray slides in from right (280px width)
- **AND** tab content area shrinks to accommodate tray
- **AND** transition is smooth (300ms ease-in-out)

#### Scenario: Collapsed state

- **WHEN** tray is collapsed
- **THEN** a vertical toggle button is visible at right edge
- **AND** button displays equipment count badge
- **AND** clicking toggle expands the tray

### Requirement: Tray Header with Actions

The Loadout Tray SHALL display action buttons in a fixed header that does not scroll.

#### Scenario: Header layout

- **WHEN** tray is expanded
- **THEN** header shows "Loadout" title and item count
- **AND** "Remove" button is in header (removes selected item)
- **AND** "Remove All" button is in header
- **AND** header remains fixed when equipment list scrolls

#### Scenario: Remove all confirmation

- **WHEN** user clicks "Remove All" button
- **THEN** confirmation dialog appears
- **AND** confirming removes all user-added equipment
- **AND** structural components (engine, gyro, etc.) are NOT removed

### Requirement: Categorized Equipment Display

The Loadout Tray SHALL group mounted equipment by category with collapsible sections.

#### Scenario: Category grouping

- **WHEN** equipment is mounted
- **THEN** items are grouped into collapsible sections: Energy Weapons, Ballistic Weapons, Missile Weapons, Ammunition, Electronics, Physical Weapons, Misc Equipment
- **AND** each section header shows category name and item count
- **AND** empty categories are hidden

#### Scenario: Category collapse/expand

- **WHEN** user clicks category header
- **THEN** category section toggles between collapsed and expanded
- **AND** collapse state is remembered within session

#### Scenario: Equipment row display

- **WHEN** equipment item renders in category
- **THEN** row shows: Name, Weight (tons), Slots, Location (if allocated)
- **AND** unallocated items show "Unallocated" in amber text
- **AND** clicking row selects it for removal

### Requirement: Structural Slot Components

The system SHALL distinguish between user-added equipment and structural slot components.

#### Scenario: Structural components excluded from tray

- **WHEN** unit has Endo Steel internal structure
- **THEN** Endo Steel slots are NOT shown in loadout tray
- **AND** Endo Steel is managed via Structure tab
- **BUT** Endo Steel slots appear in Critical Slots display

#### Scenario: Ferro-Fibrous armor handling

- **WHEN** unit has Ferro-Fibrous armor
- **THEN** Ferro-Fibrous slots are NOT shown in loadout tray
- **AND** Ferro-Fibrous is managed via Armor tab
- **BUT** Ferro-Fibrous slots appear in Critical Slots display

#### Scenario: Unhittable slot display in Criticals

- **WHEN** viewing Critical Slots tab
- **THEN** Endo Steel and Ferro-Fibrous slots are shown with distinct styling
- **AND** slots are marked as "unhittable" (cannot be destroyed by critical hits)
- **AND** slots are distributed across locations per BattleTech rules

### Requirement: Global Status Bar

The customizer SHALL display a persistent status bar showing capacity utilization across all tabs.

#### Scenario: Status bar display

- **WHEN** user is on any customizer tab
- **THEN** status bar shows at bottom of customizer
- **AND** displays: Weight (used/max with remaining), Free Slots (used/total), Heat (generated/dissipated)

#### Scenario: Over-capacity warning

- **WHEN** weight exceeds tonnage or slots exceed available
- **THEN** affected stat displays in red/warning color
- **AND** remaining value shows as negative

#### Scenario: Slot calculation includes structural

- **WHEN** calculating used slots
- **THEN** count includes Endo Steel slots (14 IS / 7 Clan)
- **AND** count includes Ferro-Fibrous slots (14 IS / 7 Clan)
- **AND** count includes all mounted equipment slots

### Requirement: Structural Equipment Display

The equipment tray SHALL display structural slot items grouped by category.

#### Scenario: Endo Steel display

- **WHEN** Endo Steel is equipped
- **THEN** tray SHALL show under 'Structural' category
- **AND** item count SHALL reflect total slots (e.g., "Endo Steel (IS)" x14)

#### Scenario: Ferro-Fibrous display

- **WHEN** Ferro-Fibrous is equipped
- **THEN** tray SHALL show under 'Structural' category
- **AND** item count SHALL reflect total slots

#### Scenario: Stealth armor display

- **WHEN** Stealth armor is equipped
- **THEN** tray SHALL show 6 'Stealth' items under 'Structural' category
- **AND** each SHALL indicate its assigned location

### Requirement: Non-Removable Structural Items

Structural slot items SHALL NOT be removable via the equipment tray.

#### Scenario: Remove button disabled

- **WHEN** structural equipment item is displayed
- **THEN** remove button SHALL NOT be shown
- **AND** item SHALL display lock icon or visual indicator

#### Scenario: Configuration via tabs

- **WHEN** user wants to change structure/armor type
- **THEN** user SHALL use Structure or Armor configuration tab
- **AND** equipment tray SHALL automatically sync

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
