# Design: Add Templated Infantry / Battle Armor Record Sheets

## Technical Approach

Wave 1 already built the rendering substrate: a shared
`TemplateRecordSheetRenderer` (asset load, DOM parse, off-screen
mount, text injection, canvas rasterization, jsPDF) and a shared
`pipEngine` (region-geometry pip layout with the `grouped` fallback).
Wave 2 introduces **no new rendering technology**. It adds two thin
per-family adapters and exactly one new pip-engine capability — the
Battle Armor per-trooper pip grid — then flips the dispatch switch.

The decomposition mirrors Wave 1 exactly:

```
              renderTemplated.ts  (dispatch + isTemplatedUnit)
                        |
        ┌───────────────┼────────────────┐
        |               |                |
  selectTemplate.ts  bindings.ts   TemplateRecordSheetRenderer
   (infantry,        (infantry,    + pipEngine  (shared, Wave-1)
    battlearmor)      battlearmor)         |
                                    MmDataAssetService
                                    (3-source fallback)
```

- **Shared core** (`templateRecordSheetRenderer.ts`, `pipEngine.ts`) —
  reused verbatim from Wave 1. The only addition is a Battle Armor
  per-trooper pip-grid helper and an infantry platoon pip-grid helper
  layered onto `pipEngine.ts`; the existing per-location pip layout is
  untouched.
- **Per-family adapters** (`infantry/`, `battlearmor/`) — two pure
  functions each, same contract as the Wave-1 `vehicle/`, `aerospace/`,
  `protomech/` folders.
- **Dispatch** (`renderTemplated.ts`) — `isTemplatedUnit()` widens to
  include `infantry` + `battlearmor`; the `renderTemplated` switch
  gains two cases; `renderer.ts` `renderRecordSheetSVG` keeps the
  skeleton renderers as the fallback path.

## Architecture Decisions

### Decision: Extend the Wave-1 shared core, do not fork it

**Choice**: `TemplateRecordSheetRenderer` and `pipEngine` are consumed
verbatim. The single new capability — the Battle Armor per-trooper pip
grid — is added as a `pipEngine` helper alongside the existing
per-location layout, not as a fork.

**Rationale**: The Wave-1 shared core is proven by the mech path and
three non-mech families, all guarded by snapshot and pip-count
fidelity tests. Forking it for Wave 2 would create a divergent copy of
the highest-risk code. A `pipEngine` helper keeps Battle Armor's
column-grid layout in the one module that already owns pip geometry.

**Alternatives considered**: A separate small-unit renderer — rejected,
duplicates asset-load / mount / rasterize logic. Inlining the
per-trooper grid in `battlearmor/bindings.ts` — rejected, bindings are
pure and must not own DOM geometry.

### Decision: Render the per-unit block template, not the multi-slot outer sheet

**Choice**: `infantry/selectTemplate.ts` returns
`conventional_infantry_platoon`; `battlearmor/selectTemplate.ts`
returns `battle_armor_squad`. The multi-slot outer sheets
(`conventional_infantry_default` / `battle_armor_default`) are
registered as assets but not selected by the Wave-2 adapters.

**Rationale**: MegaMekLab's `PrintSmallUnitSheet` composes a page by
`importNode`-ing each standalone per-unit block into pre-slotted
`unit_N` groups of the outer sheet. The per-unit block is therefore
the atomic, self-contained record sheet; the outer sheet is pure
layout glue. Rendering the per-unit block onto a page directly gives a
correct single-unit MVP and means the deferred composite change reuses
the Wave-2 block 100% with zero rework.

**Alternatives considered**: Render into one `unit_N` slot of the
outer sheet — rejected, couples the MVP to composite layout that is
explicitly deferred and pulls in the `importNode` namespace hazard
unnecessarily.

### Decision: Reproduce `Infantry.getDamagePerTrooper()` verbatim

**Choice**: The infantry damage-per-trooper value is a verbatim
transcription of MegaMek `Infantry.java`'s `getDamagePerTrooper()`,
including the `0.6` primary-weapon damage cap
(`INFANTRY_PRIMARY_WEAPON_DAMAGE_CAP`, per the 09/2021 errata). The
record sheet renders `DAMAGE+j = round(perTrooper × j)` for `j` in
`1..30`.

**Rationale**: The formula is a solved, deterministic ~13-line
calculation in the canonical Java source. It is a transcription task,
not a design decision — inventing a MekStation-specific damage model
would diverge from MegaMek and require its own correctness argument.
The 09/2021 errata cap is a documented constant; reproducing it
verbatim is the only correct option.

