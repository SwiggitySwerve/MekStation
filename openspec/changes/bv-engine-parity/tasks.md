# Implementation Tasks

## Wave 0: Foundation & Planning

### Task 0.1: Create OpenSpec Change Artifacts ✓

- [x] Create `proposal.md` with Why/What Changes/Impact sections
- [x] Create delta spec for `battle-value-system` with 15 MegaMek BV phases
- [x] Create new spec for `bv-parity-validation` framework
- [x] Create `tasks.md` with implementation tasks linked to specs
- [x] Validate structure with grep counts (SHALL > 20, Scenario >= 15)

**Spec References**: All specs in `openspec/changes/bv-engine-parity/specs/`

---

## Wave 1: Foundation (Tasks 1-5)

### Task 1.1: Equipment BV/Heat Resolver Module

**Goal**: Create runtime resolver for equipment BV and heat values from catalog.

**Spec References**:

- `battle-value-system/spec.md` → "Equipment Catalog as Single Source of Truth"

**Implementation**:

- [ ] Create `src/utils/equipment/EquipmentBVResolver.ts`
- [ ] Implement `getEquipmentBV(equipmentId: string): number | null`
- [ ] Implement `getEquipmentHeat(equipmentId: string): number | null`
- [ ] Load equipment catalog from `public/data/equipment/official/`
- [ ] Handle equipment ID normalization (e.g., "LRM 20" → "LRM-20")
- [ ] Cache catalog data for performance (1,057 items)
- [ ] Return `null` for unmapped equipment (log warning)

**Tests**:

- [ ] Test BV resolution for common weapons (LRM-20, PPC, AC/20)
- [ ] Test heat resolution for common weapons
- [ ] Test ID normalization variants
- [ ] Test cache performance (catalog loaded once)
- [ ] Test null handling for invalid equipment IDs

**Validation**:

- [ ] LSP diagnostics clean
- [ ] All tests pass
- [ ] Resolver used by subsequent tasks (no hardcoded BV maps)

---

### Task 1.2: Heat Efficiency Formula Fix

**Goal**: Correct heat efficiency formula to match MegaMek.

**Spec References**:

- `battle-value-system/spec.md` → "Heat Efficiency Formula" (MODIFIED)

**Implementation**:

- [ ] Locate current heat efficiency calculation in `CalculationService.ts`
- [ ] Replace with: `heatEfficiency = 6 + heatCapacity - moveHeat`
- [ ] `heatCapacity` = total heat dissipation from heat sinks
- [ ] `moveHeat` = 2 (running movement constant)
- [ ] Remove any usage of raw `heatSinkCapacity`

**Tests**:

- [ ] Test heat efficiency with 10 single heat sinks: `6 + 10 - 2 = 14`
- [ ] Test heat efficiency with 20 double heat sinks: `6 + 40 - 2 = 44`
- [ ] Test heat efficiency with 15 double heat sinks: `6 + 30 - 2 = 34`
- [ ] Verify offensive BV changes for all test units

**Validation**:

- [ ] LSP diagnostics clean
- [ ] All tests pass
- [ ] Run `npm run validate:bv-parity` → expect improvement in heat-tracking category

---

### Task 1.3: Engine BV Multiplier on Structure

**Goal**: Apply engine-specific multipliers to structure BV.

**Spec References**:

- `battle-value-system/spec.md` → "Engine BV Multiplier on Structure" (ADDED)

**Implementation**:

- [ ] Add `getEngineBVMultiplier(engineType: EngineType): number` to `BattleValue.ts`
- [ ] Engine multipliers:
  - Standard Fusion: 1.0
  - XL Engine (IS): 0.5
  - XL Engine (Clan): 0.75
  - Light Engine: 0.75
  - XXL Engine: 0.33
  - Compact Engine: 1.0
- [ ] Update structure BV calculation: `internalStructure × 1.5 × structureTypeMultiplier × engineMultiplier`

**Tests**:

