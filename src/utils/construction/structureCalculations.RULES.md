# BattleMech structure mass

`structureCalculations.ts` owns BattleMech structure-mass arithmetic. Component definitions in `InternalStructureType.ts` own the multipliers. Multiply the unit tonnage by its structure multiplier, then use `ceilToHalfTon`; do not round the tonnage first.

This extraction preserves the existing callers exactly, including superheavy inputs and the Standard multiplier fallback for unrecognized types. It does not introduce per-location FrankenMek structure calculations.

Admission remains with each consumer. `calculateInternalStructure` rejects unknown types and returns zero mass before calling the owner. The editor, weight-validation helpers and aggregate construction calculator retain their prior Standard fallback. Critical slots and structure points remain separate from mass.

Enforcement: `__tests__/structureCalculations.test.ts` fixes numerical results for every existing type at 10, 15, 35, 50, 55, 100, 105 and 200 tons, checks all five former arithmetic copies, and preserves the different unknown-type guards.
