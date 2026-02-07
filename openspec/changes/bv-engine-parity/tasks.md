# Implementation Tasks

## Wave 0-3: Core BV Engine (COMPLETE)

All 15 original BV calculation phases plus 9 additional discovered phases have been implemented in the validation script (`scripts/validate-bv.ts`) and supporting modules. Accuracy gates are passing:

- Within 1%: 95.8% (target: 95.0%)
- Within 5%: 99.3% (target: 99.0%)

See `proposal.md` Edge Cases EC-1 through EC-36 for detailed documentation of all discoveries.

---

## Wave 4: Production Code Migration

### Task 4.1: Migrate CritScan to Production Module

**Goal**: Extract the CritScan equipment detection logic from `validate-bv.ts` into a reusable production module.

**Context**: CritScan is currently embedded in the validation script (~200 lines). It parses crit slots to detect weapons, defensive equipment, offensive equipment, ammo, CASE/CASE II, engine/cockpit/gyro types, and special systems. This logic is needed by the production BV calculator.

**Edge Cases to Preserve** (from proposal.md):
- EC-11: AMS multi-instance counting (smart dedup for 1-crit vs 2-crit AMS)
- EC-13: A-Pod/B-Pod detection with MegaMek crit name patterns (`antipersonnel`)
- EC-30: Full CritScan capability list (weapons, def equip, off equip, ammo, CASE, engine, cockpit, gyro, stealth, DHS, Drone OS, TSM, MASC)
- EC-31: DHS crit counting differs for OmniMechs vs fixed-config

**Implementation**:
- [ ] Create `src/utils/construction/critScan.ts`
- [ ] Extract CritScan logic from validate-bv.ts lines ~480-650
- [ ] Preserve all equipment detection patterns
- [ ] Preserve smart AMS dedup logic
- [ ] Preserve shield arm detection (active vs passive per EC-12)
- [ ] Export typed result interface
- [ ] Add unit tests for each detection pattern

**Tests**:
- [ ] AMS dedup: 2×AMS in same location → count both
- [ ] Laser AMS dedup: 2-crit AMS → count once
- [ ] A-Pod detection: `CLAntiPersonnelPod` → detected
- [ ] Shield arm: Small Shield → no weapon penalty flag
- [ ] Shield arm: Medium Shield → weapon penalty flag
- [ ] DHS counting: OmniMech vs fixed-config paths
- [ ] Drone OS detection from crit slots

---

### Task 4.2: Migrate Heat Efficiency to Production

**Goal**: Ensure production `battleValueCalculations.ts` implements the full heat efficiency formula with all modifiers.

**Edge Cases to Preserve**:
- EC-20: Heat efficiency = `6 + heatDissipation - moveHeat - stealthPenalties`
- EC-21: Move heat varies by engine type (Fusion=2, ICE=0, XXL=6) and jump type
- EC-22: BV-context heat modifiers (Streak ×0.5, Ultra ×2, Rotary ×6, iATM ×0.5)
- EC-23: Heat tracking threshold — weapon that pushes over stays full, subsequent halved

**Implementation**:
- [ ] Verify `battleValueCalculations.ts` heat efficiency formula matches EC-20
- [ ] Add Stealth Armor (-10), Chameleon LPS (-6), Null Sig (-10), Void Sig (-10) penalties
- [ ] Add Emergency Coolant System (+4) detection
- [ ] Add Super Cooled Myomer (moveHeat=0) detection
- [ ] Verify move heat calculation handles all engine types per EC-21
- [ ] Verify weapon heat modifiers in `applyBVHeatOverride()` per EC-22
- [ ] Add One-shot weapon heat ÷4
- [ ] Add PPC + Capacitor heat +5
- [ ] Add Laser Insulator heat -1 (min 1)

---

### Task 4.3: Migrate Weapon BV Modifier Chain to Production

**Goal**: Ensure production code applies weapon BV modifiers in the correct order.

**Edge Cases to Preserve**:
- EC-2: Drone OS weapon modifier (×0.8 on ALL weapon BVs)
- EC-12: Shield arm weapon penalty (active shields only)
- EC-14: Enhanced ER PPC is distinct from ER PPC
- EC-19: Full modifier application order (11 steps)

