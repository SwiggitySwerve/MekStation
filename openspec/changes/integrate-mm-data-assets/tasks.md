# Tasks: Integrate mm-data Assets

## Phase 1: Asset Infrastructure [Week 1]

### 1.1 Create Asset Sync Script
- [x] Create `scripts/sync-mm-data-assets.sh`
- [x] Support detecting sibling mm-data repo path
- [x] Copy templates_us and templates_iso directories
- [x] Copy biped_pips directory (full replacement)
- [x] Create quad_pips directory structure if exists in mm-data
- [x] Add npm script: `npm run sync:mm-data`
- [x] **Verify**: Script runs successfully and copies all assets

### 1.2 Add All Record Sheet Templates
- [x] Copy `mek_biped_default.svg` → `public/record-sheets/templates_us/`
- [x] Copy `mek_quad_default.svg` → `public/record-sheets/templates_us/`
- [x] Copy `mek_tripod_default.svg` → `public/record-sheets/templates_us/`
- [x] Copy `mek_lam_default.svg` → `public/record-sheets/templates_us/`
- [x] Copy `mek_quadvee_default.svg` → `public/record-sheets/templates_us/`
- [x] Copy ISO equivalents to `public/record-sheets/templates_iso/`
- [x] **Verify**: All template files accessible via browser at `/record-sheets/templates_us/{name}.svg`

### 1.3 Create MmDataAssetService
- [x] Create `src/services/assets/MmDataAssetService.ts`
- [x] Implement `getArmorPipSvg(location, count, isRear)` method
- [x] Implement `getStructurePipSvg(tonnage, location)` method
- [x] Implement `getRecordSheetTemplate(config, paperSize)` method
- [x] Add SVG parsing and caching logic
- [x] Add location code mapping (MechLocation → mm-data string)
- [ ] **Verify**: Unit tests pass for loading biped pips

## Phase 2: MegaMek Classic Armor Diagram [Week 2]

### 2.1 Analyze mm-data Template Structure
- [ ] Extract pip positioning from `mek_biped_default.svg`
- [ ] Document coordinate system and viewBox dimensions
- [ ] Map element IDs to MechLocation enum values
- [ ] Extract location bounds for click targets
- [ ] **Verify**: LocationBounds.ts has accurate coordinates for all 8 biped locations

### 2.2 Create Location Bounds Configuration
- [x] Create `src/components/customizer/armor/shared/LocationBounds.ts`
- [x] Define `BipedLocationBounds` with x, y, width, height for each location
- [x] Define `QuadLocationBounds` for quad mechs
- [x] Define `TripodLocationBounds` for tripod mechs
- [x] Define `LAMLocationBounds` for LAM mechs
- [x] Define `QuadVeeLocationBounds` for QuadVee mechs
- [ ] **Verify**: Bounds render correctly when visualized as debug overlay

### 2.3 Implement MegaMekClassicDiagram Component
- [ ] Create `src/components/customizer/armor/variants/MegaMekClassicDiagram.tsx`
- [ ] Implement base layout matching mm-data template proportions
- [ ] Add pip loading via MmDataAssetService
- [ ] Render pips at correct positions for each location
- [ ] Add invisible click target overlays
- [ ] Implement hover state styling
- [ ] Implement selected state styling
- [ ] Add armor value labels
- [ ] **Verify**: Diagram displays correctly for 50-ton biped with sample armor values

### 2.4 Register Variant in Settings
- [x] Add `'megamek-classic'` to ArmorDiagramVariant enum
- [x] Add variant definition in ArmorDiagramPreview.tsx and ArmorDiagramQuickSettings.tsx
- [x] Add to variant selector dropdown
- [ ] Set as default variant
- [ ] **Verify**: Variant selectable in Settings and persists

## Phase 3: Record Sheet Template Expansion [Week 3]

### 3.1 Refactor RecordSheetService for Multi-Config Support
- [x] Extract template path selection to helper function
- [x] Map MechConfiguration to template filename
- [x] Support paper size selection (US Letter vs A4)
- [x] Load correct template based on unit configuration
- [ ] **Verify**: Service loads biped template for biped units

### 3.2 Implement Quad Mech Record Sheets
- [x] Fix quad leg slot counts: 12 → 6 slots per leg
- [x] Add quad leg locations to extractCriticals and extractArmor
- [x] Add fixed slot content for quad leg actuators
- [ ] Identify element IDs in `mek_quad_default.svg` template
- [ ] Add QUAD_PIP_GROUP_IDS mapping to SVGRecordSheetRenderer
- [ ] Test armor pip loading for quad configurations
- [ ] **Verify**: PDF export works for quad mech unit

