# BV Engine Parity with MegaMek BV 2.0

## Why

Current BV calculations in MekStation are incomplete and inaccurate compared to the canonical MegaMek BV 2.0 implementation. Accuracy analysis reveals:

- **Exact matches**: 0.2% (9 of 4,200 units)
- **Within 1%**: 4.8% (203 units)
- **Within 5%**: 29.8% (1,252 units)
- **More than 10% off**: 65.2% (2,738 units)

This unacceptable accuracy stems from missing or incorrect implementation of 15 critical BV calculation phases that MegaMek implements. The current engine implements approximately 5 of these phases partially, resulting in systematic errors across the entire unit catalog.

**Impact on gameplay**: Inaccurate BV prevents fair force balancing, undermines campaign balance, and breaks compatibility with MegaMek-based communities. Units appear cheaper or more expensive than they should be, distorting tactical decisions and force composition.

**Technical debt**: The current implementation uses hardcoded weapon BV values and incorrect heat efficiency formulas, making it impossible to achieve parity without a complete rewrite.

## What Changes

This change rewrites the BV calculation engine to achieve full MegaMek BV 2.0 parity by implementing all 15 calculation phases:

### 1. Engine BV Multiplier on Structure

**Current**: Structure BV uses flat 1.5 multiplier  
**New**: Structure BV = `internalStructure × 1.5 × structureTypeMultiplier × engineMultiplier`

Engine multipliers:

- Standard Fusion: 1.0
- XL Engine (IS): 0.5
- XL Engine (Clan): 0.75
- Light Engine: 0.75
- XXL Engine: 0.33
- Compact Engine: 1.0

### 2. Defensive Equipment BV

**Current**: Not implemented  
**New**: Add BV for defensive equipment (AMS, ECM, BAP, shields) + AMS ammo (capped at AMS BV)

### 3. Explosive Equipment Penalty with CASE/CASE II Protection

**Current**: Flat penalty per explosive slot  
**New**: Per-location explosive tracking with CASE/CASE II protection rules

- CASE II: No penalty
- CASE: Reduced penalty
- No protection: Full penalty per location

### 4. Stealth/Chameleon TMM Bonuses

**Current**: Not implemented  
**New**: Add +2 TMM for Stealth Armor, +2 TMM for Chameleon LPS (stacks)

### 5. Weapon Sort Order

**Current**: Unsorted  
**New**: Sort weapons for optimal heat allocation:

1. Heatless weapons first
2. By BV descending
3. By heat ascending (ties)

### 6. Weapon BV Modifiers

**Current**: Not implemented  
**New**: Apply equipment modifiers to weapon BV:

- Artemis IV: ×1.2
- Artemis V: ×1.3
- Targeting Computer: ×1.25
- Actuator Enhancement System (AES): ×1.25 per arm

### 7. Ultra AC / Rotary AC / Streak SRM Heat Adjustments

**Current**: Uses catalog heat values  
**New**: BV context heat differs from firing heat:

- Ultra AC: ×2 heat
- Rotary AC: ×6 heat
- Streak SRM: ×0.5 heat

### 8. Ammo BV with Excessive Ammo Rule

**Current**: Simple sum of ammo BV  
**New**: Sum ammo BV by `type:rackSize`, cap at weapon BV (excessive ammo rule)

### 9. Offensive Equipment BV

**Current**: Not implemented  
**New**: Add BV for melee weapons (clubs, hatchets, vibroblades)

### 10. Weight Modifiers

**Current**: Flat tonnage bonus  
**New**: Apply weight modifiers:

- TSM: ×1.5 tonnage bonus
- Industrial TSM: ×1.15 tonnage bonus
- AES: Additional weight bonus

### 11. Offensive Type Modifier

**Current**: Not implemented  
**New**: Industrial Mech: ×0.9 offensive BV

### 12. Cockpit Modifier

**Current**: Not implemented  
**New**: Apply cockpit BV modifiers:

