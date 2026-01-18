# Multi-Unit Type Support - Implementation Tasks

## Phase 0: Equipment Compatibility System (BLOCKING - Do First)

See `EQUIPMENT_CONSTRAINTS_ANALYSIS.md` for detailed analysis.

### 0.1 Equipment Schema Updates
- [x] 0.1.1 Add `EquipmentFlag` enum to `src/types/enums/EquipmentFlag.ts`
  - Unit type flags: MECH_EQUIPMENT, VEHICLE_EQUIPMENT, VTOL_EQUIPMENT, AEROSPACE_EQUIPMENT, BA_EQUIPMENT, INF_EQUIPMENT, PROTO_EQUIPMENT, SC_EQUIPMENT, DS_EQUIPMENT, JS_EQUIPMENT, WS_EQUIPMENT, SS_EQUIPMENT
  - Behavior flags: HEAT_SINK, DOUBLE_HEAT_SINK, JUMP_JET, MASC, TSM, CASE, CASE_II, ECM, BAP, C3_SYSTEM, TARGETING_COMPUTER, ARTEMIS, EXPLOSIVE, SPREADABLE, VARIABLE_SIZE
- [x] 0.1.2 Add `allowedUnitTypes: UnitType[]` to `IWeapon` interface
- [x] 0.1.3 Add `allowedUnitTypes: UnitType[]` to `IAmmunition` interface
- [x] 0.1.4 Add `allowedUnitTypes: UnitType[]` to `IElectronics` interface
- [x] 0.1.5 Add `allowedUnitTypes: UnitType[]` to `IMiscEquipment` interface
- [x] 0.1.6 Add `flags: EquipmentFlag[]` to all equipment interfaces
- [x] 0.1.7 Add `allowedLocations?: string[]` to equipment interfaces
- [x] 0.1.8 Update JSON schema files in `public/data/equipment/_schema/`
  - Added `allowedUnitTypes`, `flags`, `allowedLocations` to all schemas

### 0.2 Equipment Filter Updates
- [x] 0.2.1 Add `unitType?: UnitType | UnitType[]` to `IEquipmentFilter`
- [x] 0.2.2 Add `hasFlags?: EquipmentFlag[]` to `IEquipmentFilter`
- [x] 0.2.3 Add `excludeFlags?: EquipmentFlag[]` to `IEquipmentFilter`
- [x] 0.2.4 Update `EquipmentLoaderService.searchWeapons()` to filter by unitType
- [x] 0.2.5 Create `searchByUnitType(unitType: UnitType)` convenience method
- [x] 0.2.6 Added search methods for ammunition, electronics, misc equipment

### 0.3 Equipment Data Migration
**Note**: Equipment without `allowedUnitTypes` defaults to [BattleMech, Vehicle, Aerospace] in the loader.
This allows incremental migration - only unit-specific equipment needs explicit types.

- [x] 0.3.1 Audit existing weapons JSON for unit type compatibility
  - Standard weapons (lasers, PPCs, ACs, etc.) - default is correct
  - BA-specific weapons (baflamer, etc.) - need explicit `["Battle Armor"]`
  - Capital weapons (naval-ppc-*, etc.) - need explicit capital ship types
  - Infantry weapons (laser pistols, rifles) - need explicit `["Infantry"]`
- [x] 0.3.2 Add `allowedUnitTypes` to BA-specific weapons in energy.json
  - baflamer, baheavyflamer, ba-support-ppc, baclermediumpulselaser, etc.
- [x] 0.3.3 Add `allowedUnitTypes` to capital weapons in energy.json
  - naval-ppc-heavy, naval-ppc-medium, naval-ppc-light → DropShip, JumpShip, WarShip, Space Station
- [x] 0.3.4 Add `allowedUnitTypes` to infantry weapons
  - Note: Infantry weapons (laser pistols, rifles) were not present in current data files
