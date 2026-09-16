## MODIFIED Requirements

### Requirement: PDF Generation

The system SHALL generate PDF record sheets client-side using jsPDF from the same filled SVG used for preview and print.

This requirement supersedes the canonical 20x DPI multiplier and JPEG canvas-to-PDF embedding contracts. Those contracts produce a 12240×15840 canvas (~193 million pixels, ~775MB RGBA) and are not permitted.

**Rationale**: Client-side generation works offline and is portable to Electron. A bounded lossless raster keeps line art sharp without an unshippable buffer.

**Priority**: Critical

#### Scenario: Export PDF

- **WHEN** the user activates Download PDF
- **THEN** generate a PDF document from the shared filled SVG
- **AND** trigger a browser download with filename "{chassis}-{model}.pdf"
- **AND** the file is nonempty and begins with the PDF header
- **AND** the PDF page is the requested Letter (612×792 pt) or A4 (595×842 pt) size

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

- **WHEN** PDF export is initiated
- **THEN** BV is calculated using CalculationService.calculateBattleValue()
- **AND** BV is included in unitConfig passed to RecordSheetService
- **AND** BV appears in the header section of the exported PDF

#### Scenario: PDF quality and paper geometry

- **WHEN** PDF is generated
- **THEN** rasterize the shared SVG at a bounded 4x DPI multiplier using the requested `PAPER_DIMENSIONS` and the SVG viewBox
- **AND** document margins expand that template's own content box into the selected paper (Letter 612×792 pt from 576×756, A4 595×842 pt from 559×806) rather than forcing Letter onto ISO templates
- **AND** do not stretch, crop, or letterbox the sheet onto a different paper aspect
- **AND** embed the raster as lossless PNG through the existing jsPDF API with FAST compression
- **AND** object URLs created for the raster are revoked on success and on error
- **AND** Letter uses 612×792 pt and A4 uses 595×842 pt

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

- **WHEN** PreviewTab is active
- **THEN** the preview renders the current unit via the shared SVG template pipeline
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

- **WHEN** record sheet preview renders
- **THEN** BV is calculated using CalculationService.calculateBattleValue()
- **AND** BV is passed to unitConfig for template population
- **AND** BV updates reactively when unit configuration changes

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
