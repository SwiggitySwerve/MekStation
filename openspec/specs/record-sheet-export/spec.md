# record-sheet-export Specification

## Purpose

Defines Record Sheet Export requirements for Record Sheet Data Model, SVG Template Rendering, PDF Generation, and Preview Rendering, preserving the source-of-truth scope introduced by archived change add-record-sheet-pdf-export.

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
ProtoMech, infantry, and battle-armor families, rendering SHALL use the
canonical mm-data template path via the shared
`TemplateRecordSheetRenderer` and shared pip engine.

Each family's templated rendering SHALL consume its matching
`IRecordSheetData` variant, select a canonical template, apply text
bindings and dynamic pips, and produce an SVG conforming to the
canonical Total Warfare record-sheet layout for that type. For the
infantry and battle-armor families the renderer SHALL use the per-unit
**block** template (`conventional_infantry_platoon` /
`battle_armor_squad`) and render one unit per page.

The vehicle, aerospace, protomech, infantry, and battle-armor skeleton
renderers SHALL remain available as the runtime fallback and SHALL NOT
be deleted by this change.

**Priority**: Critical

#### Scenario: Renderer dispatch by variant tag

- **GIVEN** an `IInfantryRecordSheetData` or `IBattleArmorRecordSheetData`
  payload
- **WHEN** the top-level `renderer.ts` dispatcher is called
- **THEN** it SHALL route to the templated path for that family,
  falling back to the family skeleton renderer only on template
  failure

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
- **WHEN** the battle-armor unit is rendered through the templated path
- **THEN** the output SVG SHALL be derived from the
  `battle_armor_squad` canonical template and SHALL show 5 distinct
  trooper columns, each with its own armor pip grid laid out from
  template geometry

#### Scenario: Infantry platoon counter and damage row

- **GIVEN** a 28-trooper foot rifle platoon
- **WHEN** the infantry unit is rendered through the templated path
- **THEN** the output SVG SHALL be derived from the
  `conventional_infantry_platoon` canonical template and SHALL show
  the platoon pip grid plus the damage row whose `DAMAGE+j` values
  follow the damage-per-trooper formula

#### Scenario: Infantry and battle-armor asset failure degrades to skeleton

- **GIVEN** an infantry or battle-armor unit whose canonical template
  asset fails to load from local, CDN, and raw sources
- **WHEN** `renderTemplated` runs for that unit
- **THEN** it SHALL catch the failure and return the output of the
  existing `infantryRenderer` / `battleArmorRenderer` skeleton renderer

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


### Requirement: Infantry and Battle Armor Record Sheet Adapters

The system SHALL provide one adapter folder per Wave-2 family
(`infantry/`, `battlearmor/`) under
`src/services/printing/svgRecordSheetRenderer/`, each containing two
pure modules: `selectTemplate.ts` and `bindings.ts`, mirroring the
Wave-1 per-family adapters.

`selectTemplate.ts` SHALL be a pure function mapping a unit to a
`templateKey` string. For the single-unit MVP it SHALL return the
**per-unit block** template key — `conventional_infantry_platoon` for
an infantry platoon and `battle_armor_squad` for a Battle Armor squad
— and SHALL NOT return the multi-slot outer sheet key
(`conventional_infantry_default` / `battle_armor_default`).

`bindings.ts` SHALL be a pure function mapping the unit's
`IRecordSheetData` variant (`IInfantryRecordSheetData` /
`IBattleArmorRecordSheetData`) to a `{ texts, pips }` structure keyed
against the template's real element IDs, including a typed per-family
`PipCounts` contract computed from unit stats.

Neither adapter module SHALL perform I/O, DOM access, or asset
loading — they SHALL be deterministic pure functions.

**Priority**: Critical

#### Scenario: Infantry template key selects the per-unit platoon block

- **GIVEN** a conventional infantry platoon
- **WHEN** the infantry `selectTemplate` runs
- **THEN** it SHALL return the key `conventional_infantry_platoon`, the
  per-unit block template, NOT the multi-slot
  `conventional_infantry_default` outer sheet

#### Scenario: Battle Armor template key selects the per-unit squad block

- **GIVEN** a Battle Armor squad
- **WHEN** the battlearmor `selectTemplate` runs
- **THEN** it SHALL return the key `battle_armor_squad`, the per-unit
  block template, NOT the multi-slot `battle_armor_default` outer sheet

#### Scenario: Battle Armor bindings produce a typed PipCounts contract

- **GIVEN** a Battle Armor `IRecordSheetData` with a per-trooper armor
  pip count for each suit in the squad
- **WHEN** the battlearmor `bindings` function runs
- **THEN** the returned `pips` SHALL include a typed `PipCounts`
  structure whose per-trooper counts equal each trooper's actual armor
  pip value

#### Scenario: Infantry bindings produce a typed PipCounts contract

- **GIVEN** an infantry `IRecordSheetData` with a platoon size
- **WHEN** the infantry `bindings` function runs
- **THEN** the returned `pips` SHALL include a typed `PipCounts`
  structure whose platoon pip-grid count equals the platoon's actual
  trooper count

#### Scenario: Adapters are pure functions

- **GIVEN** the `infantry/` and `battlearmor/` adapter modules
- **WHEN** `selectTemplate` or `bindings` is invoked
- **THEN** it SHALL perform no fetch, no DOM access, and no asset
  loading, and SHALL return a deterministic result for a given input

---

### Requirement: Battle Armor Per-Trooper Pip Grid

The shared pip engine SHALL support a Battle Armor per-trooper pip
grid: a layout that places one armor pip cluster per trooper column
across the 4–6 trooper columns of a Battle Armor squad, each cluster
sized to that trooper's per-suit armor pip count.

