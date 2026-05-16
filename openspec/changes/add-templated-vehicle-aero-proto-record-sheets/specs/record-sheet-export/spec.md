# record-sheet-export Delta — add-templated-vehicle-aero-proto-record-sheets

## ADDED Requirements

### Requirement: Shared Template Record Sheet Renderer

The system SHALL provide a shared `TemplateRecordSheetRenderer` module in
`src/services/printing/svgRecordSheetRenderer/` that owns the
canonical-template rendering pipeline independent of unit type.

The shared renderer SHALL expose `loadTemplate(path)`,
`applyBindings(texts)`, `applyPips(pipFills)`, and `getSVGString()`. It
SHALL reuse the existing `loadSVGTemplate`, `setTextContent`, canvas
rasterization, and jsPDF code paths verbatim — no fork of the proven
mech logic.

The mech renderer `SVGRecordSheetRenderer` SHALL be refactored into a
thin consumer of `TemplateRecordSheetRenderer` with no observable
change to its rendered output.

**Priority**: Critical

#### Scenario: Shared renderer loads a canonical template

- **GIVEN** a registered template path `templates_us/vehicle_turret_standard.svg`
- **WHEN** `TemplateRecordSheetRenderer.loadTemplate(path)` is called
- **THEN** it SHALL fetch the SVG through `MmDataAssetService.loadSVG`
  and parse it into a DOM document using the same `DOMParser` path the
  mech renderer uses

#### Scenario: Shared renderer injects text bindings by element ID

- **GIVEN** a loaded template and a `texts` map keyed by element ID
- **WHEN** `applyBindings(texts)` is called
- **THEN** for each entry it SHALL locate the element via
  `getElementById` and set `textContent`, leaving elements absent from
  the map unchanged

#### Scenario: Mech path is behaviour-preserving after refactor

- **GIVEN** the mech renderer refactored to consume `TemplateRecordSheetRenderer`
- **WHEN** the existing mech record-sheet snapshot tests run
- **THEN** every mech snapshot SHALL match its committed baseline with
  no diff

---

### Requirement: Shared Dynamic Pip Engine

The system SHALL provide a shared pip engine that computes armor and
structure pip positions from a template's `<rect>` region geometry,
generalizing the dynamic layout logic currently in `armor.ts`.

The pip engine SHALL support the `grouped`-layout element-lookup
fallback: when a region's primary element ID is absent, it SHALL retry
with `getElementById(id + "grouped")`, mirroring MegaMekLab
`PrintEntity.java`. It SHALL expose the alternate-clustering flag from
MegaMekLab `ArmorPipLayout.java` so callers can request clustered pip
placement.

The pip engine SHALL require the template SVG to be mounted in a live
DOM before measurement, because region rect geometry is read via
`getBBox()`.

**Priority**: Critical

#### Scenario: Pip positions computed from region geometry

- **GIVEN** a template with an armor region `<rect>` for a location
  and an armor count for that location
- **WHEN** the pip engine lays out that location
- **THEN** it SHALL emit exactly `count` pip elements positioned within
  the region rect's measured bounds

#### Scenario: Grouped-layout fallback resolves alternate IDs

- **GIVEN** a template region whose primary element ID is absent but
  whose `<id>grouped` element exists
- **WHEN** the pip engine resolves that region
- **THEN** it SHALL use the `grouped` element and lay out pips against it

#### Scenario: Pip measurement requires a live-mounted SVG

- **GIVEN** a template SVG that has not been mounted into the document
- **WHEN** the pip engine attempts region measurement
- **THEN** it SHALL require the SVG be mounted off-screen first, and
  the renderer SHALL perform that mount before invoking the pip engine

---

### Requirement: Per-Family Record Sheet Adapters

The system SHALL provide one adapter folder per Wave-1 family
(`vehicle/`, `aerospace/`, `protomech/`) under
`src/services/printing/svgRecordSheetRenderer/`, each containing two
pure modules: `selectTemplate.ts` and `bindings.ts`.

