# Phased Refactoring Plan: Casting and Data Structure Fixes

## Overview

This document provides a detailed, phased implementation plan to eliminate type casting issues and fix data structure inconsistencies in the BattleTech Editor codebase.

**Timeline Estimate:** 4-6 weeks (depending on team size and parallel work)
**Risk Level:** Medium (requires careful migration to avoid breaking changes)

---

## Phase 0: Preparation and Foundation (Week 1)

### Objectives
- Set up infrastructure for type-safe conversions
- Create foundational utilities
- Establish testing framework

### Tasks

#### 0.1 Create Enum Conversion Utilities
**Files:** `src/utils/typeConversion/enumConverters.ts`

**Implementation:**
```typescript
import { TechBase, RulesLevel } from '../../types/core/BaseTypes';

/**
 * Converts string to TechBase enum with validation
 */
export function stringToTechBase(value: string | undefined | null): TechBase | null {
  if (!value) return null;
  
  const normalized = value.trim();
  const mapping: Record<string, TechBase> = {
    'Inner Sphere': TechBase.INNER_SPHERE,
    'Clan': TechBase.CLAN,
    'Mixed (IS Chassis)': TechBase.MIXED_IS_CHASSIS,
    'Mixed (Clan Chassis)': TechBase.MIXED_CLAN_CHASSIS,
    'Mixed': TechBase.MIXED,
    'Both': TechBase.BOTH,
  };
  
  return mapping[normalized] ?? null;
}

/**
 * Converts TechBase enum to string
 */
export function techBaseToString(techBase: TechBase): string {
  return techBase;
}

/**
 * Converts string to RulesLevel enum with validation
 */
export function stringToRulesLevel(value: string | number | undefined | null): RulesLevel | null {
  if (!value) return null;
  
  const normalized = typeof value === 'number' 
    ? getRulesLevelName(value)
    : String(value).trim();
    
  const mapping: Record<string, RulesLevel> = {
    'Introductory': RulesLevel.INTRODUCTORY,
    'Standard': RulesLevel.STANDARD,
    'Advanced': RulesLevel.ADVANCED,
    'Experimental': RulesLevel.EXPERIMENTAL,
  };
  
  return mapping[normalized] ?? null;
}

/**
 * Converts RulesLevel enum to string
 */
export function rulesLevelToString(rulesLevel: RulesLevel): string {
  return rulesLevel;
}

/**
 * Maps numeric rules level to string name
 */
function getRulesLevelName(level: number): string {
  const mapping: Record<number, string> = {
    0: 'Introductory',
    1: 'Standard',
    2: 'Advanced',
    3: 'Experimental',
  };
  return mapping[level] ?? 'Standard';
}
```

**Tests:** `src/__tests__/utils/typeConversion/enumConverters.test.ts`
- Test all valid conversions
- Test invalid inputs return null
- Test edge cases (empty strings, null, undefined)

---

#### 0.2 Expand Enum Definitions
**Files:** `src/types/core/BaseTypes.ts`

**Changes:**
```typescript
export enum TechBase {
  INNER_SPHERE = 'Inner Sphere',
  CLAN = 'Clan',
  MIXED_IS_CHASSIS = 'Mixed (IS Chassis)',
  MIXED_CLAN_CHASSIS = 'Mixed (Clan Chassis)',
  MIXED = 'Mixed',
  BOTH = 'Both'
}
```

**Validation:**
- Ensure all string literals in codebase map to enum values
- Update any hardcoded string comparisons

---

#### 0.3 Create Location Name Mapping Utilities
**Files:** `src/utils/typeConversion/locationMappers.ts`

