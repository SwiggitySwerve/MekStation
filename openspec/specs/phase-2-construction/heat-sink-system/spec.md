# Heat Sink System Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2025-11-27
**Dependencies**: Core Entity Types, Physical Properties System, Engine System, Gyro System
**Affects**: Unit construction, heat management, critical slot allocation, weight calculation

---

## Overview

### Purpose
Defines the heat sink system for BattleMechs, including heat sink types, engine integration rules, critical slot placement, and thermal management calculations. Establishes the rules for how heat sinks dissipate heat, integrate with engines, and occupy critical space.

### Scope
**In Scope:**
- Heat sink type definitions (Single, Double IS/Clan, Compact, Laser)
- Engine integration capacity calculation (rating / 25)
- Critical slot placement rules for engine-mounted vs external heat sinks
- Weight calculations for different heat sink types
- Heat dissipation formulas
- Minimum heat sink requirements (10 total)
- Tech base variants and availability by era
- Placement restrictions and location rules

**Out of Scope:**
- Heat generation from weapons (covered in Weapon System spec)
- Heat effects on movement and combat (covered in Game Mechanics spec)
- Coolant pod systems (covered in Equipment System spec)
- Heat sink damage and critical hits (covered in Damage System spec)

### Key Concepts
- **Engine-Mounted Heat Sinks**: Heat sinks integrated into the engine, taking no additional critical slots beyond engine slots
- **External Heat Sinks**: Heat sinks placed outside the engine, requiring critical slots in mech locations
- **Engine Integration Capacity**: Maximum number of heat sinks that can be integrated into an engine (floor(engine rating / 25), max 10)
- **Heat Dissipation**: Amount of heat removed per turn per heat sink (1 for Single, 2 for Double)
- **Minimum Heat Sink Requirement**: All BattleMechs must have at least 10 heat sinks total

---

## Requirements

### Requirement: Heat Sink Type Classification
All heat sinks SHALL be classified into one of five types with distinct characteristics.

**Rationale**: Different heat sink technologies provide different thermal management capabilities, weight, and slot requirements. Type classification enables proper calculation and validation.

**Priority**: Critical

#### Scenario: Single Heat Sink definition
**GIVEN** a heat sink component is defined
**WHEN** the type is "Single"
**THEN** it SHALL dissipate 1 heat per turn
**AND** it SHALL weigh 1 ton
**AND** it SHALL require 1 critical slot when external
**AND** it SHALL require 0 additional slots when engine-mounted
**AND** it SHALL be available to both Inner Sphere and Clan

#### Scenario: Double Heat Sink Inner Sphere definition
**GIVEN** a heat sink component is defined
**WHEN** the type is "Double (IS)"
**THEN** it SHALL dissipate 2 heat per turn
**AND** it SHALL weigh 1 ton
**AND** it SHALL require 3 critical slots when external
**AND** it SHALL require 0 additional slots when engine-mounted
**AND** it SHALL be available only to Inner Sphere tech base
**AND** it SHALL have introduction year 3050

#### Scenario: Double Heat Sink Clan definition
**GIVEN** a heat sink component is defined
**WHEN** the type is "Double (Clan)"
**THEN** it SHALL dissipate 2 heat per turn
**AND** it SHALL weigh 1 ton
**AND** it SHALL require 2 critical slots when external
**AND** it SHALL require 0 additional slots when engine-mounted
**AND** it SHALL be available only to Clan tech base
**AND** it SHALL have introduction year 2828

#### Scenario: Compact Heat Sink definition
**GIVEN** a heat sink component is defined
**WHEN** the type is "Compact"
**THEN** it SHALL dissipate 1 heat per turn
**AND** it SHALL weigh 1.5 tons
**AND** it SHALL require 1 critical slot
**AND** it SHALL NOT be engine-mountable (always external)

#### Scenario: Laser Heat Sink definition
**GIVEN** a heat sink component is defined
**WHEN** the type is "Laser"
**THEN** it SHALL dissipate 1 heat per turn
**AND** it SHALL weigh 1 ton
**AND** it SHALL require 1 critical slot
**AND** it SHALL only dissipate heat from laser weapons

### Requirement: Engine Integration Capacity
The number of heat sinks that can be integrated into an engine SHALL be calculated based on engine rating only.

**Rationale**: BattleTech construction rules specify that engine rating determines heat sink integration capacity, not engine type (except for special engine types that cannot integrate heat sinks).

**Priority**: Critical

#### Scenario: Standard engine integration calculation
**GIVEN** an engine with rating R
**WHEN** the engine type is Standard Fusion
**THEN** integrated heat sink capacity SHALL be floor(R / 25)
**AND** capacity SHALL NOT exceed 10 heat sinks
**AND** capacity SHALL NOT have any artificial minimum

#### Scenario: XL engine integration (same as standard)
**GIVEN** an engine with rating 300
**WHEN** the engine type is XL (Inner Sphere or Clan)
**THEN** integrated heat sink capacity SHALL be floor(300 / 25) = 12
**AND** this SHALL be capped at maximum 10
**AND** result SHALL be 10 heat sinks (not reduced due to XL type)

#### Scenario: Light engine integration (same as standard)
**GIVEN** an engine with rating 175
**WHEN** the engine type is Light Fusion
**THEN** integrated heat sink capacity SHALL be floor(175 / 25) = 7
**AND** there SHALL be no reduction due to Light engine type

#### Scenario: Compact engine cannot integrate
**GIVEN** an engine with rating 250
**WHEN** the engine type is Compact
**THEN** integrated heat sink capacity SHALL be 0
**AND** all heat sinks MUST be external

#### Scenario: ICE engine cannot integrate
**GIVEN** an engine with rating 200
**WHEN** the engine type is ICE (Internal Combustion)
**THEN** integrated heat sink capacity SHALL be 0
**AND** all heat sinks MUST be external

