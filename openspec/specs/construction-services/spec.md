# construction-services Specification

## Purpose

TBD - created by archiving change add-service-layer. Update Purpose after archive.

## Requirements

### Requirement: Create Empty Mech

The system SHALL create a new empty mech shell with specified tonnage and tech base.

**Rationale**: Starting point for building a new custom mech from scratch.

**Priority**: Critical

#### Scenario: Create 75-ton IS mech

- **WHEN** MechBuilderService.createEmpty(75, TechBase.INNER_SPHERE) is called
- **THEN** return IEditableMech with tonnage = 75
- **AND** techBase = Inner Sphere
- **AND** default engine, gyro, cockpit, structure

#### Scenario: Create Clan mech

- **WHEN** createEmpty(50, TechBase.CLAN) is called
- **THEN** return IEditableMech with Clan defaults
- **AND** appropriate Clan equipment options

---

### Requirement: Create Mech from Template

The system SHALL create an editable mech from an existing unit definition.

**Rationale**: Users customize existing units rather than building from scratch.

**Priority**: Critical

#### Scenario: Load existing unit for editing

- **GIVEN** a valid IFullUnit (e.g., Warhammer WHM-6R)
- **WHEN** createFromUnit(unit) is called
- **THEN** return IEditableMech with all unit properties
- **AND** mech is ready for modification

---

### Requirement: Apply Changes

The system SHALL apply a set of changes to a mech immutably.

**Rationale**: Enables undo/redo and state management.

**Priority**: High

#### Scenario: Apply multiple changes

- **GIVEN** an editable mech
- **WHEN** applyChanges(mech, changes) is called
- **THEN** return new IEditableMech with changes applied
- **AND** original mech is unchanged

---

### Requirement: Set Engine

The system SHALL update the mech's engine type, with rating calculated from walk MP and tonnage.

**Rationale**: Engine rating is derived (Walk MP × Tonnage). Users set desired movement, not raw rating. The calculated rating is then validated per `engine-system` spec constraints (10-500, multiple of 5).

**Priority**: Critical

#### Scenario: Set XL engine with walk MP

- **GIVEN** an editable 75-ton mech
- **WHEN** setEngine(mech, "XL", 4) is called with walkMP = 4
- **THEN** calculate engine rating = 4 × 75 = 300
- **AND** return mech with XL engine rating 300
- **AND** engine weight calculated per XL formula
- **AND** side torso slots allocated

#### Scenario: Change engine type preserving movement

- **GIVEN** a mech with Standard engine and 4 Walk MP
- **WHEN** setEngine(mech, "XL") is called without walkMP
- **THEN** preserve current Walk MP
- **AND** recalculate engine weight for XL type

#### Scenario: Invalid walk MP

- **GIVEN** an editable 100-ton mech
- **WHEN** setEngine(mech, "Standard", 6) is called (rating would be 600, exceeds max 400)
- **THEN** throw validation error "Engine rating 600 exceeds maximum 400"

---

### Requirement: Set Armor Allocation

The system SHALL update armor points per location.

**Rationale**: Armor distribution is a key construction decision.

**Priority**: Critical

#### Scenario: Allocate armor

- **GIVEN** an editable mech with sufficient armor tonnage
- **WHEN** setArmor(mech, { head: 9, centerTorso: 40, ... }) is called
- **THEN** return mech with specified armor values

#### Scenario: Exceed maximum armor

- **GIVEN** an editable mech
- **WHEN** setArmor with values exceeding location maximums
- **THEN** throw validation error

---

### Requirement: Add Equipment

The system SHALL add equipment to a specified location.

**Rationale**: Core operation for mech customization.

**Priority**: Critical

#### Scenario: Add weapon to arm

- **GIVEN** an editable mech with available arm slots
- **WHEN** addEquipment(mech, "weapon-medium-laser-is", "leftArm") is called
- **THEN** return mech with Medium Laser in left arm

#### Scenario: Insufficient slots

- **GIVEN** an editable mech with full location
- **WHEN** addEquipment to full location is called
- **THEN** throw error indicating insufficient slots

---

### Requirement: Remove Equipment

The system SHALL remove equipment from a mech.

**Rationale**: Users need to adjust equipment loadouts.

**Priority**: High

#### Scenario: Remove equipment

- **GIVEN** a mech with equipment at slot index 5
- **WHEN** removeEquipment(mech, 5) is called
- **THEN** return mech with that equipment removed

---

### Requirement: Validate Mech Build

The system SHALL validate an entire mech build against construction rules.

**Rationale**: Users need feedback on whether their build is legal.

**Priority**: Critical

#### Scenario: Valid build

- **GIVEN** a legal mech build
- **WHEN** ValidationService.validate(mech) is called
- **THEN** return IValidationResult with errors = []

#### Scenario: Overweight build

- **GIVEN** a mech exceeding weight limit
- **WHEN** validate(mech) is called
- **THEN** return error: "Mech exceeds maximum tonnage"

#### Scenario: Multiple errors

- **GIVEN** a mech with multiple issues
- **WHEN** validate(mech) is called
- **THEN** return all applicable errors and warnings

---

### Requirement: Validate Weight Budget

The system SHALL validate that equipment weight doesn't exceed available tonnage.

**Rationale**: Core construction constraint.

**Priority**: Critical

#### Scenario: Within budget

- **GIVEN** a mech with 2 tons remaining
- **WHEN** validateWeight(mech) is called
- **THEN** return no errors

#### Scenario: Overweight

- **GIVEN** a mech exceeding tonnage by 1.5 tons
- **WHEN** validateWeight(mech) is called
- **THEN** return error with exact overage amount

---

### Requirement: Validate Armor Limits