- [ ] Test IS XL Engine: 114 structure → `114 × 1.5 × 1.0 × 0.5 = 85.5`
- [ ] Test Clan XL Engine: 114 structure → `114 × 1.5 × 1.0 × 0.75 = 128.25`
- [ ] Test Standard Fusion: 114 structure → `114 × 1.5 × 1.0 × 1.0 = 171`
- [ ] Test Light Engine: 114 structure → `114 × 1.5 × 1.0 × 0.75 = 128.25`

**Validation**:

- [ ] LSP diagnostics clean
- [ ] All tests pass
- [ ] Run `npm run validate:bv-parity` → expect improvement in engine-multiplier category

---

### Task 1.4: Weapon Sort Order for Heat Allocation

**Goal**: Sort weapons optimally before heat allocation.

**Spec References**:

- `battle-value-system/spec.md` → "Weapon Sort Order for Heat Allocation" (ADDED)

**Implementation**:

- [ ] Create `sortWeaponsForBV(weapons: IWeapon[]): IWeapon[]` in `BattleValue.ts`
- [ ] Sort order:
  1. Heatless weapons first (heat = 0)
  2. By BV descending (highest BV first)
  3. By heat ascending for BV ties (lowest heat breaks ties)
- [ ] Use sorted order in offensive BV calculation

**Tests**:

- [ ] Test sort with mix of heatless and heat-generating weapons
- [ ] Test sort with weapons of same BV but different heat
- [ ] Test sort with weapons of same heat but different BV
- [ ] Verify heatless weapons always appear first

**Validation**:

- [ ] LSP diagnostics clean
- [ ] All tests pass
- [ ] Run `npm run validate:bv-parity` → expect improvement in heat-tracking category

---

### Task 1.5: Single Final Rounding

**Goal**: Accumulate BV as float, round once at end.

**Spec References**:

- `battle-value-system/spec.md` → "Single Final Rounding" (MODIFIED)

**Implementation**:

- [ ] Audit all BV calculations for intermediate rounding
- [ ] Remove any `Math.round()` calls except final BV
- [ ] Ensure defensive BV accumulated as float
- [ ] Ensure offensive BV accumulated as float
- [ ] Final BV: `Math.round(defensiveBV + offensiveBV)`

**Tests**:

- [ ] Test defensive BV 802.2 + offensive BV 908.32 → final 1711
- [ ] Test defensive BV 500.7 + offensive BV 499.8 → final 1001
- [ ] Verify no intermediate rounding in component calculations

**Validation**:

- [ ] LSP diagnostics clean
- [ ] All tests pass
- [ ] Run `npm run validate:bv-parity` → expect improvement in rounding-error category

---

## Wave 2: Refinement (Tasks 2.1-2.5)

### Task 2.1: Ammo BV with Excessive Ammo Rule

**Goal**: Sum ammo BV by weapon type/rack size, cap at weapon BV.

**Spec References**:

- `battle-value-system/spec.md` → "Ammo BV with Excessive Ammo Rule" (ADDED)

**Implementation**:

- [ ] Create `calculateAmmoBV(weapons: IWeapon[], ammo: IAmmo[]): number`
- [ ] Group ammo by `weaponType:rackSize` key (e.g., "LRM:20")
- [ ] Sum ammo BV within each group
- [ ] Cap each group's total at corresponding weapon BV
- [ ] Handle multiple weapon types independently

**Tests**:

- [ ] Test 4 tons LRM-20 ammo (240 BV) capped at LRM-20 weapon BV (181) → 181
- [ ] Test 2 tons LRM-20 ammo (120 BV) under cap → 120
- [ ] Test multiple weapon types (LRM-20 + SRM-6) with independent capping
- [ ] Test ammo without corresponding weapon → 0 BV

**Validation**:

- [ ] LSP diagnostics clean
- [ ] All tests pass
- [ ] Run `npm run validate:bv-parity` → expect improvement in missing-ammo category

---

### Task 2.2: Explosive Equipment Penalty Per Location

**Goal**: Calculate explosive penalties per location with CASE/CASE II rules.

