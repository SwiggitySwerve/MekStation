# record-sheet-export Specification

## Purpose

TBD - created by archiving change add-record-sheet-pdf-export. Update Purpose after archive.
## Requirements
### Requirement: Record Sheet Data Model

The system SHALL define data structures for record sheet generation.

**Rationale**: Typed interfaces ensure correct data mapping from unit configuration to printable format.

**Priority**: Critical

**Status**: IMPLEMENTED ✓

#### Scenario: Record sheet data extraction

- **GIVEN** a valid IBattleMech unit configuration
- **WHEN** RecordSheetService.extractData(unit) is called
- **THEN** return IRecordSheetData containing:
  - Unit identity (name, chassis, model, tonnage)
  - Movement stats (walk, run, jump MP)
  - Armor allocation per location with max values
  - Internal structure points per location
  - Equipment list with heat, damage, range data
  - Heat sink count and type
  - Critical slot assignments per location

---

### Requirement: SVG Template Rendering

The system SHALL use configuration-specific SVG templates from mm-data CDN for all mech types.

Templates are fetched from externalized mm-data assets at runtime, with proper error handling for network failures.

#### Scenario: Template loading from CDN

- **WHEN** record sheet renders for a unit
- **THEN** fetch template from `/record-sheets/templates_us/` (or `templates_iso/` for A4)
- **AND** template URL is constructed based on MechConfiguration
- **AND** network errors are caught and displayed to user

#### Scenario: Configuration-specific template loading

- **WHEN** record sheet renders for a unit
- **THEN** load template based on unit's MechConfiguration:
  - BIPED → `mek_biped_default.svg`
  - QUAD → `mek_quad_default.svg`
  - TRIPOD → `mek_tripod_default.svg`
  - LAM → `mek_lam_default.svg`
  - QUADVEE → `mek_quadvee_default.svg`

### Requirement: PDF Generation

The system SHALL generate PDF record sheets client-side using jsPDF.

**Rationale**: Client-side generation works offline and is portable to Electron desktop app.

**Priority**: Critical

**Status**: IMPLEMENTED ✓

#### Scenario: Export PDF

- **WHEN** user clicks Download PDF button
- **THEN** generate PDF document from SVG template
- **AND** trigger browser download with filename "{chassis}-{model}.pdf"
- **AND** PDF is Letter/A4 size, print-ready

#### Scenario: PDF content

- **GIVEN** a valid unit configuration
- **WHEN** PDF is generated
- **THEN** PDF contains rendered SVG with:
  - Unit header with name, tonnage, tech base, BV
  - Movement block with Walk/Run/Jump MP
  - Armor diagram with pip visualization
  - Internal structure values per location
  - Weapons and equipment table
  - Heat sink count and type
  - Critical hit tables for each location
  - Pilot data section (blank for tabletop)

#### Scenario: PDF BV calculation

- **WHEN** PDF export is initiated
- **THEN** BV is calculated using CalculationService.calculateBattleValue()
- **AND** BV is included in unitConfig passed to RecordSheetService
- **AND** BV appears in the header section of the exported PDF

#### Scenario: PDF quality

- **WHEN** PDF is generated
- **THEN** use 20x DPI multiplier for print quality
- **AND** use JPEG format for canvas-to-PDF embedding
- **AND** ensure sharp text and lines at print resolution

### Requirement: Preview Rendering

The system SHALL render a live preview of the record sheet in the browser.

**Rationale**: Users need to see changes immediately as they edit the unit.

**Priority**: High

**Status**: IMPLEMENTED

#### Scenario: Preview display

- **WHEN** PreviewTab is active
- **THEN** RecordSheetPreview component renders current unit via SVG template
- **AND** preview updates when unit configuration changes
- **AND** preview maintains aspect ratio of paper size

#### Scenario: Preview DPI and quality

- **WHEN** preview canvas renders
- **THEN** use 20x DPI multiplier for crisp text at all zoom levels
- **AND** support zoom range from 20% to 300%

#### Scenario: Preview BV calculation

