# Tasks: Fix Variable Enhancement Calculations

## 1. Update Store Enhancement Helpers

- [x] 1.1 Import `EquipmentCalculatorService` in `useUnitStore.ts`
- [x] 1.2 Update `calculateEnhancementWeight()` to use `EquipmentCalculatorService.calculateProperties()` for MASC and Supercharger
- [x] 1.3 Update `calculateEnhancementSlots()` to use `EquipmentCalculatorService.calculateProperties()` for MASC (Supercharger is already fixed at 1)
- [x] 1.4 Update `createEnhancementEquipmentList()` signature to accept `engineRating` and `engineWeight` parameters

## 2. Update Store Actions

- [x] 2.1 Update `setEnhancement()` action to pass `engineRating` and `engineWeight` to equipment list creator
- [x] 2.2 Update `setEngineRating()` action to recalculate enhancement equipment when engine changes
- [x] 2.3 Update `setEngineType()` action to recalculate enhancement equipment (engine weight depends on type)

## 3. Deprecate MovementEnhancement.ts Functions

- [x] 3.1 Add deprecation comments to `getWeight()` function in MASC definition pointing to `EquipmentCalculatorService`
- [x] 3.2 Add deprecation comments to `calculateMASCWeight()` and `calculateMASCSlots()` functions
- [x] 3.3 Add deprecation comments to `calculateSuperchargerWeight()` function
- [x] 3.4 Keep formulas in MOVEMENT_ENHANCEMENT_DEFINITIONS for backwards compatibility but mark as deprecated

## 4. Validation

- [x] 4.1 Build succeeds with no TypeScript errors
- [x] 4.2 EquipmentCalculatorService tests pass (60 tests)
- [x] 4.3 builtinFormulas tests pass (verifying MASC/Supercharger formulas are correct)

