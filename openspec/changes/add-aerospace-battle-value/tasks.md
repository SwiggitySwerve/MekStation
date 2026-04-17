# Tasks: Add Aerospace Battle Value

## 1. Calculator Scaffolding

- [ ] 1.1 Create `src/utils/construction/aerospace/aerospaceBV.ts`
- [ ] 1.2 Export `calculateAerospaceBV(unit: IAerospaceUnit): IAerospaceBVBreakdown`
- [ ] 1.3 Wire dispatch in `battleValueCalculations.ts`
- [ ] 1.4 Define `IAerospaceBVBreakdown`

## 2. Defensive BV

- [ ] 2.1 armorBV = totalArmor × 2.5 × armorTypeMultiplier
- [ ] 2.2 siBV = structuralIntegrity × 0.5 × tonnage
- [ ] 2.3 defEquipBV (ECM, active probe, chaff pod, etc.)
- [ ] 2.4 Explosive penalty sum
- [ ] 2.5 defensiveFactor = 1 + (maxThrust / 10)
- [ ] 2.6 defensiveBV = (armorBV + siBV + defEquipBV − explosive) × defensiveFactor

## 3. Offensive BV

- [ ] 3.1 Compute per-arc weapon BV sum (Nose, LeftWing, RightWing, Aft, Fuselage)
- [ ] 3.2 Identify the primary arc (highest BV): 100% contribution
- [ ] 3.3 Opposite arc: 25%; side arcs: 50%; fuselage: 100%
- [ ] 3.4 Sum ammo BV
- [ ] 3.5 Add offensive equipment BV (TAG, Targeting Computer, C3, etc.)

## 4. Speed Factor

- [ ] 4.1 avgThrust = (safeThrust + maxThrust) / 2
- [ ] 4.2 sf = round(pow(1 + (avgThrust − 5) / 10, 1.2) × 100) / 100
- [ ] 4.3 Apply sf to offensive BV

## 5. Sub-Type Multipliers

- [ ] 5.1 Conventional fighter: final BV × 0.8
- [ ] 5.2 Small craft: armor BV × 1.2 inside defensive block
- [ ] 5.3 ASF: no adjustment (baseline)

## 6. Pilot Skill Multiplier

- [ ] 6.1 Reuse shared gunnery × piloting table
- [ ] 6.2 finalBV = (defensiveBV + offensiveBV) × pilotMult

## 7. Small Craft Specifics

- [ ] 7.1 Side arcs (LeftSide / RightSide) treated like wings for fire-pool weighting
- [ ] 7.2 Passenger / cargo bays have no BV contribution
- [ ] 7.3 Bomb bays count as Fuselage slots for BV purposes

## 8. Status Bar

- [ ] 8.1 `AerospaceStatusBar.tsx` displays live BV breakdown
- [ ] 8.2 Per-arc contribution visible in breakdown dialog

## 9. BV Parity Harness

- [ ] 9.1 Extend validation harness to load aerospace canonical units
- [ ] 9.2 Compare against MegaMekLab BV values
- [ ] 9.3 Emit `validation-output/aerospace-bv-validation-report.json`
- [ ] 9.4 Baseline target: ≥ 90% within 5%, ≥ 75% within 1%

## 10. Validation

- [ ] 10.1 `openspec validate add-aerospace-battle-value --strict`
- [ ] 10.2 Unit tests: Shilone, Stingray, Sabre, SL-17 Shilone, generic small craft
- [ ] 10.3 Build + lint clean
