# customizer-tabs — Delta for add-per-type-customizer-overview

## MODIFIED Requirements

### Requirement: Overview Tab Non-Mech Crash Guard

The Overview tab SHALL render a working unit-identity editor for every non-mech
unit type, and SHALL NOT crash when rendered for a non-mech unit type. The
Overview tab SHALL be dispatched by unit type (`OverviewTabForType`): the
BattleMech branch renders the existing mech Overview implementation unchanged;
each non-mech branch renders that family's per-type Overview editor.

Every non-mech per-type Overview editor SHALL read and write its own per-type
store (Vehicle / Aerospace / Battle Armor / Infantry / ProtoMech) and SHALL be
mounted only inside that store's context. The non-mech editors SHALL share one
store-free presentational panel (`NonMechIdentityPanel`) that edits the
unit-identity fields common to every non-mech store: chassis, model, MUL ID,
year, and rules level. Tech base SHALL be displayed read-only. A tonnage field
SHALL be shown only for unit types that carry tonnage (Vehicle / Aerospace /
ProtoMech) and SHALL be omitted for Battle Armor and Infantry.

**Rationale**: The shared mech `OverviewTab` hard-calls `useUnitStore` and
crashes when mounted in a non-mech customizer. The non-mech Overview tab
previously rendered a non-crashing placeholder; it now renders a real per-type
identity editor while remaining crash-safe.

**Priority**: Medium

#### Scenario: Non-mech Overview renders a per-type identity editor

- **GIVEN** a Vehicle / Aerospace / Battle Armor / Infantry / ProtoMech customizer
- **WHEN** user navigates to the Overview tab
- **THEN** the Overview tab SHALL render that unit type's identity editor with
  editable chassis, model, MUL ID, year, and rules-level fields
- **AND** it SHALL NOT throw "useUnitStore must be used within a
  UnitStoreProvider"

#### Scenario: Identity edits write through the per-type store

- **GIVEN** a non-mech customizer with its Overview tab open
- **WHEN** user edits the chassis or model field
- **THEN** the change SHALL be written to that unit type's store
- **AND** the store's `name` field SHALL stay in sync with `chassis` + `model`

#### Scenario: Tonnage field visibility by unit type

- **GIVEN** a non-mech customizer with its Overview tab open
- **WHEN** the unit type carries tonnage (Vehicle / Aerospace / ProtoMech)
- **THEN** an editable tonnage field SHALL be displayed
- **AND** WHEN the unit type does not (Battle Armor / Infantry) the tonnage
  field SHALL be omitted

#### Scenario: Mech Overview behaviour preserved

- **GIVEN** the BattleMech customizer
- **WHEN** user navigates to the Overview tab
- **THEN** the existing mech Overview editor SHALL render unchanged
