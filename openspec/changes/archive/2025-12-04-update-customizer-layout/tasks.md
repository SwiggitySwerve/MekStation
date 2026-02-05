# Tasks: Update Customizer Layout

## 1. Structure Tab Layout Changes

- [x] 1.1 Add `TONNAGE_RANGE` constant and `CONFIGURATION_OPTIONS` to StructureTab
- [x] 1.2 Add `tonnage`, `configuration` state and setters from useUnitStore
- [x] 1.3 Add `handleTonnageChange` and `handleConfigurationChange` handlers
- [x] 1.4 Add Tonnage stepper control at top of Chassis section (left column)
- [x] 1.5 Add Motive Type dropdown at bottom of Movement section (right column)

## 2. Overview Tab Layout Changes

- [x] 2.1 Remove `TONNAGE_RANGE` and `CONFIGURATION_OPTIONS` constants
- [x] 2.2 Remove `tonnage`, `configuration` state and setters
- [x] 2.3 Remove `handleTonnageChange` and `handleConfigurationChange` handlers
- [x] 2.4 Remove Chassis panel (right side of two-column layout)
- [x] 2.5 Simplify layout to single Basic Information panel
- [x] 2.6 Remove unused `MechConfiguration` import

## 3. Tech Base Badge Updates

- [x] 3.1 Update TechBaseBadge to accept `techBaseMode: TechBaseMode` prop
- [x] 3.2 Use `getTechBaseModeColors()` for badge styling
- [x] 3.3 Use `getTechBaseModeShortName()` for display text (IS/Clan/Mixed)
- [x] 3.4 Remove old `TechBase` type dependency from badge

## 4. Unit Info Banner Updates

- [x] 4.1 Update UnitStats interface: change `techBase: TechBase` to `techBaseMode: TechBaseMode`
- [x] 4.2 Update UnitInfoBanner to pass `techBaseMode` to TechBaseBadge
- [x] 4.3 Update import from TechBase enum to TechBaseMode

## 5. Unit Editor Integration

- [x] 5.1 Import `TechBaseMode` and `isEffectivelyMixed` in UnitEditorWithRouting
- [x] 5.2 Add `techBaseMode` and `componentTechBases` from useUnitStore
- [x] 5.3 Compute `effectiveTechBaseMode` that detects mixed state
- [x] 5.4 Pass `effectiveTechBaseMode` to unitStats object

## 6. Verification

- [x] 6.1 Build passes with no TypeScript errors
- [x] 6.2 Linting passes with no errors
- [x] 6.3 Manual testing: Tonnage control works in Structure tab
- [x] 6.4 Manual testing: Motive Type dropdown works in Structure tab
- [x] 6.5 Manual testing: Overview tab shows only Basic Information
- [x] 6.6 Manual testing: Tech base badge shows "Mixed" when components differ
