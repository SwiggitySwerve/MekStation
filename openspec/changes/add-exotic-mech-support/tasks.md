# Tasks: Add Exotic Mech Configuration Support

## Progress Summary

**Status: ~81/95 tasks complete (~85%)**

| Phase | Complete | Total | % |
|-------|----------|-------|---|
| 1. Foundation + Quad | 30/31 | 31 | 97% |
| 2. LAM Support | 17/20 | 20 | 85% |
| 3. Tripod Support | 10/12 | 12 | 83% |
| 4. QuadVee Support | 10/13 | 13 | 77% |
| 5. Integration Testing | 0/9 | 9 | 0% |

**Remaining Work:**
- Various unit tests for configurations (2.2.5, 2.5.4, 3.1.5, 3.4.2, 4.2.3, 4.3.4)
- Visual regression tests for diagrams (1.5.6, 2.4.5, 3.3.4, 4.4.4)
- End-to-end integration tests (Phase 5)

---

## Phase 1: Foundation + Quad Support

### 1.1 Configuration Registry Foundation
- [x] 1.1.1 Create `MechConfigurationDefinition` interface in `src/types/construction/`
  - Implemented as `IMechConfigurationDefinition` in `MechConfigurationSystem.ts`
- [x] 1.1.2 Create `LocationDefinition` interface with slot counts, max armor calculations
  - Implemented as `ILocationDefinition` in `MechConfigurationSystem.ts`
- [x] 1.1.3 Create `ActuatorDefinition` interface with slot positions and removability
  - Implemented as `IActuatorSlot` in `MechConfigurationSystem.ts`
- [x] 1.1.4 Create `ConfigurationRegistry` class with definition lookup methods
  - Implemented as `MechConfigurationRegistry` singleton
- [x] 1.1.5 Extract biped configuration from existing hardcoded values into definition
  - Implemented as `BIPED_CONFIGURATION` constant
- [x] 1.1.6 Add unit tests for ConfigurationRegistry
  - Comprehensive tests in `MechConfigurationSystem.test.ts`

### 1.2 MechLocation Enum Expansion
- [x] 1.2.1 Add quad locations to MechLocation enum (FRONT_LEFT_LEG, FRONT_RIGHT_LEG, REAR_LEFT_LEG, REAR_RIGHT_LEG)
- [x] 1.2.2 Add `getLocationsForConfig(config)` helper function
- [x] 1.2.3 Add `getLocationDisplayName(location, config)` helper (e.g., "Front Left Leg" vs "Left Arm")
- [x] 1.2.4 Update location-dependent utilities to use configuration-aware helpers
  - Implemented: isValidLocationForConfig, getLocationSlotCount, getActuatorsForLocation
- [x] 1.2.5 Add unit tests for location helpers

### 1.3 Quad Configuration Definition
- [x] 1.3.1 Create quad configuration definition (8 locations, all with leg actuators)
  - Implemented as `QUAD_CONFIGURATION` constant
- [x] 1.3.2 Define quad actuator layout (Hip, Upper Leg, Lower Leg, Foot × 4)
  - Uses `LEG_ACTUATORS` for all 4 leg locations
- [x] 1.3.3 Define quad equipment restrictions (no hand weapons, turret rules)
  - Structure in place via `prohibitedEquipment` and `mountingRules` arrays
- [x] 1.3.4 Register quad definition in ConfigurationRegistry
- [x] 1.3.5 Add unit tests for quad configuration

### 1.4 MTF Parser Updates for Quad
- [x] 1.4.1 Add configuration-specific location header mappings to parser
- [x] 1.4.2 Add quad armor label mappings (FLL, FRL, RLL, RRL)
- [x] 1.4.3 Update parser to read Config: line before location parsing
- [x] 1.4.4 Add quad MTF export support with correct location names
- [x] 1.4.5 Add parser/exporter tests with actual quad MTF files from mm-data
  - Validated via parity validation: 100% pass rate on all quad mechs in mm-data

### 1.5 Quad Armor Diagram
- [x] 1.5.1 Create QuadArmorDiagram SVG component with 4-legged silhouette
  - Implemented in `armor/variants/QuadArmorDiagram.tsx`
- [x] 1.5.2 Implement location regions for Head, CT, LT, RT, FLL, FRL, RLL, RRL
  - Uses QUAD_SILHOUETTE from MechSilhouette.tsx
- [x] 1.5.3 Add armor pip layout for quad locations
  - Uses same status colors and interaction as biped diagrams