### 3.3 Implement Tripod Mech Record Sheets
- [x] Add tripod locations to getCriticalLocationsForMechType
- [x] Add fixed slot content for tripod center leg actuators
- [ ] Identify element IDs in `mek_tripod_default.svg` template
- [ ] Add TRIPOD_PIP_GROUP_IDS mapping to SVGRecordSheetRenderer
- [ ] Update pip injection for center leg location
- [ ] **Verify**: PDF export works for tripod mech unit

### 3.4 Implement LAM Record Sheets
- [ ] Identify element IDs in `mek_lam_default.svg` template
- [ ] Add LAM_PIP_GROUP_IDS mapping (uses biped locations)
- [ ] Handle mode display (Mech/AirMech/Fighter)
- [ ] Update armor mapping for fighter mode
- [ ] **Verify**: PDF export works for LAM unit

### 3.5 Implement QuadVee Record Sheets
- [x] Fix QuadVee leg slot counts: 12 → 6 slots per leg
- [x] Update validation rules with correct max slots (66)
- [ ] Identify element IDs in `mek_quadvee_default.svg` template
- [ ] Add QUADVEE_PIP_GROUP_IDS mapping
- [ ] Handle mode display (Mech/Vehicle)
- [ ] Update armor/equipment display per mode
- [ ] **Verify**: PDF export works for QuadVee unit

## Phase 4: Armor Diagram for All Configurations [Week 4]

### 4.1 Quad MegaMek Classic Diagram
- [ ] Extract pip positions from quad template
- [ ] Update MegaMekClassicDiagram to handle QUAD configuration
- [ ] Render 4-legged layout with correct pip positions
- [ ] Test click targets for quad locations
- [ ] **Verify**: Quad armor diagram works in customizer

### 4.2 Tripod MegaMek Classic Diagram
- [ ] Extract pip positions from tripod template
- [ ] Update MegaMekClassicDiagram to handle TRIPOD configuration
- [ ] Add center leg rendering
- [ ] Test click targets for 9 locations
- [ ] **Verify**: Tripod armor diagram works in customizer

### 4.3 LAM MegaMek Classic Diagram
- [ ] Update LAM diagram to use MegaMek Classic pips
- [ ] Maintain mode toggle functionality
- [ ] Update fighter mode armor mapping
- [ ] **Verify**: LAM armor diagram with mode toggle works

### 4.4 QuadVee MegaMek Classic Diagram
- [ ] Update QuadVee diagram to use MegaMek Classic pips
- [ ] Maintain mode toggle functionality
- [ ] Update vehicle mode display
- [ ] **Verify**: QuadVee armor diagram with mode toggle works

## Phase 5: Polish and Integration [Week 5]

### 5.0 ArmorPipLayout Algorithm Port
- [x] Port MegaMekLab's ArmorPipLayout.java to TypeScript
- [x] Implement Bounds class for rectangle math
- [x] Implement shape-aware pip layout algorithm
- [x] Add gap support via mml-gap style attribute
- [x] Add multi-section layout support
- [x] Integrate ArmorPipLayout into SVGRecordSheetRenderer
- [x] Remove old simple grid-based pip generation
- [x] **Verify**: Pips generate correctly for all mech configurations

### 5.1 Preview Tab Fixes
- [x] Verify loadout tray hidden on Preview tab (already done)
- [x] Ensure Preview tab uses correct template per configuration
- [x] Create centralized useUnitValidation hook with categories and contexts
- [x] Add validation warnings banner using usePreviewValidation hook
- [x] Show errors (red) vs warnings (yellow) with severity styling
- [x] Include fix suggestions in validation messages
- [ ] Test zoom controls work with all templates
- [ ] **Verify**: Preview tab shows correct record sheet for each config

### 5.1b Fix Non-Biped Critical Slots and Armor Locations
- [x] Update extractCriticals to be configuration-aware
- [x] Add getCriticalLocationsForMechType helper method
- [x] Update LOCATION_ABBREVIATIONS and LOCATION_NAMES to include all mech locations
- [x] Add fixed slot content for quad leg actuators (FLL, FRL, RLL, RRL)
- [x] Add fixed slot content for tripod center leg (CL)
- [x] Fix quad leg slot counts: 12 → 6 (all legs have 6 slots)
- [x] Update validation rules with correct slot math (90 → 66 for quad/quadvee)
- [x] Update all related tests and comments
- [ ] Test critical slots render correctly for quad mechs
- [ ] Test critical slots render correctly for tripod mechs
- [ ] **Verify**: All leg locations appear in PDF preview for non-biped configs

