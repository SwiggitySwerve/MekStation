# Implementation Tasks

## 1. Specification

- [x] 1.1 Create proposal.md documenting the change
- [x] 1.2 Create spec delta for validation-patterns
- [x] 1.3 Validate proposal with `openspec validate --strict`

## 2. Lint Rule (Already Complete)

- [x] 2.1 Add ESLint `no-restricted-syntax` rule to catch double assertions
- [x] 2.2 Verify rule correctly identifies violations

## 3. Fix Test File Violations (15 files, ~55 violations)

- [x] 3.1 Fix `src/__tests__/api/units/import.test.ts`
- [x] 3.2 Fix `src/__tests__/hooks/useKeyboardNavigation.test.ts`
- [x] 3.3 Fix `src/__tests__/integration/dataLoading/UnitFactoryService.test.ts`
- [x] 3.4 Fix `src/__tests__/service/conversion/MTFImportService.test.ts`
- [x] 3.5 Fix `src/__tests__/service/conversion/UnitFormatConverter.test.ts`
- [x] 3.6 Fix `src/__tests__/service/equipment/EquipmentLoaderService.test.ts`
- [x] 3.7 Fix `src/__tests__/service/equipment/EquipmentNameMapper.test.ts`
- [x] 3.8 Fix `src/__tests__/service/equipment/EquipmentRegistry.test.ts`
- [x] 3.9 Fix `src/__tests__/service/equipment/FormulaRegistry.test.ts`
- [x] 3.10 Fix `src/__tests__/service/persistence/FileService.test.ts`
- [x] 3.11 Fix `src/__tests__/service/persistence/IndexedDBService.test.ts`
- [x] 3.12 Fix `src/__tests__/service/persistence/MigrationService.test.ts`
- [x] 3.13 Fix `src/__tests__/service/printing/RecordSheetService.test.ts`
- [x] 3.14 Fix `src/__tests__/service/printing/SVGRecordSheetRenderer.test.ts`
- [x] 3.15 Fix `src/__tests__/service/units/UnitFactoryService.test.ts`

## 4. Verification

- [x] 4.1 Run ESLint to confirm no double-casting violations remain
- [x] 4.2 Run full test suite
- [x] 4.3 Verify build passes