#### Scenario: Fuel Cell engine cannot integrate
**GIVEN** an engine with rating 180
**WHEN** the engine type is Fuel Cell
**THEN** integrated heat sink capacity SHALL be 0
**AND** all heat sinks MUST be external

#### Scenario: Small engine low capacity
**GIVEN** an engine with rating 100
**WHEN** calculating integration capacity
**THEN** capacity SHALL be floor(100 / 25) = 4
**AND** there SHALL be no artificial minimum
**AND** the mech still requires 10 total heat sinks (6 external)

### Requirement: Minimum Heat Sink Count
All BattleMechs SHALL have a minimum of 10 total heat sinks.

**Rationale**: BattleTech construction rules require at least 10 heat sinks for proper mech operation and thermal management.

**Priority**: Critical

#### Scenario: Sufficient heat sinks
**GIVEN** a mech configuration
**WHEN** total heat sinks equals or exceeds 10
**THEN** validation SHALL pass
**AND** no error SHALL be raised

#### Scenario: Insufficient heat sinks
**GIVEN** a mech configuration
**WHEN** total heat sinks is less than 10
**THEN** validation SHALL fail
**AND** error message SHALL be "Unit must have at least 10 heat sinks"
**AND** recommended action SHALL indicate how many more needed

#### Scenario: Small engine requiring external heat sinks
**GIVEN** an engine with rating 100 (4 integrated heat sinks)
**WHEN** calculating minimum requirements
**THEN** 6 external heat sinks SHALL be required
**AND** total heat sinks SHALL be 10 minimum

### Requirement: Critical Slot Placement for Engine-Mounted Heat Sinks
Engine-mounted heat sinks SHALL occupy Center Torso slots immediately after gyro slots.

**Rationale**: Heat sinks integrated into the engine are placed in the Center Torso after the engine core and gyroscope, before any other equipment.

**Priority**: Critical

#### Scenario: Standard engine with standard gyro and heat sinks
**GIVEN** a Standard Fusion engine occupying CT slots 1-6
**AND** a Standard Gyro occupying CT slots 7-10
**WHEN** 10 heat sinks are engine-mounted
**THEN** heat sink slots SHALL start at CT slot 11
**AND** heat sinks SHALL occupy CT slots 11-12 (2 slots for 10 SHS or DHS)
**AND** remaining slots 1-12 in CT are fully occupied

#### Scenario: Compact gyro creating more space
**GIVEN** a Standard Fusion engine occupying CT slots 1-6
**AND** a Compact Gyro occupying CT slots 7-8
**WHEN** 10 heat sinks are engine-mounted
**THEN** heat sink slots SHALL start at CT slot 9
**AND** more CT slots remain available after heat sinks

#### Scenario: XL Gyro reducing available space
**GIVEN** a Standard Fusion engine occupying CT slots 1-6
**AND** an XL Gyro occupying CT slots 7-12
**WHEN** 10 heat sinks are engine-mounted
**THEN** all CT slots are used by engine + gyro
**AND** heat sinks must be tracked but take no additional CT slots
**AND** this configuration is valid

#### Scenario: Double Heat Sinks engine-mounted take no extra slots
**GIVEN** 10 Double Heat Sinks (IS or Clan)
**WHEN** all 10 are engine-mounted
**THEN** they SHALL take 0 additional critical slots
**AND** they are considered part of engine integration
**AND** only external DHS require 3 slots (IS) or 2 slots (Clan)

### Requirement: Critical Slot Placement for External Heat Sinks
External heat sinks SHALL require critical slots based on type and can be placed in any location.

**Rationale**: Heat sinks not integrated into the engine require critical slot space and can be distributed across the mech for weight balance and redundancy.

**Priority**: Critical

#### Scenario: External Single Heat Sinks
**GIVEN** 5 external Single Heat Sinks
**WHEN** placing in mech locations
**THEN** each SHALL require 1 critical slot
**AND** they MAY be placed in any location (CT, LT, RT, LA, RA, LL, RL)
**AND** total slots required SHALL be 5

#### Scenario: External Double Heat Sinks (Inner Sphere)
**GIVEN** 3 external Double Heat Sinks (IS)
**WHEN** placing in mech locations
**THEN** each SHALL require 3 critical slots
**AND** they MAY be placed in any location
**AND** total slots required SHALL be 9

#### Scenario: External Double Heat Sinks (Clan)
**GIVEN** 4 external Double Heat Sinks (Clan)
**WHEN** placing in mech locations
**THEN** each SHALL require 2 critical slots
**AND** they MAY be placed in any location
**AND** total slots required SHALL be 8

#### Scenario: Mixed placement locations
**GIVEN** 12 external heat sinks to place
**WHEN** distributing across locations
**THEN** 2 MAY be placed in each leg (LL, RL)
**AND** 4 MAY be placed in each side torso (LT, RT)
**AND** 2 MAY be placed in Center Torso
**AND** arms MAY also contain heat sinks
**AND** placement is valid as long as slot limits are respected

### Requirement: Weight Calculation
Heat sink weight SHALL be calculated based on type and count of external heat sinks only.

**Rationale**: Engine-mounted heat sinks are included in the engine's weight. Only external heat sinks add additional weight to the mech.

**Priority**: Critical

#### Scenario: Single Heat Sinks weight
**GIVEN** 8 external Single Heat Sinks
**WHEN** calculating weight
**THEN** weight per heat sink SHALL be 1.0 ton
**AND** total weight SHALL be 8.0 tons

#### Scenario: Double Heat Sinks weight (IS and Clan same)
**GIVEN** 5 external Double Heat Sinks
**WHEN** calculating weight
**THEN** weight per heat sink SHALL be 1.0 ton
**AND** total weight SHALL be 5.0 tons
**AND** tech base (IS vs Clan) SHALL NOT affect weight

