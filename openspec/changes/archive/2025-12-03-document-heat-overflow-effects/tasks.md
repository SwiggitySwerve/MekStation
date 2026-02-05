# Tasks: Document Heat Overflow Effects

## Implementation Tasks

### Phase 1: Documentation & Spec Creation

- [x] Create `heat-overflow-effects` spec with complete heat scale table
- [x] Document all heat thresholds (0, 5, 10, 15, 18, 20, 22, 24, 26, 28, 30)
- [x] Document movement penalties per threshold
- [x] Document to-hit modifiers per threshold
- [x] Document shutdown roll targets per threshold
- [x] Document ammo explosion roll targets per threshold

### Phase 2: Type Updates

- [x] Update `HEAT_SCALE_EFFECTS` in `HeatManagement.ts` with complete thresholds
- [x] Add `TSM_ACTIVATION_THRESHOLD` constant (9)
- [x] Add helper function `isShutdownRisk(heat: number): boolean`
- [x] Add helper function `getAmmoExplosionRisk(heat: number): number | null`
- [x] Add helper function `isTSMActive(heat: number): boolean`
- [x] Add helper function `getHeatMovementPenalty(heat: number): number`

### Phase 3: Equipment Interactions

- [x] Document TSM activation at 9+ heat in spec
- [x] Document how heat penalties apply to movement (before or after enhancements)
- [x] Verify `calculateEnhancedMaxRunMP` correctly accounts for heat penalty
- [x] Add unit tests for heat-affected movement calculations

### Phase 4: Validation & Testing

- [x] Add tests for `getHeatScaleEffect` with all thresholds (24 tests)
- [x] Add tests for shutdown/explosion risk calculations
- [x] Verify heat scale matches TechManual values

## Dependencies

- None - this is primarily documentation with minor type updates

## Parallelizable Work

- Spec creation (Phase 1) can proceed independently
- Type updates (Phase 2) can be done in parallel with spec
- Tests (Phase 4) depend on Phase 2 completion

## Completion Summary

- **Files Modified**: `src/types/validation/HeatManagement.ts`
- **Files Created**: `src/__tests__/unit/types/validation/HeatManagement.test.ts`
- **Tests Added**: 24 unit tests for heat management functions
- **All tests passing**: ✅
