# Preview worker report

Lane: `../../2026-09-16-evidence-distilled/record-sheet-repair-20260910.md` (formerly `.sisyphus/record-sheet-repair-20260910/preview-worker`)
Spec gate: `../../2026-09-16-evidence-distilled/record-sheet-repair-20260910.md` (formerly `.sisyphus/record-sheet-repair-20260910/spec-ready.json`) (`success: true`, `repair-record-sheet-rendering`)

## Follow-up (this session)

Infantry print still rasterized a temp canvas, then called legacy `print(canvas)`, so popup reservation and unified paper handling never ran for that tab. Routed `InfantryPreviewTab` through sync `extractData(unitObject)` then `printRecordSheet(data, paperSize)` (SPA fields stay on the extracted payload). Removed the unused temp-canvas path and `PAPER_DIMENSIONS` import. Dropped the `RecordSheetPrintApi` structural cast in `RecordSheetCanvasPreview.tsx`; `printUnitRecordSheet` now calls `service.printRecordSheet` directly.

## Files

Product:

- `src/components/customizer/preview/recordSheetPreviewZoom.ts`
- `src/components/customizer/preview/useRecordSheetPreviewZoom.ts`
- `src/components/customizer/preview/RecordSheetPreviewZoomControls.tsx`
- `src/components/customizer/preview/RecordSheetCanvasPreview.tsx`
- `src/components/customizer/preview/RecordSheetPreview.tsx`
- `src/components/customizer/preview/PreviewToolbar.tsx`
- `src/components/customizer/infantry/InfantryPreviewTab.tsx`

Tests:

- `src/components/customizer/preview/__tests__/RecordSheetCanvasPreview.zoom.test.tsx`
- `src/components/customizer/preview/__tests__/RecordSheetCanvasPreview.async.test.tsx`
- `src/components/customizer/preview/__tests__/PreviewToolbar.test.tsx`
- `src/components/customizer/preview/__tests__/RecordSheetPreviewValidationBanner.test.tsx` (re-run)
- `src/components/customizer/infantry/__tests__/InfantryPreviewTab.test.tsx`

Not edited: services, specs, E2E, other customizer types, task checkboxes.

## Checks

```
node node_modules/oxfmt/bin/oxfmt
  <owned preview files + InfantryPreviewTab.tsx + InfantryPreviewTab.test.tsx>

node node_modules/jest/bin/jest.js --selectProjects unit --runInBand --runTestsByPath
  src/components/customizer/infantry/__tests__/InfantryPreviewTab.test.tsx
  src/components/customizer/preview/__tests__/RecordSheetCanvasPreview.zoom.test.tsx
  src/components/customizer/preview/__tests__/RecordSheetCanvasPreview.async.test.tsx
  src/components/customizer/preview/__tests__/PreviewToolbar.test.tsx
  src/components/customizer/preview/__tests__/RecordSheetPreviewValidationBanner.test.tsx
→ 5 suites, 17 tests, pass
```

Infantry print test: call order `extractData` then `printRecordSheet`; extracted infantry data (including `specialAbilities`) is the print payload; no `renderPreview`, no legacy `print(canvas)`, no new `canvas` element during Print.

## Limitations

- Other non-mech tabs that already use `useRecordSheetToolbarActions` / `printUnitRecordSheet` were not retouched.
- Parent still owns integration, rendered PDFs, production build, browser proof, and full gates.
