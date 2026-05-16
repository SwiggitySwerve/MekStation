# Add Templated Vehicle / Aerospace / ProtoMech Record Sheets

## Why

The mech record sheet renders correctly via canonical-template
ID-injection: `SVGRecordSheetRenderer` loads a real mm-data template
SVG, injects values by `getElementById` + `textContent`, and computes
armor pips dynamically from template region geometry. The output is a
faithful Total Warfare record sheet.

The five **non-mech** renderers
(`vehicleRenderer.ts`, `aerospaceRenderer.ts`, `battleArmorRenderer.ts`,
`infantryRenderer.ts`, `protoMechRenderer.ts`) are not. Each is a
self-described "Skeleton implementation" — a hand-rolled string-builder
that emits simplified SVG with hard-coded geometry, no canonical
template, and no dynamic pip layout. A customizer user who builds a
40-ton tank, an aerospace fighter, or a ProtoMech and clicks **Save
PDF** gets a visibly inferior sheet that does not match MegaMek's
canonical layout.

mm-data already ships the canonical templates for these families
(`vehicle_*`, `vtol_*`, `fighter_aerospace_default`,
`fighter_conventional_default`, `protomek_*`) under
`templates_us` / `templates_iso`, and they use the **same `id=`
injection convention** as the mech templates. `MmDataAssetService`
already fetches templates at runtime with a three-source fallback
chain (local → jsDelivr CDN → GitHub raw). Wiring the non-mech families
onto the proven template path is therefore a config registration plus
a renderer refactor — no build-pipeline change.

This change covers **Wave 1**: Vehicle / VTOL / SupportVehicle,
Aerospace / ConventionalFighter, and ProtoMech. Infantry and
BattleArmor are deliberately deferred to a separate Wave 2 change —
their record sheets are structurally different (platoon counters,
per-trooper grids) and warrant their own scoping.

## What Changes

The architecture below was decided by an OMO Council and is not
re-litigated here. This change implements it.

- **Shared template renderer.** Promote the mech renderer's
  template-handling core into a shared `TemplateRecordSheetRenderer`
  in `src/services/printing/svgRecordSheetRenderer/`. It exposes
  `loadTemplate(path)`, `applyBindings(texts)`, `applyPips(pipFills)`,
  and `getSVGString()`, reusing `loadSVGTemplate` / `setTextContent` /
  the canvas + jsPDF pipeline verbatim. The existing
  `SVGRecordSheetRenderer` (mech) is refactored into a thin consumer
  of this shared core — **with no behaviour change to the proven mech
  path** (its snapshot tests pin this).

- **Shared pip engine.** Promote the dynamic pip-layout logic from
  `armor.ts` (the non-biped `ArmorPipLayout` port) into a shared pip
  engine that computes pip positions from a template's `<rect>` region
  geometry. It includes the `grouped`-layout element-lookup fallback
  (`getElementById(id + "grouped")`) and the alternate-clustering flag,
  mirroring MegaMekLab `ArmorPipLayout.java` + `PrintEntity.java`.

- **Per-family adapters.** One folder per family
  (`vehicle/`, `aerospace/`, `protomech/`), each with two **pure**
  files:
  - `selectTemplate.ts` — maps a unit to a `templateKey`. Vehicle key
    is `{subtype}_{turret}_{weight}`, mirroring `PrintTank.getSVGFileName()`;
    aero key is `fighter_aerospace` / `fighter_conventional`; proto key
    is `protomek_biped` / `protomek_quad` / `protomek_glider`.
  - `bindings.ts` — maps the unit's `IRecordSheetData` variant to
    `{ texts, pips }` against the template's real element IDs, with a
    typed per-family `PipCounts` contract computed from unit stats.

- **Infra-first registration.** The wave-1 non-mech template paths
  (and any non-mech pip directories) are registered in
  `config/mm-data-assets.json` and surfaced by `MmDataAssetService`
  **before** any renderer code is written. A Phase-0 sub-task extracts
  each canonical template's `id=` set into a frozen typed const,
  reviewed against the MegaMekLab `Print*` Java field names.

- **MVP template subset (Wave 1).** Registered and wired:
  `vehicle_noturret_standard`, `vehicle_turret_standard`,
  `vehicle_dualturret_standard`, `vtol_noturret_standard`,
  `vtol_turret_standard`, `fighter_aerospace_default`,
  `fighter_conventional_default`, `protomek_biped`,
  `protomek_quad`, `protomek_glider` — in **both** `templates_us`
  (US Letter) and `templates_iso` (A4).