**Implementation:**
```typescript
/**
 * Maps display location names to camelCase property names
 */
export const LOCATION_NAME_TO_PROPERTY: Record<string, keyof IArmorAllocation> = {
  'Head': 'head',
  'Center Torso': 'centerTorso',
  'Left Torso': 'leftTorso',
  'Right Torso': 'rightTorso',
  'Left Arm': 'leftArm',
  'Right Arm': 'rightArm',
  'Left Leg': 'leftLeg',
  'Right Leg': 'rightLeg',
} as const;

/**
 * Maps camelCase property names to display location names
 */
export const PROPERTY_TO_LOCATION_NAME: Record<keyof IArmorAllocation, string> = {
  head: 'Head',
  centerTorso: 'Center Torso',
  centerTorsoRear: 'Center Torso (Rear)',
  leftTorso: 'Left Torso',
  leftTorsoRear: 'Left Torso (Rear)',
  rightTorso: 'Right Torso',
  rightTorsoRear: 'Right Torso (Rear)',
  leftArm: 'Left Arm',
  rightArm: 'Right Arm',
  leftLeg: 'Left Leg',
  rightLeg: 'Right Leg',
} as const;

export function locationNameToProperty(displayName: string): keyof IArmorAllocation | null {
  return LOCATION_NAME_TO_PROPERTY[displayName] ?? null;
}

export function propertyToLocationName(property: keyof IArmorAllocation): string {
  return PROPERTY_TO_LOCATION_NAME[property] ?? property;
}
```

**Tests:** `src/__tests__/utils/typeConversion/locationMappers.test.ts`

---

#### 0.4 Create Validation Utilities
**Files:** `src/utils/typeConversion/validators.ts`

**Implementation:**
```typescript
import { FullUnit } from '../../types';
import { TechBase, RulesLevel } from '../../types/core/BaseTypes';
import { stringToTechBase, stringToRulesLevel } from './enumConverters';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateFullUnit(unit: FullUnit): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate required fields
  if (!unit.id) errors.push('Missing unit id');
  if (!unit.chassis) errors.push('Missing chassis');
  if (!unit.model) errors.push('Missing model');
  if (!unit.mass || unit.mass <= 0) errors.push('Invalid mass');
  
  // Validate tech base
  const techBase = stringToTechBase(unit.tech_base);
  if (!techBase && unit.tech_base) {
    warnings.push(`Unknown tech base: ${unit.tech_base}`);
  }
  
  // Validate rules level
  const rulesLevel = stringToRulesLevel(unit.rules_level);
  if (!rulesLevel && unit.rules_level) {
    warnings.push(`Unknown rules level: ${unit.rules_level}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
```

**Tests:** `src/__tests__/utils/typeConversion/validators.test.ts`

---

### Success Criteria
- ✅ All enum conversion utilities implemented and tested
- ✅ Enums expanded to cover all string literal variants
- ✅ Location mapping utilities created
- ✅ Validation utilities in place
- ✅ Test coverage > 90% for new utilities

---

## Phase 1: Fix Critical Casting Issues (Week 1-2)

### Objectives
- Eliminate all `as any` casts
- Fix type guards returning `any`
- Remove incomplete conversion casts

### Tasks

#### 1.1 Fix `as any` Casts in `unitConverter.ts`
**Files:** `src/utils/unitConverter.ts`

**Before:**
```typescript
techBase: (unit.tech_base || 'Inner Sphere') as any,
rulesLevel: (unit.rules_level || 'Standard') as any,
```

**After:**
```typescript
import { stringToTechBase, stringToRulesLevel } from './typeConversion/enumConverters';
import { TechBase, RulesLevel } from '../types/core/BaseTypes';

// In convertFullUnitToEditableUnit function:
const techBase = stringToTechBase(unit.tech_base) ?? TechBase.INNER_SPHERE;
const rulesLevel = stringToRulesLevel(unit.rules_level) ?? RulesLevel.STANDARD;

return {
  // ...
  techBase,
  rulesLevel,
  // ...
};
```

**Validation:**
- Add error handling for invalid values
- Log warnings for unmapped values
- Use default values only when appropriate

**Tests:**
- Test with valid tech bases
- Test with invalid tech bases (should use default)
- Test with null/undefined (should use default)
- Test with numeric rules levels

---

#### 1.2 Fix Type Guards Returning `any`
**Files:** `src/types/core/BaseTypes.ts`

**Before:**
```typescript
export function isValidUnitState(state: unknown): state is any {
  // ...
}
```

**After:**
```typescript
import { ICompleteUnitState } from './UnitInterfaces';

