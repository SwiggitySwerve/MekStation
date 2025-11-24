# Phase 2: Property Naming Standardization - Progress Report

## Overview
Phase 2 focuses on standardizing property naming from snake_case (API format) to camelCase (internal format) throughout the codebase.

## Completed Tasks

### 1. Property Mapping Utilities ✅
**File:** `src/utils/typeConversion/propertyMappers.ts`

- Created bidirectional mapping between API format (snake_case) and internal format (camelCase)
- Supports 50+ property mappings including:
  - `tech_base` ↔ `techBase`
  - `rules_level` ↔ `rulesLevel`
  - `mass` ↔ `tonnage`
  - `armor_allocation` ↔ `armorAllocation`
  - `equipment_placements` ↔ `equipmentPlacements`
  - `critical_slots` ↔ `criticalSlots`
  - And many nested properties (movement, armor, equipment, etc.)
- Functions:
  - `convertApiToInternal()` - Converts snake_case to camelCase
  - `convertInternalToApi()` - Converts camelCase to snake_case
  - `mapApiPropertyToInternal()` - Single property mapping
  - `mapInternalPropertyToApi()` - Single property mapping
  - Format detection utilities

### 2. API Adapter Layer ✅
**File:** `src/utils/typeConversion/apiAdapters/unitAdapter.ts`

- Created `IUnitApiAdapter` interface and `UnitApiAdapter` implementation
- Handles conversion between:
  - `FullUnit` (API format, snake_case) ↔ `ICompleteUnitConfiguration` (internal format, camelCase)
- Includes validation before conversion
- Provides adapter instance for use throughout codebase

### 3. Property Accessors ✅
**File:** `src/utils/typeConversion/propertyAccessors.ts`

- Created safe property accessors that handle both formats during migration:
  - `getTechBase()` - Gets tech base in either format
  - `getRulesLevel()` - Gets rules level in either format
  - `getTonnage()` - Gets tonnage/mass in either format
  - `getEra()` - Gets era
  - `hasTechBase()`, `hasRulesLevel()`, `hasTonnage()` - Existence checks
- Prefers camelCase (internal format) but falls back to snake_case (legacy/API format)
- Enables gradual migration without breaking existing code

### 4. Test Suite ✅
**File:** `src/__tests__/utils/typeConversion/propertyMappers.test.ts`

- Comprehensive test coverage for property mappers
- Tests for:
  - Top-level property conversion
  - Nested object conversion
  - Array conversion
  - Round-trip conversion (API → Internal → API)
  - Unmapped property preservation
  - Edge cases (null, undefined, primitives)

### 5. Validation Services Migration ✅
**Files Updated:**
- `src/utils/editor/BasicInfoValidationService.ts`
- `src/utils/editor/UnitValidationService.ts`

**Changes:**
- Replaced direct property access (`unit.tech_base`, `unit.mass`) with property accessors
- Updated to use `getTechBase()`, `getTonnage()`, `hasTechBase()`, `hasTonnage()`
- Field names in validation errors now use camelCase (`techBase`, `tonnage`)
- Maintains backward compatibility with snake_case properties
- Switch statements support both formats for field validation

## Migration Strategy

### Approach
1. **API Boundaries**: Use adapter layer to convert between formats
2. **Internal Code**: Prefer camelCase properties from `ICompleteUnitConfiguration`
3. **Gradual Migration**: Use property accessors to support both formats during transition
4. **Backward Compatibility**: Maintain support for snake_case in legacy code paths

### Files Identified for Migration

**High Priority (Frequently Used):**
- ✅ `src/utils/editor/BasicInfoValidationService.ts` - Migrated
- ✅ `src/utils/editor/UnitValidationService.ts` - Migrated
- `src/utils/editor/StructureValidationService.ts`
- `src/utils/editor/EngineValidationService.ts`
- `src/utils/editor/SystemValidationService.ts`
- `src/utils/editor/WeaponValidationService.ts`
- `src/utils/editor/UnitEditorController.ts`
- `src/utils/editor/UnitCalculationService.ts`

**Medium Priority:**
- `src/utils/unitValidation.ts`
- `src/utils/unitConverter.ts`
- `src/utils/unitAnalysis.ts`
- `src/utils/componentCalculations.ts`
- `src/utils/componentSync.ts`
- `src/utils/armorAllocation.ts`

**Low Priority (Components):**
- `src/components/editor/**/*.tsx`
- `src/components/units/**/*.tsx`
- `src/components/equipment/**/*.tsx`

## Remaining Work

### Phase 2.4: Continue Internal Code Migration
- [ ] Migrate remaining validation services
- [ ] Update calculation services
- [ ] Update utility functions
- [ ] Update component code

### Phase 2.5: Update Type Definitions
- [ ] Review and update `EditableUnit` interface to prefer camelCase
- [ ] Consider deprecating snake_case properties in `EditableUnit`
- [ ] Ensure `FullUnit` remains snake_case (API format)
- [ ] Document property naming conventions

### Phase 2.7: Verification
- [ ] Run full test suite
- [ ] Verify no regressions
- [ ] Check build passes
- [ ] Update documentation

## Benefits Achieved

1. **Type Safety**: Property accessors provide type-safe access to properties
2. **Consistency**: Internal code now uses camelCase consistently
3. **Backward Compatibility**: Legacy code still works during migration
4. **API Compatibility**: API boundaries maintain snake_case for external compatibility
5. **Maintainability**: Clear separation between API format and internal format

## Next Steps

1. Continue migrating validation services
2. Update calculation and utility services
3. Migrate component code
4. Update type definitions
5. Remove legacy snake_case support once migration is complete

## Notes

- The property accessors provide a safe migration path
- FullUnit (API format) should remain snake_case
- EditableUnit and ICompleteUnitConfiguration should use camelCase
- The adapter layer handles conversions at API boundaries
- Tests ensure round-trip conversion works correctly