**Spec References**:

- `battle-value-system/spec.md` → "Explosive Equipment Penalty Per Location" (ADDED)

**Implementation**:

- [ ] Create `calculateExplosivePenalty(unit: IBattleMech): number`
- [ ] Iterate over each location (CT, LT, RT, LA, RA, LL, RL, HD)
- [ ] For each location:
  - Count explosive equipment slots
  - Check for CASE II → penalty = 0
  - Check for CASE → reduced penalty
  - No protection → full penalty (15 per slot for most, 1 for Gauss/HVAC/etc.)
- [ ] Sum penalties across all locations

**Tests**:

- [ ] Test location with AC/20 ammo (3 slots) + CASE II → penalty 0
- [ ] Test location with AC/20 ammo (3 slots) + CASE → reduced penalty
- [ ] Test location with AC/20 ammo (3 slots) + no protection → penalty 45
- [ ] Test Gauss Rifle (7 slots) + no protection → penalty 7

**Validation**:

- [ ] LSP diagnostics clean
- [ ] All tests pass
- [ ] Run `npm run validate:bv-parity` → expect improvement in explosive-penalty category

---

### Task 2.3: Weapon BV Modifiers

**Goal**: Apply Artemis/TC/AES modifiers to weapon BV.

**Spec References**:

- `battle-value-system/spec.md` → "Weapon BV Modifiers" (ADDED)

**Implementation**:

- [ ] Create `applyWeaponModifiers(weapon: IWeapon, unit: IBattleMech): number`
- [ ] Check for Artemis IV → multiply by 1.2
- [ ] Check for Artemis V → multiply by 1.3
- [ ] Check for Targeting Computer → multiply by 1.25
- [ ] Check for AES in weapon's arm → multiply by 1.25
- [ ] Stack modifiers multiplicatively

**Tests**:

- [ ] Test weapon with Artemis IV → BV × 1.2
- [ ] Test weapon with TC → BV × 1.25
- [ ] Test weapon with Artemis IV + TC → BV × 1.2 × 1.25 = BV × 1.5
- [ ] Test weapon with AES in arm → BV × 1.25
- [ ] Test weapon with no modifiers → BV × 1.0

**Validation**:

- [ ] LSP diagnostics clean
- [ ] All tests pass
- [ ] Run `npm run validate:bv-parity` → expect improvement in weapon-modifiers category

---

### Task 2.4: Ultra AC / Rotary AC / Streak SRM Heat Adjustments

**Goal**: Apply BV-context heat multipliers for specific weapon types.

**Spec References**:

- `battle-value-system/spec.md` → "Ultra AC / Rotary AC / Streak SRM Heat Adjustments" (ADDED)

**Implementation**:

- [ ] Create `getBVContextHeat(weapon: IWeapon): number`
- [ ] Read base heat from equipment catalog via resolver
- [ ] Apply multipliers:
  - Ultra AC: × 2
  - Rotary AC: × 6
  - Streak SRM: × 0.5
- [ ] Use BV-context heat in offensive BV heat tracking

**Tests**:

- [ ] Test Ultra AC/5 (heat 1) → BV context heat 2
- [ ] Test Rotary AC/5 (heat 1) → BV context heat 6
- [ ] Test Streak SRM-2 (heat 2) → BV context heat 1
- [ ] Test standard AC/20 (heat 7) → BV context heat 7 (no change)

**Validation**:

- [ ] LSP diagnostics clean
- [ ] All tests pass
- [ ] Run `npm run validate:bv-parity` → expect improvement in heat-tracking category

---

### Task 2.5: Defensive Equipment BV

**Goal**: Add BV for AMS, ECM, BAP, shields.

**Spec References**:

- `battle-value-system/spec.md` → "Defensive Equipment BV" (ADDED)

**Implementation**:

- [ ] Create `calculateDefensiveEquipmentBV(unit: IBattleMech): number`
- [ ] Identify defensive equipment: AMS, ECM, BAP, shields
- [ ] Read BV from equipment catalog via resolver
- [ ] Sum defensive equipment BV
- [ ] Add AMS ammo BV (capped at AMS weapon BV)

