# Implementation Tasks: Phase 2 Construction Systems

## 1. Engine System
- [ ] 1.1 Create EngineType enum (Standard, XL IS/Clan, Light, XXL, Compact, ICE, Fuel Cell, Fission)
- [ ] 1.2 Create IEngine interface extending ITechBaseEntity, IPlaceableComponent
- [ ] 1.3 Implement engine weight calculation formulas per type
- [ ] 1.4 Implement CT slot calculation by rating brackets
- [ ] 1.5 Implement side torso slot rules (XL: IS=3, Clan=2; Light=2; XXL=3)
- [ ] 1.6 Implement integral heat sink calculation (floor(rating/25), max 10)
- [ ] 1.7 Create engine factory function
- [ ] 1.8 Write engine validation tests

## 2. Gyro System
- [ ] 2.1 Create GyroType enum (Standard, XL, Compact, Heavy-Duty)
- [ ] 2.2 Create IGyro interface
- [ ] 2.3 Implement gyro weight calculation (ceil(engineRating/100) × multiplier)
- [ ] 2.4 Implement gyro slot requirements (Standard=4, XL=6, Compact=2, Heavy-Duty=4)
- [ ] 2.5 Implement gyro-cockpit compatibility rules
- [ ] 2.6 Write gyro validation tests

## 3. Heat Sink System
- [ ] 3.1 Create HeatSinkType enum (Single, Double IS, Double Clan, Compact, Laser)
- [ ] 3.2 Create IHeatSink interface
- [ ] 3.3 Implement engine integration logic
- [ ] 3.4 Implement external heat sink slot calculations (IS double=3, Clan double=2)
- [ ] 3.5 Implement minimum 10 heat sink requirement
- [ ] 3.6 Write heat sink validation tests

## 4. Internal Structure System
- [ ] 4.1 Create InternalStructureType enum (Standard, Endo Steel IS/Clan, Reinforced, etc.)
- [ ] 4.2 Create IInternalStructure interface
- [ ] 4.3 Implement structure weight calculation (10% standard, 5% endo, etc.)
- [ ] 4.4 Implement structure point tables by tonnage
- [ ] 4.5 Implement structure slot requirements (Endo Steel: IS=14, Clan=7)
- [ ] 4.6 Write structure validation tests

## 5. Armor System
- [ ] 5.1 Create ArmorType enum (Standard, Ferro IS/Clan, Stealth, Reactive, etc.)
- [ ] 5.2 Create IArmor interface
- [ ] 5.3 Implement points-per-ton ratios (Standard=16, Ferro IS=17.92, Clan=19.2)
- [ ] 5.4 Implement maximum armor per location (2× structure, head=9)
- [ ] 5.5 Implement armor slot requirements (Ferro: IS=14, Clan=7)
- [ ] 5.6 Implement rear armor rules
- [ ] 5.7 Write armor validation tests

## 6. Cockpit System
- [ ] 6.1 Create CockpitType enum (Standard, Small, Command Console, Torso-Mounted, Primitive)
- [ ] 6.2 Create ICockpit interface
- [ ] 6.3 Implement cockpit weight and slot rules
- [ ] 6.4 Implement head slot layout (life support, sensors, cockpit)
- [ ] 6.5 Implement cockpit-gyro compatibility
- [ ] 6.6 Write cockpit validation tests

## 7. Movement System
- [ ] 7.1 Implement walk MP calculation (floor(rating/tonnage))
- [ ] 7.2 Implement run MP calculation (floor(walk × 1.5))
- [ ] 7.3 Create JumpJetType enum (Standard, Improved, Extended, etc.)
- [ ] 7.4 Implement jump jet weight by tonnage class
- [ ] 7.5 Implement MASC/TSM/Supercharger rules
- [ ] 7.6 Write movement validation tests

## 8. Critical Slot Allocation
- [ ] 8.1 Define location slot counts (Head=6, CT=12, ST=12, Arms=12, Legs=6)
- [ ] 8.2 Implement fixed component placement order
- [ ] 8.3 Implement actuator requirements per location
- [ ] 8.4 Implement slot availability calculation
- [ ] 8.5 Write slot allocation validation tests

## 9. Tech Base Integration
- [ ] 9.1 Implement tech base declaration for units
- [ ] 9.2 Implement mixed tech toggle mechanics
- [ ] 9.3 Implement structural component validation
- [ ] 9.4 Implement equipment compatibility checking
- [ ] 9.5 Write tech base validation tests

## 10. Formula Registry
- [ ] 10.1 Create centralized weight calculation registry
- [ ] 10.2 Create centralized slot calculation registry
- [ ] 10.3 Create centralized movement calculation registry
- [ ] 10.4 Document all formula sources (TechManual pages)
- [ ] 10.5 Write formula registry tests

## 11. Construction Rules Core
- [ ] 11.1 Implement 12-step construction sequence
- [ ] 11.2 Implement weight budget calculation
- [ ] 11.3 Implement minimum requirements validation (10 heat sinks, actuators)
- [ ] 11.4 Implement maximum limits validation (armor, slots, tonnage)
- [ ] 11.5 Implement tech rating calculation
- [ ] 11.6 Write comprehensive construction validation tests

## 12. Integration & Testing
- [ ] 12.1 Create unified barrel export for Phase 2 types
- [ ] 12.2 Verify dependency ordering (engine → gyro → heat sinks)
- [ ] 12.3 Run full type checking
- [ ] 12.4 Run all Phase 2 tests
- [ ] 12.5 Validate against known unit configurations (Atlas, Timber Wolf)

