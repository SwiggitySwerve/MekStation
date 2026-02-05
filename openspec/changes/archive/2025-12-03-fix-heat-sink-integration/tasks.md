# Tasks: Fix Heat Sink Engine Integration

## 1. Fix Integral Heat Sink Formula

- [x] 1.1 Remove `Math.min(10, ...)` cap in `calculateIntegralHeatSinks()` (`src/utils/construction/engineCalculations.ts`)
- [x] 1.2 Remove secondary cap in `UnitFactoryService.ts` lines 428-429
- [x] 1.3 Update unit tests in `engineCalculations.test.ts` expecting capped values
- [x] 1.4 Update unit tests in `useUnitCalculations.test.ts` expecting capped values

## 2. Add Heat Sink Equipment Synchronization

- [x] 2.1 Add `getHeatSinkEquipmentId()` helper to map HeatSinkType to equipment ID
- [x] 2.2 Add `createHeatSinkEquipmentList()` to create external heat sink equipment instances
- [x] 2.3 Add `filterOutHeatSinks()` to remove heat sink equipment when reconfiguring
- [x] 2.4 Update `setHeatSinkType()` to sync equipment array (remove old, add new)
- [x] 2.5 Update `setHeatSinkCount()` to sync equipment array
- [x] 2.6 Ensure heat sink equipment items have `isRemovable: false` (managed via Structure tab)

## 3. Update Documentation

- [x] 3.1 Fix formula description in compendium page (`src/pages/compendium/index.tsx`) - Already correct, no changes needed

## 4. Validation

- [x] 4.1 Verify integral heat sink calculation matches MegaMekLab for various engine ratings
- [x] 4.2 Verify external heat sinks appear in loadout tray
- [x] 4.3 Verify external heat sinks can be assigned to critical slots
- [x] 4.4 Verify heat sink equipment syncs when type/count changes
- [x] 4.5 Run full test suite (275 tests pass)