export function isValidUnitState(state: unknown): state is ICompleteUnitState {
  if (typeof state !== 'object' || state === null) {
    return false;
  }
  
  const s = state as Record<string, unknown>;
  
  return (
    'configuration' in s &&
    'unallocatedEquipment' in s &&
    'criticalSlots' in s &&
    'validation' in s &&
    'metadata' in s &&
    isValidUnitConfiguration(s.configuration) &&
    Array.isArray(s.unallocatedEquipment) &&
    typeof s.criticalSlots === 'object' &&
    isValidationState(s.validation) &&
    isStateMetadata(s.metadata)
  );
}
```

**Apply to:**
- `isValidUnitState` → `ICompleteUnitState`
- `isValidUnitConfiguration` → `ICompleteUnitConfiguration`
- `isValidEquipmentAllocation` → `IEquipmentInstance`

**Tests:**
- Test with valid objects
- Test with invalid objects
- Test with null/undefined
- Test with partial objects

---

#### 1.3 Remove Incomplete Conversion Cast
**Files:** `src/utils/unitConverter.ts`

**Before:**
```typescript
} as unknown as EditableUnit; // Partial implementation cast until fully hydrated
```

**After:**
- Complete the conversion function to return a fully hydrated `EditableUnit`
- Calculate all properties from source data
- Remove the cast entirely

**Implementation Steps:**
1. Extract structure calculation from `unit.data.structure`
2. Extract engine calculation from `unit.data.engine`
3. Extract gyro calculation from `unit.data.gyro`
4. Extract cockpit calculation from `unit.data.cockpit`
5. Calculate armor allocation from `unit.data.armor.locations`
6. Calculate heat sinks from `unit.data.heat_sinks`
7. Calculate jump jets from movement data

**Helper Functions Needed:**
```typescript
function calculateStructureFromData(data: UnitData, tonnage: number): IStructureConfiguration {
  // Implementation
}

function calculateEngineFromData(data: UnitData, tonnage: number): IEngineConfiguration {
  // Implementation
}

// ... etc
```

**Tests:**
- Test complete conversion with full unit data
- Test conversion with missing optional fields
- Test conversion with invalid data (should fail gracefully)
- Verify round-trip capability (if possible)

---

### Success Criteria
- ✅ Zero `as any` casts in production code
- ✅ All type guards return concrete types
- ✅ `convertFullUnitToEditableUnit` returns complete `EditableUnit` without casts
- ✅ All conversions validated with proper error handling
- ✅ Test coverage > 85% for conversion functions

---

## Phase 2: Standardize Property Naming (Week 2-3)

### Objectives
- Create API adapter layer for snake_case → camelCase
- Migrate internal code to use camelCase consistently
- Maintain backward compatibility

### Tasks

#### 2.1 Create API Adapter Layer
**Files:** `src/utils/apiAdapters/unitAdapter.ts`

**Implementation:**
```typescript
import { FullUnit } from '../../types';
import { ICompleteUnitConfiguration, TechBase, RulesLevel } from '../../types/core';

/**
 * Adapter to convert API response (snake_case) to internal format (camelCase)
 */
export interface IUnitApiAdapter {
  fromApiResponse(apiUnit: any): FullUnit;
  toApiRequest(unit: ICompleteUnitConfiguration): any;
}

export class UnitApiAdapter implements IUnitApiAdapter {
  fromApiResponse(apiUnit: any): FullUnit {
    return {
      id: apiUnit.id,
      chassis: apiUnit.chassis,
      model: apiUnit.model,
      mass: apiUnit.mass,
      era: apiUnit.era,
      tech_base: apiUnit.tech_base,
      rules_level: apiUnit.rules_level,
      data: apiUnit.data,
      // ... map all fields
    };
  }
  
  toApiRequest(unit: ICompleteUnitConfiguration): any {
    return {
      id: unit.id,
      chassis: unit.chassis,
      model: unit.model,
      mass: unit.tonnage,
      era: unit.era,
      tech_base: techBaseToString(unit.techBase),
      rules_level: rulesLevelToString(unit.rulesLevel),
      data: this.convertDataToApiFormat(unit),
    };
  }
  
