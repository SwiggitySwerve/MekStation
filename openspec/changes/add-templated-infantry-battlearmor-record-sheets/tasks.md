# Tasks: Add Templated Infantry / Battle Armor Record Sheets

Test infrastructure exists (Jest + `@swc/jest`). Tests are authored
**alongside** implementation. The Phase-3 / Phase-4 pip-count fidelity
tasks and the Phase-5 silent-fallback guard are the hard gates.

## 0. Infra-First — Asset Registration, ID Catalog, Damage-Field Check

- [x] 0.1 Register the 5 Infantry / Battle Armor templates in
  `config/mm-data-assets.json` under both `templates_us` and
  `templates_iso` pattern lists: `conventional_infantry_default.svg`,
  `conventional_infantry_platoon.svg`,
  `conventional_infantry_tables.svg`, `battle_armor_default.svg`,
  `battle_armor_squad.svg`.
  - Acceptance: each of the 5 names appears in both pattern lists,
    matching the existing mech / Wave-1 registration shape.
  - QA: `config/mm-data-assets.json` shows 10 new entries; JSON parses.
- [x] 0.2 Run the asset-sync step (`npm run fetch:assets`) and confirm
  the 5 templates land in `public/record-sheets/templates_us` and
  `templates_iso`.
  - Acceptance: all 5 templates present in each of the two local
    directories.
  - QA: `ls public/record-sheets/templates_us` lists all 5 names.
- [x] 0.3 Prove the `conventional_infantry_platoon` and
  `battle_armor_squad` templates load through `MmDataAssetService`
  before any renderer code exists — a throwaway script calling
  `loadSVG('templates_us/conventional_infantry_platoon.svg')` and the
  battle-armor equivalent.
  - Acceptance: both return parseable, non-empty SVG content via the
    three-source fallback chain.
  - QA: each load returns non-empty SVG.
- [x] 0.4 Extract the injectable `id=` set from the per-unit block
  templates (`conventional_infantry_platoon.svg`,
  `battle_armor_squad.svg`) into the frozen typed catalog
  (`templateElementIds.ts`), as a new Infantry / Battle Armor section.
  - Acceptance: a typed `as const` catalog section whose keys are the
    real template element IDs.
  - QA: `npx tsc --noEmit` clean; spot-check 3 IDs per family against
    the template SVG source.
- [x] 0.5 Review the extracted ID catalog section against the
  MegaMekLab `PrintSmallUnitSheet` Java field names.
  - Acceptance: every binding target the adapters will use corresponds
    to a documented `PrintSmallUnitSheet` element ID; divergences noted
    as catalog comments.
  - QA: review notes recorded; no unexplained ID in the section.
- [x] 0.6 Verify whether the infantry-weapon catalog
  (`src/utils/construction/infantry/weaponTable.ts` and the
  infantry-weapon data) already populates a usable per-weapon
  damage-per-trooper value.
  - Acceptance: a recorded finding — YES (value exists, name it) or NO
    (value absent; task 1.3 must populate it).
  - QA: finding written into `notepad/decisions.md`.

## 1. Infantry Damage Model and Weapon Data

- [ ] 1.1 Add `infantryDamage` (damage per trooper, non-negative
  number) to `IInfantryWeaponEntry` in
  `src/types/unit/InfantryInterfaces.ts`, distinct from
  `damageDivisor`.
  - Acceptance: the field is typed and documented in a code comment.
  - QA: `npx tsc --noEmit` clean.
- [ ] 1.2 Add the per-trooper damage value to `IInfantryWeaponSheet`
  in `src/types/printing/RecordSheetVariantTypes.ts`, threaded from
  `IInfantryWeaponEntry`.
  - Acceptance: the print type carries the canonical per-trooper
    damage value.
  - QA: `npx tsc --noEmit` clean.
- [ ] 1.3 If task 0.6 found `infantryDamage` absent, populate it for
  every weapon in the infantry-weapon catalog
  (`weaponTable.ts` and / or the catalog data).
  - Acceptance: every infantry weapon entry has a non-negative
    `infantryDamage`; conditional on the 0.6 finding.
  - QA: a unit test asserts no weapon entry has an undefined
    `infantryDamage`.