#### Scenario: Compact Heat Sinks weight
**GIVEN** 4 external Compact Heat Sinks
**WHEN** calculating weight
**THEN** weight per heat sink SHALL be 1.5 tons
**AND** total weight SHALL be 6.0 tons

#### Scenario: Engine-mounted heat sinks no additional weight
**GIVEN** 10 engine-mounted heat sinks
**WHEN** calculating heat sink weight
**THEN** additional weight SHALL be 0 tons
**AND** weight is included in engine weight calculation

### Requirement: Heat Dissipation Calculation
Total heat dissipation SHALL be calculated based on heat sink count and type.

**Rationale**: Heat dissipation determines how much heat the mech can safely dissipate per turn, critical for weapon loadout and sustained combat.

**Priority**: Critical

#### Scenario: Single Heat Sinks dissipation
**GIVEN** 15 Single Heat Sinks total
**WHEN** calculating heat dissipation
**THEN** dissipation per heat sink SHALL be 1 heat/turn
**AND** total dissipation SHALL be 15 heat/turn

#### Scenario: Double Heat Sinks dissipation
**GIVEN** 12 Double Heat Sinks (IS or Clan)
**WHEN** calculating heat dissipation
**THEN** dissipation per heat sink SHALL be 2 heat/turn
**AND** total dissipation SHALL be 24 heat/turn

#### Scenario: Mixed integration same dissipation
**GIVEN** 10 engine-mounted Double Heat Sinks
**AND** 5 external Double Heat Sinks
**WHEN** calculating heat dissipation
**THEN** total count SHALL be 15 heat sinks
**AND** each SHALL dissipate 2 heat/turn
**AND** total dissipation SHALL be 30 heat/turn
**AND** location (engine vs external) SHALL NOT affect dissipation rate

### Requirement: Tech Base Availability
Heat sink types SHALL have tech base restrictions and temporal availability.

**Rationale**: Different heat sink technologies were developed by different factions at different times, affecting their availability in construction.

**Priority**: High

#### Scenario: Single Heat Sinks universal availability
**GIVEN** any tech base (IS, Clan, or Mixed)
**WHEN** selecting heat sink type
**THEN** Single Heat Sinks SHALL always be available
**AND** they have no era restrictions
**AND** they are available from introduction of BattleMechs (2439)

#### Scenario: Double Heat Sinks IS availability
**GIVEN** Inner Sphere tech base
**WHEN** era is 3050 or later
**THEN** Double Heat Sinks (IS) SHALL be available
**AND** before 3050 they SHALL NOT be available
**AND** during Jihad/Dark Age (3067-3085) they MAY have limited availability

#### Scenario: Double Heat Sinks Clan availability
**GIVEN** Clan tech base
**WHEN** era is 2828 or later (for Clans)
**THEN** Double Heat Sinks (Clan) SHALL be available
**AND** they are considered standard Clan technology

#### Scenario: Mixed tech heat sink selection
**GIVEN** Mixed tech base unit
**WHEN** selecting heat sink type
**THEN** unit MAY use Double Heat Sinks (IS)
**OR** unit MAY use Double Heat Sinks (Clan)
**AND** mixing IS and Clan DHS in same unit is NOT allowed
**AND** all heat sinks must be same type

---

## Data Model Requirements

### Required Interfaces

```typescript
/**
 * Heat sink type enumeration
 */
enum HeatSinkType {
  SINGLE = 'Single',
  DOUBLE_IS = 'Double (IS)',
  DOUBLE_CLAN = 'Double (Clan)',
  COMPACT = 'Compact',
  LASER = 'Laser'
}

/**
 * Heat sink component interface
 * Extends base entity interfaces with heat-specific properties
 */
interface IHeatSink extends
  ITechBaseEntity,
  IPlaceableComponent,
  IValuedComponent,
  ITemporalEntity {
  /**
   * Type of heat sink
   */
  readonly heatSinkType: HeatSinkType;

  /**
   * Heat dissipation per turn
   * Single: 1, Double: 2, Compact: 1, Laser: 1
   * @minimum 1
   */
  readonly dissipation: number;

  /**
   * Can this heat sink be mounted in engine
   * Single/Double: true, Compact/Laser: false
   */
  readonly engineMountable: boolean;

  /**
   * Critical slots when external
   * Single: 1, Double (IS): 3, Double (Clan): 2, Compact: 1, Laser: 1
   */
  readonly criticalSlots: number;

  /**
   * Weight per heat sink in tons
   * Most: 1.0, Compact: 1.5
   */
  readonly weight: number;
}

/**
 * Heat sink configuration for a unit
 */
interface IHeatSinkConfiguration {
  /**
   * Type of heat sink used by this unit
   * All heat sinks on a unit must be the same type
   */
  readonly heatSinkType: HeatSinkType;

  /**
   * Total number of heat sinks on the unit
   * @minimum 10
   */
  readonly totalCount: number;

  /**
   * Number of heat sinks integrated into engine
   * Calculated as min(floor(engineRating / 25), 10)
   * 0 for Compact, ICE, Fuel Cell engines
   */
  readonly engineIntegrated: number;

  /**
   * Number of external heat sinks requiring critical slots
   * Calculated as totalCount - engineIntegrated
   * @minimum 0
   */
  readonly externalCount: number;

  /**
   * Total heat dissipation per turn
   * Calculated as totalCount * dissipation
   */
  readonly totalDissipation: number;

  /**
   * Weight of external heat sinks only
   * Engine-integrated weight is part of engine weight
   */
  readonly externalWeight: number;

  /**
   * Critical slots used by external heat sinks
   * Varies by type: Single/Compact: 1, Double (IS): 3, Double (Clan): 2
   */
  readonly externalSlots: number;
}

/**
 * Heat sink placement in critical slots
 */
interface IHeatSinkPlacement {
  /**
   * Heat sink being placed
   */
  readonly heatSink: IHeatSink;

  /**
   * Is this heat sink engine-integrated
   */
  readonly engineIntegrated: boolean;

  /**
   * Location where heat sink is placed
   * For engine-integrated: always CENTER_TORSO
   * For external: any valid location
   */
  readonly location: MechLocation;

  /**
   * Critical slot index(es) occupied
   * Engine-integrated: slots after gyro (11-12 typically)
   * External: allocated slots in location
   */
  readonly slotIndices: number[];
}
```