- **WHEN** record sheet preview renders
- **THEN** BV is calculated using CalculationService.calculateBattleValue()
- **AND** BV is passed to unitConfig for template population
- **AND** BV updates reactively when unit configuration changes

#### Scenario: Preview updates on unit tab switch

- **GIVEN** multiple unit tabs are open
- **AND** user is on the Preview tab
- **WHEN** user switches to a different unit tab
- **THEN** the preview canvas SHALL re-render with the newly selected unit's data
- **AND** all displayed values (tonnage, name, armor, equipment) SHALL match the active unit
- **AND** no stale data from the previous unit SHALL appear in the preview

### Requirement: Zoom Controls

The system SHALL provide floating zoom controls in the preview area.

**Rationale**: Users need to zoom in for detail and fit the sheet to their screen.

**Priority**: High

**Status**: IMPLEMENTED ✓

#### Scenario: Zoom control display

- **WHEN** preview is displayed
- **THEN** show floating control panel in bottom-right corner
- **AND** controls have semi-transparent dark background
- **AND** controls include zoom percentage display

#### Scenario: Zoom in/out

- **WHEN** user clicks zoom in (+) button
- **THEN** increase zoom by 15%
- **AND** cap at maximum 300%

- **WHEN** user clicks zoom out (−) button
- **THEN** decrease zoom by 15%
- **AND** cap at minimum 20%

#### Scenario: Fit to width

- **WHEN** user clicks fit width (↔) button
- **THEN** calculate scale to fit container width
- **AND** apply calculated zoom level

#### Scenario: Fit to height

- **WHEN** user clicks fit height (↕) button
- **THEN** calculate scale to fit container height
- **AND** apply calculated zoom level

---

### Requirement: Print Functionality

The system SHALL support browser print of the record sheet.

**Rationale**: Users may prefer browser print dialog for direct printing.

**Priority**: Medium

**Status**: IMPLEMENTED ✓

#### Scenario: Print action

- **WHEN** user clicks Print button in PreviewTab
- **THEN** open browser print dialog
- **AND** print content matches preview display
- **AND** print uses appropriate page margins

---

### Requirement: Armor Pip Visualization

The system SHALL render armor pips using mm-data SVG assets fetched from CDN for biped mechs, and ArmorPipLayout algorithm for other configurations.

#### Scenario: Biped armor pip loading from CDN

- **WHEN** armor diagram renders for BIPED configuration
- **THEN** fetch pip SVGs from `/record-sheets/biped_pips/Armor_<Location>_<Count>_Humanoid.svg`
- **AND** extract path elements from `<switch><g>` structure in pip SVG
- **AND** insert paths into template's `canonArmorPips` group
- **AND** parent group transform handles correct positioning (no double-transform)

#### Scenario: Non-biped armor pip generation

- **WHEN** armor diagram renders for QUAD, TRIPOD, LAM, or QUADVEE configuration
- **THEN** use ArmorPipLayout algorithm to generate pips dynamically
- **AND** pips are positioned within template's pip area rect elements

### Requirement: Structure Pip Visualization

The system SHALL render internal structure pips using mm-data SVG assets fetched from CDN for biped mechs.

#### Scenario: Biped structure pip loading from CDN

- **GIVEN** a BIPED mech with specific tonnage
- **WHEN** structure section renders
- **THEN** fetch pip SVGs from `/record-sheets/biped_pips/BipedIS<Tonnage>_<Location>.svg`
- **AND** insert paths into template's structure pip group

### Requirement: Equipment Table Rendering

The system SHALL render a weapons and equipment table with combat statistics.

**Rationale**: Equipment table provides quick reference for weapon ranges and damage during combat.

**Priority**: High

**Status**: IMPLEMENTED ✓

#### Scenario: Equipment columns

- **WHEN** equipment table renders
- **THEN** display columns: Qty, Type, Loc, Heat, Damage, Min, Short, Med, Long
- **AND** include damage type codes: [DE]=Direct Energy, [DB]=Direct Ballistic, [M,C,S]=Missile
- **AND** ammunition shows shots remaining in parentheses

#### Scenario: Equipment table positioning

