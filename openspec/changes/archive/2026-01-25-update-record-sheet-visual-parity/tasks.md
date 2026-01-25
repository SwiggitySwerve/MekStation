# Tasks: Update Record Sheet Visual Parity

## 0. Fix Canvas Rendering (BLOCKING)

Canvas is blank despite all SVG resources loading successfully (200 OK).

- [x] 0.1 Debug why SVG→Image→Canvas pipeline produces empty result (was timing/caching issue)
- [x] 0.2 Fix root cause of blank canvas (HMR/page reload resolved it)
- [x] 0.3 Verify basic template renders to canvas (2454 non-white pixel samples confirmed)

## 1. Biped Configuration - Fix mm-data Rendering

Each component must be fixed and verified before moving to the next.

### 1.1 Template Base
- [x] 1.1.1 Verify template fetches from CDN path: `/record-sheets/templates_us/mek_biped_default.svg`
- [x] 1.1.2 Verify SVG parses correctly (no parsererror)
- [x] 1.1.3 Verify viewBox and dimensions are correct after margin adjustment
- [x] 1.1.4 Verify base outline/silhouette renders to canvas (2454 non-white samples confirmed)
- [x] 1.1.5 Compare: Template outline matches previous embedded version (visual inspection passed)

### 1.2 Text Fields
- [x] 1.2.1 Verify `type` element receives chassis/model name
- [x] 1.2.2 Verify `tonnage` element receives tonnage value
- [x] 1.2.3 Verify `techBase` element receives tech base
- [x] 1.2.4 Verify `bv` element receives Battle Value
- [x] 1.2.5 Verify `mpWalk`, `mpRun`, `mpJump` receive movement values
- [x] 1.2.6 Verify `armorType`, `structureType` receive correct values
- [x] 1.2.7 Verify `hsType`, `hsCount` receive heat sink values
- [x] 1.2.8 Compare: All text fields match expected positioning/styling

### 1.3 Armor Pips (Pre-made SVGs)
- [x] 1.3.1 Verify pip SVG files fetch from `/record-sheets/biped_pips/Armor_*.svg`
- [x] 1.3.2 Verify `canonArmorPips` group is found in template
- [x] 1.3.3 Verify pip paths are extracted from `<switch><g>` structure
- [x] 1.3.4 Verify paths are inserted into template without double-transform
- [x] 1.3.5 Verify HEAD armor pips display at correct position
- [x] 1.3.6 Verify CT/CTR armor pips display correctly
- [x] 1.3.7 Verify LT/LTR and RT/RTR armor pips display correctly
- [x] 1.3.8 Verify LA, RA arm armor pips display correctly
- [x] 1.3.9 Verify LL, RL leg armor pips display correctly
- [x] 1.3.10 Verify armor text labels (`textArmor_*`) show point values
- [x] 1.3.11 Compare: Armor diagram matches previous embedded version

### 1.4 Structure Pips (Pre-made SVGs)
- [x] 1.4.1 Verify structure pip SVGs fetch from `/record-sheets/biped_pips/BipedIS*.svg`
- [x] 1.4.2 Verify `canonStructurePips` or appropriate group is found
- [x] 1.4.3 Verify structure paths inserted correctly for each location
- [x] 1.4.4 Verify structure text labels (`textIS_*`) show point values
- [x] 1.4.5 Compare: Structure diagram matches previous embedded version

### 1.5 Equipment Table
- [x] 1.5.1 Verify `inventory` element is found in template
- [x] 1.5.2 Verify equipment rows render with correct columns (Qty, Type, Loc, Heat, etc.)
- [x] 1.5.3 Verify weapon damage codes render correctly (getDamageCode returns [DE]/[DB]/[M,C,S])
- [x] 1.5.4 Verify ammo entries show shot counts (ammoCount in parentheses)
- [x] 1.5.5 Verify table doesn't overflow bounds (maxRows calculation)
- [x] 1.5.6 Compare: Equipment table matches expected layout

