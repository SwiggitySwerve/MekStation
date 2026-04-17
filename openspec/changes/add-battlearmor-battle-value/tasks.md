# Tasks: Add BattleArmor Battle Value

## 1. Calculator Scaffolding

- [ ] 1.1 Create `src/utils/construction/battlearmor/battleArmorBV.ts`
- [ ] 1.2 Export `calculateBattleArmorBV(unit: IBattleArmorUnit): IBABreakdown`
- [ ] 1.3 Wire dispatch in `battleValueCalculations.ts`
- [ ] 1.4 Define `IBABreakdown` (per-trooper, squad total, pilot-adjusted final)

## 2. Defensive BV (Per Trooper)

- [ ] 2.1 armorBV = armorPoints × 2.5 × armorTypeMultiplier
- [ ] 2.2 Armor type multipliers: Standard 1.0, Stealth 1.5, Mimetic 1.5, Reactive 1.3, Reflective 1.3, Fire-Resistant 1.1
- [ ] 2.3 moveBV = groundMP × classMultiplier where classMultiplier = {PA(L) 0.5, Light 0.5, Medium 0.75, Heavy 1.0, Assault 1.5}
- [ ] 2.4 jumpBV = jumpMP × 0.5 (uniform)
- [ ] 2.5 antiMechBonus = 5 BV if Magnetic Clamps present
- [ ] 2.6 defensiveBV = armorBV + moveBV + jumpBV + antiMechBonus

## 3. Offensive BV (Per Trooper)

- [ ] 3.1 weaponBV from resolver (same catalog as mech)
- [ ] 3.2 ammoBV from resolver
- [ ] 3.3 manipulatorBV: Vibro-Claw 3, Heavy Claw 2, Battle Claw 1, others 0
- [ ] 3.4 offensiveBV = weaponBV + ammoBV + manipulatorBV

## 4. Trooper BV and Squad Scaling

- [ ] 4.1 trooperBV = offensiveBV + defensiveBV
- [ ] 4.2 squadBV = trooperBV × squadSize
- [ ] 4.3 Apply pilot skill multiplier

## 5. Stealth / Mimetic Armor Bonus

- [ ] 5.1 Mimetic grants +1 target-movement modifier (documented in combat spec, not BV)
- [ ] 5.2 BV armor type multiplier already captures the defensive premium
- [ ] 5.3 No double-counting

## 6. Parity Harness

- [ ] 6.1 Extend validation harness to load BA canonical units
- [ ] 6.2 Compare against MegaMekLab BA BV values
- [ ] 6.3 Emit `validation-output/battle-armor-bv-validation-report.json`

## 7. Status Bar

- [ ] 7.1 Add or extend a BA status bar to show trooper BV and squad BV
- [ ] 7.2 Breakdown dialog accessible

## 8. Validation

- [ ] 8.1 `openspec validate add-battlearmor-battle-value --strict`
- [ ] 8.2 Unit tests: Elemental, Cavalier, Sylph, IS Standard, Gnome
- [ ] 8.3 Build + lint clean
