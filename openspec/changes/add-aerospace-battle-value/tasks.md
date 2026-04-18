# Tasks: Add Aerospace Battle Value

## 1. Calculator Scaffolding

- [x] 1.1 Create `src/utils/construction/aerospace/aerospaceBV.ts`
- [x] 1.2 Export `calculateAerospaceBV(unit: IAerospaceUnit): IAerospaceBVBreakdown`
- [x] 1.3 Wire dispatch in `battleValueCalculations.ts`
- [x] 1.4 Define `IAerospaceBVBreakdown`

## 2. Defensive BV

- [x] 2.1 armorBV = totalArmor × 2.5 × armorTypeMultiplier
- [x] 2.2 siBV = structuralIntegrity × 0.5 × tonnage
- [x] 2.3 defEquipBV (ECM, active probe, chaff pod, etc.)
- [x] 2.4 Explosive penalty sum
- [x] 2.5 defensiveFactor = 1 + (maxThrust / 10)
- [x] 2.6 defensiveBV = (armorBV + siBV + defEquipBV − explosive) × defensiveFactor

## 3. Offensive BV

- [x] 3.1 Compute per-arc weapon BV sum (Nose, LeftWing, RightWing, Aft, Fuselage)
- [x] 3.2 Identify the primary arc (highest BV): 100% contribution
- [x] 3.3 Opposite arc: 25%; side arcs: 50%; fuselage: 100%
- [x] 3.4 Sum ammo BV
- [x] 3.5 Add offensive equipment BV (TAG, Targeting Computer, C3, etc.)

## 4. Speed Factor

- [x] 4.1 avgThrust = (safeThrust + maxThrust) / 2
- [x] 4.2 sf = round(pow(1 + (avgThrust − 5) / 10, 1.2) × 100) / 100
- [x] 4.3 Apply sf to offensive BV

## 5. Sub-Type Multipliers

- [x] 5.1 Conventional fighter: final BV × 0.8
- [x] 5.2 Small craft: armor BV × 1.2 inside defensive block
- [x] 5.3 ASF: no adjustment (baseline)

## 6. Pilot Skill Multiplier

- [x] 6.1 Reuse shared gunnery × piloting table
- [x] 6.2 finalBV = (defensiveBV + offensiveBV) × pilotMult

## 7. Small Craft Specifics

- [x] 7.1 Side arcs (LeftSide / RightSide) treated like wings for fire-pool weighting
- [x] 7.2 Passenger / cargo bays have no BV contribution
- [x] 7.3 Bomb bays count as Fuselage slots for BV purposes

## 8. Status Bar

- [x] 8.1 `AerospaceStatusBar.tsx` displays live BV breakdown
- [x] 8.2 Per-arc contribution visible in breakdown dialog

## 9. BV Parity Harness

- [x] 9.1 Extend validation harness to load aerospace canonical units
- [x] 9.2 Compare against MegaMekLab BV values
- [x] 9.3 Emit `validation-output/aerospace-bv-validation-report.json`
- [ ] 9.4 Baseline target: ≥ 90% within 5%, ≥ 75% within 1%

## 10. Validation

- [x] 10.1 `openspec validate add-aerospace-battle-value --strict`
- [x] 10.2 Unit tests: Shilone, Stingray, Sabre, SL-17 Shilone, generic small craft
- [x] 10.3 Build + lint clean
