## MODIFIED Requirements

### Requirement: Custom Unit CRUD Operations

The system SHALL provide create, read, update, and delete operations for custom units via API.

**Rationale**: Users need to save their custom mech builds persistently with version tracking.

**Priority**: Critical

#### Scenario: Create custom unit

- **GIVEN** a valid IFullUnit object
- **WHEN** CustomUnitService.create(unit) is called
- **THEN** POST to /api/units/custom endpoint
- **AND** return the generated unique ID
- **AND** unit is stored as version 1

#### Scenario: Read custom unit

- **GIVEN** a custom unit exists with ID "custom-123"
- **WHEN** CustomUnitService.getById("custom-123") is called
- **THEN** GET from /api/units/custom/custom-123
- **AND** return the complete IFullUnit with version metadata

#### Scenario: Update custom unit (save)

- **GIVEN** a custom unit exists with ID "custom-123" at version 3
- **WHEN** CustomUnitService.save("custom-123", modifiedUnit) is called
- **THEN** PUT to /api/units/custom/custom-123
- **AND** increment version to 4
- **AND** store previous version in history

#### Scenario: Delete custom unit

- **GIVEN** a custom unit exists with ID "custom-123"
- **WHEN** CustomUnitService.delete("custom-123") is called
- **THEN** DELETE /api/units/custom/custom-123
- **AND** remove unit and all version history

---

### Requirement: Custom Unit Listing

The system SHALL list all custom units as index entries.

**Rationale**: Users need to browse their saved custom units.

**Priority**: High

#### Scenario: List all custom units

- **GIVEN** the user has saved 5 custom units
- **WHEN** CustomUnitService.list() is called
- **THEN** GET /api/units/custom
- **AND** return array of 5 UnitIndexEntry objects with version info

#### Scenario: Empty custom units

- **GIVEN** no custom units have been created
- **WHEN** CustomUnitService.list() is called
- **THEN** return empty array

---

## ADDED Requirements

### Requirement: Canonical Unit Protection

The system SHALL prevent overwriting canonical (official) units.

**Rationale**: Canonical units are read-only source data that must remain immutable.

**Priority**: Critical

#### Scenario: Save modified canonical unit

- **GIVEN** user has loaded and modified canonical unit "Atlas AS7-D"
- **WHEN** user attempts to save
- **THEN** system SHALL reject save with original name
- **AND** prompt for new name with suggested default

#### Scenario: Generate clone name

- **GIVEN** canonical unit "Atlas AS7-D" is being cloned
- **WHEN** generating default clone name
- **THEN** suggest "Atlas AS7-D-Custom-1"
- **AND** if that exists, suggest "Atlas AS7-D-Custom-2"
- **AND** continue incrementing until unique name found

#### Scenario: Detect canonical vs custom

- **GIVEN** a unit with ID
- **WHEN** checking if unit is canonical
- **THEN** return true if ID exists in canonical index
- **AND** return false otherwise

---

### Requirement: Version History Access

The system SHALL provide access to unit version history.

**Rationale**: Users need to view and potentially revert to previous versions.

**Priority**: High

#### Scenario: List version history

- **GIVEN** unit "custom-123" has 5 versions
- **WHEN** CustomUnitService.getVersionHistory("custom-123") is called
- **THEN** GET /api/units/custom/custom-123/versions
- **AND** return array of version metadata (version number, saved timestamp, notes)

#### Scenario: Get specific version

- **GIVEN** unit "custom-123" has version 3 in history
- **WHEN** CustomUnitService.getVersion("custom-123", 3) is called
- **THEN** GET /api/units/custom/custom-123/versions/3
- **AND** return full unit data as it was at version 3

---

### Requirement: Version Revert

The system SHALL allow reverting a unit to a previous version.

**Rationale**: Users may need to undo changes and restore earlier configurations.

**Priority**: High

#### Scenario: Revert to previous version

- **GIVEN** unit "custom-123" is at version 5
- **AND** version 3 exists in history
- **WHEN** CustomUnitService.revert("custom-123", 3) is called
- **THEN** POST /api/units/custom/custom-123/revert/3
- **AND** create new version 6 with data from version 3
- **AND** current version becomes 6 (not 3)

#### Scenario: Revert to non-existent version

- **GIVEN** unit "custom-123" only has versions 1-5
- **WHEN** CustomUnitService.revert("custom-123", 10) is called
- **THEN** return error "Version 10 not found"

---

### Requirement: JSON Export

The system SHALL export custom units as JSON files.

**Rationale**: Users need to share units and create backups.

**Priority**: High

#### Scenario: Export single unit

- **GIVEN** a custom unit "custom-123"
- **WHEN** CustomUnitService.export("custom-123") is called
- **THEN** GET /api/units/custom/custom-123/export
- **AND** return JSON file with ISerializedUnitEnvelope format
- **AND** filename defaults to "{chassis}-{variant}.json"

#### Scenario: Export envelope format

- **GIVEN** unit is being exported
- **THEN** envelope SHALL include:
  - formatVersion: schema version string
  - savedAt: ISO timestamp
  - application: "mekstation"
  - applicationVersion: current app version
  - unit: ISerializedUnit data

---

### Requirement: JSON Import

The system SHALL import units from JSON files.

**Rationale**: Users need to load shared units and restore backups.

**Priority**: High

#### Scenario: Import valid JSON

- **GIVEN** a valid unit JSON file
- **WHEN** CustomUnitService.import(file) is called
- **THEN** POST /api/units/import with file content
- **AND** validate JSON structure
- **AND** check for name conflicts
- **AND** create new custom unit with version 1

#### Scenario: Import with name conflict

- **GIVEN** a JSON file with unit named "Atlas Custom-1"
- **AND** a unit with that name already exists
- **WHEN** importing the file
- **THEN** prompt user to rename or skip
- **AND** suggest next available name "Atlas Custom-2"

#### Scenario: Import invalid JSON

- **GIVEN** an invalid or corrupted JSON file
- **WHEN** CustomUnitService.import(file) is called
- **THEN** return error with validation details
- **AND** do not create any unit

---

### Requirement: Save Shortcut Integration

The system SHALL support keyboard shortcut for quick save.

**Rationale**: Users expect Ctrl+S to save their work without dialogs.

**Priority**: Medium

#### Scenario: Save existing custom unit

- **GIVEN** user is editing custom unit "custom-123"
- **WHEN** user presses Ctrl+S
- **THEN** save current state as new version
- **AND** show brief save confirmation toast

#### Scenario: Save modified canonical unit

- **GIVEN** user is editing modified canonical unit
- **WHEN** user presses Ctrl+S
- **THEN** open Save As dialog with clone name suggestion
- **AND** require user to confirm new name

#### Scenario: Save new unsaved unit

- **GIVEN** user has created new unit not yet saved
- **WHEN** user presses Ctrl+S
- **THEN** open Save dialog to enter chassis/variant name
- **AND** create new custom unit on confirm

---