- **WHEN** equipment table renders
- **THEN** insert rows into `inventory` element area in template
- **AND** use Eurostile font family with web-safe fallbacks
- **AND** truncate long equipment names to fit column width

---

### Requirement: Critical Slots Rendering

The system SHALL render critical hit tables for each location matching MegaMekLab style with precise positioning and typography.

**Rationale**: Critical slots track equipment placement and damage during gameplay. Exact visual match with MegaMekLab ensures consistent user experience.

**Priority**: High

**Status**: IMPLEMENTED ✓

#### Scenario: Critical slot display

- **WHEN** critical slots section renders
- **THEN** render into `crits_*` rect elements in template
- **AND** display location name label above the rect boundary
- **AND** show slot numbers 1-6 (restarting for 12-slot locations)

#### Scenario: Critical table title positioning

- **WHEN** location title renders
- **THEN** position title X at `rectX + rectWidth * 0.075` (7.5% indent from left edge)
- **AND** position title Y at `rectY - 4` pixels (above the rect boundary with clearance)
- **AND** use `text-anchor: start` (left-aligned)
- **AND** use Times New Roman serif font
- **AND** use bold font weight
- **AND** use font size of `baseFontSize * 1.25` (8.75px with 7px base)

#### Scenario: Critical slot font sizing

- **WHEN** critical slot entries render
- **THEN** use constant 7px font size for ALL locations regardless of slot count
- **AND** use Times New Roman serif font family
- **AND** this matches MegaMekLab's `DEFAULT_CRITICAL_SLOT_ENTRY_FONT_SIZE = 7f`

#### Scenario: Critical slot line height calculation

- **WHEN** slot entries are positioned vertically
- **THEN** calculate gap height as `rectHeight * 0.05` for 12-slot locations (0 for 6-slot)
- **AND** calculate line height as `(rectHeight - gapHeight) / slotCount`
- **AND** position slot Y as `rectY + (slotIndex + 0.7) * lineHeight`
- **AND** add gap offset for slots 7-12 in 12-slot locations

#### Scenario: Critical slot number positioning

- **WHEN** slot numbers render
- **THEN** position at `rectX + bracketWidth + bracketMargin + 2` pixels
- **AND** display as "1." through "6." (restarting after slot 6)
- **AND** use bold font weight for slot numbers

#### Scenario: Critical slot content positioning

- **WHEN** slot content text renders
- **THEN** position at `rectX + bracketWidth + bracketMargin + numberWidth` (approximately 11% from left)
- **AND** where numberWidth is 12px for the slot number column
- **AND** where bracketWidth is 2px for multi-slot indicator area
- **AND** where bracketMargin is 1px spacing

#### Scenario: Critical slot font styling

