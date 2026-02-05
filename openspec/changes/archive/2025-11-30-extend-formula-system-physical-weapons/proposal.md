# Change: Extend Formula System to All Variable Equipment

## Why

Physical weapons (Hatchet, Sword, Mace, etc.) have variable properties (weight, slots, damage) based on mech tonnage, but they use a separate legacy calculation system instead of the new FormulaRegistry. This creates inconsistency and makes it harder to support custom physical weapons.

## What Changes

- Add optional `damage` formula field to `IVariableFormulas`
- Add `FLOOR_DIVIDE` formula type for damage calculations (already exists)
- Add `PLUS` formula combinator for "floor(tonnage/divisor) + bonus" patterns
- Add builtin formulas for all physical weapons (Hatchet, Sword, Mace, Claws, Lance, Talons, Retractable Blade, Flail, Wrecking Ball)
- Update `EquipmentCalculatorService` to return damage when applicable
- Mark legacy physical weapon calculation functions as deprecated

## Impact

- Affected specs: equipment-services
- Affected code:
  - `src/types/equipment/VariableEquipment.ts` - Add damage formula field
  - `src/services/equipment/builtinFormulas.ts` - Add physical weapon formulas
  - `src/services/equipment/EquipmentCalculatorService.ts` - Return damage
  - `src/services/common/types.ts` - Update ICalculatedEquipmentProperties
  - `src/utils/equipment/variableEquipmentCalculations.ts` - Mark deprecated
