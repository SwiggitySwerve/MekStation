# Tasks

## 1. Battle Value Calculation Fixes

- [x] 1.1 Add TMM-based speed factor lookup table (`BV2_SPEED_FACTORS_BY_TMM`)
- [x] 1.2 Implement `calculateTMM()` function for movement-to-TMM conversion
- [x] 1.3 Update `getSpeedFactor()` to use TMM instead of raw MP
- [x] 1.4 Revise heat adjustment formula to use efficiency-based scaling

## 2. Heat Calculation Fixes

- [x] 2.1 Add registry initialization check in `calculateHeatProfile()`
- [x] 2.2 Create `useEquipmentRegistry` hook for tracking registry readiness
- [x] 2.3 Update `UnitEditorWithRouting` to use `calculateHeatProfile()` for heat display
- [x] 2.4 Add `registryReady` dependency to BV/heat calculation memos

## 3. Service Initialization

- [x] 3.1 Create browser-safe service initialization in `_app.tsx`
- [x] 3.2 Initialize `IndexedDBService` and `EquipmentRegistry` on app mount

## 4. Testing

- [x] 4.1 Add CalculationService unit tests for BV calculation
- [x] 4.2 Add CalculationService unit tests for heat profile calculation
- [x] 4.3 Add useEquipmentCalculations hook tests
- [x] 4.4 Add TMM calculation tests

## 5. Documentation

- [x] 5.1 Create OpenSpec proposal documenting calculation changes
- [x] 5.2 Update spec deltas for affected capabilities
- [x] 5.3 Validate with `openspec validate update-bv-heat-calculations --strict`