- [x] 0.3.5 Add `allowedUnitTypes` to physical.json (BattleMech, IndustrialMech)
  - All 9 melee weapons updated: hatchet, sword, claws, mace, lance, talons, retractable-blade, flail, wrecking-ball
- [ ] 0.3.6 Add `allowedUnitTypes` to ammunition (deferred - follows weapon patterns)
- [ ] 0.3.7 Add `allowedUnitTypes` to electronics (deferred - most are universal)
- [ ] 0.3.8 Add `allowedUnitTypes` to miscellaneous equipment (deferred)
- [ ] 0.3.9 Convert existing `special[]` to `flags[]` where applicable (deferred)

### 0.4 Unit-Type-Specific Equipment Data
- [ ] 0.4.1 Create `public/data/equipment/official/weapons/battle-armor.json`
  - David Light Gauss Rifle, BA MG variants, Micro Grenade Launcher, etc.
- [ ] 0.4.2 Create `public/data/equipment/official/weapons/infantry.json`
  - Rifles, Support weapons, Archaic weapons
- [ ] 0.4.3 Create `public/data/equipment/official/weapons/vehicle.json`
  - Vehicle-specific variants (Vehicle Flamer, etc.)
- [ ] 0.4.4 Create `public/data/equipment/official/weapons/aerospace.json`
  - Bomb weapons, Capital missiles
- [ ] 0.4.5 Create `public/data/equipment/official/weapons/capital.json`
  - Naval Lasers, Naval PPCs, Naval Autocannons, Mass Drivers
- [ ] 0.4.6 Create `public/data/equipment/official/miscellaneous-ba.json`
  - Manipulators, BA Jump Jets, Mechanical Jump Boosters
- [ ] 0.4.7 Create `public/data/equipment/official/miscellaneous-vehicle.json`
  - Turret equipment, Motive systems, Vehicle JJ
- [ ] 0.4.8 Create `public/data/equipment/official/miscellaneous-aerospace.json`
  - Fuel tanks, Bomb bays, Thrust enhancements

### 0.5 Location System Updates
- [x] 0.5.1 Create `LocationType` union type for all unit type locations
- [x] 0.5.2 Create `VehicleLocation` enum (FRONT, LEFT, RIGHT, REAR, TURRET, BODY)
- [x] 0.5.3 Create `VTOLLocation` enum (adds ROTOR)
- [x] 0.5.4 Create `AerospaceLocation` enum (NOSE, LEFT_WING, RIGHT_WING, AFT, FUSELAGE)
- [x] 0.5.5 Create `BattleArmorLocation` enum (SQUAD, BODY, LEFT_ARM, RIGHT_ARM)
- [x] 0.5.6 Create `CapitalShipLocation` enum (NOSE, FL_ARC, FR_ARC, AL_ARC, AR_ARC, AFT, BROADSIDE)
- [x] 0.5.7 Create location mapping utility `getLocationsForUnitType(unitType: UnitType)`
  - Also added: SmallCraftLocation, DropShipLocation, ProtoMechLocation, InfantryLocation, SupportVehicleLocation
  - Created `isValidLocationForUnitType()` helper

### 0.6 Equipment Validation Rules
- [ ] 0.6.1 Create `VAL-EQUIP-UNIT-001`: Unit type compatibility check
- [ ] 0.6.2 Create `VAL-EQUIP-UNIT-002`: Location compatibility check
- [ ] 0.6.3 Create `VAL-EQUIP-UNIT-003`: Turret mounting requirements
- [ ] 0.6.4 Create `VAL-EQUIP-UNIT-004`: Incompatible equipment check
- [ ] 0.6.5 Create `VAL-EQUIP-UNIT-005`: Required equipment check
- [ ] 0.6.6 Register validation rules with orchestrator

### 0.7 Equipment Browser UI Updates
- [ ] 0.7.1 Add unit type filter to equipment browser
- [ ] 0.7.2 Auto-filter equipment based on active unit type
- [ ] 0.7.3 Show compatibility warnings for invalid equipment
- [ ] 0.7.4 Gray out incompatible equipment (show but not selectable)
- [ ] 0.7.5 Add tooltip showing which unit types can use equipment