  private convertDataToApiFormat(unit: ICompleteUnitConfiguration): any {
    // Convert camelCase internal format to snake_case API format
    // ...
  }
}
```

**Usage:**
- Use adapter at API boundaries only
- Keep internal code using camelCase
- Maintain type safety throughout

---

#### 2.2 Create Property Mapping Utilities
**Files:** `src/utils/typeConversion/propertyMappers.ts`

**Implementation:**
```typescript
/**
 * Maps snake_case API properties to camelCase internal properties
 */
export const API_TO_INTERNAL_PROPERTY_MAP: Record<string, string> = {
  'tech_base': 'techBase',
  'rules_level': 'rulesLevel',
  'armor_allocation': 'armorAllocation',
  'equipment_placements': 'equipmentPlacements',
  'critical_slots': 'criticalSlots',
  // ... all property mappings
} as const;

/**
 * Maps camelCase internal properties to snake_case API properties
 */
export const INTERNAL_TO_API_PROPERTY_MAP: Record<string, string> = {
  'techBase': 'tech_base',
  'rulesLevel': 'rules_level',
  'armorAllocation': 'armor_allocation',
  'equipmentPlacements': 'equipment_placements',
  'criticalSlots': 'critical_slots',
  // ... all property mappings
} as const;

export function convertApiToInternal<T>(apiObject: any): T {
  const result: any = {};
  for (const [apiKey, value] of Object.entries(apiObject)) {
    const internalKey = API_TO_INTERNAL_PROPERTY_MAP[apiKey] ?? apiKey;
    result[internalKey] = value;
  }
  return result as T;
}

export function convertInternalToApi<T>(internalObject: any): T {
  const result: any = {};
  for (const [internalKey, value] of Object.entries(internalObject)) {
    const apiKey = INTERNAL_TO_API_PROPERTY_MAP[internalKey] ?? internalKey;
    result[apiKey] = value;
  }
  return result as T;
}
```

---

#### 2.3 Migrate Internal Code
**Strategy:** Gradual migration with feature flags

**Steps:**
1. Identify all files using snake_case properties
2. Create migration checklist
3. Migrate one module at a time
4. Update tests as you go
5. Verify no regressions

**Files to Migrate:**
- `src/components/**/*.tsx`
- `src/services/**/*.ts`
- `src/utils/**/*.ts`
- `src/hooks/**/*.ts`

**Migration Pattern:**
```typescript
// Before
const techBase = unit.tech_base;

// After
const techBase = unit.techBase;
```

---

### Success Criteria
- ✅ API adapter layer implemented and tested
- ✅ All internal code uses camelCase
- ✅ API boundaries use adapter layer
- ✅ No snake_case properties in internal code
- ✅ Backward compatibility maintained for API

---

## Phase 3: Implement Proper Conversion Service (Week 3-4)

### Objectives
- Create centralized conversion service
- Implement bidirectional conversions
- Add comprehensive validation

### Tasks

#### 3.1 Create Conversion Service Interface
**Files:** `src/services/conversion/IUnitConversionService.ts`

**Implementation:**
```typescript
import { Result } from '../../types/core/BaseTypes';
import { FullUnit } from '../../types';
import { EditableUnit } from '../../types/editor';
import { CustomizableUnit } from '../../types/customizer';
import { ICompleteUnitConfiguration } from '../../types/core/UnitInterfaces';

export interface ConversionError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

export interface IUnitConversionService {
  /**
   * Convert FullUnit to EditableUnit
   */
  toEditableUnit(fullUnit: FullUnit): Result<EditableUnit, ConversionError>;
  
  /**
   * Convert EditableUnit to FullUnit
   */
  toFullUnit(editableUnit: EditableUnit): Result<FullUnit, ConversionError>;
  
  /**
   * Convert to CustomizableUnit
   */
  toCustomizableUnit(
    unit: FullUnit | EditableUnit
  ): Result<CustomizableUnit, ConversionError>;
  
  /**
   * Convert from CustomizableUnit
   */
  fromCustomizableUnit(
    customizableUnit: CustomizableUnit
  ): Result<FullUnit, ConversionError>;
  
