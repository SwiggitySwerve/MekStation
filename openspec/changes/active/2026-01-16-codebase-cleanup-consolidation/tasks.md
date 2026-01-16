# Tasks: Codebase Cleanup and Consolidation

## Phase 1: Type Consolidation

### 1.1 Result Type Consolidation

- [x] 1.1.1 Audit all usages of `Result` from `src/services/common/types.ts` - No dead code found, already using canonical type
- [x] 1.1.2 Audit all usages of `ResultType` from `src/services/core/types/BaseTypes.ts` - Canonical source confirmed
- [x] 1.1.3 Determine canonical Result type (BaseTypes.ts has richer API) - Confirmed BaseTypes.ts as canonical
- [x] 1.1.4 Create migration script or manually update all imports - No migration needed
- [x] 1.1.5 Update `src/services/common/types.ts`:
  - Remove `Result<T, E>` type alias (lines 20-25) - N/A, already clean
  - Remove `success()` function (lines 27-32) - N/A, already clean
  - Remove `failure()` function (lines 34-39) - N/A, already clean
- [x] 1.1.6 Re-export canonical Result from `src/services/common/types.ts` for compatibility - COMPLETED
- [x] 1.1.7 Run TypeScript compiler to verify no type errors - PASSED
- [x] 1.1.8 Run full test suite to verify no regressions - PASSED (5713 tests)

### 1.2 UnitType Consolidation

- [x] 1.2.1 Audit all usages of `UnitType` type alias from `src/services/common/types.ts` - COMPLETED
- [x] 1.2.2 Audit all usages of `UnitType` enum from `src/types/unit/BattleMechInterfaces.ts` - COMPLETED
- [x] 1.2.3 Document value differences between definitions:
  - Enum has 16 values (most complete)
  - common/types.ts has 12 string literal values
  - desktop & useElectron have 6 values
- [x] 1.2.4 Update `src/services/common/types.ts`:
  - Remove `UnitType` type alias (lines 101-113) - COMPLETED
  - Add re-export: `export { UnitType } from '@/types/unit/BattleMechInterfaces'` - COMPLETED
- [x] 1.2.5 Update `src/components/settings/useElectron.ts`:
  - Remove local `UnitType` definition (line 112) - COMPLETED (renamed to RecentFileUnitType)
  - Import from canonical source - COMPLETED
- [x] 1.2.6 Update `desktop/types/BaseTypes.ts`:
  - Remove `UnitType` definition (line 150) - N/A, desktop code kept separate
  - Import from shared types or define desktop-specific subset - SKIPPED (desktop code intentionally separate)
- [x] 1.2.7 Run TypeScript compiler to verify no type errors - PASSED
- [x] 1.2.8 Run full test suite to verify no regressions - PASSED (5713 tests)

## Phase 2: Validation Rules Audit

### 2.1 Document Current State

- [x] 2.1.1 List all rules in `src/services/validation/rules/`:
  - `universal/UniversalValidationRules.ts` - CONFIRMED
  - `mech/MechCategoryRules.ts` - CONFIRMED
  - `vehicle/VehicleCategoryRules.ts` - CONFIRMED
  - `aerospace/AerospaceCategoryRules.ts` - CONFIRMED
  - `personnel/PersonnelCategoryRules.ts` - CONFIRMED
  - `battlemech/BattleMechRules.ts` - CONFIRMED
- [x] 2.1.2 List all rules in `src/utils/validation/rules/`:
  - `StandardValidationRules.ts` - CONFIRMED
  - `BipedValidationRules.ts` - CONFIRMED
  - `QuadValidationRules.ts` - CONFIRMED
  - `TripodValidationRules.ts` - CONFIRMED
  - `LAMValidationRules.ts` - CONFIRMED
  - `QuadVeeValidationRules.ts` - CONFIRMED
  - `OmniMechValidationRules.ts` - CONFIRMED
  - `ConfigurationValidationRules.ts` - CONFIRMED
  - `GenericValidationRules.ts` - CONFIRMED
  - `ValidationOrchestrator.ts` - CONFIRMED
  - `ValidationRuleRegistry.ts` - CONFIRMED
  - `validationHelpers.ts` - CONFIRMED
- [x] 2.1.3 Create rule coverage matrix (which rules validate what) - COMPLETED (documented in design.md)

### 2.2 Determine Consolidation Strategy