### Required Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `heatSinkType` | `HeatSinkType` | Yes | Type of heat sink | SINGLE, DOUBLE_IS, DOUBLE_CLAN, COMPACT, LASER | - |
| `dissipation` | `number` | Yes | Heat per turn | 1 (Single/Compact/Laser), 2 (Double) | - |
| `engineMountable` | `boolean` | Yes | Can integrate in engine | true (Single/Double), false (Compact/Laser) | - |
| `criticalSlots` | `number` | Yes | Slots when external | 1, 2, or 3 | - |
| `weight` | `number` | Yes | Weight per unit in tons | 1.0 or 1.5 | - |
| `totalCount` | `number` | Yes | Total heat sinks | >= 10 | - |
| `engineIntegrated` | `number` | Yes | Engine-mounted count | 0 to 10 | - |
| `externalCount` | `number` | Yes | External count | >= 0 | - |
| `totalDissipation` | `number` | Yes | Total heat/turn | totalCount * dissipation | - |
| `externalWeight` | `number` | Yes | External HS weight | externalCount * weight | - |
| `externalSlots` | `number` | Yes | External HS slots | externalCount * criticalSlots | - |

### Type Constraints

- `heatSinkType` MUST be one of the five defined types
- `dissipation` MUST be 1 or 2
- `totalCount` MUST be >= 10
- `engineIntegrated` MUST be >= 0 and <= 10
- `engineIntegrated` MUST be <= totalCount
- `externalCount` MUST equal totalCount - engineIntegrated
- All heat sinks on a unit MUST be the same type
- `criticalSlots` for Double (IS) MUST be 3
- `criticalSlots` for Double (Clan) MUST be 2
- `criticalSlots` for Single/Compact/Laser MUST be 1
- `weight` for Compact MUST be 1.5, others MUST be 1.0

---

## Calculation Formulas

### Engine Integration Capacity

**Formula**:
```
engineIntegrationCapacity =
  IF engineType IN ['Compact', 'ICE', 'Fuel Cell'] THEN 0
  ELSE MIN(10, FLOOR(engineRating / 25))
```

**Where**:
- `engineType` = Type of engine (Standard, XL, Light, Compact, ICE, Fuel Cell, etc.)
- `engineRating` = Engine rating number (100-400 typical)
- `FLOOR()` = Round down to nearest integer
- `MIN()` = Take minimum of two values

**Example 1**:
```
Input: engineRating = 300, engineType = 'Standard Fusion'
Calculation:
  Step 1: Check engine type - Standard Fusion can integrate heat sinks
  Step 2: FLOOR(300 / 25) = FLOOR(12) = 12
  Step 3: MIN(10, 12) = 10
Output: engineIntegrationCapacity = 10 heat sinks
```

**Example 2**:
```
Input: engineRating = 175, engineType = 'Light Fusion'
Calculation:
  Step 1: Check engine type - Light Fusion can integrate heat sinks
  Step 2: FLOOR(175 / 25) = FLOOR(7) = 7
  Step 3: MIN(10, 7) = 7
Output: engineIntegrationCapacity = 7 heat sinks
```

**Example 3**:
```
Input: engineRating = 250, engineType = 'Compact'
Calculation:
  Step 1: Check engine type - Compact cannot integrate heat sinks
  Step 2: Return 0 immediately
Output: engineIntegrationCapacity = 0 heat sinks
```

**Special Cases**:
- When `engineType` is Compact: capacity = 0 (cannot integrate)
- When `engineType` is ICE: capacity = 0 (cannot integrate)
- When `engineType` is Fuel Cell: capacity = 0 (cannot integrate)
- When `engineRating` < 25: capacity = 0 (too small to integrate)
- When `engineRating` >= 250: capacity is typically 10 (capped at max)

**Rounding Rules**:
- Always use FLOOR (round down) for division result
- Never round up or use standard rounding

### External Heat Sink Count

**Formula**:
```
externalHeatSinks = totalHeatSinks - engineIntegratedHeatSinks
```

**Where**:
- `totalHeatSinks` = Total heat sinks on unit (minimum 10)
- `engineIntegratedHeatSinks` = Heat sinks integrated in engine (0-10)

**Example**:
```
Input: totalHeatSinks = 15, engineIntegratedHeatSinks = 10
Calculation: 15 - 10 = 5
Output: externalHeatSinks = 5
```

**Special Cases**:
- When totalHeatSinks < engineIntegratedHeatSinks: Invalid configuration (error)
- When totalHeatSinks = engineIntegratedHeatSinks: externalHeatSinks = 0 (all integrated)
- When engineIntegratedHeatSinks = 0: externalHeatSinks = totalHeatSinks (all external)

**Rounding Rules**:
- Result is always integer (no rounding needed)

### Total Heat Dissipation

**Formula**:
```
totalDissipation = totalHeatSinks * dissipationPerSink
```

**Where**:
- `totalHeatSinks` = Total number of heat sinks
- `dissipationPerSink` = Heat removed per turn per sink (1 for Single, 2 for Double)

**Example 1**:
```
Input: totalHeatSinks = 15, heatSinkType = 'Single'
Calculation: dissipationPerSink = 1, total = 15 * 1 = 15
Output: totalDissipation = 15 heat/turn
```

