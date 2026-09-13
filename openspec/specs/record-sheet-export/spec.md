# record-sheet-export Specification

## Purpose

Defines Record Sheet Export requirements for Record Sheet Data Model, SVG Template Rendering, PDF Generation, and Preview Rendering, preserving the source-of-truth scope introduced by archived change add-record-sheet-pdf-export.

Executable printing and preview code is the authority for current behavior. SHALL statements remain desired requirements unless a scenario names current source behavior. Explicit deferrals are not shipped.

## Current behavior and evidence limits

The shared scalable viewer covers BattleMech, vehicle, aerospace, Battle Armor, ProtoMech, and Infantry customizers. BattleMech `PreviewTab` reads `useUnitStore`; other families mount per-type previews through `PreviewTabForType` and the customizer registry. Toolbar Download PDF and Print call `exportUnitRecordSheetPDF` and `printUnitRecordSheet` in `RecordSheetCanvasPreview`.

Source and test references describe code contracts only. They do not prove browser behavior, installed-font rendering, or production output.

Record-sheet markup requests `Eurostile` (with Century Gothic, Trebuchet MS, and Arial fallbacks) and `Times New Roman, Times, serif`. Rasterization and print await `document.fonts.ready` when available. Full-font MegaMekLab visual matching remains desired rather than proven.

Templates resolve through `MmDataAssetService.loadSVG` in local, jsDelivr CDN, then GitHub raw order. The mech renderer wraps the shared template renderer; both use that chain. Biped premade armor and structure pips instead fetch `/record-sheets/biped_pips/` directly and do not use the fallback chain.

## Requirements
### Requirement: Record Sheet Data Model

The system SHALL define data structures for record sheet generation.

**Rationale**: Typed interfaces ensure correct data mapping from unit configuration to printable format.

**Priority**: Critical

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

The system SHALL use configuration-specific SVG templates from mm-data assets for all mech types.

Templates SHALL resolve through `MmDataAssetService.loadSVG` (local bundled path, then jsDelivr CDN, then GitHub raw). For a supported non-mech templated family, a template-path failure is first caught by `renderTemplated` and returned through that family's skeleton renderer; a rendering failure that escapes any applicable fallback is surfaced to the preview canvas rather than crashing the customizer.

#### Scenario: Template loading from bundled path with CDN fallback

- **WHEN** a record sheet template loads for a unit
- **THEN** request `/record-sheets/templates_us/` (or `templates_iso/` for A4) through `MmDataAssetService.loadSVG`
- **AND** the local public path is attempted first; CDN and GitHub raw are fallbacks, not the only source
- **AND** a failure that escapes any applicable renderer fallback is logged with `logger` (not `console`) and drawn as the preview render-error sheet
- **AND** a supported non-mech template failure is first caught by `renderTemplated` and returns that family's skeleton output before preview error handling

#### Scenario: Configuration-specific template loading

- **WHEN** record sheet renders for a unit
- **THEN** load template based on unit's MechConfiguration:
  - BIPED → `mek_biped_default.svg`
  - QUAD → `mek_quad_default.svg`
  - TRIPOD → `mek_tripod_default.svg`
  - LAM → `mek_lam_default.svg`
  - QUADVEE → `mek_quadvee_default.svg`

### Requirement: PDF Generation

The system SHALL generate PDF record sheets client-side using jsPDF from the same filled SVG used for preview and print.

Preview and PDF rasterization SHALL use the bounded 4x lossless path described below.

**Rationale**: Client-side generation works offline and is portable to Electron. A bounded lossless raster keeps line art sharp without an unshippable buffer.

**Priority**: Critical

#### Scenario: Export PDF

- **WHEN** the user activates Download PDF
- **THEN** generate a PDF document from the shared filled SVG
- **AND** trigger a browser download with filename "{chassis}-{model}.pdf"
- **AND** the file is nonempty and begins with the PDF header
- **AND** the PDF page is the requested Letter (612×792 pt) or A4 (approximately 595.28×841.89 pt) size

#### Scenario: PDF content

