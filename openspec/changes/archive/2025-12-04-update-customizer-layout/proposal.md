# Change: Update Customizer Layout for Structure and Overview Tabs

## Why

The customizer layout needs reorganization for better workflow. Tonnage and Motive Type are fundamental chassis properties that belong in the Structure tab where users configure the mech's physical construction, not in the Overview tab which should focus on identity and summary information. Additionally, the Unit Info Banner needs to properly detect and display Mixed tech when components use different tech bases.

## What Changes

- **Structure Tab - Chassis Section**: Add Tonnage stepper control at the top of the Chassis panel
- **Structure Tab - Movement Section**: Add Motive Type dropdown at the bottom of the Movement panel
- **Overview Tab**: Remove the Chassis panel (which had Tonnage and Motive Type), leaving only the Basic Information panel
- **Unit Info Banner**: Update tech base badge to display TechBaseMode (IS/Clan/Mixed) instead of binary TechBase, with automatic detection of effective mixed state

## Impact

- Affected specs: `customizer-tabs`, `unit-info-banner`
- Affected code:
  - `src/components/customizer/tabs/StructureTab.tsx` - Add Tonnage and Motive Type controls
  - `src/components/customizer/tabs/OverviewTab.tsx` - Remove Chassis panel
  - `src/components/customizer/shared/TechBaseBadge.tsx` - Accept TechBaseMode
  - `src/components/customizer/shared/UnitInfoBanner.tsx` - Use TechBaseMode in stats
  - `src/components/customizer/UnitEditorWithRouting.tsx` - Compute effective tech base mode
  - `src/utils/colors/techBaseColors.ts` - Already supports TechBaseMode colors (purple for Mixed)
