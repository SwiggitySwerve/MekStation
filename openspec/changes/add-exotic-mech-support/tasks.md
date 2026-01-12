# Tasks: Add Exotic Mech Configuration Support

## Phase 1: Foundation + Quad Support

### 1.1 Configuration Registry Foundation
- [ ] 1.1.1 Create `MechConfigurationDefinition` interface in `src/types/construction/`
- [ ] 1.1.2 Create `LocationDefinition` interface with slot counts, max armor calculations
- [ ] 1.1.3 Create `ActuatorDefinition` interface with slot positions and removability
- [ ] 1.1.4 Create `ConfigurationRegistry` class with definition lookup methods
- [ ] 1.1.5 Extract biped configuration from existing hardcoded values into definition
- [ ] 1.1.6 Add unit tests for ConfigurationRegistry

### 1.2 MechLocation Enum Expansion
- [ ] 1.2.1 Add quad locations to MechLocation enum (FRONT_LEFT_LEG, FRONT_RIGHT_LEG, REAR_LEFT_LEG, REAR_RIGHT_LEG)
- [ ] 1.2.2 Add `getLocationsForConfig(config)` helper function
- [ ] 1.2.3 Add `getLocationDisplayName(location, config)` helper (e.g., "Front Left Leg" vs "Left Arm")
- [ ] 1.2.4 Update location-dependent utilities to use configuration-aware helpers
- [ ] 1.2.5 Add unit tests for location helpers

### 1.3 Quad Configuration Definition
- [ ] 1.3.1 Create quad configuration definition (8 locations, all with leg actuators)
- [ ] 1.3.2 Define quad actuator layout (Hip, Upper Leg, Lower Leg, Foot × 4)
- [ ] 1.3.3 Define quad equipment restrictions (no hand weapons, turret rules)
- [ ] 1.3.4 Register quad definition in ConfigurationRegistry
- [ ] 1.3.5 Add unit tests for quad configuration

### 1.4 MTF Parser Updates for Quad
- [ ] 1.4.1 Add configuration-specific location header mappings to parser
- [ ] 1.4.2 Add quad armor label mappings (FLL, FRL, RLL, RRL)
- [ ] 1.4.3 Update parser to read Config: line before location parsing
- [ ] 1.4.4 Add quad MTF export support with correct location names
- [ ] 1.4.5 Add parser/exporter tests with actual quad MTF files from mm-data

### 1.5 Quad Armor Diagram
- [ ] 1.5.1 Create QuadArmorDiagram SVG component with 4-legged silhouette
- [ ] 1.5.2 Implement location regions for Head, CT, LT, RT, FLL, FRL, RLL, RRL
- [ ] 1.5.3 Add armor pip layout for quad locations
- [ ] 1.5.4 Create diagram selector that switches based on unit configuration
- [ ] 1.5.5 Integrate diagram selector into ArmorTab
- [ ] 1.5.6 Add visual regression tests for quad diagram

### 1.6 Quad Validation Rules
- [ ] 1.6.1 Add `appliesTo` field to validation rule interface
- [ ] 1.6.2 Create quad-no-hand-actuators rule
- [ ] 1.6.3 Create quad-no-hand-weapons rule (hatchets, swords, claws)
- [ ] 1.6.4 Create quad-turret-mounting rule for rear-facing weapons
- [ ] 1.6.5 Update validation orchestrator to filter rules by configuration
- [ ] 1.6.6 Add validation rule tests for quad mechs

## Phase 2: LAM Support

### 2.1 LAM Mode System
- [ ] 2.1.1 Create LAMMode enum (MECH, AIRMECH, FIGHTER)
- [ ] 2.1.2 Create LAMModeDefinition interface with movement type, weapon restrictions
- [ ] 2.1.3 Implement mode-specific movement calculations
- [ ] 2.1.4 Implement fighter mode armor location mapping (Mech → Fighter)
- [ ] 2.1.5 Add mode switching logic to unit store
- [ ] 2.1.6 Add unit tests for LAM mode system

