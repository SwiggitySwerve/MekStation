# customizer-routing — Delta for refactor-customizer-type-descriptors

## ADDED Requirements

### Requirement: Unit-Type Customizer Resolution

The customizer SHALL resolve every unit-type-dependent surface — the customizer
shell, the registry tab set, and the Overview / Preview / armor-diagram /
record-sheet-preview components — through a **single descriptor registry**
keyed by `UnitType`. No customizer routing or dispatch surface SHALL contain its
own `switch (unitType)` / per-type `if` ladder.

Each `UnitType` SHALL map to exactly one `CustomizerTypeDescriptor`. A descriptor
SHALL provide all dispatched surfaces; a missing surface SHALL be a TypeScript
compile error, not a runtime fallback. `getCustomizerDescriptor` SHALL return the
BattleMech descriptor for any `UnitType` not explicitly mapped, preserving the
pre-existing mech-default behaviour.

Adding a new unit type to the customizer SHALL require only registering one new
descriptor; it SHALL NOT require editing the router or any dispatcher.

#### Scenario: Router resolves the customizer shell from the descriptor

- **GIVEN** an active customizer tab with a unit type
- **WHEN** `UnitTypeRouter` renders
- **THEN** it SHALL look up the descriptor via `getCustomizerDescriptor(unitType)`
- **AND** it SHALL mount that descriptor's `Shell` component
- **AND** it SHALL NOT branch on `UnitType` directly

#### Scenario: Dispatchers resolve components from the descriptor

- **GIVEN** a unit type
- **WHEN** `OverviewTabForType`, `PreviewTabForType`, `ArmorDiagramForType`, or
  `RecordSheetPreviewForType` renders
- **THEN** it SHALL render the corresponding component from
  `getCustomizerDescriptor(unitType)`
- **AND** the rendered component SHALL be identical to the component the
  pre-refactor `switch` statement selected for that unit type

#### Scenario: Every unit type resolves a complete descriptor

- **WHEN** `getCustomizerDescriptor` is called with any `UnitType` enum value
- **THEN** it SHALL return a descriptor whose `Shell`, `tabs`, `OverviewComponent`,
  `PreviewComponent`, `ArmorDiagramComponent`, and `RecordSheetPreviewComponent`
  fields are all populated

#### Scenario: Non-mech customizer never mounts a mech-coupled component

- **GIVEN** a Vehicle / VTOL / Aerospace / Conventional Fighter / Battle Armor /
  Infantry / ProtoMech unit
- **WHEN** its customizer mounts and every tab is opened
- **THEN** no component that calls `useUnitStore` SHALL be rendered
- **AND** rendering SHALL NOT throw a "must be used within a UnitStoreProvider"
  error
