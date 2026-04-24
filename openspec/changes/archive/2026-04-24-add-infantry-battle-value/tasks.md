# Tasks: Add Infantry Battle Value

## 1. Calculator Scaffolding

- [x] 1.1 Create `src/utils/construction/infantry/infantryBV.ts`
- [x] 1.2 Export `calculateInfantryBV(unit: IInfantryUnit): IInfantryBVBreakdown`
- [x] 1.3 Wire dispatch in `battleValueCalculations.ts`
- [x] 1.4 Define `IInfantryBVBreakdown`

## 2. Per-Trooper BV

- [x] 2.1 primaryBV = primaryWeapon.bv / primaryWeapon.damageDivisor
- [x] 2.2 secondaryBV = (secondaryWeapon.bv / secondaryWeapon.damageDivisor) × (1 / ratio) (e.g., 1-per-4 divides by 4)
- [x] 2.3 armorKitBV = armorKit modifier table (Flak 2, Camo 1, Sneak-Camo 3, etc.)
- [x] 2.4 perTrooperBV = primaryBV + secondaryBV + armorKitBV

## 3. Platoon BV

- [x] 3.1 platoonBV = perTrooperBV × totalTroopers × motiveMultiplier
- [x] 3.2 motiveMultiplier: Foot 1.0, Jump 1.1, Motorized 1.05, Mechanized 1.15
- [x] 3.3 If anti-mech training: multiply platoonBV by 1.1
- [x] 3.4 If field gun: add field gun BV (full mech-scale BV + ammo)

## 4. Field Gun BV

- [x] 4.1 Resolve field gun weapon BV via existing equipment resolver
- [x] 4.2 Add ammo BV
- [x] 4.3 Apply speed factor 1.0 (infantry field guns don't move at combat speeds)
- [x] 4.4 Field gun counts only when field gun is present

## 5. Pilot Skill Multiplier

- [x] 5.1 Apply shared gunnery × piloting table
- [x] 5.2 finalBV = platoonBV × pilotMult

## 6. Status Bar

- [x] 6.1 Extend infantry status bar to show perTrooperBV, platoonBV, field gun BV, final
- [x] 6.2 Breakdown dialog with motive / armor / training multipliers

## 7. Parity Harness

- [x] 7.1 Load canonical infantry platoons (Foot, Jump, Motorized, Mechanized samples)
- [~] 7.2 Compare against MegaMekLab BV values — **DEFERRED**: MUL BV cache for conventional infantry platoons not yet seeded under `public/data/units/infantry/`. Mirrors Wave 1 vehicle + aerospace deferral. Harness emits `mulBV: null` for every platoon; swap to JSON index is a one-line change once cache ships.
- [x] 7.3 Emit `validation-output/infantry-bv-validation-report.json`

## 8. Validation

- [x] 8.1 `openspec validate add-infantry-battle-value --strict`
- [x] 8.2 Unit tests: Foot Rifle Platoon, Jump SRM Platoon, Mechanized MG, Field Gun AC/5 platoon
- [x] 8.3 Build + lint clean