- [x] 2.2.1 Identify overlapping rules between systems - COMPLETED
- [x] 2.2.2 Identify unique rules in each system - COMPLETED
- [x] 2.2.3 Decide strategy:
  - Option A: Keep both (different purposes - unit-type vs config-based) - **SELECTED**
  - Option B: Merge into services/validation/rules/ - REJECTED
  - Option C: Deprecate utils/validation/rules/ over time - REJECTED
- [x] 2.2.4 Document decision and rationale - COMPLETED
- [ ] 2.2.5 Create migration plan if consolidating - N/A (Option A selected)

## Phase 3: File Organization Refactoring

### 3.1 UnitLoaderService Directory Refactor

- [x] 3.1.1 Create `src/services/units/unitLoaderService/` directory - COMPLETED
- [x] 3.1.2 Move `UnitLoaderService.types.ts` → `unitLoaderService/types.ts` - COMPLETED
- [x] 3.1.3 Move `UnitLoaderService.type-guards.ts` → `unitLoaderService/typeGuards.ts` - COMPLETED
- [x] 3.1.4 Move `UnitLoaderService.armor-calculations.ts` → `unitLoaderService/armorCalculations.ts` - COMPLETED
- [x] 3.1.5 Move `UnitLoaderService.component-mappers.ts` → `unitLoaderService/componentMappers.ts` - COMPLETED
- [x] 3.1.6 Move `UnitLoaderService.equipment-mapping.ts` → `unitLoaderService/equipmentMapping.ts` - COMPLETED
- [x] 3.1.7 Move `UnitLoaderService.equipment-resolution.ts` → `unitLoaderService/equipmentResolution.ts` - COMPLETED
- [x] 3.1.8 Move `UnitLoaderService.unit-loader.ts` → `unitLoaderService/unitLoader.ts` - COMPLETED
- [x] 3.1.9 Move `UnitLoaderService.ts` → `unitLoaderService/index.ts` - COMPLETED
- [x] 3.1.10 Update all internal imports within the directory - COMPLETED
- [x] 3.1.11 Update all external imports to use new paths - COMPLETED
- [x] 3.1.12 Delete old files - COMPLETED
- [x] 3.1.13 Run tests to verify no regressions - PASSED (5713 tests)

### 3.2 SVGRecordSheetRenderer Directory Refactor

- [x] 3.2.1 Create `src/services/printing/svgRecordSheetRenderer/` directory - COMPLETED
- [x] 3.2.2 Move `SVGRecordSheetRenderer.constants.ts` → `svgRecordSheetRenderer/constants.ts` - COMPLETED
- [x] 3.2.3 Move `SVGRecordSheetRenderer.canvas.ts` → `svgRecordSheetRenderer/canvas.ts` - COMPLETED
- [x] 3.2.4 Move `SVGRecordSheetRenderer.armor.ts` → `svgRecordSheetRenderer/armor.ts` - COMPLETED
- [x] 3.2.5 Move `SVGRecordSheetRenderer.criticals.ts` → `svgRecordSheetRenderer/criticals.ts` - COMPLETED
- [x] 3.2.6 Move `SVGRecordSheetRenderer.equipment.ts` → `svgRecordSheetRenderer/equipment.ts` - COMPLETED
- [x] 3.2.7 Move `SVGRecordSheetRenderer.structure.ts` → `svgRecordSheetRenderer/structure.ts` - COMPLETED
- [x] 3.2.8 Move `SVGRecordSheetRenderer.template.ts` → `svgRecordSheetRenderer/template.ts` - COMPLETED
- [x] 3.2.9 Move `SVGRecordSheetRenderer.ts` → `svgRecordSheetRenderer/index.ts` - COMPLETED
- [x] 3.2.10 Update all internal imports within the directory - COMPLETED
- [x] 3.2.11 Update all external imports to use new paths - COMPLETED
- [x] 3.2.12 Update test file paths in `src/__tests__/service/printing/` - COMPLETED
- [x] 3.2.13 Delete old files - COMPLETED
- [x] 3.2.14 Run tests to verify no regressions - PASSED (5713 tests)

### 3.3 aliasUtils Directory Refactor

- [x] 3.3.1 Create `src/services/equipment/aliases/` directory - COMPLETED
- [x] 3.3.2 Move `aliasUtils.ammunition.ts` → `aliases/ammunition.ts` - COMPLETED
- [x] 3.3.3 Move `aliasUtils.legacy.ts` → `aliases/legacy.ts` - COMPLETED
- [x] 3.3.4 Move `aliasUtils.misc.ts` → `aliases/misc.ts` - COMPLETED
- [x] 3.3.5 Move `aliasUtils.static.ts` → `aliases/static.ts` - COMPLETED
- [x] 3.3.6 Move `aliasUtils.weapon.ts` → `aliases/weapon.ts` - COMPLETED
- [x] 3.3.7 Create `aliases/index.ts` with barrel exports - COMPLETED
- [x] 3.3.8 Update all internal imports within the directory - COMPLETED
- [x] 3.3.9 Update all external imports to use new paths - COMPLETED
- [x] 3.3.10 Delete old files - COMPLETED
- [x] 3.3.11 Run tests to verify no regressions - PASSED (5713 tests)

