# Change: Add Chassis and Enhancement Sections to Structure Tab

## Why
The Structure tab was missing key configuration options that MegaMekLab provides: editable tonnage, Omni toggle, motive type (Biped/Quad), and movement enhancement selection (MASC/TSM).

## What Changes
- Add Chassis section with:
  - Tonnage spinner (20-100t, step 5)
  - Omni checkbox
  - Motive Type dropdown (Biped, Quad, Tripod, LAM, QuadVee)
  - Enhancement dropdown (None, MASC, TSM with mutual exclusion)
- Update unit state to support:
  - Editable tonnage (with engine rating auto-adjustment)
  - Editable configuration (MechConfiguration)
  - isOmni boolean
  - enhancement field (MovementEnhancementType | null)
- Reorganize Structure tab into three-column layout (Chassis | System Components | Movement)

## Impact
- Affected specs: `customizer-tabs`, `unit-store-architecture`
- Affected code: `StructureTab.tsx`, `unitState.ts`, `useUnitStore.ts`