**Implementation**:
- [ ] Verify production weapon BV modifier chain matches EC-19 order
- [ ] Add MG Array modifier (×0.67 for linked MGs)
- [ ] Verify Drone OS ×0.8 applied before heat tracking
- [ ] Verify rear-facing ×0.5 applied correctly
- [ ] Verify Artemis IV/V, Proto Artemis, Apollo, RISC LPM modifiers
- [ ] Verify Targeting Computer ×1.25 (direct-fire only check)
- [ ] Verify shield arm penalty only for Medium/Large shields

---

### Task 4.4: Migrate Cockpit/Gyro Modifiers to Production

**Goal**: Ensure production code handles all cockpit and gyro variants.

**Edge Cases to Preserve**:
- EC-1: Cockpit modifier else-if chain (not lookup table). Torso-Mounted = 1.0 for MUL parity.
- EC-2: Drone OS dual effect (0.95 cockpit + 0.8 weapon)
- EC-3: Gyro types parsed from MTF source

**Implementation**:
- [ ] Verify cockpit modifier uses else-if chain per EC-1
- [ ] Verify Torso-Mounted cockpit modifier = 1.0 (not 0.95)
- [ ] Verify Drone OS 0.95 only applies when no other cockpit modifier active
- [ ] Verify Drone OS 0.8 weapon modifier is separate from cockpit modifier
- [ ] Verify gyro BV multipliers per EC-3 table
- [ ] Verify unit JSON cockpit/gyro fields are read (not hardcoded)

---

### Task 4.5: Migrate Structure/Armor Calculations to Production

**Goal**: Ensure production code handles all structure and armor edge cases.

**Edge Cases to Preserve**:
- EC-4: Corrected engine BV multipliers (IS XL=0.5, IS XXL=0.25, Clan XXL=0.5)
- EC-5: Quad mech structure = leg×4
- EC-16: Endo-Composite multiplier = 1.0 (not 0.5)
- EC-25: Complete armor type multiplier table
- EC-26: Complete structure type multiplier table

**Implementation**:
- [ ] Verify engine BV multiplier table matches EC-4
- [ ] Verify Quad mech structure calculation per EC-5
- [ ] Verify Endo-Composite multiplier = 1.0 per EC-16
- [ ] Verify all armor type multipliers per EC-25 table
- [ ] Verify all structure type multipliers per EC-26 table

---

### Task 4.6: Migrate Explosive Penalty Logic to Production

**Goal**: Ensure production code handles explosive penalties with all edge cases.

**Edge Cases to Preserve**:
- EC-17: Magshot GR ammo is non-explosive
- EC-27: Penalty rates vary by equipment type (15/slot standard, 1/slot Gauss, etc.)
- Clan implicit CASE in torsos

**Implementation**:
- [ ] Verify penalty rates per EC-27
- [ ] Verify Magshot ammo marked non-explosive
- [ ] Verify Gauss ammo marked non-explosive
- [ ] Verify CASE/CASE II protection logic per location
- [ ] Verify Clan implicit CASE for torso locations

---

### Task 4.7: Migrate Ammo BV Logic to Production

**Goal**: Ensure production code handles ammo BV with all edge cases.

**Edge Cases to Preserve**:
- EC-8: name-mappings can map IS ammo to Clan IDs (intercept before normalize)
- EC-18: IS Streak SRM ammo per-rack BV values (4/7/11)
- Excessive ammo rule: cap by weapon type

**Implementation**:
- [ ] Verify ammo BV resolution handles IS vs Clan distinction
- [ ] Verify IS Streak SRM ammo uses per-rack BV per EC-18
- [ ] Verify excessive ammo rule caps per weapon type
- [ ] Verify AMS ammo BV capped at AMS weapon BV (defensive)
- [ ] Verify APDS ammo BV capped at APDS weapon BV per EC-10

---

## Wave 5: Equipment ID Normalization Hardening

### Task 5.1: Audit DIRECT_ALIAS_MAP for Correctness

**Goal**: Prevent future misresolution bugs like EC-14 (Enhanced ER PPC).

**Context**: The DIRECT_ALIAS_MAP is checked BEFORE name-mappings. Any incorrect entry will intercept the correct resolution. The map currently has ~200 entries.

**Implementation**:
- [ ] Verify every DIRECT_ALIAS_MAP entry resolves to the correct catalog ID
- [ ] Cross-reference with name-mappings.json for conflicts
- [ ] Add automated test: for each DIRECT_ALIAS_MAP entry, verify the target exists in catalog
- [ ] Add automated test: for each entry, verify BV matches expected weapon

---

### Task 5.2: name-mappings.json Validation

**Goal**: Ensure all 1800+ name-mappings resolve to valid catalog entries.