  /**
   * Validate conversion source
   */
  validateSource(source: unknown, sourceType: string): Result<boolean, ConversionError>;
  
  /**
   * Get conversion metadata
   */
  getConversionMetadata(
    source: unknown,
    targetType: string
  ): ConversionMetadata;
}

export interface ConversionMetadata {
  sourceType: string;
  targetType: string;
  requiredFields: string[];
  optionalFields: string[];
  warnings: string[];
}
```

---

#### 3.2 Implement Conversion Service
**Files:** `src/services/conversion/UnitConversionService.ts`

**Implementation Structure:**
```typescript
import { IUnitConversionService, ConversionError } from './IUnitConversionService';
import { Result, success, failure } from '../../types/core/BaseTypes';
import { validateFullUnit } from '../../utils/typeConversion/validators';
import { stringToTechBase, stringToRulesLevel } from '../../utils/typeConversion/enumConverters';
// ... other imports

export class UnitConversionService implements IUnitConversionService {
  toEditableUnit(fullUnit: FullUnit): Result<EditableUnit, ConversionError> {
    // 1. Validate input
    const validation = validateFullUnit(fullUnit);
    if (!validation.isValid) {
      return failure({
        message: 'Invalid FullUnit',
        code: 'INVALID_SOURCE',
        details: { errors: validation.errors },
      });
    }
    
    // 2. Convert tech base
    const techBase = stringToTechBase(fullUnit.tech_base);
    if (!techBase) {
      return failure({
        message: `Invalid tech base: ${fullUnit.tech_base}`,
        code: 'INVALID_TECH_BASE',
      });
    }
    
    // 3. Convert rules level
    const rulesLevel = stringToRulesLevel(fullUnit.rules_level);
    if (!rulesLevel) {
      return failure({
        message: `Invalid rules level: ${fullUnit.rules_level}`,
        code: 'INVALID_RULES_LEVEL',
      });
    }
    
    // 4. Calculate all system components
    const structure = this.calculateStructure(fullUnit);
    const engine = this.calculateEngine(fullUnit);
    const gyro = this.calculateGyro(fullUnit);
    const cockpit = this.calculateCockpit(fullUnit);
    const armor = this.calculateArmor(fullUnit);
    const heatSinks = this.calculateHeatSinks(fullUnit);
    const jumpJets = this.calculateJumpJets(fullUnit);
    
    // 5. Convert equipment
    const equipment = this.convertEquipment(fullUnit);
    
    // 6. Build EditableUnit
    const editableUnit: EditableUnit = {
      id: fullUnit.id,
      name: fullUnit.model,
      chassis: fullUnit.chassis,
      model: fullUnit.model,
      techBase,
      rulesLevel,
      era: fullUnit.era,
      tonnage: fullUnit.mass,
      structure,
      engine,
      gyro,
      cockpit,
      armor,
      heatSinks,
      jumpJets,
      equipment,
      // ... all other properties
    };
    
    return success(editableUnit);
  }
  
  private calculateStructure(fullUnit: FullUnit): IStructureConfiguration {
    // Implementation
  }
  
  private calculateEngine(fullUnit: FullUnit): IEngineConfiguration {
    // Implementation
  }
  