- **GIVEN** a valid unit configuration
- **WHEN** PDF is generated
- **THEN** the PDF contains the rendered SVG with:
  - Unit header with name, tonnage, tech base, BV
  - Movement block with Walk/Run/Jump MP
  - Armor diagram with pip visualization
  - Internal structure values per location
  - Weapons and equipment table
  - Heat sink count and type
  - Critical hit tables for each location
  - Pilot data section (blank for tabletop)
- **AND** critical tables remain inside their template rectangles, preserve every slot and grouping, and stay readable at print size

#### Scenario: PDF BV calculation

- **WHEN** BattleMech PDF export is initiated from the customizer Preview tab
- **THEN** BV is calculated using `getCalculationService().calculateBattleValue()` on the projected `IEditableMech`
- **AND** BV is included in `unitConfig` passed to `RecordSheetService.extractData`
- **AND** BV appears in the header section of the exported PDF
- **AND** non-mech customizer preview tabs do not call `CalculationService.calculateBattleValue`; they export the BV already present on the extracted record-sheet payload

#### Scenario: PDF quality and paper geometry

- **WHEN** PDF is generated
- **THEN** rasterize the shared SVG at a bounded 4x DPI multiplier using the requested `PAPER_DIMENSIONS` and the SVG viewBox
- **AND** BattleMech `addDocumentMargins` expands that template's own content box into the selected paper (Letter 612×792 pt from 576×756, A4 595×842 pt from 559×806) rather than forcing Letter onto ISO templates
- **AND** `renderToCanvasHighDPI` fits the SVG viewBox into paper with `fitRect` (no stretch); after mech margins the viewBox is already paper-sized
- **AND** non-mech templated rendering currently skips `addDocumentMargins`; letterbox-free paper expansion for those families remains desired
- **AND** embed the raster as lossless PNG through the existing jsPDF API with FAST compression
- **AND** object URLs created for the raster are revoked on success and on error (`URL.revokeObjectURL` in a `finally`)
- **AND** the PDF page uses the jsPDF Letter or A4 format: Letter 612×792 pt and A4 approximately 595.28×841.89 pt; the raster and image-placement dimensions remain the application paper constants of 612×792 and 595×842

#### Scenario: Export uses the click snapshot

- **GIVEN** Download PDF has started for a unit and paper size
- **WHEN** the user switches unit or paper before the download finishes
- **THEN** the PDF is generated from that original unit and paper snapshot
- **AND** completing the download SHALL NOT change the active preview selection

#### Scenario: Export busy and failure recovery

- **WHEN** export is in progress or fails
- **THEN** the toolbar exposes a recoverable busy or error state
- **AND** a second Download PDF while busy does not start a duplicate in-flight export
- **AND** a later retry can produce a valid PDF

### Requirement: Preview Rendering

The system SHALL render a live preview of the record sheet in the browser from the same filled SVG used for PDF export and print.

**Rationale**: Users need to see the current unit at the current paper size without a 20x canvas or stale renders.

**Priority**: High

#### Scenario: Preview display

- **WHEN** a customizer Preview tab is active
- **THEN** the preview renders the current unit via `RecordSheetService.renderPreview` from the shared filled SVG
- **AND** preview updates when unit configuration changes
- **AND** the visible canvas maintains the aspect ratio of the selected paper size (Letter 612:792, A4 595:842)
- **AND** A4 preview is not a Letter viewBox letterboxed into A4 CSS
- **AND** the document does not overflow the viewport horizontally

#### Scenario: Preview DPI and quality

- **WHEN** preview canvas renders
- **THEN** use a bounded 4x DPI multiplier
- **AND** size the raster to the requested paper dimensions rather than a hardcoded Letter canvas
- **AND** the backing canvas is 2448×3168 for Letter and 2380×3368 for A4 after render
- **AND** support displayed zoom from 20% to 300%
- **AND** object URLs created for the raster are revoked on success and on error

#### Scenario: Preview BV calculation

- **WHEN** a BattleMech record sheet preview renders
- **THEN** BV is calculated using `getCalculationService().calculateBattleValue()`
- **AND** BV is passed on `unitConfig` for template population
- **AND** BV updates reactively when unit configuration changes
- **AND** non-mech previews SHALL display the extracted payload BV and SHALL NOT call the BattleMech calculation service

#### Scenario: Last requested unit and paper own the preview

