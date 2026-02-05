## ADDED Requirements

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

### Requirement: Pagination

The system SHALL paginate large equipment lists.

#### Scenario: Pagination controls

- **WHEN** equipment list exceeds page size
- **THEN** pagination controls show page numbers
- **AND** previous/next buttons are enabled appropriately
- **AND** page size can be changed (10, 25, 50, 100)

### Requirement: Add Equipment Action

The system SHALL provide a button to add equipment to the unit.

#### Scenario: Add equipment

- **WHEN** user clicks Add button on equipment row
- **THEN** equipment is added to unallocated equipment list
- **AND** success feedback is shown
- **AND** equipment tray updates

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