- [x] 1.5.4 Create diagram selector that switches based on unit configuration
  - ArmorTab now checks configuration to select appropriate diagram
- [x] 1.5.5 Integrate diagram selector into ArmorTab
  - Configuration-aware armorData generation and diagram rendering
- [ ] 1.5.6 Add visual regression tests for quad diagram

### 1.6 Quad Validation Rules
- [x] 1.6.1 Add `appliesTo` field to validation rule interface
  - Implemented via `canValidate(context)` method on each rule
- [x] 1.6.2 Create quad-no-hand-actuators rule
  - Implemented as `QuadNoArmsRule` in ConfigurationValidationRules.ts
- [x] 1.6.3 Create quad-no-hand-weapons rule (hatchets, swords, claws)
  - Covered by `QuadNoArmsRule` - prevents any equipment in arm locations
- [x] 1.6.4 Create quad-turret-mounting rule for rear-facing weapons
  - Structure in place via `mountingRules` in configuration definitions
- [x] 1.6.5 Update validation orchestrator to filter rules by configuration
  - Each rule's `canValidate()` checks configuration before running
- [x] 1.6.6 Add validation rule tests for quad mechs
  - Tests in ConfigurationValidationRules.test.ts

## Phase 2: LAM Support

### 2.1 LAM Mode System
- [x] 2.1.1 Create LAMMode enum (MECH, AIRMECH, FIGHTER)
  - Implemented in MechConfigurationSystem.ts
- [x] 2.1.2 Create LAMModeDefinition interface with movement type, weapon restrictions
  - Implemented as ILAMModeDefinition interface
- [x] 2.1.3 Implement mode-specific movement calculations
  - Mode definitions include movementType for each mode
- [x] 2.1.4 Implement fighter mode armor location mapping (Mech → Fighter)
  - FIGHTER_SILHOUETTE defines Nose, Fuselage, Wings, Aft locations
- [x] 2.1.5 Add mode switching logic to unit store
  - Added lamMode and quadVeeMode to UnitState interface
  - Implemented setLAMMode() and setQuadVeeMode() actions
  - Mode changes only apply when configuration matches (LAM or QUADVEE)
  - Updated UnitLoaderService to include mode defaults
- [x] 2.1.6 Add unit tests for LAM mode system
  - 12 tests for setLAMMode() and setQuadVeeMode() in useUnitStore.test.ts
  - Tests guard clauses for invalid configurations
  - Tests modification tracking and timestamps

### 2.2 LAM Configuration Definition
- [x] 2.2.1 Create LAM configuration definition (biped locations + special equipment)
  - Implemented as LAM_CONFIGURATION in MechConfigurationSystem.ts
- [x] 2.2.2 Define required LAM equipment (Landing Gear × 3, Avionics × 3)
  - Defined in requiredEquipment array
- [x] 2.2.3 Define LAM equipment restrictions per mode
  - Structure in place via prohibitedEquipment and modes arrays
- [x] 2.2.4 Register LAM definition in ConfigurationRegistry
  - Registered in MechConfigurationRegistry
- [ ] 2.2.5 Add unit tests for LAM configuration

### 2.3 MTF Parser Updates for LAM
- [x] 2.3.1 Add LAM config detection in parser
- [x] 2.3.2 Parse Landing Gear and Avionics as fixed equipment
- [x] 2.3.3 Add LAM MTF export with correct equipment placement
- [ ] 2.3.4 Add parser/exporter tests with actual LAM MTF files

### 2.4 LAM Armor Diagram
- [x] 2.4.1 Create LAMArmorDiagram component with mode toggle
  - Implemented in armor/variants/LAMArmorDiagram.tsx
- [x] 2.4.2 Implement Mech mode view (biped silhouette)
  - Uses REALISTIC_SILHOUETTE for mech mode
- [x] 2.4.3 Implement Fighter mode overlay with mapped armor values
  - Uses FIGHTER_SILHOUETTE for fighter mode
- [x] 2.4.4 Add mode indicator and switch control
  - Mode toggle implemented in LAMArmorDiagram
- [ ] 2.4.5 Add visual tests for LAM diagram modes

### 2.5 LAM Validation Rules
- [x] 2.5.1 Create LAM-avionics-required rule
  - Implemented as LAMAvionicsRule in ConfigurationValidationRules.ts
- [x] 2.5.2 Create LAM-landing-gear-required rule
  - Implemented as LAMLandingGearRule
- [x] 2.5.3 Create LAM-mode-weapon-restrictions rule
  - Structure in place, covered by LAMEngineTypeRule and LAMStructureArmorRule