- **GIVEN** multiple unit tabs are open or paper size changes while a preview render is in flight
- **WHEN** the user switches unit or paper size
- **THEN** only the last requested unit and paper combination is committed to the preview canvas
- **AND** all displayed values match that unit
- **AND** no stale preview from an earlier unit or paper size remains
- **AND** zoom-only changes do not regenerate the sheet
- **AND** this last-request rule applies to preview commits, not to an in-flight Download PDF or Print snapshot taken at click

#### Scenario: Readable critical tables

- **WHEN** preview or PDF renders critical tables
- **THEN** every slot stays inside the template `crits_*` rectangle
- **AND** slot order, empty and Roll Again entries, hittable versus unhittable styling, system-component non-grouping, copy identity, and multi-slot grouping including the 6/7 boundary are preserved
- **AND** names remain readable without clipped overlap or extreme font shrink

#### Scenario: Async busy and error recovery

- **WHEN** a preview render fails
- **THEN** the canvas draws an explicit render-error sheet
- **AND** selecting a unit or paper again retries by rendering that request
- **AND** the preview does not provide a dedicated Retry control and SHALL NOT automatically suppress the error placeholder
- **WHEN** a later preview request supersedes an in-flight render
- **THEN** the stale request SHALL NOT overwrite the current canvas
- **AND** unmount does not commit into a disposed canvas
- **AND** the toolbar Print and Download PDF controls keep their explicit busy and retry states


#### Scenario: Infantry shares scalable and staged preview behavior

- **GIVEN** an Infantry unit displayed in its own customizer store context
- **WHEN** the user adjusts zoom, changes paper, or switches the active unit while rendering
- **THEN** the shared manual and fit controls SHALL govern the displayed scale
- **AND** rendering SHALL use a staging canvas and only the latest request may commit to the visible canvas
- **AND** an older successful or failed render SHALL NOT overwrite the current unit
- **AND** print and export SHALL continue to use the Infantry data extractor without requiring a BattleMech store

### Requirement: Zoom Controls

The system SHALL provide zoom controls in the preview area with Current zoom output, Zoom in, Zoom out, Fit Width, and Fit Page.

**Rationale**: Users need durable manual zoom and explicit fit modes that do not fight each other on resize.

**Priority**: High

#### Scenario: Zoom control display

- **WHEN** preview is displayed
- **THEN** show zoom controls labeled Current zoom, Zoom in, Zoom out, Fit Width, and Fit Page
- **AND** Current zoom reports the displayed percentage

#### Scenario: Zoom in/out

- **WHEN** the user activates Zoom in
- **THEN** increase zoom by 15 percentage points
- **AND** cap at maximum 300%
- **AND** the mode becomes manual

- **WHEN** the user activates Zoom out
- **THEN** decrease zoom by 15 percentage points
- **AND** cap at minimum 20%
- **AND** the mode becomes manual

#### Scenario: Manual zoom survives resize and render

- **GIVEN** the user has chosen a manual zoom between 20% and 300%
- **WHEN** the preview container resizes, the sheet re-renders, the unit changes, or paper size changes
- **THEN** after layout settlement the manual zoom percentage remains
- **AND** only the selected paper's aspect is applied at that zoom
- **AND** ResizeObserver SHALL NOT recompute a fit mode

#### Scenario: Fit Width

- **WHEN** the user activates Fit Width
- **THEN** calculate scale to fit container width, clamped to 20–300%
- **AND** the canvas CSS width matches the visible scroll viewport content width, capped at 3× paper width, within 2px
- **AND** while Fit Width remains selected, resize recomputes that width fit to the same CSS-width contract
- **AND** a later Zoom in or Zoom out ends Fit Width tracking and keeps the new manual zoom across resize

#### Scenario: Fit Page

- **WHEN** the user activates Fit Page, or preview first opens
- **THEN** calculate scale to fit the container while preserving paper aspect, clamped to 20–300%
- **AND** while Fit Page remains selected, resize recomputes only Fit Page
- **AND** explicit fit modes SHALL NOT recompute a mode the user did not select

### Requirement: Print Functionality

The system SHALL support browser print of the record sheet from the same filled SVG used for preview and PDF, and SHALL reserve the print popup before any async wait.

