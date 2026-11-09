# BattleMech structure mass

`structureCalculations.ts` owns BattleMech structure-mass arithmetic. Its native rule follows MegaMek `48fcb2f64` `Structure.java:65-108`, `TestMek.java:118-139` and `Mek.java:1052-1060`. Consumers forward effective configuration and the existing serialized donor structure; they do not implement mass formulas.

## Native full structure mass

Configuration-aware calls use the following expressions, followed by the tripod factor (1.1 for Tripod, otherwise 1) and an upward half-ton ceiling. Superheavy means strictly more than 100 tons. For each donor, its own tonnage determines that condition.

| Material                     | Ordinary               | Superheavy            |
| ---------------------------- | ---------------------- | --------------------- |
| Standard or unknown fallback | tonnage / 10           | tonnage / 5           |
| IS or Clan Endo Steel        | tonnage / 20           | tonnage / 10          |
| Reinforced                   | tonnage / 5            | tonnage / 5           |
| Composite                    | tonnage / 20           | tonnage / 20          |
| Industrial                   | tonnage / 5            | tonnage / 2.5         |
| Endo-Composite               | (tonnage / 10) \* 0.75 | (tonnage / 10) \* 1.5 |

Preserve the division, material-factor and movement-factor order. A generic rescaling of the legacy definition multiplier can change floating-point results. Reinforced and Composite do not double for superheavy tonnage.

## Section weighting

The presence of `typeByLocation`, including an empty map, enables native section weighting. Iterate HEAD, CENTER_TORSO, RIGHT_TORSO, LEFT_TORSO, RIGHT_ARM, LEFT_ARM, RIGHT_LEG, LEFT_LEG with fractions .05, .25, .15, .15, .10, .10, .10, .10. Use the existing configuration location list to admit locations and map native arm/leg indices to Quad/QuadVee front/rear legs. Prefer effective aliases when supplied, accepting native limb keys for older serialized donors. The Tripod center leg has zero share.

Round each full donor mass first, multiply by its fraction, accumulate in native order and round the final sum last. Do not normalize fractions, reassociate additions, use object insertion order, or add epsilon. Eight explicit 35-ton Standard donors produce 4 tons in Java because their ordered sum exceeds 3.5 by one floating-point step. Full 105-ton Standard donors produce section-weighted masses of 21.5 tons (Biped) and 24 tons (Tripod).

Declared types use their declared tonnages or the initialized host default. Missing types use the initialized global material and host tonnage, ignoring retained scalar-Hybrid tonnages as the native loader does. Initialized tonnage is at least 10 and the ceiling of host mass; explicit donor tonnage is at least 10. The donor identity mapper accepts canonical `ENDO_COMPOSITE_CLAN` without changing the global mapper's historical fallback for that spelling.

## Compatibility and admission

Absence of the entire map never enables donor weighting, even if `locationTonnage` exists. Calls without configuration or a type map retain the exact historical `ceilToHalfTon(tonnage * definition.weightMultiplier)` expression, including old superheavy results. Definition multipliers remain the compatibility contract. Configuration-aware global calls intentionally correct superheavy and Tripod mass.

Admission remains with each consumer. `calculateInternalStructure` rejects unknown types and returns zero mass before calling the owner. The editor, weight-validation helpers and aggregate construction calculator retain their prior Standard fallback. Critical slots and structure points remain separate from mass.

The separate `CalculationService.ts` flat `tonnage * 0.1` editable-mech estimate is a legacy residual with a different input contract. It remains unchanged.

Enforcement: `__tests__/structureCalculations.test.ts` retains contextless characterizations and admission guards, pins 72 native material/tonnage/configuration observations, the six FrankenMeks and all 15 S1/S2 units, and distinguishes map defaults, aliases and rounding stages. Integration tests use the real owner through all four editor consumers and real library/draft storage, cloning and undo/redo.