## Phase 4: Naming Convention Fixes

### 4.1 Store Rename

- [x] 4.1.1 Rename `src/stores/navigationStore.ts` → `src/stores/useNavigationStore.ts` - COMPLETED
- [x] 4.1.2 Update import in `src/stores/index.ts` - COMPLETED
- [x] 4.1.3 Search and update all imports of `navigationStore` - COMPLETED (updated in test files and components)
- [x] 4.1.4 Run tests to verify no regressions - PASSED (5713 tests)

## Phase 5: Legacy Code Cleanup

### 5.1 Legacy Store Assessment

- [x] 5.1.1 Search for usages of `useCustomizerStore` - Found 4 production files
- [x] 5.1.2 Search for usages of `useMultiUnitStore` - Found 6 production files
- [x] 5.1.3 Search for usages of `useEquipmentStore` - Found 3 production files
- [x] 5.1.4 Document which stores are still actively used:
  - `useCustomizerStore`: CriticalSlotsTab.tsx, useUnit.ts (STILL IN USE)
  - `useMultiUnitStore`: NewTabModal.tsx, useUnitCalculations.ts, useTechBaseSync.ts, useUnit.ts (STILL IN USE)
  - `useEquipmentStore`: EquipmentBrowser.tsx, useEquipmentBrowser.ts (STILL IN USE)
- [ ] ~~5.1.5 For unused stores: Remove export~~ SKIPPED - All stores still in use
- [ ] 5.1.6 For still-used stores: Add deprecation JSDoc with migration path (DEFERRED)
- [ ] 5.1.7 Run tests to verify no regressions

### 5.2 TODO Comment Cleanup

- [x] 5.2.1 Address or remove TODO in `src/services/construction/MechBuilderService.ts`:
  - "TODO: Add validation for maximum armor per location" - COMPLETED (implemented armor validation)
- [x] 5.2.2 Address or remove TODO in `src/types/core/ComponentDatabase.ts`:
  - "TODO: Replace with spec-driven implementation" - COMPLETED (replaced with proper documentation)
- [x] 5.2.3 Address or remove TODO in `src/types/core/ComponentInterfaces.ts`:
  - "TODO: Replace with spec-driven implementation" - COMPLETED (replaced with proper documentation)
- [x] 5.2.4 Address or remove TODO in `src/types/core/EquipmentInterfaces.ts`:
  - "TODO: Replace with spec-driven implementation" - COMPLETED (replaced with proper documentation)
- [x] 5.2.5 Address or remove TODO in `src/types/core/UnitInterfaces.ts`:
  - "TODO: Replace with spec-driven implementation" - COMPLETED (replaced with proper deprecation notice)

## Phase 6: Verification

### 6.1 Final Verification

- [x] 6.1.1 Run `npm run typecheck` - all types must pass - PASSED
- [x] 6.1.2 Run `npm run lint` - all lint rules must pass - PASSED
- [x] 6.1.3 Run `npm run test` - all tests must pass - PASSED (5713 tests)
- [x] 6.1.4 Run `npm run build` - build must succeed - PASSED
- [ ] 6.1.5 Manual smoke test of customizer functionality - DEFERRED (requires manual testing)
- [ ] 6.1.6 Manual smoke test of record sheet generation - DEFERRED (requires manual testing)

## Dependencies

- Phase 1 (Type Consolidation) - Can start immediately, no dependencies
- Phase 2 (Validation Audit) - Can run in parallel with Phase 1
- Phase 3 (File Organization) - Should complete after Phase 1 to avoid merge conflicts
- Phase 4 (Naming Fixes) - Can run in parallel with Phase 3
- Phase 5 (Legacy Cleanup) - Should complete after Phases 1-4
- Phase 6 (Verification) - Must run last after all changes

## Parallelizable Work

- Tasks 1.1 and 1.2 can run in parallel (different type consolidations)
- Tasks 3.1, 3.2, and 3.3 can run in parallel (independent directories)
- Phase 2 (audit) can run alongside other phases
- Phase 4 and Phase 5 can run in parallel