**Rationale**: Popup blockers discard windows opened after `await`. Print uses the unit and paper snapshot from the click.

**Priority**: Medium

#### Scenario: Print action

- **WHEN** the user activates Print
- **THEN** open the browser print popup synchronously before the first await
- **AND** print content is the shared filled SVG for the unit and paper snapshot taken at click, inlined in the reserved browser window
- **AND** a later preview unit or paper change does not alter that print or the active selection
- **AND** the owned window is not closed before print can consume the page

#### Scenario: Print blocked or failed

- **WHEN** the popup is blocked or sheet generation or print-window preparation fails
- **THEN** the toolbar exposes a recoverable error
- **AND** an owned failed window is closed
- **AND** a later Print retry may succeed
- **AND** the legacy canvas print API remains callable

#### Scenario: Inline SVG print geometry and lifetime

- **GIVEN** the shared SVG is prepared for printing
- **WHEN** its root has no valid viewBox
- **THEN** derive a root viewBox from its intrinsic dimensions so it scales to the selected paper
- **AND** preserve existing valid viewBoxes, including negative-margin origins
- **AND** page sizing targets only the root SVG, preserving nested artwork dimensions
- **AND** the owned print window closes after the afterprint event, or during failure cleanup

### Requirement: Armor Pip Visualization

The system SHALL render armor pips using local mm-data pip SVGs for biped mechs, and `ArmorPipLayout` (via `layoutPipsInGroup`) for other configurations.

Biped premade pip files are fetched from `/record-sheets/biped_pips/`. That path is not the `MmDataAssetService` three-source chain. Full pip-asset presence is not proven by this specification.

#### Scenario: Biped armor pip loading from local pip assets

- **WHEN** armor diagram renders for BIPED configuration
- **THEN** fetch pip SVGs from `/record-sheets/biped_pips/Armor_<Location>_<Count>_Humanoid.svg`
- **AND** extract `path` elements from the pip SVG
- **AND** insert paths into the template's `canonArmorPips` group (falling back to `armorPips`)
- **AND** parent group transform handles positioning (no extra location-group transform)
- **AND** a missing pip file is logged with `logger.warn` and does not block other locations

#### Scenario: Non-biped armor pip generation

- **WHEN** armor diagram renders for QUAD or TRIPOD configuration
- **THEN** use `ArmorPipLayout.addPips` through `layoutPipsInGroup` against that configuration's pip-group IDs
- **AND** pips are positioned within the template's pip-area rect elements
- **AND** LAM and QUADVEE currently take the same dynamic path but resolve pip-group IDs through the biped map; dedicated LAM/QUADVEE group maps remain a desired repair, not current source behavior

### Requirement: Structure Pip Visualization

The system SHALL render internal structure pips using local mm-data pip SVGs for biped mechs, and `ArmorPipLayout` for other configurations.

#### Scenario: Biped structure pip loading from local pip assets

- **GIVEN** a BIPED mech with specific tonnage
- **WHEN** structure section renders
- **THEN** fetch pip SVGs from `/record-sheets/biped_pips/BipedIS<Tonnage>_<Location>.svg`
- **AND** insert paths into the template's structure pip group
- **AND** a missing pip file is logged with `logger.warn` and does not block other locations

### Requirement: Equipment Table Rendering

The system SHALL render a weapons and equipment table with combat statistics.

**Rationale**: Equipment table provides quick reference for weapon ranges and damage during combat.

**Priority**: High

#### Scenario: Equipment columns

- **WHEN** the BattleMech equipment table renders
- **THEN** display abbreviated columns: Qty, Type, Loc, Ht, Dmg, Min, Sht, Med, Lng
- **AND** include damage type codes: [DE]=Direct Energy, [DB]=Direct Ballistic, [M,C,S]=Missile
- **AND** ammunition shows shots remaining in parentheses
- **AND** skeleton non-mech tables omit Heat/Min and use Qty, Type, Loc, Dmg, Sht, Med, Lng

#### Scenario: Equipment table positioning

- **WHEN** the BattleMech equipment table renders
- **THEN** insert rows into the `inventory` element area in the template
- **AND** request CSS family `Eurostile, Arial, sans-serif` (full Eurostile webfont is not bundled)
- **AND** truncate long equipment names to fit column width