**Alternatives considered**: A MekStation-native damage heuristic —
rejected, no canonical basis. Omitting the cap — rejected, produces
damage values that disagree with MegaMek for high-damage primaries.

### Decision: `infantryDamage` becomes a first-class weapon field

**Choice**: Add `infantryDamage` (damage per trooper) to the
construction-domain `IInfantryWeaponEntry` and thread it into the
print-type `IInfantryWeaponSheet`.

**Rationale**: The damage-per-trooper formula needs a per-weapon
damage input. `IInfantryWeaponEntry` today carries only
`damageDivisor` (incoming-damage division — a different quantity), and
`IInfantryWeaponSheet` carries a generic `damage` field that is not
the canonical per-trooper figure. Giving the value an explicit named
home makes the formula's input verifiable and keeps the print
adapter pure. A Phase-0 task verifies whether the infantry-weapon
catalog already supplies a usable value; if not, populating it is an
explicit task in this change.

**Alternatives considered**: Derive damage per trooper inside
`bindings.ts` from `damageDivisor` — rejected, `damageDivisor` is not
the same quantity and bindings must stay pure. Reuse the generic
`damage` field — rejected, it is ambiguous and not guaranteed to be
the per-trooper figure.

### Decision: Add an explicit templated-path exercise guard

**Choice**: Wave 2 adds a test asserting `isTemplatedUnit()` returns
`true` for `infantry` and `battlearmor`, AND that the SVG produced via
`renderTemplated` carries a canonical-template marker absent from the
skeleton renderer's output.

**Rationale** (council preserved-dissent): the existing snapshot tests
run against the skeleton renderers directly. If the template path were
silently broken, `renderTemplated` would catch the failure, fall back
to the skeleton, and every snapshot would still pass — the regression
would be invisible. A marker-based assertion (the inverse of Wave-1's
`isTemplatedUnit` exclusion test, plus a template-derived-output
check) makes a broken template path a hard test failure.

**Alternatives considered**: Trust the snapshot tests — rejected, they
cannot distinguish template output from skeleton fallback. Disable the
fallback in tests — rejected, the fallback is part of the contract and
must stay exercised.

### Decision: Infra-first — register assets and extract IDs before renderer code

**Choice**: Phase 0 registers the five Infantry / Battle Armor
templates, runs `npm run fetch:assets`, extracts each template's `id=`
set into the frozen typed catalog (reviewed against MegaMekLab
`PrintSmallUnitSheet`), and verifies the infantry-weapon catalog
populates a per-weapon damage value — all before any adapter code.

**Rationale**: The small-unit templates do not share the mech or
Wave-1 `id=` sets. Authoring `bindings.ts` against guessed IDs would
produce silent no-op injections. Extracting the real IDs first turns
an ID typo into a type error. The infantry-damage catalog check is in
Phase 0 because its outcome decides whether catalog population is an
in-scope task or already satisfied.

## Data Flow

1. **Customizer Save PDF** — `PreviewTab.handleExportPDF` →
   `RecordSheetService.exportPDF`.
2. **Extract** — `RecordSheetService` routes `extractData(unit)` to the
   infantry / battle-armor extractor, producing the matching
   `IInfantryRecordSheetData` / `IBattleArmorRecordSheetData` variant
   (now carrying per-weapon `infantryDamage`).
3. **Dispatch** — `renderRecordSheetSVG` / the dispatch layer inspects
   `data.unitType`; `isTemplatedUnit()` now returns `true` for
   `infantry` and `battlearmor`, so they enter `renderTemplated`.
4. **Select template** — `infantry/selectTemplate` returns
   `conventional_infantry_platoon`; `battlearmor/selectTemplate`
   returns `battle_armor_squad`. The dispatch layer joins the key with
   the paper-size directory (`templates_us` / `templates_iso`) into an
   asset path.
5. **Load** — `TemplateRecordSheetRenderer.loadTemplate(path)` →
   `MmDataAssetService.loadSVG` → three-source fallback → parsed
   document.
6. **Mount off-screen** — the renderer mounts the parsed SVG into an
   off-screen DOM node so `getBBox()` works (Wave-1 behaviour).
7. **Bind** — `infantry/bindings` / `battlearmor/bindings` produce
   `{ texts, pips }`. For infantry the damage row is computed via the
   damage-per-trooper formula. `applyBindings` injects text by element
   ID; the pip engine lays out the platoon grid (infantry) or the
   per-trooper column grid (battle armor) from measured geometry.
8. **Rasterize** — `getSVGString()` → canvas at high DPI → JPEG →
   jsPDF, exactly as every other family does.
