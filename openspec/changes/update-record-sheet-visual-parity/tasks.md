# Tasks: Update Record Sheet Visual Parity

## 1. Biped Configuration - Fix mm-data Rendering

Each component must be fixed and verified before moving to the next.

### 1.1 Template Base
- [ ] 1.1.1 Verify template fetches from CDN path: `/record-sheets/templates_us/mek_biped_default.svg`
- [ ] 1.1.2 Verify SVG parses correctly (no parsererror)
- [ ] 1.1.3 Verify viewBox and dimensions are correct after margin adjustment
- [ ] 1.1.4 Verify base outline/silhouette renders to canvas
- [ ] 1.1.5 Compare: Template outline matches previous embedded version

### 1.2 Text Fields
- [ ] 1.2.1 Verify `type` element receives chassis/model name
- [ ] 1.2.2 Verify `tonnage` element receives tonnage value
- [ ] 1.2.3 Verify `techBase` element receives tech base
- [ ] 1.2.4 Verify `bv` element receives Battle Value
- [ ] 1.2.5 Verify `mpWalk`, `mpRun`, `mpJump` receive movement values
- [ ] 1.2.6 Verify `armorType`, `structureType` receive correct values
- [ ] 1.2.7 Verify `hsType`, `hsCount` receive heat sink values
- [ ] 1.2.8 Compare: All text fields match expected positioning/styling

### 1.3 Armor Pips (Pre-made SVGs)
- [ ] 1.3.1 Verify pip SVG files fetch from `/record-sheets/biped_pips/Armor_*.svg`
- [ ] 1.3.2 Verify `canonArmorPips` group is found in template
- [ ] 1.3.3 Verify pip paths are extracted from `<switch><g>` structure
- [ ] 1.3.4 Verify paths are inserted into template without double-transform
- [ ] 1.3.5 Verify HEAD armor pips display at correct position
- [ ] 1.3.6 Verify CT/CTR armor pips display correctly
- [ ] 1.3.7 Verify LT/LTR and RT/RTR armor pips display correctly
- [ ] 1.3.8 Verify LA, RA arm armor pips display correctly
- [ ] 1.3.9 Verify LL, RL leg armor pips display correctly
- [ ] 1.3.10 Verify armor text labels (`textArmor_*`) show point values
- [ ] 1.3.11 Compare: Armor diagram matches previous embedded version

### 1.4 Structure Pips (Pre-made SVGs)
- [ ] 1.4.1 Verify structure pip SVGs fetch from `/record-sheets/biped_pips/BipedIS*.svg`
- [ ] 1.4.2 Verify `canonStructurePips` or appropriate group is found
- [ ] 1.4.3 Verify structure paths inserted correctly for each location
- [ ] 1.4.4 Verify structure text labels (`textIS_*`) show point values
- [ ] 1.4.5 Compare: Structure diagram matches previous embedded version

### 1.5 Equipment Table
- [ ] 1.5.1 Verify `inventory` element is found in template
- [ ] 1.5.2 Verify equipment rows render with correct columns (Qty, Type, Loc, Heat, etc.)
- [ ] 1.5.3 Verify weapon damage codes render correctly
- [ ] 1.5.4 Verify ammo entries show shot counts
- [ ] 1.5.5 Verify table doesn't overflow bounds
- [ ] 1.5.6 Compare: Equipment table matches expected layout

### 1.6 Critical Slots
- [ ] 1.6.1 Verify `crits_*` rect elements are found for each location
- [ ] 1.6.2 Verify slot entries render with correct numbering (1-6, gap, 7-12)
- [ ] 1.6.3 Verify multi-slot equipment brackets render
- [ ] 1.6.4 Verify system components styled correctly (bold/normal)
- [ ] 1.6.5 Verify empty slots show "-Empty-" in grey
- [ ] 1.6.6 Compare: Critical slots match expected layout

### 1.7 Canvas Output
- [ ] 1.7.1 Verify final SVG serializes correctly
- [ ] 1.7.2 Verify canvas renders at correct DPI (20x multiplier)
- [ ] 1.7.3 Verify image quality is crisp (no blur or artifacts)
- [ ] 1.7.4 Compare: Full sheet matches previous embedded version

