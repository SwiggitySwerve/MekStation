# Tasks: Add Battle Value Display Integration

## 1. UnitInfoBanner BV Display
- [x] 1.1 Add 'bv' status color (cyan) to styles object
- [x] 1.2 Add 'bv' to SimpleStatProps status union type
- [x] 1.3 Add BV SimpleStat component before ENGINE in Section 3
- [x] 1.4 Update min-width to accommodate new stat

## 2. UnitEditorWithRouting BV Calculation
- [x] 2.1 Import calculationService and IEditableMech types
- [x] 2.2 Add store selectors for chassis, model, techBase, cockpitType
- [x] 2.3 Create IEditableMech from store state using useMemo
- [x] 2.4 Calculate battleValue using calculationService.calculateBattleValue()
- [x] 2.5 Add battleValue to unitStats object passed to UnitInfoBanner

## 3. RecordSheetPreview BV Calculation
- [x] 3.1 Import calculationService and IEditableMech types
- [x] 3.2 Add store selectors for chassis, model, cockpitType
- [x] 3.3 Calculate battleValue and cost using useMemo
- [x] 3.4 Add battleValue and cost to unitConfig in renderPreview
- [x] 3.5 Update renderPreview dependency array

## 4. PreviewTab BV Calculation (already complete)
- [x] 4.1 Import calculationService and IEditableMech types
- [x] 4.2 Create editableMech conversion using useMemo
- [x] 4.3 Calculate battleValue using calculationService
- [x] 4.4 Add battleValue and cost to buildUnitConfig

## 5. Validation
- [x] 5.1 Build compiles successfully
- [x] 5.2 BV displays in info banner with cyan color
- [x] 5.3 BV updates reactively when unit configuration changes
- [x] 5.4 BV appears on PDF preview canvas
- [x] 5.5 BV appears in exported PDF
