# Change: Add System Slot Displacement

## Why

When changing system configurations (e.g., Standard Engine to XL Engine, Standard Gyro to XL Gyro), the new configuration may require additional critical slots in locations where equipment is already allocated. Currently, equipment is not automatically unallocated when configuration changes require their slots, leading to invalid unit states.

## What Changes

- **BREAKING**: Side torso slots 0-2 (IS XL/XXL) or 0-1 (Clan XL/Light) are now treated as fixed when using engines that require side torso slots
- Add displacement detection when engine type changes
- Add displacement detection when gyro type changes
- Update critical slots display to show engine slots in side torsos
- Automatically unallocate equipment from slots that become occupied by system components

## Impact

- Affected specs:
  - `critical-slot-allocation` - Add side torso fixed slot handling and displacement requirements
  - `unit-store-architecture` - Add displacement handling in store actions
  - `critical-slots-display` - Add engine slot display in side torsos
- Affected code:
  - `src/utils/construction/slotOperations.ts` - Update `getFixedSlotIndices()`
  - `src/utils/construction/displacementUtils.ts` - New displacement detection utility
  - `src/stores/useUnitStore.ts` - Update `setEngineType` and `setGyroType` actions
  - `src/components/customizer/tabs/CriticalSlotsTab.tsx` - Update `buildLocationSlots()`