### 1.8 Biped Sign-off
- [ ] 1.8.1 All components render correctly for 20t biped
- [ ] 1.8.2 All components render correctly for 50t biped
- [ ] 1.8.3 All components render correctly for 100t biped
- [ ] 1.8.4 PDF export works correctly
- [ ] 1.8.5 Document any differences from previous version with rationale

## 2. Quad Configuration

### 2.1 Template and Text
- [ ] 2.1.1 Verify quad template loads from `/record-sheets/templates_us/mek_quad_default.svg`
- [ ] 2.1.2 Verify all text fields render correctly

### 2.2 Armor Pips (Dynamic Generation)
- [ ] 2.2.1 Verify ArmorPipLayout generates pips for quad locations
- [ ] 2.2.2 Verify FLL, FRL, RLL, RRL locations render correctly
- [ ] 2.2.3 Verify torso locations (CT, LT, RT + rear) render correctly
- [ ] 2.2.4 Verify armor text labels display correctly

### 2.3 Structure Pips
- [ ] 2.3.1 Verify structure pips generate for quad locations
- [ ] 2.3.2 Verify structure text labels display correctly

### 2.4 Equipment and Criticals
- [ ] 2.4.1 Verify equipment table renders correctly
- [ ] 2.4.2 Verify critical slots render for quad locations (8 locations)

### 2.5 Quad Sign-off
- [ ] 2.5.1 Full sheet renders correctly
- [ ] 2.5.2 PDF export works correctly

## 3. QuadVee Configuration

### 3.1 All Components
- [ ] 3.1.1 Verify QuadVee template loads
- [ ] 3.1.2 Verify mode indicator area present
- [ ] 3.1.3 Verify all rendering (same as Quad + mode indicator)

### 3.2 QuadVee Sign-off
- [ ] 3.2.1 Full sheet renders correctly
- [ ] 3.2.2 PDF export works correctly

## 4. LAM Configuration

### 4.1 All Components
- [ ] 4.1.1 Verify LAM template loads
- [ ] 4.1.2 Verify mode indicator area present
- [ ] 4.1.3 Verify armor/structure pips (biped locations)
- [ ] 4.1.4 Verify equipment and criticals render

### 4.2 LAM Sign-off
- [ ] 4.2.1 Full sheet renders correctly
- [ ] 4.2.2 PDF export works correctly

## 5. Tripod Configuration

### 5.1 Template and Locations
- [ ] 5.1.1 Verify Tripod template loads
- [ ] 5.1.2 Verify all 9 locations render (including CENTER_LEG)

### 5.2 Armor and Structure
- [ ] 5.2.1 Verify armor pips for all 9 locations
- [ ] 5.2.2 Verify CENTER_LEG armor renders correctly
- [ ] 5.2.3 Verify structure pips for all 9 locations

### 5.3 Equipment and Criticals
- [ ] 5.3.1 Verify equipment table renders
- [ ] 5.3.2 Verify critical slots for all 9 locations

### 5.4 Tripod Sign-off
- [ ] 5.4.1 Full sheet renders correctly
- [ ] 5.4.2 PDF export works correctly

## 6. A-B Comparison Framework (After Rendering Fixed)

- [ ] 6.1 Create reference output directory `test-fixtures/record-sheets/reference/`
- [ ] 6.2 Capture MegaMekLab reference images for each configuration
- [ ] 6.3 Create A-B comparison component for development testing
- [ ] 6.4 Add comparison route `/debug/record-sheet-compare`

## 7. Final Validation

- [ ] 7.1 All 5 configurations render correctly
- [ ] 7.2 PDF export works for all configurations
- [ ] 7.3 No regressions from previous embedded version
- [ ] 7.4 Update documentation if needed

## Dependencies

- Phase 1 (Biped) must complete before other configurations
- Biped uses pre-made pip SVGs from mm-data
- Phases 2-5 use ArmorPipLayout for dynamic pip generation
- Phase 6 (A-B comparison) can be done after Phase 1 is stable

## Notes

- "Compare" tasks require visual inspection against previous working version
- Issues found should be fixed before proceeding to next component
- Document any intentional differences from MegaMekLab