- **Template-primary with skeleton fallback.** A new `renderTemplated`
  entry point wraps the template path in `try/catch`; on asset-load
  failure it falls back to the existing skeleton renderer for that
  family. This preserves the offline / degraded story. The skeleton
  renderers are **not deleted** in this change.

- **Fidelity gate.** Each family adapter ships a test that parses the
  output SVG and asserts the rendered pip-element count per location
  matches the unit's actual armor / structure stats.

## Non-Goals

These are explicitly **out of scope** for Wave 1 and are named here as
deferred follow-ups:

- **Infantry and BattleArmor record sheets** — a separate Wave 2
  change. Their sheets are structurally different (platoon-size
  counters, per-trooper armor grids) and the skeleton renderers for
  both remain in place untouched.
- **Superheavy / naval / submarine / WiGE vehicle variants** — the
  `*_superheavy` templates and the `naval_*`, `submarine_*`, `wige_*`
  template families are not registered or wired. Only the
  `*_standard` weight tier of `vehicle` and `vtol` is in scope.
- **Capital ships** — `dropship_*`, `smallcraft_*`, `jumpship_*`,
  `warship_*`, `spacestation_*`, `advaero_reverse` templates are out.
- **The 2-per-page composite layout** — MegaMekLab's
  `PrintCompositeTankSheet` (two vehicle sheets per page) is not
  implemented. Wave 1 renders one unit per page, mirroring the mech
  path.
- **Skeleton renderer deletion** — the five skeleton renderers stay
  as the fallback. A later cleanup change removes the wave-1 ones
  (`vehicle`, `aerospace`, `protoMech`) once pip-parity is verified
  in production.
- **The two-per-page protomech sheet** — MegaMekLab renders multiple
  ProtoMechs of a point on one page; Wave 1 renders one ProtoMech per
  page from the customizer's single-unit context.

## Capabilities

### Modified Capabilities

- `record-sheet-export` — the existing "Per-Type SVG Renderers"
  requirement is widened: the vehicle, aerospace, and protomech
  renderers move from skeleton string-builders to canonical-template
  consumers via a shared `TemplateRecordSheetRenderer` and shared pip
  engine. New requirements cover the shared core, per-family adapters,
  the template-primary / skeleton-fallback dispatch, and the
  per-family pip-count fidelity gate.

- `mm-data-asset-integration` — the `MmData Asset Service` requirement
  is widened to register and serve the wave-1 non-mech template paths
  and non-mech pip directories, and the asset-sync script copies them.

## Impact

- **Code.** New shared modules
  (`templateRecordSheetRenderer.ts`, a shared pip-engine module) and
  three new per-family adapter folders under
  `src/services/printing/svgRecordSheetRenderer/`. `renderer.ts`'s
  `switch` dispatch gains a template-primary path with skeleton
  fallback. `SVGRecordSheetRenderer` (mech) is refactored to consume
  the shared core. The five skeleton renderers are **not** modified or
  deleted.
- **Config.** `config/mm-data-assets.json` gains the wave-1 non-mech
  template entries under `templates_us` / `templates_iso` and any
  required non-mech pip directories. `MmDataAssetService` resolves the
  new paths through its existing three-source fallback chain.
- **Specs.** Two modified delta specs (`record-sheet-export`,
  `mm-data-asset-integration`). Both sync to source-of-truth on
  archive — **no `--skip-specs`**.
- **Tests.** New Jest tests: shared-core unit tests, per-family
  adapter unit tests, and the per-family pip-count fidelity test. The
  existing mech snapshot tests are the regression guard for the
  no-behaviour-change refactor.
- **Assets.** Wave-1 non-mech templates are fetched into
  `public/record-sheets/templates_us` / `templates_iso` by the
  asset-sync step. At runtime the three-source fallback chain still
  applies, so a missing local asset degrades to CDN / raw, and a hard
  failure degrades to the skeleton renderer.
- **Risk.** Medium. The mech path is the highest-value asset and its
  no-behaviour-change refactor is the chief risk — mitigated by the
  Phase-0 ID extraction, the mech snapshot tests, and the
  template-primary / skeleton-fallback safety net. Browser hazards
  (`getBBox()` live-DOM requirement, web-font measure race) are
  documented in `design.md` and carry explicit mitigation tasks.
