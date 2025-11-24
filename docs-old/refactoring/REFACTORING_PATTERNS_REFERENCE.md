# Refactoring Patterns Reference

This document serves as a guide for standardizing code patterns and eliminating unsafe `as any` type casts across the codebase. Follow these patterns when refactoring legacy code or implementing new features.

## 1. Unit Location Keys

**Problem:** Inconsistent naming conventions for Mech locations (snake_case vs camelCase vs Title Case) lead to fragile string manipulation and type errors.

**Standard:**
- **Internal State:** Use `camelCase` for all internal interfaces (`IArmorAllocation`, `InternalStructure`).
- **Display/DB:** Map to/from Title Case or snake_case only at the boundaries (UI rendering or Data loading).

**Pattern:** Use strict mapping objects instead of string manipulation.

```typescript
// BAD: Fragile string manipulation
const key = location.toLowerCase().replace(' ', ''); // 'Center Torso' -> 'centertorso' (Wrong!)

// GOOD: Explicit mapping
import { MECH_LOCATIONS } from 'types/editor';

const locationKeyMap: Record<string, string> = {
  [MECH_LOCATIONS.HEAD]: 'head',
  [MECH_LOCATIONS.CENTER_TORSO]: 'centerTorso',
  [MECH_LOCATIONS.LEFT_TORSO]: 'leftTorso',
  // ...
};

const key = locationKeyMap[location]; // 'Center Torso' -> 'centerTorso' (Correct)
```

## 2. Equipment Data Access

**Problem:** Equipment objects have ambiguous properties (legacy `space` vs new `slots`, `weight` vs `tonnage`) and nested data structures, leading to frequent `as any` casting.

**Standard:** Use safe accessor helpers from `src/utils/equipmentTypeHelpers.ts`.

**Pattern:**

```typescript
import { getEquipmentWeight, getEquipmentSlots, getEquipmentHeatGenerated } from 'utils/equipmentTypeHelpers';

// BAD: Unsafe property access and casting
const weight = (eq as any).weight || (eq as any).tonnage || 0;
const heat = (eq as any).heat || (eq as any).data?.heat || 0;

// GOOD: Safe helper usage
const weight = getEquipmentWeight(eq);
const heat = getEquipmentHeatGenerated(eq);
const slots = getEquipmentSlots(eq);
```

## 3. Type Guards and Safety

**Problem:** Using `as any` to bypass type checks when properties might not exist on the base interface.

**Standard:** Use explicit Type Guards to narrow types securely.

**Pattern:**

```typescript
import { isWeapon, isHeatManagement } from 'utils/equipmentTypeHelpers';

// BAD: Casting to access specific properties
if ((equipment as any).damage) {
  // ...
}

// GOOD: Type Guard
if (isWeapon(equipment)) {
  // equipment is now typed as IWeapon
  console.log(equipment.damage);
}
```

## 4. Logic Centralization

**Problem:** Duplicated "Game Rules" logic (Max Armor, Heat Calculations) scattered across components.

**Standard:** Import from centralized managers.

**Pattern:**

- **Max Armor:** `src/utils/armorAllocationHelpers.ts` -> `getMaxArmorForLocation`
- **Internal Structure:** `src/utils/internalStructureTable.ts`

## 5. Component Configuration Types

**Problem:** Component configurations (Engine, Gyro) are often cast to `any` to access `type` or `techBase`.

**Standard:** Use `IComponentConfiguration` or specific interfaces (`IEngineDef`).

```typescript
// BAD
const engineType = (config.engineType as any).type;

// GOOD
import { IComponentConfiguration } from 'types/core/ComponentInterfaces';

const getComponentType = (comp: IComponentConfiguration | string): string => {
  return typeof comp === 'string' ? comp : comp.type;
}
```