---

## Phase 1: Foundation & Data Layer

### 1.1 Unit Type Hierarchy
- [x] 1.1.1 Create `IBaseUnit` interface in `src/types/unit/BaseUnitInterfaces.ts`
- [x] 1.1.2 Create `IGroundUnit` extending IBaseUnit (shared by vehicles, mechs)
- [x] 1.1.3 Create `IAerospaceUnit` extending IBaseUnit
- [x] 1.1.4 Create `ISquadUnit` extending IBaseUnit (battle armor, infantry)
- [ ] 1.1.5 Refactor `IBattleMech` to extend appropriate base
- [x] 1.1.6 Create `IVehicle`, `IVTOL`, `ISupportVehicle` interfaces
- [x] 1.1.7 Create `IAerospace`, `IConventionalFighter`, `ISmallCraft` interfaces
- [x] 1.1.8 Create `IDropShip`, `IJumpShip`, `IWarShip` interfaces
- [x] 1.1.9 Create `IBattleArmor`, `IInfantry` interfaces
- [x] 1.1.10 Create `IProtoMech` interface
- [ ] 1.1.11 Update `UnitType` enum with all subtypes
- [ ] 1.1.12 Add unit tests for type hierarchy

### 1.2 BLK Format Parser
- [x] 1.2.1 Create `IBlkDocument` interface in `src/types/formats/BlkFormat.ts`
- [x] 1.2.2 Implement `BlkParser` class in `src/services/conversion/BlkParserService.ts`
- [x] 1.2.3 Handle BLK tag extraction (`<UnitType>`, `<Name>`, etc.)
- [x] 1.2.4 Handle equipment blocks (`<Nose Equipment>`, `<Squad Equipment>`, etc.)
- [x] 1.2.5 Handle armor arrays (location-indexed)
- [x] 1.2.6 Handle transporter/bay definitions
- [x] 1.2.7 Add unit type detection from `<UnitType>` tag
- [x] 1.2.8 Create comprehensive test suite with sample BLK files from each unit type

### 1.3 Unit Type Registry
- [x] 1.3.1 Create `IUnitTypeHandler<T>` interface in `src/types/unit/UnitTypeHandler.ts`
- [x] 1.3.2 Create `UnitTypeRegistry` singleton in `src/services/units/UnitTypeRegistry.ts`
- [x] 1.3.3 Implement handler registration and lookup
- [x] 1.3.4 Create base `AbstractUnitTypeHandler` with common logic
- [ ] 1.3.5 Register existing BattleMech handler
- [x] 1.3.6 Add unit tests for registry (14 tests)
- [x] 1.3.7 Create `initializeUnitTypeHandlers()` function to register all 13 handlers
- [x] 1.3.8 Create integration test suite (29 tests) covering all unit types

### 1.4 Serialization Updates
- [ ] 1.4.1 Update `ISerializedUnit` to support polymorphic type field
- [ ] 1.4.2 Add `unitTypeDiscriminator` field for deserialization
- [ ] 1.4.3 Create `ISerializedVehicle`, `ISerializedAerospace`, etc.
- [ ] 1.4.4 Update `UnitSerializer` to handle all types
- [ ] 1.4.5 Add version migration for existing serialized mechs
- [ ] 1.4.6 Add round-trip serialization tests

---

## Phase 2: Import & Validation Pipeline

### 2.1 Extend Unit Loader
- [ ] 2.1.1 Add BLK file detection to `UnitLoaderService`
- [ ] 2.1.2 Create `loadBlkUnit()` method
- [ ] 2.1.3 Route to appropriate handler based on detected unit type
- [ ] 2.1.4 Update `mapToUnitState()` for polymorphic handling
- [ ] 2.1.5 Create unit-type-specific state interfaces
- [ ] 2.1.6 Add mm-data directory scanning for all unit types

