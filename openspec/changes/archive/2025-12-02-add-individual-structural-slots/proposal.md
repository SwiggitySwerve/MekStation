# Change: Individual Structural Slot Items

## Why

Endo Steel, Ferro-Fibrous, and similar components require critical slot placement in BattleTech. The previous implementation tracked these as single multi-slot items, but they must be individual 1-slot items to enable proper critical slot allocation tracking.

## What Changes

- Endo Steel creates N individual 1-slot items (14 IS / 7 Clan / 7 Composite)
- Ferro-Fibrous creates N individual 1-slot items (14 IS / 7 Clan)
- Light Ferro creates 7 individual 1-slot items
- Heavy Ferro creates 21 individual 1-slot items
- Stealth armor creates 6 x 2-slot items with pre-assigned locations (LA/RA/LT/RT/LL/RL)
- Each item has unique `instanceId` for allocation tracking
- All items marked `isRemovable: false` (configuration components)

## Impact

- Affected specs: `internal-structure-system`, `armor-system`, `critical-slot-allocation`, `equipment-tray`
- Affected code: `src/stores/useUnitStore.ts`
