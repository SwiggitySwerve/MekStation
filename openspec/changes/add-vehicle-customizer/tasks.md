# Tasks: Vehicle Customizer UI

## 1. Vehicle State Management
- [ ] 1.1 Create `VehicleState` interface extending UnitState patterns
- [ ] 1.2 Add vehicle-specific fields (motionType, turretType, etc.)
- [ ] 1.3 Create `useVehicleStore` or extend `useUnitStore`
- [ ] 1.4 Implement vehicle state <-> serialization mapping

## 2. Vehicle Customizer Tabs
- [ ] 2.1 Create `VehicleStructureTab` component
  - [ ] Chassis selection (tonnage, motion type)
  - [ ] Engine type/rating selection
  - [ ] Turret configuration toggle
  - [ ] Special options (amphibious, sealed, etc.)
- [ ] 2.2 Create `VehicleArmorTab` component
  - [ ] Front/Left/Right/Rear allocation
  - [ ] Turret armor (if applicable)
  - [ ] Rotor armor (VTOL)
- [ ] 2.3 Create `VehicleEquipmentTab` component
  - [ ] Equipment browser filtered for vehicles
  - [ ] Turret-mountable equipment distinction
- [ ] 2.4 Create `VehicleTurretTab` component (if has turret)
  - [ ] Turret weapon arrangement
  - [ ] Turret weight tracking

## 3. Vehicle Diagram
- [ ] 3.1 Create `VehicleDiagram` component
- [ ] 3.2 Implement location click targets for vehicle shape
- [ ] 3.3 Display armor pips per location
- [ ] 3.4 Handle VTOL rotor location
- [ ] 3.5 Integrate with mm-data vehicle assets (if available)

## 4. Vehicle Status Bar
- [ ] 4.1 Create `VehicleStatusBar` extending base StatusBar
- [ ] 4.2 Show vehicle-specific calculations (cruise/flank MP)
- [ ] 4.3 Show turret weight allocation
- [ ] 4.4 Show vehicle-specific validation errors

## 5. Vehicle Validation Rules
- [ ] 5.1 Create `VehicleValidationRules` extending validation framework
- [ ] 5.2 Validate motion type constraints
- [ ] 5.3 Validate turret weight limits
- [ ] 5.4 Validate equipment compatibility
- [ ] 5.5 Register rules with validation orchestrator

## 6. Integration
- [ ] 6.1 Add vehicle to unit type selector in construction flow
- [ ] 6.2 Route vehicle units to VehicleCustomizer
- [ ] 6.3 Add unit type filter to equipment browser
- [ ] 6.4 Auto-filter equipment based on active unit type
