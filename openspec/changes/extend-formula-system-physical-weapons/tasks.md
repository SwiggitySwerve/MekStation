# Implementation Tasks

## 1. Extend Formula Types
- [ ] 1.1 Add optional `damage?: IFormula` to `IVariableFormulas`
- [ ] 1.2 Add `PLUS` formula type for `value + bonus` patterns
- [ ] 1.3 Update `FormulaEvaluator` to handle new formula type
- [ ] 1.4 Update `ICalculatedEquipmentProperties` to include optional `damage`

## 2. Add Physical Weapon Formulas
- [ ] 2.1 Add Hatchet formula (weight=ceil(t/15), damage=floor(t/5))
- [ ] 2.2 Add Sword formula (damage=floor(t/10)+1)
- [ ] 2.3 Add Mace formula (weight=ceil(t/10), damage=floor(t/4))
- [ ] 2.4 Add Claws formula (damage=floor(t/7))
- [ ] 2.5 Add Lance formula (damage=floor(t/5)+1)
- [ ] 2.6 Add Talons formula (damage=floor(t/7))
- [ ] 2.7 Add Retractable Blade formula (damage=floor(t/10))
- [ ] 2.8 Add Flail formula (damage=floor(t/4)+2)
- [ ] 2.9 Add Wrecking Ball formula (damage=floor(t/5)+3)

## 3. Update Calculator Service
- [ ] 3.1 Modify `calculateProperties` to evaluate damage formula
- [ ] 3.2 Update return type to include optional damage
- [ ] 3.3 Add `calculatePhysicalWeaponProperties` convenience method

## 4. Deprecate Legacy System
- [ ] 4.1 Add @deprecated JSDoc to legacy calculation functions
- [ ] 4.2 Add deprecation notice to PhysicalWeaponTypes calculations

## 5. Validation
- [ ] 5.1 Run build and fix any type errors
- [ ] 5.2 Verify existing tests still pass

