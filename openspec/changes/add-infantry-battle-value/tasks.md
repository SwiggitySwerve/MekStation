# Tasks: Add Infantry Battle Value

## 1. Calculator Scaffolding

- [ ] 1.1 Create `src/utils/construction/infantry/infantryBV.ts`
- [ ] 1.2 Export `calculateInfantryBV(unit: IInfantryUnit): IInfantryBVBreakdown`
- [ ] 1.3 Wire dispatch in `battleValueCalculations.ts`
- [ ] 1.4 Define `IInfantryBVBreakdown`

## 2. Per-Trooper BV

- [ ] 2.1 primaryBV = primaryWeapon.bv / primaryWeapon.damageDivisor
- [ ] 2.2 secondaryBV = (secondaryWeapon.bv / secondaryWeapon.damageDivisor) × (1 / ratio) (e.g., 1-per-4 divides by 4)
- [ ] 2.3 armorKitBV = armorKit modifier table (Flak 2, Camo 1, Sneak-Camo 3, etc.)
- [ ] 2.4 perTrooperBV = primaryBV + secondaryBV + armorKitBV

## 3. Platoon BV

- [ ] 3.1 platoonBV = perTrooperBV × totalTroopers × motiveMultiplier
- [ ] 3.2 motiveMultiplier: Foot 1.0, Jump 1.1, Motorized 1.05, Mechanized 1.15
- [ ] 3.3 If anti-mech training: multiply platoonBV by 1.1
- [ ] 3.4 If field gun: add field gun BV (full mech-scale BV + ammo)

## 4. Field Gun BV

- [ ] 4.1 Resolve field gun weapon BV via existing equipment resolver
- [ ] 4.2 Add ammo BV
- [ ] 4.3 Apply speed factor 1.0 (infantry field guns don't move at combat speeds)
- [ ] 4.4 Field gun counts only when field gun is present

## 5. Pilot Skill Multiplier

- [ ] 5.1 Apply shared gunnery × piloting table
- [ ] 5.2 finalBV = platoonBV × pilotMult

## 6. Status Bar

- [ ] 6.1 Extend infantry status bar to show perTrooperBV, platoonBV, field gun BV, final
- [ ] 6.2 Breakdown dialog with motive / armor / training multipliers

## 7. Parity Harness

- [ ] 7.1 Load canonical infantry platoons (Foot, Jump, Motorized, Mechanized samples)
- [ ] 7.2 Compare against MegaMekLab BV values
- [ ] 7.3 Emit `validation-output/infantry-bv-validation-report.json`

## 8. Validation

- [ ] 8.1 `openspec validate add-infantry-battle-value --strict`
- [ ] 8.2 Unit tests: Foot Rifle Platoon, Jump SRM Platoon, Mechanized MG, Field Gun AC/5 platoon
- [ ] 8.3 Build + lint clean
