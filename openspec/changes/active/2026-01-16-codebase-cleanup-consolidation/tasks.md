# Tasks: Codebase Cleanup and Consolidation

## Phase 1: Type Consolidation

### 1.1 Result Type Consolidation

- [ ] 1.1.1 Audit all usages of `Result` from `src/services/common/types.ts`
- [ ] 1.1.2 Audit all usages of `ResultType` from `src/services/core/types/BaseTypes.ts`
- [ ] 1.1.3 Determine canonical Result type (BaseTypes.ts has richer API)
- [ ] 1.1.4 Create migration script or manually update all imports
- [ ] 1.1.5 Update `src/services/common/types.ts`:
  - Remove `Result<T, E>` type alias (lines 20-25)
  - Remove `success()` function (lines 27-32)
  - Remove `failure()` function (lines 34-39)
- [ ] 1.1.6 Re-export canonical Result from `src/services/common/types.ts` for compatibility
- [ ] 1.1.7 Run TypeScript compiler to verify no type errors
- [ ] 1.1.8 Run full test suite to verify no regressions

### 1.2 UnitType Consolidation

- [ ] 1.2.1 Audit all usages of `UnitType` type alias from `src/services/common/types.ts`
- [ ] 1.2.2 Audit all usages of `UnitType` enum from `src/types/unit/BattleMechInterfaces.ts`
- [ ] 1.2.3 Document value differences between definitions:
  - Enum has 16 values (most complete)
  - common/types.ts has 12 string literal values
  - desktop & useElectron have 6 values
- [ ] 1.2.4 Update `src/services/common/types.ts`:
  - Remove `UnitType` type alias (lines 101-113)
  - Add re-export: `export { UnitType } from '@/types/unit/BattleMechInterfaces'`
- [ ] 1.2.5 Update `src/components/settings/useElectron.ts`:
  - Remove local `UnitType` definition (line 112)
  - Import from canonical source
- [ ] 1.2.6 Update `desktop/types/BaseTypes.ts`:
  - Remove `UnitType` definition (line 150)
  - Import from shared types or define desktop-specific subset
- [ ] 1.2.7 Run TypeScript compiler to verify no type errors
- [ ] 1.2.8 Run full test suite to verify no regressions

## Phase 2: Validation Rules Audit

### 2.1 Document Current State

- [ ] 2.1.1 List all rules in `src/services/validation/rules/`:
  - `universal/UniversalValidationRules.ts`
  - `mech/MechCategoryRules.ts`
  - `vehicle/VehicleCategoryRules.ts`
  - `aerospace/AerospaceCategoryRules.ts`
  - `personnel/PersonnelCategoryRules.ts`
  - `battlemech/BattleMechRules.ts`
- [ ] 2.1.2 List all rules in `src/utils/validation/rules/`:
  - `StandardValidationRules.ts`
  - `BipedValidationRules.ts`
  - `QuadValidationRules.ts`
  - `TripodValidationRules.ts`
  - `LAMValidationRules.ts`
  - `QuadVeeValidationRules.ts`
  - `OmniMechValidationRules.ts`
  - `ConfigurationValidationRules.ts`
  - `GenericValidationRules.ts`
  - `ValidationOrchestrator.ts`
  - `ValidationRuleRegistry.ts`
  - `validationHelpers.ts`
- [ ] 2.1.3 Create rule coverage matrix (which rules validate what)

### 2.2 Determine Consolidation Strategy

- [ ] 2.2.1 Identify overlapping rules between systems
- [ ] 2.2.2 Identify unique rules in each system
- [ ] 2.2.3 Decide strategy:
  - Option A: Keep both (different purposes - unit-type vs config-based)
  - Option B: Merge into services/validation/rules/
  - Option C: Deprecate utils/validation/rules/ over time
- [ ] 2.2.4 Document decision and rationale
- [ ] 2.2.5 Create migration plan if consolidating

## Phase 3: File Organization Refactoring

### 3.1 UnitLoaderService Directory Refactor

- [ ] 3.1.1 Create `src/services/units/unitLoaderService/` directory
- [ ] 3.1.2 Move `UnitLoaderService.types.ts` → `unitLoaderService/types.ts`
- [ ] 3.1.3 Move `UnitLoaderService.type-guards.ts` → `unitLoaderService/typeGuards.ts`
- [ ] 3.1.4 Move `UnitLoaderService.armor-calculations.ts` → `unitLoaderService/armorCalculations.ts`
- [ ] 3.1.5 Move `UnitLoaderService.component-mappers.ts` → `unitLoaderService/componentMappers.ts`
- [ ] 3.1.6 Move `UnitLoaderService.equipment-mapping.ts` → `unitLoaderService/equipmentMapping.ts`
- [ ] 3.1.7 Move `UnitLoaderService.equipment-resolution.ts` → `unitLoaderService/equipmentResolution.ts`
- [ ] 3.1.8 Move `UnitLoaderService.unit-loader.ts` → `unitLoaderService/unitLoader.ts`
- [ ] 3.1.9 Move `UnitLoaderService.ts` → `unitLoaderService/index.ts`
- [ ] 3.1.10 Update all internal imports within the directory
- [ ] 3.1.11 Update all external imports to use new paths
- [ ] 3.1.12 Delete old files
- [ ] 3.1.13 Run tests to verify no regressions

