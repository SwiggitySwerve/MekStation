## Context

`record-sheet-export` already has client-side SVG templates, jsPDF export, live preview, zoom, and print. The live constants still set `PDF_DPI_MULTIPLIER` and `PREVIEW_DPI_MULTIPLIER` to 20, while comments describe 3x/4x. `canvas.ts` then hardcodes Letter 612×792 and a 576×756 SVG fit even for A4, and never revokes the blob URL. At 20x that is 12240×15840 pixels (~193 million pixels, ~775MB RGBA). JPEG embedding additionally damages line art.

Preview viewers always install `ResizeObserver(fitToPage)`, so Zoom in/Fit Width do not survive viewport changes. Print currently rasterizes first, then opens a popup, which popup blockers reject. Critical tables still use a 7px Times face with crude truncation inside `crits_*` rects.

## Goals / Non-Goals

**Goals**

- One SVG construction path for preview, PDF, and print.
- Bounded 4x raster using requested `PAPER_DIMENSIONS` and actual SVG viewBox geometry.
- Lossless PNG through the existing jsPDF `addImage` API with FAST compression.
- Manual zoom 20–300% survives resize/render; Fit Width / Fit Page recompute only their selected mode.
- Last requested unit/paper preview render owns the visible canvas.
- Download PDF and Print use the immutable unit/paper snapshot from the click and do not change the active selection.
- Object-URL cleanup; print popup reserved before the first await; recoverable async busy/errors.
- Readable critical tables inside template bounds without changing slot content, order, or grouping.

**Non-goals**

Canonical spec edits, archival, new dependencies, template-asset edits, and construction-rule or data changes.

## Decisions

1. **Supersede 20x/JPEG, do not keep them as compatibility modes.** Preview and PDF SHALL use 4x. Letter 4x is 2448×3168; A4 4x is 2380×3368. Embed lossless PNG via current jsPDF with FAST compression. Do not add a PDF library.

2. **Shared SVG; preview/PDF rasterize, print stays vector.** Mech and non-mech families keep their extract/template/fallback dispatch. `getSVGString()` (or equivalent) is the single filled-sheet source. Preview and PDF rasterize that string at 4x to the requested paper size. `printRecordSheet` inlines the filled SVG in the reserved browser window and does not rasterize. Preserve all six unit-type families and skeleton fallbacks.

3. **Paper geometry is the selected `PAPER_DIMENSIONS`, not hardcoded Letter.** Raster width/height come from Letter 612×792 or A4 595×842. `addDocumentMargins` currently forces original 576×756 into 612×792 even for ISO templates (559×806). Expand each template's own content box into the requested paper viewBox without stretching, cropping, or letterboxing A4 onto Letter. CSS preview size is `paper × zoom` so Letter and A4 keep distinct aspect ratios. Preserve source coordinate geometry and footers; do not edit canonical template assets.

4. **Zoom is an explicit mode, not a one-shot scale.** Modes: `fit-page` (initial), `fit-width`, `manual`. Zoom in/out add or subtract 0.15 and clamp 0.20–3.00, switching to `manual`. ResizeObserver recomputes only the selected fit mode. Manual zoom is kept across resize, re-render, unit change, and paper change; paper change still applies the new aspect at that zoom. Zoom-only changes must not rebuild the sheet.

5. **Preview last-request-wins; PDF/print freeze the click snapshot.** Async preview renders stage work, then commit to the canvas only if that unit/paper request is still the current preview selection. Unmount cancels a preview commit. Stale preview requests cannot overwrite the current canvas. A failed preview draws an explicit error sheet; reselecting unit or paper retries that render. There is no dedicated preview Retry control and the error placeholder is not auto-cleared. Download PDF and Print capture an immutable unit/paper snapshot at click and complete that snapshot even if the user switches unit or paper while the action is in flight; finishing them SHALL NOT change the active preview selection. Toolbar Print and Download PDF keep explicit busy, duplicate-in-flight, and retry states (no `alert`).

6. **Print reservation, vector page.** Add `printRecordSheet(data, paperSize)` that calls `window.open` synchronously before the first `await` and writes the filled SVG into that window. Frontend print uses that API after synchronous `extractData`. Keep legacy `print(canvas)` working. Do not close an owned window before print consumes the page; close it on blocked-popup or owned failure.

7. **URL cleanup.** Every `createObjectURL` / equivalent is revoked on success and error.

8. **Critical tables stay in template slots.** Presentation may change typography, gutters, dividers, and text fitting. Slot count, order, empty/Roll Again entries, hittable vs unhittable weight, system-component non-grouping, copy identity, and 6/7 bracket bridging stay. Measurement must work on a detached DOM because `fillTemplate` can run off-document.

## Risks / Trade-offs

- 4x is sharp enough through 300% zoom on standard displays and avoids the 775MB buffer. Parent inspects actual PDFs at 150/300 DPI.
- Opening a print window before the filled SVG is written can show a brief blank page; wait for sheet readiness instead of closing early.
- Detached-DOM text fitting cannot use live `getBBox()`; use template coordinates and a measurement method that works off-document.

## Migration Plan

No user-data migration. Constants, canvas raster, preview zoom mode, print reservation, and critical-table presentation change in place. Canonical `openspec/specs/record-sheet-export/spec.md` is not edited in this change; the delta is the live contract until parent archives.

## Verification

Characterization first: 20x 12240×15840 canvas, JPEG embed, Letter-hardcoded A4, unreleased blob URLs, ResizeObserver fit-page override, late print popup. Pipeline tests cover dimensions, PNG embed, URL cleanup, unified SVG, and click-snapshot export/print. Preview tests cover manual zoom after resize, fit-mode recompute, stale preview discard, and async print errors. Critical-table tests keep grouping contracts and update presentation. Playwright `e2e/customizer-record-sheet-rendering.spec.ts` covers settled manual zoom, Fit Width canvas CSS versus the scroll viewport (3x cap, 2px), Letter 2448×3168 and A4 2380×3368 backing rasters, captured SVG header names for Atlas/Locust, overflow, and nonempty Letter/A4 PDFs saved under `testInfo.outputPath`.

## Open Questions

None for this repair. DPI is 4x, embed is PNG, paper sizes are Letter and A4, zoom labels are the current controls.