**Example 2**:
```
Input: totalHeatSinks = 12, heatSinkType = 'Double (IS)'
Calculation: dissipationPerSink = 2, total = 12 * 2 = 24
Output: totalDissipation = 24 heat/turn
```

**Special Cases**:
- Laser Heat Sinks: dissipationPerSink = 1, but only for laser weapon heat
- Mixed heat sink types: Not allowed - unit must use single type

**Rounding Rules**:
- Result is always integer (no rounding needed)

### External Heat Sink Weight

**Formula**:
```
externalWeight = externalHeatSinks * weightPerSink
```

**Where**:
- `externalHeatSinks` = Number of external (non-engine) heat sinks
- `weightPerSink` = Weight per heat sink in tons (1.0 for most, 1.5 for Compact)

**Example 1**:
```
Input: externalHeatSinks = 5, heatSinkType = 'Double (IS)'
Calculation: weightPerSink = 1.0, total = 5 * 1.0 = 5.0
Output: externalWeight = 5.0 tons
```

**Example 2**:
```
Input: externalHeatSinks = 4, heatSinkType = 'Compact'
Calculation: weightPerSink = 1.5, total = 4 * 1.5 = 6.0
Output: externalWeight = 6.0 tons
```

**Special Cases**:
- Engine-integrated heat sinks: weight = 0 (included in engine weight)
- When externalHeatSinks = 0: weight = 0

**Rounding Rules**:
- Store full precision internally
- Round to 2 decimal places for display: Math.round(weight * 100) / 100

### External Heat Sink Critical Slots

**Formula**:
```
externalSlots = externalHeatSinks * slotsPerSink
```

**Where**:
- `externalHeatSinks` = Number of external heat sinks
- `slotsPerSink` = Slots per heat sink based on type:
  - Single: 1 slot
  - Double (IS): 3 slots
  - Double (Clan): 2 slots
  - Compact: 1 slot
  - Laser: 1 slot

**Example 1**:
```
Input: externalHeatSinks = 5, heatSinkType = 'Single'
Calculation: slotsPerSink = 1, total = 5 * 1 = 5
Output: externalSlots = 5 critical slots
```

**Example 2**:
```
Input: externalHeatSinks = 3, heatSinkType = 'Double (IS)'
Calculation: slotsPerSink = 3, total = 3 * 3 = 9
Output: externalSlots = 9 critical slots
```

**Example 3**:
```
Input: externalHeatSinks = 4, heatSinkType = 'Double (Clan)'
Calculation: slotsPerSink = 2, total = 4 * 2 = 8
Output: externalSlots = 8 critical slots
```

**Special Cases**:
- Engine-integrated heat sinks: slots = 0 (no additional slots beyond engine)
- When externalHeatSinks = 0: slots = 0

**Rounding Rules**:
- Result is always integer (no rounding needed)

---

## Validation Rules

### Validation: Minimum Heat Sink Count

**Rule**: Unit must have at least 10 total heat sinks

**Severity**: Error

**Condition**:
```typescript
if (heatSinkConfig.totalCount < 10) {
  // invalid - emit error
}
```

**Error Message**: "Unit must have at least 10 heat sinks (current: {totalCount})"

**User Action**: Add more heat sinks to reach minimum of 10

### Validation: Heat Sink Type Consistency

**Rule**: All heat sinks on a unit must be the same type

**Severity**: Error

**Condition**:
```typescript
if (unit.heatSinks.some(hs => hs.heatSinkType !== unit.heatSinkConfiguration.heatSinkType)) {
  // invalid - emit error
}
```

**Error Message**: "All heat sinks must be of the same type. Found mixed types: {types}"

**User Action**: Convert all heat sinks to a single type

### Validation: Engine Integration Capacity

**Rule**: Engine-integrated heat sinks cannot exceed calculated capacity

**Severity**: Error

**Condition**:
```typescript
const maxIntegrated = calculateEngineIntegrationCapacity(engine.rating, engine.type);
if (heatSinkConfig.engineIntegrated > maxIntegrated) {
  // invalid - emit error
}
```

**Error Message**: "Engine can integrate maximum {maxIntegrated} heat sinks (attempting {engineIntegrated})"

**User Action**: Move excess heat sinks to external placement

### Validation: External Count Consistency

**Rule**: External count must equal total minus integrated

**Severity**: Error

**Condition**:
```typescript
if (heatSinkConfig.externalCount !== heatSinkConfig.totalCount - heatSinkConfig.engineIntegrated) {
  // invalid - emit error
}
```

**Error Message**: "External heat sink count inconsistent with total and integrated counts"

**User Action**: Recalculate external heat sink count

### Validation: Tech Base Compatibility

**Rule**: Heat sink type must be available for unit tech base and era

**Severity**: Error

**Condition**:
```typescript
if (unit.techBase === TechBase.INNER_SPHERE &&
    heatSinkConfig.heatSinkType === HeatSinkType.DOUBLE_CLAN) {
  // invalid - emit error
}

if (heatSinkConfig.heatSinkType === HeatSinkType.DOUBLE_IS &&
    unit.introductionYear < 3050) {
  // invalid - emit error (unless extinction period rules apply)
}
```

**Error Message**: "Heat sink type '{heatSinkType}' not available for {techBase} in era {era}"

**User Action**: Select heat sink type compatible with unit's tech base and era

### Validation: Critical Slot Allocation

**Rule**: External heat sinks must have valid critical slot allocations

**Severity**: Error

**Condition**:
```typescript
const requiredSlots = calculateExternalSlots(
  heatSinkConfig.externalCount,
  heatSinkConfig.heatSinkType
);
const allocatedSlots = unit.criticalSlots
  .filter(s => s.equipment?.type === 'HeatSink')
  .length;

if (allocatedSlots < requiredSlots) {
  // invalid - emit error
}
```

