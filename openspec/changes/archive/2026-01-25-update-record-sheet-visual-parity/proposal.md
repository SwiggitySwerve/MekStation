# Change: Update Record Sheet Visual Parity with MegaMekLab

## Why

After externalizing mm-data assets to CDN (change `externalize-mm-data-assets`), we need to verify that record sheet rendering produces identical output to what worked before. The mm-data SVG assets may have different structure than previously embedded assets, and we need to ensure each rendering component works correctly with the CDN-fetched assets.

Each component of the record sheet must be verified individually:
1. Base template outline and structure
2. Armor pip diagram (pre-made SVGs for biped, dynamic for others)
3. Internal structure pip diagram
4. Equipment/weapons table
5. Critical slot tables
6. Text fields (chassis, tonnage, BV, movement, etc.)

A component-by-component approach ensures:
1. Each piece is verified working before moving to the next
2. Issues are isolated to specific components
3. All mech configurations are covered systematically (Biped first, then Quad, QuadVee, LAM, Tripod)

## What Changes

### Phase 1: Biped Configuration (Primary)
Fix and verify each rendering component for biped mechs:
- **Template loading**: SVG fetches from `/record-sheets/templates_us/mek_biped_default.svg`
- **Armor pips**: Pre-made pip SVGs from `/record-sheets/biped_pips/Armor_*.svg` inserted into `canonArmorPips` group
- **Structure pips**: Pre-made pip SVGs from `/record-sheets/biped_pips/BipedIS*.svg` inserted into template
- **Equipment table**: Renders into `inventory` element with correct columns
- **Critical slots**: Renders into `crits_*` rect elements with proper formatting
- **Text fields**: All ID-based text elements populated correctly

### Phase 2-5: Other Configurations
- Quad (Phase 2): Dynamic pip generation using ArmorPipLayout algorithm
- QuadVee (Phase 3): Same as Quad with mode indicator
- LAM (Phase 4): Biped-like with mode indicator
- Tripod (Phase 5): 9 locations including CENTER_LEG

## Asset Structure Reference

**Template**: `public/record-sheets/templates_us/mek_biped_default.svg`
- Contains `canonArmorPips` group with transform for pip insertion
- Contains `armorPips` group with pip area rects (used by ArmorPipLayout)
- Contains ID-based elements for text: `type`, `tonnage`, `bv`, etc.

**Armor Pips**: `public/record-sheets/biped_pips/Armor_<Location>_<Count>_Humanoid.svg`
- Paths inside `<switch><g>...</g></switch>` structure
- Absolute coordinates designed for 612x792 document
- Transform applied by parent `canonArmorPips` group

**Structure Pips**: `public/record-sheets/biped_pips/BipedIS<Tonnage>_<Location>.svg`
- Similar structure to armor pips

## Impact

- **Affected specs**: `record-sheet-export`
- **Affected code**:
  - `src/services/printing/svgRecordSheetRenderer/armor.ts` - Pip insertion logic
  - `src/services/printing/svgRecordSheetRenderer/structure.ts` - Structure pip insertion
  - `src/services/printing/svgRecordSheetRenderer/template.ts` - Template loading
  - `src/services/printing/svgRecordSheetRenderer/equipment.ts` - Equipment table
  - `src/services/printing/svgRecordSheetRenderer/criticals.ts` - Critical slots
- **Dependencies**: Requires assets from `externalize-mm-data-assets` change
