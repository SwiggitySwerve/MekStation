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

The system SHALL use SVG templates from MegaMek/MegaMekLab for record sheet generation.

**Rationale**: SVG templates provide authentic MegaMekLab-style record sheets and leverage existing official assets.

**Priority**: Critical

**Status**: IMPLEMENTED ✓

#### Scenario: SVG template loading
- **WHEN** record sheet renders
- **THEN** load base SVG template from `/public/record-sheets/` directory
- **AND** parse SVG DOM for element manipulation
- **AND** locate elements by ID for data injection (e.g., type, tonnage, mpWalk)

#### Scenario: SVG data injection
- **WHEN** template is loaded with unit data
- **THEN** populate text elements via setTextContent() helper
- **AND** populate armor/structure pips via SVG element cloning
- **AND** render critical slots dynamically into designated areas
- **AND** render equipment table into inventory area

#### Scenario: SVG to canvas conversion
- **WHEN** preview or PDF export is requested
- **THEN** serialize modified SVG to string
- **AND** convert to Blob URL for Image loading
- **AND** render Image to canvas with appropriate DPI scaling

---

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

#### Scenario: PDF quality
- **WHEN** PDF is generated
- **THEN** use 20x DPI multiplier for print quality
- **AND** use JPEG format for canvas-to-PDF embedding
- **AND** ensure sharp text and lines at print resolution

---

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

---

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

The system SHALL render armor pips using MegaMek SVG assets.

**Rationale**: Armor diagrams are essential for tracking damage during gameplay.

**Priority**: High

**Status**: IMPLEMENTED ✓

#### Scenario: Armor pip loading
- **WHEN** armor diagram renders
- **THEN** load pip SVG files from `/public/record-sheets/biped_pips/`
- **AND** files follow naming convention `Armor_{Location}_{Count}_Humanoid.svg`
- **AND** rear armor uses `Armor_{Location}_R_{Count}_Humanoid.svg`

#### Scenario: Armor pip positioning
- **WHEN** pip SVGs are loaded
- **THEN** insert pip paths into `canonArmorPips` group
- **AND** DO NOT apply additional transforms to pip groups
- **AND** rely on parent group's matrix transform for positioning

#### Scenario: Armor value display
- **WHEN** armor diagram renders
- **THEN** display armor point values around the mech silhouette in format "( value )"
- **AND** display rear armor values separately for CT, LT, RT locations
- **AND** use SVG text elements with IDs: textArmor_HD, textArmor_CT, textArmor_CTR, etc.

---

### Requirement: Structure Pip Visualization

The system SHALL render internal structure pips using MegaMek SVG assets.

**Rationale**: Structure tracking is essential for determining unit destruction.

**Priority**: High

**Status**: IMPLEMENTED ✓

#### Scenario: Structure pip loading
- **WHEN** structure section renders
- **THEN** load pip SVG files from `/public/record-sheets/biped_pips/`
- **AND** files follow naming convention `BipedIS{Tonnage}_{Location}.svg`

#### Scenario: Structure value display
- **WHEN** structure section renders
- **THEN** display structure point values in format "( value )"
- **AND** use SVG text elements with IDs: textIS_CT, textIS_LT, textIS_RT, etc.

---

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