**Error Message**: "Not all external heat sinks are allocated to critical slots ({allocated}/{required})"

**User Action**: Allocate remaining heat sinks to available critical slots

### Validation: Compact Heat Sink Engine Mounting

**Rule**: Compact heat sinks cannot be engine-mounted

**Severity**: Error

**Condition**:
```typescript
if (heatSinkConfig.heatSinkType === HeatSinkType.COMPACT &&
    heatSinkConfig.engineIntegrated > 0) {
  // invalid - emit error
}
```

**Error Message**: "Compact heat sinks cannot be integrated into engine"

**User Action**: All Compact heat sinks must be external

---

## Technology Base Variants

See [Tech Base Variants Reference](../tech-base-variants-reference/spec.md) for general Inner Sphere vs Clan differences and the "3-2 Pattern" for slot differences.

### Heat Sink-Specific Tech Base Differences

**Double Heat Sinks External Slot Requirements**:
- Inner Sphere Double: 3 critical slots when external
- Clan Double: 2 critical slots when external
- Weight: Identical (1.0 ton per heat sink)
- Dissipation: Identical (2 heat/turn per heat sink)
- Engine-integrated: Both 0 additional slots

**Single Heat Sinks**:
- Universal: Available to both Inner Sphere and Clan
- No differences in weight, slots, or dissipation

**Tech Base Restrictions**:
- Compact Heat Sinks: Inner Sphere only
- Laser Heat Sinks: Inner Sphere only
- Cannot mix IS and Clan Double Heat Sinks in same unit

**Introduction Year Gap**:
- Clan Double Heat Sinks: 2828 (Clan Golden Century)
- IS Double Heat Sinks: 3050 (Clan Invasion)
- Gap: ~220 years

**Mixed Tech Application**:
- Unit must choose ONE Double Heat Sink type (all IS OR all Clan)
- Clan DHS provides 33% slot savings (2 vs 3 slots external)
- Weight identical, so Clan DHS strictly better for mixed tech units


---

## Dependencies

### Defines
- **HeatSinkType enum**: Defines five heat sink types (Single, Double IS/Clan, Compact, Laser)
- **Engine integration formula**: floor(rating / 25), max 10 (0 for Compact/ICE/Fuel Cell engines)
- **Dissipation rates**: Single/Compact/Laser 1 heat/turn, Double 2 heat/turn
- **Critical slot requirements**: Single/Compact/Laser 1 slot, Double IS 3 slots, Double Clan 2 slots
- **Weight specifications**: Most 1.0 ton, Compact 1.5 tons
- **Minimum requirement**: 10 total heat sinks mandatory
- **IHeatSink interface**: Complete heat sink specification
- **IHeatSinkConfiguration interface**: Unit heat sink configuration
- **IHeatSinkPlacement interface**: Heat sink placement data

### Depends On
- [Core Entity Types](../../phase-1-foundation/core-entity-types/spec.md) - Extends IEntity, ITechBaseEntity, IPlaceableComponent, IValuedComponent, ITemporalEntity
- [Physical Properties System](../../phase-1-foundation/physical-properties-system/spec.md) - Weight and critical slot properties
- [Engine System](../engine-system/spec.md) - Engine rating determines integration capacity
- [Gyro System](../gyro-system/spec.md) - Gyro size determines where engine heat sink slots start in CT

### Used By
- [Critical Slot Allocation](../critical-slot-allocation/spec.md) - Heat sink placement in mech locations
- [Construction Rules Core](../construction-rules-core/spec.md) - Validates minimum 10 heat sinks, heat sink weight
- **Thermal Management**: Heat dissipation vs generation calculations
- **Weapon Systems**: Heat generation must be matched by heat dissipation

### Construction Sequence
1. Select engine type and rating (determines integration capacity)
2. Select gyro type (determines CT slot allocation)
3. Calculate engine integration capacity: floor(rating / 25), max 10
4. Select heat sink type (Single, Double IS/Clan, Compact, Laser)
5. Determine total heat sinks needed (minimum 10, match heat generation)
6. Calculate external heat sinks: total - integrated
7. Allocate engine-integrated heat sinks to CT (after gyro slots, 0 additional slots)
8. Allocate external heat sinks to available locations (any location)
9. Validate minimum count, tech base compatibility, slot availability

---

## Implementation Notes

### Performance Considerations
- Heat sink calculations are O(1) - simple arithmetic
- Critical slot allocation is O(n) where n = number of external heat sinks
- Cache engine integration capacity calculation as it depends only on engine
- Total dissipation calculation is trivial multiplication

### Edge Cases
- **Zero rating engine**: Integration capacity = 0 (all external)
- **Rating < 25**: Integration capacity = 0 (floor(rating/25) = 0)
- **Exactly 10 integrated**: Common case, no external needed if total = 10
- **All external**: Compact/ICE/Fuel Cell engines require all heat sinks external
- **Maximum external DHS (IS)**: 10 external IS DHS = 30 slots (very tight!)
- **Clan slot advantage**: Clan DHS external = 2 slots vs IS 3 slots (significant)

