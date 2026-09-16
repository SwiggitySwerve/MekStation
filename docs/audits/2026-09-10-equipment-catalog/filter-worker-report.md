# Filter worker report

Lane: `filter-worker`
Date: 2026-09-10
Ownership: `src/utils/equipment/ammunitionCompatibility.ts`, `src/stores/useEquipmentStore.filters.ts`, `src/stores/useEquipmentStore.ts`, `src/hooks/useEquipmentBrowser.ts`, `src/__tests__/stores/equipmentCatalogFilters.test.ts`, `src/hooks/__tests__/useEquipmentBrowser.catalog.test.tsx`
Product files changed: none
OpenSpec checkboxes: not edited

## Verdict

No actionable findings. The owned filter/ammo/pagination path already matches the repair spec. Focused regressions pass. No reproduced correctness defect inside ownership.

## Inspected files

Owned:

- `src/utils/equipment/ammunitionCompatibility.ts`
- `src/stores/useEquipmentStore.filters.ts`
- `src/stores/useEquipmentStore.ts`
- `src/hooks/useEquipmentBrowser.ts`
- `src/__tests__/stores/equipmentCatalogFilters.test.ts`
- `src/hooks/__tests__/useEquipmentBrowser.catalog.test.tsx`

Spec / metadata / consumers (read-only):

- `AGENTS.md` (root)
- `openspec/changes/repair-equipment-catalog/specs/equipment-browser/spec.md`
- `openspec/changes/repair-equipment-catalog/design.md`
- `public/data/equipment/official/ammunition/{srm,autocannon,gauss,lrm}.json` plus directory listing of all 10 ammo files
- `public/data/equipment/official/weapons/ballistic-autocannon.json` (`"id": "ac-2"`)
- `public/data/equipment/official/weapons/missile-srm.json` (`"id": "srm-6"`)
- `src/types/equipment/EquipmentItem.ts` (`compatibleWeaponIds?`)
- `src/types/equipment/EquipmentCategory.ts`
- `src/services/equipment/EquipmentLookupService.ts` (ammo rows keep `compatibleWeaponIds`)
- `src/components/customizer/equipment/CompactFilterBar.tsx` (imports `CATALOG_OTHER_CATEGORIES` from owned filters)
- `../2026-09-16-evidence-distilled/equipment-catalog-20260910.md` (formerly `.sisyphus/equipment-catalog-20260910/filter-audit/REPORT.md`) (old findings)
- `../2026-09-16-evidence-distilled/equipment-catalog-20260910.md` (formerly `.sisyphus/equipment-catalog-20260910/catalog-tests-corrected.json`) (182 passed earlier)

## Checks

1. Official ammo metadata vs matcher
   - `srm-ammo` / `lrm-ammo` / `gauss-ammo` / `ac-2-ammo` declare exact weapon IDs (`srm-6`, `clan-srm-6`, `lrm-20`, `clan-lrm-20`, `gauss-rifle`, `ac-2`). Matcher uses `compatibleWeaponIds.some(id => mountedIds.has(id))` first.
   - Empty-declaration unofficial rows exist (`ammo-srm-2`, `ammo-srm-6`, `compatibleWeaponIds: []`). Fallback is exact identity after ammo wrappers, not substring. `ac-2` vs `ac-20` cannot collide (`ac2` vs `ac20`).
   - 289 official ammo records: 52 with non-empty `compatibleWeaponIds`, 237 empty arrays. Empty-array path is fallback, not declared match.

2. Independent Electronics / Other
   - `CATALOG_OTHER_CATEGORIES` is `MISC_EQUIPMENT`, `MOVEMENT`, `STRUCTURAL` only. Electronics is not bundled.
   - Exclusive Other selects that set; exclusive Electronics selects only `ELECTRONICS`. Ctrl+Other keeps Electronics. CompactFilterBar reads the same export for Other highlighting.

3. Reactive weapon edits / undo / unit switch
   - Hook selects `unitContext` and memos `filteredEquipment` on `[getFilteredEquipment, equipment, filters, sort, unitContext]`.
   - `setUnitContext` skips no-op identity and resets page only on real year/tech/weapon-id change.
   - Weapon IDs come from `isWeaponCategory`, not “id does not contain ammo”.

4. Current pagination
   - Hook `totalItems` is `filteredEquipment.length`; page rows slice that same array.
   - Filter and context changes reset `currentPage` to 1; unchanged context keeps the current page.

5. Owned regression run (this resume, only these two files)

```text
node node_modules/jest/bin/jest.js --selectProjects unit --runInBand --runTestsByPath src/__tests__/stores/equipmentCatalogFilters.test.ts src/hooks/__tests__/useEquipmentBrowser.catalog.test.tsx
```

Result: 2 suites, 18 tests, all passed, ~1.6s.

Covered behavior in those files:

- Declared SRM/LRM/Gauss/AC compatibility retained; AC/2 does not admit AC/20; explicit declarations override fallback.
- Empty-declaration `ammo-srm-2` kept for `srm-2`; `ammo-srm-6` excluded.
- Empty loadout with unit context hides ammo; standalone browsing does not.
- Electronics independent of Other and of Hide Ammo; Show All / last-category-deselect clear legacy restrictions; secondary classifications preserved.
- Hook: add weapon → compatible ammo visible; remove/undo/redo refresh immediately; unit switch and year availability update without another filter click; numeric filter empties rows and `goToLastPage` stays on page 1.

Parent independently reported 40 unrelated-file hashes unchanged and stable suite 35134 pass with only an unrelated chassis-route manifest failure. No product files changed since this worker launched.

## Findings

None. Old filter-audit defects (name⊃id matching, Electronics folded into Other, memo vs delayed `setUnitContext`, non-weapon IDs treated as weapons) are not present in the current owned files.

## Changed files

None.

## Unresolved concern

None inside ownership. `src/components/customizer/equipment/equipmentConstants.ts` still lists a broader unused `OTHER_CATEGORIES` (includes Physical/Artillery). CompactFilterBar does not use it; out of ownership, not a reproduced catalog-filter defect.
