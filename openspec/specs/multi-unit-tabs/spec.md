# multi-unit-tabs Specification

## Purpose

TBD - created by archiving change add-customizer-ui-components. Update Purpose after archive.

## Requirements

### Requirement: Tab Bar Display

The system SHALL display a horizontal tab bar with icon-based toolbar actions.

#### Scenario: Tab bar rendering

- **WHEN** at least one unit tab exists
- **THEN** tab bar appears with slate-800 background
- **AND** bottom border separates tabs from content
- **AND** toolbar icons appear at right edge (document icon, folder icon)

#### Scenario: No tabs state

- **WHEN** no unit tabs exist
- **THEN** full-screen empty state appears
- **AND** "New Unit" button with document icon is prominently shown
- **AND** "Load from Library" button with folder icon is shown

### Requirement: Tab Rendering

Each tab SHALL display unit name with modification indicator.

#### Scenario: Tab display

- **WHEN** tab renders
- **THEN** unit name is shown (truncated at 48 chars max)
- **AND** modified indicator appears in orange if unsaved changes exist
- **AND** close button appears on hover

#### Scenario: Active tab styling

- **WHEN** tab is active
- **THEN** tab has slate-700 background
- **AND** text is slate-100
- **AND** blue bottom border indicates selection

#### Scenario: Inactive tab styling

- **WHEN** tab is inactive
- **THEN** tab has transparent background
- **AND** text is slate-400
- **AND** hover shows slate-700/50 background

### Requirement: Tab Selection

Users SHALL be able to switch between tabs by clicking.

#### Scenario: Tab selection

- **WHEN** user clicks inactive tab
- **THEN** clicked tab becomes active
- **AND** tab content updates to show selected unit
- **AND** previous tab maintains its state

### Requirement: Tab Creation

Users SHALL be able to create new tabs via modal dialog.

#### Scenario: New tab button click

- **WHEN** user clicks add button or Create New Unit button
- **THEN** NewTabModal appears with creation options
- **AND** modal has dark theme styling

#### Scenario: Creation mode selection

- **WHEN** NewTabModal is open
- **THEN** three mode tabs are available: New Unit, Copy Current, Import Data
- **AND** selected mode shows blue background

#### Scenario: New Unit mode

- **WHEN** New Unit mode is selected
- **THEN** template grid shows Light (25t), Medium (50t), Heavy (70t), Assault (100t)
- **AND** selected template has blue border
- **AND** template shows tonnage and movement stats

#### Scenario: Tab creation

- **WHEN** user clicks Create Unit button
- **THEN** new tab is created with specified configuration
- **AND** new tab becomes active
- **AND** modal closes

### Requirement: Tab Renaming

Users SHALL be able to rename tabs by double-clicking the name.

#### Scenario: Enter edit mode

- **WHEN** user double-clicks tab name
- **THEN** name becomes editable input
- **AND** input is auto-focused
- **AND** current name is selected

#### Scenario: Confirm rename

- **WHEN** user presses Enter or clicks outside input
- **THEN** new name is saved
- **AND** input returns to text display

#### Scenario: Cancel rename

- **WHEN** user presses Escape
- **THEN** edit is cancelled
- **AND** original name is restored

### Requirement: Tab Closing

Users SHALL be able to close any tab including the last one.

#### Scenario: Close last tab

- **WHEN** user closes the last remaining tab
- **THEN** tab is closed
- **AND** empty state is displayed
- **AND** URL navigates to /customizer (base route)

#### Scenario: Close button visibility

- **WHEN** tab renders
- **THEN** close button is always visible (not just on hover)

---

### Requirement: Tab Context Menu

Users SHALL access additional options via right-click context menu.

#### Scenario: Duplicate action

- **WHEN** user selects Duplicate
- **THEN** new tab is created with copied configuration
- **AND** new tab name has Copy suffix

### Requirement: State Persistence

Tab state and unit configuration SHALL be preserved across browser sessions and tab navigation.

#### Scenario: Session save

- **WHEN** user makes changes
- **THEN** state is saved to localStorage via Zustand
- **AND** save is debounced to reduce writes

#### Scenario: Session restore

- **WHEN** user reopens customizer
- **THEN** previous tabs are restored
- **AND** active tab is restored
- **AND** modification flags are preserved

#### Scenario: Session restore with invalid tab IDs

- **WHEN** user reopens customizer with cached tabs that have missing or invalid UUIDs
- **THEN** new valid UUIDs are generated for affected tabs
- **AND** a warning is logged indicating which tabs were repaired
- **AND** the UI remains functional with repaired tabs
- **AND** unit stores are re-associated with the new tab IDs

#### Scenario: Unit configuration persistence