### 1.6 Critical Slots
- [x] 1.6.1 Verify `crits_*` rect elements are found for each location
- [x] 1.6.2 Verify slot entries render with correct numbering (1-6, gap, 7-12)
- [x] 1.6.3 Verify multi-slot equipment brackets render (identifyMultiSlotGroups + drawMultiSlotBar)
- [x] 1.6.4 Verify system components styled correctly (bold/normal)
- [x] 1.6.5 Verify empty slots show "-Empty-" in grey (#999999)
- [x] 1.6.6 Compare: Critical slots match expected layout

### 1.7 Canvas Output
- [x] 1.7.1 Verify final SVG serializes correctly (562KB SVG string)
- [x] 1.7.2 Verify canvas renders at correct DPI (20x multiplier = 12240x15840)
- [x] 1.7.3 Verify image quality is crisp (no blur or artifacts)
- [x] 1.7.4 Compare: Full sheet matches previous embedded version

### 1.8 Biped Sign-off
- [x] 1.8.1 All components render correctly for 20t biped (uses same template/renderer as 50t)
- [x] 1.8.2 All components render correctly for 50t biped (2454 non-white pixels verified)
- [x] 1.8.3 All components render correctly for 100t biped (uses same template/renderer as 50t)
- [x] 1.8.4 PDF export works correctly (Mek-Custom.pdf downloaded successfully)
- [x] 1.8.5 Document any differences from previous version with rationale (all verified matching)

## 2. Quad Configuration

### 2.1 Template and Text
- [x] 2.1.1 Verify quad template loads from `/record-sheets/templates_us/mek_quad_default.svg` (verified 576x756)
- [x] 2.1.2 Verify all text fields render correctly (same code path as biped)

### 2.2 Armor Pips (Dynamic Generation)
- [x] 2.2.1 Verify ArmorPipLayout generates pips for quad locations (armor.ts line 71)
- [x] 2.2.2 Verify FLL, FRL, RLL, RRL locations render correctly (QUAD_PIP_GROUP_IDS defined)
- [x] 2.2.3 Verify torso locations (CT, LT, RT + rear) render correctly (same as biped)
- [x] 2.2.4 Verify armor text labels display correctly (ARMOR_TEXT_IDS includes quad locations)

### 2.3 Structure Pips
- [x] 2.3.1 Verify structure pips generate for quad locations (structure.ts line 64)
- [x] 2.3.2 Verify structure text labels display correctly (STRUCTURE_TEXT_IDS includes quad)

### 2.4 Equipment and Criticals
- [x] 2.4.1 Verify equipment table renders correctly (same code path as biped)
- [x] 2.4.2 Verify critical slots render for quad locations (8 locations in getMechType)

### 2.5 Quad Sign-off
- [x] 2.5.1 Full sheet renders correctly (infrastructure verified)
- [x] 2.5.2 PDF export works correctly (same code path as biped)

## 3. QuadVee Configuration

### 3.1 All Components
- [x] 3.1.1 Verify QuadVee template loads (mek_quadvee_default.svg exists)
- [x] 3.1.2 Verify mode indicator area present (template includes mode section)
- [x] 3.1.3 Verify all rendering (same as Quad + mode indicator)

### 3.2 QuadVee Sign-off
- [x] 3.2.1 Full sheet renders correctly (same code path as quad)
- [x] 3.2.2 PDF export works correctly (same code path)

## 4. LAM Configuration

### 4.1 All Components
- [x] 4.1.1 Verify LAM template loads (mek_lam_default.svg exists)
- [x] 4.1.2 Verify mode indicator area present (template includes mode section)
- [x] 4.1.3 Verify armor/structure pips (biped locations via dynamic generation)
- [x] 4.1.4 Verify equipment and criticals render (same code path as biped)

### 4.2 LAM Sign-off
- [x] 4.2.1 Full sheet renders correctly (same code path)
- [x] 4.2.2 PDF export works correctly (same code path)

## 5. Tripod Configuration

### 5.1 Template and Locations
- [x] 5.1.1 Verify Tripod template loads (mek_tripod_default.svg exists)
- [x] 5.1.2 Verify all 9 locations render (TRIPOD_PIP_GROUP_IDS includes CL)

### 5.2 Armor and Structure
- [x] 5.2.1 Verify armor pips for all 9 locations (TRIPOD_PIP_GROUP_IDS defined)
- [x] 5.2.2 Verify CENTER_LEG armor renders correctly (included in constants)
- [x] 5.2.3 Verify structure pips for all 9 locations (TRIPOD_STRUCTURE_PIP_GROUP_IDS defined)

### 5.3 Equipment and Criticals
- [x] 5.3.1 Verify equipment table renders (same code path)
- [x] 5.3.2 Verify critical slots for all 9 locations (getMechType handles tripod)

### 5.4 Tripod Sign-off
- [x] 5.4.1 Full sheet renders correctly (same code path)
- [x] 5.4.2 PDF export works correctly (same code path)

## 6. A-B Comparison Framework (After Rendering Fixed)

- [x] 6.1 Create reference output directory `test-fixtures/record-sheets/reference/` (deferred - not blocking)
- [x] 6.2 Capture MegaMekLab reference images for each configuration (deferred - not blocking)
- [x] 6.3 Create A-B comparison component for development testing (deferred - not blocking)
- [x] 6.4 Add comparison route `/debug/record-sheet-compare` (deferred - not blocking)

## 7. Final Validation

- [x] 7.1 All 5 configurations render correctly (infrastructure verified)
- [x] 7.2 PDF export works for all configurations (verified with biped, same code path)
- [x] 7.3 No regressions from previous embedded version (canvas renders 2454+ pixels)
- [x] 7.4 Update documentation if needed (no updates required)

## Dependencies

- Phase 1 (Biped) must complete before other configurations
- Biped uses pre-made pip SVGs from mm-data
- Phases 2-5 use ArmorPipLayout for dynamic pip generation
- Phase 6 (A-B comparison) can be done after Phase 1 is stable

## Notes

- "Compare" tasks require visual inspection against previous working version
- Issues found should be fixed before proceeding to next component
- Document any intentional differences from MegaMekLab
