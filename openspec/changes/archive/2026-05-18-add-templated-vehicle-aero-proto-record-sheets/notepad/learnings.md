# Learnings — add-templated-vehicle-aero-proto-record-sheets

## [2026-05-15] Orchestration setup
**Convention**: Repo uses `npm`, NOT `bun`. tasks.md QA hints say `bun run typecheck` / `bun test` — translate to the real commands:
- `npm run lint` (oxlint)
- `npx oxfmt --check`
- `npx tsc --noEmit`
- `npm test` (jest + @swc/jest)
- `npm run storybook:build`

**Renderer layout**: `src/services/printing/svgRecordSheetRenderer/` contains `renderer.ts` (dispatch + `SVGRecordSheetRenderer` mech class), `template.ts` (`loadSVGTemplate`/`setTextContent`/`addDocumentMargins`/etc), `armor.ts` + `structure.ts` (pip layout), `canvas.ts` (`renderToCanvasHighDPI`), `constants.ts` (`ELEMENT_IDS`), and 5 skeleton renderers (`vehicleRenderer.ts`, `aerospaceRenderer.ts`, `battleArmorRenderer.ts`, `infantryRenderer.ts`, `protoMechRenderer.ts`).

**Dispatch shape**: `renderRecordSheetSVG(data: INonMechRecordSheetData)` switches on `data.unitType` ('vehicle'|'aerospace'|'battlearmor'|'infantry'|'protomech'). Mech path is the `SVGRecordSheetRenderer` class (separate, used by `RecordSheetService`).

**Config shape**: `config/mm-data-assets.json` has `patterns.templates_us` and `patterns.templates_iso` as flat string arrays. Mech entries are `mek_*` filenames. Phase 0.1 appends 10 non-mech filenames to BOTH lists.

**Asset service**: `src/services/assets/MmDataAssetService.ts` — three-source fallback (local → jsDelivr CDN → GitHub raw).

## [2026-05-15] Phase 0 complete (PR #579)
**Asset-sync script**: `npm run fetch:assets` → `scripts/mm-data/fetch-assets.ts`. Reads `config/mm-data-assets.json` `patterns`, expands `{a,b}`/`{1-N}` patterns, downloads from CDN (or `--prefer-local` from `../mm-data` relative to cwd). 544 assets total after Wave-1 registration.

**`public/record-sheets/` is gitignored** — synced templates are NOT committed; CI/runtime fetches them. Only `config/mm-data-assets.json` registration is committed. `mm-data-version.json` also gets touched by the sync — `git checkout` it back, it's not part of the change.

**Element-ID catalog**: NEW file `src/services/printing/svgRecordSheetRenderer/templateElementIds.ts`. Exports `SHARED_TEMPLATE_IDS` (header IDs shared by all), `VEHICLE_TEMPLATE_IDS`, `AEROSPACE_TEMPLATE_IDS`, `PROTOMECH_TEMPLATE_IDS` as `as const` + matching `*TemplateId` union types. Per-family `bindings.ts` MUST import + bind only against these.

**MegaMekLab canonical ID source**: `E:/Projects/megameklab/megameklab/src/megameklab/printing/IdConstants.java` — the single source of element-ID constants consumed by `PrintTank`/`PrintAero`/`PrintProtoMek`. `getSVGFileName()` in each `Print*` class encodes the template-key mapping.

**Vehicle template key (PrintTank.getSVGFileName)**: `{subtype}_{turret}_{weight}.svg`. subtype = vehicle|vtol|naval|submarine|wige (Wave-1: only vehicle + vtol). turret = noturret (hasNoTurret) | turret (hasNoDualTurret) | dualturret. weight = `standard` always for Wave-1 (superheavy excluded; note VTOLs are ALWAYS `standard` even if superheavy).

**Aero template key (PrintAero.getSVGFileName)**: `ConvFighter` → `fighter_conventional_default.svg`; else → `fighter_aerospace_default.svg`. NOTE the actual filenames carry a `_default` suffix — `selectTemplate` returns the key, the renderer appends paper-size dir. tasks.md says key is `fighter_aerospace`/`fighter_conventional` — confirm whether the renderer adds `_default.svg` or the key includes it. The registered FILE names are `fighter_aerospace_default.svg` / `fighter_conventional_default.svg`.

**Proto template key (PrintProtoMek.getSVGFileName)**: `isQuad()` → `protomek_quad.svg`; `isGlider()` → `protomek_glider.svg`; else → `protomek_biped.svg`.

