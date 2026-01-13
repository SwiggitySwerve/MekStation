## 1. Shared Component Infrastructure

- [x] 1.1 Create `VariantStyles.tsx` with variant-aware container, header, button, and legend styling
- [x] 1.2 Create `VariantLocationRenderer.tsx` with 5 variant-specific SVG location renderers
- [x] 1.3 Export `VariantLocation` component that selects renderer based on current variant setting

## 2. Non-Biped Diagram Updates

- [x] 2.1 Update `QuadArmorDiagram.tsx` to import and use `VariantLocation` component
- [x] 2.2 Update `TripodArmorDiagram.tsx` to import and use `VariantLocation` component
- [x] 2.3 Update `LAMArmorDiagram.tsx` to import and use `VariantLocation` component
- [x] 2.4 Update `QuadVeeArmorDiagram.tsx` to import and use `VariantLocation` component

## 3. Auto-Allocation Support

- [x] 3.1 Extend `IArmorAllocation` interface in `unitState.ts` with all location types
- [x] 3.2 Add `calculateQuadArmorAllocation` function to `armorCalculations.ts`
- [x] 3.3 Add `calculateTripodArmorAllocation` function to `armorCalculations.ts`
- [x] 3.4 Update `autoAllocateArmor()` in store to accept and use configuration
- [x] 3.5 Update `maximizeArmor()` in store to accept and use configuration
- [x] 3.6 Update `ArmorTab.tsx` to pass configuration to allocation calls
- [x] 3.7 Add configuration selector support to `UnitEditorWithRouting.tsx`

## 4. Testing

- [x] 4.1 Add unit tests for Quad armor auto-allocation in `armorAutoAllocation.test.ts`
- [x] 4.2 Add unit tests for Tripod armor auto-allocation
- [x] 4.3 Add unit tests for LAM armor auto-allocation
- [x] 4.4 Add unit tests for QuadVee armor auto-allocation
- [x] 4.5 Verify TypeScript compiles without errors
- [x] 4.6 Verify ESLint passes
- [x] 4.7 Verify all tests pass

## 5. Validation

- [x] 5.1 Manually test each variant renders correctly on Quad configuration
- [x] 5.2 Manually test each variant renders correctly on Tripod configuration
- [x] 5.3 Manually test each variant renders correctly on LAM configuration
- [x] 5.4 Manually test each variant renders correctly on QuadVee configuration
- [x] 5.5 Test auto-allocate works for all configurations
- [x] 5.6 Test maximize armor works for all configurations
