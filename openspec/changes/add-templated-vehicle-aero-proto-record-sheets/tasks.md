# Tasks: Add Templated Vehicle / Aerospace / ProtoMech Record Sheets

Test infrastructure exists (Jest + `@swc/jest`). Tests are authored
**alongside** implementation in each wave. The Phase-N pip-count
fidelity tasks are the hard fidelity gate.

## 0. Infra-First — Asset Registration and ID Catalog

- [x] 0.1 Register the 10 Wave-1 non-mech templates in
  `config/mm-data-assets.json` under both `templates_us` and
  `templates_iso` pattern lists: `vehicle_noturret_standard.svg`,
  `vehicle_turret_standard.svg`, `vehicle_dualturret_standard.svg`,
  `vtol_noturret_standard.svg`, `vtol_turret_standard.svg`,
  `fighter_aerospace_default.svg`, `fighter_conventional_default.svg`,
  `protomek_biped.svg`, `protomek_quad.svg`, `protomek_glider.svg`.
  - Acceptance: each of the 10 names appears in both pattern lists,
    matching the existing `mek_*` registration shape.
  - QA: `cat config/mm-data-assets.json` shows 20 new entries; JSON
    parses (`node -e "JSON.parse(require('fs').readFileSync('config/mm-data-assets.json'))"`).
- [x] 0.2 Run the asset-sync step (`npm run fetch:assets`) and confirm
  the Wave-1 non-mech templates land in
  `public/record-sheets/templates_us` and `templates_iso`.
  - Acceptance: all 10 templates present in each of the two local
    directories.
  - QA: `ls public/record-sheets/templates_us | grep -cE 'vehicle_|vtol_|fighter_|protomek_'` returns 10.
- [x] 0.3 Prove one vehicle template loads through
  `MmDataAssetService` before any renderer code exists — a throwaway
  spec or script that calls `loadSVG('templates_us/vehicle_turret_standard.svg')`.
  - Acceptance: returns parseable SVG content, three-source fallback
    chain confirmed reachable.
  - QA: the load returns non-empty SVG; CDN fallback verified by
    temporarily renaming the local file.
- [x] 0.4 Extract the injectable `id=` set from each of the 10
  canonical templates into a frozen typed const (one section per
  family), grouped vehicle / aerospace / protomech.
  - Acceptance: a typed `as const` catalog whose keys are the real
    template element IDs.
  - QA: `bun run typecheck` clean; spot-check 3 IDs per family against
    the template SVG source.
- [x] 0.5 Review the extracted ID catalog against the MegaMekLab
  `Print*` Java field names (`PrintTank.java`, `PrintAero.java`,
  `PrintProtoMek.java` in `E:/Projects/megameklab/.../printing/`).
  - Acceptance: every binding target the adapters will use corresponds
    to a documented `Print*` element ID; divergences noted in the
    catalog file as comments.
  - QA: review notes recorded; no unexplained ID in the catalog.

## 1. Shared Template Renderer Core

- [x] 1.1 Create `templateRecordSheetRenderer.ts` exposing
  `loadTemplate(path)`, `applyBindings(texts)`, `applyPips(pipFills)`,
  `getSVGString()`, reusing `loadSVGTemplate` / `setTextContent` /
  canvas / jsPDF code paths verbatim.
  - Acceptance: shared core compiles; no fork of mech-specific logic.
  - QA: `bun run typecheck` clean.
- [x] 1.2 Add the off-screen-mount helper: mount the parsed SVG into a
  hidden DOM container before pip measurement, remove after
  `getSVGString()`.
  - Acceptance: mount/unmount lifecycle exposed and called by the
    render path.
  - QA: unit test asserts the SVG is attached to the document during
    pip measurement and detached after.
- [x] 1.3 Add `document.fonts.ready` await before any text-width
  measurement in the shared core (web-font race mitigation).
  - Acceptance: text measurement is gated on font readiness.
  - QA: unit test or code review confirms the await precedes measure.