- **WHEN** user modifies unit tech base, armor, or equipment
- **THEN** changes are stored in the unit's tab state
- **AND** changes persist when navigating to other customizer tabs (Overview, Structure, Armor, etc.)
- **AND** changes persist across browser sessions via localStorage

#### Scenario: Tech base configuration persistence

- **WHEN** user sets tech base mode (Inner Sphere/Clan/Mixed)
- **AND** user configures per-component tech bases
- **THEN** all selections are preserved in the unit tab
- **AND** selections restore when returning to Overview tab

#### Scenario: Cross-tab state isolation

- **WHEN** multiple unit tabs are open
- **THEN** each tab maintains its own independent configuration state
- **AND** changes to one tab do not affect other tabs

### Requirement: Loading State

The system SHALL display loading indicator during initialization.

#### Scenario: Initial load

- **WHEN** MultiUnitProvider is initializing
- **THEN** centered Loading message appears

### Requirement: Toolbar Icon Actions

The tab bar SHALL provide icon-based actions for creating and loading units.

#### Scenario: Document icon for new unit

- **WHEN** user hovers over the document icon in tab bar
- **THEN** tooltip displays "Create New Unit (Ctrl+N)"
- **WHEN** user clicks the document icon
- **THEN** NewTabModal opens for unit creation

#### Scenario: Folder icon for load unit

- **WHEN** user hovers over the folder icon in tab bar
- **THEN** tooltip displays "Load Unit from Library (Ctrl+O)"
- **WHEN** user clicks the folder icon
- **THEN** UnitLoadDialog opens for unit selection

#### Scenario: Keyboard shortcuts

- **WHEN** user presses Ctrl+N (or Cmd+N on Mac) in customizer
- **THEN** NewTabModal opens
- **WHEN** user presses Ctrl+O (or Cmd+O on Mac) in customizer
- **THEN** UnitLoadDialog opens

---

### Requirement: Unit Load Dialog

The system SHALL provide a dialog for loading existing units into tabs.

#### Scenario: Dialog display

- **WHEN** UnitLoadDialog opens
- **THEN** modal appears with search input at top
- **AND** filter options for tech base and weight class
- **AND** scrollable list of units below

#### Scenario: Unit sources

- **WHEN** UnitLoadDialog renders list
- **THEN** canonical units from CanonicalUnitService are shown
- **AND** custom units from CustomUnitService are shown
- **AND** custom units are marked with "Custom" badge

#### Scenario: Search filtering

- **WHEN** user types in search input
- **THEN** list filters to matching chassis/variant names
- **AND** filtering is case-insensitive

#### Scenario: Filter selection

- **WHEN** user selects tech base filter (Inner Sphere/Clan/Mixed)
- **THEN** list shows only matching units
- **WHEN** user selects weight class filter (Light/Medium/Heavy/Assault)
- **THEN** list shows only matching tonnage range

#### Scenario: Unit selection and loading

- **WHEN** user clicks a unit in the list
- **THEN** unit is highlighted as selected
- **WHEN** user clicks Load button
- **THEN** selected unit opens in a new tab
- **AND** dialog closes
- **AND** new tab becomes active
- **AND** URL updates to new unit route

#### Scenario: Cancel loading

- **WHEN** user clicks Cancel or presses Escape
- **THEN** dialog closes without action

---

### Requirement: Empty State Actions

The empty state SHALL provide quick access to unit creation and loading.

#### Scenario: Empty state buttons

- **WHEN** empty state is displayed
- **THEN** "New Unit" button with document icon appears
- **AND** "Load from Library" button with folder icon appears
- **AND** icons match toolbar styling

#### Scenario: Empty state new unit

- **WHEN** user clicks "New Unit" in empty state
- **THEN** NewTabModal opens

#### Scenario: Empty state load unit

- **WHEN** user clicks "Load from Library" in empty state
- **THEN** UnitLoadDialog opens

### Requirement: Tab Navigation Resilience

The system SHALL maintain tab navigation functionality even when URL state is incomplete.

#### Scenario: Navigation from index page with active tab

- **WHEN** user is on `/customizer` (index page) without unit ID in URL
- **AND** an active tab exists in the tab manager store
- **THEN** clicking a customizer tab (Structure, Armor, etc.) navigates successfully
- **AND** the URL is updated to include the active unit's ID
- **AND** the selected tab content is displayed

#### Scenario: Navigation with no active tab

- **WHEN** user is on `/customizer` with no tabs open
- **AND** user attempts to switch customizer tabs
- **THEN** no navigation error occurs
- **AND** the empty state remains displayed

#### Scenario: URL sync on tab selection

- **WHEN** user selects a unit tab from the tab bar
- **THEN** the URL is updated to `/customizer/{unitId}/{tabId}`
- **AND** subsequent tab navigation uses the URL unit ID