---

### Requirement: Critical Slots Rendering

The system SHALL render critical hit tables for each location matching MegaMekLab style with precise positioning and typography.

**Rationale**: Critical slots track equipment placement and damage during gameplay. Exact visual match with MegaMekLab ensures consistent user experience.

**Priority**: High

#### Scenario: Critical slot display

- **WHEN** critical slots section renders
- **THEN** render into `crits_*` rect elements in template
- **AND** display location name label above the rect boundary
- **AND** show slot numbers 1-6 (restarting for 12-slot locations)

#### Scenario: Critical table title positioning

- **WHEN** location title renders
- **THEN** position title X at `contentX(rectX)` (`rectX + BAR_WIDTH + BAR_MARGIN + NUMBER_WIDTH`)
- **AND** position title Y at `rectY - HEADER_CLEARANCE` (7px in `criticalTableHelper.ts`)
- **AND** use `text-anchor: start` (left-aligned)
- **AND** request CSS family `Times New Roman, Times, serif` (full Times webfont is not bundled)
- **AND** use bold font weight
- **AND** use font size of `SLOT_FONT_SIZE * 1.25` (8.75px with 7px base)
- **AND** a MegaMekLab 7.5% left indent and `rectY - 4` clearance remain a desired visual-match target if they diverge from these constants

#### Scenario: Critical slot font sizing

- **WHEN** critical slot entries render
- **THEN** start at constant `SLOT_FONT_SIZE` 7px for all locations
- **AND** request CSS family `Times New Roman, Times, serif`
- **AND** `fitCriticalText` MAY shrink to `MIN_SLOT_FONT_SIZE` 6px using the Times-width table without `getBBox`
- **AND** this matches MegaMekLab's `DEFAULT_CRITICAL_SLOT_ENTRY_FONT_SIZE = 7f` as the starting size; sub-7px shrink is source behavior to keep names inside the rect

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
- **THEN** request CSS family `Times New Roman, Times, serif`
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

#### Scenario: Page margins

- **WHEN** a BattleMech SVG template is loaded
- **THEN** `addDocumentMargins` reads the root SVG content dimensions and centers them within the requested paper dimensions
- **AND** US templates expand 576×756 content to 612×792 Letter with 18pt margins
- **AND** ISO templates expand 559×806 content to 595×842 A4 with 18pt margins
- **AND** nested logo viewBoxes SHALL NOT determine page dimensions
- **AND** the footer position follows the selected template geometry
- **AND** the non-mech `renderViaTemplate` path does not currently call `addDocumentMargins`; paper fit for those families is a retained desired requirement, not current templated-path behavior

---

### Requirement: Copyright Footer

The system SHALL display copyright information at the bottom of the record sheet.

**Rationale**: Legal requirement for BattleTech content.

**Priority**: Medium

#### Scenario: Copyright display

- **WHEN** a BattleMech record sheet renders
- **THEN** replace the `%d` placeholder with the current year
- **AND** request Eurostile bold at 7.5px with web-safe fallbacks (full Eurostile webfont is not bundled)
- **AND** position the footer from `footerTranslateForRoot` so it follows selected template geometry

### Requirement: Paper Size Selection

The system SHALL support both US Letter and A4 paper sizes for record sheet export.

**Rationale**: International users require A4 format; mm-data provides both template sets.

**Priority**: Medium

#### Scenario: Paper size setting

- **WHEN** the user opens a customizer Preview tab
- **THEN** its Paper Size control offers US Letter and A4
- **AND** the selected size controls that preview and subsequent PDF and Print actions
- **AND** a newly mounted Preview tab defaults to US Letter; the current implementation does not persist a global paper-size preference

#### Scenario: Template directory selection

- **GIVEN** the user has selected a paper size in the Preview toolbar
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
- **THEN** `IArmorAllocation` in `src/types/construction/ArmorAllocation.ts` SHALL include standard locations (head, centerTorso, and torso rears)
- **AND** it SHALL include quad locations (frontLeftLeg, frontRightLeg, rearLeftLeg, rearRightLeg)
- **AND** it SHALL include the tripod location (centerLeg)
- **AND** current source uses required keys initialized to zero rather than optional `?:` properties

