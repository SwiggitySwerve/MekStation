# Critical-worker report

Lane: PDF critical-table readability inside existing `crits_*` rectangles.
Spec-ready: `../../2026-09-16-evidence-distilled/record-sheet-repair-20260910.md` (formerly `.sisyphus/record-sheet-repair-20260910/spec-ready.json`) `success: true` (parent-validated).

## Files touched

Product:

- `src/services/printing/svgRecordSheetRenderer/criticals.ts`
- `src/services/printing/svgRecordSheetRenderer/criticalTableHelper.ts` (new)

Tests:

- `src/services/printing/svgRecordSheetRenderer/__tests__/criticals.presentation.test.ts` (new)
- `src/services/printing/svgRecordSheetRenderer/__tests__/criticals.slot-content.test.ts` (ellipsis → full-name fit)
- `src/services/printing/svgRecordSheetRenderer/__tests__/criticals.svg-edge-cases.test.ts` (font-size range)

Unchanged grouping tests: `criticals.render.test.ts`, `criticals.multi-slot-groups.test.ts`, `criticals.test-helpers.ts`.

Not edited: templates, services, components, specs, E2E, canvas.

## Geometry and font choices

Live `crits_XX` rect attributes are the source of layout (US Letter biped sample: 12-slot `94.397×103.5`, 6-slot `94.397×50.025`; ISO/quad/tripod differ). No hardcoded paper size.

| Token            | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| Face             | `Times New Roman, Times, serif`                              |
| Slot font        | 7px                                                          |
| Title font       | 8.75px (`7 * 1.25`)                                          |
| Fit floor        | 6px (no further shrink)                                      |
| Number column    | 12px; number x = `rectX + 5` (bold)                          |
| Content x        | `rectX + 15` (header shares this gutter)                     |
| Right pad        | 2px → US content width ≈ 77.4px                              |
| Header           | above rect, `y = rectY - 7` (descender clearance)            |
| 12-slot gap      | `height * 0.05` (canonical; was a constant 4px)              |
| Slot baseline    | `rectY + (index + 0.7) * slotHeight` + gap for index ≥ 6     |
| Alternating fill | `#f3f3f3` on odd slot bands, clipped to the rect             |
| 6/7 divider      | 0.4px `#b3b3b3` hairline in the gap                          |
| Bracket          | 3px arms, 0.72 stroke, 15% vertical pad, one path across 6/7 |

Text fit is detached-safe: Adobe Times-Roman advances (no `getBBox`). If estimated width exceeds the content gutter, font steps down by 0.25px toward 6px, then `textLength` + `lengthAdjust=spacingAndGlyphs`. Full `textContent` is always the real name. No `..` ellipsis.

Semantics preserved: `-Empty-` `#999999`; Roll Again black/normal; hittable bold; unhittable normal; system components not grouped; copies keyed by `equipmentId` else content; 6/7 bracket still one continuous path.

Guards: invalid/NaN rect → warn and skip; empty `slots[]` draws header only (no division); re-render removes `#critSlots_XX` first.

## Checks

Command:

```
node node_modules/jest/bin/jest.js --selectProjects unit --runInBand --runTestsByPath
  src/services/printing/svgRecordSheetRenderer/__tests__/criticals.render.test.ts
  src/services/printing/svgRecordSheetRenderer/__tests__/criticals.slot-content.test.ts
  src/services/printing/svgRecordSheetRenderer/__tests__/criticals.multi-slot-groups.test.ts
  src/services/printing/svgRecordSheetRenderer/__tests__/criticals.svg-edge-cases.test.ts
  src/services/printing/svgRecordSheetRenderer/__tests__/criticals.presentation.test.ts
```

Result: **5 suites, 32 tests, all pass** (after oxfmt as well).

`node node_modules/oxfmt/bin/oxfmt` on the owned product + test files: exit 0.

Characterization red test (`preserves the full equipment name…`) failed on the old `substring + '..'` path before the repair; it now passes.

## Limitations

- Parent owns rendered Letter/A4 PDFs at 150/300 DPI, preview/browser proof, production build, and full gates. This lane did not rasterize sheets.
- Very long names (the ERPPC characterization string) stay complete in SVG but may look tight once `textLength` compresses them at the 6px floor. Typical BattleTech crit names fit at 7px.
- Location titles remain _above_ the rect (MegaMekLab / grouping tests). Slots, bands, divider, and brackets stay inside `crits_*`.
- Template `1-3` / `4-6` labels and Engine Hits artwork were not moved.