The system SHALL validate armor doesn't exceed location maximums.

**Rationale**: Each location has maximum armor based on structure.

**Priority**: Critical

#### Scenario: Valid armor

- **GIVEN** a mech with armor within limits
- **WHEN** validateArmor(mech) is called
- **THEN** return no errors

#### Scenario: Excess head armor

- **GIVEN** a mech with 10 points head armor (max 9)
- **WHEN** validateArmor(mech) is called
- **THEN** return error: "Head armor exceeds maximum of 9"

---

### Requirement: Validate Critical Slots

The system SHALL validate equipment fits in available critical slots.

**Rationale**: Each location has limited slot capacity.

**Priority**: Critical

#### Scenario: Slots available

- **GIVEN** a location with 6 available slots and 4-slot equipment
- **WHEN** validateCriticalSlots(mech) is called
- **THEN** return no errors

#### Scenario: Slots exceeded

- **GIVEN** a location with more equipment than slots
- **WHEN** validateCriticalSlots(mech) is called
- **THEN** return error indicating the overflow

---

### Requirement: Check Equipment Addable

The system SHALL check if specific equipment can be added to a location.

**Rationale**: Pre-validation before showing equipment options.

**Priority**: High

#### Scenario: Equipment fits

- **GIVEN** valid location with available slots
- **WHEN** canAddEquipment(mech, equipmentId, location) is called
- **THEN** return true

#### Scenario: Equipment doesn't fit

- **GIVEN** insufficient slots or incompatible location
- **WHEN** canAddEquipment(mech, equipmentId, location) is called
- **THEN** return false

---

### Requirement: Calculate Totals

The system SHALL calculate all derived values for a mech.

**Rationale**: Summary data for display.

**Priority**: High

#### Scenario: Calculate mech totals

- **WHEN** CalculationService.calculateTotals(mech) is called
- **THEN** return IMechTotals with totalWeight, remainingWeight, armorPoints, criticalSlots

---

### Requirement: Calculate Battle Value

The system SHALL calculate the Battle Value of a mech using BV2 formula.

**Rationale**: BV is the primary balancing metric for gameplay.

**Priority**: High

#### Scenario: Calculate BV with all components

- **GIVEN** a complete mech build with weapons, armor, and heat sinks
- **WHEN** calculateBattleValue(mech) is called
- **THEN** defensive BV SHALL be calculated from armor and structure
- **AND** offensive BV SHALL be calculated from weapon BV values
- **AND** heat adjustment SHALL be applied to offensive BV
- **AND** speed factor SHALL be applied based on TMM
- **AND** return numeric BV calculated per BV2 formula

#### Scenario: Calculate BV before registry initialization

- **GIVEN** equipment registry is not yet initialized
- **WHEN** calculateBattleValue(mech) is called
- **THEN** offensive BV SHALL be 0
- **AND** defensive BV SHALL still be calculated
- **AND** registry initialization SHALL be triggered
- **AND** BV SHALL recalculate when registry becomes ready

#### Scenario: Defensive BV calculation

- **GIVEN** a mech with armor allocation and structure
- **WHEN** calculating defensive BV
- **THEN** armor BV SHALL equal total armor points × 2.5
- **AND** structure BV SHALL equal total structure points × 1.5
- **AND** total defensive BV SHALL equal armor BV + structure BV

#### Scenario: Offensive BV calculation

- **GIVEN** a mech with weapons in equipment array
- **WHEN** calculating offensive BV
- **THEN** each weapon BV SHALL be looked up from equipment registry
- **AND** ammunition BV SHALL be included
- **AND** total offensive BV SHALL be sum of all equipment BV values

---

### Requirement: Calculate Cost

The system SHALL calculate the C-Bill cost of a mech.

**Rationale**: Cost tracking for campaign play.

**Priority**: Medium

#### Scenario: Calculate cost

- **GIVEN** a complete mech build
- **WHEN** calculateCost(mech) is called
- **THEN** return total C-Bill cost

---

### Requirement: Calculate Heat Profile

The system SHALL analyze heat generation vs dissipation using registry lookup.

**Rationale**: Heat management is critical for mech effectiveness.

**Priority**: High

#### Scenario: Calculate heat profile with registry

- **GIVEN** a mech with weapons and heat sinks
- **AND** equipment registry is initialized
- **WHEN** calculateHeatProfile(mech) is called
- **THEN** heat generated SHALL be sum of weapon heat values from registry
- **AND** heat dissipated SHALL be heat sink count × dissipation per sink
- **AND** return IHeatProfile with heatGenerated, heatDissipated, netHeat, alphaStrikeHeat

#### Scenario: Calculate heat profile before registry ready

- **GIVEN** equipment registry is not initialized
- **WHEN** calculateHeatProfile(mech) is called
- **THEN** heat generated SHALL be 0
- **AND** heat dissipated SHALL still be calculated
- **AND** registry initialization SHALL be triggered asynchronously

---

### Requirement: Calculate Movement Profile

The system SHALL calculate movement points.

**Rationale**: Movement determines tactical options.

**Priority**: High

#### Scenario: Calculate movement

- **GIVEN** a mech with engine and optional jump jets
- **WHEN** calculateMovement(mech) is called
- **THEN** return IMovementProfile with walkMP, runMP, jumpMP

---

### Requirement: Service Initialization

Browser services SHALL be initialized on application mount.

**Rationale**: Equipment registry must be ready before calculations can succeed.

**Priority**: Critical

#### Scenario: Browser service initialization

- **WHEN** application mounts in browser
- **THEN** IndexedDBService SHALL be initialized
- **AND** EquipmentRegistry SHALL be initialized
- **AND** components SHALL be notified when initialization completes

---
