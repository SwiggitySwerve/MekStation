## 1. Specify the repair

- [x] 1.1 Author the OpenSpec proposal, design, and `record-sheet-export` delta that fully replace PDF Generation, Preview Rendering, Zoom Controls, and Print Functionality.
- [x] 1.2 Validate the change strictly and publish `spec-ready.json` so implementation lanes may edit product code.
- [x] 1.3 Record the 20x 12240×15840 / ~775MB characterization and the ResizeObserver zoom-reset failure before behavioral repair.

## 2. Shared SVG, paper, and PDF pipeline

- [x] 2.1 Set preview and PDF DPI multipliers to bounded 4x and raster to requested Letter/A4 `PAPER_DIMENSIONS` plus actual SVG viewBox geometry, including `addDocumentMargins` for ISO 559×806 → A4 595×842 instead of hardcoded Letter 612×792.
- [x] 2.2 Consolidate mech/non-mech fill to one SVG string consumed by preview, PDF, and print; embed lossless PNG through existing jsPDF; revoke object URLs on success and error.
- [x] 2.3 Add `printRecordSheet(data, paperSize)` that opens the popup before the first await; keep legacy `print(canvas)`; cover async cleanup, errors, and dimensions.

## 3. Preview zoom, currentness, and recovery

- [x] 3.1 Share explicit manual / Fit Width / Fit Page mode across BattleMech and non-BattleMech viewers so resize recomputes only the selected fit mode.
- [x] 3.2 Keep manual 20–300% zoom across resize, re-render, unit change, and paper change; commit only the last requested unit/paper render.
- [x] 3.3 Reserve print from the frontend after synchronous extract; replace `alert` with recoverable busy/error/retry for Print and Download PDF.

## 4. Critical table readability

- [x] 4.1 Keep every slot, order, grouping, empty/Roll Again, hittable styling, and 6/7 bracket contract inside existing `crits_*` rectangles.
- [x] 4.2 Fit names without clipped overlap or extreme shrink using measurement that works on a detached DOM.

## 5. Contract proof and handoff

- [x] 5.1 Add `e2e/customizer-record-sheet-rendering.spec.ts` from the catalog `loadAtlas` pattern covering zoom after resize, Fit Width until manual, paper aspect, no document overflow, unit currentness, and nonempty Letter/A4 PDFs saved under `testInfo.outputPath`.
- [x] 5.2 Format owned files and record lane evidence. Parent runs rebuilt Playwright 3636, rendered-PDF inspection, production build, and full gates. Do not treat old 3611 as success.

Evidence: 20x 12240x15840 canvas and ResizeObserver zoom reset reproduced before repair; 47 suites / 532 printing tests, 5 browser scenarios (manual zoom after resize, Fit Width, Letter/A4 downloads, print retry, 390px mobile), independent TypeScript check, production build, strict OpenSpec 231, visual inspection of Letter/A4 PDFs at 150/300 DPI. PDFs 9.9 MB to 1.1 MB. See docs/audits/2026-09-10-record-sheet-rendering/README.md. The canonical record-sheet-export supersession (20x JPEG to 4x PNG) lands at archive time, not in this change.

## 6. Inventory follow-up: Infantry preview parity

- [x] 6.1 Move Infantry onto the shared scalable preview and staged latest-request lifecycle, with focused regressions proving zoom controls and stale render rejection. The inventory found fixed-scale preview and direct rendering into the visible canvas.

Scope: this slice reuses the existing shared preview frame, toolbar, zoom canvas and staging hook while retaining the Infantry extractor and store boundary. The baseline fails both new regressions: Zoom in is absent, and an older canvas width of 111 replaces the current width of 222.

Fresh isolated-candidate acceptance: all six focused Infantry tests, nonincremental typecheck, lint, full formatting, strict OpenSpec/CI validation and production build passed. Independent review found no actionable defect. Production zoom, paper, PDF and mobile browser proof is delivered by the following browser slice before canonical synchronization or archive. The earlier receipt above remains historical.
