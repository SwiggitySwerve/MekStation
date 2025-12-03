## 1. Core Implementation

- [x] 1.1 Update `getFixedSlotIndices()` in `src/utils/construction/slotOperations.ts` to include engine side torso slots based on engine type
- [x] 1.2 Create `src/utils/construction/displacementUtils.ts` with displacement detection functions
- [x] 1.3 Update `setEngineType` action in `src/stores/useUnitStore.ts` to handle displacement
- [x] 1.4 Update `setGyroType` action in `src/stores/useUnitStore.ts` to handle displacement

## 2. UI Updates

- [x] 2.1 Update `buildLocationSlots()` in `src/components/customizer/tabs/CriticalSlotsTab.tsx` to display engine slots in side torsos
- [x] 2.2 Verify engine slots use correct color coding (orange for Engine)

## 3. Testing

- [x] 3.1 Test Standard → XL Engine: Equipment in LT/RT slots 0-2 should be unallocated
- [x] 3.2 Test XL → Standard Engine: No displacement (freeing slots), equipment remains
- [x] 3.3 Test Standard → XL Gyro: Equipment in CT slots 7-8 should be unallocated
- [x] 3.4 Test XL → Compact Gyro: No displacement (freeing slots)
- [x] 3.5 Test combined engine + gyro changes
- [x] 3.6 Verify build compiles without errors