  // ... other calculation methods
}
```

---

#### 3.3 Implement Bidirectional Conversions
**Files:** `src/services/conversion/UnitConversionService.ts`

**Implementation:**
```typescript
toFullUnit(editableUnit: EditableUnit): Result<FullUnit, ConversionError> {
  // 1. Validate input
  // 2. Convert enums to strings
  // 3. Convert armor allocation to locations format
  // 4. Convert equipment to weapons_and_equipment format
  // 5. Convert critical slots format
  // 6. Build FullUnit
  // 7. Return result
}
```

---

#### 3.4 Add Conversion Tests
**Files:** `src/__tests__/services/conversion/UnitConversionService.test.ts`

**Test Cases:**
- Test `toEditableUnit` with valid FullUnit
- Test `toEditableUnit` with invalid data
- Test `toFullUnit` with valid EditableUnit
- Test round-trip conversion (FullUnit → EditableUnit → FullUnit)
- Test `toCustomizableUnit` conversions
- Test error handling for all conversion paths
- Test edge cases (missing optional fields, null values)

---

### Success Criteria
- ✅ Conversion service fully implemented
- ✅ All conversion methods tested
- ✅ Bidirectional conversions working
- ✅ Proper error handling throughout
- ✅ Test coverage > 90%

---

## Phase 4: Eliminate Dynamic Property Access (Week 4-5)

### Objectives
- Replace `Record<string, unknown>` with proper types
- Create type guards for dynamic data
- Improve type safety

### Tasks

#### 4.1 Identify All `Record<string, unknown>` Usage
**Files:** All files with dynamic property access

**Analysis:**
- Categorize by use case
- Identify actual data structures
- Plan type definitions

---

#### 4.2 Define Proper Types for Each Use Case

**Example 1: Configuration Data**
**Files:** `src/types/core/ConfigurationTypes.ts`

```typescript
export interface IUnitConfigurationData {
  techBase?: TechBase;
  rulesLevel?: RulesLevel;
  era?: string;
  tonnage?: number;
  customProperties?: Record<string, unknown>; // Only for truly dynamic data
}

export function isUnitConfigurationData(obj: unknown): obj is IUnitConfigurationData {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  const config = obj as Record<string, unknown>;
  
  // Validate known properties
  if ('techBase' in config && !isValidTechBase(config.techBase)) {
    return false;
  }
  
  if ('rulesLevel' in config && !isValidRulesLevel(config.rulesLevel)) {
    return false;
  }
  
  return true;
}
```

**Example 2: Equipment Item Data**
**Files:** `src/types/core/EquipmentTypes.ts`

```typescript
export interface IDynamicEquipmentData {
  [key: string]: unknown;
  // Define known properties
  item_name?: string;
  item_type?: string;
  location?: string;
  // ... other known properties
}

export function isDynamicEquipmentData(obj: unknown): obj is IDynamicEquipmentData {
  return typeof obj === 'object' && obj !== null;
}
```

---

#### 4.3 Replace `Record<string, unknown>` Usage

**Before:**
```typescript
const config = state.configuration as unknown as Record<string, unknown>;
const value = config.someProperty;
```

**After:**
```typescript
if (isUnitConfigurationData(state.configuration)) {
  const value = state.configuration.someProperty; // Type-safe access
}
```

**Files to Update:**
- `src/utils/unit/UnitStateManager.ts`
- `src/utils/editor/WeaponValidationService.ts`
- `src/utils/componentValidation.ts`
- `src/services/weight-balance/ArmorEfficiencyService.ts`
- `src/components/criticalSlots/UnitProvider.tsx`
- ... (all 14 files)

---

#### 4.4 Create Discriminated Unions Where Appropriate

**Example: Equipment Types**
```typescript
export type EquipmentData = 
  | { type: 'weapon'; weaponData: IWeaponData }
  | { type: 'ammo'; ammoData: IAmmoData }
  | { type: 'equipment'; equipmentData: IEquipmentData };

export function processEquipmentData(data: EquipmentData): void {
  switch (data.type) {
    case 'weapon':
      // TypeScript knows data.weaponData exists
      processWeapon(data.weaponData);
      break;
    case 'ammo':
      processAmmo(data.ammoData);
      break;
    // ...
  }
}
```

---

### Success Criteria
- ✅ All `Record<string, unknown>` usage replaced with proper types
- ✅ Type guards implemented for all dynamic data
- ✅ Discriminated unions used where appropriate
- ✅ Type safety improved throughout codebase
- ✅ No runtime errors from property access

---

## Phase 5: Fix Armor Allocation Structure (Week 5-6)

### Objectives
- Create single canonical armor allocation format
- Implement conversion utilities
- Migrate all code to use canonical format

### Tasks

#### 5.1 Define Canonical Armor Allocation Format
**Files:** `src/types/core/ArmorTypes.ts`

**Decision:** Use `IArmorAllocation` as canonical format

```typescript
export interface IArmorAllocation {
  readonly head: number;
  readonly centerTorso: number;
  readonly centerTorsoRear: number;
  readonly leftTorso: number;
  readonly leftTorsoRear: number;
  readonly rightTorso: number;
  readonly rightTorsoRear: number;
  readonly leftArm: number;
  readonly rightArm: number;
  readonly leftLeg: number;
  readonly rightLeg: number;
}
```

---

#### 5.2 Create Conversion Utilities
**Files:** `src/utils/typeConversion/armorConverters.ts`

**Implementation:**
```typescript
import { IArmorAllocation } from '../../types/core/UnitInterfaces';
import { ArmorLocation } from '../../types';
import { locationNameToProperty } from './locationMappers';

