# record-sheet-export Specification Delta

## MODIFIED Requirements

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