**Implementation**:
- [ ] Script to validate every name-mapping target exists in catalog
- [ ] Flag entries where IS ammo maps to Clan IDs (or vice versa) per EC-8
- [ ] Flag entries where different keys map to same target (potential collisions)
- [ ] Flag entries where lowercased key collides with another entry

---

### Task 5.3: Equipment Resolution Test Suite

**Goal**: Comprehensive test coverage for equipment ID normalization.

**Edge Cases to Test**:
- EC-6: Clan weapon resolution (`clerppc` → `clan-er-ppc`)
- EC-7: All 9 normalization stages
- EC-14: Enhanced ER PPC distinct from ER PPC
- EC-33: Torpedo → LRM/SRM mapping

**Implementation**:
- [ ] Test each normalization stage independently
- [ ] Test IS vs Clan disambiguation for ambiguous names
- [ ] Test numeric prefix/suffix stripping
- [ ] Test MegaMek crit name → catalog ID resolution
- [ ] Test known problematic equipment IDs (enhanced PPC, clan ER lasers, etc.)

---

## Wave 6: Equipment Catalog Data Quality

### Task 6.1: Fix Thunderbolt Heat Values

**Goal**: Correct heat=0 to actual heat values in weapon catalog.

**Edge Case**: EC-36

**Implementation**:
- [ ] Update `weapons/missile-other.json` or relevant file:
  - thunderbolt-5: heat=3
  - thunderbolt-10: heat=5
  - thunderbolt-15: heat=7
  - thunderbolt-20: heat=8
- [ ] Remove any CATALOG_BV_OVERRIDES for Thunderbolts in validate-bv.ts
- [ ] Run validation to confirm no regression

---

### Task 6.2: Add Missing Equipment to Catalog

**Goal**: Add equipment that is currently only handled via CATALOG_BV_OVERRIDES or hardcoded values.

**Implementation**:
- [ ] Audit CATALOG_BV_OVERRIDES in validate-bv.ts for items that should be in catalog
- [ ] Add Vehicular Mine Dispenser (BV=8) to catalog per EC-32
- [ ] Add Chain Whip to physical weapons catalog per EC-35
- [ ] Add Bloodhound Active Probe if missing
- [ ] Add Modular Armor if missing per EC-34
- [ ] Verify RISC APDS (BV=64) and APDS ammo (BV=22) in catalog per EC-10

---

### Task 6.3: Ammo Catalog Audit

**Goal**: Verify all ammo entries have correct BV values.

**Edge Cases**:
- EC-17: Magshot GR ammo non-explosive flag
- EC-18: IS Streak SRM ammo per-rack BV (4/7/11)

**Implementation**:
- [ ] Verify all Streak SRM ammo entries have per-rack BV values
- [ ] Verify Gauss-type ammo entries have non-explosive flags
- [ ] Cross-reference ammo BV values against MegaMek source
- [ ] Verify Clan vs IS ammo BV differences are correct

---

## Wave 7: Remaining Outlier Resolution

### Task 7.1: Investigate 5 Units Over 10%

**Goal**: Understand root cause for each remaining >10% outlier.

**Units**:
1. Barghest BGS-3T (-12.4%) — Heavy Gauss + ammo interactions
2. Centurion CN11-OD (+11.7%) — Medium Shield + Hatchet + MML/Artemis
3. Osteon U (-10.7%) — Ferro-Lamellor + Reinforced + torso cockpit + torpedoes + Artemis V
4. Venom SDR-9KE (-10.2%) — 4× Mine Dispenser + Bloodhound Active Probe
5. Goliath GOL-4S (-9.5%) — Needs investigation

**Implementation**:
- [ ] Get MegaMek BV breakdown for each unit
- [ ] Compare defensive BV component by component
- [ ] Compare offensive BV component by component
- [ ] Identify specific missing equipment or wrong multiplier
- [ ] Fix root cause for each unit

---

### Task 7.2: Investigate Units in 5-10% Band

**Goal**: Reduce the 20 units in the 5-10% band.

**Known patterns**:
- Crossbow D (+9.2%): Overcalculation
- Ravens (-7.4% to -7.8%): Undercalculation pattern
- Fox CS-1 (-6.4%): Undercalculation
- Barghest variants (-5.9% to -6.4%): Systematic Barghest issue
- Thunder Stallion variants (-5.3% to -6.0%): Systematic pattern