- [x] 1.4 Refactor `SVGRecordSheetRenderer` (mech) into a thin consumer
  of `TemplateRecordSheetRenderer` — no behavior change.
  - Acceptance: mech renderer delegates template handling to the
    shared core.
  - QA: existing mech record-sheet snapshot tests pass with zero diff.
- [x] 1.5 Unit tests for the shared core — `loadTemplate`,
  `applyBindings`, `getSVGString`.
  - Acceptance: bindings inject by element ID; absent IDs unchanged.
  - QA: `bun test templateRecordSheetRenderer` green.

## 2. Shared Dynamic Pip Engine

- [x] 2.1 Promote the dynamic pip-layout logic from `armor.ts` into a
  shared pip-engine module computing pip positions from template
  `<rect>` region geometry via `getBBox()`.
  - Acceptance: engine emits `count` pip elements within a region's
    measured bounds.
  - QA: unit test on a synthetic template `<rect>`.
- [x] 2.2 Implement the `grouped`-layout element-lookup fallback:
  retry `getElementById(id + "grouped")` when the primary ID is absent.
  - Acceptance: grouped element resolved when primary missing.
  - QA: unit test with a template region exposing only `<id>grouped`.
- [x] 2.3 Expose the alternate-clustering flag from MegaMekLab
  `ArmorPipLayout.java` so callers can request clustered placement.
  - Acceptance: flag changes pip clustering; default matches the mech
    path.
  - QA: unit test toggles the flag and asserts placement differs.
- [x] 2.4 Confirm `armor.ts` (mech) consumes the shared pip engine
  with no behavior change.
  - Acceptance: mech pip layout routes through the shared engine.
  - QA: mech snapshot tests pass with zero diff.

## 3. Vehicle / VTOL Family Adapter

- [x] 3.1 Create `vehicle/selectTemplate.ts` — pure
  `unit → templateKey` of form `{subtype}_{turret}_{weight}`, mirroring
  `PrintTank.getSVGFileName()`. Wave-1 keys only:
  `vehicle_{noturret,turret,dualturret}_standard`,
  `vtol_{noturret,turret}_standard`.
  - Acceptance: pure function, no I/O; correct key for each
    subtype/turret combination in scope.
  - QA: unit test covering all 5 Wave-1 vehicle/VTOL keys.
- [x] 3.2 Create `vehicle/bindings.ts` — pure
  `IVehicleRecordSheetData → { texts, pips }` against the Phase-0 ID
  catalog, with a typed `PipCounts` computed from unit armor/structure
  stats.
  - Acceptance: `texts` bind only catalog IDs; `PipCounts` per-location
    counts equal unit stats; VTOL Rotor location included.
  - QA: unit test asserts `PipCounts` for a 50t tracked tank and a
    VTOL fixture.
- [x] 3.3 Pip-count fidelity test — parse the rendered vehicle SVG,
  assert pip-element count per location equals the fixture's actual
  armor/structure values.
  - Acceptance: fidelity gate green for a turret tank and a VTOL.
  - QA: `bun test vehicle` green; deliberately wrong fixture fails the
    assertion.

## 4. Aerospace / Conventional Fighter Family Adapter

- [x] 4.1 Create `aerospace/selectTemplate.ts` — pure
  `unit → templateKey`: `fighter_aerospace` / `fighter_conventional`.
  - Acceptance: pure function; correct key for aerospace vs
    conventional fighter.
  - QA: unit test covering both keys.
- [x] 4.2 Create `aerospace/bindings.ts` — pure
  `IAerospaceRecordSheetData → { texts, pips }` against the Phase-0 ID
  catalog, `PipCounts` for the 4 arcs (Nose / Left Wing / Right Wing /
  Aft).
  - Acceptance: `texts` bind only catalog IDs; `PipCounts` arc counts
    equal unit armor stats.
  - QA: unit test asserts `PipCounts` for an aerospace fighter fixture.