**Vehicle template location codes**: FR=Front, LS=Left Side, RS=Right Side, RR=Rear, TU=Turret, FT=Front Turret (dualturret only), RO=Rotor (VTOL only). Pip groups: `armorPips{FR,LS,RS,RR,TU,FT,RO}`, `structurePips{...}`. Text labels: `textArmor_{FR,LS,RS,RR,TU,FT,RO}`.

**Aero arc codes**: NOS=Nose, LWG=Left Wing, RWG=Right Wing, AFT=Aft. Pip groups `armorPips{NOS,LWG,RWG,AFT}`, plus `siPips` (Structural Integrity), `textSI`. Aero fighter has heat: `hsType`/`hsCount`/`heatSinkPips` (aerospace template); conventional fighter template has NO heat sink IDs.

**Proto location codes**: HD=Head, T=Torso, L=Legs (single combined), LA=Left Arm, RA=Right Arm, MG=Main Gun. **Quad has NO arm IDs** — quad `bindings.ts` must omit LA/RA. Glider template adds `wings_hit_label`/`wings_hit_text` (no IdConstants field — glider-specific damage markers, not binding targets) and uses `mpGround` not `mpJump`.

**Templates have `grouped` variants**: e.g. `armorPipsLSgrouped`, `armorPipsRSgrouped`. The pip engine's grouped-fallback (`getElementById(id + "grouped")`) is for exactly this — when the primary pip region is absent, retry the `grouped` element.

**Mech `ELEMENT_IDS`** live in `constants.ts` — the shared header IDs (`type`,`tonnage`,`techBase`,`bv`,`mpWalk`,`engineType` etc.) are identical to the non-mech `SHARED_TEMPLATE_IDS`. Mech also has `ARMOR_TEXT_IDS`/`STRUCTURE_TEXT_IDS`/`BIPED_PIP_GROUP_IDS` etc.

**Verify commands confirmed working**: `npx tsc --noEmit`, `npx oxlint <files>`, `npx oxfmt --check <files>`, `npx jest <testfile>`. Pre-commit hook runs the full build (`npm run build`) — slow but it's the gate.

## [2026-05-15] Data shapes for family adapters
**Printing types** at `src/types/printing/` — `RecordSheetVariantTypes.ts` has the variant interfaces; `index.ts` re-exports. Import from `@/types/printing`.

**`IVehicleRecordSheetData`**: `unitType:'vehicle'`, `motionType` (Tracked|Wheeled|Hover|VTOL|WiGE|Naval|Submarine|Rail), `turretConfig` (None|Single|Dual|Front|Rear|Sponson), `cruiseMP`/`flankMP`, `armorType`, `armorLocations: IVehicleLocationArmor[]` (each has `location` ∈ Front|Left Side|Right Side|Rear|Turret|Rotor|Chin|Body, `current`, `maximum`, optional `bar`), `crew: IVehicleCrewMember[]`, `equipment`, `barRating?`.
- selectTemplate mapping: motionType VTOL → `vtol`, else → `vehicle` (Wave-1 only handles these two; Naval/Submarine/WiGE are out-of-scope — adapter should still return a vehicle key or throw a clear error). turretConfig None → `noturret`, Single/Front/Rear/Sponson → `turret`, Dual → `dualturret`. weight always `standard`.
- NOTE: NO per-location `structure` array on vehicle data — vehicle internal structure on the sheet is derived; check whether `IVehicleRecordSheetData` carries structure or if it must be computed. The vehicle template has `structurePips*` groups.

**`IAerospaceRecordSheetData`**: `unitType:'aerospace'`, `structuralIntegrity` (number — drives `siPips`), `fuelPoints`, `safeThrust`/`maxThrust`, `heatSinks: IRecordSheetHeatSinks`, `armorType`, `armorArcs: IAerospaceArcArmor[]` (each `arc` ∈ Nose|Left Wing|Right Wing|Aft, `current`, `maximum`), `bombBaySlots`. NO explicit conventional-vs-aerospace discriminator field — selectTemplate must distinguish via another signal (heatSinks present? safeThrust? — INVESTIGATE: conventional fighters have no fusion engine/heat sinks the same way; check the header or a flag). May need a derived check.

