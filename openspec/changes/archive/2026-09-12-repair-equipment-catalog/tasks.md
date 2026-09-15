## 1. Repair catalog filtering

- [x] 1.1 Record real-data failures and add filter/real-store hook regressions.
- [x] 1.2 Preserve ammo metadata and replace partial compatibility matching.
- [x] 1.3 Separate Electronics and repair category/visibility/pagination consistency.
- [x] 1.4 Verify weapon edits, undo/redo and active-unit changes refresh results.

## 2. Improve presentation and placement

- [x] 2.1 Apply translucent row fills with readable opaque content.
- [x] 2.2 Reuse equipment calculation and Critical Slots authority for preview.
- [x] 2.3 Implement optional Add and place with one Undo/Redo and no partial edits.
- [x] 2.4 Cover variable, restricted, fixed, stale, split and read-only boundaries.

## 3. Verify and hand off

- [x] 3.1 Run focused tests, typecheck, lint, formatting, strict OpenSpec and build.
- [x] 3.2 Verify desktop/mobile filters, placement, undo/redo and draft recovery.
- [x] 3.3 Record evidence, restore preview and verify unrelated-file preservation.

Evidence: 14 characterization failures reproduced then repaired; 9 suites / 182 focused tests, 5 independent browser scenarios, TypeScript, lint (0 errors), strict OpenSpec, production build and standalone hydration passed. Density follow-up: 27 tests, 4 browser scenarios, rows 70px to 46px, header/row centre offset 0px. See docs/audits/2026-09-10-equipment-catalog/README.md and docs/audits/2026-09-10-equipment-catalog-density/README.md. Canonical specs are merged at archive time.