- [ ] 1.4 Create the infantry damage-per-trooper formula module — a
  verbatim reproduction of MegaMek `Infantry.getDamagePerTrooper()`
  (`E:\Projects\megamek\megamek\src\megamek\common\units\Infantry.java`),
  including the `0.6` primary-weapon damage cap
  (`INFANTRY_PRIMARY_WEAPON_DAMAGE_CAP`).
  - Acceptance: a pure function returning damage per trooper; the cap
    is applied to the primary weapon's contribution.
  - QA: `npx tsc --noEmit` clean.
- [ ] 1.5 Add the `DAMAGE+j` row generator: for `j` in `1..30`,
  `DAMAGE+j = round(perTrooper × j)`.
  - Acceptance: the generator emits 30 values for a given
    per-trooper damage.
  - QA: unit test asserts `j=1` and `j=30` values.
- [ ] 1.6 Unit-test the formula module — known inputs against the
  MegaMek reference, including a case where the primary weapon's
  per-trooper damage exceeds `0.6` and is capped.
  - Acceptance: computed values match the MegaMek reference; the cap
    case asserts the `0.6` clamp.
  - QA: `bun test infantryDamage` (or the formula module) green.

## 2. Battle Armor Per-Trooper Pip Grid

- [ ] 2.1 Add the Battle Armor per-trooper pip-grid helper to
  `pipEngine.ts`: places one armor pip cluster per trooper column
  (4–6 columns), each cluster sized to that trooper's per-suit armor
  pip count, measured from template column regions.
  - Acceptance: the helper emits one cluster per trooper column;
    unused columns left empty.
  - QA: unit test on a synthetic 5-column template.
- [ ] 2.2 Add the infantry platoon pip-grid helper to `pipEngine.ts`:
  lays out a single platoon pip grid sized to the trooper count.
  - Acceptance: the helper emits a platoon grid of `platoonSize`
    pip elements.
  - QA: unit test on a synthetic platoon-grid region.
- [ ] 2.3 Confirm the existing per-location pip layout (mech, Wave-1
  families) is unchanged by the pip-engine additions.
  - Acceptance: the new helpers are additive; no edit to the existing
    layout path.
  - QA: the Wave-1 pip-count fidelity tests and mech snapshot tests
    pass with zero diff.

## 3. Battle Armor Family Adapter

- [ ] 3.1 Create `battlearmor/selectTemplate.ts` — pure
  `IBattleArmorRecordSheetData → templateKey` returning
  `battle_armor_squad` (the per-unit block, NOT
  `battle_armor_default`).
  - Acceptance: pure function, no I/O; returns the per-unit block key.
  - QA: unit test asserts the returned key.
- [ ] 3.2 Create `battlearmor/bindings.ts` — pure
  `IBattleArmorRecordSheetData → { texts, pips }` against the Phase-0
  ID catalog, with a typed per-trooper `PipCounts` computed from each
  trooper's armor pip count.
  - Acceptance: `texts` bind only catalog IDs; `PipCounts` per-trooper
    counts equal each trooper's `armorPips`.
  - QA: unit test asserts `PipCounts` for a 4-, 5-, and 6-trooper
    squad fixture.
- [ ] 3.3 Pip-count fidelity test — render a Battle Armor squad
  through the templated path, parse the output SVG, assert the
  pip-element count per trooper column equals the fixture's
  per-trooper armor values.
  - Acceptance: fidelity gate green for a 5-trooper squad; a
    deliberately wrong fixture fails the assertion.
  - QA: `bun test battlearmor` green.

## 4. Infantry Family Adapter

- [ ] 4.1 Create `infantry/selectTemplate.ts` — pure
  `IInfantryRecordSheetData → templateKey` returning
  `conventional_infantry_platoon` (the per-unit block, NOT
  `conventional_infantry_default`).
  - Acceptance: pure function, no I/O; returns the per-unit block key.
  - QA: unit test asserts the returned key.