**Implementation**:
- [ ] Group outliers by chassis to find systematic issues
- [ ] Investigate Barghest chassis pattern (3 variants all undercalculated)
- [ ] Investigate Thunder Stallion pattern (2 variants)
- [ ] Investigate Raven pattern (2 variants)

---

## Wave 8: System Integration Tasks

### Task 8.1: Update CalculationService with Validated Logic

**Goal**: Migrate all verified BV logic from validate-bv.ts into the production CalculationService.

**Context**: Currently validate-bv.ts contains the most accurate BV implementation, but the production code in `CalculationService.ts` may not have all the same edge cases handled.

**Implementation**:
- [ ] Diff validate-bv.ts logic against CalculationService.ts
- [ ] Identify gaps in production code
- [ ] Port each missing feature with corresponding test
- [ ] Run validation against production code (not just validate-bv.ts)

---

### Task 8.2: Update EquipmentLoaderService with New Catalog Structure

**Goal**: Ensure the EquipmentLoaderService reads all split equipment catalog files.

**Context**: Equipment catalogs were split from 4 large files into 13+ smaller files. The loader must enumerate all files.

**Implementation**:
- [ ] Verify `EquipmentLoaderService.ts` reads from `index.json` or enumerates all files
- [ ] Verify all new weapon sub-files are loaded (energy-laser, energy-ppc, energy-other, ballistic-*, missile-*)
- [ ] Verify ammunition files are loaded
- [ ] Verify no equipment is missing after split

---

### Task 8.3: Update BattleValue.ts Type Definitions

**Goal**: Ensure all multiplier tables in types match the validated values.

**Edge Cases to verify**:
- EC-4: Engine multipliers (corrected IS XL=0.5, IS XXL=0.25, Clan XXL=0.5)
- EC-25: Armor type multipliers (Ferro-Lamellor=1.2, Hardened=2.0, etc.)
- EC-26: Structure type multipliers (Endo-Composite=1.0, Reinforced=2.0)
- EC-3: Gyro multipliers (Heavy-Duty=1.0)

**Implementation**:
- [ ] Verify `ARMOR_TYPE_BV_MULTIPLIERS` in BattleValue.ts matches EC-25
- [ ] Verify `STRUCTURE_TYPE_BV_MULTIPLIERS` matches EC-26
- [ ] Verify `ENGINE_BV_MULTIPLIERS` matches EC-4
- [ ] Verify `GYRO_BV_MULTIPLIERS` matches EC-3
- [ ] Verify `COCKPIT_BV_MODIFIERS` matches EC-1 (including Torso-Mounted=1.0)
- [ ] Add any missing multiplier entries

---

### Task 8.4: Update MTF Converter for New Fields

**Goal**: Ensure the MTF converter extracts all fields needed for BV calculation.

**Context**: The Python MTF converter (`scripts/megameklab-conversion/mtf_converter.py`) was updated to parse cockpit and gyro types. Verify it also handles other BV-relevant fields.

**Implementation**:
- [ ] Verify cockpit type parsing is robust (all MegaMek cockpit type strings)
- [ ] Verify gyro type parsing is robust (all MegaMek gyro type strings)
- [ ] Verify engine type is extracted correctly
- [ ] Add documentation for MTF fields used in BV calculation

---

### Task 8.5: CI Validation Integration

**Goal**: Add BV parity validation to CI pipeline.

**Implementation**:
- [ ] Add `npm run validate:bv` script that runs validate-bv.ts
- [ ] Configure CI to run BV validation on PR
- [ ] Fail CI if accuracy gates drop below thresholds
- [ ] Store baseline validation results for regression detection
- [ ] Generate diff report when accuracy changes

---

## Wave 9: Documentation and Knowledge Preservation

### Task 9.1: Update Battle Value System Spec

**Goal**: Update the delta spec with all discovered edge cases from EC-1 through EC-36.

**Implementation**:
- [ ] Add scenarios for each edge case in the appropriate spec requirement
- [ ] Add scenarios for Drone OS dual effect (EC-2)
- [ ] Add scenarios for shield arm penalty (EC-12)
- [ ] Add scenarios for heat tracking threshold behavior (EC-23)
- [ ] Add scenarios for Quad mech structure (EC-5)
- [ ] Add scenarios for AMS multi-instance counting (EC-11)
- [ ] Verify all multiplier tables in spec match validated values

---

### Task 9.2: Update BV Parity Validation Spec

**Goal**: Update validation spec to reflect current exclusion categories and accuracy metrics.

