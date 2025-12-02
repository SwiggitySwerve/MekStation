# equipment-browser Specification

## Purpose
Provides a searchable, filterable equipment catalog UI for adding equipment to BattleMech units.
## Requirements
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

### Requirement: Equipment Table Display
The system SHALL display equipment in a sortable table format.

#### Scenario: Table columns
- **WHEN** equipment table is rendered
- **THEN** columns show Name, Category, Tech, Weight, Crits, Damage, Heat
- **AND** columns are sortable by clicking headers
- **AND** sort direction indicator shows current sort

### Requirement: Equipment Filtering
The system SHALL provide filters for narrowing equipment selection.

#### Scenario: Tech base filter
- **WHEN** user selects tech base filter (IS, Clan, All)
- **THEN** only equipment matching the filter is displayed
- **AND** filter defaults to unit's tech base

#### Scenario: Category filter
- **WHEN** user selects equipment category
- **THEN** only equipment in that category is displayed
- **AND** pagination resets to first page

#### Scenario: Search filter
- **WHEN** user types in search box
- **THEN** equipment is filtered by name match
- **AND** search is case-insensitive

### Requirement: Category Toggle Selection
The system SHALL provide toggle buttons for category filtering with exclusive and multi-select modes.

#### Scenario: Exclusive selection (single click)
- **WHEN** user clicks a category button
- **THEN** only that category is selected
- **AND** all other categories are deselected
- **AND** equipment list shows only items in that category

#### Scenario: Multi-select (Ctrl+click)
- **WHEN** user Ctrl+clicks (or Cmd+clicks on Mac) a category button
- **THEN** category is toggled (added or removed from selection)
- **AND** other selected categories remain selected
- **AND** equipment list shows items in all selected categories

#### Scenario: Show All button
- **WHEN** user clicks "Show All"
- **THEN** all category filters are cleared
- **AND** equipment list shows all available equipment

### Requirement: Combined "Other" Category
The system SHALL treat "Other" as a combined category for non-primary equipment.

#### Scenario: Other category contents
- **WHEN** "Other" category is selected
- **THEN** equipment list includes Electronics category items
- **AND** equipment list includes Misc Equipment category items
- **AND** equipment list includes items with additionalCategories containing MISC_EQUIPMENT

#### Scenario: Dual-category equipment visibility
- **WHEN** equipment has additionalCategories (e.g., AMS)
- **THEN** equipment appears when its primary category is selected
- **AND** equipment appears when any of its additionalCategories is selected

### Requirement: Excluded Equipment
The system SHALL exclude equipment configured via the Structure tab.

#### Scenario: Structure-tab equipment
- **WHEN** equipment browser loads items
- **THEN** Jump Jets are NOT displayed (configured in Movement section)
- **AND** Heat Sinks are NOT displayed (configured in Heat Sink section)

### Requirement: Pagination
The system SHALL paginate large equipment lists.

#### Scenario: Pagination controls
- **WHEN** equipment list exceeds page size
- **THEN** pagination controls show page numbers
- **AND** previous/next buttons are enabled appropriately
- **AND** page size can be changed (10, 25, 50, 100)

### Requirement: Add Equipment Action
The system SHALL provide an Add button for each equipment row to add it to the unit.

#### Scenario: Add equipment from row
- **WHEN** user clicks Add button on equipment row
- **THEN** equipment is added to the unit's mounted equipment list
- **AND** loadout sidebar updates to show the new item
- **AND** status bar totals update immediately

### Requirement: Equipment Details Display
The system SHALL display relevant equipment statistics.

#### Scenario: Equipment row
- **WHEN** equipment row is displayed
- **THEN** name is shown with type color coding
- **AND** tech base badge shows IS or CLAN
- **AND** weight and slots are displayed
- **AND** damage and heat are shown for weapons

### Requirement: Loading and Error States
The system SHALL handle loading and error states gracefully.

#### Scenario: Loading state
- **WHEN** equipment data is loading
- **THEN** loading skeleton is displayed
- **AND** filters are disabled

#### Scenario: Error state
- **WHEN** equipment data fails to load
- **THEN** error message is displayed
- **AND** retry button is available

