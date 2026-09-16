# contract-proof lane report

## Outcome

OpenSpec change `repair-record-sheet-rendering` is created, populated, and strict-valid. `spec-ready.json` was written with `success: true` and `changePath` immediately after the first strict pass so other lanes could start. Parent review corrections: E2E now settles two animation frames after each viewport change, asserts Fit Width CSS against the scroll viewport (3× cap, 2px), asserts Letter 2448×3168 and A4 2380×3368 backing rasters, and verifies Atlas/Locust header names from captured SVG blobs. Design/spec split preview last-request-wins from PDF/print click snapshots. Final truthfulness pass: print is inline filled SVG in the reserved window (not a raster); preview failure draws an error sheet and retries on the next unit/paper render with no dedicated preview Retry; PDF PNG uses jsPDF FAST compression (spec does not encode size thresholds; parent measured uncompressed default ~23MB vs FAST ~0.7MB). This lane did not edit product code, task checkboxes, canonical specs, or other workers' files.

## Files

- `openspec/changes/repair-record-sheet-rendering/proposal.md`
- `openspec/changes/repair-record-sheet-rendering/design.md`
- `openspec/changes/repair-record-sheet-rendering/tasks.md`
- `openspec/changes/repair-record-sheet-rendering/specs/record-sheet-export/spec.md`
- `openspec/active-change-ledger.json` (appended `repair-record-sheet-rendering` only; 14 entries)
- `e2e/customizer-record-sheet-rendering.spec.ts`
- `../../2026-09-16-evidence-distilled/record-sheet-repair-20260910.md` (formerly `.sisyphus/record-sheet-repair-20260910/spec-ready.json`)
- `../../2026-09-16-evidence-distilled/record-sheet-repair-20260910.md` (formerly `.sisyphus/record-sheet-repair-20260910/contract-proof/characterization.json`)
- `../../2026-09-16-evidence-distilled/record-sheet-repair-20260910.md` (formerly `.sisyphus/record-sheet-repair-20260910/contract-proof/REPORT.md`)

## Checks

- `openspec new change repair-record-sheet-rendering` created the package
- `openspec status --change repair-record-sheet-rendering` → 4/4 artifacts complete
- `openspec validate repair-record-sheet-rendering --strict` → valid (initial package, after A4 margin findings, after parent-review snapshot/E2E contract edits, and after the vector-print / preview-error / FAST-PNG truthfulness pass)
- Ledger JSON parses; last entry is `repair-record-sheet-rendering`
- `node node_modules/oxfmt/bin/oxfmt` on the E2E spec

## Characterization (before product repair)

From `../../2026-09-16-evidence-distilled/record-sheet-repair-20260910.md` (formerly `.sisyphus/record-sheet-repair-20260910/baseline.json`), `baseline-resize.json`, and `before-letter.svg`:

- Preview/PDF canvas was 12240×15840 at 20x (~193 million pixels, 775526400 estimated RGBA bytes)
- Manual zoom 82% and Fit Width 164% each reset to 67% after viewport resize
- Letter PDF 9890758 bytes; A4 PDF 9413888 bytes; A4 CSS 375.9375×532 did not match the Letter backing canvas
- `addDocumentMargins` hardcoded 576×756 → 612×792 even for ISO templates 559×806
- Filled SVG `id="type"` header is the full name `Atlas AS7-D`

The Playwright spec is the user-facing characterization: settled manual zoom after two animation frames, Fit Width CSS vs scroll content width, 4x backing rasters, captured SVG type headers for Atlas AS7-D and Locust LCT-1V, overflow, and nonempty Letter/A4 PDFs under `testInfo.outputPath`.

## Parent / port mechanics (not in durable design)

- Parent runs rebuilt Playwright 3636, rendered-PDF inspection, production build, full gates, and browser proof
- This lane does not run old 3611 or treat it as success
- `spec-ready.json` was not overwritten after the parent added `parentValidatedAt` / findings
- Pipeline/preview/critical product edits belong to those lanes; this lane owns the change package, ledger append, E2E, and this directory
- `events.ndjson`, `prompt.md`, and `status.json` in this directory were left for the driver

## Limitations

- Did not run Playwright, Jest, production build, servers, or the full test suite
- Did not implement preview/pipeline/critical product edits
- Did not inspect rendered PDFs in a browser
- SVG authority is the blob passed to `URL.createObjectURL` (same filled sheet used to rasterize); it is not a production test hook