### 2.2 Vehicle Handler
- [x] 2.2.1 Create `VehicleUnitHandler` implementing `IUnitTypeHandler<IVehicle>`
- [x] 2.2.2 Implement `parse()` for vehicle BLK files
- [x] 2.2.3 Map motion types (Wheeled, Tracked, Hover, VTOL, etc.)
- [x] 2.2.4 Map turret configurations
- [x] 2.2.5 Map engine types and ratings
- [x] 2.2.6 Handle armor distribution (Front, Left, Right, Rear, Turret)
- [x] 2.2.7 Register with UnitTypeRegistry
- [x] 2.2.8 Test with sample mm-data vehicle files (24 unit tests passing)

### 2.3 Aerospace Handler
- [x] 2.3.1 Create `AerospaceUnitHandler` implementing `IUnitTypeHandler<IAerospace>`
- [x] 2.3.2 Implement `parse()` for aerospace BLK files
- [x] 2.3.3 Map thrust and fuel values
- [x] 2.3.4 Map weapon arcs (Nose, Wings, Aft)
- [x] 2.3.5 Map structural integrity
- [x] 2.3.6 Handle conventional fighters variant
- [x] 2.3.7 Register with UnitTypeRegistry
- [x] 2.3.8 Test with sample mm-data fighter files (19 unit tests)

### 2.4 Battle Armor Handler
- [x] 2.4.1 Create `BattleArmorUnitHandler` implementing `IUnitTypeHandler<IBattleArmor>`
- [x] 2.4.2 Implement `parse()` for BA BLK files
- [x] 2.4.3 Map chassis type and weight class
- [x] 2.4.4 Map squad size and trooper equipment
- [x] 2.4.5 Map manipulator types
- [x] 2.4.6 Handle squad vs individual equipment
- [x] 2.4.7 Register with UnitTypeRegistry
- [x] 2.4.8 Test with sample mm-data BA files (19 unit tests)

### 2.5 Infantry Handler
- [x] 2.5.1 Create `InfantryUnitHandler` implementing `IUnitTypeHandler<IInfantry>`
- [x] 2.5.2 Implement `parse()` for infantry BLK files
- [x] 2.5.3 Map squad configuration
- [x] 2.5.4 Map primary/secondary weapons
- [x] 2.5.5 Map armor kit types
- [x] 2.5.6 Handle motion types (foot, motorized, jump, etc.)
- [x] 2.5.7 Register with UnitTypeRegistry
- [x] 2.5.8 Test with sample mm-data infantry files (18 unit tests)

### 2.6 ProtoMech Handler
- [x] 2.6.1 Create `ProtoMechUnitHandler` implementing `IUnitTypeHandler<IProtoMech>`
- [x] 2.6.2 Implement `parse()` for protomech BLK files
- [x] 2.6.3 Map simplified location structure
- [x] 2.6.4 Map Main Gun equipment
- [x] 2.6.5 Register with UnitTypeRegistry
- [x] 2.6.6 Test with sample mm-data protomech files (22 unit tests)

### 2.7 Large Aerospace Handlers
- [x] 2.7.1 Create `DropShipUnitHandler`
- [x] 2.7.2 Create `JumpShipUnitHandler`
- [x] 2.7.3 Create `WarShipUnitHandler`
- [x] 2.7.4 Map bay/transporter configurations
- [x] 2.7.5 Map crew configurations
- [x] 2.7.6 Register with UnitTypeRegistry
- [x] 2.7.7 Test with sample files
- [x] 2.7.8 Create `SmallCraftUnitHandler`
- [x] 2.7.9 Create `SpaceStationUnitHandler`
- [x] 2.7.10 Create `VTOLUnitHandler`
- [x] 2.7.11 Create `SupportVehicleUnitHandler`
- [x] 2.7.12 Create `ConventionalFighterUnitHandler`