This is an extension of the Wave-1 pip engine, not a modification of
its existing per-location pip layout. The existing per-location pip
layout used by the mech and Wave-1 families SHALL be unchanged.

**Priority**: Critical

#### Scenario: Per-trooper pip clusters laid out per column

- **GIVEN** a 5-trooper Battle Armor squad with a per-suit armor pip
  count and a template exposing 5 trooper-column pip regions
- **WHEN** the Battle Armor per-trooper pip grid lays out the squad
- **THEN** it SHALL emit one pip cluster per trooper column, and each
  cluster SHALL contain exactly that trooper's per-suit armor pip
  count

#### Scenario: Trooper-count range

- **GIVEN** a Battle Armor squad with a trooper count between 4 and 6
- **WHEN** the per-trooper pip grid lays out the squad
- **THEN** it SHALL lay out exactly one pip cluster per trooper present
  and SHALL leave unused trooper-column regions empty

#### Scenario: Existing per-location pip layout unchanged

- **GIVEN** the Wave-1 mech and vehicle / aerospace / protomech pip
  layout
- **WHEN** the Battle Armor per-trooper pip-grid helper is added to the
  pip engine
- **THEN** the existing per-location pip layout SHALL be unchanged and
  the Wave-1 pip-count fidelity tests SHALL still pass

---

### Requirement: Infantry Damage-Per-Trooper Formula

The infantry record sheet SHALL compute its damage row from a verbatim
reproduction of MegaMek's `Infantry.getDamagePerTrooper()` formula
(MegaMek `Infantry.java`). The reproduction SHALL be a deterministic
calculation of damage per trooper from the platoon's primary and
secondary weapon damage values and trooper composition.

The formula SHALL apply the documented primary-weapon damage cap of
`0.6` (MegaMek `INFANTRY_PRIMARY_WEAPON_DAMAGE_CAP`, per the 09/2021
errata) to the primary weapon's contribution.

The record sheet SHALL render a damage row where, for each trooper
count `j` in the range `1..30`, the value `DAMAGE+j` equals
`round(perTrooper × j)`, where `perTrooper` is the result of the
formula.

**Priority**: Critical

#### Scenario: Damage per trooper reproduces the MegaMek formula

- **GIVEN** an infantry platoon with a known primary weapon, secondary
  weapons, and trooper composition
- **WHEN** the damage-per-trooper value is computed
- **THEN** it SHALL equal the value produced by a verbatim
  reproduction of MegaMek `Infantry.getDamagePerTrooper()` for the same
  inputs

#### Scenario: Primary-weapon damage cap is applied

- **GIVEN** an infantry platoon whose primary weapon's per-trooper
  damage exceeds `0.6`
- **WHEN** the damage-per-trooper value is computed
- **THEN** the primary weapon's contribution SHALL be capped at `0.6`,
  matching MegaMek `INFANTRY_PRIMARY_WEAPON_DAMAGE_CAP`

#### Scenario: Damage row spans trooper counts 1 to 30

- **GIVEN** a rendered infantry record sheet with a computed
  per-trooper damage value
- **WHEN** the damage row is produced
- **THEN** for each trooper count `j` in `1..30` the `DAMAGE+j` value
  SHALL equal `round(perTrooper × j)`

---

### Requirement: Wave-2 Pip-Count Fidelity Gate

Each Wave-2 family adapter SHALL have a test that parses the rendered
output SVG and asserts the count of pip elements matches the unit's
actual statistics — per trooper column for Battle Armor and per
platoon block for infantry.

**Priority**: Critical

#### Scenario: Battle Armor pip count matches per-trooper armor stats

- **GIVEN** a Battle Armor fixture with a known per-trooper armor pip
  count for each suit
- **WHEN** the squad is rendered through the templated path and the
  output SVG is parsed
- **THEN** the pip-element count for each trooper column SHALL equal
  that trooper's armor pip value from the fixture

#### Scenario: Infantry pip count matches platoon size

- **GIVEN** an infantry fixture with a known platoon trooper count
- **WHEN** the platoon is rendered through the templated path and the
  output SVG is parsed
- **THEN** the platoon pip-grid element count SHALL equal the
  fixture's trooper count

#### Scenario: Wrong fixture fails the fidelity assertion

- **GIVEN** a Wave-2 fixture deliberately stated with an incorrect pip
  count
- **WHEN** the pip-count fidelity test runs against the rendered SVG
- **THEN** the assertion SHALL fail, proving the gate detects
  pip-count drift

---

### Requirement: Templated-Path Exercise Guard

The system SHALL have a test that asserts the canonical template path
is actually exercised for the infantry and battle-armor families, so a
silently broken template path that falls back to the skeleton renderer
cannot pass unnoticed.

The guard SHALL assert that `isTemplatedUnit()` returns `true` for
both `infantry` and `battlearmor` payloads, AND that the SVG produced
for each family through `renderTemplated` is template-derived — it
SHALL carry a marker that only the canonical-template path produces
and that the skeleton renderer's output does not.

**Priority**: Critical

#### Scenario: isTemplatedUnit recognizes the Wave-2 families

- **GIVEN** an `IInfantryRecordSheetData` payload and an
  `IBattleArmorRecordSheetData` payload
- **WHEN** `isTemplatedUnit()` is called on each
- **THEN** it SHALL return `true` for both, the inverse of the Wave-1
  exclusion behaviour

#### Scenario: Rendered SVG is template-derived, not skeleton output

- **GIVEN** an infantry unit and a battle-armor unit with reachable
  canonical template assets
- **WHEN** each is rendered through `renderTemplated`
- **THEN** the output SVG SHALL carry a canonical-template marker
  absent from the corresponding skeleton renderer's output, proving
  the template path — not the fallback — produced it

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
