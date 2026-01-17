# Tasks: Add Weight and Critical Slot Overflow Validation

## 1. Extend Validation Interfaces
- [x] 1.1 Add `allocatedWeight` and `maxWeight` to `IValidatableUnit`
- [x] 1.2 Add `slotsByLocation` to `IValidatableUnit`
- [x] 1.3 Create `ISlotLocationEntry` interface

## 2. Add Validation Rules
- [x] 2.1 Update VAL-UNIV-013 armor thresholds (20%/40% instead of 0%/50%)
- [x] 2.2 Add 75/25 front/rear torso split for armor validation
- [x] 2.3 Implement VAL-UNIV-014 weight overflow validation
- [x] 2.4 Implement VAL-UNIV-015 critical slot overflow validation
- [x] 2.5 Register new rules in `UNIVERSAL_VALIDATION_RULES` array

## 3. Update Validation Hook
- [x] 3.1 Add structural weight calculation helper
- [x] 3.2 Add `buildSlotsByLocation` helper
- [x] 3.3 Add `getLocationsForConfiguration` helper
- [x] 3.4 Pass weight and slot data to `IValidatableUnit`
- [x] 3.5 Add new store fields to useMemo dependencies

## 4. Testing
- [x] 4.1 Add tests for VAL-UNIV-014 weight overflow
- [x] 4.2 Add tests for VAL-UNIV-015 slot overflow
- [x] 4.3 Update tests for VAL-UNIV-013 new thresholds
- [x] 4.4 Run typecheck
- [x] 4.5 Run full test suite
- [x] 4.6 Verify build passes