`selectTemplate.ts` SHALL be a pure function mapping a unit to a
`templateKey` string. `bindings.ts` SHALL be a pure function mapping
the unit's `IRecordSheetData` variant to a `{ texts, pips }` structure
keyed against the template's real element IDs, including a typed
per-family `PipCounts` contract computed from unit stats.

Neither adapter module SHALL perform I/O, DOM access, or asset
loading — they SHALL be deterministic pure functions.

**Priority**: Critical

#### Scenario: Vehicle template key mirrors PrintTank

- **GIVEN** a turret-equipped tracked combat vehicle in the standard
  weight tier
- **WHEN** the vehicle `selectTemplate` runs
- **THEN** it SHALL return the key `vehicle_turret_standard`, following
  the `{subtype}_{turret}_{weight}` form of MegaMekLab
  `PrintTank.getSVGFileName()`

#### Scenario: VTOL template key selection

- **GIVEN** a VTOL with no turret
- **WHEN** the vehicle `selectTemplate` runs
- **THEN** it SHALL return the key `vtol_noturret_standard`

#### Scenario: Aerospace template key selection

- **GIVEN** a conventional fighter
- **WHEN** the aerospace `selectTemplate` runs
- **THEN** it SHALL return the key `fighter_conventional`; an aerospace
  fighter SHALL return `fighter_aerospace`

#### Scenario: ProtoMech template key selection

- **GIVEN** a glider-configuration ProtoMech
- **WHEN** the protomech `selectTemplate` runs
- **THEN** it SHALL return the key `protomek_glider`; biped and quad
  ProtoMechs SHALL return `protomek_biped` and `protomek_quad`
  respectively

#### Scenario: Bindings produce a typed PipCounts contract

- **GIVEN** a vehicle `IRecordSheetData` with per-location armor and
  structure values
- **WHEN** the vehicle `bindings` function runs
- **THEN** the returned `pips` SHALL include a typed `PipCounts`
  structure whose per-location counts equal the unit's actual armor and
  structure point values

---

### Requirement: Template-Primary Rendering With Skeleton Fallback

The system SHALL render Wave-1 non-mech families through the canonical
template path by default, and SHALL fall back to the existing skeleton
renderer for that family when the template path fails.

`renderer.ts` SHALL expose a `renderTemplated` path that, for vehicle /
aerospace / protomech units, selects the template, loads it via
`MmDataAssetService`, applies bindings and pips, and returns the
templated SVG. The template path SHALL be wrapped in `try/catch`; on
asset-load failure or template-parse failure it SHALL invoke the
existing skeleton renderer for that family and return the skeleton SVG.

The skeleton renderers SHALL NOT be deleted or modified by this change.

**Priority**: Critical

#### Scenario: Vehicle renders via canonical template

- **GIVEN** a vehicle unit and a reachable `vehicle_turret_standard`
  template asset
- **WHEN** `renderTemplated` runs for that unit
- **THEN** the output SVG SHALL be derived from the canonical template,
  with header bindings and dynamically laid-out armor pips

#### Scenario: Asset failure degrades to skeleton renderer

- **GIVEN** a vehicle unit and a template asset that fails to load
  from local, CDN, and raw sources
- **WHEN** `renderTemplated` runs for that unit
- **THEN** it SHALL catch the failure and return the output of the
  existing `vehicleRenderer` skeleton renderer

#### Scenario: Customizer Save PDF uses the templated path

- **GIVEN** a vehicle, aerospace, or protomech unit open in the
  customizer
- **WHEN** the user invokes Save PDF via `PreviewTab.handleExportPDF`
- **THEN** `RecordSheetService.exportPDF` SHALL render through the
  templated path, with skeleton fallback on failure

---

### Requirement: Per-Family Pip-Count Fidelity Gate

