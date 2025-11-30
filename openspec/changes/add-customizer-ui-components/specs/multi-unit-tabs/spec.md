## ADDED Requirements

### Requirement: Tab Bar Display
The system SHALL display a horizontal tab bar at the top of the customizer.

#### Scenario: Tab bar rendering
- **WHEN** at least one unit tab exists
- **THEN** tab bar appears with slate-800 background
- **AND** bottom border separates tabs from content
- **AND** add button appears at right edge

#### Scenario: No tabs state
- **WHEN** no unit tabs exist
- **THEN** full-screen empty state appears
- **AND** Create New Unit button is prominently shown

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
Users SHALL be able to close tabs with unsaved changes protection.

#### Scenario: Close unmodified tab
- **WHEN** user clicks close button on unmodified tab
- **THEN** tab is immediately closed
- **AND** adjacent tab becomes active

#### Scenario: Close modified tab
- **WHEN** user clicks close button on modified tab
- **THEN** confirmation dialog appears
- **AND** dialog warns about unsaved changes

#### Scenario: Last tab protection
- **WHEN** only one tab remains
- **THEN** close button is hidden
- **AND** tab cannot be closed

### Requirement: Tab Context Menu
Users SHALL access additional options via right-click context menu.

#### Scenario: Duplicate action
- **WHEN** user selects Duplicate
- **THEN** new tab is created with copied configuration
- **AND** new tab name has Copy suffix

### Requirement: State Persistence
Tab state SHALL be preserved across browser sessions.

#### Scenario: Session save
- **WHEN** user makes changes
- **THEN** state is saved to localStorage via Zustand
- **AND** save is debounced to reduce writes

#### Scenario: Session restore
- **WHEN** user reopens customizer
- **THEN** previous tabs are restored
- **AND** active tab is restored
- **AND** modification flags are preserved

### Requirement: Loading State
The system SHALL display loading indicator during initialization.

#### Scenario: Initial load
- **WHEN** MultiUnitProvider is initializing
- **THEN** centered Loading message appears

