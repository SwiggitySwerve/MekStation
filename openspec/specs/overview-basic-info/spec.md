# overview-basic-info Specification

## Purpose

Defines Overview Basic Info requirements for Rules Level Dropdown and Unit Identity State, preserving the source-of-truth scope introduced by archived change enhance-customizer-toolbar.

## Requirements

### Requirement: Rules Level Dropdown

The Overview tab SHALL include a rules level dropdown for selecting and
persisting the unit's rules level. The selected value is currently an identity
field; it SHALL NOT be described as a general equipment-availability filter.

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
- **AND** no general equipment-availability filtering is applied from this selection (placeholder implementation)
- **AND** future implementation may filter available equipment by the selected rules level

**Source**: `src/types/enums/RulesLevel.ts::RulesLevel, ALL_RULES_LEVELS` (the
option enum and order); `src/components/customizer/tabs/OverviewTab.tsx::handleRulesLevelChange`
and `::ALL_RULES_LEVELS.map` (the rendered options); and
`src/stores/unitStoreIdentityActions.ts::setRulesLevel` (identity update).
`src/stores/useEquipmentStore.filters.ts::matchesAvailability` uses unit year
and tech base; its separate `hidePrototype` path may inspect an item's
`rulesLevel`, but the selected unit rules level does not drive general
availability filtering.

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
  - `rulesLevel: RulesLevel` - Selected rules level (uses existing RulesLevel enum)

#### Scenario: Identity setters

- **WHEN** identity fields need updating
- **THEN** setter actions are available:
  - `setChassis(chassis: string)` - Updates chassis and derived name
  - `setClanName(clanName: string)` - Updates Clan name
  - `setModel(model: string)` - Updates model and derived name
  - `setMulId(mulId: string)` - Updates MUL ID (filters non-numeric/hyphen chars)
  - `setYear(year: number)` - Updates introduction year
  - `setRulesLevel(rulesLevel: RulesLevel)` - Updates rules level

**Source**: `src/stores/unitStoreIdentityActions.ts::setRulesLevel`

#### Scenario: Identity persistence

- **WHEN** unit is saved
- **THEN** all identity fields are included in saved data
- **AND** fields are restored when unit is loaded

**Source**: `src/stores/unitStoreIdentityActions.ts::pickPersistedUnitIdentity`

#### Scenario: Full name derivation

- **WHEN** displaying unit name in tabs or lists
- **THEN** name is derived as "{Chassis} {Model}"
- **AND** if Model is empty, only Chassis is shown

#### Scenario: Tab name synchronization

- **WHEN** Chassis or Model field changes in OverviewTab
- **THEN** tab name updates immediately via renameTab action
- **AND** TabBar re-renders with new name
