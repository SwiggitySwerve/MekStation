# Implementation Tasks

## 1. Extend Formula Types

- [x] 1.1 Add optional `damage?: IFormula` to `IVariableFormulas`
- [x] 1.2 Add `PLUS` formula type for `value + bonus` patterns
- [x] 1.3 Update `FormulaEvaluator` to handle new formula type
- [x] 1.4 Update `ICalculatedEquipmentProperties` to include optional `damage`

## 2. Add Physical Weapon Formulas

- [x] 2.1 Add Hatchet formula (weight=ceil(t/15), damage=floor(t/5))
- [x] 2.2 Add Sword formula (damage=floor(t/10)+1)
- [x] 2.3 Add Mace formula (weight=ceil(t/10), damage=floor(t/4))
- [x] 2.4 Add Claws formula (damage=floor(t/7))
- [x] 2.5 Add Lance formula (damage=floor(t/5)+1)
- [x] 2.6 Add Talons formula (damage=floor(t/7))
- [x] 2.7 Add Retractable Blade formula (damage=floor(t/10))
- [x] 2.8 Add Flail formula (damage=floor(t/4)+2)
- [x] 2.9 Add Wrecking Ball formula (damage=floor(t/5)+3)

## 3. Update Calculator Service

- [x] 3.1 Modify `calculateProperties` to evaluate damage formula
- [x] 3.2 Update return type to include optional damage
- [x] 3.3 Add `calculatePhysicalWeaponProperties` convenience method (via variableEquipmentId)

## 4. Deprecate Legacy System

- [x] 4.1 Add @deprecated JSDoc to legacy calculation functions
- [x] 4.2 Add deprecation notice to PhysicalWeaponTypes calculations
- [x] 4.3 Remove deprecated functions entirely (cleanup)
- [x] 4.4 Remove legacy types (IVariableEquipmentConfig, VariableProperty, etc.)
- [x] 4.5 Replace variableConfig with variableEquipmentId in equipment definitions

## 5. Validation

- [x] 5.1 Run build and fix any type errors
- [x] 5.2 Verify build compiles successfully