### 2.2 LAM Configuration Definition
- [ ] 2.2.1 Create LAM configuration definition (biped locations + special equipment)
- [ ] 2.2.2 Define required LAM equipment (Landing Gear × 3, Avionics × 3)
- [ ] 2.2.3 Define LAM equipment restrictions per mode
- [ ] 2.2.4 Register LAM definition in ConfigurationRegistry
- [ ] 2.2.5 Add unit tests for LAM configuration

### 2.3 MTF Parser Updates for LAM
- [ ] 2.3.1 Add LAM config detection in parser
- [ ] 2.3.2 Parse Landing Gear and Avionics as fixed equipment
- [ ] 2.3.3 Add LAM MTF export with correct equipment placement
- [ ] 2.3.4 Add parser/exporter tests with actual LAM MTF files

### 2.4 LAM Armor Diagram
- [ ] 2.4.1 Create LAMArmorDiagram component with mode toggle
- [ ] 2.4.2 Implement Mech mode view (biped silhouette)
- [ ] 2.4.3 Implement Fighter mode overlay with mapped armor values
- [ ] 2.4.4 Add mode indicator and switch control
- [ ] 2.4.5 Add visual tests for LAM diagram modes

### 2.5 LAM Validation Rules
- [ ] 2.5.1 Create LAM-avionics-required rule
- [ ] 2.5.2 Create LAM-landing-gear-required rule
- [ ] 2.5.3 Create LAM-mode-weapon-restrictions rule
- [ ] 2.5.4 Add validation tests for LAM mechs

## Phase 3: Tripod Support

### 3.1 Tripod Configuration
- [ ] 3.1.1 Add CENTER_LEG to MechLocation enum
- [ ] 3.1.2 Create tripod configuration definition (9 locations)
- [ ] 3.1.3 Define center leg actuators (Hip, Upper Leg, Lower Leg, Foot)
- [ ] 3.1.4 Register tripod definition in ConfigurationRegistry
- [ ] 3.1.5 Add unit tests for tripod configuration

### 3.2 MTF Parser Updates for Tripod
- [ ] 3.2.1 Add tripod location header mapping (Center Leg:)
- [ ] 3.2.2 Add tripod armor label mapping (CL armor)
- [ ] 3.2.3 Add tripod MTF export support
- [ ] 3.2.4 Add parser/exporter tests with actual tripod MTF files

### 3.3 Tripod Armor Diagram
- [ ] 3.3.1 Create TripodArmorDiagram SVG component
- [ ] 3.3.2 Implement 9 location regions (8 biped + center leg)
- [ ] 3.3.3 Add armor pip layout for tripod
- [ ] 3.3.4 Add visual tests for tripod diagram

### 3.4 Tripod Validation Rules
- [ ] 3.4.1 Create tripod-center-leg-equipment rule (tracks, talons use all 3 legs)
- [ ] 3.4.2 Add validation tests for tripod mechs

## Phase 4: QuadVee Support

### 4.1 QuadVee Configuration
- [ ] 4.1.1 Create QuadVeeMode enum (MECH, VEHICLE)
- [ ] 4.1.2 Create QuadVee configuration definition (extends Quad)
- [ ] 4.1.3 Define vehicle mode location mapping
- [ ] 4.1.4 Register QuadVee definition in ConfigurationRegistry
- [ ] 4.1.5 Add unit tests for QuadVee configuration

### 4.2 MTF Parser Updates for QuadVee
- [ ] 4.2.1 Add QuadVee config detection
- [ ] 4.2.2 Add QuadVee MTF export support
- [ ] 4.2.3 Add parser/exporter tests with QuadVee MTF files

### 4.3 QuadVee Armor Diagram
- [ ] 4.3.1 Create QuadVeeArmorDiagram with mode toggle
- [ ] 4.3.2 Implement quad silhouette for mech mode
- [ ] 4.3.3 Implement vehicle representation for vehicle mode
- [ ] 4.3.4 Add visual tests for QuadVee diagram modes

### 4.4 QuadVee Validation Rules
- [ ] 4.4.1 Create QuadVee-specific validation rules
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
