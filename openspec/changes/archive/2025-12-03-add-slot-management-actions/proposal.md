# Change: Add Slot Management Actions

## Why

The Critical Slots Tab toolbar has Fill, Compact, Sort buttons and Auto toggles that are currently stubbed (log to console only). Users need these features to efficiently manage equipment placement, especially for distributed components like Endo Steel and Ferro-Fibrous armor that require many individual slot placements.

## What Changes

- Implement **Fill** action: Evenly distributes unallocated "unhittable" slots (Endo Steel, Ferro-Fibrous) across locations in priority order
- Implement **Compact** action: Moves equipment to lowest available slot indices, eliminating gaps
- Implement **Sort** action: Reorders equipment by size (largest first), then compacts
- Wire **Auto Fill** toggle: Runs Fill automatically when structure/armor changes
- Wire **Auto Compact** toggle: Runs Compact after equipment placement changes
- Wire **Auto Sort** toggle: Runs Sort after equipment placement
- Add **click-to-select** for placed equipment: Clicking placed equipment selects it for reassignment

## Impact

- Affected specs: `critical-slots-display` (MODIFIED)
- Affected code:
  - `src/components/customizer/tabs/CriticalSlotsTab.tsx` - Wire button handlers
  - `src/utils/construction/slotOperations.ts` - New utility module (to be created)
  - `src/stores/useCustomizerStore.ts` - Add autoCompact, autoSort settings
  - `src/stores/useUnitStore.ts` - Add bulk assignment action

