# equipment-browser Spec Delta

## MODIFIED Requirements

### Requirement: Equipment Categories
The Equipment Browser SHALL include all equipment types from the equipment database, including physical/melee weapons.

#### Scenario: Physical weapons in equipment list
- **WHEN** equipment browser loads equipment data
- **THEN** physical weapons (Hatchet, Sword, Claws, Mace, Lance, Talons, Retractable Blade, Flail, Wrecking Ball) are included
- **AND** physical weapons are categorized as PHYSICAL_WEAPON
- **AND** physical weapons appear when "Physical" category filter is active

#### Scenario: Variable property display
- **WHEN** physical weapon is displayed in equipment table
- **THEN** weight shows as 0 (variable based on mech tonnage)
- **AND** critical slots show as 0 (variable based on mech tonnage)
- **AND** the equipment can be added to the unit loadout

### Requirement: Equipment Filtering
The system SHALL provide toggle button filters for narrowing equipment selection by category.

#### Scenario: Category toggle buttons
- **WHEN** equipment browser renders
- **THEN** a row of toggle buttons shows: Energy, Ballistic, Missile, Artillery, Physical, Ammo, Other, Show All
- **AND** multiple categories can be selected simultaneously
- **AND** "Show All" deselects individual categories and shows all equipment

#### Scenario: Hide toggle buttons
- **WHEN** equipment browser renders
- **THEN** a row of hide toggles shows: Prototype, One-Shot, Unavailable
- **AND** enabled hide toggles filter out matching equipment
- **AND** "Unavailable" hides equipment incompatible with unit's tech base or era

#### Scenario: Text filter
- **WHEN** user types in the text filter input
- **THEN** equipment is filtered by name match (case-insensitive)
- **AND** a clear button (X) appears when text is entered
- **AND** clicking clear button resets the text filter

#### Scenario: Combined filtering
- **WHEN** user has category toggles and text filter active
- **THEN** equipment must match ALL active filters to be displayed
- **AND** hide toggles are applied after category and text filters

### Requirement: Equipment Table Display
The system SHALL display equipment in a sortable table format with weapon-relevant columns.

#### Scenario: Table columns
- **WHEN** equipment table is rendered
- **THEN** columns show: Name, Damage, Heat, Min Range, Range, Weight, Crit
- **AND** columns are sortable by clicking headers
- **AND** sort direction indicator shows current sort
- **AND** non-applicable fields show dash (-) for non-weapons

## MODIFIED Requirements

### Requirement: Add Equipment Action
The system SHALL provide an Add button for each equipment row to add it to the unit.

#### Scenario: Add equipment from row
- **WHEN** user clicks Add button on equipment row
- **THEN** equipment is added to the unit's mounted equipment list
- **AND** loadout sidebar updates to show the new item
- **AND** status bar totals update immediately

