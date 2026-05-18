# Design: Add Templated Vehicle / Aerospace / ProtoMech Record Sheets

## Technical Approach

The mech record sheet already works correctly. The strategy is to
**extract** the proven mech rendering core into shared, type-agnostic
modules, then write thin per-family adapters that feed those modules.
No new rendering technology is introduced — jsPDF, `DOMParser`,
`getElementById` ID-injection, and dynamic pip layout are all already
in production for the mech path.

The decomposition has three layers:

```
                 renderer.ts  (dispatch + renderTemplated)
                        |
        ┌───────────────┼────────────────┐
        |               |                |
  selectTemplate.ts  bindings.ts   TemplateRecordSheetRenderer
   (per family)      (per family)   + shared pip engine  (shared)
                                            |
                                     MmDataAssetService
                                     (3-source fallback)
```

- **Shared core** (`TemplateRecordSheetRenderer`, shared pip engine) —
  unit-type-agnostic. Owns asset loading, DOM parsing, text injection,
  pip layout, canvas rasterization, jsPDF.
- **Per-family adapters** (`vehicle/`, `aerospace/`, `protomech/`) —
  two pure functions each. Know their family's templates and data
  shape; know nothing about DOM or I/O.
- **Dispatch** (`renderer.ts`) — picks family, runs the template path,
  falls back to skeleton on failure.

## Architecture Decisions

### Decision: Extract a shared `TemplateRecordSheetRenderer` rather than fork per family

**Choice**: Promote the mech renderer's template-handling core into a
shared `TemplateRecordSheetRenderer` consumed by both the mech path and
the three new families.

**Rationale**: The mech path's `loadSVGTemplate` / `setTextContent` /
canvas / jsPDF code is proven in production. Forking it per family
would create four divergent copies of the highest-risk code. A single
shared core means the mech snapshot tests guard every family's
rendering substrate.

**Alternatives considered**: (a) Copy the mech renderer per family —
rejected, multiplies the proven code and its bugs by four. (b) Keep the
skeleton string-builders and improve them — rejected, they cannot
reach canonical-layout fidelity without re-implementing template
injection, which is the shared core anyway.

### Decision: Per-family adapters are pure functions, no I/O

**Choice**: `selectTemplate.ts` and `bindings.ts` are deterministic
pure functions — no fetch, no DOM, no asset access.

**Rationale**: Purity makes the fidelity gate cheap: `bindings.ts` can
be unit-tested by asserting the `PipCounts` contract directly, with no
browser or network. It also localizes all I/O risk in the shared core,
where it is already handled.

**Alternatives considered**: Let adapters call `MmDataAssetService`
directly — rejected, scatters I/O and makes adapters un-unit-testable
without mocking the asset service.

### Decision: Vehicle template key mirrors `PrintTank.getSVGFileName()`

**Choice**: Vehicle `templateKey` is `{subtype}_{turret}_{weight}`,
e.g. `vehicle_turret_standard`, `vtol_noturret_standard`.

**Rationale**: MegaMekLab `PrintTank.java` already encodes the correct
mapping from a unit's structural attributes to a template filename.
Mirroring it means the key generation is verifiable against a
canonical Java reference rather than invented.

**Alternatives considered**: A bespoke key scheme — rejected, would
diverge from mm-data's filename convention and require its own
correctness argument.

### Decision: Template-primary with skeleton fallback (not skeleton deletion)

**Choice**: `renderTemplated` wraps the template path in `try/catch`;
on failure it returns the existing skeleton renderer's output. The
skeleton renderers stay in the tree.

**Rationale**: The three-source asset chain can still fail entirely
(offline, CDN + GitHub both unreachable). A hard failure must not
produce a blank PDF. The skeleton renderer is a known-good degraded
output. Deleting the skeletons now would remove the safety net before
pip-parity is proven in production; a later cleanup change removes them
once verified.

**Alternatives considered**: Delete skeletons immediately — rejected,
removes the offline story and the fallback before it is proven
unnecessary. Render a blank/error sheet on failure — rejected, worse
UX than the skeleton.

