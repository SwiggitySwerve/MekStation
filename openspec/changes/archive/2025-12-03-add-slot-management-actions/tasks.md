# Tasks: Add Slot Management Actions

## 1. Core Utility Module

- [x] 1.1 Create `src/utils/construction/slotOperations.ts` with types and interfaces
- [x] 1.2 Implement `getAvailableSlotIndices(location, engineType, gyroType)` helper
- [x] 1.3 Implement `findUnhittableEquipment(equipment)` to identify Endo Steel/Ferro-Fibrous slots

## 2. Fill Action

- [x] 2.1 Implement `fillUnhittableSlots()` with even distribution algorithm:
  - Phase 1: LT + RT alternating
  - Phase 2: LA + RA alternating
  - Phase 3: LL + RL alternating
  - Phase 4: CT
  - Phase 5: Head (slot 3 only)
- [x] 2.2 Wire Fill button in CriticalSlotsTab to call fillUnhittableSlots
- [ ] 2.3 Add unit tests for fill distribution logic

## 3. Compact Action

- [x] 3.1 Implement `compactEquipmentSlots()` that moves equipment to lowest indices per location
- [x] 3.2 Wire Compact button in CriticalSlotsTab
- [ ] 3.3 Add unit tests for compact logic

## 4. Sort Action

- [x] 4.1 Implement `sortEquipmentBySize()` that orders by criticalSlots descending, then compacts
- [x] 4.2 Wire Sort button in CriticalSlotsTab
- [ ] 4.3 Add unit tests for sort logic

## 5. Store Updates

- [x] 5.1 Add `autoCompact` and `autoSort` to `AutoModeSettings` in useCustomizerStore
- [x] 5.2 Add `bulkUpdateEquipmentLocations()` action to useUnitStore for efficient batch updates

## 6. Auto Toggles

- [x] 6.1 Wire Auto Fill toggle to run Fill when structure/armor type changes introduce unhittables
- [x] 6.2 Wire Auto Compact toggle to run Compact after any equipment placement change
- [x] 6.3 Wire Auto Sort toggle to run Sort after equipment placement

## 7. Click-to-Select Enhancement

- [x] 7.1 Modify handleSlotClick to select placed equipment when clicked
- [x] 7.2 Highlight valid drop targets when equipment is selected from slot
- [x] 7.3 Clear selection after successful reassignment

## 8. Validation

- [x] 8.1 Manual testing of all button actions
- [x] 8.2 Verify auto toggles trigger at correct times
- [x] 8.3 Ensure no regressions in existing click/drag placement
- [x] 8.4 Test click-to-select flow for reassignment

