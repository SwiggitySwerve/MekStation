# Tasks: Fix Exotic Configuration Slot Counts

## Implementation Order

### Phase 1: Fix Validation Code
- [x] Update `QuadTotalSlotsRule` in `ConfigurationValidationRules.ts` to use 90 slots max
- [x] Update `QuadTotalSlotsRule` to import `LOCATION_SLOT_COUNTS` from `CriticalSlotAllocation.ts`
- [x] Calculate max dynamically based on quad locations rather than hardcoding
- [x] Update test `should fail when critical slots exceed quad maximum` to use 91+ slots

### Phase 2: Update Tests
- [x] Fix `ConfigurationValidationRules.test.ts` quad slot exceed test to reflect 90 slot max
- [x] Add test verifying quad max is calculated from `LOCATION_SLOT_COUNTS`
- [x] Verify all 5000+ tests still pass

### Phase 3: Archive Change
- [x] Run `openspec validate fix-exotic-config-slot-counts --strict`
- [ ] Archive change after implementation complete

## Parallelizable Work
- Phase 1 tasks can be done together (single file modification)
- Phase 2 tests can run after Phase 1

## Dependencies
- None (self-contained fix)

## Validation Checklist
- [ ] `npm test` passes all tests
- [ ] `npm run build` succeeds
- [ ] Coverage thresholds still met
- [ ] PR CI passes