### Requirement: Asset Loading Error Handling

The system SHALL handle missing or failed asset loads gracefully with user feedback.

#### Scenario: Template fetch failure

- **WHEN** template SVG fails to load from local, CDN, and raw sources
- **THEN** a supported non-mech templated family first catches the failure in `renderTemplated` and returns its family skeleton output
- **AND** if no applicable fallback handles the failure, display the render-error sheet on the preview canvas
- **AND** log the failure with `logger` including path and status
- **AND** do not crash the application

#### Scenario: Pip SVG fetch failure

- **WHEN** a biped premade pip SVG fails to load
- **THEN** log a warning with `logger.warn`
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
- **WHEN** `RecordSheetService.extractData` is called with those ability refs
  and the SVG is filled
- **THEN** a block titled "SPECIAL ABILITIES" SHALL appear in the pilot area
- **AND** the block SHALL contain at least two lines — one per owned
  SPA
- **AND** each line SHALL include the displayName and the designation
  in parentheses when present (e.g. "Weapon Specialist (Medium Laser)")
- **AND** each line SHALL include a one-line truncated description from
  the catalog
- **AND** current source builds this via `buildSPASection` / `renderSPASection`
  on the BattleMech template path; templated non-mech bindings do not
  inject the block (skeleton fallbacks do)

#### Scenario: Pilot with zero abilities omits the block

- **GIVEN** a record sheet is generated for a unit whose assigned pilot
  has an empty `abilities` array
- **WHEN** `buildSPASection` runs
- **THEN** no Special Abilities block SHALL be emitted
- **AND** the record sheet SHALL NOT reserve vertical space for an
  empty block

#### Scenario: Block never overflows the record sheet

- **GIVEN** a pilot that owns the maximum plausible number of SPAs
  (e.g. 8 abilities on a veteran pilot)
- **WHEN** the record sheet renders
- **THEN** the Special Abilities block SHALL wrap or truncate so that
  no content is drawn past the record sheet's bottom border
- **AND** current source implements this no-overflow behavior by capping
  printable entries at `MAX_PRINTABLE_SPA_ENTRIES` (6) and abbreviating the
  rest with a `+N more` footer

### Requirement: Data Extractor for Abilities

The record-sheet data extraction layer SHALL resolve pilot ability ids to
canonical definitions via the SPA catalog. Desired helper name
`extractAbilities` is retained; current source is `buildSPASection` in
`src/services/printing/recordsheet/spaSection.ts`.

#### Scenario: Extractor resolves known ids

- **GIVEN** a pilot whose `abilities` array contains two canonical SPA
  ids and one legacy-alias id
- **WHEN** `buildSPASection(abilities)` is called
- **THEN** the helper SHALL return `ISPASectionData` with resolved
  `ISPASectionEntry` rows in its `entries` field
  (`displayName`, `headline`, `truncatedDescription`, `category`)
- **AND** the returned `entries` SHALL be sorted by category then displayName
- **AND** a `{ spa: ISPADefinition, designation?: ISPADesignation }` tuple
  return shape remains a desired type-level contract, not current source

#### Scenario: Extractor skips unknown ids

- **GIVEN** a pilot whose `abilities` array includes one id unknown to
  the catalog
- **WHEN** `buildSPASection(abilities)` is called
- **THEN** the unknown id SHALL be omitted from the returned `entries`
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
renderers SHALL remain available as the runtime fallback.

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

The Special Abilities SVG section SHALL be anchored within each per-type
renderer's crew or trooper area, not only at the BattleMech pilot
coordinate.

Current source: BattleMech `renderSPASection` uses (360, 690). Skeleton
vehicle/aerospace/infantry/protomech/battle-armor string renderers pass a
per-family origin into `buildSPASectionString`. Templated `bindVehicle` /
`bindBattleArmor` / other family bindings do not inject SPA. Per-type SPA
on the templated path is a retained desired requirement and an explicit
product-repair gap.

**Priority**: High

#### Scenario: Vehicle SPA block anchored in crew area

- **GIVEN** a vehicle with a driver who has the Melee Specialist SPA
- **WHEN** the skeleton `vehicleRenderer` runs
- **THEN** the Special Abilities block SHALL render via `buildSPASectionString` at the skeleton crew/footer origin, not at the mech coordinate (360, 690)
- **AND** injecting that block from `bindVehicle` on the templated path remains a desired requirement (current templated bindings omit SPA)