- [x] 4.3 Pip-count fidelity test — parse the rendered aerospace SVG,
  assert pip-element count per arc equals the fixture's armor values.
  - Acceptance: fidelity gate green for both fighter types.
  - QA: `bun test aerospace` green.

## 5. ProtoMech Family Adapter

- [x] 5.1 Create `protomech/selectTemplate.ts` — pure
  `unit → templateKey`: `protomek_biped` / `protomek_quad` /
  `protomek_glider`.
  - Acceptance: pure function; correct key per ProtoMech configuration.
  - QA: unit test covering all 3 keys.
- [x] 5.2 Create `protomech/bindings.ts` — pure
  `IProtoMechRecordSheetData → { texts, pips }` against the Phase-0 ID
  catalog, `PipCounts` for the per-location armor/structure diagram.
  - Acceptance: `texts` bind only catalog IDs; `PipCounts` per-location
    counts equal unit stats.
  - QA: unit test asserts `PipCounts` for biped, quad, glider fixtures.
- [x] 5.3 Pip-count fidelity test — parse the rendered ProtoMech SVG,
  assert pip-element count per location equals the fixture's
  armor/structure values.
  - Acceptance: fidelity gate green for all 3 ProtoMech configs.
  - QA: `bun test protomech` green.

## 6. Dispatch — Template-Primary With Skeleton Fallback

- [x] 6.1 Add `renderTemplated` to `renderer.ts`: for vehicle /
  aerospace / protomech units, select template → load via
  `MmDataAssetService` → apply bindings + pips → return templated SVG.
  - Acceptance: vehicle/aerospace/protomech route through the template
    path.
  - QA: integration test renders one unit per family via the template
    path.
- [x] 6.2 Wrap the template path in `try/catch`; on asset-load or
  parse failure, invoke the existing family skeleton renderer and
  return its SVG.
  - Acceptance: a forced asset failure yields skeleton output, not a
    blank/error sheet.
  - QA: unit test stubs `loadSVG` to throw and asserts skeleton output
    is returned.
- [x] 6.3 Confirm the `renderRecordSheetSVG` `switch` routes mech to
  the refactored consumer, vehicle/aerospace/protomech to
  `renderTemplated`, infantry/battlearmor unchanged to skeleton.
  - Acceptance: dispatch table correct for all 7 families.
  - QA: dispatch unit test per `unitType`.
- [x] 6.4 Verify the customizer Save PDF path
  (`PreviewTab.handleExportPDF` → `RecordSheetService.exportPDF`)
  renders the three families through the templated path.
  - Acceptance: Save PDF for a vehicle, an aerospace fighter, and a
    ProtoMech produces a templated PDF.
  - QA: dev-browser — open each unit type in the customizer, click
    Save PDF, confirm the PDF matches the canonical template layout
    (header fields populated, pips drawn).

## 7. Final Verification Wave

- [x] F1 Typecheck + lint clean across all touched files
  (`bun run typecheck`, `bun run lint`).
- [x] F2 All unit + integration tests pass, including the three
  per-family pip-count fidelity tests and the unchanged mech snapshot
  tests (`bun test`).
- [x] F3 Manual QA — Save PDF from the customizer for a vehicle, a
  VTOL, an aerospace fighter, a conventional fighter, and all three
  ProtoMech configs (`templates_us` and `templates_iso`); confirm
  canonical layout and correct pip counts.
- [x] F4 Forced-failure QA — block asset loading and confirm each
  family degrades to its skeleton renderer rather than producing a
  blank PDF.
- [x] F5 `omo-spec-verifier` confirms every SHALL/MUST in the two
  delta specs has implementation and test coverage.
- [x] F6 `openspec validate add-templated-vehicle-aero-proto-record-sheets --strict`
  passes.