- [ ] 4.2 Create `infantry/bindings.ts` — pure
  `IInfantryRecordSheetData → { texts, pips }` against the Phase-0 ID
  catalog, with a platoon `PipCounts` and the damage row produced via
  the Phase-1 formula module.
  - Acceptance: `texts` bind only catalog IDs; the platoon `PipCounts`
    equals `platoonSize`; the damage row has 30 `DAMAGE+j` values.
  - QA: unit test asserts `PipCounts` and the damage row for a
    28-trooper foot rifle platoon fixture.
- [ ] 4.3 Pip-count fidelity test — render an infantry platoon
  through the templated path, parse the output SVG, assert the
  platoon pip-grid element count equals the fixture's trooper count.
  - Acceptance: fidelity gate green for a 28-trooper platoon; a
    deliberately wrong fixture fails the assertion.
  - QA: `bun test infantry` green.

## 5. Dispatch — Flip Infantry / Battle Armor to Templated

- [ ] 5.1 Widen `isTemplatedUnit()` in `renderTemplated.ts` to return
  `true` for `infantry` and `battlearmor`; widen the `TemplatedUnitData`
  union to include `IInfantryRecordSheetData` and
  `IBattleArmorRecordSheetData`.
  - Acceptance: `isTemplatedUnit()` narrows both new variants.
  - QA: `npx tsc --noEmit` clean.
- [ ] 5.2 Add `renderInfantryTemplated` and `renderBattleArmorTemplated`
  wrappers and the two `renderTemplated` switch cases — select
  template → load via `MmDataAssetService` → mount → bind → lay out
  pips → serialize.
  - Acceptance: infantry / battlearmor route through the template path.
  - QA: integration test renders one unit per family via the template
    path.
- [ ] 5.3 Wrap each new template path in `try/catch`; on asset-load or
  parse failure, invoke the existing `infantryRenderer` /
  `battleArmorRenderer` skeleton renderer and return its SVG.
  - Acceptance: a forced asset failure yields skeleton output, not a
    blank/error sheet.
  - QA: unit test stubs `loadSVG` to throw and asserts skeleton output
    is returned.
- [ ] 5.4 Confirm the `renderRecordSheetSVG` dispatch routes infantry
  and battlearmor through the templated path with skeleton fallback,
  and that the mech and Wave-1 families are unchanged.
  - Acceptance: dispatch correct for all 7 families.
  - QA: dispatch unit test per `unitType`.
- [ ] 5.5 Silent-fallback guard test — assert `isTemplatedUnit()`
  returns `true` for both Wave-2 payloads AND that the SVG produced
  via `renderTemplated` carries a canonical-template marker absent
  from the skeleton renderer's output.
  - Acceptance: the test fails if the template path is silently
    bypassed in favour of the skeleton fallback.
  - QA: `bun test` for the guard green; manually break the template
    path and confirm the guard fails.
- [ ] 5.6 Verify the customizer Save PDF path
  (`PreviewTab.handleExportPDF` → `RecordSheetService.exportPDF`)
  renders infantry and battle-armor units through the templated path.
  - Acceptance: Save PDF for a platoon and a Battle Armor squad
    produces a templated PDF.
  - QA: dev-browser — open each unit type in the customizer, click
    Save PDF, confirm the PDF matches the canonical per-unit block
    layout (header fields populated, pips drawn, infantry damage row
    present).

## 6. Final Verification Wave

- [ ] F1 Typecheck + lint clean across all touched files
  (`bun run typecheck`, `bun run lint`).
- [ ] F2 All unit + integration tests pass — the two per-family
  pip-count fidelity tests, the Battle Armor per-trooper pip-grid
  test, the infantry damage-per-trooper formula test, the
  silent-fallback guard test, and the unchanged mech / Wave-1
  snapshot and fidelity tests (`bun test`).
- [ ] F3 Manual QA — Save PDF from the customizer for an infantry
  platoon and a Battle Armor squad in both `templates_us` and
  `templates_iso`; confirm canonical per-unit block layout, correct
  pip counts, and the infantry damage row.
- [ ] F4 Forced-failure QA — block asset loading and confirm each
  family degrades to its skeleton renderer rather than producing a
  blank PDF.
- [ ] F5 `omo-spec-verifier` confirms every SHALL/MUST in the three
  delta specs has implementation and test coverage.
- [ ] F6 `npx openspec validate add-templated-infantry-battlearmor-record-sheets --strict`
  passes.
