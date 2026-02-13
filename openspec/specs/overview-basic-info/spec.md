# overview-basic-info Specification

## Purpose

TBD - created by archiving change enhance-customizer-toolbar. Update Purpose after archive.

## Requirements

### Requirement: Rules Level Dropdown

The Overview tab SHALL include a rules level dropdown for rules filtering.

#### Scenario: Rules level options

- **WHEN** rules level dropdown is clicked
- **THEN** options displayed are:
  - Introductory
  - Standard
  - Advanced
  - Experimental
- **AND** default selection is "Standard"

#### Scenario: Rules level display

- **WHEN** rules level is set
- **THEN** current selection is visible in dropdown
- **AND** selection persists with unit state

#### Scenario: Rules level placeholder behavior

- **WHEN** rules level is changed
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