#### Scenario: BattleArmor SPA block per-trooper

- **GIVEN** a point where trooper 1 has Marksman SPA
- **WHEN** the skeleton `battleArmorRenderer` runs
- **THEN** the SPA SHALL display below the trooper armor columns, not on a shared sheet footer
- **AND** per-trooper templated-path SPA placement remains a desired requirement (current `bindBattleArmor` omits SPA)

---

### Requirement: Snapshot Test Coverage

Every per-type renderer SHALL have at least one Jest snapshot test with a representative fixture, and the snapshot SHALL be committed alongside the renderer.

Current source snapshots in `recordSheetSnapshots.test.ts` lock the
skeleton string renderers (`renderVehicleSVG`, `renderAerospaceSVG`,
`renderBattleArmorSVG`, `renderInfantrySVG`, `renderProtoMechSVG`).
Canonical templated-path snapshots remain a desired gate; existing
snapshots are not browser or production proof.

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

The shared renderer SHALL expose instance methods `loadTemplate(path)`,
`applyBindings(texts)`, `applyPips(fills, applicator)`, `mount()`,
`unmount()`, `awaitFontsReady()`, and `getSVGString()`. Rasterization
reuses `renderToCanvasHighDPI`; PDF export remains on `RecordSheetService.exportPDF`.

The mech renderer `SVGRecordSheetRenderer` SHALL be a thin consumer of
`TemplateRecordSheetRenderer`.

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
- **THEN** for each entry it SHALL locate the element via the root subtree
  (`elementById`, mount-safe) and set `textContent`, leaving elements absent from
  the map unchanged

#### Scenario: Mech path is behaviour-preserving after refactor

- **GIVEN** the mech renderer consuming `TemplateRecordSheetRenderer`
- **WHEN** the existing mech record-sheet Jest tests run
- **THEN** they SHALL pin the public `SVGRecordSheetRenderer` surface
- **AND** the refactor SHALL retain a no-output-regression comparison for
  representative mech SVG output
- **AND** those tests are not browser, full-font, or production proof
- **AND** current source evidence includes skeleton renderer snapshots in
  `recordSheetSnapshots.test.ts`; this specification makes no claim that a
  fresh Jest run passed or that canonical templated-path snapshots already
  exist

---

### Requirement: Shared Dynamic Pip Engine

The system SHALL provide a shared pip engine that computes armor and
structure pip positions from a template's `<rect>` region geometry,
generalizing the dynamic layout logic currently in `armor.ts`.

The pip engine SHALL support the `grouped`-layout element-lookup
fallback: when a region's primary element ID is absent, it SHALL retry
with `id + "grouped"`, mirroring MegaMekLab `PrintEntity.java`. It SHALL
expose the alternate-clustering flag from MegaMekLab `ArmorPipLayout.java`
(`clustered` / `groupByFive`) so callers can request clustered pip
placement.

Current source measures region geometry from `<rect>` `x/y/width/height`
via `Bounds.fromRect`. A live off-screen mount (`TemplateRecordSheetRenderer.mount`)
is required only when a caller measures with `getBBox()` or needs
web-font text measurement. Small-unit pip grids layout before mount and
do not use `getBBox()`.

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

#### Scenario: Pip measurement requires a live-mounted SVG only for getBBox

- **GIVEN** a caller that measures region geometry via `getBBox()`
- **WHEN** the pip engine needs those bounds
- **THEN** the SVG SHALL be mounted off-screen first
- **AND** `TemplateRecordSheetRenderer.mount` SHALL perform that mount
- **AND** attribute-based `Bounds.fromRect` layout SHALL still run without a live mount

---

### Requirement: Per-Family Record Sheet Adapters

The system SHALL provide one adapter folder per Wave-1 family
(`vehicle/`, `aerospace/`, `protomech/`) under
`src/services/printing/svgRecordSheetRenderer/`, each containing two
pure modules: `selectTemplate.ts` and `bindings.ts`.