### 5.1c LAM Record Sheet Support
- [ ] Identify element IDs in `mek_lam_default.svg` template
- [ ] Add LAM-specific pip group ID mappings to SVGRecordSheetRenderer
- [ ] Verify LAM uses biped locations (HEAD, CT, LT, RT, LA, RA, LL, RL)
- [ ] Add LAM mode indicator text field (Mech/AirMech/Fighter)
- [ ] Test PDF preview for LAM mech
- [ ] **Verify**: LAM record sheet renders correctly with all pips and critical slots

### 5.1d Tripod Record Sheet Support
- [ ] Identify element IDs in `mek_tripod_default.svg` template
- [ ] Add TRIPOD_PIP_GROUP_IDS and TRIPOD_STRUCTURE_PIP_GROUP_IDS to SVGRecordSheetRenderer
- [ ] Map center leg (CL) location to correct template group
- [ ] Verify tripod has 9 armor/structure locations (HEAD, CT, LT, RT, LA, RA, CL + rear torsos)
- [ ] Test PDF preview for tripod mech
- [ ] **Verify**: Tripod record sheet renders correctly with center leg

### 5.1e QuadVee Record Sheet Support
- [ ] Identify element IDs in `mek_quadvee_default.svg` template
- [ ] Add QUADVEE_PIP_GROUP_IDS and QUADVEE_STRUCTURE_PIP_GROUP_IDS to SVGRecordSheetRenderer
- [ ] Verify QuadVee uses quad locations (FLL, FRL, RLL, RRL)
- [ ] Add conversion equipment display in leg slots
- [ ] Add QuadVee mode indicator text field (Mech/Vehicle)
- [ ] Test PDF preview for QuadVee mech
- [ ] **Verify**: QuadVee record sheet renders correctly with all quad legs

### 5.2 Documentation Update
- [ ] Update armor-diagram spec with MegaMek Classic variant
- [ ] Update record-sheet-export spec with multi-config support
- [ ] Document mm-data sync process in CONTRIBUTING.md
- [ ] **Verify**: Specs pass `openspec validate` check

### 5.3 Integration Testing
- [ ] Test biped mech end-to-end (create, armor, preview, export)
- [ ] Test quad mech end-to-end
- [ ] Test tripod mech end-to-end
- [ ] Test LAM mech end-to-end
- [ ] Test QuadVee mech end-to-end
- [ ] **Verify**: All configuration types work through full workflow

### 5.4 Performance Optimization
- [ ] Profile SVG loading time
- [ ] Implement preloading for active configuration
- [ ] Add loading states for large SVG loads
- [ ] **Verify**: Armor diagram loads in <500ms

## Completion Criteria

### Biped Support (Complete)
- [x] Biped armor diagram works with MegaMek Classic variant
- [x] Biped PDF record sheet renders with dynamic pips
- [x] Biped critical slots render correctly (8 locations)

### Quad Support (In Progress)
- [x] Quad leg slot counts fixed (6 slots each)
- [x] Quad locations added to extractCriticals/extractArmor
- [ ] Quad armor diagram works with MegaMek Classic variant
- [ ] Quad PDF record sheet renders with all 4 leg locations
- [ ] Quad critical slots render correctly (8 locations)

### Tripod Support (Pending)
- [x] Tripod center leg location support in service layer
- [ ] Tripod armor diagram works with MegaMek Classic variant
- [ ] Tripod PDF record sheet renders with center leg
- [ ] Tripod critical slots render correctly (7 locations)

### LAM Support (Pending)
- [ ] LAM armor diagram works with MegaMek Classic variant
- [ ] LAM PDF record sheet renders correctly
- [ ] LAM mode indicator displays (Mech/AirMech/Fighter)

### QuadVee Support (Pending)
- [x] QuadVee leg slot counts fixed (6 slots each)
- [x] QuadVee max slot validation fixed (66 slots)
- [ ] QuadVee armor diagram works with MegaMek Classic variant
- [ ] QuadVee PDF record sheet renders correctly
- [ ] QuadVee mode indicator displays (Mech/Vehicle)

### General
- [ ] MegaMek Classic is the default armor diagram variant
- [x] Existing variants still functional for users who prefer them
- [x] No manual asset copying required for developers (sync script handles it)
- [ ] OpenSpec validation passes for all modified specs