### Decision: Phase-0 element-ID extraction before any renderer code

**Choice**: tasks.md Phase 0 registers assets and extracts each
template's `id=` set into a frozen typed const, reviewed against the
MegaMekLab `Print*` field names, before any rendering code is written.

**Rationale**: The non-mech templates do **not** share the mech
`ELEMENT_IDS`. Header IDs (`type`, `tonnage`, `bv`, ...) are shared,
but location-specific armor pip IDs differ per family. Authoring
`bindings.ts` against guessed IDs would produce silent no-op
injections. Extracting the real ID set first turns an ID typo into a
type error.

## Data Flow

1. **Customizer Save PDF** — `PreviewTab.handleExportPDF` →
   `RecordSheetService.exportPDF`.
2. **Extract** — `RecordSheetService` routes `extractData(unit)` to the
   type-specific extractor, producing the matching `IRecordSheetData`
   variant.
3. **Dispatch** — `renderer.ts` `renderRecordSheetSVG` inspects
   `data.unitType`. For vehicle / aerospace / protomech it enters
   `renderTemplated`; for mech it uses the (refactored) mech consumer;
   for infantry / battlearmor it uses the skeleton renderer.
4. **Select template** — the family `selectTemplate(unit)` returns a
   `templateKey`; the renderer joins it with the paper-size directory
   (`templates_us` / `templates_iso`) into an asset path.
5. **Load** — `TemplateRecordSheetRenderer.loadTemplate(path)` →
   `MmDataAssetService.loadSVG` → three-source fallback → `DOMParser`
   document.
6. **Mount off-screen** — the renderer mounts the parsed SVG into an
   off-screen DOM node so `getBBox()` works (see Browser Hazards).
7. **Bind** — the family `bindings(data)` produces `{ texts, pips }`;
   `applyBindings(texts)` injects text by element ID; `applyPips` /
   the pip engine lays out pip elements from measured region geometry.
8. **Rasterize** — `getSVGString()` → canvas at high DPI → JPEG →
   jsPDF, exactly as the mech path does.
9. **On any failure in 4–8** — `renderTemplated`'s `try/catch` invokes
   the family skeleton renderer and returns its SVG.

## Browser Hazards and Mitigations

### `getBBox()` requires a live-mounted SVG

The shared pip engine measures template region `<rect>` geometry with
`getBBox()`, which returns zeroed bounds for an element not attached to
a rendered document. **Mitigation**: the renderer MUST mount the parsed
SVG into an off-screen DOM container (e.g. an absolutely-positioned,
visibility-hidden node, or a node off-viewport) **before** the pip
engine runs, and remove it after `getSVGString()`. A pip-engine task
asserts this ordering; the spec records the live-DOM requirement
explicitly.

### Web-font load race on text auto-shrink

If any binding field auto-shrinks to fit (measuring text width to pick
a font size), measuring before the record-sheet web font has loaded
yields wrong widths and inconsistent shrink. **Mitigation**: await
`document.fonts.ready` (already a concern on the mech path) before
text-width measurement; the shared core centralizes this so all
families inherit the fix.

### jsPDF + svg2pdf path fidelity

Complex SVG paths can rasterize imperfectly through the canvas → JPEG
→ jsPDF chain. **Accepted risk** — the mech path already lives with
this and produces acceptable output. No new mitigation; the templated
non-mech path inherits the same known-good behavior.

### Per-family element IDs differ from mech `ELEMENT_IDS`

Non-mech templates share header IDs but diverge on location-specific
pip IDs. **Mitigation**: the Phase-0 element-ID catalog (frozen typed
const, reviewed against `PrintTank` / `PrintAero` / `PrintProtoMek`)
makes `bindings.ts` bind only against real IDs, catching typos at
type-check time.

## Fidelity Gate

The hidden hard requirement is **pip-count accuracy**: a record sheet
that draws the wrong number of armor pips is wrong even if it looks
canonical. Each family adapter therefore ships a test that:

