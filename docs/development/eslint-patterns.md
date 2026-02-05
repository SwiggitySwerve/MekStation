# ESLint Patterns Documentation

## Overview

The codebase currently has **1,209 ESLint issues** (72 errors, 1,137 warnings). This document catalogs the most common patterns and provides guidance for fixing them.

## Rule Frequency Analysis

Based on ESLint analysis, the most common issues are:

| Rule                             | Count | Severity |
| -------------------------------- | ----- | -------- |
| `no-unsafe-member-access`        | 335   | Warning  |
| `no-unsafe-assignment`           | 301   | Warning  |
| `no-unused-vars`                 | 198   | Warning  |
| `explicit-module-boundary-types` | 110   | Warning  |
| `no-explicit-any`                | 105   | Warning  |
| `no-unsafe-call`                 | 57    | Warning  |
| `no-unsafe-return`               | 25    | Warning  |

## Pattern Categories

### 1. Unused Imports/Variables (`@typescript-eslint/no-unused-vars`)

**Occurrences:** 198 instances

**Pattern Description:**
Imports or variables that are defined but never referenced in the code.

**Common Causes:**

- Leftover imports from refactoring
- Test helper functions imported but not used
- Interface/type imports that became unnecessary
- Function parameters that don't match the ignore pattern `^_`

**Examples:**

```typescript
// Unused import in ValidationOrchestrator.ts
import { IValidationError } from '../../../types/validation/rules/ValidationRuleInterfaces';
// IValidationError is imported but never used in the file
```

```typescript
// Unused import in test files
import { createMixedComponentTechBases } from '../helpers/storeTestHelpers';
// Function imported but never called in the test
```

**Fix Strategies:**

1. **Remove unused imports:** Delete the import statement entirely
2. **Prefix unused parameters:** Change `param` to `_param` to match the ignore pattern
3. **Use the import:** If the import should be used, find where it's needed

**Prevention:**

- Use IDE auto-import cleanup features
- Run ESLint regularly during development
- Review imports when refactoring

### 2. Unsafe `any` Usage (`@typescript-eslint/no-unsafe-assignment`, `@typescript-eslint/no-unsafe-member-access`, `@typescript-eslint/no-unsafe-return`)

**Occurrences:** 301 assignments, 335 member accesses, 25 returns

**Pattern Description:**
Using `any` type without proper type guards or validation, leading to potential runtime errors.

**Common Causes:**

- JSON.parse() returns `any` and is accessed without type checking
- Legacy code using `any` for quick prototyping
- Third-party library integrations with loose typing
- Test utilities parsing response data

**Examples:**

```typescript
// UnitSerializer.ts - JSON.parse returns any
export function validateSerializedFormat(data: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  try {
    const parsed = JSON.parse(data); // parsed is any

    if (!parsed.formatVersion) {
      // unsafe member access
      errors.push('Missing formatVersion field');
    }

    if (!parsed.unit) {
      // unsafe member access
      errors.push('Missing unit field');
    } else {
      const unit = parsed.unit; // unsafe assignment

      if (!unit.chassis) errors.push('Missing unit.chassis'); // unsafe member access
      // ... more unsafe accesses
    }
  } catch (e) {
    errors.push(
      `Invalid JSON: ${e instanceof Error ? e.message : 'Parse error'}`,
    );
  }

  return { isValid: errors.length === 0, errors };
}
```

```typescript
// Test files - parsing response data
const data = JSON.parse(res._getData()); // unsafe assignment
expect(data.success).toBe(false); // unsafe member access
expect(data.error).toContain('Method not allowed'); // unsafe member access
```

**Fix Strategies:**

1. **Create proper type definitions:**

