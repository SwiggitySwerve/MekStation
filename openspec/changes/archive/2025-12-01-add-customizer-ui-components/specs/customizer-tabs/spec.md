## ADDED Requirements

### Requirement: Tab Navigation

The customizer SHALL provide a tabbed navigation interface with six tabs: Overview, Structure, Armor, Equipment, Criticals, and Fluff.

#### Scenario: User navigates between tabs

- **WHEN** user clicks on a tab label
- **THEN** the corresponding tab content is displayed
- **AND** the active tab is visually highlighted
- **AND** other tab contents are hidden

#### Scenario: Tab state persistence

- **WHEN** user selects a tab and refreshes the page
- **THEN** the previously selected tab is restored from localStorage

### Requirement: Tab Component Props

Each tab component SHALL accept a readOnly prop to disable editing capabilities.

#### Scenario: Read-only mode

- **WHEN** readOnly is true
- **THEN** all inputs, dropdowns, and buttons are disabled
- **AND** the user cannot modify any values

### Requirement: Unit Provider Integration

All tab components SHALL access unit state through the useUnit hook from MultiUnitProvider.

#### Scenario: Unit configuration access

- **WHEN** a tab component renders
- **THEN** it receives the current unit configuration via useUnit
- **AND** configuration changes are applied via updateConfiguration

### Requirement: Overview Tab

The Overview tab SHALL manage unit identity, tech progression, and tech rating configuration.

#### Scenario: Tech base configuration

- **WHEN** user changes a subsystem tech base
- **THEN** the tech progression is updated
- **AND** Mixed tech is detected if subsystems use different tech bases
- **AND** component options are filtered to match the new tech base

### Requirement: Structure Tab

The Structure tab SHALL manage unit tonnage, engine, movement, and system components.

#### Scenario: Tonnage change

- **WHEN** user changes unit tonnage
- **THEN** engine rating is recalculated
- **AND** structure weight is recalculated
- **AND** maximum walk MP is updated

#### Scenario: Engine type selection

- **WHEN** user selects an engine type
- **THEN** engine weight and critical slots are recalculated
- **AND** options are filtered by current tech progression

### Requirement: Armor Tab

The Armor tab SHALL manage armor type selection and location-based armor allocation.

#### Scenario: Armor allocation

- **WHEN** user modifies armor points for a location
- **THEN** the allocation is validated against location maximum
- **AND** total allocated points are updated
- **AND** visual diagram reflects the new values

#### Scenario: Auto-allocate armor

- **WHEN** user clicks Auto-Allocate button
- **THEN** armor points are distributed optimally across all locations
- **AND** location maximums are respected

### Requirement: Equipment Tab

The Equipment tab SHALL provide an equipment browser for selecting and adding equipment.

#### Scenario: Add equipment to unit

- **WHEN** user clicks Add button on equipment item
- **THEN** equipment is added to unallocated equipment list
- **AND** equipment appears in Equipment Tray

#### Scenario: Equipment filtering

- **WHEN** user applies filters (tech base, category, search)
- **THEN** equipment list shows only matching items
- **AND** pagination is reset to first page

### Requirement: Criticals Tab

The Criticals tab SHALL manage critical slot allocation and equipment placement.

#### Scenario: Equipment placement

- **WHEN** user drags equipment to a critical slot
- **THEN** equipment is placed if slot is available
- **AND** multi-slot equipment occupies consecutive slots
- **AND** visual feedback indicates valid/invalid drop targets

#### Scenario: Equipment removal

- **WHEN** user double-clicks occupied equipment slot
- **THEN** equipment is removed and returned to unallocated pool
- **AND** system components cannot be removed

### Requirement: Fluff Tab

The Fluff tab SHALL display unit background and description information.

#### Scenario: Placeholder display

- **WHEN** user navigates to Fluff tab
- **THEN** a Coming Soon message is displayed
- **AND** feature preview cards show planned functionality