### 2.8 Validation Rules
- [ ] 2.8.1 Create `VehicleValidationRules` extending validation framework
- [ ] 2.8.2 Create `AerospaceValidationRules`
- [ ] 2.8.3 Create `BattleArmorValidationRules`
- [ ] 2.8.4 Create `InfantryValidationRules`
- [ ] 2.8.5 Create `ProtoMechValidationRules`
- [ ] 2.8.6 Create `CapitalShipValidationRules`
- [ ] 2.8.7 Register rules with validation orchestrator by unit type
- [ ] 2.8.8 Add validation tests per unit type

---

## Phase 3: Customizer UI - Vehicles

### 3.1 Vehicle State Management
- [ ] 3.1.1 Create `VehicleState` interface extending UnitState patterns
- [ ] 3.1.2 Add vehicle-specific fields (motionType, turretType, etc.)
- [ ] 3.1.3 Create `useVehicleStore` or extend `useUnitStore`
- [ ] 3.1.4 Implement vehicle state <-> serialization mapping

### 3.2 Vehicle Customizer Tabs
- [ ] 3.2.1 Create `VehicleStructureTab` component
  - [ ] Chassis selection (tonnage, motion type)
  - [ ] Engine type/rating selection
  - [ ] Turret configuration toggle
  - [ ] Special options (amphibious, sealed, etc.)
- [ ] 3.2.2 Create `VehicleArmorTab` component
  - [ ] Front/Left/Right/Rear allocation
  - [ ] Turret armor (if applicable)
  - [ ] Rotor armor (VTOL)
- [ ] 3.2.3 Create `VehicleEquipmentTab` component
  - [ ] Equipment browser filtered for vehicles
  - [ ] Turret-mountable equipment distinction
- [ ] 3.2.4 Create `VehicleTurretTab` component (if has turret)
  - [ ] Turret weapon arrangement
  - [ ] Turret weight tracking

### 3.3 Vehicle Diagram
- [ ] 3.3.1 Create `VehicleDiagram` component
- [ ] 3.3.2 Implement location click targets for vehicle shape
- [ ] 3.3.3 Display armor pips per location
- [ ] 3.3.4 Handle VTOL rotor location
- [ ] 3.3.5 Integrate with mm-data vehicle assets (if available)

### 3.4 Vehicle Status Bar
- [ ] 3.4.1 Create `VehicleStatusBar` extending base StatusBar
- [ ] 3.4.2 Show vehicle-specific calculations (cruise/flank MP)
- [ ] 3.4.3 Show turret weight allocation
- [ ] 3.4.4 Show vehicle-specific validation errors

---

## Phase 4: Customizer UI - Aerospace

### 4.1 Aerospace State Management
- [ ] 4.1.1 Create `AerospaceState` interface
- [ ] 4.1.2 Add aerospace-specific fields (thrust, fuel, SI)
- [ ] 4.1.3 Implement aerospace state <-> serialization mapping

### 4.2 Aerospace Customizer Tabs
- [ ] 4.2.1 Create `AerospaceStructureTab` component
  - [ ] Tonnage and engine selection
  - [ ] Heat sink configuration
  - [ ] Fuel capacity
  - [ ] Structural integrity
- [ ] 4.2.2 Create `AerospaceArmorTab` component
  - [ ] Nose/Wings/Aft allocation
  - [ ] Capital armor for large aero
- [ ] 4.2.3 Create `AerospaceEquipmentTab` component
  - [ ] Arc-based weapon mounting
  - [ ] Bomb bay equipment (if applicable)

### 4.3 Aerospace Diagram
- [ ] 4.3.1 Create `AerospaceDiagram` component
- [ ] 4.3.2 Implement weapon arc visualization
- [ ] 4.3.3 Show nose/wing/aft locations
- [ ] 4.3.4 Display armor and equipment

### 4.4 Aerospace Status Bar
- [ ] 4.4.1 Create `AerospaceStatusBar` extending base
- [ ] 4.4.2 Show thrust ratings
- [ ] 4.4.3 Show fuel consumption
- [ ] 4.4.4 Show heat tracking

---

## Phase 5: Customizer UI - Personnel Units

