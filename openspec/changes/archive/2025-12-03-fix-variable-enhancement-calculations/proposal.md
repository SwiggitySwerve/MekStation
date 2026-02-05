# Change: Fix Variable Enhancement Calculations (MASC/Supercharger)

## Why

The implementation of MASC and Supercharger weight/slot calculations does not match the spec. The code incorrectly uses `tonnage` instead of `engineRating` (MASC) and `engineWeight` (Supercharger), producing wrong values. The correct formulas exist in `builtinFormulas.ts` but are not being used by the unit store.

## What Changes

- **Bug Fix**: Update `useUnitStore.ts` enhancement helper functions to use `EquipmentCalculatorService` with correct context (`engineRating`, `engineWeight`)
- **Bug Fix**: Remove/deprecate incorrect calculations in `MovementEnhancement.ts`
- **Bug Fix**: Ensure enhancement equipment recalculates when engine changes

### Current vs Correct Calculations

| Equipment    | Current (Wrong)            | Correct (Per Spec)                |
| ------------ | -------------------------- | --------------------------------- |
| MASC (IS)    | `ceil(tonnage / 20)`       | `ceil(engineRating / 20)`         |
| MASC (Clan)  | `ceil(tonnage / 25)`       | `ceil(engineRating / 25)`         |
| Supercharger | `ceil(tonnage / 10) * 0.5` | `ceil(engineWeight / 10)` to 0.5t |

**Example**: 75-ton mech with 300 engine rating

- MASC (IS) Current: ceil(75/20) = **4 tons** (wrong)
- MASC (IS) Correct: ceil(300/20) = **15 tons** (correct)

## Impact

- Affected specs: `movement-system` (no spec changes needed - spec is correct)
- Affected code:
  - `src/stores/useUnitStore.ts` - Enhancement helper functions
  - `src/types/construction/MovementEnhancement.ts` - Deprecated calculations
- No breaking changes to public API
- Existing unit designs with MASC/Supercharger will recalculate correctly on load
