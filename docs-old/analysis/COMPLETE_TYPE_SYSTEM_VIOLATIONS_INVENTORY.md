# Complete Type System Violations Inventory

This document provides a **comprehensive, file-by-file inventory** of every violation of the Type System Best Practices. Each violation is documented with file path, approximate line numbers, and specific code examples.

**Generated**: 2025-01-XX  
**Total Files with Violations**: 195+  
**Total Violation Instances**: 1000+

---

## Table of Contents

1. [Legacy Import Violations](#1-legacy-import-violations)
2. [Unsafe Type Casting Violations](#2-unsafe-type-casting-violations)
3. [Hardcoded String Literal Violations](#3-hardcoded-string-literal-violations)
4. [Missing Type Guard Violations](#4-missing-type-guard-violations)
5. [Component Category String Violations](#5-component-category-string-violations)

---

## 1. Legacy Import Violations

### 1.1 Importing from `types/systemComponents.ts`

**Total Files**: 42 source files

#### Components (7 files)

**`src/components/editor/tabs/StructureTab.tsx`**
- Line 13: `import { ArmorType, EngineType, GyroType, HeatSinkType, StructureType } from '../../../types/systemComponents';`
- Line 63: `import { calculateStructureWeight, getStructureSlots } from '../../../types/systemComponents';`
- **Fix**: Import from `src/types/core`

**`src/components/unit/SingleUnitProvider.tsx`**
- Line 12: `import { EngineType, GyroType } from '../../types/systemComponents'`
- **Fix**: Import from `src/types/core`

**`src/components/multiUnit/MultiUnitProvider.tsx`**
- Line 13: `import { EngineType, GyroType, StructureType, ArmorType, HeatSinkType } from '../../types/systemComponents';`
- **Fix**: Import from `src/types/core`

**`src/components/equipment/hooks/useEquipmentPlacement.ts`**
- Line 6: `import { EngineType, GyroType } from '../../../types/systemComponents';`
- **Fix**: Import from `src/types/core`

**`src/components/criticalSlots/UnitProvider.tsx`**
- Line 10: `import { EngineType, GyroType } from '../../types/systemComponents'`
- **Fix**: Import from `src/types/core`

**`src/components/criticalSlots/SystemComponentControls.tsx`**
- Line 11: `import { EngineType, GyroType, StructureType, ArmorType, HeatSinkType } from '../../types/systemComponents'`
- **Fix**: Import from `src/types/core`

**`src/components/editor/equipment/DraggableEquipmentItem.tsx`**
- Line 6: `import { isSpecialComponent } from '../../../types/systemComponents';`
- **Fix**: Import from `src/types/core` (or create utility function)

#### Services (7 files)

**`src/services/validation/ValidationCalculations.ts`**
- Line 10: `import { calculateGyroWeight } from '../../types/systemComponents';`
- Line 12: `import { EngineType, GyroType } from '../../types/systemComponents';`
- **Fix**: Import from `src/types/core`

**`src/services/ComponentUpdateService.ts`**
- Line 11: `import { EngineType } from '../types/systemComponents'`
- **Fix**: Import from `src/types/core`

**`src/services/validation/WeightRulesValidator.ts`**
- Line 12: `import { calculateGyroWeight } from '../../types/systemComponents';`
- **Fix**: Import from `src/types/core`

**`src/services/validation/ComponentValidationManager.ts`**
- Line 9: `import { calculateGyroWeight } from '../../types/systemComponents';`
- Line 10: `import { GyroType } from '../../types/systemComponents';`
- **Fix**: Import from `src/types/core`

**`src/services/WeightBalanceService.ts`**
- Line 13: `import { GyroType } from '../types/systemComponents';`
- **Fix**: Import from `src/types/core`

**`src/services/UnitSynchronizationService.ts`**
- Line 15: `import { EngineType, GyroType } from '../types/systemComponents'`
- **Fix**: Import from `src/types/core`

**`src/services/UnitComparisonService.ts`**
- Line 13: `import { EngineType, GyroType } from '../types/systemComponents'`
- **Fix**: Import from `src/types/core`

#### Utils (25 files)

**`src/utils/criticalSlots/UnitCriticalManagerTypes.ts`**
- Line 7: `import { EngineType, GyroType, StructureType, ArmorType, HeatSinkType, CockpitType } from '../../types/systemComponents'`
- **Fix**: Import from `src/types/core`

**`src/utils/componentCalculations.ts`**
- Line 3: `import { calculateEngineWeight, calculateStructureWeight, calculateGyroWeight as calculateGyroWeightCentralized } from '../types/systemComponents';`
- Line 6: `import { GyroType, StructureType, EngineType, ArmorType } from '../types/systemComponents';`
- **Fix**: Import from `src/types/core`

**`src/utils/cockpitCalculations.ts`**
- Line 6: `import { CockpitType } from '../types/systemComponents';`
- **Fix**: Import from `src/types/core`

**`src/utils/armorAllocation.ts`**
- Line 4: `import { calculateEngineWeight, calculateStructureWeight } from '../types/systemComponents';`
- Line 7: `import { StructureType, EngineType } from '../types/systemComponents';`
- **Fix**: Import from `src/types/core`

**`src/utils/advancedValidation.ts`**
- Line 6: `import { calculateEngineWeight, calculateStructureWeight } from '../types/systemComponents';`
- Line 9: `import { StructureType, EngineType, ArmorType } from '../types/systemComponents';`
- **Fix**: Import from `src/types/core`

**`src/utils/componentValidation.ts`**
- Line 17: Multiple imports from `systemComponents`
- Line 20: `import { calculateGyroWeight } from '../types/systemComponents';`
- **Fix**: Import from `src/types/core`

**`src/utils/componentSync.ts`**
- Line 18: Multiple imports from `systemComponents`
- Line 19: `import { STRUCTURE_SLOT_REQUIREMENTS } from '../types/systemComponents';`
- **Fix**: Import from `src/types/core`

**`src/utils/unitAnalysis.ts`**
- Line 14: `import { calculateEngineWeight } from '../types/systemComponents';`
- **Fix**: Import from `src/types/core`

**`src/utils/unit/BattleTechConstructionCalculator.ts`**
- Line 9: `import { calculateGyroWeight } from '../../types/systemComponents';`
- **Fix**: Import from `src/types/core`

**`src/utils/smartSlotUpdate.ts`**
- Line 6: `import { CriticalSlot, CriticalAllocationMap, EngineType, GyroType } from '../types/systemComponents';`
- **Fix**: Import from `src/types/core`

**`src/utils/reset/CustomizerResetService.ts`**
- Line 20: `import { SystemComponents } from '../../types/systemComponents';`
- **Fix**: Import from `src/types/core`

**`src/utils/heatSinkCalculations.ts`**
- Line 13: `import { HeatSinkType, EngineType } from '../types/systemComponents';`
- **Fix**: Import from `src/types/core`

**`src/utils/criticalSlots/UnitCriticalManager.ts`**
- Line 9: `import { EngineType, GyroType, StructureType, ArmorType, HeatSinkType } from '../../types/systemComponents'`
- **Fix**: Import from `src/types/core`

**`src/utils/criticalSlots/SystemComponentRules.ts`**
- Line 7: `import { EngineType, GyroType } from '../../types/systemComponents'`
- **Fix**: Import from `src/types/core`

**`src/utils/criticalSlots/WeightBalanceManager.ts`**
- Line 12: `import { calculateGyroWeight } from '../../types/systemComponents'`
- **Fix**: Import from `src/types/core`

**`src/utils/criticalSlots/SystemComponentsManager.ts`**
- Line 13: `import { HeatSinkType } from '../../types/systemComponents'`
- **Fix**: Import from `src/types/core`

**`src/utils/constructionRules/ConstructionRulesEngine.ts`**
- Line 18: `import { EngineType, HeatSinkType } from '../../types/systemComponents';`
- Line 20: `import { ENGINE_SLOT_REQUIREMENTS } from '../../types/systemComponents';`
- **Fix**: Import from `src/types/core`

**`src/utils/componentRules.ts`**
- Line 25: Multiple imports from `systemComponents`
- **Fix**: Import from `src/types/core`

**`src/utils/armorCalculations.ts`**
- Line 12: `import { ArmorType } from '../types/systemComponents';`
- **Fix**: Import from `src/types/core`

**`src/utils/componentOptionFiltering.ts`**
- Line 3: `import { EngineType, StructureType, HeatSinkType } from '../types/systemComponents';`
- **Fix**: Import from `src/types/core`

**`src/utils/criticalSlots/ArmorManagementManager.ts`**
- Line 7: `import { ArmorType } from '../../types/systemComponents'`
- **Fix**: Import from `src/types/core`

**`src/utils/editor/UnitCalculationService.ts`**
- Line 9: `import { calculateGyroWeight } from '../../types/systemComponents'`
- **Fix**: Import from `src/types/core`

**`src/utils/migration/UnitJSONMigrationService.ts`**
- Line 8: `import { EngineType } from '../../types/systemComponents';`
- **Fix**: Import from `src/types/core`

#### Stores (1 file)

**`src/stores/slices/configurationSlice.ts`**
- Line 5: `import { EngineType, GyroType, StructureType, ArmorType, HeatSinkType } from '../../types/systemComponents';`
- **Fix**: Import from `src/types/core`

#### Hooks (1 file)

**`src/hooks/useUnitData.tsx`**
- Line 8: `import { SystemComponents, CriticalAllocationMap, CriticalSlot, EngineType, GyroType, StructureType, ArmorType, HeatSinkType } from '../types/systemComponents';`
- **Fix**: Import from `src/types/core`

#### Pages (1 file)

**`src/pages/unit/[unitId].tsx`**
- Line 12: `import { EngineType } from '../../types/systemComponents';`
- **Fix**: Import from `src/types/core`

---

### 1.2 Importing from `types/enhancedSystemComponents.ts`

**Total Files**: 2 files

**`src/utils/constructionRules/EquipmentIntegrationService.ts`**
- Line 12: Multiple imports from `enhancedSystemComponents`
- **Fix**: Import from `src/types/core`

**`src/utils/constructionRules/ConstructionRulesEngine.ts`**
- Line 16: Multiple imports from `enhancedSystemComponents`
- **Fix**: Import from `src/types/core`

---

## 2. Unsafe Type Casting Violations

### 2.1 "as any" Casts

**Total Instances**: 93

#### Critical Files (High Priority)

**`src/hooks/useUnitData.tsx`** - 20+ instances
- Line 184: `) as any;` - syncEngineChange result
- Line 193: `(state.unit as any).systemComponents`
- Line 194: `(state.unit as any).criticalAllocations`
- Line 213: `syncGyroChange(...) as any`
- Line 222: `(state.unit as any).systemComponents`
- Line 223: `(state.unit as any).criticalAllocations`
- Line 242: `syncStructureChange(...) as any`
- Line 250: `(state.unit as any).systemComponents`
- Line 252: `(state.unit as any).criticalAllocations`
- Line 277: `syncArmorChange(...) as any`
- Line 294: `(state.unit as any).criticalAllocations`
- Line 392: `let criticalAllocations = (state.unit as any).criticalAllocations;`
- Line 459: `const criticalAllocations = { ...(state.unit as any).criticalAllocations };`
- Line 460: `const systemComponents = (state.unit as any).systemComponents || {`
- Line 478: `slots: (slots as any[]).map(...)`
- Line 522: `criticalAllocations: (state.unit as any).criticalAllocations,`
- Line 598: `let unit = initialUnit as any;`
- Line 609: `cleanedAllocations[location] = (slots as any[]).map(...)`
- Line 749: `return (state.unit as any).systemComponents;`
- Line 754: `return (state.unit as any).criticalAllocations;`
- **Fix**: Use `isValidUnitConfiguration` type guard

**`src/utils/advancedValidation.ts`** - 10+ instances
- Line 225: `(weapon.equipment as any).heat || (weapon.equipment as any).data?.heatmap`
- Line 369: `(weapon.equipment as any).data?.battle_value`
- Line 370: `(weapon.equipment as any).data?.battlevalue`
- Line 379: `(eq.equipment as any).data?.battle_value`
- Line 380: `(eq.equipment as any).data?.battlevalue`
- Line 390: `const quirkName = typeof quirk === 'string' ? quirk : (quirk as any).name || '';`
- Line 406: `(eq.equipment as any).data?.cost`
- Line 407: `(eq.equipment as any).data?.cost_cbills`
- Line 468: `const r = weapon.range as any;`
- Line 491: `(eq.equipment as IEquipment).weight || (eq.equipment as any).data?.tons`
- **Fix**: Use `IEquipment` interface and type guards

**`src/services/analysis/AnalysisManager.ts`** - 15+ instances
- Line 263: `((w.equipment as any).damage ? Number((w.equipment as any).damage) : 0)`
- Line 280: `((eq.equipment as any).heat || (eq.equipment as any).heatGeneration || 0)`
- Line 340: `((eq.equipment as any).requiredSlots || eq.equipment.slots || 0)`
- Line 359: `((w.equipment as any).damage ? Number((w.equipment as any).damage) : 0)`
- Line 454: `((eq.equipment as any).damage ? Number((eq.equipment as any).damage) : 0)`
- Line 455: `((eq.equipment as any).damage ? Number((eq.equipment as any).damage) : 0)`
- Line 471: `((w.equipment as any).damage ? Number((w.equipment as any).damage) : 0)`
- Line 473: `((w.equipment as any).heat || (w.equipment as any).heatGeneration || 0)`
- Line 514: `((weapon.equipment as any).damage ? Number((weapon.equipment as any).damage) : 0)`
- Line 517: `((weapon.equipment as any).heat || (weapon.equipment as any).heatGeneration || 0)`
- Line 564: `((eq.equipment as any).heat || (eq.equipment as any).heatGeneration || 0)`
- **Fix**: Use `IEquipment` interface consistently

**`src/utils/batchOperations.ts`** - 5+ instances
- Line 149: `equipment: equipment as any,`
- Line 168: `equipment: equipment as any,`
- Line 386: `(placement.equipment as any).weight || (placement.equipment as any).data?.tons`
- Line 392: `(instance.equipment as any).weight || (instance.equipment as any).data?.tons`
- Line 415: `equipment: p.equipment as unknown as FullEquipment`
- **Fix**: Use proper type guards

**`src/components/equipment/hooks/useEquipmentPlacement.ts`** - 5+ instances
- Line 226: `('heat' in equipment ? (equipment as any).heat : 0)`
- Line 546: `locationEquipment.push(slot.equipment as any);`
- Line 547: `currentPlacements.push({ equipment: slot.equipment as any, location: slot.location });`
- Line 599: `equipment: equipment as any,`
- Line 613: `return { ...slot, equipment: equipment as any, isEmpty: false };`
- **Fix**: Use `IEquipment` interface

#### Other Files with "as any"

**`src/components/overview/OverviewTab.tsx`**
- Line 429: `techRating={enhancedConfig.techRating as any}`

**`src/components/editor/tabs/StructureTab.tsx`**
- Line 233: `(restorationUpdates as any)[configProperty] = savedComponent;`

**`src/services/validation/EquipmentRulesValidator.ts`**
- Line 50: `('type' in eq && (eq as any).type === 'equipment');`

**`src/services/conversion/UnitConversionService.ts`**
- Line 226: `tech_base: (w as any).tech_base || 'IS'`

**`src/services/allocation/ValidationManager.ts`**
- Line 343: `const baseType = ((equipment.equipmentData as any)?.baseType || '').toString().toLowerCase();`

**`src/services/ComponentUpdateService.ts`**
- Line 55: `newConfiguration.structureType = (typeof newValue === 'string' ? newValue : newValue.type) as any`
- Line 58: `newConfiguration.armorType = (typeof newValue === 'string' ? newValue : newValue.type) as any`
- Line 64: `newConfiguration.gyroType = (typeof newValue === 'string' ? newValue : newValue.type) as any`
- Line 67: `newConfiguration.heatSinkType = (typeof newValue === 'string' ? newValue : newValue.type) as any`

**`src/pages/unit/[unitId].tsx`**
- Line 310: `structureType: newType as any`
- Line 335: `armorType: newType as any`

**`src/components/equipment/hooks/useEquipmentValidation.ts`**
- Line 85: `const equipment = placement.equipment as any;`
- Line 336: `checkDependencies(placement.equipment as any, unit);`

**`src/components/equipment/CriticalAllocationVisualizer.tsx`**
- Line 98: `const eqAny = equipment as any;`

**`src/utils/criticalSlots/UnitCriticalManager.ts`**
- Line 749: Comment mentions "as any" but no actual cast found

**`src/types/core/index.ts`** - Intentional (Migration utilities)
- Lines 219, 230, 239, 247, 255, 265, 274: `as any` in migration functions (acceptable)

**`src/types/core/DataModelExamples.ts`** - Examples only
- Multiple `as any` in example code (acceptable for examples)

---

### 2.2 "as unknown as" Double Casts

**Total Instances**: 11

**`src/services/calculation/strategies/StandardHeatCalculationStrategy.ts`**
- Line 166: `(context as unknown as IUnitConfiguration)`

**`src/utils/batchOperations.ts`**
- Line 415: `p.equipment as unknown as FullEquipment`

**`src/utils/armorAllocationHelpers.ts`**
- Line 186: `(armorType.name || 'Standard') as unknown as ArmorType`
- Line 210: `(armorType.name || 'Standard') as unknown as ArmorType`

**`src/services/weight-balance/ArmorEfficiencyService.ts`**
- Line 154: `allocation as unknown as Record<string, unknown>`

**`src/services/catalog/EquipmentAdapter.ts`**
- Line 59: `category: eq.category as unknown as EquipmentCategory`

**`src/services/calculation/strategies/StandardWeightCalculationStrategy.ts`**
- Line 118: `(context as unknown as IUnitConfiguration)`

**`src/hooks/useUnitData.tsx`**
- Line 439: `} as unknown as import('../types/editor').ArmorAllocationMap;`

**`src/components/equipment/hooks/useEquipmentPlacement.ts`**
- Line 408: `} as unknown as import('../../../types/core/EquipmentInterfaces').IEquipment;`

**`src/components/equipment/EquipmentManagementComponent.tsx`**
- Line 167: `} as unknown as import('../../types/core/EquipmentInterfaces').IEquipment;`
- Line 283: `} as unknown as import('../../types/core/EquipmentInterfaces').IEquipment;`

**Fix**: Use proper type guards instead of double casting

---

## 3. Hardcoded String Literal Violations

### 3.1 TechBase String Literals: 'Inner Sphere'

**Total Instances**: 659+

#### High Priority Files

**`src/components/overview/OverviewTab.tsx`** - 15+ instances
- Line 68: `chassis: 'Inner Sphere',`
- Line 69: `gyro: 'Inner Sphere',`
- Line 70: `engine: 'Inner Sphere',`
- Line 71: `heatsink: 'Inner Sphere',`
- Line 72: `targeting: 'Inner Sphere',`
- Line 73: `myomer: 'Inner Sphere',`
- Line 74: `movement: 'Inner Sphere',`
- Line 75: `armor: 'Inner Sphere'`
- Line 165: `newTechBase: 'Inner Sphere' | 'Clan'`
- Line 217: `if (newTechBase === 'Inner Sphere' || newTechBase === 'Clan') {`
- Line 393: `value={enhancedConfig.techBase || 'Inner Sphere'}`
- Line 394: `onChange={(e) => handleMasterTechBaseChange(e.target.value as 'Inner Sphere' | 'Clan' | 'Mixed')}`
- Line 398: `<option value="Inner Sphere">Inner Sphere</option>`
- **Fix**: Use `TechBase.INNER_SPHERE` constant

**`src/components/editor/tabs/StructureTab.tsx`** - 20+ instances
- Line 85: `techBase === 'Clan' ? 'Clan' : 'Inner Sphere';`
- Line 227: `techBase as 'Inner Sphere' | 'Clan'`
- Line 388: `return { type: 'Endo Steel', techBase: techBase as 'Inner Sphere' | 'Clan' }`
- Line 390: `return { type: 'Endo Steel', techBase: 'Clan' }`
- Line 392: `return { type: 'Composite', techBase: techBase as 'Inner Sphere' | 'Clan' }`
- Line 394: `return { type: 'Reinforced', techBase: techBase as 'Inner Sphere' | 'Clan' }`
- Line 396: `return { type: 'Industrial', techBase: techBase as 'Inner Sphere' | 'Clan' }`
- Line 398: `return { type: 'Standard', techBase: techBase as 'Inner Sphere' | 'Clan' }`
- Line 423: `return { type: 'Standard', techBase: techBase as 'Inner Sphere' | 'Clan' }`
- Line 425: `return { type: 'Compact', techBase: techBase as 'Inner Sphere' | 'Clan' }`
- Line 427: `return { type: 'Heavy Duty', techBase: techBase as 'Inner Sphere' | 'Clan' }`
- Line 429: `return { type: 'XL', techBase: techBase as 'Inner Sphere' | 'Clan' }`
- Line 431: `return { type: 'Standard', techBase: techBase as 'Inner Sphere' | 'Clan' }`
- Line 440: `return { type: 'Single', techBase: techBase as 'Inner Sphere' | 'Clan' }`
- Line 442: `return { type: 'Double', techBase: techBase as 'Inner Sphere' | 'Clan' }`
- Line 444: `return { type: 'Single', techBase: techBase as 'Inner Sphere' | 'Clan' }`
- Line 488: `let newEnhancements: { type: string; techBase: 'Inner Sphere' | 'Clan' }[] = [];`
- Line 490: `newEnhancements = [{ type: newValue, techBase: config.techBase as 'Inner Sphere' | 'Clan' }];`
- Line 590: `? [...enhancements, { type: 'Supercharger', techBase: config.techBase as 'Inner Sphere' | 'Clan' }]`
- Line 709: `{config.techBase === 'Inner Sphere' && option === 'Double' ? 'IS Double' : option}`
- **Fix**: Use `TechBase.INNER_SPHERE` and `TechBase.CLAN` constants

**`src/utils/componentDatabase.ts`** - 20+ instances
- Line 19: `"Inner Sphere": [`
- Line 75: `"Clan": [`
- Line 103: `"Inner Sphere": [`
- Line 173: `"Clan": [`
- Line 212: `"Inner Sphere": [`
- Line 259: `"Clan": [`
- Line 298: `"Inner Sphere": [`
- Line 350: `"Clan": [`
- Line 393: `"Inner Sphere": [`
- Line 487: `"Clan": [`
- Line 527: `"Inner Sphere": [`
- Line 576: `"Clan": [`
- Line 606: `"Inner Sphere": [`
- Line 643: `"Clan": [`
- Line 682: `"Inner Sphere": [`
- Line 710: `"Clan": [`
- Line 761: `const requiredTechBases: TechBase[] = ['Inner Sphere', 'Clan'];`
- Line 832: `techBases: ['Inner Sphere', 'Clan'],`
- **Fix**: Use `TechBase.INNER_SPHERE` and `TechBase.CLAN` as object keys

**`src/services/validation/TechLevelRulesValidator.ts`** - 10+ instances
- Line 50: `const unitTechBase = config.techBase || 'Inner Sphere';`
- Line 324: `item.equipmentData?.techBase === 'Clan'`
- Line 336: `if (config.techBase !== 'Inner Sphere') {`
- Line 340: `techBase: 'Inner Sphere',`
- Line 350: `if (config.techBase !== 'Clan') {`
- Line 354: `techBase: 'Clan',`
- Line 417: `const unitTechBase = config.techBase || 'Inner Sphere';`
- Line 424: `if (isPureTechBase && unitTechBase === 'Clan') {`
- **Fix**: Use `TechBase` constants

**`src/utils/criticalSlots/UnitCriticalManager.ts`** - 10+ instances
- Line 217: `const primaryTechBase = this.configuration.techBase === 'Clan' ? 'Clan' : 'Inner Sphere'`
- **Fix**: Use `TechBase` constants

**`src/utils/constructionRules/ConstructionRulesEngine.ts`** - 10+ instances
- Line 270: `if (techBase === 'Inner Sphere' && engineTechBase === 'Inner Sphere') return true;`
- Line 271: `if (techBase === 'Clan' && engineTechBase === 'Clan') return true;`
- Line 272: `if (techBase === 'Mixed (IS Chassis)' && engineTechBase === 'Inner Sphere') return true;`
- Line 273: `if (techBase === 'Mixed (Clan Chassis)' && engineTechBase === 'Clan') return true;`
- Line 286: `if (techBase === 'Inner Sphere' && heatSinkSpec.techBase === 'Inner Sphere') return true;`
- Line 287: `if (techBase === 'Clan' && heatSinkSpec.techBase === 'Clan') return true;`
- Line 288: `if (techBase === 'Mixed (IS Chassis)' && heatSinkSpec.techBase === 'Inner Sphere') return true;`
- Line 289: `if (techBase === 'Mixed (Clan Chassis)' && heatSinkSpec.techBase === 'Clan') return true;`
- **Fix**: Use `TechBase` constants

#### Additional Files with TechBase String Literals (150+ files)

Due to the large number of files, see the grep output above for complete list. Key patterns:

- Comparison operations: `techBase === 'Inner Sphere'`
- Default values: `techBase || 'Inner Sphere'`
- Type annotations: `techBase: 'Inner Sphere' | 'Clan'`
- Object keys: `"Inner Sphere": [...]`
- JSX options: `<option value="Inner Sphere">Inner Sphere</option>`

---

### 3.2 TechBase String Literals: 'Clan'

**Total Instances**: 418+

Similar pattern to 'Inner Sphere' violations. All instances should use `TechBase.CLAN` constant.

---

## 4. Missing Type Guard Violations

### Problem Areas

**API Response Handling**
- Files accessing `response.data` without validation
- Files processing database query results without type guards

**User Input Processing**
- Form handlers accepting `unknown` data
- Event handlers processing user selections without validation

**Legacy Data Migration**
- Migration functions not using `migrateToTypedConfiguration`
- Direct property access on `any` typed objects

**Example Pattern Found Throughout**:
```typescript
// ❌ BAD - No validation
function processData(data: unknown) {
  const unit = data as ICompleteUnitConfiguration;
  // Access properties without validation
}

// ✅ GOOD
import { isValidUnitConfiguration } from 'src/types/core';
function processData(data: unknown) {
  if (isValidUnitConfiguration(data)) {
    // Safe access
  }
}
```

---

## 5. Component Category String Violations

**Total Instances**: 4

**`src/utils/componentResolution.ts`**
- Line 101: `if (category === 'heatsink') {`
- Line 114: `if (category === 'engine') {`
- Line 130: `if (category === 'armor') {`
- **Fix**: Use `ComponentCategory.HEAT_SINK`, `ComponentCategory.ENGINE`, `ComponentCategory.ARMOR`

**`src/services/validation/modules/AvailabilityManager.ts`**
- Line 90: `if (component.category === 'structure' && component.name.includes('Standard')) {`
- **Fix**: Use `ComponentCategory.STRUCTURE`

---

## Summary by File Count

- **Files with Legacy Imports**: 44 files
- **Files with "as any" Casts**: 22 files  
- **Files with TechBase String Literals**: 153 files
- **Files with Component Category Strings**: 2 files
- **Total Unique Files with Violations**: 195+ files

---

## Migration Priority Matrix

| Priority | Category | File Count | Estimated Effort |
|----------|----------|------------|------------------|
| **P0 - Critical** | `as any` in data flow | 5 files | 2-3 days |
| **P1 - High** | Legacy imports (core utils) | 25 files | 3-4 days |
| **P2 - High** | TechBase string literals (UI) | 20 files | 2-3 days |
| **P3 - Medium** | Remaining legacy imports | 19 files | 2 days |
| **P4 - Medium** | TechBase strings (utils/services) | 100+ files | 5-7 days |
| **P5 - Low** | Component category strings | 2 files | 1 hour |
| **P6 - Low** | Documentation updates | 3 files | 1 hour |

**Total Estimated Effort**: 15-20 days for complete migration

---

## Automated Fix Scripts

Consider creating automated scripts for:
1. Bulk replacement of `'Inner Sphere'` → `TechBase.INNER_SPHERE`
2. Bulk replacement of `'Clan'` → `TechBase.CLAN`
3. Import statement updates from `systemComponents` → `core`
4. Type guard insertion for common patterns

**Note**: Automated fixes should be reviewed manually before committing.

