# Proposal: Fix Exotic Configuration Slot Counts

## Summary

Fix incorrect slot count validation for exotic mech configurations (Quad, QuadVee) and document slot counts for all configurations (Biped, Quad, Tripod, QuadVee, LAM) in the specifications.

## Problem Statement

The `ConfigurationValidationRules.ts` validation code uses incorrect maximum slot counts:

- **Quad mechs**: Code uses 66 slots max (assumes 6-slot legs), but quad legs have 12 slots each
- **Correct Quad total**: 6 (head) + 36 (torsos) + 48 (4x12 legs) = **90 slots**

The canonical source `CriticalSlotAllocation.ts` correctly defines quad legs as 12 slots each, but the validation rules were not aligned.

Additionally, the `critical-slot-allocation` spec only documents biped slot counts (78 total), missing exotic configurations.

## Current State

### CriticalSlotAllocation.ts (Canonical - CORRECT)

```typescript
// Quad/QuadVee leg locations (12 slots each)
[MechLocation.FRONT_LEFT_LEG]: 12,
[MechLocation.FRONT_RIGHT_LEG]: 12,
[MechLocation.REAR_LEFT_LEG]: 12,
[MechLocation.REAR_RIGHT_LEG]: 12,
```

### ConfigurationValidationRules.ts (INCORRECT)

```typescript
// Quad mechs: 6 (head) + 12*3 (torsos) + 6*4 (legs) = 6 + 36 + 24 = 66 slots
const maxSlots = 66; // WRONG - should be 90
```

## Proposed Solution

### 1. Fix Validation Code

Update `ConfigurationValidationRules.ts` to use correct slot counts:

- Quad: 90 slots (not 66)
- Import slot counts from `CriticalSlotAllocation.ts` instead of hardcoding

### 2. Document All Configuration Slot Counts

Add requirements to `critical-slot-allocation` spec for:

- **Biped**: 78 slots (6 head + 36 torsos + 24 arms + 12 legs)
- **Quad**: 90 slots (6 head + 36 torsos + 48 quad legs)
- **Tripod**: 84 slots (6 head + 36 torsos + 24 arms + 18 tripod legs)
- **QuadVee**: 90 slots (same as Quad)
- **LAM**: 78 slots (same as Biped, fighter mode uses different locations)

### 3. Update Validation Rules Spec

Add configuration-specific validation rules to `validation-rules-master` spec.

## Impact

- **Breaking Change**: No (loosens validation, previously valid mechs remain valid)
- **Files Modified**:
  - `src/utils/validation/rules/ConfigurationValidationRules.ts`
  - `openspec/specs/critical-slot-allocation/spec.md`
  - `openspec/specs/validation-rules-master/spec.md`

## Success Criteria

1. Quad mechs with up to 90 filled slots pass validation
2. All configuration slot counts documented in specs
3. Validation imports from canonical source (CriticalSlotAllocation.ts)
4. All existing tests pass
5. New tests cover configuration-specific slot limits
