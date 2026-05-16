# Decisions — add-templated-vehicle-aero-proto-record-sheets

(Architecture decided by OMO Council, recorded in design.md. This file
captures decisions discovered DURING execution. Decisions referenced by
2+ tasks graduate into design.md before archive.)

## [2026-05-15] Decision: mount() moves the SVG root; unmount() restores it
**Choice**: `TemplateRecordSheetRenderer.mount()` moves the parsed SVG root OUT of its `DOMParser` document and into an off-screen `<div>` container; `unmount()` moves it back into the document. `getSVGString()` always calls `unmount()` before serializing.
**Rationale**: `DOMParser`-created documents are not attached to the page, so `getBBox()` returns zeroed bounds for their elements. Mounting the root into the live page makes geometry + web-font measurement work. But serializing the *document* while the root is detached from it returns an empty string — so unmount must restore the root, and serialization must happen post-unmount. Serializing the document (not the root) keeps the output byte-identical to the pre-refactor mech path.
**Discovered during**: Tasks 1.2 (mount helper), 1.4 (mech refactor — found the empty-string bug), 1.5 (shared-core tests). Will be referenced again by Phase 6 (`renderTemplated` mount/serialize ordering).
**Referenced by tasks**: 1.2, 1.4, 1.5, 6.1 — GRADUATES to design.md.

## [2026-05-15] Decision: pip engine wraps ArmorPipLayout, not a rewrite
**Choice**: the shared pip engine (`pipEngine.ts`) is a thin wrapper over the existing `ArmorPipLayout` class — `layoutPips`/`layoutPipsInGroup` delegate to `ArmorPipLayout.addPips`, adding only the `grouped` element-lookup fallback (`resolvePipGroup`) and surfacing the `groupByFive`→`clustered` flag rename. `ArmorPipLayout` itself is NOT modified.
**Rationale**: `ArmorPipLayout` is the proven MegaMekLab-derived region-geometry layout already in production for non-biped mechs. The design.md says "promote the dynamic pip-layout logic from `armor.ts`" — but the *logic* already lives in `ArmorPipLayout`; `armor.ts` only had the group-ID resolution + the per-location loop. Wrapping rather than rewriting keeps the mech path's pip output byte-identical (verified: 5 snapshots zero-diff) and the engine stays a few dozen lines.
**Discovered during**: Tasks 2.1 (promote pip logic), 2.4 (confirm mech consumes engine).
**Referenced by tasks**: 2.1, 2.4, 3.3, 4.3, 5.3 (fidelity gates all rely on the engine) — GRADUATES to design.md.

## [2026-05-15] Decision: add discriminator fields to aero/proto record-sheet types
**Choice**: add `isConventional?: boolean` to `IAerospaceRecordSheetData` and `isQuad?: boolean` to `IProtoMechRecordSheetData`. Both default-false (optional).
**Rationale**: `selectTemplate` is a PURE function of the record-sheet data variant (design.md "adapters are pure functions, no I/O"). But `IAerospaceRecordSheetData` had no aerospace-vs-conventional-fighter signal, and `IProtoMechRecordSheetData` had `isGlider` but no `isQuad` — so the pure adapter could not pick `fighter_conventional` vs `fighter_aerospace` or `protomek_quad` vs `protomek_biped` without a heuristic. MegaMekLab `PrintAero`/`PrintProtoMek` `getSVGFileName()` branch on `aero instanceof ConvFighter` / `proto.isQuad()` — structural facts of the unit. Surfacing them as explicit boolean fields on the record-sheet data (set by the extractors) keeps `selectTemplate` pure and verifiable, mirroring the Java reference exactly. `isGlider` already set this precedent on the proto type.
**Alternatives rejected**: (a) heuristic on tonnage/thrust — fragile, not canonical. (b) `selectTemplate` taking the raw construction unit — breaks the pure-`IRecordSheetData`→key contract.
**Discovered during**: Tasks 4.1 (aero selectTemplate), 5.1 (proto selectTemplate).
**Referenced by tasks**: 4.1, 4.2, 5.1, 5.2 — GRADUATES to design.md.

## [2026-05-15] Decision: mount-safe element resolution via root-subtree query
**Choice**: `TemplateRecordSheetRenderer.applyBindings` / `applyPips` resolve template element IDs by querying the SVG ROOT subtree (`svgRoot.querySelector('#'+CSS.escape(id))`), not via `document.getElementById`.
**Rationale**: `mount()` re-parents the SVG root out of its `DOMParser` document and into the off-screen container — after which `document.getElementById` returns `null` for every template element. The design data flow has mount (step 6) BEFORE bind (step 7), so binding always runs on a detached-from-document root. Querying the root subtree is correct whether mounted or not. The fidelity gate caught this — pips rendered 0 until the fix. The mech path never mounts, so it never hit the bug; the 5 mech snapshots confirm zero behaviour change.
**Discovered during**: Tasks 3.3/4.3/5.3 (fidelity tests render through the mounted path and surfaced the empty-output bug).
**Referenced by tasks**: 3.3, 4.3, 5.3, 6.1 (renderTemplated relies on mounted-path binding working) — GRADUATES to design.md.

## [2026-05-15] Decision: templateKey → filename mapping lives in renderTemplated
**Choice**: `selectTemplate` adapters return a `templateKey` (e.g. `fighter_aerospace`); `renderTemplated` (Phase 6) owns the key→filename→asset-path mapping.
**Rationale**: the vehicle and protomech keys are identical to their registered filenames, but the aerospace keys (`fighter_aerospace` / `fighter_conventional`) differ from the registered files (`fighter_aerospace_default.svg` / `fighter_conventional_default.svg`). Keeping the `_default` suffix out of the key keeps the key a clean semantic identifier; the suffix is a mm-data filename artifact. The dispatch layer is the single place that knows about paper-size directories and file extensions, so it is the right place to resolve the full asset path.
**Discovered during**: Tasks 4.1 (aero key), 6.1 (renderTemplated path building).
**Referenced by tasks**: 4.1, 6.1 — GRADUATES to design.md.
