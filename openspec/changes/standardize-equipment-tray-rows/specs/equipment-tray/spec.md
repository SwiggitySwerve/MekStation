## MODIFIED Requirements

### Requirement: Equipment Item Display
Each equipment item SHALL display key information in a compact, color-coded format with standardized row styling.

#### Scenario: Item row rendering
- **WHEN** equipment item renders in the loadout tray
- **THEN** row SHALL have fixed height of h-7 (28px)
- **AND** row SHALL use horizontal padding of px-2
- **AND** background color matches equipment category
- **AND** name displays with text-xs size on left
- **AND** name truncates with ellipsis if too long

#### Scenario: Stats display format
- **WHEN** equipment item renders stats
- **THEN** stats SHALL display as pipe-separated values: `{weight}t | {slots} slot(s)`
- **AND** if allocated, location shorthand appends: `| {location}`
- **AND** stats use text-[10px] size
- **AND** stats are right-aligned before action buttons

#### Scenario: Action buttons display
- **WHEN** user hovers over equipment item
- **THEN** action buttons (unassign, remove) SHALL appear
- **AND** buttons use text-[10px] size
- **AND** buttons are right-aligned at row end

### Requirement: Categorized Equipment Display
The Loadout Tray SHALL group mounted equipment by category with collapsible sections using standardized row styling.

#### Scenario: Category header row
- **WHEN** category header renders
- **THEN** row SHALL have fixed height of h-7 (28px)
- **AND** row SHALL use horizontal padding of px-2
- **AND** category color dot (w-2 h-2) displays on left
- **AND** category label uses text-[10px] uppercase
- **AND** item count in parentheses on right

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

### Requirement: Allocated vs Unallocated Sections
Loadout tray SHALL display equipment in separate sections by allocation status with standardized section headers.

#### Scenario: Section header row
- **WHEN** section header (Allocated/Unallocated) renders
- **THEN** row SHALL have fixed height of h-7 (28px)
- **AND** row SHALL use horizontal padding of px-2
- **AND** section title uses text-xs font-medium
- **AND** item count in parentheses with text-[10px]
- **AND** expand/collapse indicator (▼) on right

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

## REMOVED Requirements

### Requirement: Stats line
**Reason**: Replaced by "Equipment Item Display" with pipe-separated format
**Migration**: Stats now use `{weight}t | {slots} slot(s) | {location}` format instead of bullet-separated