9. **On any failure in 4–8** — `renderTemplated`'s `try/catch` invokes
   the family skeleton renderer (`infantryRenderer` /
   `battleArmorRenderer`) and returns its SVG.

## Browser Hazards and Mitigations

These hazards are inherited from the Wave-1 shared core; the
mitigations already live in `TemplateRecordSheetRenderer`. Wave 2
relies on them and adds no new in-scope hazard.

### `getBBox()` requires a live-mounted SVG

The pip engine measures template region `<rect>` geometry with
`getBBox()`, which returns zeroed bounds for an element not attached
to a rendered document. **Mitigation**: the Wave-1 renderer mounts the
parsed SVG into an off-screen container before the pip engine runs and
unmounts it in `getSVGString()`. The Battle Armor per-trooper pip-grid
helper measures the same way and inherits this mount discipline; a
pip-grid task asserts the ordering.

### Web-font load race on text measurement

Text auto-shrink that measures text width before the record-sheet web
font has loaded yields wrong widths. **Mitigation**: the Wave-1 shared
core awaits `document.fonts.ready` before any text-width measurement;
the infantry damage row and weapon blocks inherit this.

### jsPDF + svg2pdf path fidelity

Complex SVG paths can rasterize imperfectly through the canvas → JPEG
→ jsPDF chain. **Accepted risk** — every other family already lives
with this and produces acceptable output; the Wave-2 families inherit
the same known-good behaviour.

### Multi-unit sub-SVG `importNode` namespace handling — DEFERRED

The multi-unit composite layout `importNode`s each per-unit block into
the outer sheet's `unit_N` slots, which requires careful SVG-namespace
handling on the imported node. This hazard is **relevant only to the
deferred composite change** — Wave 2 renders the per-unit block
directly onto a page and never calls `importNode`. It is recorded here
as a deferred-work hazard so the future composite change accounts for
it; it is not an in-scope Wave-2 hazard.

## Fidelity Gate

The hidden hard requirement is **pip-count accuracy**. Each Wave-2
family adapter ships a test that:

1. Renders a fixture with known stats — per-trooper armor pip counts
   for Battle Armor, platoon trooper count for infantry.
2. Parses the output SVG.
3. Counts pip elements — per trooper column for Battle Armor, in the
   platoon grid for infantry.
4. Asserts each count equals the fixture's actual stat.

A deliberately-wrong fixture must fail the assertion, proving the gate
detects drift. This is the acceptance criterion that distinguishes
"looks right" from "is right".

## Silent-Fallback Guard

Separate from the fidelity gate, Wave 2 ships a test that proves the
**template path itself** is exercised:

1. Assert `isTemplatedUnit()` returns `true` for an
   `IInfantryRecordSheetData` and an `IBattleArmorRecordSheetData`
   payload — the inverse of the Wave-1 exclusion test.
2. Render each family through `renderTemplated` with reachable assets
   and assert the output SVG carries a canonical-template marker that
   the skeleton renderer's output does not contain.

Without this guard a broken template path would fall back silently and
the snapshot tests — which run against the skeletons — would still
pass.

## File Changes

- **New**: `src/services/printing/svgRecordSheetRenderer/infantry/selectTemplate.ts`
  — pure `IInfantryRecordSheetData → templateKey`
  (`conventional_infantry_platoon`).
- **New**: `src/services/printing/svgRecordSheetRenderer/infantry/bindings.ts`
  — pure `IInfantryRecordSheetData → { texts, pips }`, including the
  damage-per-trooper row computation and the platoon `PipCounts`.
- **New**: `src/services/printing/svgRecordSheetRenderer/battlearmor/selectTemplate.ts`
  — pure `IBattleArmorRecordSheetData → templateKey`
  (`battle_armor_squad`).
- **New**: `src/services/printing/svgRecordSheetRenderer/battlearmor/bindings.ts`
  — pure `IBattleArmorRecordSheetData → { texts, pips }`, including the
  per-trooper `PipCounts`.
- **New**: an infantry damage-per-trooper formula module — a verbatim
  reproduction of MegaMek `Infantry.getDamagePerTrooper()` with the
  `0.6` cap, plus the `DAMAGE+j` row generator for `j` in `1..30`.
- **New**: Jest tests — the two adapter unit tests, the Battle Armor
  per-trooper pip-grid test, the infantry damage-per-trooper formula
  test, the two pip-count fidelity tests, the silent-fallback guard
  test, with committed fixtures.