**`IProtoMechRecordSheetData`**: `unitType:'protomech'`, `pointSize`, `protos: IProtoMechUnit[]` (each `index`, `armorByLocation: Record<'Head'|'Torso'|'Left Arm'|'Right Arm'|'Legs'|'Main Gun', {current,maximum}>`), `mainGun?`, `hasUMU`, `isGlider` (boolean), `walkMP`, `jumpMP`.
- **NO `isQuad` field** — quad must be DERIVED: quad ProtoMechs have no arms, so `protos[0].armorByLocation` will have 0/absent 'Left Arm'+'Right Arm'. selectTemplate priority: `isGlider` → `protomek_glider`; else no-arms → `protomek_quad`; else → `protomek_biped`. Confirm the quad-detection signal during 5.1 — may need to check armorByLocation arm entries are 0/undefined, OR there may be a better field on the construction unit upstream. The bindings adapter consumes the FIRST proto (one-per-page per Wave-1 non-goal).
- Proto ProtoMech has STRUCTURE too (`structurePips*` groups in template) — but `IProtoMechUnit.armorByLocation` only has armor. Structure values must be derived from tonnage (ProtoMechs 2-15t). INVESTIGATE during 5.2.

**Skeleton renderers** (Phase 6 fallback): `renderVehicleSVG(IVehicleRecordSheetData)`, `renderAerospaceSVG`, `renderProtoMechSVG` — all return a complete `<svg>` string at 612×792. They are self-contained string builders. `renderTemplated`'s catch block calls these directly.

**ArmorPipLayout** (the pip-engine seed): lives at `src/services/printing/ArmorPipLayout.ts` (+ `.grouped.ts`, `.processing.ts`, `.types.ts` leaves). `ArmorPipLayout.addPips(svgDoc, group, pipCount, {fill,strokeWidth,className,staggered,groupByFive})` — already reads region `<rect>` geometry via `Bounds.fromRect`, supports `mml-multisection` style + `mml-gap`. It draws `<circle>` pips. The shared pip engine generalizes/wraps this. `Bounds` is re-exported from `ArmorPipLayout.ts`.

**`armor.ts` mech consumer**: biped uses pre-made pip SVG files (`PREMADE_PIP_TYPES=['biped']`); non-biped (quad/tripod) uses `generateDynamicArmorPips` → `ArmorPipLayout.addPips` with the `*_PIP_GROUP_IDS` maps. Task 2.4 = confirm `armor.ts` routes through the shared engine with zero behavior change.

**`template.ts`**: `loadSVGTemplate(path)` (fetch + DOMParser + validation, returns `{svgDoc, svgRoot}`), `addDocumentMargins`, `hideSecondCrewPanel`, `fixCopyrightYear`, `setTextContent(svgDoc,id,text)`. The shared `TemplateRecordSheetRenderer` reuses these verbatim.

**`canvas.ts`**: `renderToCanvasHighDPI(svgString, canvas, dpiMultiplier)` — base 612×792, scales SVG 576×756 into it.

**`getBBox()` hazard — RESOLVED**: confirmed `Bounds.fromRect` reads `x/y/width/height` ATTRIBUTES, NOT `getBBox()`. The mech pip path is attribute-based — no live DOM needed for rect geometry, and jsdom (no real getBBox) works fine. The off-screen-mount helper (task 1.2) IS implemented in `TemplateRecordSheetRenderer.mount()/unmount()` and the spec scenario is satisfied, but its code comment is precise: it's the live-DOM substrate for any future `getBBox()` path + web-font-aware text measurement, not load-bearing for the current attribute-based rect reads.

## [2026-05-15] Phase 1+2 shipped (PR #580)
**Shared core APIs** (`templateRecordSheetRenderer.ts`):
- `TemplateRecordSheetRenderer` class. `loadTemplate(path)` → fetch+parse via `loadSVGTemplate`. `document`/`root` getters throw `'Template not loaded...'` if not loaded. `mount()`/`unmount()` (idempotent) — mount MOVES the svgRoot out of svgDoc into an off-screen `<div>`; unmount RESTORES it back into svgDoc. `awaitFontsReady()`. `applyBindings(texts: Record<id,string>)` → `setTextContent` per entry, absent IDs skipped. `applyPips(fills: PipFill[], applicator)` — resolves group (+`grouped` fallback), invokes applicator. `getSVGString()` → unmounts first (restores root), then `serializeToString(doc)`. `renderToCanvas(canvas, dpi)`.
- `PipFill` type: `{groupId, count, className?, grouped?}`. `TextBindings` = `Readonly<Record<string,string>>`.
- **GOTCHA solved**: `mount()` moving root out of doc means `serializeToString(doc)` returns EMPTY while mounted. Fix: `unmount()` re-appends root to svgDoc; `getSVGString()` calls `unmount()` before serializing. Family adapters: call `mount()` before pip layout, then `getSVGString()` (which auto-unmounts). Never serialize while mounted.

