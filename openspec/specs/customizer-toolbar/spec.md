# customizer-toolbar Specification

## Purpose

TBD - created by archiving change enhance-customizer-toolbar. Update Purpose after archive.

## Requirements

### Requirement: Unit Load Dialog

The system SHALL provide a dialog for loading existing units into tabs.

#### Scenario: Dialog display

- **WHEN** UnitLoadDialog opens
- **THEN** modal appears with search input at top
- **AND** filter options for tech base, era, weight class
- **AND** scrollable list of units below

#### Scenario: Unit sources

- **WHEN** UnitLoadDialog renders list
- **THEN** canonical units from CanonicalUnitService are shown
- **AND** custom units from CustomUnitService are shown
- **AND** custom units are marked with "Custom" badge

#### Scenario: Search filtering

- **WHEN** user types in search input
- **THEN** list filters to matching chassis/variant names
- **AND** filtering is debounced (300ms)

#### Scenario: Filter selection

- **WHEN** user selects tech base filter (Inner Sphere/Clan/Both)
- **THEN** list shows only matching units
- **WHEN** user selects weight class filter
- **THEN** list shows only matching tonnage range

#### Scenario: Unit selection

- **WHEN** user clicks a unit in the list
- **THEN** unit is highlighted as selected
- **WHEN** user clicks Load button
- **THEN** selected unit opens in a new tab
- **AND** dialog closes
- **AND** new tab becomes active

#### Scenario: Cancel loading

- **WHEN** user clicks Cancel or presses Escape
- **THEN** dialog closes without action

---

### Requirement: Unit Naming Format

Units SHALL use Chassis + Variant naming format following BattleTech conventions.

#### Scenario: Name composition

- **WHEN** unit is displayed or saved
- **THEN** name format is "{Chassis} {Variant}"
- **AND** examples: "Atlas AS7-D", "Timber Wolf Prime", "Hunchback HBK-4G"

#### Scenario: Name input fields

- **WHEN** SaveUnitDialog opens
- **THEN** separate input fields for Chassis and Variant are shown
- **AND** fields are pre-filled from current unit state

#### Scenario: Name validation

- **WHEN** user enters empty Chassis
- **THEN** Save button is disabled
- **AND** error message "Chassis name is required" is shown
- **WHEN** user enters empty Variant
- **THEN** Save button is disabled
- **AND** error message "Variant designation is required" is shown

---

### Requirement: Canonical Unit Name Protection

The system SHALL prevent saving units with names matching official BattleTech units.

#### Scenario: Canonical conflict detection

- **WHEN** user enters a name matching a canonical unit (e.g., "Atlas AS7-D")
- **THEN** Save button is disabled
- **AND** red error indicator appears
- **AND** message states: "{Name} is an official BattleTech unit and cannot be overwritten"

#### Scenario: Suggest unique name

- **WHEN** canonical conflict is detected
- **THEN** "Suggest" button appears
- **WHEN** user clicks Suggest
- **THEN** system generates unique variant (e.g., "Atlas AS7-D (2)")

---

### Requirement: Custom Unit Conflict Resolution

The system SHALL offer options when saving matches an existing custom unit.

#### Scenario: Custom conflict detection

- **WHEN** user enters a name matching their own custom unit
- **THEN** amber warning indicator appears
- **AND** message states: "A custom unit named {Name} already exists"
- **AND** Save button shows "Overwrite"

#### Scenario: Overwrite option

- **WHEN** user clicks Overwrite
- **THEN** existing custom unit is replaced with new data
- **AND** dialog closes
- **AND** tab reflects saved state

#### Scenario: Save as new option

- **WHEN** user clicks "Save As New"
- **THEN** system generates unique variant
- **AND** unit is saved with new name
- **AND** original custom unit is preserved

---

### Requirement: Save Flow Integration

The save system SHALL integrate with unsaved changes detection.

#### Scenario: Save from unsaved changes dialog

- **WHEN** user clicks "Yes" in UnsavedChangesDialog
- **THEN** SaveUnitDialog opens
- **AND** user must provide valid name before save completes

#### Scenario: Save success

- **WHEN** save completes successfully
- **THEN** unit isModified flag is set to false
- **AND** tab name updates to match saved name
- **AND** unit persists to IndexedDB

#### Scenario: Save cancellation

- **WHEN** user cancels SaveUnitDialog
- **THEN** no changes are saved
- **AND** unsaved changes remain
- **AND** tab stays open (if from close action)
