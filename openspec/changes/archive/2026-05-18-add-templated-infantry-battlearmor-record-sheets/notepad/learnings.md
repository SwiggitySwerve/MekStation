# Learnings — add-templated-infantry-battlearmor-record-sheets

## Wave-1 structural precedent (the template to mirror)
- Adapter folders live at `src/services/printing/svgRecordSheetRenderer/{vehicle,aerospace,protomech}/`.
  Each has `selectTemplate.ts` + `bindings.ts` + `__tests__/`. Wave 2 ADDS `infantry/` + `battlearmor/`.
- Shared core: `templateRecordSheetRenderer.ts` (asset load / parse / mount / bind / serialize) and
  `pipEngine.ts` (`layoutPips`, `layoutPipsInGroup`, `resolvePipGroup`). Reused VERBATIM. Wave 2 only
  ADDS pip-grid helpers to `pipEngine.ts` — never edits the existing per-location layout path.
- `renderTemplated.ts` owns dispatch: `isTemplatedUnit()` + `renderTemplated` switch +
  `TemplatedUnitData` union + per-family `renderXTemplated` wrappers with try/catch skeleton fallback.
- `renderViaTemplate(templateKey, paperSize, {texts, pips})` is the shared render path —
  load → mount → awaitFontsReady → applyBindings → applyPips → getSVGString.
- `templateElementIds.ts` holds `SHARED_TEMPLATE_IDS` + per-family frozen `as const` ID catalogs.
  Wave 2 ADDS an Infantry / Battle Armor section. Bindings reference ONLY catalogued IDs.
- `config/mm-data-assets.json` `patterns.templates_us` + `patterns.templates_iso` arrays list
  every registered template SVG filename. Wave 2 adds 5 filenames to EACH array.

## Bindings contract (from protomech/bindings.ts)
- `bindX(data)` returns `{ texts, pips, pipCounts }`. `texts` is `Record<string,string>` keyed by
  catalog IDs. `pips` is `PipFill[]` (`{groupId, count, className?, grouped?}`). `pipCounts` is the
  typed per-family fidelity contract.
- Bindings are PURE — no I/O, no DOM, no asset access. Deterministic for a given input.

## renderer.ts dispatch
- `renderRecordSheetSVG(data: INonMechRecordSheetData)` switch currently routes infantry/battlearmor
  to skeleton renderers. Wave-1 families also go through skeleton here — actual templated dispatch
  is in `renderTemplated.ts` / `RecordSheetService`. Match the Wave-1 wiring exactly.

## Phase-0 finding (task 0.6) — PRE-CONFIRMED by Atlas
- `IInfantryWeaponEntry` (src/types/unit/InfantryInterfaces.ts:96) has NO `infantryDamage` field.
  It carries `damageDivisor` (incoming-damage division — a DIFFERENT quantity).
- INFANTRY_WEAPON_TABLE (src/utils/construction/infantry/weaponTable.ts) — 13 weapon entries,
  none has a per-trooper damage value. => Task 1.3 (populate `infantryDamage`) IS IN SCOPE.
- `IInfantryWeaponSheet` (RecordSheetVariantTypes.ts:173) carries a generic `damage: number|string`
  — NOT the canonical per-trooper figure. Task 1.2 adds the per-trooper value threaded from the entry.

## Repo / CI rules
- Branch → PR → squash-merge. NEVER push to main. No --no-verify. No AI attribution. Conventional commits.
- Verify: `npm run lint` (oxlint), `npx oxfmt --check`, `npx tsc --noEmit`, `npm test`, `npm run storybook:build`.
- `*.test.tsx` and story files are oxlint-ignored by config.
- Test runner is Jest + @swc/jest. tasks.md says `bun test` — use `npm test` (jest) per repo reality.

## Phase 1 facts (infantry damage model — DONE)
- `getDamagePerTrooper()` MegaMek source: Infantry.java:1687 (13 lines). Reproduced verbatim in
  `infantry/infantryDamage.ts`. Cap = 0.6 (MMConstants.java:119). Formula:
  adjusted=min(0.6, primaryDmg); damage=adjusted*(squadSize-secPerSquad)
  + (secDmg ? secDmg*secPerSquad : 0); return damage/squadSize.
- `generateDamageRow(perTrooper)` -> 30 ints, DAMAGE+j = round(perTrooper*j). j in 1..30.
  Math.round (JS) == Java Math.round for non-negative values (both round-half-up).
- `IInfantryWeaponSheet.infantryDamage` is now a REQUIRED field. Any fixture building this type
  literal needs it — recordSheetSnapshots.test.ts already fixed. The infantry adapter (Phase 4)
  bindings consume `data.primaryWeapon.infantryDamage` + secondary weapons.
- `dataExtractors.infantry.ts` `buildWeaponSheet` threads `catalog?.infantryDamage ?? 0`.
- INFANTRY_WEAPON_TABLE has 12 entries (not 13). All 12 now carry infantryDamage.

## Phase 1 verification baseline
- Full printing suite: 13 suites / 257 tests / 5 snapshots — ALL GREEN. This is the regression
  guard for Phase 2-5. Re-run `npx jest src/services/printing` after each later wave.

## Phase 2 facts (pip-engine helpers — DONE)
- Two new helpers in pipEngine.ts (additive, Wave-1 layout untouched):
  * `layoutBattleArmorPipGrid(svgDoc, troopers[], options)` -> {renderedByColumn: Map<col,count>}.
    troopers: {column, armorPips}[]. Resolves `pips_<column>` RECT, lays armorPips+1 circles
    in a horizontal row across the rect bounds (width/19 spacing, MegaMek PrintBattleArmor).
    Circles appended as SIBLINGS of the rect (rect can't have children).
  * `layoutInfantryPlatoonPipGrid(svgDoc, platoonSize, options)` -> {renderedCount}.
    Marks first `platoonSize` `soldier_N` slots with a marker circle (class 'pip platoon-trooper').
    Clamped to INFANTRY_MAX_TROOPERS=30.
- KEY GOTCHA: BA `pips_N` is a `<rect>` element (the region itself), NOT a `<g>` containing
  sub-region rects. `ArmorPipLayout.addPips` expects a `<g>` of `<rect>` children -> returns 0
  pips on a bare rect. The BA helper therefore measures the rect directly via Bounds.fromRect
  and draws its own circle row — does NOT delegate to ArmorPipLayout.
- Fidelity-gate contract: BA per-column rendered count == armorPips + 1; infantry rendered
  count == platoonSize. Adapters (Phase 3/4) feed these helpers and the fidelity tests parse
  the output SVG circle counts.
- 266/266 printing tests green after Phase 2.
