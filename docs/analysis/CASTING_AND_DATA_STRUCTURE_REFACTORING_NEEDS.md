# Casting Patterns and Data Structure Refactoring Analysis

## Executive Summary

This document analyzes casting patterns and data structure inconsistencies across the BattleTech Editor codebase. It identifies core architectural issues that require refactoring to achieve proper type safety and eliminate the need for type assertions.

**Key Findings:**
- **2 active `as any` casts** in production code (unitConverter.ts)
- **35+ instances** of `Record<string, unknown>` used for dynamic property access
- **Multiple incompatible unit type definitions** causing conversion complexity
- **Inconsistent property naming** between data sources and editor types
- **Type guards returning `any`** instead of proper concrete types
- **Missing proper conversion layers** between data representations

---

## Table of Contents

1. [Casting Pattern Analysis](#casting-pattern-analysis)
2. [Data Structure Issues](#data-structure-issues)
3. [Core Type System Problems](#core-type-system-problems)
4. [Conversion Layer Issues](#conversion-layer-issues)
5. [Recommended Refactoring Strategy](#recommended-refactoring-strategy)
6. [Priority Fixes](#priority-fixes)

---

## Casting Pattern Analysis

### 1. Active `as any` Casts

#### Location: `src/utils/unitConverter.ts` (Lines 167-168)

**Problem:**
```typescript
techBase: (unit.tech_base || 'Inner Sphere') as any,
rulesLevel: (unit.rules_level || 'Standard') as any,
```

**Root Cause:**
- `FullUnit` uses string literals: `tech_base: string`
- `EditableUnit` expects enum types: `techBase: TechBase` (enum)
- Type system cannot automatically convert string to enum

**Impact:**
- Bypasses type safety
- Runtime errors possible if invalid strings are passed
- No compile-time validation of tech base/rules level values

**Solution Required:**
- Create proper conversion functions with validation
- Use type guards to validate string values before conversion
- Map string literals to enum values explicitly

---

### 2. `as unknown as` Pattern Usage

**Status:** Most instances have been addressed (see `AS_UNKNOWN_AS_CASTS_REFERENCE.md`), but the pattern indicates underlying type system weaknesses.

**Remaining Issues:**
- `src/utils/unitConverter.ts` line 239: `as unknown as EditableUnit` for partial conversion
- Indicates incomplete conversion implementation

---

### 3. `Record<string, unknown>` Usage Patterns

**Count:** 35+ instances across 14 files

**Common Locations:**
- `src/utils/editor/WeaponValidationService.ts`
- `src/utils/unit/UnitStateManager.ts`
- `src/utils/componentValidation.ts`
- `src/services/weight-balance/ArmorEfficiencyService.ts`
- `src/components/criticalSlots/UnitProvider.tsx`

**Problem Pattern:**
```typescript
const config = state.configuration as unknown as Record<string, unknown>;
const itemRecord = item as unknown as Record<string, unknown>;
```

**Root Cause:**
- Objects with unknown or varying structures
- Legacy data formats mixed with new formats
- Missing proper type definitions for dynamic data

**Impact:**
- Loss of type safety
- Runtime errors from accessing non-existent properties
- Difficult to refactor or maintain

---

## Data Structure Issues

### 1. Multiple Incompatible Unit Type Definitions

#### Type Definitions Found:

1. **`FullUnit`** (`src/types/index.ts`)
   - Database/API representation
   - Uses string literals: `tech_base: string`
   - Flat structure with nested `data` property
   - Schema-based structure

2. **`EditableUnit`** (`src/types/editor.ts`)
   - Editor representation
   - Extends `ICompleteUnitConfiguration`
   - Uses enums: `techBase: TechBase`
   - Rich type system with interfaces

3. **`CustomizableUnit`** (`src/types/customizer.ts`)
   - Customizer page representation
   - Uses string literals: `tech_base: string`
   - Simplified structure for UI

4. **`ICompleteUnitConfiguration`** (`src/types/core/UnitInterfaces.ts`)
   - Core configuration interface
   - Uses enums: `techBase: TechBase`
   - Comprehensive type system

#### Problems:

**A. Property Naming Inconsistencies:**
- `tech_base` (snake_case) vs `techBase` (camelCase)
- `rules_level` vs `rulesLevel`
- `mass` vs `tonnage`
- `armor.allocation` (object) vs `armorAllocation` (map)

**B. Type Mismatches:**
- String literals vs Enums
- Optional vs Required properties
- Different structure shapes
- Missing properties in conversions

**C. Conversion Complexity:**
- No single source of truth
- Multiple conversion paths
- Partial conversions that require casting
- Loss of type information during conversion

---

### 2. Armor Allocation Structure Mismatch

#### Problem:

**Source Format** (`FullUnit.data.armor.locations`):
```typescript
armor: {
  locations: Array<{
    location: string;  // "Head", "Center Torso", etc.
    armor_points: number;
    rear_armor_points?: number;
  }>
}
```

**Editor Format** (`EditableUnit.armor.allocation`):
```typescript
armor: {
  allocation: IArmorAllocation {
    head: number;
    centerTorso: number;
    centerTorsoRear: number;
    // ... camelCase properties
  }
}
```

**Customizer Format** (`CustomizableUnit.data.armor`):
```typescript
armor: {
  type: string;
  locations: Array<{ location: string; armor_points: number; }>
}
```

**Editor Map Format** (`EditableUnit.armorAllocation`):
```typescript
armorAllocation: Record<string, {
  front: number;
  rear?: number;
  type: ArmorAllocationType;
}>
```

**Issues:**
- Four different representations of the same data
- Location name mapping required (e.g., "Center Torso" → "centerTorso")
- No single canonical format
- Conversion functions scattered across codebase

---

### 3. Equipment Representation Inconsistencies

#### Multiple Equipment Types:

1. **`WeaponOrEquipmentItem`** (`src/types/index.ts`)
   - Schema-based, flat structure
   - String-based types

2. **`IEquipmentInstance`** (`src/types/core/UnitInterfaces.ts`)
   - Rich interface with relationships
   - Strongly typed

3. **`UnitEquipmentItem`** (`src/types/customizer.ts`)
   - Simplified for UI
   - Partial data

4. **`EquipmentItem`** (`src/types/customizer.ts`)
   - Picker/selection format
   - Includes `data: any` for flexibility

**Problems:**
- `data: any` used for "flexibility" (defeats type safety)
- Inconsistent property names
- Missing relationships between types
- No clear conversion path

---

### 4. Critical Slot Structure Evolution

#### Legacy Format:
```typescript
criticals: Array<{
  location: string;
  slots: string[];  // Array of equipment names or "-Empty-"
}>
```

#### New Format:
```typescript
criticals: Array<{
  location: string;
  slots: CriticalSlotItem[];  // Array of objects
}>
```

**Problem:**
- Codebase handles both formats
- Type guards needed to distinguish
- Conversion required but not always explicit
- Risk of runtime errors from format mismatch

---

## Core Type System Problems

### 1. Type Guards Returning `any`

#### Location: `src/types/core/BaseTypes.ts`

**Problem:**
```typescript
export function isValidUnitState(state: unknown): state is any {
  // ...
}

export function isValidUnitConfiguration(config: unknown): config is any {
  // ...
}

export function isValidEquipmentAllocation(allocation: unknown): allocation is any {
  // ...
}
```

**Issue:**
- Type guards should return concrete types, not `any`
- Defeats the purpose of type guards
- No type safety benefit

**Should Be:**
```typescript
export function isValidUnitState(state: unknown): state is ICompleteUnitState {
  // ...
}
```

---

### 2. String Literals vs Enums

#### Problem:

**String Literal Types:**
```typescript
// src/types/index.ts
export type TechBase = 'Inner Sphere' | 'Clan' | 'Mixed (IS Chassis)' | 'Mixed (Clan Chassis)';
```

**Enum Types:**
```typescript
// src/types/core/BaseTypes.ts
export enum TechBase {
  INNER_SPHERE = 'Inner Sphere',
  CLAN = 'Clan',
  MIXED = 'Mixed',
  BOTH = 'Both'
}
```

**Issues:**
- Two different type systems for the same concept
- Incomplete enum (missing "Mixed (IS Chassis)" variants)
- No automatic conversion
- Requires casting or manual mapping

---

### 3. Optional vs Required Properties

#### Problem:

**In `FullUnit`:**
```typescript
tech_base?: string;  // Optional
rules_level?: number | string;  // Optional, can be number or string
```

**In `EditableUnit`:**
```typescript
techBase: TechBase;  // Required enum
rulesLevel: RulesLevel;  // Required enum
```

**Impact:**
- Conversion must handle undefined/null
- Default values needed but not always consistent
- Type assertions required when defaults are applied

---

## Conversion Layer Issues

### 1. Incomplete Conversion Functions

#### `convertFullUnitToEditableUnit` (`src/utils/unitConverter.ts`)

**Problems:**
- Returns partial `EditableUnit` with stub values
- Uses `as unknown as EditableUnit` cast (line 239)
- Does not fully hydrate all `ICompleteUnitConfiguration` properties
- Comment indicates: "Partial implementation cast until fully hydrated"

**Example Stubs:**
```typescript
structure: { 
  definition: { id: 'standard', name: 'Standard', ... }, 
  currentPoints: { head: 3, ... },  // Hardcoded defaults
  maxPoints: { head: 3, ... }
},
engine: { 
  definition: { id: 'standard', ... }, 
  rating: 200,  // Hardcoded default
  tonnage: 8.5 
},
```

**Issues:**
- Hardcoded defaults instead of calculating from source data
- Loss of original unit configuration
- Cannot round-trip convert back to `FullUnit`

---

### 2. Missing Validation in Conversions

**Problem:**
- Conversions don't validate input data
- Invalid values can propagate through system
- No error handling for malformed data
- Type assertions used instead of validation

**Example:**
```typescript
techBase: (unit.tech_base || 'Inner Sphere') as any,
// Should validate that unit.tech_base is a valid TechBase value
```

---

### 3. Bidirectional Conversion Missing

**Problem:**
- Can convert `FullUnit` → `EditableUnit`
- Cannot convert `EditableUnit` → `FullUnit`
- No round-trip capability
- Data loss in one direction

---

## Recommended Refactoring Strategy

### Phase 1: Establish Single Source of Truth

#### 1.1 Unify Type Definitions

**Action:**
- Choose one canonical unit type representation
- Recommend: `ICompleteUnitConfiguration` as the core
- All other types should be views/adapters of this core

**Benefits:**
- Single source of truth
- Consistent property naming
- Type-safe conversions

---

#### 1.2 Standardize Property Naming

**Action:**
- Use camelCase consistently: `techBase`, `rulesLevel`, `tonnage`
- Create mapping layer for external APIs (snake_case → camelCase)
- Update all internal code to use camelCase

**Migration:**
- Create adapter functions for API boundaries
- Gradually migrate internal code
- Keep API compatibility layer

---

#### 1.3 Complete Enum Definitions

**Action:**
- Expand `TechBase` enum to include all variants
- Ensure enum values match all string literals in use
- Create conversion utilities: `stringToTechBase()`, `techBaseToString()`

**Enum Expansion:**
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

---

### Phase 2: Fix Type Guards

#### 2.1 Return Concrete Types

**Action:**
- Update all type guards to return proper types
- Remove `any` from type guard return types
- Add proper type narrowing

**Example Fix:**
```typescript
// Before
export function isValidUnitState(state: unknown): state is any { ... }

// After
export function isValidUnitState(state: unknown): state is ICompleteUnitState {
  if (typeof state !== 'object' || state === null) return false;
  const s = state as Record<string, unknown>;
  return (
    'configuration' in s &&
    isValidUnitConfiguration(s.configuration) &&
    // ... other checks
  );
}
```

---

### Phase 3: Implement Proper Conversion Layer

#### 3.1 Create Conversion Service

**Action:**
- Create `UnitConversionService` with proper interfaces
- Implement bidirectional conversions
- Add validation at conversion boundaries

**Interface:**
```typescript
interface IUnitConversionService {
  toEditableUnit(fullUnit: FullUnit): Result<EditableUnit, ConversionError>;
  toFullUnit(editableUnit: EditableUnit): Result<FullUnit, ConversionError>;
  toCustomizableUnit(unit: FullUnit | EditableUnit): Result<CustomizableUnit, ConversionError>;
  validateConversion(source: unknown, targetType: string): ValidationResult;
}
```

---

#### 3.2 Implement Complete Conversions

**Action:**
- Remove partial conversions
- Calculate all properties from source data
- No hardcoded defaults
- Proper error handling

**Example:**
```typescript
function convertFullUnitToEditableUnit(unit: FullUnit): Result<EditableUnit> {
  // Validate input
  const validation = validateFullUnit(unit);
  if (!validation.isValid) {
    return failure(new ConversionError('Invalid FullUnit', validation.errors));
  }
  
  // Convert tech base with validation
  const techBaseResult = stringToTechBase(unit.tech_base);
  if (!techBaseResult.success) {
    return failure(techBaseResult.error);
  }
  
  // Calculate structure from mass and type
  const structure = calculateStructure(unit.data);
  
  // Calculate engine from rating and type
  const engine = calculateEngine(unit.data.engine);
  
  // ... complete all properties
  
  return success({
    // ... fully hydrated EditableUnit
  });
}
```

---

#### 3.3 Create Property Mapping Utilities

**Action:**
- Create utilities for common conversions
- Location name mapping: "Center Torso" ↔ "centerTorso"
- Armor allocation format conversion
- Equipment format conversion

**Example:**
```typescript
const LOCATION_NAME_MAP = {
  'Head': 'head',
  'Center Torso': 'centerTorso',
  'Left Torso': 'leftTorso',
  // ...
} as const;

function convertLocationName(displayName: string): keyof IArmorAllocation {
  return LOCATION_NAME_MAP[displayName] || 'head';
}
```

---

### Phase 4: Eliminate Dynamic Property Access

#### 4.1 Define Proper Types for Dynamic Data

**Action:**
- Identify all uses of `Record<string, unknown>`
- Define proper interfaces for each use case
- Use discriminated unions where structure varies

**Example:**
```typescript
// Before
const config = state.configuration as unknown as Record<string, unknown>;

// After
interface IUnitConfigurationData {
  techBase?: TechBase;
  rulesLevel?: RulesLevel;
  era?: string;
  [key: string]: unknown;  // Only if truly dynamic
}

function isUnitConfigurationData(obj: unknown): obj is IUnitConfigurationData {
  // Type guard with validation
}
```

---

#### 4.2 Replace `Record<string, unknown>` with Type Guards

**Action:**
- Create type guards for each dynamic access pattern
- Use type narrowing instead of casting
- Add runtime validation

---

### Phase 5: Fix Active Casting Issues

#### 5.1 Fix `unitConverter.ts` Casts

**Action:**
- Replace `as any` with proper conversion functions
- Add validation
- Use enum conversion utilities

**Fix:**
```typescript
// Before
techBase: (unit.tech_base || 'Inner Sphere') as any,

// After
techBase: convertStringToTechBase(unit.tech_base) ?? TechBase.INNER_SPHERE,
```

**Implementation:**
```typescript
function convertStringToTechBase(value: string | undefined): TechBase | null {
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
```

---

## Priority Fixes

### Critical (Immediate)

1. **Fix `as any` casts in `unitConverter.ts`**
   - Replace with proper enum conversion
   - Add validation
   - **Files:** `src/utils/unitConverter.ts:167-168`

2. **Fix type guards returning `any`**
   - Update to return concrete types
   - **Files:** `src/types/core/BaseTypes.ts:542,557,578`

3. **Complete `convertFullUnitToEditableUnit`**
   - Remove `as unknown as` cast
   - Implement full conversion
   - **Files:** `src/utils/unitConverter.ts:239`

---

### High Priority (Next Sprint)

4. **Unify TechBase/RulesLevel types**
   - Expand enums to match all string literals
   - Create conversion utilities
   - **Files:** `src/types/core/BaseTypes.ts`, `src/types/index.ts`

5. **Standardize property naming**
   - Create API adapter layer
   - Migrate internal code to camelCase
   - **Files:** All type definition files

6. **Create proper conversion service**
   - Implement `IUnitConversionService`
   - Add bidirectional conversions
   - **New File:** `src/services/conversion/UnitConversionService.ts`

---

### Medium Priority (Following Sprint)

7. **Eliminate `Record<string, unknown>` usage**
   - Define proper types for each use case
   - Replace with type guards
   - **Files:** 14 files with 35+ instances

8. **Fix armor allocation structure**
   - Create single canonical format
   - Implement conversion utilities
   - **Files:** Multiple files handling armor

9. **Fix equipment representation**
   - Unify equipment types
   - Remove `data: any` usage
   - **Files:** Equipment-related type files

---

### Low Priority (Backlog)

10. **Implement round-trip conversions**
    - `EditableUnit` → `FullUnit`
    - Validation and error handling
    - **Files:** `src/utils/unitConverter.ts`

11. **Document conversion patterns**
    - Create conversion guide
    - Document type system architecture
    - **New File:** `docs/architecture/TYPE_SYSTEM.md`

12. **Add conversion tests**
    - Test all conversion paths
    - Test edge cases
    - **New Files:** `src/__tests__/conversion/`

---

## Metrics and Success Criteria

### Before Refactoring
- **`as any` casts:** 2 active
- **`as unknown as` casts:** 1 remaining
- **`Record<string, unknown>` usage:** 35+ instances
- **Type guards returning `any`:** 3 instances
- **Incomplete conversions:** 1 major function

### Target After Refactoring
- **`as any` casts:** 0
- **`as unknown as` casts:** 0 (except for legitimate API boundaries)
- **`Record<string, unknown>` usage:** < 5 (only for truly dynamic data)
- **Type guards returning `any`:** 0
- **Incomplete conversions:** 0

### Type Safety Goals
- All conversions validated at boundaries
- No type assertions in business logic
- Proper error handling for invalid data
- Complete type coverage for all data structures

---

## Implementation Notes

### Migration Strategy

1. **Incremental Approach**
   - Fix one type system at a time
   - Maintain backward compatibility during migration
   - Use feature flags if needed

2. **Testing Requirements**
   - Unit tests for all conversion functions
   - Integration tests for data flow
   - Type tests to ensure no regressions

3. **Documentation**
   - Update type system documentation
   - Document conversion patterns
   - Create migration guide

---

## Related Documents

- `docs/analysis/AS_UNKNOWN_AS_CASTS_REFERENCE.md` - Previous casting analysis
- `docs/battletech/agents/00-INDEX.md` - BattleTech rules documentation
- `src/types/core/BaseTypes.ts` - Core type definitions
- `src/types/core/UnitInterfaces.ts` - Unit interface definitions

---

**Last Updated:** 2025-01-27
**Status:** Analysis Complete - Awaiting Implementation
**Next Steps:** Begin Phase 1 implementation
