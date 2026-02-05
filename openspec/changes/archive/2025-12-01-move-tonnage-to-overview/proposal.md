# Change: Move Tonnage and Motive Type to Overview Tab

## Why

Tonnage and motive type are fundamental unit identity properties that belong with the unit name in the Overview tab, not in the Structure tab which should focus on component selection.

## What Changes

- Add Basic Info section to Overview tab with:
  - Name input field
  - Tonnage spinner (20-100t, step 5)
  - Motive Type dropdown (Biped, Quad, Tripod, LAM, QuadVee)
- Remove tonnage and motive type from Structure tab
- Structure tab now focuses on:
  - Engine, Gyro, Structure, Cockpit selection
  - Enhancement selection (MASC/TSM)
  - Movement configuration (Walk/Run/Jump MP)

## Impact

- Affected specs: `customizer-tabs`
- Affected code: `OverviewTab.tsx`, `StructureTab.tsx`
