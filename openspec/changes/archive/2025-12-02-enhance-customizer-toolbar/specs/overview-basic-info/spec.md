# overview-basic-info Specification Delta

## ADDED Requirements

### Requirement: Basic Information Panel

The Overview tab SHALL display a two-column layout with Basic Information and Chassis panels.

#### Scenario: Two-column layout

- **WHEN** Overview tab renders on large screens
- **THEN** Basic Information panel displays on left
- **AND** Chassis panel displays on right
- **AND** panels stack vertically on small screens

#### Scenario: Basic Information panel contents

- **WHEN** Basic Information panel renders
- **THEN** Chassis, Clan Name, Model fields are stacked vertically at top
- **AND** MUL ID, Year, Tech Level are in a 3-column row at bottom

#### Scenario: Chassis field

- **WHEN** Basic Information panel renders
- **THEN** "Chassis" field appears first (full width)
- **AND** field contains base chassis name (e.g., "Atlas", "Timber Wolf")
- **AND** field is editable text input with placeholder "e.g., Atlas, Timber Wolf"

#### Scenario: Clan Name field

- **WHEN** Basic Information panel renders
- **THEN** "Clan Name" field appears second (full width)
- **AND** field is optional (can be empty)
- **AND** label shows "(optional)" hint
- **AND** used for alternate Clan designations (e.g., "Mad Cat" for Timber Wolf)

#### Scenario: Model field

- **WHEN** Basic Information panel renders
- **THEN** "Model" field appears third (full width)
- **AND** field contains variant designation (e.g., "AS7-D", "Prime")
- **AND** field is editable text input with placeholder "e.g., AS7-D, Prime"

#### Scenario: MUL ID field

- **WHEN** Basic Information panel renders
- **THEN** "MUL ID" field appears in bottom row (left column)
- **AND** field is a text input that accepts numbers and hyphens
- **AND** field defaults to "-1" for custom units
- **AND** field is editable

#### Scenario: Year field

- **WHEN** Basic Information panel renders
- **THEN** "Year" field appears in bottom row (center column)
- **AND** field is editable numeric input
- **AND** field defaults to 3145 (Dark Age era)

#### Scenario: Chassis panel contents

- **WHEN** Chassis panel renders
- **THEN** Tonnage field with +/- buttons appears first
- **AND** Motive Type dropdown appears second
- **AND** fields are stacked vertically

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
  - `mulId: string` - Master Unit List ID ("-1" for custom, accepts numbers and hyphens)
  - `year: number` - Introduction year (defaults to 3145)
  - `rulesLevel: RulesLevel` - Rules level filter (uses existing RulesLevel enum)

#### Scenario: Identity setters

- **WHEN** identity fields need updating
- **THEN** setter actions are available:
  - `setChassis(chassis: string)` - Updates chassis and derived name
  - `setClanName(clanName: string)` - Updates Clan name
  - `setModel(model: string)` - Updates model and derived name
  - `setMulId(mulId: string)` - Updates MUL ID (filters non-numeric/hyphen chars)
  - `setYear(year: number)` - Updates introduction year
  - `setRulesLevel(rulesLevel: RulesLevel)` - Updates rules level

#### Scenario: Identity persistence

- **WHEN** unit is saved
- **THEN** all identity fields are included in saved data
- **AND** fields are restored when unit is loaded

#### Scenario: Full name derivation

- **WHEN** displaying unit name in tabs or lists
- **THEN** name is derived as "{Chassis} {Model}"
- **AND** if Model is empty, only Chassis is shown

#### Scenario: Tab name synchronization

- **WHEN** Chassis or Model field changes in OverviewTab
- **THEN** tab name updates immediately via renameTab action
- **AND** TabBar re-renders with new name
