# Placement worker report

**Verdict:** no actionable findings in owned files. No code changes.

Work was already implemented. Focused placement tests pass. Review compared catalog Add/place against the shared Critical Slots placement primitive and existing Add. No reproduced correctness defect inside ownership.

Parent note: browser report confirms valid option disabled markup; a separate browser worker owns that matcher fix. This worker did not touch `e2e/customizer-equipment-catalog.spec.ts` or any other non-owned file.

## Inspected files (owned)

- `src/stores/unit/catalogEquipmentPlacement.ts`
- `src/stores/unit/unitEquipmentAddition.ts`
- `src/stores/unit/useUnitEquipmentStore.ts`
- `src/utils/construction/slotOperations/placementOptions.ts`
- `src/components/customizer/equipment/CatalogPlacementDialog.tsx`
- `src/components/customizer/equipment/EquipmentCatalogCard.tsx`
- `src/stores/unit/__tests__/catalogEquipmentPlacement.test.ts`
- `src/components/customizer/equipment/__tests__/CatalogPlacementDialog.test.tsx`

## Read-only comparison (not edited)

- `AGENTS.md` (root) and `src/components/AGENTS.md`
- `src/components/customizer/tabs/CriticalSlotsTab.placement.ts` — shared authority consumer
- `src/components/customizer/tabs/CriticalSlotsTab.slotBuilders.ts` — empty-slot occupancy
- `src/utils/construction/slotOperations/queries.ts` — `getAvailableSlotIndices`
- `src/utils/construction/slotOperations/topology.ts` — `findContiguousSlotStarts`
- `src/utils/construction/equipmentMutationPolicy.ts` — fixed Omni mounts
- `src/stores/unit/unitEditHistory.ts` — undo label `'Add and place equipment'`
- `src/types/equipment/MountedEquipment.ts` — `createMountedEquipment` defaults
- `openspec/changes/repair-equipment-catalog/specs/equipment-browser/spec.md` — Add/place, translucent rows, existing Add
- `../2026-09-16-evidence-distilled/equipment-catalog-20260910.md` (formerly `.sisyphus/equipment-catalog-20260910/placement-tests.json`) — prior 30/30 pass including owned suites

## Checks

### Add and place legality

`previewCatalogEquipmentPlacement` (`catalogEquipmentPlacement.ts:43-95`) does not mutate state. It:

- Calculates variable weight/slots via `createCalculatedEquipment` (same helper as Add).
- Rejects split equipment before offering locations (`getSplitEquipmentRule` / `getPlacementRule(...).canSplit`).
- Builds options only for `getLocationsForConfig(state.configuration)`.
- Calls shared `getEquipmentPlacementOption` with `getAvailableSlotIndices(...)`.

`addEquipmentAtLocation` (`useUnitEquipmentStore.ts:95-128`) re-previews at confirmation. Failure returns `{ success: false, error }` without `set()`. Success is one `set()` appending the new instance with location + contiguous slots.

Restricted location (CASE → Head) and non-configuration location (laser → Left Arm on Quad) reject with no history entry (`catalogEquipmentPlacement.test.ts` “rejects restricted…”). Occupied space at confirmation rejects with `'No contiguous space'` and leaves the prior equipment array identical.

### Shared Critical Slots authority

`getEquipmentPlacementOption` (`placementOptions.ts:17-42`) is documented as shared by Critical Slots and catalog. Critical Slots (`CriticalSlotsTab.placement.ts:88-96`) and catalog (`catalogEquipmentPlacement.ts:82-93`) both call it.

Occupancy sources differ only in the expected way:

- Catalog (new copy): `getAvailableSlotIndices(location, engine, gyro, state.equipment)` — does not exclude a not-yet-created instance.
- Critical Slots (relocate): `getLocationData(location, selectedEquipment.instanceId)` empty slots — excludes the selected instance so it can be repaired in place.

Both occupancy builders use `LOCATION_SLOT_COUNTS`, `getFixedSlotNames` / `getFixedSlotIndices`, and mounted `slots`. Slot commit is equivalent: Critical Slots uses an explicit `criticalSlots === 0 ? []` branch; catalog uses `Array.from({ length: criticalSlots }, …)` which is `[]` when length is 0. Zero-slot HEAD placement is asserted (`slots: []`).

Legality reasons (`Read-only unit`, `Fixed OmniMech equipment`, `Restricted location`, `No contiguous space`) come from the same function.

### Fixed mounts