```typescript
interface SerializedUnitData {
  formatVersion: string;
  unit: {
    chassis: string;
    model: string;
    unitType: string;
    tonnage: number;
    engine: unknown;
    armor: unknown;
  };
}

export function validateSerializedFormat(data: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  try {
    const parsed = JSON.parse(data) as SerializedUnitData; // type assertion

    // Now type-safe access
    if (!parsed.formatVersion) {
      errors.push('Missing formatVersion field');
    }

    if (!parsed.unit) {
      errors.push('Missing unit field');
    } else {
      const unit = parsed.unit;
      if (!unit.chassis) errors.push('Missing unit.chassis');
      // ...
    }
  } catch (e) {
    errors.push(
      `Invalid JSON: ${e instanceof Error ? e.message : 'Parse error'}`,
    );
  }

  return { isValid: errors.length === 0, errors };
}
```

2. **Use type guards:**

```typescript
function isSerializedUnitData(obj: unknown): obj is SerializedUnitData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'formatVersion' in obj &&
    'unit' in obj
  );
}
```

3. **Use `unknown` instead of `any`:**

```typescript
const parsed: unknown = JSON.parse(data);
// Now you must narrow the type before using it
```

**Prevention:**

- Enable stricter TypeScript configuration
- Use `unknown` instead of `any` for untyped data
- Create proper interfaces for external data structures
- Use schema validation libraries like Zod for runtime type checking

### 3. Missing Return Types (`@typescript-eslint/explicit-module-boundary-types`)

**Occurrences:** 110 instances

**Pattern Description:**
Exported functions without explicit return type annotations.

**Common Causes:**

- Quick prototyping without specifying return types
- Functions added without considering the boundary type requirement
- Utility functions that should be explicitly typed

**Examples:**

```typescript
// equipmentListUtils.ts
/**
 * Get the jump jet equipment item for a given tonnage and type
 */
export function getJumpJetEquipment(tonnage: number, jumpJetType: JumpJetType) {
  const id = getJumpJetEquipmentId(tonnage, jumpJetType);
  return JUMP_JETS.find((jj) => jj.id === id); // Return type not specified
}

/**
 * Get the heat sink equipment item for a given HeatSinkType
 */
export function getHeatSinkEquipment(heatSinkType: HeatSinkType) {
  const id = getHeatSinkEquipmentId(heatSinkType);
  return HEAT_SINKS.find((hs) => hs.id === id); // Return type not specified
}

/**
 * Get the enhancement equipment item by type and tech base
 */
export function getEnhancementEquipment(
  enhancementType: MovementEnhancementType,
  techBase: TechBase,
) {
  const id = getEnhancementEquipmentId(enhancementType, techBase);
  // Check MOVEMENT_EQUIPMENT first (MASC, Supercharger)
  const movementEquip = MOVEMENT_EQUIPMENT.find((e) => e.id === id);
  // ... function continues without explicit return type
}
```

**Fix Strategies:**

1. **Add explicit return types:**

```typescript
export function getJumpJetEquipment(
  tonnage: number,
  jumpJetType: JumpJetType,
): IEquipment | undefined {
  const id = getJumpJetEquipmentId(tonnage, jumpJetType);
  return JUMP_JETS.find((jj) => jj.id === id);
}

export function getHeatSinkEquipment(
  heatSinkType: HeatSinkType,
): IEquipment | undefined {
  const id = getHeatSinkEquipmentId(heatSinkType);
  return HEAT_SINKS.find((hs) => hs.id === id);
}
```

2. **Determine correct return type:** Check what the function actually returns and specify the appropriate type.

**Prevention:**

- Configure IDE to require return types on exported functions
- Use TypeScript's `noImplicitReturns` option
- Review function signatures during code review

### 4. Unused Function Parameters

**Occurrences:** Part of the 198 `no-unused-vars` instances

**Pattern Description:**
Function parameters that are defined but never used in the function body.

**Common Causes:**

- API compatibility (keeping parameter for interface consistency)
- Future implementation placeholders
- Refactored functions where parameters became unnecessary

**Examples:**

