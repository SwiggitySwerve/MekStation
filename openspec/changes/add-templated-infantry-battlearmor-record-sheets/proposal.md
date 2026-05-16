# Add Templated Infantry / Battle Armor Record Sheets

## Why

Wave 1 (`add-templated-vehicle-aero-proto-record-sheets`) wired the
Vehicle / VTOL, Aerospace / Conventional-Fighter, and ProtoMech record
sheets onto the canonical mm-data SVG templates via a shared
`TemplateRecordSheetRenderer` and a shared `pipEngine`. Three families
now produce faithful Total Warfare record sheets; the customizer's
**Save PDF** path renders them through the proven canonical-template
substrate with a skeleton fallback.

Two customizer-editable unit families are still on the old path:
**Infantry** and **Battle Armor**. Their record sheets are produced by
the hand-rolled string-builder skeletons `infantryRenderer.ts` and
`battleArmorRenderer.ts` — simplified SVG with hard-coded geometry, no
canonical template, no dynamic pip layout. `renderTemplated.ts`
explicitly excludes both: `isTemplatedUnit()` returns `false` for
`infantry` and `battlearmor`, with the comment "Battle-armor and
infantry are NOT Wave-1 families". A customizer user who builds a
platoon or a Battle Armor squad and clicks Save PDF gets a visibly
inferior sheet.

mm-data already ships the canonical templates for both families under
`templates_us` / `templates_iso`, verified to exist:
`conventional_infantry_default.svg`,
`conventional_infantry_platoon.svg`,
`conventional_infantry_tables.svg`, `battle_armor_default.svg`, and
`battle_armor_squad.svg`. They use the **same `id=` injection
convention** as every other template. `MmDataAssetService` already
fetches templates at runtime through its three-source fallback chain
(local → jsDelivr CDN → GitHub raw). Wiring the two remaining families
onto the proven template path is therefore a config registration plus
two thin per-family adapters that **extend** the Wave-1 shared core —
it does not rebuild it.

This change is **Wave 2** of the templated record-sheet effort. After
Wave 2, every customizer-editable unit type produces a proper
template-driven PDF record sheet.

## What Changes

The architecture below was decided by an OMO Council and verified; it
is not re-litigated here. This change implements it.

- **Extend the Wave-1 shared core.** No new rendering substrate.
  `TemplateRecordSheetRenderer` and `pipEngine` are reused verbatim;
  the one genuinely new pip-engine capability is the Battle Armor
  **per-trooper pip grid** (4–6 trooper columns, each with its own
  per-suit armor pips). Infantry uses a single platoon pip grid. Both
  are added as pip-engine helpers — the existing per-location pip
  layout is not modified.

- **Two new per-family adapters.** Add `infantry/` and `battlearmor/`
  folders under `src/services/printing/svgRecordSheetRenderer/`, each
  with two **pure** modules mirroring Wave 1:
  - `selectTemplate.ts` — maps a unit to a `templateKey`. Infantry key
    is the per-unit platoon block `conventional_infantry_platoon`;
    Battle Armor key is the per-unit squad block `battle_armor_squad`.
  - `bindings.ts` — maps the unit's `IRecordSheetData` variant
    (`IInfantryRecordSheetData` / `IBattleArmorRecordSheetData`) to a
    `{ texts, pips }` structure keyed against the template's real
    element IDs, with a typed per-family `PipCounts` contract.

- **Infantry damage model — MegaMek formula verbatim.** The infantry
  record sheet's `DAMAGE+j` row uses MegaMek's solved per-trooper
  damage formula. The system reproduces
  `Infantry.getDamagePerTrooper()` (MegaMek
  `Infantry.java`) verbatim — a deterministic ~13-line calculation
  including the documented **0.6 primary-weapon damage cap**
  (`INFANTRY_PRIMARY_WEAPON_DAMAGE_CAP`, per the 09/2021 errata). The
  record sheet then computes `DAMAGE+j = round(perTrooper × j)` for
  trooper counts `j` in `1..30`. This is a transcription, not a design
  session.

- **Infantry per-weapon damage gets a canonical home.** The per-weapon
  `infantryDamage` value the formula consumes is not yet a first-class
  field. The construction-domain infantry weapon entry
  (`IInfantryWeaponEntry`) carries `damageDivisor` but no
  per-trooper-damage value, and the print type `IInfantryWeaponSheet`
  carries a generic `damage` field that is not the canonical
  per-trooper figure. This change adds `infantryDamage` to the
  construction infantry-weapon data model and threads it into
  `IInfantryWeaponSheet`. A Phase-0 task verifies whether the
  infantry-weapon catalog actually populates a usable per-weapon
  damage value; if it does not, populating it is an explicit spec
  task in this change, not a blocker.

- **Single-unit-per-page MVP.** Wave 2 ships **one unit per page**.
  For the single-unit MVP the renderer uses the **per-unit block**
  template — `conventional_infantry_platoon.svg` for an infantry
  platoon, `battle_armor_squad.svg` for a Battle Armor squad — placed
  on a page, **not** the multi-slot outer sheets
  (`conventional_infantry_default.svg` /
  `battle_armor_default.svg`). MegaMekLab's multi-unit composite
  (`PrintSmallUnitSheet`, up to 4 BA squads / 3 infantry platoons per
  page) is pure layout glue that `importNode`s each standalone
  per-unit block into pre-slotted `unit_N` groups — so single-unit
  IS the proper atomic deliverable, and a future composite change
  reuses the per-unit block 100% with zero rework. See Non-Goals.

