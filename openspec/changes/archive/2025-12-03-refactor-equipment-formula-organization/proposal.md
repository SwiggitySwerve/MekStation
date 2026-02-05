# Change: Refactor Equipment Formula Organization

## Why

Following the fix of MASC/Supercharger calculations, the codebase needed organizational cleanup to improve maintainability and follow SOLID principles. Several issues were identified:

1. `builtinFormulas.ts` naming was vague - didn't describe what the file contains
2. `useUnitStore.ts` contained ~500 lines of helper functions that should be utilities
3. `MovementEnhancement.ts` had deprecated functions giving incorrect results

## What Changes

- **Rename**: `builtinFormulas.ts` → `variableEquipmentFormulas.ts`
  - `BUILTIN_FORMULAS` → `VARIABLE_EQUIPMENT_FORMULAS`
  - `getBuiltinFormulas()` → `getVariableEquipmentFormulas()`
  - `hasBuiltinFormulas()` → `hasVariableEquipmentFormulas()`
  - `getBuiltinEquipmentIds()` → `getVariableEquipmentIds()`

- **Extract**: Equipment list helpers from `useUnitStore.ts` to new `equipmentListUtils.ts`
  - Jump jet equipment functions
  - Internal structure equipment functions
  - Armor equipment functions
  - Heat sink equipment functions
  - Enhancement equipment functions

- **Remove**: Deprecated functions from `MovementEnhancement.ts`
  - Removed `calculateMASCWeight()`, `calculateMASCSlots()`, `calculateSuperchargerWeight()`
  - Removed `getWeight()` and `getCriticalSlots()` from interface
  - Kept only static metadata (type, name, techBase, exclusions, etc.)

## Impact

- Affected specs: `equipment-services` (minor - file path reference)
- Affected code:
  - `src/services/equipment/variableEquipmentFormulas.ts` (renamed)
  - `src/services/equipment/FormulaRegistry.ts` (updated imports)
  - `src/utils/equipment/equipmentListUtils.ts` (new file)
  - `src/stores/useUnitStore.ts` (imports from utils)
  - `src/types/construction/MovementEnhancement.ts` (simplified)
- No breaking changes to public API
- All tests pass
