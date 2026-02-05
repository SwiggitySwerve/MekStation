# Tasks: Refactor Equipment Formula Organization

## 1. Clean Up MovementEnhancement.ts

- [x] 1.1 Remove deprecated `calculateMASCWeight()` function
- [x] 1.2 Remove deprecated `calculateMASCSlots()` function
- [x] 1.3 Remove deprecated `calculateSuperchargerWeight()` function
- [x] 1.4 Remove `getWeight()` and `getCriticalSlots()` from `MovementEnhancementDefinition` interface
- [x] 1.5 Simplify `MOVEMENT_ENHANCEMENT_DEFINITIONS` to static metadata only
- [x] 1.6 Update file header documentation

## 2. Extract Store Helpers to Utils

- [x] 2.1 Create `src/utils/equipment/equipmentListUtils.ts`
- [x] 2.2 Extract jump jet equipment functions (`createJumpJetEquipmentList`, `filterOutJumpJets`)
- [x] 2.3 Extract internal structure equipment functions
- [x] 2.4 Extract armor equipment functions
- [x] 2.5 Extract heat sink equipment functions
- [x] 2.6 Extract enhancement equipment functions (`createEnhancementEquipmentList`, `filterOutEnhancementEquipment`)
- [x] 2.7 Update `useUnitStore.ts` to import from utilities file

## 3. Rename builtinFormulas.ts

- [x] 3.1 Rename file to `variableEquipmentFormulas.ts`
- [x] 3.2 Rename `BUILTIN_FORMULAS` to `VARIABLE_EQUIPMENT_FORMULAS`
- [x] 3.3 Rename helper functions (`getBuiltinFormulas` → `getVariableEquipmentFormulas`, etc.)
- [x] 3.4 Update `FormulaRegistry.ts` imports and references
- [x] 3.5 Update test files
- [x] 3.6 Update mock files

## 4. Validation

- [x] 4.1 Build succeeds with no TypeScript errors
- [x] 4.2 All equipment tests pass (391 tests)
- [x] 4.3 Formula registry tests pass (79 tests)