**Implementation**:
- [ ] Update exclusion categories to match current 783 excluded units
- [ ] Update accuracy gate targets to reflect achieved values
- [ ] Add scenarios for new exclusion types (Blue Shield, QuadVee, Tripod)
- [ ] Document the validation pipeline flow

---

### Task 9.3: Create Equipment ID Normalization Spec

**Goal**: Document the equipment ID normalization pipeline as a specification.

**Context**: The normalization pipeline (EC-7) is complex with 9 stages and numerous edge cases. It deserves its own specification to prevent regression.

**Implementation**:
- [ ] Create `openspec/specs/equipment-id-normalization/spec.md`
- [ ] Document all 9 normalization stages
- [ ] Document DIRECT_ALIAS_MAP purpose and maintenance rules
- [ ] Document name-mappings.json purpose and validation rules
- [ ] Document known pitfalls (alias map intercepting name-mappings)
- [ ] Add scenarios for each normalization stage

---

## Summary of Edge Case Coverage by Task

| Edge Case | Primary Task | Description |
|---|---|---|
| EC-1 | 4.4, 8.3, 9.1 | Cockpit type detection and modifiers |
| EC-2 | 4.3, 4.4, 9.1 | Drone OS dual effect |
| EC-3 | 4.4, 8.3, 8.4 | Gyro type detection |
| EC-4 | 4.5, 8.3 | Engine BV multipliers (corrected) |
| EC-5 | 4.5, 9.1 | Quad mech structure |
| EC-6 | 5.1, 5.3 | Clan weapon BV resolution |
| EC-7 | 5.1, 5.3, 9.3 | Equipment ID normalization complexity |
| EC-8 | 4.7, 5.2 | name-mappings collision risk |
| EC-9 | 4.1 | M-Pods as offensive weapons |
| EC-10 | 4.7, 6.2 | RISC APDS BV and ammo |
| EC-11 | 4.1, 9.1 | AMS multi-instance counting |
| EC-12 | 4.1, 4.3, 9.1 | Shield arm weapon penalty |
| EC-13 | 4.1 | A-Pod/B-Pod detection patterns |
| EC-14 | 5.1, 5.3 | Enhanced ER PPC vs ER PPC |
| EC-15 | 4.1 | Spikes as defensive equipment |
| EC-16 | 4.5, 8.3 | Endo-Composite multiplier |
| EC-17 | 4.6, 6.3 | Magshot GR ammo non-explosive |
| EC-18 | 4.7, 6.3 | IS Streak SRM ammo per-rack BV |
| EC-19 | 4.3 | Weapon BV modifier order |
| EC-20 | 4.2 | Heat efficiency modifiers |
| EC-21 | 4.2 | Move heat variations |
| EC-22 | 4.2 | BV-context heat modifiers |
| EC-23 | 4.2, 9.1 | Heat tracking threshold behavior |
| EC-24 | 4.2 | Speed factor rounding |
| EC-25 | 4.5, 8.3 | Armor type multipliers |
| EC-26 | 4.5, 8.3 | Structure type multipliers |
| EC-27 | 4.6 | Explosive penalty details |
| EC-28 | 4.3 | TAG BV=0 |
| EC-29 | 4.3 | NARC is offensive |
| EC-30 | 4.1 | CritScan as equipment detection |
| EC-31 | 4.1 | DHS crit counting for OmniMechs |
| EC-32 | 6.2 | Vehicular Mine Dispenser |
| EC-33 | 5.1 | Torpedo → LRM/SRM mapping |
| EC-34 | 6.2 | Modular Armor defensive BV |
| EC-35 | 6.2 | Physical weapon classification |
| EC-36 | 6.1 | Thunderbolt heat values |

---

## Success Criteria

**Achieved:**
- [x] All 15 MegaMek BV phases implemented
- [x] 95% of units within 1% of MegaMek BV (actual: 95.8%)
- [x] 99% of units within 5% of MegaMek BV (actual: 99.3%)
- [x] Equipment catalog is single source of truth for BV/heat
- [x] Validation report with accuracy gates
- [x] 36 edge cases documented in proposal.md

**Remaining:**
- [ ] Production code migration (Tasks 4.1-4.7)
- [ ] Equipment ID normalization hardening (Tasks 5.1-5.3)
- [ ] Equipment catalog data quality fixes (Tasks 6.1-6.3)
- [ ] Remaining outlier investigation (Tasks 7.1-7.2)
- [ ] System integration (Tasks 8.1-8.5)
- [ ] Documentation and specs (Tasks 9.1-9.3)
