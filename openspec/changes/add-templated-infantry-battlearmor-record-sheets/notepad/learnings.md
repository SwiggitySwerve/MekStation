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
