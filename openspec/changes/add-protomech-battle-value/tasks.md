# Tasks: Add ProtoMech Battle Value

## 1. Calculator Scaffolding

- [ ] 1.1 Create `src/utils/construction/protomech/protoMechBV.ts`
- [ ] 1.2 Export `calculateProtoMechBV(unit: IProtoMechUnit): IProtoMechBVBreakdown`
- [ ] 1.3 Wire dispatch in `battleValueCalculations.ts`
- [ ] 1.4 Define `IProtoMechBVBreakdown`

## 2. Defensive BV

- [ ] 2.1 armorBV = armor × 2.5 (Standard armor only; mult 1.0)
- [ ] 2.2 structureBV = structure × 1.5
- [ ] 2.3 defEquipBV from resolver
- [ ] 2.4 Explosive penalty
- [ ] 2.5 defFactor = 1 + (maxTMM / 10) — TMM from walkMP
- [ ] 2.6 defensiveBV = (armorBV + structureBV + defEquipBV − explosive) × defFactor

## 3. Offensive BV

- [ ] 3.1 weaponBV — arm + main gun weapons
- [ ] 3.2 ammoBV
- [ ] 3.3 Physical attack bonus (small — protos have lower punch damage)
- [ ] 3.4 offEquipBV
- [ ] 3.5 Speed factor with mp = walkMP + round(jumpMP / 2)

## 4. Chassis Multipliers

- [ ] 4.1 Glider: finalBV × 0.9 (fragile)
- [ ] 4.2 Ultraheavy: finalBV × 1.15 (heavier armor/firepower)
- [ ] 4.3 Standard Biped / Quad: 1.0 (no modifier)

## 5. Pilot Skill Multiplier

- [ ] 5.1 Reuse shared gunnery/piloting table

## 6. Point Aggregation

- [ ] 6.1 Support summing 5 proto BVs into point BV for reporting
- [ ] 6.2 Point BV displayed in force tools (not combat — each proto fights individually)

## 7. Parity Harness

- [ ] 7.1 Load canonical protos (Minotaur, Satyr, Sprite, Ares, etc.)
- [ ] 7.2 Compare against MegaMekLab proto BV values
- [ ] 7.3 Emit `validation-output/protomech-bv-validation-report.json`

## 8. Status Bar

- [ ] 8.1 `ProtoMechStatusBar` (new or existing) shows BV and point-aggregate BV

## 9. Validation

- [ ] 9.1 `openspec validate add-protomech-battle-value --strict`
- [ ] 9.2 Unit tests on 5 canonical protos
- [ ] 9.3 Build + lint clean
