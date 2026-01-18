# Tasks: Multi-Unit Type Support

## 1. Foundation
- [ ] 1.1 Define abstract unit interface shared by all types
- [ ] 1.2 Extend UnitType enum with all supported types
- [ ] 1.3 Create unit type factory pattern
- [ ] 1.4 Update unit serialization for type-specific fields

## 2. Combat Vehicles
- [ ] 2.1 Define IVehicle interface extending base unit
- [ ] 2.2 Implement vehicle motive types (tracked, wheeled, hover, VTOL)
- [ ] 2.3 Implement vehicle armor/structure locations
- [ ] 2.4 Implement turret system (optional turret)
- [ ] 2.5 Add vehicle-specific equipment compatibility
- [ ] 2.6 Create VehicleBuilderService
- [ ] 2.7 Add vehicle construction validation rules
- [ ] 2.8 Write tests for vehicle construction

## 3. Aerospace Units
- [ ] 3.1 Define IAerospace interface
- [ ] 3.2 Implement aerospace structural integrity
- [ ] 3.3 Implement fuel/thrust systems
- [ ] 3.4 Add aerospace-specific locations (nose, wings, aft)
- [ ] 3.5 Add aerospace equipment compatibility
- [ ] 3.6 Create AerospaceBuilderService
- [ ] 3.7 Add aerospace construction validation rules
- [ ] 3.8 Write tests for aerospace construction

## 4. Infantry Units
- [ ] 4.1 Define IInfantry interface
- [ ] 4.2 Implement platoon structure
- [ ] 4.3 Implement infantry weapons and equipment
- [ ] 4.4 Define IBattleArmor interface
- [ ] 4.5 Implement battle armor construction
- [ ] 4.6 Create InfantryBuilderService
- [ ] 4.7 Add infantry construction validation rules
- [ ] 4.8 Write tests for infantry construction

## 5. UI Integration
- [ ] 5.1 Add unit type selector to construction flow
- [ ] 5.2 Create vehicle-specific customizer tabs
- [ ] 5.3 Create aerospace-specific customizer tabs
- [ ] 5.4 Create infantry-specific customizer tabs
- [ ] 5.5 Update equipment browser for type filtering

## 6. Data Integration
- [ ] 6.1 Convert vehicle MTF/data files
- [ ] 6.2 Convert aerospace MTF/data files
- [ ] 6.3 Update equipment database with vehicle/aerospace entries
- [ ] 6.4 Validate data parity with MegaMek