1. Renders a fixture with known per-location armor / structure values.
2. Parses the output SVG.
3. Counts pip elements (`<circle>` / the template's pip element) per
   location.
4. Asserts each count equals the fixture's actual stat for that
   location.

This is the acceptance criterion that distinguishes "looks right" from
"is right" and is the gate before the future skeleton-deletion change.

## File Changes

- **New**: `src/services/printing/svgRecordSheetRenderer/templateRecordSheetRenderer.ts`
  — shared `TemplateRecordSheetRenderer` (loadTemplate / applyBindings /
  applyPips / getSVGString).
- **New**: a shared pip-engine module in
  `src/services/printing/svgRecordSheetRenderer/` — region-geometry pip
  layout with the `grouped` fallback and alternate-clustering flag,
  generalized from `armor.ts`.
- **New**: `src/services/printing/svgRecordSheetRenderer/vehicle/{selectTemplate.ts,bindings.ts}`.
- **New**: `src/services/printing/svgRecordSheetRenderer/aerospace/{selectTemplate.ts,bindings.ts}`.
- **New**: `src/services/printing/svgRecordSheetRenderer/protomech/{selectTemplate.ts,bindings.ts}`.
- **New**: a frozen typed element-ID catalog const (one section per
  Wave-1 family).
- **New**: Jest tests — shared-core tests, per-family adapter tests,
  per-family pip-count fidelity tests, with committed fixtures.
- **Modified**: `src/services/printing/svgRecordSheetRenderer/renderer.ts`
  — `renderRecordSheetSVG` dispatch gains the `renderTemplated`
  template-primary / skeleton-fallback path for vehicle / aerospace /
  protomech.
- **Modified**: `src/services/printing/svgRecordSheetRenderer/renderer.ts`
  (mech) / `SVGRecordSheetRenderer` — refactored into a thin consumer
  of `TemplateRecordSheetRenderer`, no behavior change.
- **Modified**: `config/mm-data-assets.json` — Wave-1 non-mech template
  entries added under `templates_us` and `templates_iso`.
- **Modified**: `src/services/assets/MmDataAssetService.ts` — resolves
  the new non-mech template paths (may need only config-driven path
  handling if the service is already pattern-generic).
- **Modified**: the asset-sync script — copies the registered Wave-1
  non-mech templates into `public/record-sheets/templates_us` /
  `templates_iso`.
- **Not modified, not deleted**: `vehicleRenderer.ts`,
  `aerospaceRenderer.ts`, `protoMechRenderer.ts` (kept as fallback);
  `battleArmorRenderer.ts`, `infantryRenderer.ts` (out of scope,
  Wave 2).

## Decisions discovered during execution

These decisions emerged while implementing the change and were each
referenced by two or more tasks; per the notepad graduation rule they
are promoted here so the permanent design record reflects the as-built
reality. The planned Architecture Decisions above remain unchanged.

### Decision: mount() moves the SVG root; unmount() restores it

**Choice**: `TemplateRecordSheetRenderer.mount()` moves the parsed SVG
root out of its `DOMParser` document and into an off-screen `<div>`
container; `unmount()` moves it back. `getSVGString()` always
unmounts before serializing, and `applyBindings` / `applyPips` resolve
element IDs by querying the SVG root subtree (mount-safe) rather than
`document.getElementById`.

**Rationale**: `DOMParser` documents are not attached to the page, so
`getBBox()` returns zeroed bounds for their elements. Mounting the
root into the live page makes geometry and web-font measurement work.
But once the root is moved into the container, `document.getElementById`
returns `null` and serializing the document yields an empty string —
so binding must query the root subtree, and `getSVGString` must restore
the root (via `unmount`) before serializing the document. The mech
path never mounts and is unaffected; its 5 snapshots confirm zero
behaviour change.

**Discovered during**: Tasks 1.2, 1.4, 1.5, 3.3, 4.3, 5.3 (the
fidelity gates render through the mounted path and surfaced the
empty-output bug), 6.1.

### Decision: the shared pip engine wraps ArmorPipLayout rather than rewriting it

**Choice**: the shared pip engine (`pipEngine.ts`) is a thin wrapper
over the existing `ArmorPipLayout` class — `layoutPips` /
`layoutPipsInGroup` delegate to `ArmorPipLayout.addPips`, adding only
the `grouped` element-lookup fallback (`resolvePipGroup`) and the
`groupByFive` → `clustered` flag rename. `ArmorPipLayout` is not
modified.

**Rationale**: `ArmorPipLayout` is the proven MegaMekLab-derived
region-geometry layout already in production for non-biped mechs. The
dynamic pip *logic* the design speaks of promoting already lives there;
`armor.ts` only held the group-ID resolution and the per-location loop.
Wrapping rather than rewriting keeps the mech path's pip output
byte-identical (verified: 5 snapshots zero-diff) and keeps the engine
small.

**Discovered during**: Tasks 2.1, 2.4, 3.3, 4.3, 5.3.

### Decision: discriminator fields added to the aerospace and protomech record-sheet types

**Choice**: `isConventional?: boolean` was added to
`IAerospaceRecordSheetData` and `isQuad?: boolean` to
`IProtoMechRecordSheetData` (both optional, default false).

**Rationale**: the per-family `selectTemplate` adapters are pure
functions of the `IRecordSheetData` variant. But the aerospace variant
carried no aerospace-vs-conventional-fighter signal and the protomech
variant had `isGlider` but no `isQuad` — so the pure adapter could not
choose `fighter_conventional` vs `fighter_aerospace` or
`protomek_quad` vs `protomek_biped` without a heuristic. MegaMekLab
`PrintAero` / `PrintProtoMek` branch on `aero instanceof ConvFighter`
and `proto.isQuad()` — structural facts of the unit. Surfacing them as
explicit boolean fields keeps `selectTemplate` pure and verifiable,
mirroring the Java reference exactly; `isGlider` already set this
precedent.

**Discovered during**: Tasks 4.1, 4.2, 5.1, 5.2.

### Decision: templateKey → filename mapping lives in the dispatch layer

**Choice**: `selectTemplate` adapters return a semantic `templateKey`
(e.g. `fighter_aerospace`); the dispatch layer (`renderTemplated`)
owns the key → filename → asset-path resolution, including the
`_default` suffix for aerospace filenames and the `templates_us` /
`templates_iso` paper-size directory.

**Rationale**: vehicle and protomech keys equal their registered
filenames, but the aerospace keys (`fighter_aerospace` /
`fighter_conventional`) deliberately omit the `_default` suffix the
registered files carry — the key stays a clean semantic identifier and
the filename artifact is resolved in one place. The dispatch layer is
the single component that knows about paper sizes and file extensions.

**Discovered during**: Tasks 4.1, 6.1.

### Decision: the shared renderer loads templates through MmDataAssetService

**Choice**: `TemplateRecordSheetRenderer.loadTemplate` resolves
templates through `MmDataAssetService.loadSVG` (three-source fallback +
cache), then parses with the extracted `parseSVGTemplate` helper —
rather than the mech path's raw-`fetch` `loadSVGTemplate`.

**Rationale**: the `mm-data-asset-integration` delta requires non-mech
template loading to go through `MmDataAssetService` so the local → CDN
→ GitHub-raw fallback chain applies. The mech path's raw `fetch` is a
pre-existing limitation that should not propagate to the new shared
core; routing through `loadSVG` is strictly better (offline / CDN
resilience) and is what the spec mandates. `loadSVGTemplate` was
refactored to compose the same `parseSVGTemplate` helper, so the mech
path is unchanged.

**Discovered during**: Task F5 spec-coverage verification; the fix
shipped as a Phase-7 follow-up. Referenced by the
`mm-data-asset-integration` MODIFIED `MmData Asset Service` requirement
and the `record-sheet-export` Shared Template Record Sheet Renderer
requirement.