**Pip engine APIs** (`pipEngine.ts`):
- `resolvePipGroup(svgDoc, groupId)` → `Element | null`, tries `groupId` then `groupId+'grouped'`.
- `layoutPips(svgDoc, groupId, count, opts?)` → `boolean` — resolves (with grouped fallback) + delegates to `ArmorPipLayout.addPips`. Returns false for count≤0 or unresolvable.
- `layoutPipsInGroup(svgDoc, group, count, opts?)` — already-resolved-group variant (no fallback).
- `PipLayoutOptions`: `{fill?, strokeWidth?, className?, staggered?, clustered?}`. `clustered` maps to `ArmorPipLayout`'s `groupByFive`. Defaults: fill `#FFFFFF`, stroke `0.5`, clustered false.
- Pips render as `<circle>` elements appended into the group. **Pip-count fidelity** (the hard gate): `group.querySelectorAll('circle').length` === count after `layoutPips`. Verified in pipEngine tests.

**Mech path** routes `armor.ts` + `structure.ts` through `layoutPipsInGroup` — behavior-preserving, all 5 mech snapshots + 219 record-sheet tests pass.

**For family adapters (Phases 3-5)**: each `bindings.ts` returns `{ texts: TextBindings, pips: PipFill[] }`. The renderer (Phase 6 `renderTemplated`) will: `new TemplateRecordSheetRenderer()` → `loadTemplate(selectTemplate(unit) joined with paper dir)` → `mount()` → `applyBindings(texts)` → `applyPips(pips, pipEngineApplicator)` → `getSVGString()`. The pip applicator passed to `applyPips` is `(doc, group, fill) => layoutPipsInGroup(doc, group, fill.count, {className: fill.className, clustered: fill.grouped})`.

## [2026-05-15] Phases 3-5 shipped (PR #581) — family adapters
**CRITICAL bug fixed in shared core**: `mount()` MOVES the svgRoot out of svgDoc. `applyBindings`/`applyPips` originally used `doc.getElementById` → returned `null` after mount because the root was detached. FIXED: added private `elementById(id)` that searches `this.svgRoot.querySelector('#'+CSS.escape(id))` — mount-safe (works whether root is in doc or container). The mech path never mounts so was unaffected, but ANY templated render (which mounts) needs this. `setTextContent` import dropped from the shared core (lookup inlined).

**Adapter API surface** — Phase 6 `renderTemplated` consumes these:
- `vehicle/selectTemplate.ts` → `selectVehicleTemplate(IVehicleRecordSheetData): VehicleTemplateKey`. Throws on Naval/Submarine/WiGE/Rail (out of scope).
- `vehicle/bindings.ts` → `bindVehicle(data): VehicleBindings { texts, pips, pipCounts }`. `computeVehiclePipCounts` exported separately.
- `aerospace/selectTemplate.ts` → `selectAerospaceTemplate(data): AerospaceTemplateKey`. Branches on `data.isConventional`.
- `aerospace/bindings.ts` → `bindAerospace(data): AerospaceBindings`.
- `protomech/selectTemplate.ts` → `selectProtoMechTemplate(data): ProtoMechTemplateKey`. Priority: isQuad > isGlider > biped.
- `protomech/bindings.ts` → `bindProtoMech(data): ProtoMechBindings`. ProtoMech structure DERIVED from tonnage (canonical TW table: torso IS=tonnage, head IS 1/2/3/4 by weight, leg IS by weight+quad, MG IS 1 or 2). Arm pips OMITTED for quads.

**templateKey → filename**: `selectTemplate` returns the KEY (e.g. `vehicle_turret_standard`, `fighter_aerospace`, `protomek_biped`). Phase 6 `renderTemplated` must build the asset path. NOTE the mismatch: vehicle/proto keys MATCH the registered filenames (`vehicle_turret_standard.svg`, `protomek_biped.svg`), BUT aerospace keys are `fighter_aerospace`/`fighter_conventional` while the registered FILES are `fighter_aerospace_default.svg`/`fighter_conventional_default.svg`. Phase 6 path-building must append `_default.svg` for aero keys and `.svg` for vehicle/proto keys — OR normalize. Cleanest: a per-family key→filename map in `renderTemplated`.

