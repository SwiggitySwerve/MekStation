# Change: Add Non-Biped Armor Diagram Variant Support

## Why

The armor diagram variants (Clean Tech, Neon Operator, Tactical HUD, Premium Material, MegaMek) currently only apply styling to the Biped armor diagram. When users select a variant in settings, non-biped configurations (Quad, Tripod, LAM, QuadVee) ignore the selection and render with default styling. This creates an inconsistent user experience.

Additionally, the auto-allocation and maximize armor functions only worked for Biped configuration, failing silently for other configurations.

## What Changes

### Visual Variant Support
- **Create shared VariantLocationRenderer** - New component that renders location SVG content with variant-specific styling (fills, progress rings, LED digits, etc.)
- **Create shared VariantStyles** - Container, header, button, and legend styling per variant
- **Update all non-biped diagrams** - QuadArmorDiagram, TripodArmorDiagram, LAMArmorDiagram, QuadVeeArmorDiagram now use the shared renderer
- **Add MegaMek variant** - Fifth variant with classic shadow/outline style now supported across all configurations

### Auto-Allocation Support
- **Extend IArmorAllocation interface** - Add all non-biped location types (CENTER_LEG, FRONT_LEFT_LEG, etc.)
- **Add config-specific allocation functions** - `calculateQuadArmorAllocation`, `calculateTripodArmorAllocation`
- **Update store methods** - `autoAllocateArmor()` and `maximizeArmor()` now pass configuration

## Impact

- Affected specs: `armor-diagram-variants`
- Affected code:
  - `src/components/customizer/armor/shared/VariantLocationRenderer.tsx` - New file
  - `src/components/customizer/armor/shared/VariantStyles.tsx` - New file
  - `src/components/customizer/armor/variants/QuadArmorDiagram.tsx` - Uses VariantLocation
  - `src/components/customizer/armor/variants/TripodArmorDiagram.tsx` - Uses VariantLocation
  - `src/components/customizer/armor/variants/LAMArmorDiagram.tsx` - Uses VariantLocation
  - `src/components/customizer/armor/variants/QuadVeeArmorDiagram.tsx` - Uses VariantLocation
  - `src/stores/unitState.ts` - Extended IArmorAllocation interface
  - `src/stores/useUnitStore.ts` - Updated allocation methods
  - `src/utils/construction/armorCalculations.ts` - Config-specific allocation functions
  - `src/components/customizer/tabs/ArmorTab.tsx` - Pass configuration to allocation
  - `src/components/customizer/UnitEditorWithRouting.tsx` - Configuration selector support
