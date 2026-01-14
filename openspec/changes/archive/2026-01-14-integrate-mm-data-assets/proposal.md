# Proposal: Integrate mm-data Assets

## Summary

Refactor MekStation to use assets from the official `mm-data` distribution rather than maintaining copied/custom assets. This aligns MekStation with how MegaMekLab handles assets, ensuring visual parity and easier updates.

## Background

Currently, MekStation has:
1. **Custom armor diagrams** - Hand-coded SVG components in `src/components/customizer/armor/variants/` that generate armor visualizations programmatically
2. **Partial mm-data copies** - Some assets in `public/record-sheets/biped_pips/` copied from mm-data for PDF record sheet generation
3. **Custom PDF templates** - Only `mek_biped_default.svg` template present in `public/record-sheets/templates/`

The official mm-data repository (`../mm-data/data/images/`) contains:
- **Record sheet templates** - Complete SVG templates for all unit types (biped, quad, tripod, LAM, etc.)
- **Armor pip SVGs** - Pre-rendered armor circles by location and count (`Armor_CT_10_Humanoid.svg`)
- **Internal structure pip SVGs** - Pre-rendered structure pips by tonnage (`BipedIS50_CT.svg`)
- **Era emblems and other decorative assets**

## Goals

1. **Visual Parity with MegaMekLab** - Armor diagrams and record sheets should look identical to MegaMekLab output
2. **Single Source of Truth** - Reference mm-data assets directly or via build-time sync, eliminating drift
3. **Complete Unit Support** - All mech configurations (Biped, Quad, Tripod, LAM, QuadVee) use proper templates
4. **Reduced Code Complexity** - Replace programmatic SVG generation with asset loading and compositing

## Scope

### In Scope
1. **Armor Diagram Overhaul** - New "MegaMek Classic" variant that renders using mm-data pip SVGs
2. **Record Sheet Template Integration** - Use all mm-data templates (not just biped)
3. **Asset Distribution Strategy** - Decide between npm package, git submodule, or symlink approach
4. **Build-time Asset Sync** - Script to sync/update assets from mm-data repo

### Out of Scope
- Modifying mm-data repository itself
- Game-time damage tracking (only construction-time display)
- Non-mech unit types (vehicles, battle armor, aerospace) - future work

## Impact Analysis

### Files Affected
- `src/components/customizer/armor/variants/*.tsx` - Replace or add new variant
- `src/components/customizer/armor/shared/MechSilhouette.tsx` - Update to use real silhouettes
- `src/services/printing/RecordSheetService.ts` - Update template loading for all configs
- `public/record-sheets/` - Add all required templates and pips
- `package.json` - Add asset sync scripts

### Dependencies
- `armor-diagram` spec - MODIFIED (add MegaMek Classic variant)
- `armor-diagram-variants` spec - MODIFIED (new variant definition)
- `record-sheet-export` spec - MODIFIED (expand template support)

### Risk Assessment
- **Medium Risk**: Large refactor touching visual components
- **Mitigation**: Keep existing variants functional while adding new "MegaMek Classic" variant
- **Mitigation**: Feature flag to switch between old/new rendering

## Open Questions

1. **Asset Distribution**: Should mm-data be a git submodule, npm package, or copied at build time?
   - **Recommendation**: Build-time sync script that copies from sibling repo path (development) or npm package (production)

2. **Armor Diagram Interactivity**: mm-data pips are static SVGs. How do we make them interactive (clickable locations)?
   - **Recommendation**: Composite approach - use mm-data pips for visual fidelity but overlay with invisible click targets

3. **Variant Coexistence**: Keep all 5 existing variants or consolidate?
   - **Recommendation**: Keep existing variants in Settings, add "MegaMek Classic" as the new default

## Success Criteria

1. Armor diagrams in "MegaMek Classic" mode visually match MegaMekLab's display
2. PDF record sheets render correctly for Biped, Quad, Tripod, LAM, and QuadVee configurations
3. No manual asset copying required - build script handles sync
4. All existing functionality continues to work
