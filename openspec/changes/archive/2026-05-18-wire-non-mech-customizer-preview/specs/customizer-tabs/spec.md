# customizer-tabs — Delta for wire-non-mech-customizer-preview

## MODIFIED Requirements

### Requirement: Unit Provider Integration

Tab components SHALL access unit state through the store context that matches the
unit type being edited, and SHALL NOT assume the BattleMech store
(`useUnitStore` / `UnitStoreProvider`) is present.

A tab component that calls a per-type store hook (`useUnitStore`,
`useVehicleStore`, `useAerospaceStore`, `useBattleArmorStore`, `useInfantryStore`,
`useProtoMechStore`) MUST only be mounted inside the matching store context. Tabs
whose content differs by unit type MUST be implemented as a dispatcher that
switches on the active `UnitType` and renders a per-type component, each of which
reads only its own per-type store — mirroring the `ArmorDiagramForType` pattern.

#### Scenario: Mech tab accesses mech store

- **WHEN** a tab component renders inside the BattleMech customizer
- **THEN** it receives the current unit configuration via `useUnitStore`
- **AND** configuration changes are applied via the mech store actions

#### Scenario: Non-mech tab accesses its own per-type store

- **GIVEN** a Vehicle / Aerospace / Battle Armor / Infantry / ProtoMech customizer
- **WHEN** a tab component renders inside that customizer
- **THEN** it SHALL read state only from that unit type's store context
- **AND** it SHALL NOT call `useUnitStore`
- **AND** rendering the tab SHALL NOT throw a "must be used within a
  UnitStoreProvider" error

### Requirement: Preview Tab

The Preview tab SHALL display a live record sheet preview with export options for
every customizer-editable unit type — BattleMech, Vehicle / VTOL / Support Vehicle,
Aerospace / Conventional Fighter, Battle Armor, Infantry, and ProtoMech.

The Preview tab SHALL be implemented as a unit-type dispatcher
(`PreviewTabForType`) that switches on the active `UnitType` and renders the
correct per-type preview component. The BattleMech branch SHALL render the
existing mech Preview implementation with no behaviour change.

**Rationale**: Users need to see and export their record sheet before printing for
tabletop play, regardless of unit type. The shared mech Preview component is coupled
to the mech store and crashes when mounted in a non-mech customizer.

**Priority**: High

#### Scenario: Preview tab display

- **WHEN** user navigates to Preview tab
- **THEN** a toolbar with Download PDF and Print buttons is displayed
- **AND** a record sheet preview canvas is displayed below
- **AND** preview shows current unit configuration

#### Scenario: Preview tab opens without crashing for non-mech types

- **GIVEN** a Vehicle / Aerospace / Battle Armor / Infantry / ProtoMech customizer
- **WHEN** user navigates to the Preview tab
- **THEN** the Preview tab SHALL render its per-type preview component
- **AND** it SHALL NOT throw "useUnitStore must be used within a UnitStoreProvider"

#### Scenario: Mech Preview behaviour preserved

- **GIVEN** the BattleMech customizer
- **WHEN** user navigates to the Preview tab
- **THEN** the Preview tab SHALL render the existing mech preview unchanged
- **AND** all pre-existing mech Preview tests SHALL continue to pass

#### Scenario: Preview updates on unit change

- **GIVEN** user is viewing Preview tab
- **WHEN** user switches to another tab and modifies the unit
- **AND** user returns to Preview tab
- **THEN** preview reflects the updated configuration

#### Scenario: Download PDF action

- **WHEN** user clicks Download PDF button in Preview tab
- **THEN** a PDF file is generated and downloaded for the unit's type
- **AND** filename follows pattern "{chassis}-{model}.pdf"

#### Scenario: Print action

- **WHEN** user clicks Print button in Preview tab
- **THEN** browser print dialog opens
- **AND** print content matches preview display

## ADDED Requirements

### Requirement: Overview Tab Non-Mech Crash Guard

The Overview tab SHALL NOT crash when rendered for a non-mech unit type. The
Overview tab SHALL be dispatched by unit type (`OverviewTabForType`): the
BattleMech branch renders the existing mech Overview implementation unchanged; all
non-mech branches render a graceful, non-crashing placeholder panel until a
per-type Overview editor is delivered.

**Rationale**: The shared mech `OverviewTab` hard-calls `useUnitStore` and crashes
when mounted in a non-mech customizer. Non-mech customizers avoid this today only
because they default to a non-Overview initial tab; clicking Overview crashes.

**Priority**: Medium

#### Scenario: Non-mech Overview renders a graceful placeholder

- **GIVEN** a Vehicle / Aerospace / Battle Armor / Infantry / ProtoMech customizer
- **WHEN** user navigates to the Overview tab
- **THEN** a non-crashing placeholder panel SHALL be displayed indicating that the
  per-type Overview editor is not yet available
- **AND** it SHALL NOT throw "useUnitStore must be used within a UnitStoreProvider"

#### Scenario: Mech Overview behaviour preserved

- **GIVEN** the BattleMech customizer
- **WHEN** user navigates to the Overview tab
- **THEN** the existing mech Overview editor SHALL render unchanged
