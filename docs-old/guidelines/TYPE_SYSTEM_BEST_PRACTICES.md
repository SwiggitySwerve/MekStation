# Type System Best Practices

This document establishes the **authoritative standards** for using the BattleTech Editor's type system. Adherence to these practices is mandatory for all new code and refactoring efforts to ensure stability, maintainability, and type safety.

## 1. The Core Principle

**`src/types/core` is the Single Source of Truth.**

All domain models, interfaces, and type definitions reside in the `core` directory. 
- Do **NOT** define duplicate types in components or services.
- Do **NOT** rely on legacy files like `systemComponents.ts` (these are for backward compatibility only).

## 2. Import Strategy

Always import from the facade or the specific core module.

### ✅ Correct
```typescript
// Preferred: Import from the main core index
import { 
  ICompleteUnitConfiguration, 
  TechBase, 
  ComponentCategory 
} from 'src/types/core';

// Acceptable: Import from specific core modules if needed for circular dependency avoidance
import { IEquipmentInstance } from 'src/types/core/UnitInterfaces';
```

### ❌ Incorrect
```typescript
// Avoid: Legacy compatibility files
import { SystemComponents } from 'src/types/systemComponents';

// Avoid: Relative deep imports that bypass the module structure
import { TechBase } from '../../types/core/BaseTypes'; 
```

## 3. Type Safety & Casting

Eliminate ambiguity. Stop using `as any` or unsafe casts.

### 🚫 The "as any" Anti-Pattern
Casting to `any` silences the compiler but leads to runtime crashes.

```typescript
// BAD: If 'data' is missing fields, this crashes later
const config = response.data as ICompleteUnitConfiguration; 
```

### 🚫 Avoid Double Casting ("as unknown as")
Double casting (e.g., `x as unknown as Y`) completely bypasses the type system and hides potential incompatibilities. It is often used as a shortcut when types don't align, but this masks the underlying issue.

```typescript
// BAD: Bypassing type checks
const equipment = rawData as unknown as IEquipment;

// GOOD: Use a proper type guard or intermediate type with validation
if (isValidEquipment(rawData)) {
  const equipment = rawData;
}
```

If you find yourself needing `as unknown as`, it usually means:
1. One of the types is incorrect.
2. You need a type guard function.
3. You need a conversion function.

### 🛡️ The Type Guard Solution
Use the runtime validation functions provided in `src/types/core/BaseTypes.ts`.

```typescript
import { isValidUnitConfiguration, ICompleteUnitConfiguration } from 'src/types/core';

function processConfig(data: unknown) {
  if (isValidUnitConfiguration(data)) {
    // 'data' is now safely narrowed to ICompleteUnitConfiguration
    console.log(data.tonnage);
  } else {
    console.error("Invalid configuration received");
  }
}
```

## 4. Data Structures & Constants

### Use Interfaces, Not Loose Objects
Always define variables with explicit interfaces.

```typescript
// BAD: Implicit typing, missing required fields
const mech = {
  name: "Atlas",
  tonnage: 100
};

// GOOD: Explicit typing ensures contract compliance
const mech: ICompleteUnitConfiguration = {
  id: "123",
  name: "Atlas",
  tonnage: 100,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  // Compiler will flag missing properties immediately
  ...
};
```

### Use Constants, Not Magic Strings
Never hardcode string literals for known enumerable values.

```typescript
// BAD
if (mech.techBase === 'Inner Sphere') { ... }

// GOOD
import { TechBase } from 'src/types/core';

if (mech.techBase === TechBase.INNER_SPHERE) { ... }
```

## 5. Component Database Access

Access component data through the unified `ComponentDatabase` types.

```typescript
import { 
  ComponentCategory, 
  TechBase,
  getComponentsByCategory 
} from 'src/types/core';

// Get all Standard engines
const engines = getComponentsByCategory(
  ComponentCategory.ENGINE, 
  TechBase.INNER_SPHERE
);
```

## 6. Migrating Legacy Data

When dealing with data from old databases or `any` typed sources, use the Migration Utilities.

```typescript
import { migrateToTypedConfiguration, isSuccess } from 'src/types/core';

const result = migrateToTypedConfiguration(legacyData);

if (isSuccess(result)) {
  // result.data is strictly typed as ICompleteUnitConfiguration
  const newConfig = result.data;
} else {
  console.error("Migration failed:", result.error);
}
```

## 7. Summary Checklist

Before submitting a PR, verify:
1.  [ ] Are all types imported from `src/types/core`?
2.  [ ] Have all `as any` casts been removed?
3.  [ ] Are `isValid*` type guards used for external data?
4.  [ ] Are `TechBase.*` and `ComponentCategory.*` constants used instead of strings?
5.  [ ] Are new data structures defined using `IInterface` naming convention?

## 8. Violations Report

A comprehensive audit of current violations in the codebase is available at:
**[Type System Violations Report](../analysis/TYPE_SYSTEM_VIOLATIONS_REPORT.md)**

This report catalogs:
- 50+ files importing from deprecated `systemComponents.ts`
- 93 instances of `as any` casts
- 659+ hardcoded `'Inner Sphere'` string literals
- 418+ hardcoded `'Clan'` string literals
- Missing type guards throughout the codebase

Use this report to prioritize refactoring efforts and track migration progress.

---

## 9. Related Guidelines

For general code style, formatting, and React patterns, see:
- **[CODE_STYLING_BEST_PRACTICES.md](./CODE_STYLING_BEST_PRACTICES.md)** - Comprehensive code style guide covering TypeScript conventions, React patterns, formatting standards, and more

For an overview of all guidelines:
- **[README.md](./README.md)** - Guidelines directory overview and quick reference