**Tests**:

- [ ] Test unit with AMS → add AMS BV from catalog
- [ ] Test unit with ECM → add ECM BV from catalog
- [ ] Test unit with BAP → add BAP BV from catalog
- [ ] Test unit with AMS + 1 ton ammo → add AMS BV + capped ammo BV

**Validation**:

- [ ] LSP diagnostics clean
- [ ] All tests pass
- [ ] Run `npm run validate:bv-parity` → expect improvement in defensive-equipment category

---

## Wave 3: Final Parity (Tasks 3.1-3.5)

### Task 3.1: Stealth/Chameleon TMM Bonuses

**Goal**: Add TMM bonuses for Stealth Armor and Chameleon LPS.

**Spec References**:

- `battle-value-system/spec.md` → "Stealth and Chameleon TMM Bonuses" (ADDED)

**Implementation**:

- [ ] Update `calculateDefensiveSpeedFactor()` in `BattleValue.ts`
- [ ] Check for Stealth Armor → add 2 to TMM
- [ ] Check for Chameleon LPS → add 2 to TMM
- [ ] Bonuses stack (Stealth + Chameleon = +4 TMM)
- [ ] Recalculate defensive speed factor with adjusted TMM

**Tests**:

- [ ] Test unit with Stealth Armor → TMM +2
- [ ] Test unit with Chameleon LPS → TMM +2
- [ ] Test unit with both → TMM +4
- [ ] Test unit with neither → TMM unchanged

**Validation**:

- [ ] LSP diagnostics clean
- [ ] All tests pass
- [ ] Run `npm run validate:bv-parity` → expect improvement in speed-factor category

---

### Task 3.2: Offensive Equipment BV

**Goal**: Add BV for melee weapons (clubs, hatchets, vibroblades).

**Spec References**:

- `battle-value-system/spec.md` → "Offensive Equipment BV" (ADDED)

**Implementation**:

- [ ] Create `calculateOffensiveEquipmentBV(unit: IBattleMech): number`
- [ ] Identify offensive equipment: Hatchet, Sword, Club, Vibroblade
- [ ] Read BV from equipment catalog via resolver
- [ ] Sum offensive equipment BV

**Tests**:

- [ ] Test unit with Hatchet → add Hatchet BV from catalog
- [ ] Test unit with Sword → add Sword BV from catalog
- [ ] Test unit with Vibroblade → add Vibroblade BV from catalog
- [ ] Test unit with multiple melee weapons → sum all BV

**Validation**:

- [ ] LSP diagnostics clean
- [ ] All tests pass
- [ ] Run `npm run validate:bv-parity` → expect minor improvement

---

### Task 3.3: Weight Modifiers (TSM/AES)

**Goal**: Apply weight modifiers to tonnage bonus.

**Spec References**:

- `battle-value-system/spec.md` → "Weight Modifiers for Offensive BV" (ADDED)

**Implementation**:

- [ ] Update tonnage bonus calculation in offensive BV
- [ ] Check for TSM → multiply tonnage by 1.5
- [ ] Check for Industrial TSM → multiply tonnage by 1.15
- [ ] Check for AES → add additional weight bonus (per MegaMek rules)

**Tests**:

- [ ] Test 75-ton mech with TSM → tonnage bonus 112.5
- [ ] Test 75-ton mech with Industrial TSM → tonnage bonus 86.25
- [ ] Test 75-ton mech with AES → tonnage bonus 75 + AES bonus
- [ ] Test 75-ton mech with no modifiers → tonnage bonus 75

**Validation**:

- [ ] LSP diagnostics clean
- [ ] All tests pass
- [ ] Run `npm run validate:bv-parity` → expect improvement in weight-bonus category

---

### Task 3.4: Cockpit and Offensive Type Modifiers

**Goal**: Apply cockpit and Industrial Mech modifiers to final BV.

**Spec References**:

- `battle-value-system/spec.md` → "Cockpit BV Modifier" (ADDED)
- `battle-value-system/spec.md` → "Offensive Type Modifier" (ADDED)

**Implementation**:

- [ ] Add `getCockpitModifier(cockpitType: CockpitType): number`
  - Small Cockpit: 0.95
  - Torso-Mounted Cockpit: 0.95
  - Interface Cockpit: 1.3
  - Standard: 1.0
- [ ] Add `getOffensiveTypeModifier(mechType: MechType): number`
  - Industrial Mech: 0.9
  - BattleMech: 1.0
- [ ] Apply modifiers to final BV: `finalBV × cockpitModifier × offensiveTypeModifier`

**Tests**:

- [ ] Test Small Cockpit → final BV × 0.95
- [ ] Test Interface Cockpit → final BV × 1.3
- [ ] Test Industrial Mech → offensive BV × 0.9
- [ ] Test BattleMech with Standard Cockpit → no modifiers (× 1.0)

**Validation**:

- [ ] LSP diagnostics clean
- [ ] All tests pass
- [ ] Run `npm run validate:bv-parity` → expect improvement in cockpit-modifier category

---

### Task 3.5: BV Parity Validation Framework

**Goal**: Implement validation framework to measure and track parity.

**Spec References**:

- `bv-parity-validation/spec.md` → All requirements

**Implementation**:

- [ ] Create `src/utils/validation/BVParityValidator.ts`
- [ ] Implement `validateBVParity(): IValidationResult`
- [ ] Load reference BV from `public/data/units/index.json`
- [ ] Calculate BV for all 4,200 units
- [ ] Compare calculated vs reference
- [ ] Categorize discrepancies by root cause
- [ ] Generate console summary report
- [ ] Generate JSON report at `.sisyphus/validation/bv-parity-report.json`
- [ ] Implement accuracy gate checks (95% within 1%, 99% within 5%)
- [ ] Add CLI command: `npm run validate:bv-parity`
- [ ] Add exclusions allowlist for LAMs, Superheavy, Patchwork

**Tests**:

- [ ] Test validation with mock reference data
- [ ] Test percentage error calculation
- [ ] Test discrepancy categorization
- [ ] Test accuracy gate pass/fail logic
- [ ] Test exclusion allowlist filtering
- [ ] Test JSON report structure

**Validation**:

- [ ] LSP diagnostics clean
- [ ] All tests pass
- [ ] Run `npm run validate:bv-parity` → generate full report
- [ ] Verify accuracy gates: ≥95% within 1%, ≥99% within 5%

---

## Post-Implementation

### Task 4.1: Documentation Updates

- [ ] Update `docs/architecture/battle-value-calculation.md` with new formula
- [ ] Document all 15 MegaMek BV phases
- [ ] Add validation framework usage guide
- [ ] Update API documentation for BV calculation functions

### Task 4.2: Performance Optimization

- [ ] Profile BV calculation performance (target <10ms per unit)
- [ ] Optimize equipment catalog loading (cache, lazy load)
- [ ] Optimize validation loop (parallel processing for 4,200 units)

### Task 4.3: CI Integration

- [ ] Add BV parity validation to CI pipeline
- [ ] Fail CI if accuracy gates do not pass
- [ ] Store baseline BV results for regression detection
- [ ] Add regression detection (flag units with >1% BV change)

---

## Success Criteria

- [ ] All 15 MegaMek BV phases implemented
- [ ] Equipment catalog is single source of truth (no hardcoded BV maps)
- [ ] Heat efficiency formula correct: `6 + heatCapacity - moveHeat`
- [ ] Single final rounding (no intermediate rounding)
- [ ] Validation framework operational
- [ ] Accuracy gates achieved:
  - ≥95% of units within 1% of MegaMek BV
  - ≥99% of units within 5% of MegaMek BV
- [ ] All tests pass (unit + integration)
- [ ] LSP diagnostics clean on all modified files
- [ ] Documentation complete
- [ ] CI integration complete with regression detection