/**
 * Convert FullUnit armor locations to IArmorAllocation
 */
export function convertArmorLocationsToAllocation(
  locations: ArmorLocation[]
): IArmorAllocation {
  const allocation: Partial<IArmorAllocation> = {};
  
  for (const location of locations) {
    const property = locationNameToProperty(location.location);
    if (!property) continue;
    
    // Handle front armor
    if (property.endsWith('Rear')) {
      // This is rear armor
      const baseProperty = property.replace('Rear', '') as keyof IArmorAllocation;
      (allocation as any)[property] = location.rear_armor_points ?? 0;
    } else {
      // This is front armor
      (allocation as any)[property] = location.armor_points;
    }
  }
  
  // Fill in missing values with 0
  return {
    head: allocation.head ?? 0,
    centerTorso: allocation.centerTorso ?? 0,
    centerTorsoRear: allocation.centerTorsoRear ?? 0,
    leftTorso: allocation.leftTorso ?? 0,
    leftTorsoRear: allocation.leftTorsoRear ?? 0,
    rightTorso: allocation.rightTorso ?? 0,
    rightTorsoRear: allocation.rightTorsoRear ?? 0,
    leftArm: allocation.leftArm ?? 0,
    rightArm: allocation.rightArm ?? 0,
    leftLeg: allocation.leftLeg ?? 0,
    rightLeg: allocation.rightLeg ?? 0,
  };
}

/**
 * Convert IArmorAllocation to FullUnit armor locations
 */
export function convertAllocationToArmorLocations(
  allocation: IArmorAllocation
): ArmorLocation[] {
  const locations: ArmorLocation[] = [];
  const { propertyToLocationName } = require('./locationMappers');
  
  for (const [property, value] of Object.entries(allocation)) {
    if (property.endsWith('Rear')) continue; // Handle rear separately
    
    const locationName = propertyToLocationName(property as keyof IArmorAllocation);
    const rearProperty = `${property}Rear` as keyof IArmorAllocation;
    const rearValue = allocation[rearProperty];
    
    locations.push({
      location: locationName,
      armor_points: value,
      rear_armor_points: rearValue > 0 ? rearValue : undefined,
    });
  }
  
  return locations;
}
```

---

#### 5.3 Migrate Code to Use Canonical Format
**Strategy:** Gradual migration

**Steps:**
1. Update conversion functions to use canonical format
2. Update components to use canonical format
3. Update services to use canonical format
4. Remove old format usage
5. Update tests

**Files to Update:**
- All armor-related components
- All armor-related services
- All armor-related utilities

---

### Success Criteria
- ✅ Single canonical armor allocation format established
- ✅ All code uses canonical format
- ✅ Conversion utilities tested and working
- ✅ No format mismatches
- ✅ Type safety maintained

---

## Phase 6: Fix Equipment Representation (Week 6)

### Objectives
- Unify equipment types
- Remove `data: any` usage
- Create proper equipment type hierarchy

### Tasks

#### 6.1 Create Equipment Type Hierarchy
**Files:** `src/types/core/EquipmentInterfaces.ts` (update existing)

**Structure:**
```typescript
// Base equipment interface
export interface IBaseEquipment extends IIdentifiable, INamed {
  readonly type: EquipmentCategory;
  readonly techBase: TechBase;
  readonly weight: number;
  readonly slots: number;
}

// Weapon interface
export interface IWeapon extends IBaseEquipment {
  readonly type: EquipmentCategory.WEAPON;
  readonly weaponClass: WeaponClass;
  readonly damage: number;
  readonly heat: number;
  readonly range: IRangeProfile;
  readonly requiresAmmo: boolean;
}