- **Dispatch — flip the two families to templated.** `isTemplatedUnit()`
  in `renderTemplated.ts` is widened to include `infantry` and
  `battlearmor`; `renderTemplated`'s switch gains the two cases.
  Dispatch stays template-primary with skeleton fallback — the
  existing `infantryRenderer.ts` / `battleArmorRenderer.ts` skeletons
  stay in the tree as the fallback path and are **not** deleted.

- **Infra-first registration.** A Phase-0 sub-task registers the
  Infantry / Battle Armor template paths in
  `config/mm-data-assets.json`, runs the asset fetch
  (`npm run fetch:assets`), extracts each template's `id=` set into a
  frozen typed const reviewed against the MegaMekLab
  `PrintSmallUnitSheet` field names, and verifies the infantry-weapon
  catalog populates a per-weapon damage value — all before any
  renderer code is written.

- **Pip-count fidelity gate.** Each family adapter ships a test that
  parses the output SVG and asserts the rendered pip-element count
  matches the unit's actual stats — per Battle Armor trooper column
  and per infantry platoon block — the same hard gate Wave 1 carries.

- **Silent-fallback guard.** Wave 2 adds an explicit test asserting
  the **template path is actually exercised** for Infantry and Battle
  Armor — not the skeleton fallback. Today's snapshot tests run
  against the skeleton renderers directly, so a broken template path
  would fall back silently and snapshots would still pass. The new
  test asserts `isTemplatedUnit()` returns `true` for both families
  AND that the rendered SVG is template-derived (carries a marker
  only the canonical template path produces).

## Non-Goals

These are explicitly **out of scope** for Wave 2 and are named here as
deferred follow-ups:

- **The multi-unit-per-page composite layout** — MegaMekLab's
  `PrintSmallUnitSheet` packs up to 4 Battle Armor squads or 3
  infantry platoons onto the multi-slot outer sheets
  (`battle_armor_default.svg` / `conventional_infantry_default.svg`)
  by `importNode`-ing each per-unit block into pre-slotted `unit_N`
  groups. Wave 2 renders one unit per page using the per-unit block
  template directly. The composite is a separate future change; it
  reuses the Wave-2 per-unit block with no rework.

- **Capital ships** — `dropship_*`, `smallcraft_*`, `jumpship_*`,
  `warship_*`, `spacestation_*`, `advaero_reverse` templates remain
  out of scope, as in Wave 1.

- **Skeleton renderer deletion** — `infantryRenderer.ts` and
  `battleArmorRenderer.ts` stay in the tree as the runtime fallback.
  A later cleanup change removes the skeleton renderers across all
  families once pip-parity is verified in production.

## Capabilities

### Modified Capabilities

- `record-sheet-export` — the `Per-Type SVG Renderers` requirement is
  widened so the infantry and battle-armor families render through
  the canonical template path via the Wave-1 shared
  `TemplateRecordSheetRenderer` and shared pip engine. New
  requirements cover the two per-family adapters, the Battle Armor
  per-trooper pip grid, the infantry damage-per-trooper formula, the
  template-primary / skeleton-fallback dispatch extension, the
  per-family pip-count fidelity gate, and the silent-fallback guard.

- `mm-data-asset-integration` — the `MmData Asset Service` requirement
  and the template registration are widened to register and serve the
  Infantry / Battle Armor canonical templates, and the element-ID
  catalog gains an Infantry / Battle Armor section.

- `infantry-unit-system` — the infantry weapon data model gains a
  canonical per-weapon `infantryDamage` value (damage per trooper)
  consumed by the record-sheet damage-per-trooper formula.

## Impact

- **Code.** Two new per-family adapter folders (`infantry/`,
  `battlearmor/`) under `src/services/printing/svgRecordSheetRenderer/`,
  each with `selectTemplate.ts` + `bindings.ts`. `pipEngine.ts` gains
  the Battle Armor per-trooper pip-grid helper and the infantry
  platoon pip-grid helper. `renderTemplated.ts` gains `infantry` /
  `battlearmor` cases and widens `isTemplatedUnit()`. The mech path
  and the Wave-1 families are not touched. The two skeleton renderers
  are not modified or deleted.
- **Types.** `IInfantryWeaponEntry` (construction) gains an
  `infantryDamage` field; `IInfantryWeaponSheet` (print) gains the
  per-trooper damage value threaded from it. New
  `infantryDamage`-population logic in the infantry-weapon catalog if
  Phase 0 finds the value is absent.
- **Config.** `config/mm-data-assets.json` gains the Infantry /
  Battle Armor template entries under `templates_us` / `templates_iso`.
  `MmDataAssetService` resolves the new paths through its existing
  three-source fallback chain.
- **Specs.** Three modified delta specs (`record-sheet-export`,
  `mm-data-asset-integration`, `infantry-unit-system`). All sync to
  source-of-truth on archive — **no `--skip-specs`**.
- **Tests.** New Jest tests: the two per-family adapter unit tests,
  the Battle Armor per-trooper pip-grid test, the infantry
  damage-per-trooper formula test, the two per-family pip-count
  fidelity tests, and the silent-fallback guard test. The existing
  skeleton-renderer snapshot tests are kept as the fallback-path
  regression guard.
- **Assets.** The Infantry / Battle Armor templates are fetched into
  `public/record-sheets/templates_us` / `templates_iso` by the
  asset-sync step. At runtime the three-source fallback chain still
  applies; a hard failure degrades to the skeleton renderer.
- **Risk.** Low–Medium. The shared core is already proven by Wave 1
  and the mech path; Wave 2 only adds two adapters and two pip-grid
  helpers. The chief risks are the Battle Armor per-trooper pip grid
  (the one new pip-engine capability) and the silent-fallback hazard —
  both carry explicit test gates. Browser hazards (`getBBox()`
  live-DOM requirement, web-font measure race) are inherited from the
  Wave-1 shared core and documented in `design.md`.