New catalog items have `location: undefined` (`createMountedEquipment`). `canChangeEquipmentMount` is true when `!equipment.location`, so a new copy is not treated as a locked Omni mount. Occupied slots of existing fixed mounts are in `getAvailableSlotIndices` usedSlots, so they are not offered and not overwritten. Test “revalidates occupied space… preserves fixed OmniMech mounts” fills every free Left Arm index with a fixed item; place fails; `equipment` remains `[fixed]`; `canUndo` stays false.

This matches Add: Add also creates `isOmniPodMounted: false` and leaves the copy unassigned. Pod vs fixed is not a catalog placement special case.

### Variable / zero-slot / split

- Variable: preview equipment weight/slots match a reference `addEquipment` on a second store; `weightChange` equals that weight; commit stores the same numbers (`hatchet` fixture).
- Failed variable calc: Place returns false and does not mutate; Add still adds (warn path in `addEquipment` `try/catch`). Existing Add preserved.
- Split (`endo-steel-is`): preview error contains `'split allocation'`; `addEquipmentAtLocation` fails; no history.
- Zero-slot: place assigns location + `slots: []`. Subsequent `addEquipment(laser)` remains unassigned (`location` undefined).

### Cancellation / read-only

Dialog Cancel calls `onClose` only; store identity unchanged (`CatalogPlacementDialog.test.tsx`). Confirm is disabled until a `canFit` option is selected. Read-only preview returns `'This unit is read-only.'` with empty locations; confirm disabled; equipment stays `[]`. `addEquipmentAtLocation` does not take a readOnly flag; the chooser is the gate, same as Add which also does not inspect a store readOnly field.

Stale selection: Head chosen, then Head slot 3 filled by another edit → confirm disabled, alert `'No contiguous space'`, loadout length 1.

### Atomic undo

`unitEditHistory.ts` labels `addEquipmentAtLocation` as `'Add and place equipment'`. Commit is a single `set()`. Test: preview does not create undo; commit sets that label; undo restores prior equipment; redo restores the same mounted array; cold `createUnitStore` from `localStorage` `megamek-unit-${id}` equals the committed mount.

### Transparent row styling

`EquipmentCatalogCard.tsx:32-40`: row is `relative isolate` with category `slotBorder`. Fill is a separate `absolute inset-0 -z-10` span (`equipment-catalog-row-fill`) using `slotBg` at `opacity-30` (hover/expanded `opacity-40`), `pointer-events-none`. Content/controls use `text-text-theme-primary` / `text-inherit`, not `slotText`. Matches spec “translucent category-colored row backgrounds with opaque readable content and controls.” Add remains present and independent of Add + place.

### Existing Add

`addEquipment` (`useUnitEquipmentStore.ts:74-93`) still appends an unassigned copy, swallows calculator failures with `logger.warn`, and recalculates targeting computers. Place does not replace that path. Card always renders Add; Add + place is optional (`onAddAndPlace`).

## Findings

None. No reproduced defect in owned files. Did not invent a repair.

Out of ownership (recorded only): parent browser report about valid-option disabled markup / matcher. Browser worker owns that. Not changed here.

## Changed files

None.

## Tests

Command (this session):

```text
node node_modules/jest/bin/jest.js --selectProjects unit --runInBand --runTestsByPath src/stores/unit/__tests__/catalogEquipmentPlacement.test.ts src/components/customizer/equipment/__tests__/CatalogPlacementDialog.test.tsx
```

Result: 2 suites, 10 tests, all passed. Exit code 0. Duration ~11.8s.

Prior hub run `../2026-09-16-evidence-distilled/equipment-catalog-20260910.md` (formerly `.sisyphus/equipment-catalog-20260910/placement-tests.json`): 5 suites / 30 tests passed, including these two files plus omni, CriticalSlotsTab smoke, and unitEditHistory (those extras are not owned and were not re-run).

No new regression test added because no defect was reproduced.

## Limitations

- Did not run typecheck, lint, format, full unit suite, e2e, or browser verification (parent-owned).
- Did not start/stop servers or change git.
- Superheavy pairing is a Critical Slots display concern (`slotsToCritEntries`); catalog free-slot math uses `LOCATION_SLOT_COUNTS` + fixed names + mounted slots, same as `buildLocationSlots` empty indices. No owned failing case.
- `addEquipmentAtLocation` re-previews with `readOnly` default false. Direct store calls on a UI-read-only unit are not blocked; Add has the same store-level shape. Dialog gates read-only.
- Visual translucency across themes/viewports is e2e/browser-owned; unit files only encode the fill/content split.

## Unresolved concern

None inside ownership. Browser matcher/disabled-option markup is explicitly another worker’s.