Each Wave-1 family adapter SHALL have a test that parses the rendered
output SVG and asserts the count of pip elements per location matches
the unit's actual armor and structure statistics.

**Priority**: Critical

#### Scenario: Vehicle pip count matches armor stats

- **GIVEN** a vehicle fixture with known per-location armor and
  structure point values
- **WHEN** the vehicle is rendered through the templated path and the
  output SVG is parsed
- **THEN** the pip-element count for each location SHALL equal that
  location's armor or structure point value from the fixture

#### Scenario: Aerospace arc pip count matches armor stats

- **GIVEN** an aerospace fixture with known Nose / Left Wing / Right
  Wing / Aft armor values
- **WHEN** the unit is rendered and the output SVG is parsed
- **THEN** the pip-element count per arc SHALL equal that arc's armor
  value

#### Scenario: ProtoMech pip count matches armor stats

- **GIVEN** a ProtoMech fixture with known per-location armor and
  structure values
- **WHEN** the unit is rendered and the output SVG is parsed
- **THEN** the pip-element count per location SHALL equal that
  location's armor or structure value

## MODIFIED Requirements

### Requirement: Per-Type SVG Renderers

The system SHALL provide record-sheet rendering per unit type. For the
mech, vehicle, VTOL, support-vehicle, aerospace, conventional-fighter,
and ProtoMech families, rendering SHALL use the canonical mm-data
template path via the shared `TemplateRecordSheetRenderer` and shared
pip engine. For the infantry and battle-armor families, rendering MAY
continue to use the dedicated skeleton renderer module until a future
wave migrates them.

Each family's templated rendering SHALL consume its matching
`IRecordSheetData` variant, select a canonical template, apply text
bindings and dynamic pips, and produce an SVG conforming to the
canonical Total Warfare record-sheet layout for that type. The vehicle,
aerospace, and protomech skeleton renderers SHALL remain available as
the runtime fallback.

**Priority**: Critical

#### Scenario: Renderer dispatch by variant tag

- **GIVEN** an `IVehicleRecordSheetData` payload
- **WHEN** the top-level `renderer.ts` dispatcher is called
- **THEN** it SHALL route to the templated path for the vehicle family,
  falling back to `vehicleRenderer` only on template failure

#### Scenario: Vehicle armor diagram geometry

- **GIVEN** a VTOL unit with a Rotor location
- **WHEN** the vehicle is rendered through the templated path
- **THEN** the output SVG SHALL include the canonical four-side armor
  diagram AND the Rotor location block, with pips laid out from the
  `vtol_*` template's region geometry

#### Scenario: Aerospace 4-arc diagram

- **GIVEN** any aerospace unit
- **WHEN** the aerospace unit is rendered through the templated path
- **THEN** the output SVG SHALL show armor pips for the Nose, Left
  Wing, Right Wing, and Aft arcs as laid out by the
  `fighter_aerospace` / `fighter_conventional` template geometry

#### Scenario: BattleArmor per-trooper grid

- **GIVEN** a 5-trooper Elemental point
- **WHEN** the battlearmor renderer runs
- **THEN** the output SVG SHALL show 5 distinct trooper columns, each
  with its own armor pip grid and loadout section (skeleton renderer,
  pending Wave 2 migration)

#### Scenario: Infantry platoon counter (no per-location armor)

- **GIVEN** a 28-trooper foot rifle platoon
- **WHEN** the infantry renderer runs
- **THEN** the output SVG SHALL show a platoon-size counter rather than
  per-location armor pips, plus primary and secondary weapon blocks
  (skeleton renderer, pending Wave 2 migration)

#### Scenario: ProtoMech compact sheet

- **GIVEN** a ProtoMech unit
- **WHEN** the unit is rendered through the templated path
- **THEN** the output SVG SHALL be derived from the matching
  `protomek_biped` / `protomek_quad` / `protomek_glider` template with
  the per-location armor and structure diagram laid out from template
  geometry