### Common Pitfalls
- **Pitfall**: Applying engine type limitations to integration capacity
  - **Solution**: Only engine rating matters (except Compact/ICE/Fuel Cell which can't integrate)
- **Pitfall**: Counting engine-integrated heat sinks as using critical slots
  - **Solution**: Engine heat sinks take 0 additional slots
- **Pitfall**: Forgetting to cap integration capacity at 10
  - **Solution**: Always use MIN(10, floor(rating/25))
- **Pitfall**: Mixing IS and Clan Double Heat Sinks on same unit
  - **Solution**: Validate all heat sinks are same type
- **Pitfall**: Using different weights for IS vs Clan DHS
  - **Solution**: Both weigh 1.0 ton - only slots differ
- **Pitfall**: Placing engine heat sinks before gyro in CT
  - **Solution**: Heat sink slots come AFTER gyro slots

---

## Examples

### Example 1: Standard Configuration (Engine Rating 300, 10 DHS)

**Input**:
```typescript
const config = {
  engineRating: 300,
  engineType: EngineType.STANDARD,
  gyroType: GyroType.STANDARD,
  heatSinkType: HeatSinkType.DOUBLE_IS,
  totalHeatSinks: 10
};
```

**Processing**:
```typescript
// Step 1: Calculate engine integration capacity
const integrationCapacity = Math.floor(300 / 25); // = 12
const maxIntegrated = Math.min(10, integrationCapacity); // = 10

// Step 2: Determine integrated vs external
const engineIntegrated = Math.min(10, maxIntegrated); // = 10
const external = 10 - 10; // = 0

// Step 3: Critical slot allocation
// Engine: CT slots 1-6
// Gyro: CT slots 7-10
// Engine heat sinks: CT slots 11-12 (but take 0 additional slots)
const ctSlotsUsed = 6 + 4; // = 10 (engine + gyro)

// Step 4: Weight calculation
const externalWeight = 0 * 1.0; // = 0 tons

// Step 5: Heat dissipation
const totalDissipation = 10 * 2; // = 20 heat/turn
```

**Output**:
```typescript
const result = {
  engineIntegrated: 10,
  externalCount: 0,
  externalWeight: 0,
  externalSlots: 0,
  totalDissipation: 20,
  ctSlotAllocation: {
    engine: [1, 2, 3, 4, 5, 6],
    gyro: [7, 8, 9, 10],
    heatSinks: [11, 12],  // Tracked but take no additional slots
    available: []
  }
};
```

### Example 2: Small Engine with External Heat Sinks (Rating 100)

**Input**:
```typescript
const config = {
  engineRating: 100,
  engineType: EngineType.STANDARD,
  heatSinkType: HeatSinkType.SINGLE,
  totalHeatSinks: 10  // Minimum required
};
```

**Processing**:
```typescript
// Step 1: Calculate integration capacity
const integrationCapacity = Math.floor(100 / 25); // = 4
const maxIntegrated = Math.min(10, 4); // = 4

// Step 2: Determine external needs
const engineIntegrated = 4;
const external = 10 - 4; // = 6 external required

// Step 3: Weight calculation
const externalWeight = 6 * 1.0; // = 6.0 tons

// Step 4: Slot calculation
const externalSlots = 6 * 1; // = 6 slots needed

// Step 5: Heat dissipation
const totalDissipation = 10 * 1; // = 10 heat/turn
```

**Output**:
```typescript
const result = {
  engineIntegrated: 4,
  externalCount: 6,
  externalWeight: 6.0,
  externalSlots: 6,
  totalDissipation: 10,
  placement: [
    { location: 'LL', slots: [5, 6] },  // 2 in left leg
    { location: 'RL', slots: [5, 6] },  // 2 in right leg
    { location: 'LT', slots: [1, 2] },  // 2 in left torso
    // Total: 6 heat sinks placed
  ]
};
```

### Example 3: Clan Mech with Double Heat Sinks (Rating 375)

**Input**:
```typescript
const config = {
  engineRating: 375,
  engineType: EngineType.XL_CLAN,
  heatSinkType: HeatSinkType.DOUBLE_CLAN,
  totalHeatSinks: 15
};
```

**Processing**:
```typescript
// Step 1: Calculate integration capacity
const integrationCapacity = Math.floor(375 / 25); // = 15
const maxIntegrated = Math.min(10, 15); // = 10 (capped)

// Step 2: Determine external
const engineIntegrated = 10;
const external = 15 - 10; // = 5

// Step 3: Weight calculation
const externalWeight = 5 * 1.0; // = 5.0 tons

// Step 4: Slot calculation (Clan DHS = 2 slots each)
const externalSlots = 5 * 2; // = 10 slots

// Step 5: Heat dissipation
const totalDissipation = 15 * 2; // = 30 heat/turn
```

**Output**:
```typescript
const result = {
  engineIntegrated: 10,
  externalCount: 5,
  externalWeight: 5.0,
  externalSlots: 10,  // Only 10 slots (vs 15 if IS DHS)
  totalDissipation: 30,
  placement: [
    { location: 'LT', slots: [3, 4, 5, 6] },  // 2 DHS in LT (4 slots)
    { location: 'RT', slots: [3, 4, 5, 6] },  // 2 DHS in RT (4 slots)
    { location: 'LL', slots: [5, 6] },         // 1 DHS in LL (2 slots)
  ]
};
```

### Example 4: Compact Engine (Cannot Integrate)

**Input**:
```typescript
const config = {
  engineRating: 250,
  engineType: EngineType.COMPACT,
  heatSinkType: HeatSinkType.SINGLE,
  totalHeatSinks: 10
};
```

**Processing**:
```typescript
// Step 1: Check engine type
const canIntegrate = engineType !== EngineType.COMPACT; // = false

// Step 2: Compact engines cannot integrate
const engineIntegrated = 0;  // Must be 0 for Compact
const external = 10 - 0; // = 10 (all external)

// Step 3: Weight calculation
const externalWeight = 10 * 1.0; // = 10.0 tons

// Step 4: Slot calculation
const externalSlots = 10 * 1; // = 10 slots
```

**Output**:
```typescript
const result = {
  engineIntegrated: 0,  // Compact cannot integrate
  externalCount: 10,    // All heat sinks external
  externalWeight: 10.0,
  externalSlots: 10,
  totalDissipation: 10,
  placement: [
    { location: 'CT', slots: [4, 5, 6] },     // 3 in CT (Compact engine only uses 3 slots)
    { location: 'LT', slots: [1, 2, 3, 4] },  // 4 in LT
    { location: 'RT', slots: [1, 2, 3] },     // 3 in RT
  ]
};
```

### Example 5: Heavy Configuration with IS Double Heat Sinks

**Input**:
```typescript
const config = {
  engineRating: 300,
  engineType: EngineType.STANDARD,
  heatSinkType: HeatSinkType.DOUBLE_IS,
  totalHeatSinks: 20,  // Heavy weapon load
  weaponHeatGeneration: 35
};
```

**Processing**:
```typescript
// Step 1: Integration capacity
const maxIntegrated = Math.min(10, Math.floor(300 / 25)); // = 10

// Step 2: External heat sinks
const engineIntegrated = 10;
const external = 20 - 10; // = 10 external

// Step 3: Weight and slots (IS DHS = 3 slots each!)
const externalWeight = 10 * 1.0; // = 10.0 tons
const externalSlots = 10 * 3; // = 30 slots!

// Step 4: Heat dissipation
const totalDissipation = 20 * 2; // = 40 heat/turn

// Step 5: Heat efficiency
const netHeat = 35 - 40; // = -5 (running cool)
```

**Output**:
```typescript
const result = {
  engineIntegrated: 10,
  externalCount: 10,
  externalWeight: 10.0,
  externalSlots: 30,  // This is a LOT of slots!
  totalDissipation: 40,
  heatEfficiency: 114,  // (40/35) * 100
  placement: [
    { location: 'LT', slots: [1, 2, 3, 4, 5, 6, 7, 8, 9] },  // 3 DHS (9 slots)
    { location: 'RT', slots: [1, 2, 3, 4, 5, 6, 7, 8, 9] },  // 3 DHS (9 slots)
    { location: 'LL', slots: [5, 6] },                        // Part of 1 DHS
    { location: 'RL', slots: [5, 6] },                        // Part of 1 DHS
    { location: 'LA', slots: [3, 4, 5, 6, 7, 8] },           // 2 DHS (6 slots)
    { location: 'RA', slots: [3, 4, 5, 6, 7, 8] },           // 2 DHS (6 slots)
  ]
  // Note: IS DHS can span multiple locations if needed
};
```

### Example 6: Validation Failure Cases

```typescript
// Case 1: Insufficient heat sinks
const invalidConfig1 = {
  totalHeatSinks: 8  // ERROR: Must be at least 10
};
// Validation: FAIL
// Error: "Unit must have at least 10 heat sinks (current: 8)"

// Case 2: Exceeded integration capacity
const invalidConfig2 = {
  engineRating: 175,
  engineIntegrated: 10  // ERROR: floor(175/25) = 7, max is 7
};
// Validation: FAIL
// Error: "Engine can integrate maximum 7 heat sinks (attempting 10)"

// Case 3: Compact heat sinks in engine
const invalidConfig3 = {
  heatSinkType: HeatSinkType.COMPACT,
  engineIntegrated: 5  // ERROR: Compact cannot be engine-mounted
};
// Validation: FAIL
// Error: "Compact heat sinks cannot be integrated into engine"

// Case 4: Mixed heat sink types
const invalidConfig4 = {
  heatSinks: [
    { type: HeatSinkType.SINGLE },
    { type: HeatSinkType.DOUBLE_IS }  // ERROR: Mixed types
  ]
};
// Validation: FAIL
// Error: "All heat sinks must be of the same type. Found mixed types: Single, Double (IS)"

// Case 5: Wrong tech base
const invalidConfig5 = {
  unitTechBase: TechBase.INNER_SPHERE,
  heatSinkType: HeatSinkType.DOUBLE_CLAN  // ERROR: Wrong tech base
};
// Validation: FAIL
// Error: "Heat sink type 'Double (Clan)' not available for Inner Sphere"
```

---

## References

### Official BattleTech Rules
- **TechManual**: Pages 127-129 - Heat sink types and specifications
- **TechManual**: Page 138 - Engine heat sink integration rules
- **Total Warfare**: Page 38 - Heat dissipation and management
- **BattleMech Manual**: Pages 27-28 - Heat sink construction rules
- **Strategic Operations**: Advanced heat sink types (Compact, Laser)

### Related Documentation
- `openspec/specs/core-entity-types/spec.md` - Base interface definitions
- `openspec/specs/physical-properties-system/spec.md` - Weight and slot standards
- `openspec/specs/engine-system/spec.md` - Engine types and ratings
- `openspec/specs/gyro-system/spec.md` - Gyro placement affecting heat sink slots
- `openspec/specs/critical-slot-allocation/spec.md` - Slot placement rules
- `docs/battletech/battletech_critical_slots.md` - Critical slot reference
- `docs/archive/reports/HEAT_SINK_RULES_CORRECTION_SUMMARY.md` - Implementation fixes

### Code References
- Utilities: `src/utils/heatSinkCalculations.ts`
- Types: `src/types/core/ComponentInterfaces.ts`
- Validation: `src/services/validation/HeatRulesValidator.ts`
- Components: `src/components/editor/structure/HeatSinksPanel.tsx`

---

## Changelog

### Version 1.0 (2025-11-27)
- Initial specification
- Defined 5 heat sink types: Single, Double (IS), Double (Clan), Compact, Laser
- Established engine integration formula: floor(rating / 25), max 10
- Specified critical slot placement rules for engine-mounted vs external
- Documented slot differences: IS DHS = 3 slots, Clan DHS = 2 slots, others = 1 slot
- Established minimum requirement: 10 total heat sinks
- Defined weight calculations: 1.0 ton for most, 1.5 tons for Compact
- Specified heat dissipation: 1 heat/turn for Single/Compact/Laser, 2 for Double
- Added tech base availability and era restrictions
- Included 6 comprehensive examples with actual mech configurations
- Documented validation rules and common pitfalls
- Clarified engine-mounted heat sinks take 0 additional critical slots
- Specified placement after gyro slots in Center Torso
