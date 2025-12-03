# Tasks: Document Heat Overflow Effects

## Implementation Tasks

### Phase 1: Documentation & Spec Creation
- [ ] Create `heat-overflow-effects` spec with complete heat scale table
- [ ] Document all heat thresholds (0, 5, 10, 15, 18, 20, 22, 24, 26, 28, 30)
- [ ] Document movement penalties per threshold
- [ ] Document to-hit modifiers per threshold
- [ ] Document shutdown roll targets per threshold
- [ ] Document ammo explosion roll targets per threshold

### Phase 2: Type Updates
- [ ] Update `HEAT_SCALE_EFFECTS` in `HeatManagement.ts` with complete thresholds
- [ ] Add `tsmActivation` threshold constant (9)
- [ ] Add helper function `isShutdownRisk(heat: number): boolean`
- [ ] Add helper function `getAmmoExplosionRisk(heat: number): number | null`

### Phase 3: Equipment Interactions
- [ ] Document TSM activation at 9+ heat in spec
- [ ] Document how heat penalties apply to movement (before or after enhancements)
- [ ] Verify `calculateEnhancedMaxRunMP` correctly accounts for heat penalty
- [ ] Add unit tests for heat-affected movement calculations

### Phase 4: Validation & Testing
- [ ] Add tests for `getHeatScaleEffect` with all thresholds
- [ ] Add tests for shutdown/explosion risk calculations
- [ ] Verify heat scale matches TechManual values

## Dependencies
- None - this is primarily documentation with minor type updates

## Parallelizable Work
- Spec creation (Phase 1) can proceed independently
- Type updates (Phase 2) can be done in parallel with spec
- Tests (Phase 4) depend on Phase 2 completion