- **Modified**: `src/services/printing/svgRecordSheetRenderer/pipEngine.ts`
  — gains the Battle Armor per-trooper pip-grid helper and the
  infantry platoon pip-grid helper; existing per-location layout
  unchanged.
- **Modified**: `src/services/printing/svgRecordSheetRenderer/renderTemplated.ts`
  — `isTemplatedUnit()` widened to include `infantry` + `battlearmor`;
  `renderTemplated` switch gains the two cases; `TemplatedUnitData`
  union widened; the family skeleton-fallback wrappers added.
- **Modified**: `src/services/printing/svgRecordSheetRenderer/renderer.ts`
  — the `renderRecordSheetSVG` dispatch routes infantry / battlearmor
  through the templated path with skeleton fallback (the dispatch
  detail may live in `renderTemplated.ts` / `RecordSheetService`,
  matching the Wave-1 wiring).
- **Modified**: `src/types/unit/InfantryInterfaces.ts` —
  `IInfantryWeaponEntry` gains `infantryDamage`.
- **Modified**: `src/types/printing/RecordSheetVariantTypes.ts` —
  `IInfantryWeaponSheet` gains the per-trooper damage value.
- **Modified**: `src/utils/construction/infantry/weaponTable.ts` (and /
  or the infantry-weapon catalog) — populates `infantryDamage` for
  every weapon, if Phase 0 finds it absent.
- **Modified**: `config/mm-data-assets.json` — the five Infantry /
  Battle Armor template entries added under `templates_us` and
  `templates_iso`.
- **Modified**: `src/services/printing/svgRecordSheetRenderer/templateElementIds.ts`
  — the frozen ID catalog gains the Infantry / Battle Armor section.
- **Modified**: the asset-sync script — copies the registered
  Infantry / Battle Armor templates into the two local directories.
- **Not modified, not deleted**: `infantryRenderer.ts`,
  `battleArmorRenderer.ts` (kept as the runtime fallback); the mech
  and Wave-1 family renderers and adapters.

## Decisions discovered during execution

### Decision: `infantryDamage` is absent and must be populated in-scope

**Choice**: The Phase-0 task 0.6 check confirmed `IInfantryWeaponEntry`
has no `infantryDamage` field — it carries only `damageDivisor` (a
distinct incoming-damage quantity) — and `INFANTRY_WEAPON_TABLE`
populates no per-trooper damage. Task 1.3 (populate `infantryDamage`
for every weapon) is therefore in scope and was executed: all 12
catalogued infantry weapons gained an `infantryDamage` value sourced
from the representative MegaMek infantry-weapon classes.

**Rationale**: The damage-per-trooper formula needs a per-weapon damage
input; without a populated value the formula has nothing to consume.
The proposal anticipated this conditional ("if Phase 0 finds the value
absent, populating it is an explicit task") — the finding resolves the
conditional to "absent".

**Discovered during**: Tasks 0.6, 1.1, 1.2, 1.3, 1.4.

### Decision: canonical-template marker is a `data-template-source` attribute

**Choice**: The small-unit render path
(`renderViaSmallUnitTemplate`) stamps a `data-template-source=
"mm-data-canonical"` attribute on the output SVG root, exported as
`CANONICAL_TEMPLATE_MARKER` / `CANONICAL_TEMPLATE_MARKER_VALUE` from
`renderTemplated.ts`.

**Rationale**: The silent-fallback guard needs a signal that only the
canonical-template path produces. An attribute on the SVG root is the
cheapest assertable marker; the skeleton renderers never set it, so its
presence proves the template path — not the fallback — produced a given
SVG. The guard test asserts presence on template output and absence on
skeleton output.

**Discovered during**: Tasks 5.2, 5.5, F5.

### Decision: small-unit pip layout runs before mount

**Choice**: `renderViaSmallUnitTemplate` lays out the platoon /
per-trooper pip grids on the parsed document *before* calling
`mount()`; the mount + `awaitFontsReady` step follows only for
web-font-aware text measurement.

**Rationale**: `TemplateRecordSheetRenderer.mount()` detaches the SVG
root from the parsed document, after which `document.getElementById`
returns `null`. The Wave-2 pip-grid helpers resolve their `soldier_N` /
`pips_N` regions via `getElementById` and read geometry from `<rect>`
attributes (`Bounds.fromRect`) — they do not call `getBBox()` and so
need no live DOM. Running the layout before mount avoids the
detached-document hazard. This is the inverse of the Wave-1
`renderViaTemplate` order, which mounts first because the Wave-1
per-location pips measure via `getBBox()`.

**Discovered during**: Tasks 5.2, 5.3, 3.3, 4.3.