// Ammunition interface
export interface IAmmunition extends IBaseEquipment {
  readonly type: EquipmentCategory.AMMO;
  readonly forWeapon: EntityId;
  readonly shotsPerTon: number;
}

// Discriminated union
export type IEquipment = IWeapon | IAmmunition | IHeatManagementEquipment | /* ... */;
```

---

#### 6.2 Remove `data: any` Usage
**Files:** `src/types/customizer.ts`

**Before:**
```typescript
export interface EquipmentItem {
  data: any; // The full JSON blob for equipment
}
```

**After:**
```typescript
export interface EquipmentItem {
  data: IEquipment; // Properly typed equipment data
}
```

**Migration:**
- Update all code using `EquipmentItem.data`
- Add type guards where needed
- Remove any `as any` casts related to equipment data

---

#### 6.3 Create Equipment Conversion Utilities
**Files:** `src/utils/typeConversion/equipmentConverters.ts`

**Implementation:**
```typescript
export function convertWeaponOrEquipmentItemToIEquipment(
  item: WeaponOrEquipmentItem
): Result<IEquipment, ConversionError> {
  // Validate and convert
  // ...
}

export function convertIEquipmentToWeaponOrEquipmentItem(
  equipment: IEquipment
): WeaponOrEquipmentItem {
  // Convert back
  // ...
}
```

---

### Success Criteria
- ✅ Equipment type hierarchy established
- ✅ No `data: any` usage in equipment types
- ✅ All equipment conversions type-safe
- ✅ Discriminated unions used effectively

---

## Testing Strategy

### Unit Tests
- Each conversion function
- Each type guard
- Each validation function
- Edge cases and error conditions

### Integration Tests
- Full conversion pipelines
- Round-trip conversions
- API boundary conversions
- Component integration

### Type Tests
- Ensure no `as any` casts
- Ensure type guards work correctly
- Ensure conversions maintain types

---

## Rollout Plan

### Feature Flags
- Use feature flags for gradual rollout
- Allow rollback if issues found
- Monitor error rates

### Migration Strategy
- Migrate one module at a time
- Test thoroughly before moving to next
- Keep old code until migration complete

### Monitoring
- Track conversion errors
- Monitor type safety metrics
- Watch for runtime errors

---

## Risk Mitigation

### Risks
1. **Breaking Changes:** Careful migration and testing
2. **Performance Impact:** Profile conversions, optimize if needed
3. **Data Loss:** Comprehensive validation and testing
4. **Type Errors:** Gradual migration with type checking

### Mitigation
- Comprehensive testing at each phase
- Feature flags for gradual rollout
- Rollback plan for each phase
- Code reviews for all changes

---

## Success Metrics

### Code Quality
- Zero `as any` casts
- Zero `as unknown as` casts (except API boundaries)
- < 5 `Record<string, unknown>` usage (only for truly dynamic)
- 100% type guard coverage

### Test Coverage
- > 90% coverage for conversion utilities
- > 85% coverage for conversion service
- All edge cases tested

### Performance
- Conversion time < 10ms for typical units
- No memory leaks
- No performance regressions

---

## Timeline Summary

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 0: Preparation | Week 1 | None |
| Phase 1: Critical Fixes | Week 1-2 | Phase 0 |
| Phase 2: Property Naming | Week 2-3 | Phase 1 |
| Phase 3: Conversion Service | Week 3-4 | Phase 1, Phase 2 |
| Phase 4: Dynamic Access | Week 4-5 | Phase 3 |
| Phase 5: Armor Structure | Week 5-6 | Phase 3 |
| Phase 6: Equipment Types | Week 6 | Phase 3 |

**Total Estimated Time:** 6 weeks

---

## Next Steps

1. Review and approve this plan
2. Set up project tracking for phases
3. Begin Phase 0 implementation
4. Schedule regular review meetings
5. Monitor progress and adjust as needed

---

**Last Updated:** 2025-01-27
**Status:** Ready for Implementation
**Owner:** Development Team