`selectTemplate.ts` SHALL be a pure function mapping a unit to a
`templateKey` string. Wave-1 vehicle keys follow `{subtype}_{turret}_standard`
for Tracked / Wheeled / Hover / VTOL only; Naval / Submarine / WiGE / Rail
throw and are out of templated scope. `bindings.ts` SHALL be a pure function mapping
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

The skeleton renderers SHALL remain available as the runtime fallback.

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
- **WHEN** the user activates Download PDF
- **THEN** `exportUnitRecordSheetPDF` SHALL call `RecordSheetService.exportPDF`
  with data extracted from that unit
- **AND** `exportPDF` SHALL render through the templated path, with skeleton fallback on failure

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
(`conventional_infantry_default` / `battle_armor_default`). Those
composite outer sheets are an explicit deferral.

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
  structure whose per-trooper `armorPips` values equal each trooper's
  actual armor; the pip grid then draws `armorPips + 1`

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
across the 4–6 trooper columns of a Battle Armor squad. Each cluster
SHALL render `armorPips + 1` circles (MegaMek trooper pip plus armor).

This is an extension of the Wave-1 pip engine, not a modification of
its existing per-location pip layout. The existing per-location pip
layout used by the mech and Wave-1 families SHALL be unchanged.

**Priority**: Critical

#### Scenario: Per-trooper pip clusters laid out per column

- **GIVEN** a 5-trooper Battle Armor squad with a per-suit armor pip
  count and a template exposing 5 trooper-column pip regions
- **WHEN** the Battle Armor per-trooper pip grid lays out the squad
- **THEN** it SHALL emit one pip cluster per trooper column
- **AND** each cluster SHALL contain `armorPips + 1` pip elements,
  matching MegaMek `PrintBattleArmor` (`getOArmor(trooper) + 1`)
- **AND** the Wave-2 fidelity gate SHALL assert that rendered per-column
  count, not the armor-only count

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
  that trooper's `armorPips + 1` rendered count from the fixture

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
- **THEN** it SHALL return `true` for both
- **AND** it SHALL also return `true` for `vehicle`, `aerospace`, and
  `protomech`, and `false` for `mech`

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

This requirement covers the customizer-to-service call seam. Preview, PDF, and
Print share the filled SVG pipeline defined by this specification, with typed
extractors and the selected paper size.

**Rationale**: Each customizer unit family must reach its matching extractor and
renderer through the visible preview, export, and print controls.

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
- **THEN** the per-type preview SHALL call `exportUnitRecordSheetPDF`
  with the unit object (which calls `RecordSheetService.extractData` then
  `exportPDF`)
- **AND** the generated PDF SHALL be the record sheet for that unit's type

#### Scenario: Dispatch resolves to the correct non-mech kind

- **GIVEN** a per-type preview component for vehicle / aerospace / battlearmor /
  infantry / protomech
- **WHEN** the built unit object is passed to `dispatchTargetFromUnit`
- **THEN** the resolved dispatch kind SHALL equal the customizer's unit type
- **AND** `extractData` SHALL NOT throw `UnsupportedUnitTypeError`

### Requirement: Record Sheet Preview Component Is Unit-Type Aware

The record-sheet preview dispatch boundary SHALL be unit-type aware. A
`RecordSheetPreviewForType` dispatcher, or the descriptor registry's per-type
preview components, SHALL select the preview for the active unit family. Each
non-mech preview SHALL read only its matching per-type store. The concrete
BattleMech `RecordSheetPreview` component is permitted to read the BattleMech
store because it is mounted only inside that store context.

**Rationale**: Store selection must follow the active unit family to avoid missing
providers and incorrectly rendered construction data.

**Priority**: High

#### Scenario: Preview canvas reads the matching non-mech store

- **GIVEN** a non-mech customizer
- **WHEN** the record-sheet preview canvas renders
- **THEN** it SHALL read state from that unit type's store context
- **AND** it SHALL NOT call `useUnitStore`
- **AND** rendering SHALL NOT throw a missing-provider error

#### Scenario: BattleMech preview uses its own store

- **GIVEN** the BattleMech customizer
- **WHEN** the record-sheet preview canvas renders
- **THEN** it SHALL render the BattleMech preview from its BattleMech store
- **AND** SHALL apply the shared paper, zoom, current-request, and rendering contracts
