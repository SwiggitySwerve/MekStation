# record-sheet-export — Delta for wire-non-mech-customizer-preview

## ADDED Requirements

### Requirement: Customizer Non-Mech Preview And Export Path

The customizer SHALL provide a working live record-sheet preview and PDF export for
every customizer-editable non-mech unit type — Vehicle / VTOL / Support Vehicle,
Aerospace / Conventional Fighter, Battle Armor, Infantry, and ProtoMech.

For each non-mech unit type, the customizer preview component SHALL build a unit
object from its per-type store and pass it through `RecordSheetService.extractData`,
then to `renderPreview` for the on-canvas preview and `exportPDF` for the PDF
download. The unit object's discriminated type hint (`type` / `unitType`) SHALL
resolve via `dispatchTargetFromUnit` to the matching non-mech dispatch kind
(`vehicle`, `aerospace`, `battlearmor`, `infantry`, `protomech`).

This requirement covers only the customizer→service call seam. The
`RecordSheetService`, the per-type SVG renderers, the record-sheet templates, and
the per-type data extractors are unchanged.

**Rationale**: The Wave-1/2 templated-record-sheet changes built per-type renderers
and extractors, and `RecordSheetService` already dispatches per unit type — but the
only callers of `extractData` were the mech-only `PreviewTab` and
`RecordSheetPreview`. Without this seam the non-mech renderers are unreachable from
the customizer UI.

**Priority**: High

**Status**: PROPOSED

#### Scenario: Non-mech preview renders on canvas

- **GIVEN** a non-mech unit configured in its customizer
- **WHEN** the Preview tab renders
- **THEN** the per-type preview component SHALL call
  `RecordSheetService.extractData` with the unit object
- **AND** SHALL call `renderPreview` to draw the record sheet onto the canvas
- **AND** no error SHALL be thrown for a valid configuration

#### Scenario: Non-mech Save-PDF produces the correct sheet

- **GIVEN** a non-mech unit configured in its customizer
- **WHEN** the user clicks Download PDF in the Preview tab
- **THEN** the per-type preview component SHALL call
  `RecordSheetService.exportPDF` with data extracted from the unit object
- **AND** the generated PDF SHALL be the record sheet for that unit's type

#### Scenario: Dispatch resolves to the correct non-mech kind

- **GIVEN** a per-type preview component for vehicle / aerospace / battlearmor /
  infantry / protomech
- **WHEN** the built unit object is passed to `dispatchTargetFromUnit`
- **THEN** the resolved dispatch kind SHALL equal the customizer's unit type
- **AND** `extractData` SHALL NOT throw `UnsupportedUnitTypeError`

### Requirement: Record Sheet Preview Component Is Unit-Type Aware

The `RecordSheetPreview` component (the on-canvas preview surface) SHALL NOT
hard-depend on the BattleMech store. It SHALL be dispatched by unit type (a
`RecordSheetPreviewForType` dispatcher, or per-type canvas components), so that the
preview canvas reads only the per-type store of the unit being previewed.

**Rationale**: `RecordSheetPreview` independently calls `useUnitStore` and
`extractData`; even with a fixed Preview tab, the canvas would still crash inside a
non-mech customizer unless it too is made unit-type-aware.

**Priority**: High

**Status**: PROPOSED

#### Scenario: Preview canvas reads the matching per-type store

- **GIVEN** a non-mech customizer
- **WHEN** the record-sheet preview canvas renders
- **THEN** it SHALL read state from that unit type's store context
- **AND** it SHALL NOT call `useUnitStore`
- **AND** rendering SHALL NOT throw a missing-provider error

#### Scenario: Mech preview canvas unchanged

- **GIVEN** the BattleMech customizer
- **WHEN** the record-sheet preview canvas renders
- **THEN** it SHALL render the existing mech preview canvas with no behaviour change
