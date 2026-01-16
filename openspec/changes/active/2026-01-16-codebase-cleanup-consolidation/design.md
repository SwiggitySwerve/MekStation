# Design: Codebase Cleanup and Consolidation

**Status**: COMPLETED (2026-01-16)

## Overview

This document captures the analysis and design decisions for the codebase cleanup effort following PRs #65-72.

## Current State Analysis

### Type System Issues

#### Result Type Duplication

**Location 1: `src/services/core/types/BaseTypes.ts`**
```typescript
export type ResultType<T, E = string> =
  | { success: true; data: T; error?: never }
  | { success: false; error: E; data?: never };

export class Result {
  static success<T>(data: T): ResultType<T, never>
  static error<E = string>(error: E): ResultType<never, E>
  static isSuccess<T, E>(result): result is { success: true; data: T }
  static isError<T, E>(result): result is { success: false; error: E }
  static unwrap<T, E>(result): T
  static unwrapOr<T, E>(result, defaultValue): T
  static map<T, U, E>(result, fn): ResultType<U, E>
  static flatMap<T, U, E>(result, fn): ResultType<U, E>
}
```

**Location 2: `src/services/common/types.ts`**
```typescript
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export function success<T>(data: T): Result<T>
export function failure<T, E = Error>(error: E): Result<T, E>
```

**Recommendation:** Use `BaseTypes.ts` version as canonical source because:
1. Richer API with map, flatMap, unwrap utilities
2. Better type narrowing with `error?: never` / `data?: never`
3. Class-based API is more discoverable

#### UnitType Fragmentation

| Location | Type | Values |
|----------|------|--------|
| `BattleMechInterfaces.ts` | `enum` | BATTLEMECH, OMNIMECH, INDUSTRIALMECH, PROTOMECH, VEHICLE, VTOL, AEROSPACE, CONVENTIONAL_FIGHTER, SMALL_CRAFT, DROPSHIP, JUMPSHIP, WARSHIP, SPACE_STATION, INFANTRY, BATTLE_ARMOR, SUPPORT_VEHICLE |
| `common/types.ts` | `type` | BattleMech, Vehicle, Infantry, ProtoMech, BattleArmor, Aerospace, ConvFighter, Dropship, Jumpship, Warship, SpaceStation, SmallCraft |
| `desktop/BaseTypes.ts` | `type` | BattleMech, Vehicle, Infantry, ProtoMech, Aerospace, Unknown |
| `useElectron.ts` | `type` | BattleMech, Vehicle, Infantry, ProtoMech, Aerospace, Unknown |

**Recommendation:** Use enum from `BattleMechInterfaces.ts` because:
1. Most complete with all 16 unit types
2. Enum provides better type safety and refactoring support
3. Values match game terminology (e.g., `OMNIMECH` vs `OmniMech`)

### Validation Rules Analysis

#### Services Validation (`src/services/validation/rules/`)

**Purpose:** Unit-type-based hierarchical validation
**Pattern:** Category → Unit Type inheritance

```
Universal Rules (VAL-UNIV-*) → All units
  ↓
Category Rules
  ├── Mech Category (VAL-MECH-*) → BattleMech, OmniMech, IndustrialMech, ProtoMech
  ├── Vehicle Category (VAL-VEH-*) → Vehicle, VTOL, Support Vehicle
  ├── Aerospace Category (VAL-AERO-*) → Aerospace, ConvFighter, SmallCraft, etc.
  └── Personnel Category (VAL-PERS-*) → Infantry, Battle Armor
      ↓
Unit-Type Specific Rules
  └── BattleMech (VAL-BM-*) → BattleMech only
```

#### Utils Validation (`src/utils/validation/rules/`)

**Purpose:** Configuration-based BattleMech validation
**Pattern:** Mech configuration → Rule set

```
Generic Rules → All mechs
  ↓
Configuration Rules
  ├── Biped Rules
  ├── Quad Rules
  ├── Tripod Rules
  ├── LAM Rules
  ├── QuadVee Rules
  └── OmniMech Rules
```

**Assessment:** These systems serve different purposes:
- Services validation: Cross-unit-type, hierarchical
- Utils validation: BattleMech-specific, configuration-aware

**Recommendation:** Keep both but document their relationship:
- Utils validation = detailed BattleMech configuration rules
- Services validation = universal framework for all unit types
- Future: Utils rules could be migrated into Services as BattleMech-specific layer

### File Organization Patterns

#### Current (Dot-Notation)
```
UnitLoaderService.ts                    # Main file
UnitLoaderService.armor-calculations.ts # Segment
UnitLoaderService.component-mappers.ts  # Segment
...
```

**Problems:**
1. Non-standard TypeScript/JavaScript convention
2. IDE file sorting puts segments far from main file
3. No clear hierarchy or index

#### Proposed (Directory)
```
unitLoaderService/
├── index.ts           # Public API (re-exports UnitLoaderService)
├── types.ts           # Type definitions
├── armorCalculations.ts
├── componentMappers.ts
└── ...
```

**Benefits:**
1. Standard JavaScript/TypeScript module pattern
2. Clear public API via index.ts
3. Better IDE navigation (collapse directory)
4. Easier to add/remove segments

### Naming Conventions

#### Store Naming
Current pattern: `use<Name>Store.ts`
Exception: `navigationStore.ts` (exports `useNavigationStore`, `useMobileSidebarStore`)

**Issue:** Filename doesn't match convention, though exports do follow pattern.

**Fix:** Rename file to `useNavigationStore.ts` for consistency.

## Migration Strategy

### Result Type Migration

1. Add re-export in `common/types.ts`:
   ```typescript
   export { ResultType as Result, Result as ResultHelpers } from '../core/types/BaseTypes';
   ```

2. Gradually migrate call sites from `success(data)` to `Result.success(data)`

3. After all migrations complete, remove compatibility exports

### Directory Refactoring

1. Create new directory structure
2. Move files one at a time (to maintain git history)
3. Update imports incrementally
4. Run tests after each file move
5. Delete old files only after all tests pass

### Store Migration Assessment

Check usage counts before removing:
```bash
grep -r "useCustomizerStore" src/ --include="*.ts" --include="*.tsx" | wc -l
grep -r "useMultiUnitStore" src/ --include="*.ts" --include="*.tsx" | wc -l
grep -r "useEquipmentStore" src/ --include="*.ts" --include="*.tsx" | wc -l
```

If usage > 0, add deprecation notice rather than remove.

## Risk Mitigation

1. **Type changes:** Run TypeScript in strict mode throughout
2. **Import changes:** Use IDE refactoring tools when available
3. **File moves:** Make atomic commits for each file
4. **Test coverage:** Run full test suite after each phase
5. **Rollback plan:** Each phase should be independently revertable

## Success Criteria

- [x] Zero TypeScript errors - PASSED
- [x] Zero ESLint errors - PASSED
- [x] All 5000+ tests passing - PASSED (5713 tests)
- [x] Build succeeds - PASSED
- [ ] No runtime errors in smoke testing - DEFERRED (manual testing)
- [x] Git history preserved for moved files (when possible) - PASSED (used `git mv`)
