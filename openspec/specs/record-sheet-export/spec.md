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

**Status**: IMPLEMENTED ✓

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
  - Biped: HD, CT, CTR, LT, LTR, RT, RTR, LA, RA, LL, RL → textArmor_*
  - Quad: FLL, FRL, RLL, RRL → textArmor_*
  - Tripod: CL → textArmor_CL

#### Scenario: Structure text ID resolution
- **GIVEN** location abbreviation and mech type
- **WHEN** rendering structure values
- **THEN** resolve text element ID using STRUCTURE_TEXT_IDS mapping:
  - All locations map to textIS_* format
  - Quad: FLL, FRL, RLL, RRL → textIS_*
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