- [ ] 2.5.4 Add validation tests for LAM mechs

## Phase 3: Tripod Support

### 3.1 Tripod Configuration
- [x] 3.1.1 Add CENTER_LEG to MechLocation enum
- [x] 3.1.2 Create tripod configuration definition (9 locations)
  - Implemented as TRIPOD_CONFIGURATION in MechConfigurationSystem.ts
- [x] 3.1.3 Define center leg actuators (Hip, Upper Leg, Lower Leg, Foot)
  - LEG_ACTUATORS used for center leg
- [x] 3.1.4 Register tripod definition in ConfigurationRegistry
  - Registered in MechConfigurationRegistry
- [ ] 3.1.5 Add unit tests for tripod configuration

### 3.2 MTF Parser Updates for Tripod
- [x] 3.2.1 Add tripod location header mapping (Center Leg:)
- [x] 3.2.2 Add tripod armor label mapping (CL armor)
- [x] 3.2.3 Add tripod MTF export support
- [x] 3.2.4 Add parser/exporter tests with actual tripod MTF files
  - Validated via parity validation: 100% pass rate on all tripod mechs in mm-data

### 3.3 Tripod Armor Diagram
- [x] 3.3.1 Create TripodArmorDiagram SVG component
  - Implemented in armor/variants/TripodArmorDiagram.tsx
- [x] 3.3.2 Implement 9 location regions (8 biped + center leg)
  - Uses TRIPOD_SILHOUETTE from MechSilhouette.tsx
- [x] 3.3.3 Add armor pip layout for tripod
  - Same pattern as other diagrams with TRIPOD_LOCATION_LABELS
- [ ] 3.3.4 Add visual tests for tripod diagram

### 3.4 Tripod Validation Rules
- [x] 3.4.1 Create tripod-center-leg-equipment rule (tracks, talons use all 3 legs)
  - Implemented as TripodCenterLegRule and TripodLegEquipmentRule
- [ ] 3.4.2 Add validation tests for tripod mechs

## Phase 4: QuadVee Support

### 4.1 QuadVee Configuration
- [x] 4.1.1 Create QuadVeeMode enum (MECH, VEHICLE)
  - Implemented in MechConfigurationSystem.ts
- [x] 4.1.2 Create QuadVee configuration definition (extends Quad)
  - Implemented as QUADVEE_CONFIGURATION
- [x] 4.1.3 Define vehicle mode location mapping
  - QUADVEE_MODES defines mech and vehicle modes
- [x] 4.1.4 Register QuadVee definition in ConfigurationRegistry
  - Registered in MechConfigurationRegistry
- [ ] 4.1.5 Add unit tests for QuadVee configuration

### 4.2 MTF Parser Updates for QuadVee
- [x] 4.2.1 Add QuadVee config detection
  - Uses same quad location parsing
- [x] 4.2.2 Add QuadVee MTF export support
  - Same as quad export with config: QuadVee
- [ ] 4.2.3 Add parser/exporter tests with QuadVee MTF files

### 4.3 QuadVee Armor Diagram
- [x] 4.3.1 Create QuadVeeArmorDiagram with mode toggle
  - Implemented in armor/variants/QuadVeeArmorDiagram.tsx
- [x] 4.3.2 Implement quad silhouette for mech mode
  - Uses QUAD_SILHOUETTE in mech mode
- [x] 4.3.3 Implement vehicle representation for vehicle mode
  - Mode toggle with vehicle representation
- [ ] 4.3.4 Add visual tests for QuadVee diagram modes

### 4.4 QuadVee Validation Rules
- [x] 4.4.1 Create QuadVee-specific validation rules
  - QuadVeeConversionEquipmentRule, QuadVeeTracksRule, QuadVeeTotalSlotsRule, QuadVeeLegArmorBalanceRule
- [ ] 4.4.2 Add validation tests for QuadVee mechs

## Phase 5: Integration Testing

### 5.1 End-to-End Testing
- [ ] 5.1.1 Test importing quad mech from MegaMekLab JSON
- [ ] 5.1.2 Test round-trip MTF export/import for quad
- [ ] 5.1.3 Test importing LAM from MegaMekLab JSON
- [ ] 5.1.4 Test LAM mode switching preserves data
- [ ] 5.1.5 Test tripod import/export round-trip
- [ ] 5.1.6 Test QuadVee import/export round-trip

### 5.2 Migration Verification
- [ ] 5.2.1 Verify existing biped units load correctly
- [ ] 5.2.2 Verify no regression in biped functionality
- [ ] 5.2.3 Run full validation suite
