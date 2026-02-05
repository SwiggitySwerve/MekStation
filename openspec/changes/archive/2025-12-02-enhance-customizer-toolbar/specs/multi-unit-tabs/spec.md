# multi-unit-tabs Specification Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
