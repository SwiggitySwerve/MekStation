# Type System Best Practices Violations Report

This document catalogs all violations of the Type System Best Practices found in the codebase. 
Generated: 2025-01-XX

## Summary Statistics

- **Legacy Imports**: 50+ files importing from deprecated `systemComponents.ts`
- **Enhanced System Components Imports**: 2 files
- **Component Database Imports**: 3 files (documentation only)
- **"as any" Casts**: 93 instances
- **"as unknown as" Casts**: 11 instances
- **Hardcoded TechBase Strings**: 659+ instances of `'Inner Sphere'` and 418+ instances of `'Clan'`
- **Hardcoded Component Category Strings**: 4 instances
- **Missing Type Guards**: Widespread - external data accessed without validation

---

## 1. Legacy Import Violations

### Violation: Importing from `types/systemComponents.ts`

**Rule**: All types must be imported from `src/types/core`.

**Files Affected** (50 files):

#### Components
- `src/components/editor/tabs/StructureTab.tsx`
- `src/components/unit/SingleUnitProvider.tsx`
- `src/components/multiUnit/MultiUnitProvider.tsx`
- `src/components/equipment/hooks/useEquipmentPlacement.ts`
- `src/components/criticalSlots/UnitProvider.tsx`
- `src/components/criticalSlots/SystemComponentControls.tsx`
- `src/components/editor/equipment/DraggableEquipmentItem.tsx`

#### Services
- `src/services/validation/ValidationCalculations.ts`
- `src/services/ComponentUpdateService.ts`
- `src/services/validation/WeightRulesValidator.ts`
- `src/services/validation/ComponentValidationManager.ts`
- `src/services/WeightBalanceService.ts`
- `src/services/UnitSynchronizationService.ts`
- `src/services/UnitComparisonService.ts`

#### Utils
- `src/utils/criticalSlots/UnitCriticalManagerTypes.ts`
- `src/utils/componentCalculations.ts`
- `src/utils/cockpitCalculations.ts`
- `src/utils/armorAllocation.ts`
- `src/utils/advancedValidation.ts`
- `src/utils/componentValidation.ts`
- `src/utils/componentSync.ts`
- `src/utils/unitAnalysis.ts`
- `src/utils/unit/BattleTechConstructionCalculator.ts`
- `src/utils/smartSlotUpdate.ts`
- `src/utils/reset/CustomizerResetService.ts`
- `src/utils/heatSinkCalculations.ts`
- `src/utils/criticalSlots/UnitCriticalManager.ts`
- `src/utils/criticalSlots/SystemComponentRules.ts`
- `src/utils/criticalSlots/WeightBalanceManager.ts`
- `src/utils/criticalSlots/SystemComponentsManager.ts`
- `src/utils/constructionRules/ConstructionRulesEngine.ts`
- `src/utils/componentRules.ts`
- `src/utils/armorCalculations.ts`
- `src/utils/componentOptionFiltering.ts`
- `src/utils/criticalSlots/ArmorManagementManager.ts`
- `src/utils/editor/UnitCalculationService.ts`

#### Stores
- `src/stores/slices/configurationSlice.ts`

#### Hooks
- `src/hooks/useUnitData.tsx`

#### Pages
- `src/pages/unit/[unitId].tsx`

**Example Violation**:
```typescript
// ❌ BAD
import { EngineType, GyroType } from '../../types/systemComponents';

// ✅ GOOD
import { EngineType, GyroType } from 'src/types/core';
```

---

### Violation: Importing from `types/enhancedSystemComponents.ts`

**Files Affected** (2 files):
- `src/utils/constructionRules/EquipmentIntegrationService.ts`
- `src/utils/constructionRules/ConstructionRulesEngine.ts`

**Example Violation**:
```typescript
// ❌ BAD
import { EnhancedSystemComponents } from '../../types/enhancedSystemComponents';

// ✅ GOOD
import { ICompleteUnitConfiguration } from 'src/types/core';
```

---

## 2. Unsafe Type Casting Violations

### Violation: "as any" Casts

**Rule**: Use type guards (`isValid*` functions) instead of `as any`.

**Critical Violations** (93 instances):

#### High Priority Files
- `src/hooks/useUnitData.tsx` - 20+ instances
- `src/utils/advancedValidation.ts` - 10+ instances
- `src/services/analysis/AnalysisManager.ts` - 15+ instances
- `src/utils/batchOperations.ts` - 5+ instances
- `src/components/equipment/hooks/useEquipmentPlacement.ts` - 5+ instances

**Example Violations**:
```typescript
// ❌ BAD - src/hooks/useUnitData.tsx:184
systemComponents: systemComponents || (state.unit as any).systemComponents,

// ✅ GOOD
import { isValidUnitConfiguration } from 'src/types/core';
if (isValidUnitConfiguration(state.unit)) {
  systemComponents: systemComponents || state.unit.systemComponents,
}
```

```typescript
// ❌ BAD - src/utils/advancedValidation.ts:225
const heat = (weapon.equipment as any).heat || (weapon.equipment as any).data?.heatmap || 0;

// ✅ GOOD
import { IEquipment } from 'src/types/core';
if (isValidEquipment(weapon.equipment)) {
  const heat = weapon.equipment.heatGeneration || weapon.equipment.heat || 0;
}
```

---

### Violation: "as unknown as" Double Casts

