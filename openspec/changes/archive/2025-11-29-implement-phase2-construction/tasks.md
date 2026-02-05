# Implementation Tasks: Phase 2 Construction Systems

## 1. Engine System

- [x] 1.1 Create EngineType enum (Standard, XL IS/Clan, Light, XXL, Compact, ICE, Fuel Cell, Fission)
- [x] 1.2 Create IEngine interface extending ITechBaseEntity, IPlaceableComponent
- [x] 1.3 Implement engine weight calculation formulas per type
- [x] 1.4 Implement CT slot calculation by rating brackets
- [x] 1.5 Implement side torso slot rules (XL: IS=3, Clan=2; Light=2; XXL=3)
- [x] 1.6 Implement integral heat sink calculation (floor(rating/25), max 10)
- [x] 1.7 Create engine factory function
- [x] 1.8 Write engine validation tests

## 2. Gyro System

- [x] 2.1 Create GyroType enum (Standard, XL, Compact, Heavy-Duty)
- [x] 2.2 Create IGyro interface
- [x] 2.3 Implement gyro weight calculation (ceil(engineRating/100) × multiplier)
- [x] 2.4 Implement gyro slot requirements (Standard=4, XL=6, Compact=2, Heavy-Duty=4)
- [x] 2.5 Implement gyro-cockpit compatibility rules
- [x] 2.6 Write gyro validation tests

## 3. Heat Sink System

- [x] 3.1 Create HeatSinkType enum (Single, Double IS, Double Clan, Compact, Laser)
- [x] 3.2 Create IHeatSink interface
- [x] 3.3 Implement engine integration logic
- [x] 3.4 Implement external heat sink slot calculations (IS double=3, Clan double=2)
- [x] 3.5 Implement minimum 10 heat sink requirement
- [x] 3.6 Write heat sink validation tests

## 4. Internal Structure System

- [x] 4.1 Create InternalStructureType enum (Standard, Endo Steel IS/Clan, Reinforced, etc.)
- [x] 4.2 Create IInternalStructure interface
- [x] 4.3 Implement structure weight calculation (10% standard, 5% endo, etc.)
- [x] 4.4 Implement structure point tables by tonnage
- [x] 4.5 Implement structure slot requirements (Endo Steel: IS=14, Clan=7)
- [x] 4.6 Write structure validation tests

## 5. Armor System

- [x] 5.1 Create ArmorType enum (Standard, Ferro IS/Clan, Stealth, Reactive, etc.)
- [x] 5.2 Create IArmor interface
- [x] 5.3 Implement points-per-ton ratios (Standard=16, Ferro IS=17.92, Clan=19.2)
- [x] 5.4 Implement maximum armor per location (2× structure, head=9)
- [x] 5.5 Implement armor slot requirements (Ferro: IS=14, Clan=7)
- [x] 5.6 Implement rear armor rules
- [x] 5.7 Write armor validation tests

## 6. Cockpit System

- [x] 6.1 Create CockpitType enum (Standard, Small, Command Console, Torso-Mounted, Primitive)
- [x] 6.2 Create ICockpit interface
- [x] 6.3 Implement cockpit weight and slot rules
- [x] 6.4 Implement head slot layout (life support, sensors, cockpit)
- [x] 6.5 Implement cockpit-gyro compatibility
- [x] 6.6 Write cockpit validation tests

## 7. Movement System

- [x] 7.1 Implement walk MP calculation (floor(rating/tonnage))
- [x] 7.2 Implement run MP calculation (floor(walk × 1.5))
- [x] 7.3 Create JumpJetType enum (Standard, Improved, Extended, etc.)
- [x] 7.4 Implement jump jet weight by tonnage class
- [x] 7.5 Implement MASC/TSM/Supercharger rules
- [x] 7.6 Write movement validation tests

## 8. Critical Slot Allocation

- [x] 8.1 Define location slot counts (Head=6, CT=12, ST=12, Arms=12, Legs=6)
- [x] 8.2 Implement fixed component placement order
- [x] 8.3 Implement actuator requirements per location
- [x] 8.4 Implement slot availability calculation
- [x] 8.5 Write slot allocation validation tests

## 9. Tech Base Integration

- [x] 9.1 Implement tech base declaration for units
- [x] 9.2 Implement mixed tech toggle mechanics
- [x] 9.3 Implement structural component validation
- [x] 9.4 Implement equipment compatibility checking
- [x] 9.5 Write tech base validation tests

## 10. Formula Registry

- [x] 10.1 Create centralized weight calculation registry
- [x] 10.2 Create centralized slot calculation registry
- [x] 10.3 Create centralized movement calculation registry
- [x] 10.4 Document all formula sources (TechManual pages)
- [x] 10.5 Write formula registry tests

## 11. Construction Rules Core

- [x] 11.1 Implement 12-step construction sequence
- [x] 11.2 Implement weight budget calculation
- [x] 11.3 Implement minimum requirements validation (10 heat sinks, actuators)
- [x] 11.4 Implement maximum limits validation (armor, slots, tonnage)
- [x] 11.5 Implement tech rating calculation
- [x] 11.6 Write comprehensive construction validation tests

## 12. Integration & Testing

- [x] 12.1 Create unified barrel export for Phase 2 types
- [x] 12.2 Verify dependency ordering (engine → gyro → heat sinks)
- [x] 12.3 Run full type checking
- [x] 12.4 Run all Phase 2 tests
- [x] 12.5 Validate against known unit configurations (Atlas, Timber Wolf)
