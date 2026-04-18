# Tasks: Add ProtoMech Battle Value

## 1. Calculator Scaffolding

- [x] 1.1 Create `src/utils/construction/protomech/protoMechBV.ts`
- [x] 1.2 Export `calculateProtoMechBV(unit: IProtoMechUnit): IProtoMechBVBreakdown`
- [x] 1.3 Wire dispatch in `battleValueCalculations.ts`
- [x] 1.4 Define `IProtoMechBVBreakdown`

## 2. Defensive BV

- [x] 2.1 armorBV = armor × 2.5 (Standard armor only; mult 1.0)
- [x] 2.2 structureBV = structure × 1.5
- [x] 2.3 defEquipBV from resolver
- [x] 2.4 Explosive penalty
- [x] 2.5 defFactor = 1 + (maxTMM / 10) — TMM from walkMP
- [x] 2.6 defensiveBV = (armorBV + structureBV + defEquipBV − explosive) × defFactor

## 3. Offensive BV

- [x] 3.1 weaponBV — arm + main gun weapons
- [x] 3.2 ammoBV
- [x] 3.3 Physical attack bonus (small — protos have lower punch damage)
- [x] 3.4 offEquipBV
- [x] 3.5 Speed factor with mp = walkMP + round(jumpMP / 2)

## 4. Chassis Multipliers

- [x] 4.1 Glider: finalBV × 0.9 (fragile)
- [x] 4.2 Ultraheavy: finalBV × 1.15 (heavier armor/firepower)
- [x] 4.3 Standard Biped / Quad: 1.0 (no modifier)

## 5. Pilot Skill Multiplier

- [x] 5.1 Reuse shared gunnery/piloting table

## 6. Point Aggregation

- [x] 6.1 Support summing 5 proto BVs into point BV for reporting
- [x] 6.2 Point BV displayed in force tools (not combat — each proto fights individually)

## 7. Parity Harness

- [x] 7.1 Load canonical protos (Minotaur, Satyr, Sprite, Ares, etc.) — wired (MUL cache deferred)
- [x] 7.2 Compare against MegaMekLab proto BV values — wired (MUL cache deferred)
- [x] 7.3 Emit `validation-output/protomech-bv-validation-report.json` — emits `status: 'deferred'` until proto MUL cache lands

## 8. Status Bar

- [x] 8.1 `ProtoMechStatusBar` (new or existing) shows BV and point-aggregate BV

## 9. Validation

- [x] 9.1 `openspec validate add-protomech-battle-value --strict`
- [x] 9.2 Unit tests on 5 canonical protos
- [x] 9.3 Build + lint clean