**Files Affected** (11 instances):
- `src/services/calculation/strategies/StandardHeatCalculationStrategy.ts`
- `src/utils/batchOperations.ts`
- `src/utils/armorAllocationHelpers.ts`
- `src/services/weight-balance/ArmorEfficiencyService.ts`
- `src/services/catalog/EquipmentAdapter.ts`
- `src/services/calculation/strategies/StandardWeightCalculationStrategy.ts`
- `src/hooks/useUnitData.tsx`
- `src/components/equipment/hooks/useEquipmentPlacement.ts`
- `src/components/equipment/EquipmentManagementComponent.tsx`

**Example Violation**:
```typescript
// ❌ BAD
const equipment = p.equipment as unknown as FullEquipment;

// ✅ GOOD
import { IEquipment } from 'src/types/core';
import { isValidEquipment } from 'src/types/core';
if (isValidEquipment(p.equipment)) {
  const equipment = p.equipment; // Already typed
}
```

---

## 3. Hardcoded String Literal Violations

### Violation: TechBase String Literals

**Rule**: Use `TechBase.INNER_SPHERE` and `TechBase.CLAN` constants instead of string literals.

**Files with Most Violations**:
- `src/components/overview/OverviewTab.tsx` - 15+ instances
- `src/components/editor/tabs/StructureTab.tsx` - 20+ instances
- `src/utils/componentDatabase.ts` - 20+ instances
- `src/services/validation/TechLevelRulesValidator.ts` - 10+ instances
- `src/utils/criticalSlots/UnitCriticalManager.ts` - 10+ instances
- `src/utils/constructionRules/ConstructionRulesEngine.ts` - 10+ instances

**Example Violations**:
```typescript
// ❌ BAD - src/components/overview/OverviewTab.tsx:68
chassis: 'Inner Sphere',

// ✅ GOOD
import { TechBase } from 'src/types/core';
chassis: TechBase.INNER_SPHERE,
```

```typescript
// ❌ BAD - src/components/editor/tabs/StructureTab.tsx:85
techBase === 'Clan' ? 'Clan' : 'Inner Sphere';

// ✅ GOOD
import { TechBase } from 'src/types/core';
techBase === TechBase.CLAN ? TechBase.CLAN : TechBase.INNER_SPHERE;
```

```typescript
// ❌ BAD - src/utils/componentDatabase.ts:19
"Inner Sphere": [

// ✅ GOOD
import { TechBase } from 'src/types/core';
[TechBase.INNER_SPHERE]: [
```

---

### Violation: Component Category String Literals

**Files Affected** (4 instances):
- `src/utils/componentResolution.ts` - 3 instances
- `src/services/validation/modules/AvailabilityManager.ts` - 1 instance

**Example Violations**:
```typescript
// ❌ BAD - src/utils/componentResolution.ts:101
if (category === 'heatsink') {

// ✅ GOOD
import { ComponentCategory } from 'src/types/core';
if (category === ComponentCategory.HEAT_SINK) {
```

---

## 4. Missing Type Guard Violations

**Rule**: External/unknown data must be validated with type guards before use.

**Problem Areas**:
- API response handling
- Database query results
- User input processing
- Legacy data migration

**Example Violations**:
```typescript
// ❌ BAD - No validation before use
function processUnit(data: unknown) {
  const unit = data as ICompleteUnitConfiguration; // Unsafe!
  console.log(unit.tonnage);
}

// ✅ GOOD
import { isValidUnitConfiguration } from 'src/types/core';
function processUnit(data: unknown) {
  if (isValidUnitConfiguration(data)) {
    console.log(data.tonnage); // Safe - TypeScript knows it's valid
  } else {
    throw new Error('Invalid unit configuration');
  }
}
```

---

## 5. Documentation Violations

**Files Affected**:
- `docs/guidelines/DROPDOWN_MIGRATION_EXAMPLES.md` - 3 instances importing from deleted `componentDatabase.ts`

---

## Priority Fix Order

### Phase 1: Critical (Breaking Changes Risk)
1. Fix all `as any` casts in core data flow (`useUnitData.tsx`, `advancedValidation.ts`)
2. Replace legacy imports in frequently-used utilities
3. Add type guards for API responses

### Phase 2: High Priority (Type Safety)
1. Replace all TechBase string literals with constants
2. Replace component category string literals
3. Fix `as unknown as` double casts

### Phase 3: Medium Priority (Code Quality)
1. Update remaining legacy imports
2. Add type guards for external data sources
3. Update documentation examples

### Phase 4: Low Priority (Cleanup)
1. Remove deprecated bridge files once all imports are migrated
2. Update test files to use new imports
3. Final verification pass

---

## Migration Strategy

For each violation category, follow this pattern:

1. **Identify** all instances in a file
2. **Import** correct types from `src/types/core`
3. **Replace** legacy imports/casts/strings
4. **Add** type guards where needed
5. **Test** to ensure functionality preserved
6. **Verify** TypeScript compilation succeeds

---

## Automated Detection

To find violations in the future, use these grep patterns:

```bash
# Find legacy imports
grep -r "from.*types/systemComponents" src/
grep -r "from.*types/enhancedSystemComponents" src/

# Find unsafe casts
grep -r "as any" src/
grep -r "as unknown as" src/

# Find hardcoded TechBase strings
grep -r "'Inner Sphere'" src/ | grep -v "TechBase.INNER_SPHERE"
grep -r "'Clan'" src/ | grep -v "TechBase.CLAN"

# Find hardcoded component categories
grep -r "category === 'engine'" src/
grep -r "category === 'gyro'" src/
```

---

## Notes

- Some `as any` casts in `src/types/core/index.ts` are intentional for legacy migration utilities and should remain.
- Documentation files (`docs/`) may contain example code that violates rules - these should be updated but are lower priority.
- Test files may need special handling to maintain backward compatibility during migration.

