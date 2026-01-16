# Change: Codebase Cleanup and Consolidation

## Why

Following PRs #65-72, the codebase has accumulated technical debt including duplicate type definitions, inconsistent naming conventions, and parallel implementations. This cleanup addresses:

1. **Type Duplication** - `Result` type defined in two incompatible locations; `UnitType` defined 4 times with different values
2. **Validation Rule Fragmentation** - Two parallel validation systems in `src/services/validation/rules/` and `src/utils/validation/rules/`
3. **Non-Standard File Organization** - Dot-notation file splits (`UnitLoaderService.*.ts`, `SVGRecordSheetRenderer.*.ts`) instead of directory structures
4. **Naming Inconsistencies** - `navigationStore.ts` doesn't follow `use*Store.ts` convention
5. **Legacy Code** - Deprecated stores still exported, stale TODO comments

## What Changes

### Phase 1: Type Consolidation

- **REMOVED** `src/services/common/types.ts` Result type (lines 20-39)
- **MODIFIED** All imports to use `src/services/core/types/BaseTypes.ts` Result type
- **REMOVED** `UnitType` duplicates from:
  - `src/services/common/types.ts` (lines 101-113)
  - `src/components/settings/useElectron.ts` (line 112)
  - `desktop/types/BaseTypes.ts` (line 150)
- **MODIFIED** All imports to use `src/types/unit/BattleMechInterfaces.ts` UnitType enum

### Phase 2: Validation Rules Audit

- **ANALYZED** Overlap between two validation systems:
  - `src/services/validation/rules/` - New hierarchical unit-type validation (7 files)
  - `src/utils/validation/rules/` - Configuration-based validation (12 files)
- **DOCUMENTED** Rule coverage matrix
- **RECOMMENDED** Consolidation strategy (keep both, merge, or deprecate one)

### Phase 3: File Organization Refactoring

- **REFACTORED** `src/services/units/UnitLoaderService.*.ts` (8 files) into directory:
  ```
  src/services/units/unitLoaderService/
  ├── index.ts
  ├── types.ts
  ├── armorCalculations.ts
  ├── componentMappers.ts
  ├── equipmentMapping.ts
  ├── equipmentResolution.ts
  ├── typeGuards.ts
  └── unitLoader.ts
  ```
- **REFACTORED** `src/services/printing/SVGRecordSheetRenderer.*.ts` (8 files) into directory:
  ```
  src/services/printing/svgRecordSheetRenderer/
  ├── index.ts
  ├── constants.ts
  ├── armor.ts
  ├── canvas.ts
  ├── criticals.ts
  ├── equipment.ts
  ├── structure.ts
  └── template.ts
  ```
- **REFACTORED** `src/services/equipment/aliasUtils.*.ts` (5 files) into directory:
  ```
  src/services/equipment/aliases/
  ├── index.ts
  ├── ammunition.ts
  ├── legacy.ts
  ├── misc.ts
  ├── static.ts
  └── weapon.ts
  ```

### Phase 4: Naming Convention Fixes

- **RENAMED** `src/stores/navigationStore.ts` → `src/stores/useNavigationStore.ts`
- **UPDATED** All imports referencing the renamed file

### Phase 5: Legacy Code Cleanup

- **REMOVED** or **DEPRECATED** legacy store re-exports from `src/stores/index.ts`:
  - `useCustomizerStore` (if no longer used)
  - `useMultiUnitStore` (if no longer used)
  - `useEquipmentStore` (if no longer used)
- **ADDRESSED** TODO comments in:
  - `src/services/construction/MechBuilderService.ts`
  - `src/types/core/ComponentDatabase.ts`
  - `src/types/core/ComponentInterfaces.ts`
  - `src/types/core/EquipmentInterfaces.ts`
  - `src/types/core/UnitInterfaces.ts`

## Impact

- **Affected specs**:
  - None directly modified (this is internal cleanup)

- **Affected code** (estimate):
  - ~30-50 files for Result type migration
  - ~10-20 files for UnitType migration
  - ~20 files for directory restructuring
  - ~5-10 files for store rename
  - ~5 files for TODO cleanup

- **Risk Assessment**:
  - Low risk: Naming and organization changes
  - Medium risk: Type consolidation (requires careful import updates)
  - Test coverage: All existing tests must pass after changes

## Dependencies

- None (standalone cleanup effort)

## Related Specifications

- No new specs created
- No specs modified