### 3.2 SVGRecordSheetRenderer Directory Refactor

- [ ] 3.2.1 Create `src/services/printing/svgRecordSheetRenderer/` directory
- [ ] 3.2.2 Move `SVGRecordSheetRenderer.constants.ts` → `svgRecordSheetRenderer/constants.ts`
- [ ] 3.2.3 Move `SVGRecordSheetRenderer.canvas.ts` → `svgRecordSheetRenderer/canvas.ts`
- [ ] 3.2.4 Move `SVGRecordSheetRenderer.armor.ts` → `svgRecordSheetRenderer/armor.ts`
- [ ] 3.2.5 Move `SVGRecordSheetRenderer.criticals.ts` → `svgRecordSheetRenderer/criticals.ts`
- [ ] 3.2.6 Move `SVGRecordSheetRenderer.equipment.ts` → `svgRecordSheetRenderer/equipment.ts`
- [ ] 3.2.7 Move `SVGRecordSheetRenderer.structure.ts` → `svgRecordSheetRenderer/structure.ts`
- [ ] 3.2.8 Move `SVGRecordSheetRenderer.template.ts` → `svgRecordSheetRenderer/template.ts`
- [ ] 3.2.9 Move `SVGRecordSheetRenderer.ts` → `svgRecordSheetRenderer/index.ts`
- [ ] 3.2.10 Update all internal imports within the directory
- [ ] 3.2.11 Update all external imports to use new paths
- [ ] 3.2.12 Update test file paths in `src/__tests__/service/printing/`
- [ ] 3.2.13 Delete old files
- [ ] 3.2.14 Run tests to verify no regressions

### 3.3 aliasUtils Directory Refactor

- [ ] 3.3.1 Create `src/services/equipment/aliases/` directory
- [ ] 3.3.2 Move `aliasUtils.ammunition.ts` → `aliases/ammunition.ts`
- [ ] 3.3.3 Move `aliasUtils.legacy.ts` → `aliases/legacy.ts`
- [ ] 3.3.4 Move `aliasUtils.misc.ts` → `aliases/misc.ts`
- [ ] 3.3.5 Move `aliasUtils.static.ts` → `aliases/static.ts`
- [ ] 3.3.6 Move `aliasUtils.weapon.ts` → `aliases/weapon.ts`
- [ ] 3.3.7 Create `aliases/index.ts` with barrel exports
- [ ] 3.3.8 Update all internal imports within the directory
- [ ] 3.3.9 Update all external imports to use new paths
- [ ] 3.3.10 Delete old files
- [ ] 3.3.11 Run tests to verify no regressions

## Phase 4: Naming Convention Fixes

### 4.1 Store Rename

- [ ] 4.1.1 Rename `src/stores/navigationStore.ts` → `src/stores/useNavigationStore.ts`
- [ ] 4.1.2 Update import in `src/stores/index.ts`
- [ ] 4.1.3 Search and update all imports of `navigationStore`
- [ ] 4.1.4 Run tests to verify no regressions

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

- [ ] 5.2.1 Address or remove TODO in `src/services/construction/MechBuilderService.ts`:
  - "TODO: Add validation for maximum armor per location"
- [ ] 5.2.2 Address or remove TODO in `src/types/core/ComponentDatabase.ts`:
  - "TODO: Replace with spec-driven implementation"
- [ ] 5.2.3 Address or remove TODO in `src/types/core/ComponentInterfaces.ts`:
  - "TODO: Replace with spec-driven implementation"
- [ ] 5.2.4 Address or remove TODO in `src/types/core/EquipmentInterfaces.ts`:
  - "TODO: Replace with spec-driven implementation"
- [ ] 5.2.5 Address or remove TODO in `src/types/core/UnitInterfaces.ts`:
  - "TODO: Replace with spec-driven implementation"

## Phase 6: Verification

### 6.1 Final Verification

- [ ] 6.1.1 Run `npm run typecheck` - all types must pass
- [ ] 6.1.2 Run `npm run lint` - all lint rules must pass
- [ ] 6.1.3 Run `npm run test` - all tests must pass
- [ ] 6.1.4 Run `npm run build` - build must succeed
- [ ] 6.1.5 Manual smoke test of customizer functionality
- [ ] 6.1.6 Manual smoke test of record sheet generation

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