- **WHEN** critical slot text renders
- **THEN** use Times New Roman serif font (matching MegaMekLab)
- **AND** bold hittable equipment (weapons, system components)
- **AND** use normal weight for unhittable equipment (Endo Steel, Ferro-Fibrous, TSM)
- **AND** use normal weight black text for "Roll Again" entries
- **AND** use grey (#999999) for "-Empty-" entries

#### Scenario: Multi-slot equipment brackets

- **WHEN** equipment occupies multiple consecutive slots
- **THEN** draw L-shaped bracket on left side of slots
- **AND** bracket width is 3px (horizontal segments)
- **AND** bracket stroke width is 0.72px
- **AND** bracket vertical padding is `slotHeight * 0.15` from top and bottom edges (symmetrical)
- **AND** bracket only applies to user-added equipment, NOT system components
- **AND** bracket bridges continuously across slot 6/7 gap when equipment spans both sections

### Requirement: Document Margins

The system SHALL add proper margins around the record sheet.

**Rationale**: Margins ensure content is not cut off during printing.

**Priority**: Medium

**Status**: IMPLEMENTED ✓

#### Scenario: Page margins

- **WHEN** SVG template is loaded
- **THEN** expand viewBox to add 18pt margins on all sides
- **AND** center original content within new dimensions
- **AND** final dimensions match US Letter (612×792 points)

---

### Requirement: Copyright Footer

The system SHALL display copyright information at the bottom of the record sheet.

**Rationale**: Legal requirement for BattleTech content.

**Priority**: Medium

**Status**: IMPLEMENTED ✓

#### Scenario: Copyright display

- **WHEN** record sheet renders
- **THEN** replace %d placeholder with current year
- **AND** use Eurostile bold font at 7.5px
- **AND** position footer centered at bottom with margin space

### Requirement: Paper Size Selection

The system SHALL support both US Letter and A4 paper sizes for record sheet export.

**Rationale**: International users require A4 format; mm-data provides both template sets.

**Priority**: Medium

#### Scenario: Paper size setting

- **WHEN** user opens Settings > Export > Record Sheet Paper Size
- **THEN** options SHALL include "US Letter (8.5×11)" and "A4 (210×297mm)"
- **AND** selection persists to local storage

#### Scenario: Template directory selection

- **GIVEN** user has selected paper size preference
- **WHEN** record sheet template loads
- **THEN** load from `templates_us/` for US Letter
- **OR** load from `templates_iso/` for A4

### Requirement: ArmorPipLayout Algorithm

The system SHALL use the ArmorPipLayout algorithm to dynamically generate armor and structure pips within defined bounding rectangles.

**Rationale**: Port of MegaMekLab's proven algorithm ensures accurate pip positioning matching official record sheets.

**Priority**: Critical

#### Scenario: Dynamic pip generation from bounding rects

- **GIVEN** an SVG group containing one or more `<rect>` elements
- **WHEN** `ArmorPipLayout.addPips(svgDoc, group, pipCount)` is called
- **THEN** generate `pipCount` circle elements within the bounding rectangle area
- **AND** pips are distributed evenly across rows
- **AND** pip size is calculated from average rect height
- **AND** pips are appended as children of the group element

#### Scenario: Multi-section pip layout

- **GIVEN** a group with `style="mml-multisection:true"` attribute
- **WHEN** pips are generated
- **THEN** distribute pips proportionally across child groups based on area
- **AND** each child group receives appropriate share of total pips

#### Scenario: Gap handling in pip regions

- **GIVEN** a rect element with `style="mml-gap:left,right"` attribute
- **WHEN** pips are generated for that row
- **THEN** exclude the gap region from pip placement
- **AND** split row into left and right sections around gap

### Requirement: Text Label ID Mappings

The system SHALL map location abbreviations to template text element IDs for all mech configurations.

**Rationale**: Enables displaying armor/structure point values next to each location in the template.

**Priority**: High

#### Scenario: Armor text ID resolution

- **GIVEN** location abbreviation and mech type
- **WHEN** rendering armor values
- **THEN** resolve text element ID using ARMOR_TEXT_IDS mapping:
  - Biped: HD, CT, CTR, LT, LTR, RT, RTR, LA, RA, LL, RL → textArmor\_\*
  - Quad: FLL, FRL, RLL, RRL → textArmor\_\*
  - Tripod: CL → textArmor_CL

#### Scenario: Structure text ID resolution

- **GIVEN** location abbreviation and mech type
- **WHEN** rendering structure values
- **THEN** resolve text element ID using STRUCTURE_TEXT_IDS mapping:
  - All locations map to textIS\_\* format
  - Quad: FLL, FRL, RLL, RRL → textIS\_\*
  - Tripod: CL → textIS_CL

### Requirement: Critical Slot Configuration Awareness

The system SHALL extract critical slot data based on mech configuration type.

**Rationale**: Different mech types have different location sets and slot counts.

**Priority**: Critical

#### Scenario: Quad critical slot extraction

- **GIVEN** a QUAD configuration mech
- **WHEN** extractCriticals is called
- **THEN** include HEAD, CT, LT, RT, FLL, FRL, RLL, RRL locations
- **AND** each leg location has 6 slots with Hip, Upper/Lower Leg Actuator, Foot Actuator

#### Scenario: Tripod critical slot extraction

- **GIVEN** a TRIPOD configuration mech
- **WHEN** extractCriticals is called
- **THEN** include HEAD, CT, LT, RT, LA, RA, LL, RL, CL locations
- **AND** center leg has 6 slots with standard leg actuators

#### Scenario: Slot count by location

- **WHEN** determining slot count for a location
- **THEN** HEAD has 6 slots
- **AND** all torsos have 12 slots
- **AND** all arms have 12 slots
- **AND** all legs (biped, quad, tripod) have 6 slots

### Requirement: Armor Allocation Interface

The system SHALL support armor allocation for all mech configuration types.

**Rationale**: Different configurations have different limb locations requiring allocation support.

**Priority**: Critical

#### Scenario: IArmorAllocation interface completeness

- **WHEN** allocating armor to a mech
- **THEN** interface SHALL include standard locations (head, centerTorso, etc.)
- **AND** interface SHALL include quad locations (frontLeftLeg, frontRightLeg, rearLeftLeg, rearRightLeg)
- **AND** interface SHALL include tripod location (centerLeg)
- **AND** optional locations use TypeScript optional property syntax (?:)

### Requirement: Asset Loading Error Handling

The system SHALL handle missing or failed asset loads gracefully with user feedback.

#### Scenario: Template fetch failure

- **WHEN** template SVG fails to load from CDN
- **THEN** display error message on preview canvas
- **AND** log error to console with path and status code
- **AND** do not crash the application

#### Scenario: Pip SVG fetch failure

- **WHEN** a pip SVG fails to load
- **THEN** log warning to console
- **AND** continue rendering without that location's pips
- **AND** do not block other pip loading

### Requirement: Record Sheet Includes Special Abilities Block

The record sheet export pipeline SHALL include a Special Abilities block
on the printed record sheet when the assigned pilot owns one or more
SPAs.

#### Scenario: Pilot with abilities gets a Special Abilities block

- **GIVEN** a record sheet is generated for a unit whose assigned pilot
  owns `weapon_specialist` with designation "Medium Laser" and
  `iron_man`
- **WHEN** `RecordSheetService` renders the SVG template
- **THEN** a block titled "Special Abilities" SHALL appear below the
  pilot block
- **AND** the block SHALL contain at least two lines — one per owned
  SPA
- **AND** each line SHALL include the displayName and the designation
  in parentheses when present (e.g. "Weapon Specialist (Medium Laser)")
- **AND** each line SHALL include a one-line truncated description from
  the catalog

#### Scenario: Pilot with zero abilities omits the block

- **GIVEN** a record sheet is generated for a unit whose assigned pilot
  has an empty `abilities` array
- **WHEN** `RecordSheetService` renders the SVG template
- **THEN** no Special Abilities block SHALL be emitted
- **AND** the record sheet SHALL NOT reserve vertical space for an
  empty block

#### Scenario: Block never overflows the record sheet

- **GIVEN** a pilot that owns the maximum plausible number of SPAs
  (e.g. 8 abilities on a veteran pilot)
- **WHEN** the record sheet renders
- **THEN** the Special Abilities block SHALL wrap or truncate so that
  no content is drawn past the record sheet's bottom border

### Requirement: Data Extractor for Abilities

The record-sheet data extraction layer SHALL expose an `extractAbilities`
helper that resolves pilot ability ids to canonical definitions via the
SPA catalog.

#### Scenario: Extractor resolves known ids

- **GIVEN** a pilot whose `abilities` array contains two canonical SPA
  ids and one legacy-alias id
- **WHEN** `extractAbilities(unit)` is called
- **THEN** the helper SHALL return three resolved entries, each a
  `{ spa: ISPADefinition, designation?: ISPADesignation }` tuple
- **AND** entries SHALL be grouped by category in the returned list

#### Scenario: Extractor skips unknown ids

- **GIVEN** a pilot whose `abilities` array includes one id unknown to
  the catalog
- **WHEN** `extractAbilities(unit)` is called
- **THEN** the unknown id SHALL be omitted from the returned list
- **AND** no error SHALL be thrown

### Requirement: Discriminated Per-Type Record Sheet Data Model

The `IRecordSheetData` type SHALL be a discriminated union tagged on `unitType`, with one variant per supported unit type: `mech`, `vehicle`, `aerospace`, `battlearmor`, `infantry`, `protomech`.

**Rationale**: Each unit type has fundamentally different armor geometry, movement profile, crew model, and equipment layout. A single flat payload cannot represent all 6 shapes safely. Discriminated unions preserve type safety at the extractor → renderer boundary.

**Priority**: Critical

#### Scenario: Mech variant preserves existing shape

- **GIVEN** an `IBattleMech` passed to `RecordSheetService.extractData`
- **WHEN** the extractor runs
- **THEN** the return value SHALL have `unitType: 'mech'` and the existing mech record-sheet fields (identity, movement, armor per mech location, critical slots, heat sinks)

#### Scenario: Vehicle variant includes motive data

- **GIVEN** an `IVehicleUnit` with motion type Tracked, turret Single
- **WHEN** extracted
- **THEN** the return value SHALL have `unitType: 'vehicle'`, `motionType: 'Tracked'`, armor payload covering 5 locations (Front/LSide/RSide/Rear/Turret), and crew payload with driver + gunner

#### Scenario: Aerospace variant includes SI and fuel

- **GIVEN** an `IAerospaceUnit` (aerospace fighter, 50t)
- **WHEN** extracted
- **THEN** the return value SHALL have `unitType: 'aerospace'`, armor per 4 arcs, `structuralIntegrity`, `fuelPoints`, `safeThrust`, `maxThrust`, and pilot payload

#### Scenario: Unknown unit type rejected

- **GIVEN** a unit with `type: 'warship'`
- **WHEN** extraction is attempted
- **THEN** the service SHALL throw `UnsupportedUnitTypeError` with the unsupported type in the message

---

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

---

### Requirement: Per-Type Extractors

The `RecordSheetService` SHALL route `extractData(unit)` to a type-specific extractor by `unit.type`, each producing the matching variant of `IRecordSheetData`.

**Priority**: Critical

#### Scenario: Vehicle extractor populates crew

- **GIVEN** a 40-ton Hover vehicle with crew configured (driver + gunner)
- **WHEN** `extractVehicleData(unit)` runs
- **THEN** the result's `crew` field SHALL list the driver and gunner with their skills, and the commander field SHALL be absent (no commander on 40t)

#### Scenario: BattleArmor extractor populates per-suit

- **GIVEN** a 5-trooper point with modular weapon mounts
- **WHEN** `extractBattleArmorData(unit)` runs
- **THEN** the result SHALL contain 5 entries in `troopers`, each with the currently-selected modular weapon and AP sidearm

#### Scenario: Infantry extractor populates field gun

- **GIVEN** a 28-trooper platoon with 4 field guns
- **WHEN** `extractInfantryData(unit)` runs
- **THEN** the result SHALL contain a `fieldGun` block with 4 guns, reflecting the 1-gun-per-7-troopers rule

---

### Requirement: SPA Block Positioning Per Type

The Special Abilities SVG section (shipped in Phase 5) SHALL be anchored within each per-type renderer's pilot area, not at a mech-only coordinate.

**Priority**: High

#### Scenario: Vehicle SPA block anchored in crew area

- **GIVEN** a vehicle with a driver who has the Melee Specialist SPA
- **WHEN** the vehicle renderer runs
- **THEN** the Special Abilities block SHALL render within the crew section of the vehicle sheet, not at the mech pilot coordinate (360, 690)

#### Scenario: BattleArmor SPA block per-trooper

- **GIVEN** a point where trooper 1 has Marksman SPA
- **WHEN** the battlearmor renderer runs
- **THEN** the SPA SHALL display next to trooper 1's pilot block, not on a shared sheet footer

---

### Requirement: Snapshot Test Coverage

Every per-type renderer SHALL have at least one Jest snapshot test with a representative fixture, and the snapshot SHALL be committed alongside the renderer.

**Priority**: High

#### Scenario: Snapshot captures geometry regression

- **GIVEN** the vehicle renderer's snapshot test running on a 50t tracked tank fixture
- **WHEN** the armor location geometry changes (e.g., a location is accidentally removed)
- **THEN** the snapshot assertion SHALL fail with a diff showing the missing location

---

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

