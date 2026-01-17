# Tasks: Armor Pip Rendering & Validation Improvements

## Status: COMPLETE

### Phase 1: Fix Armor Pip Rendering

- [x] Identify issue: `PREMADE_PIP_TYPES` constant was empty
- [x] Add `'biped'` to `PREMADE_PIP_TYPES` in constants.ts
- [x] Verify pip SVG files load from `/record-sheets/biped_pips/`
- [x] Test PDF export shows pips correctly

### Phase 2: Add Armor Validation

- [x] Add `NO_ARMOR` warning to `validateArmor()` method
- [x] Check all locations: head, arms, legs, torsos
- [x] Use WARNING severity (not ERROR)
- [x] Add display names for cleaner messages

### Phase 3: Add Validation Panel UI

- [x] Create `ValidationPanel.tsx` component
- [x] Extract messages from validation result
- [x] Color-code by severity (error/warning/info)
- [x] Add collapsible header with counts
- [x] Integrate into `UnitEditorWithRouting.tsx`

### Phase 4: Cleanup Experimental Code

- [x] Remove `pipDistribution/` service folder
- [x] Remove pip style toggle from PreviewToolbar
- [x] Remove `usePoissonPipDistribution` from app settings
- [x] Remove related tests
- [x] Delete old openspec proposal

### Phase 5: Verification

- [x] TypeScript passes
- [x] ESLint passes (no errors)
- [x] All 5,805 tests pass
- [x] Production build succeeds

## Commits

1. `fix: Enable pre-made pip SVGs for biped mechs`
2. `chore: Remove pip style toggle and pipDistribution service`
3. `feat(validation): Add warning for locations with no armor`
4. `feat(ui): Add dynamic validation panel to customizer`
