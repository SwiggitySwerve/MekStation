## Why

Canonical `record-sheet-export` still requires a 20x canvas raster and JPEG embedding. That contract produces a 12240×15840 preview/PDF canvas (~193 million pixels, ~775MB one RGBA buffer), so the live Preview tab, zoom, paper switching, print, and download are not viable. Resize observers also overwrite manual zoom, A4 is drawn at Letter geometry, object URLs are not released, and print popups open after the first async wait.

## What Changes

- Build one SVG for preview, PDF export, and print instead of repeating fill/raster pipelines.
- **BREAKING** (spec contract): supersede the canonical 20x DPI and JPEG embedding requirements with a bounded 4x raster and lossless PNG embedding through the existing jsPDF API.
- Raster to the requested Letter or A4 `PAPER_DIMENSIONS` and SVG viewBox without stretching or cropping.
- Keep manual zoom at 20–300% across resize and re-render; Fit Width and Fit Page recompute only while that mode is selected.
- Commit only the last requested unit/paper render to the visible preview canvas. Download PDF and Print keep the unit/paper snapshot from the click and do not change the active selection.
- Revoke object URLs on success and error; recover from async busy and failure states.
- Open the print popup synchronously before the first await.
- Keep critical tables readable inside existing template rectangles without dropping slots or grouping.

## Capabilities

### New Capabilities

None. This change modifies the existing `record-sheet-export` capability.

### Modified Capabilities

- `record-sheet-export`: replace PDF Generation, Preview Rendering, Zoom Controls, and Print Functionality so they require shared SVG construction, bounded 4x PNG output, correct Letter/A4 geometry, durable manual zoom, last-request currentness, URL cleanup, reserved print popups, recoverable async errors, and readable critical tables.

## Non-goals

Canonical spec edits, archival, new PDF libraries, template-asset edits, construction-rule changes, chassis/model work, publication, commits, production builds, and running the full test suite or rebuilt Playwright 3636 in this change package are excluded. Parent owns integration, rendered-PDF inspection, full gates, production build, and browser proof.

## Impact

Touches record-sheet types (DPI constants and paper dimension correctness), the shared SVG/canvas/PDF service pipeline, preview zoom/toolbar/print reservation, and critical-table presentation inside existing `crits_*` rectangles. Existing jsPDF remains the embedder. Preview, export, and print must consume the same SVG. The 20x/JPEG contract is intentionally superseded because the current canvas is not shippable.
