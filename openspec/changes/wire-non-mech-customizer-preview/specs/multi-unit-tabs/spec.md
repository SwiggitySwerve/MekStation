# multi-unit-tabs — Delta for wire-non-mech-customizer-preview

## MODIFIED Requirements

### Requirement: Shared Tab Implementations

The Fluff tab SHALL be a single shared implementation usable across all unit types,
because it is store-decoupled.

The Overview and Preview tabs SHALL NOT register a mech-store-coupled component
into a non-mech per-type tab set. Because the mech Overview and Preview components
hard-call the BattleMech store (`useUnitStore`), the tab registry SHALL register a
unit-type dispatcher (`OverviewTabForType`, `PreviewTabForType`) for the Overview
and Preview tab specs. Each dispatcher switches on the active `UnitType` and
renders the per-type component for that type; the BattleMech branch renders the
existing mech component unchanged.

The tab registry comment SHALL accurately describe this: Fluff is genuinely
shared; Overview and Preview are dispatched per type and are NOT a single shared
mech implementation reused across all unit types.

**Priority**: High

#### Scenario: Fluff data uniform across types

- **GIVEN** any unit type
- **WHEN** the Fluff tab renders
- **THEN** it SHALL present the same fluff fields (description, history,
  capabilities) regardless of unit type

#### Scenario: Registry does not register mech-coupled tabs for non-mech types

- **GIVEN** the `VEHICLE_TABS`, `AEROSPACE_TABS`, `BATTLE_ARMOR_TABS`,
  `INFANTRY_TABS`, and `PROTOMECH_TABS` tab sets
- **WHEN** the registry is enumerated
- **THEN** the Overview and Preview tab specs SHALL reference the per-type
  dispatcher components, not the mech-store-coupled `OverviewTab` / `PreviewTab`
- **AND** the registry comment SHALL NOT claim the Overview and Preview tabs reuse
  the mech implementation across all unit types

## ADDED Requirements

### Requirement: Per-Type Preview Wiring

Each per-type customizer SHALL render its Preview tab from a per-type preview component mounted inside that customizer's store context.
Each per-type preview component SHALL read state only from its own per-type store and SHALL build a unit object whose discriminated `unitType` matches the customizer's unit type, suitable for `RecordSheetService.extractData`. This applies to `VehicleCustomizer`, `AerospaceCustomizer`, `BattleArmorCustomizer`, `InfantryCustomizer`, and `ProtoMechCustomizer`.

**Rationale**: The crash shipped because no path mounted the Preview tab outside
the mech store provider. Per-type preview components mounted inside the matching
store context close the customizer→record-sheet seam left open by the Wave-1/2
templated-record-sheet work.

**Priority**: High

#### Scenario: Per-type preview mounts inside the matching store context

- **GIVEN** a non-mech customizer with its per-type store context provider
- **WHEN** the Preview tab is rendered
- **THEN** the per-type preview component SHALL mount inside that store context
- **AND** it SHALL read only that unit type's store
- **AND** rendering SHALL NOT throw a missing-provider error

#### Scenario: Per-type preview builds a correctly typed unit object

- **GIVEN** any non-mech customizer with a configured unit
- **WHEN** the per-type preview component builds its unit object
- **THEN** the unit object's discriminated `unitType` SHALL match the customizer's
  unit type (vehicle / aerospace / battlearmor / infantry / protomech)
- **AND** `RecordSheetService.extractData` SHALL accept the unit object without
  throwing `UnsupportedUnitTypeError`
