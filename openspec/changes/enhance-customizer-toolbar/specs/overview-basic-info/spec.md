# overview-basic-info Specification Delta

## MODIFIED Requirements

### Requirement: Basic Information Panel
The Overview tab SHALL display a Basic Information panel matching MegaMekLab format.

#### Scenario: Panel layout
- **WHEN** Overview tab renders
- **THEN** Basic Information panel displays with labeled input fields
- **AND** fields are arranged in a vertical form layout
- **AND** each field has label on left, input on right

#### Scenario: Chassis field
- **WHEN** Basic Information panel renders
- **THEN** "Chassis" field appears first
- **AND** field contains base chassis name (e.g., "Atlas", "Timber Wolf")
- **AND** field is editable text input

#### Scenario: Clan Name field
- **WHEN** Basic Information panel renders
- **THEN** "Clan Name" field appears second
- **AND** field is optional (can be empty)
- **AND** used for alternate Clan designations (e.g., "Mad Cat" for Timber Wolf)

#### Scenario: Model field
- **WHEN** Basic Information panel renders
- **THEN** "Model" field appears third
- **AND** field contains variant designation (e.g., "AS7-D", "Prime")
- **AND** field is editable text input

#### Scenario: MUL ID field
- **WHEN** Basic Information panel renders
- **THEN** "MUL ID" field appears fourth
- **AND** field contains Master Unit List ID (-1 for custom units)
- **AND** field is read-only for canonical units
- **AND** field defaults to -1 for new custom units

#### Scenario: Year field
- **WHEN** Basic Information panel renders
- **THEN** "Year" field appears fifth
- **AND** field contains introduction year (e.g., "3025")
- **AND** field is editable numeric input
- **AND** field defaults to current game year setting

---

## ADDED Requirements

### Requirement: Tech Level Dropdown
The Overview tab SHALL include a Tech Level dropdown for rules filtering.

#### Scenario: Tech Level options
- **WHEN** Tech Level dropdown is clicked
- **THEN** options displayed are:
  - Introductory
  - Standard
  - Advanced
  - Experimental
- **AND** default selection is "Standard"

#### Scenario: Tech Level display
- **WHEN** Tech Level is set
- **THEN** current selection is visible in dropdown
- **AND** selection persists with unit state

#### Scenario: Tech Level placeholder behavior
- **WHEN** Tech Level is changed
- **THEN** selection is stored in unit state
- **AND** no filtering is applied (placeholder implementation)
- **AND** future implementation will filter available equipment

---

### Requirement: Unit Identity State
The unit store SHALL track full identity fields for MegaMekLab compatibility.

#### Scenario: Identity fields
- **WHEN** unit state is defined
- **THEN** it SHALL include:
  - `chassis: string` - Base chassis name
  - `clanName: string` - Optional Clan designation
  - `model: string` - Variant/model designation
  - `mulId: number` - Master Unit List ID (-1 for custom)
  - `year: number` - Introduction year
  - `techLevel: TechLevel` - Rules level filter

#### Scenario: Identity persistence
- **WHEN** unit is saved
- **THEN** all identity fields are included in saved data
- **AND** fields are restored when unit is loaded

#### Scenario: Full name derivation
- **WHEN** displaying unit name in tabs or lists
- **THEN** name is derived as "{Chassis} {Model}"
- **AND** if Model is empty, only Chassis is shown

