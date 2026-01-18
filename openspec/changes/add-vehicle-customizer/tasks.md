# Tasks: Vehicle Customizer UI

## 1. Vehicle State Management
- [x] 1.1 Create `VehicleState` interface extending UnitState patterns
- [x] 1.2 Add vehicle-specific fields (motionType, turretType, etc.)
- [x] 1.3 Create `useVehicleStore` or extend `useUnitStore`
- [x] 1.4 Implement vehicle state <-> serialization mapping

## 2. Vehicle Customizer Tabs
- [x] 2.1 Create `VehicleStructureTab` component
  - [x] Chassis selection (tonnage, motion type)
  - [x] Engine type/rating selection
  - [x] Turret configuration toggle
  - [x] Special options (amphibious, sealed, etc.)
- [x] 2.2 Create `VehicleArmorTab` component
  - [x] Front/Left/Right/Rear allocation
  - [x] Turret armor (if applicable)
  - [x] Rotor armor (VTOL)
- [x] 2.3 Create `VehicleEquipmentTab` component
  - [x] Equipment browser filtered for vehicles
  - [x] Turret-mountable equipment distinction
- [x] 2.4 Create `VehicleTurretTab` component (if has turret)
  - [x] Turret weapon arrangement
  - [x] Turret weight tracking

## 3. Vehicle Diagram
- [x] 3.1 Create `VehicleDiagram` component
- [x] 3.2 Implement location click targets for vehicle shape
- [x] 3.3 Display armor pips per location
- [x] 3.4 Handle VTOL rotor location
- [ ] 3.5 Integrate with mm-data vehicle assets (if available)

## 4. Vehicle Status Bar
- [x] 4.1 Create `VehicleStatusBar` extending base StatusBar
- [x] 4.2 Show vehicle-specific calculations (cruise/flank MP)
- [x] 4.3 Show turret weight allocation
- [x] 4.4 Show vehicle-specific validation errors

## 5. Vehicle Validation Rules
- [ ] 5.1 Create `VehicleValidationRules` extending validation framework
- [ ] 5.2 Validate motion type constraints
- [ ] 5.3 Validate turret weight limits
- [ ] 5.4 Validate equipment compatibility
- [ ] 5.5 Register rules with validation orchestrator

## 6. Integration
- [x] 6.1 Add vehicle to unit type selector in construction flow
- [x] 6.2 Route vehicle units to VehicleCustomizer
- [ ] 6.3 Add unit type filter to equipment browser
- [ ] 6.4 Auto-filter equipment based on active unit type