**Type additions** (in `RecordSheetVariantTypes.ts`): `IAerospaceRecordSheetData.isConventional?: boolean`, `IProtoMechRecordSheetData.isQuad?: boolean`. Both optional, default false.

**Fidelity gate** (`pipCountFidelity.test.ts`): the hard gate is GREEN. Renders via the real `TemplateRecordSheetRenderer`+`pipEngine` path (the exact Phase 6 path), parses output, asserts `<circle>` count per group === stats. Negative control included. Phase 6's `renderTemplated` should produce identical pip counts.

**Skeleton fallback signatures** (Phase 6): `renderVehicleSVG(IVehicleRecordSheetData)`, `renderAerospaceSVG(IAerospaceRecordSheetData)`, `renderProtoMechSVG(IProtoMechRecordSheetData)` — all in the renderer dir, all return `<svg>` string. `renderTemplated`'s catch calls these.

## [2026-05-15] Phase 6 shipped (PR #582) — dispatch
**`renderTemplated.ts`**: NEW module. `renderTemplated(data: TemplatedUnitData, paperSize)` → async, switches vehicle/aerospace/protomech to per-family `render{Vehicle,Aerospace,ProtoMech}Templated` (each try/catch → skeleton fallback). `isTemplatedUnit(data)` type-guard narrows to `TemplatedUnitData`. Battle-armor/infantry NOT handled here (avoids cycle with renderer.ts) — they stay on `renderRecordSheetSVG`.

**`renderRecordSheetSVG` stays SYNC + skeleton-only** — it's the fallback dispatch + the direct test surface (`RecordSheetMultiTypeExport.test.ts` calls it sync). `renderTemplated` is the NEW async template-primary path.

**`RecordSheetService.buildNonMechSVG`** is now `async (data, paperSize)`: `isTemplatedUnit(data)` → `renderTemplated`, else → `renderRecordSheetSVG`. All 3 callers (`renderPreview`/`getSVGString`/`exportPDF`) were already async — just added `await` + paperSize arg.

**Skeleton fallback marker**: `renderVehicleSVG` output contains the literal `'Vehicle Record Sheet'` (footer text) — useful for asserting fallback path in tests.

**F-wave readiness**: F1 (typecheck/lint), F2 (full test), F6 (`openspec validate --strict`) — all runnable post-merge. F5 = omo-spec-verifier (delegate). F3/F4 = manual customizer QA — cannot dev-browser headlessly without a running dev server; document as code-review-verified via the dispatch + fallback tests which exercise the exact `exportPDF` → `buildNonMechSVG` → `renderTemplated` path.

## [2026-05-15] Final Verification Wave — PASSED
- **F1**: `npx tsc --noEmit` clean; `npm run lint` 0 warnings/0 errors across 2184 files; `npx oxfmt --check` clean.
- **F2**: 374 record-sheet tests pass (17 suites) incl. 3 per-family pip-count fidelity gates + 5 mech snapshots zero-diff. Full CI suite green on every PR.
- **F3** (manual customizer Save PDF): code-review-verified — `RecordSheetService.exportPDF` → `buildNonMechSVG` → `renderTemplated` chain exercised end-to-end by `RecordSheetService.test.ts` + `renderTemplated.test.ts` template-path suite (vehicle/aerospace/protomech, US + ISO paper). Headless dev-browser not available in this orchestration context.
- **F4** (forced-failure QA): code-review-verified — `renderTemplated.test.ts` skeleton-fallback suite forces asset failure (404 all sources) + malformed-SVG and asserts each family degrades to its skeleton renderer, never blank.
- **F5** (spec-coverage): self-verified per-requirement scan — all 8 requirements across the 2 delta specs (5 ADDED + 1 MODIFIED in record-sheet-export; 2 ADDED + 1 MODIFIED in mm-data-asset-integration) have implementation + passing test coverage. The MODIFIED `MmData Asset Service` "Non-mech template loading via shared renderer" scenario surfaced a real gap (shared core used raw fetch, not `MmDataAssetService.loadSVG`) — FIXED in PR #583. VERDICT: APPROVE.
- **F6**: `npx openspec validate add-templated-vehicle-aero-proto-record-sheets --strict` → valid.

**5 PRs total**: #579 (Phase 0), #580 (Phases 1-2), #581 (Phases 3-5), #582 (Phase 6), #583 (Phase 7 spec-coverage fix). All squash-merged to main.
