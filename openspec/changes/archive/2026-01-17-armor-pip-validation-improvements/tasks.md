# Tasks: Armor Pip Rendering & Validation Improvements

## Status: COMPLETE

### Phase 1: Fix Armor Pip Rendering

- [x] Identify issue: `PREMADE_PIP_TYPES` constant was empty
- [x] Add `'biped'` to `PREMADE_PIP_TYPES` in constants.ts
- [x] Verify pip SVG files load from `/record-sheets/biped_pips/`
- [x] Test PDF export shows pips correctly

### Phase 2: Per-Location Armor Validation

- [x] Add `IArmorByLocation` and `IArmorLocationEntry` types
- [x] Build per-location armor data in `useUnitValidation` hook
- [x] Support all mech configurations (Biped, Quad, Tripod, LAM, QuadVee)
- [x] Update `ArmorAllocationValidation` rule for per-location checks
- [x] ERROR severity for 0 armor locations
- [x] WARNING severity for <50% max armor locations
- [x] Add tests for all configurations

### Phase 3: MegaMekLab-Style Armor Distribution

- [x] Update `calculateBipedArmorAllocation` - 75/25 ratio for all torsos
- [x] Update `calculateQuadArmorAllocation` - same pattern
- [x] Update `calculateTripodArmorAllocation` - same pattern
- [x] Update auto-allocation tests to match new behavior

### Phase 4: Updated Armor Status Thresholds

- [x] Update `ARMOR_STATUS` constants (60/40/20%)
- [x] Update `getMegaMekStatusColor` to use constants
- [x] Update `getArmorGradientId` to use constants
- [x] Update all armor diagram legends
- [x] Update tests to use dynamic thresholds

### Phase 5: Validation Summary Improvements

- [x] Show warning badge when warnings exist (even if valid)
- [x] Add info count display
- [x] Update badge color logic for warnings-only state
- [x] Update ValidationSummary tests

### Phase 6: Add ArmorLevelRule

- [x] Create `ArmorLevelRule` in StandardValidationRules
- [x] Register rule in `getStandardValidationRules()`
- [x] Update rule count in tests

### Phase 7: Validation Navigation

- [x] Add clickable navigation from validation errors to tabs
- [x] Implement `useValidationNavigation` hook
- [x] Wire up navigation in ValidationSummary

### Phase 8: Cleanup Experimental Code

- [x] Remove `pipDistribution/` service folder
- [x] Remove pip style toggle from PreviewToolbar
- [x] Remove `usePoissonPipDistribution` from app settings
- [x] Remove related tests
- [x] Delete old openspec proposal

### Phase 9: Add Pre-commit Hooks

- [x] Add build step to `.husky/pre-commit`
- [x] Pre-commit now runs: lint-staged + npm run build

### Phase 10: Verification

- [x] TypeScript passes
- [x] ESLint passes (no errors)
- [x] All tests pass (5,882 total)
- [x] Production build succeeds

## Commits

1. `fix: Enable pre-made pip SVGs for biped mechs`
2. `chore: Remove pip style toggle and pipDistribution service`
3. `feat(validation): Add warning for locations with no armor`
4. `feat(ui): Add dynamic validation panel to customizer`
5. `feat(validation): Add clickable navigation from validation errors to tabs`
6. `feat(armor): Add per-location armor validation and MegaMekLab-style allocation`
7. `chore: Add build step to pre-commit hook`
8. `fix(test): Pass validation prop to UnitInfoBanner test`
