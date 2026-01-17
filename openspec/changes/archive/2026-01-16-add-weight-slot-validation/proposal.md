# Change: Add Weight and Critical Slot Overflow Validation

**Status**: Archived (Implemented)
**PR**: #78
**Commits**: `be6e026e`, `14531941`

## Why

The validation system was missing critical overflow checks:
1. Weight overflow - no error when unit exceeded max tonnage
2. Slot overflow - no error when location exceeded slot capacity
3. Armor thresholds - validation showed warnings when UI showed green (threshold mismatch)

## What Changes

- **VAL-UNIV-013**: Updated armor allocation validation thresholds
  - ERROR: < 20% of expected max (was: 0 armor only)
  - WARNING: 20-40% of expected max (was: < 50%)
  - Front torso compared against 75% of total max
  - Rear torso compared against 25% of total max

- **VAL-UNIV-014**: Added weight overflow validation (CRITICAL ERROR when total weight exceeds max tonnage)

- **VAL-UNIV-015**: Added critical slot overflow validation (CRITICAL ERROR when any location exceeds slot capacity)

- Extended `IValidatableUnit` interface with:
  - `allocatedWeight` - total weight used
  - `maxWeight` - tonnage limit
  - `slotsByLocation` - per-location slot usage

- Updated `useUnitValidation` hook to calculate and pass weight/slot data

## Impact

- Affected specs: `unit-validation-framework`
- Affected code:
  - `src/types/validation/UnitValidationInterfaces.ts`
  - `src/services/validation/rules/universal/UniversalValidationRules.ts`
  - `src/hooks/useUnitValidation.ts`
  - `src/__tests__/service/validation/rules/universal/UniversalValidationRules.test.ts`