### 5.1 Battle Armor Customizer
- [ ] 5.1.1 Create `BattleArmorState` interface
- [ ] 5.1.2 Create `BattleArmorStructureTab`
  - [ ] Chassis type selection
  - [ ] Weight class
  - [ ] Manipulator selection
  - [ ] Enhancement toggles (stealth, harjel, etc.)
- [ ] 5.1.3 Create `BattleArmorSquadTab`
  - [ ] Squad size configuration
  - [ ] Per-trooper equipment
- [ ] 5.1.4 Create `BattleArmorDiagram`
  - [ ] Squad trooper visualization
  - [ ] Equipment locations

### 5.2 Infantry Customizer
- [ ] 5.2.1 Create `InfantryState` interface
- [ ] 5.2.2 Create `InfantryBuildTab` (simplified)
  - [ ] Platoon configuration
  - [ ] Primary/secondary weapons
  - [ ] Armor kit selection
  - [ ] Motion type
  - [ ] Specializations
- [ ] 5.2.3 Create minimal infantry diagram

### 5.3 ProtoMech Customizer
- [ ] 5.3.1 Create `ProtoMechState` interface
- [ ] 5.3.2 Adapt mech-style tabs for protomech constraints
- [ ] 5.3.3 Create ProtoMech-specific diagram

---

## Phase 6: Export & Integration

### 6.1 BLK Export
- [ ] 6.1.1 Create `BlkExporter` class in `src/services/exporters/`
- [ ] 6.1.2 Implement `export()` for each unit type
- [ ] 6.1.3 Ensure round-trip fidelity with mm-data files
- [ ] 6.1.4 Add export option to UI

### 6.2 Record Sheets
- [ ] 6.2.1 Create vehicle record sheet template
- [ ] 6.2.2 Create aerospace record sheet template
- [ ] 6.2.3 Create battle armor record sheet template
- [ ] 6.2.4 Create infantry record sheet template
- [ ] 6.2.5 Integrate with existing record sheet system

### 6.3 Unit Browser Updates
- [ ] 6.3.1 Add unit type filter to browser
- [ ] 6.3.2 Display unit type icons
- [ ] 6.3.3 Route to appropriate customizer on selection

### 6.4 Documentation
- [ ] 6.4.1 Update AGENTS.md with new specs
- [ ] 6.4.2 Create unit type reference documentation
- [ ] 6.4.3 Document BLK format specification
- [ ] 6.4.4 Add developer guide for adding new unit types

---

## Testing Milestones

### Milestone 1: Foundation Complete
- [ ] All base interfaces defined and exported
- [ ] BLK parser passes 100% of sample files
- [ ] Unit type registry correctly routes all 13 types

### Milestone 2: Import Complete
- [ ] Import any mm-data vehicle file
- [ ] Import any mm-data aerospace file
- [ ] Import any mm-data battle armor file
- [ ] Import any mm-data infantry file
- [ ] Validation reports sensible errors/warnings

### Milestone 3: Vehicle Customizer Complete
- [ ] Can load, view, and modify vehicle in customizer
- [ ] Vehicle diagram displays correctly
- [ ] Can export vehicle back to BLK

### Milestone 4: Aerospace Customizer Complete
- [ ] Can load, view, and modify aerospace in customizer
- [ ] Weapon arcs display correctly
- [ ] Can export aerospace back to BLK

### Milestone 5: All Units Viewable
- [ ] Every mm-data unit type can be loaded
- [ ] Every unit type has appropriate customizer view
- [ ] Export works for all types

---

## Quality Checklist Per Unit Type

For each unit type handler:
- [ ] Parser handles all BLK fields for that type
- [ ] State interface covers all editable properties
- [ ] Validation rules match TechManual
- [ ] Customizer tabs expose all options
- [ ] Diagram shows correct locations
- [ ] Status bar shows type-specific info
- [ ] Export produces valid BLK/MTF
- [ ] Unit tests cover edge cases
- [ ] Integration test with 5+ mm-data samples
