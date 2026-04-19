# Tasks: Add Vehicle Battle Value

## 1. Calculator Scaffolding

- [x] 1.1 Create `src/utils/construction/vehicle/vehicleBV.ts`
- [x] 1.2 Export `calculateVehicleBV(unit: IVehicleUnit): IVehicleBVBreakdown`
- [x] 1.3 Wire dispatch in `battleValueCalculations.ts` so vehicle units route to the new calculator
- [x] 1.4 Define `IVehicleBVBreakdown` (defensive, offensive, modifiers, final)

## 2. Defensive BV

- [x] 2.1 Compute armor BV = totalArmor × 2.5 × armorTypeMultiplier
- [x] 2.2 Compute structure BV = totalStructure × 1.5 × structureTypeMultiplier
- [x] 2.3 Sum defensive equipment BV (ECM, AMS, Guardian ECM, CASE, Chaff Pod, etc.) via resolver
- [x] 2.4 Subtract explosive-ammo penalties (same resolver rules as mech)
- [x] 2.5 Defensive factor = 1 + ((TMM × 0.5) / 10) using effective MP
- [x] 2.6 Apply defensive BV = (armor + structure + defEquip − explosive) × defensive factor

## 3. TMM for Vehicle Motive Types

- [x] 3.1 Ground vehicle TMM: from flank MP (same table as mechs)
- [x] 3.2 VTOL: flank MP + 1 (+1 TMM bonus from altitude)
- [x] 3.3 Hover / Hydrofoil / WiGE: +1 TMM bonus when on appropriate terrain; BV uses the flat bonus
- [x] 3.4 Submarine: use depth movement

## 4. Offensive BV

- [x] 4.1 Sum weapon BV via existing resolver (turret weapons use the same BV — no arc penalty at construction)
- [x] 4.2 Sum ammo BV
- [x] 4.3 Add offensive equipment BV (Targeting Computer, C3, ECM active role flags)
- [x] 4.4 Apply turret multiplier: +5% per rotating turret, +2.5% per sponson pair
- [x] 4.5 Apply rear-weapon penalty (0.5× BV) for rear-arc-only weapons on fixed-arc vehicles

## 5. Speed Factor

- [x] 5.1 Use mp = flankMP (round jump bonus 0 for tracked/wheeled/naval/rail)
- [x] 5.2 VTOL: mp = flankMP + max(0, altitudeDelta/2) — altitude delta is 0 at construction
- [x] 5.3 sf = round(pow(1 + (mp − 5)/10, 1.2) × 100) / 100
- [x] 5.4 offensiveBV = offensive × sf

## 6. BAR Armor Scaling for Support Vehicles

- [x] 6.1 When unit is support vehicle and BAR < 10, multiply armor BV by BAR/10
- [x] 6.2 When BAR = 10, no scaling
- [x] 6.3 Unit test: BAR 5 support truck with 20 armor → armor BV = 25

## 7. Final Unit BV

- [x] 7.1 finalBV = (defensiveBV + offensiveBV) × pilotSkillMultiplier
- [x] 7.2 Pilot skill multiplier uses the shared gunnery/piloting table
- [x] 7.3 Store breakdown on `unit.bvBreakdown`

## 8. Vehicle-Specific BV Modifiers

- [x] 8.1 Naval vehicles: +0.1 offensive multiplier when armed with naval gauss / naval laser
- [x] 8.2 VTOL maneuverability: already captured in TMM bonus; no extra factor
- [x] 8.3 Omni vehicle: BV is per pod configuration

## 9. Status Bar

- [x] 9.1 `VehicleStatusBar.tsx` displays live BV, defensive/offensive split, and pilot-skill-adjusted final
- [x] 9.2 Breakdown dialog accessible from status bar

## 10. Parity Harness

- [x] 10.1 Extend `scripts/validate-bv.ts` (or split a vehicle equivalent) to load vehicle canonical units — created `scripts/validate-vehicle-bv.ts`
- [x] 10.2 Ingest MegaMekLab vehicle BV values and diff against computed BV — harness supports MUL/MegaMek BV; no cache exists (see 10.4)
- [x] 10.3 Produce `validation-output/vehicle-bv-validation-report.json` — 1403/1405 computed
- [ ] 10.4 Target ≥ 95% within 5%, ≥ 80% within 1% — **DEFERRED BLOCKER**: no vehicle MUL/MegaMek BV cache exists. Harness emits `mulBV: null` for all units; parity cannot be evaluated until a reference cache is populated.

## 11. Validation

- [x] 11.1 `openspec validate add-vehicle-battle-value --strict`
- [x] 11.2 Unit tests: Demolisher, Manticore, Savannah Master, VTOL Warrior, LRM Carrier
- [x] 11.3 Build + lint clean