- Small Cockpit: ×0.95
- Torso-Mounted Cockpit: ×0.95
- Interface Cockpit: ×1.3

### 13. Heat Efficiency Formula

**Current**: `heatSinkCapacity` (WRONG)  
**New**: `6 + heatCapacity - moveHeat` (MegaMek formula)

This is the highest-impact fix — affects every unit's offensive BV.

### 14. Gyro BV Contribution

**Current**: Implemented (tonnage × 0.5)  
**New**: Verify correctness, ensure Heavy-Duty gyro uses ×1.0

### 15. Single Final Rounding

**Current**: Unknown (may round intermediates)  
**New**: Accumulate all BV as float, `Math.round()` once at end

## Validation Framework

This change introduces a formal validation framework to ensure and maintain parity:

### Reference Data Source

- MegaMek runtime BV calculations from `public/data/units/index.json`
- Equipment ID normalization (map unit JSON IDs → catalog IDs)

### Accuracy Gates

- **95% of units** within 1% of MegaMek BV
- **99% of units** within 5% of MegaMek BV

### Progressive Convergence

- **Wave 1**: >60% within 5% (foundation)
- **Wave 2**: >85% within 5% (refinement)
- **Wave 3**: ≥95% within 1% (parity achieved)

### Validation Loop

1. Run BV calculation on all 4,200 units
2. Compare against MegaMek reference
3. Generate discrepancy report (console + JSON)
4. Categorize failures (heat tracking, missing ammo, wrong weapon BV, etc.)
5. Fix highest-impact category
6. Repeat until gates pass

### Known Exclusions

Units with unsupported features (allowlist):

- LAMs (Land-Air Mechs)
- Superheavy Mechs (>100 tons)
- Patchwork Armor
- Prototype equipment

## Impact

### Accuracy Improvement

- From 0.2% exact matches → 95% within 1%
- From 29.8% within 5% → 99% within 5%
- Eliminates 65.2% of units with >10% error

### Compatibility

- Full MegaMek BV 2.0 parity enables cross-platform force balancing
- Campaign integration with MegaMek-based communities
- Canonical BV values for all 4,200 units

### Technical Quality

- Equipment catalog becomes single source of truth (1,057 items with `battleValue`)
- Eliminates hardcoded weapon BV maps
- Correct heat efficiency formula fixes systematic offensive BV errors
- Single final rounding matches MegaMek precision

### User Experience

- Accurate force balancing in Force Builder
- Reliable BV comparisons in Unit Comparison tool
- Trustworthy BV values in Compendium
- Campaign balance integrity

## Non-Goals

This change does NOT include:

- Vehicle BV calculations (out of scope)
- Aerospace BV calculations (out of scope)
- Infantry BV calculations (out of scope)
- C3 network BV adjustments (force-level, not unit-level)
- TAG network BV adjustments (force-level, not unit-level)
- Pilot skill BV adjustments (already implemented)

## Files Affected

### New Files

1. `openspec/changes/bv-engine-parity/proposal.md` — This proposal
2. `openspec/changes/bv-engine-parity/specs/battle-value-system/spec.md` — Delta spec
3. `openspec/changes/bv-engine-parity/specs/bv-parity-validation/spec.md` — Validation spec
4. `openspec/changes/bv-engine-parity/tasks.md` — Implementation tasks

### Modified Files

1. `src/services/construction/CalculationService.ts` — BV calculation engine
2. `src/utils/equipment/EquipmentBVResolver.ts` — NEW: Equipment BV/heat resolver
3. `src/utils/validation/BVParityValidator.ts` — NEW: Validation framework
4. `src/__tests__/service/construction/CalculationService.test.ts` — BV tests

## Success Criteria

- [ ] All 15 MegaMek BV phases implemented
- [ ] 95% of units within 1% of MegaMek BV
- [ ] 99% of units within 5% of MegaMek BV
- [ ] Validation report shows category breakdown
- [ ] Equipment catalog is single source of truth for BV/heat
- [ ] All tests pass with LSP diagnostics clean