```typescript
// constructionRules.ts
export function calculateArmor(
  armorType: ArmorTypeEnum,
  totalArmorPoints: number,
  tonnage: number, // Parameter defined but never used
): ConstructionStepResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const definition = getArmorDefinition(armorType);
  if (!definition) {
    errors.push(`Unknown armor type: ${armorType}`);
    return {
      step: 7,
      name: 'Armor',
      weight: 0,
      criticalSlots: 0,
      isValid: false,
      errors,
      warnings,
    };
  }

  const weight = calculateArmorWeight(totalArmorPoints, armorType);
  const criticalSlots = definition.criticalSlots;

  // tonnage parameter is never referenced in the function body
  // Maximum armor check would need structure points which we don't have here
  // That's handled in full validation

  return {
    step: 7,
    name: 'Armor',
    weight,
    criticalSlots,
    isValid: true,
    errors,
    warnings,
  };
}
```

**Fix Strategies:**

1. **Prefix with underscore:** Change `tonnage: number` to `_tonnage: number` to match the ignore pattern
2. **Remove the parameter:** If the parameter is truly unnecessary
3. **Use the parameter:** Implement the functionality that would use it

**Prevention:**

- Follow the existing ESLint pattern: `argsIgnorePattern: '^_'`
- Use underscores for intentionally unused parameters
- Remove truly unnecessary parameters during refactoring

### 5. Unused Type Definitions

**Occurrences:** Part of the 198 `no-unused-vars` instances

**Pattern Description:**
Type definitions, interfaces, or constants imported but never used.

**Common Causes:**

- Leftover imports from code generation
- Type definitions that became unnecessary after refactoring
- Constants imported for future use but never implemented

**Examples:**

```typescript
// Various construction calculation files
import { ArmorDefinition } from '@/types/construction/ArmorType'; // Never used
import { EngineDefinition } from '@/types/construction/EngineType'; // Never used
import { GyroDefinition } from '@/types/construction/GyroType'; // Never used

// Constants imported but not used
import { ENGINE_DEFINITIONS } from '@/constants/engineDefinitions'; // Never used
import { LOCATION_SLOT_COUNTS } from '@/constants/mechConstants'; // Never used
```

**Fix Strategies:**

1. **Remove unused imports:** Delete the import statement
2. **Use the type/constant:** If it should be used, implement the usage
3. **Move to file scope:** If the type is used elsewhere in the same file

**Prevention:**

- Regular cleanup passes with ESLint
- IDE unused import detection
- Code review checks for unnecessary imports

## Quick Reference Table

| Pattern              | Rule                             | Fix Command                | Auto-fixable |
| -------------------- | -------------------------------- | -------------------------- | ------------ |
| Unused imports/vars  | `no-unused-vars`                 | Remove or prefix with `_`  | Partial      |
| Unsafe `any` usage   | `no-unsafe-*`                    | Add type guards/assertions | No           |
| Missing return types | `explicit-module-boundary-types` | Add `: ReturnType`         | No           |
| Unused parameters    | `no-unused-vars`                 | Prefix with `_`            | Partial      |

## Automated Fixes

Some patterns can be auto-fixed with ESLint:

```bash
# Auto-fix what can be fixed automatically
npx eslint . --fix

# Check what would be fixed
npx eslint . --fix-dry-run
```

**Auto-fixable patterns:**

- Some unused imports
- Some unused variable prefixes

**Manual fixes required:**

- Unsafe `any` usage (requires type system changes)
- Missing return types (requires type annotations)
- Complex unused variable scenarios

## Priority Order

1. **Errors first** (72 total) - These prevent compilation
2. **High-impact warnings:**
   - Unsafe `any` usage (636 instances) - Potential runtime crashes
   - Missing return types (110 instances) - Type safety
3. **Cleanup warnings:**
   - Unused imports/variables (198 instances) - Code hygiene

## Implementation Notes

- Use code references to show actual examples from the codebase
- Include both problematic code and fixed versions
- Reference specific files mentioned in ESLint output
- Provide actionable fix strategies for each pattern
- Note which patterns can be bulk-fixed vs require manual review
