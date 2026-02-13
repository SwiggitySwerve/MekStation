# Aerospace Unit System Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2026-02-13
**Dependencies**: engine-system, armor-system, construction-rules-core, unit-entity-model, equipment-database
**Affects**: unit-validation-framework, serialization-formats, customizer-tabs

---

## Overview

### Purpose

The aerospace unit system defines the construction, state management, BLK format handling, validation, and customizer UI for aerospace fighters, conventional fighters, and small craft in MekStation. It enables users to create, configure, and validate aerospace units following BattleTech TechManual rules.

### Scope

**In Scope:**

- Aerospace fighter (ASF), conventional fighter, and small craft data models and interfaces
- Aerospace state shape and Zustand store implementation
- BLK format parsing and serialization for aerospace units
- Customizer UI workflow (Structure, Armor, Equipment tabs with diagram and status bar)
- Validation rules for aerospace construction (VAL-AERO-_ and AERO-_ rule sets)
- Armor allocation by firing arc (Nose, Left Wing, Right Wing, Aft)
- Equipment mounting by firing arc with fuselage support
- Weight class classification, engine/thrust relationships, and fuel management
- Tech base variants (Inner Sphere, Clan) and cockpit types

**Out of Scope:**

- Combat mechanics for aerospace units are OUT OF SCOPE — see future aerospace-combat-system spec
- DropShip, JumpShip, WarShip, and Space Station construction details (these share some base interfaces but have distinct construction rules)
- Record sheet PDF export for aerospace units
- Campaign-level aerospace operations and maintenance
- Atmospheric flight rules and terrain interaction

### Key Concepts

- **Aerospace Fighter (ASF)**: A fusion-powered combat spacecraft weighing 5–100 tons with thrust-based movement, four armor arcs, and equipment mounted by firing arc
- **Conventional Fighter**: A non-fusion-powered atmospheric combat aircraft sharing the same structural model as ASF but with different engine types (ICE, Fuel Cell, etc.)
- **Small Craft**: Spacecraft of 100–200 tons with crew, cargo, and passenger capacity; uses side locations instead of wing locations
- **Firing Arc**: One of four directional zones (Nose, Left Wing, Right Wing, Aft) plus an internal Fuselage location where equipment is mounted
- **Safe Thrust / Max Thrust**: Movement ratings where Max Thrust = floor(Safe Thrust × 1.5)
- **Structural Integrity (SI)**: A durability rating representing the aerospace unit's structural resilience; default = ceil(tonnage / 10)
- **OmniFighter**: An aerospace fighter with pod-mounted equipment that can be swapped between missions

---

## Requirements

### Requirement: Unit Type Classification

The system SHALL support three aerospace unit types: Aerospace Fighter, Conventional Fighter, and Small Craft, each with distinct interfaces extending a common `IAerospaceUnit` base.

**Rationale**: BattleTech defines distinct aerospace unit categories with shared movement/armor systems but different construction constraints.

**Priority**: Critical

#### Scenario: Creating an Aerospace Fighter

**GIVEN** a user initiates creation of a new aerospace unit
**WHEN** the unit type is set to `UnitType.AEROSPACE`
**THEN** the system SHALL create an `IAerospace` instance
**AND** the motion type SHALL be `AerospaceMotionType.AERODYNE`
**AND** the unit SHALL have `armorByArc` with nose, leftWing, rightWing, and aft fields
**AND** the unit SHALL support `IAerospaceMountedEquipment` for equipment

#### Scenario: Creating a Conventional Fighter

**GIVEN** a user initiates creation of a conventional fighter
**WHEN** the unit type is set to `UnitType.CONVENTIONAL_FIGHTER`
**THEN** the system SHALL create an `IConventionalFighter` instance
**AND** the motion type SHALL be `AerospaceMotionType.AERODYNE`
**AND** the unit SHALL have a `conventionalEngineType` field (ICE, Fuel Cell, Electric, MagLev, Solar, Fission, Fusion)

#### Scenario: Creating a Small Craft

**GIVEN** a user initiates creation of a small craft
**WHEN** the unit type is set to `UnitType.SMALL_CRAFT`
**THEN** the system SHALL create an `ISmallCraft` instance
**AND** the motion type MAY be either `AERODYNE` or `SPHEROID`
**AND** the unit SHALL have `armorByArc` with nose, leftSide, rightSide, and aft fields
**AND** the unit SHALL track crew, passengers, cargoCapacity, escapePods, and lifeBoats

### Requirement: Tonnage and Weight Class

The system SHALL enforce tonnage ranges and derive weight classes for aerospace units.

**Rationale**: BattleTech defines specific tonnage ranges for aerospace fighters with weight class thresholds.

**Priority**: Critical

#### Scenario: Valid ASF tonnage range

**GIVEN** an aerospace fighter
**WHEN** setting tonnage
**THEN** tonnage MUST be between 5 and 100 tons inclusive
**AND** tonnage SHALL be selectable in 5-ton increments (5, 10, 15, ... 100)

#### Scenario: Weight class derivation for store state

**GIVEN** an aerospace fighter in the customizer store
**WHEN** tonnage is set
**THEN** weight class SHALL be derived as:

- Light: tonnage ≤ 19
- Medium: tonnage 20–39
- Heavy: tonnage 40–69
- Assault: tonnage ≥ 70

#### Scenario: Weight class derivation for BLK handler

**GIVEN** an aerospace fighter parsed from BLK format
**WHEN** weight class is calculated
**THEN** weight class SHALL be derived as:

- Light: tonnage ≤ 45
- Medium: tonnage 46–70
- Heavy: tonnage > 70

#### Scenario: Tonnage change recalculates engine rating

**GIVEN** an aerospace fighter with safe thrust T
**WHEN** tonnage is changed to a new value N
**THEN** engine rating SHALL be recalculated as N × T
**AND** engine rating SHALL be clamped to range [10, 400]
**AND** structural integrity SHALL be recalculated as ceil(N / 10)

### Requirement: Engine and Thrust Configuration

The system SHALL support engine type selection and thrust-based movement for aerospace fighters.

**Rationale**: Aerospace fighters use thrust ratings rather than walk/run MP, with engine rating derived from tonnage × safe thrust.

**Priority**: Critical

#### Scenario: Engine type selection

**GIVEN** an aerospace fighter in the customizer
**WHEN** selecting an engine type
**THEN** the following engine types SHALL be available: Standard Fusion, XL Engine (IS), XL Engine (Clan), Light Engine, Compact Engine

#### Scenario: Safe thrust determines engine rating

**GIVEN** an aerospace fighter with tonnage T
**WHEN** safe thrust is set to value S
**THEN** engine rating SHALL equal T × S
**AND** max thrust SHALL equal floor(S × 1.5)

#### Scenario: Engine rating determines safe thrust

**GIVEN** an aerospace fighter with tonnage T
**WHEN** engine rating is set to value R
**THEN** safe thrust SHALL equal floor(R / T)
**AND** max thrust SHALL equal floor(safe thrust × 1.5)

#### Scenario: Safe thrust bounds

**GIVEN** an aerospace fighter in the customizer UI
**WHEN** adjusting safe thrust via stepper controls
**THEN** safe thrust MUST be at least 1
**AND** safe thrust MUST NOT exceed 12

#### Scenario: Default thrust by tonnage

**GIVEN** a newly created aerospace fighter
**WHEN** tonnage is set
**THEN** default safe thrust SHALL be:

- 6 for tonnage ≤ 30
- 5 for tonnage 31–60
- 4 for tonnage > 60

### Requirement: Fuel Management

The system SHALL track fuel points for aerospace fighters.

**Rationale**: Aerospace fighters require fuel for sustained operations; fuel capacity affects operational range.

**Priority**: High

#### Scenario: Fuel input

**GIVEN** an aerospace fighter in the customizer
**WHEN** setting fuel points
**THEN** fuel MUST be non-negative (≥ 0)
**AND** the UI SHALL allow input up to tonnage × 10

#### Scenario: Default fuel

**GIVEN** a newly created aerospace fighter with tonnage T
**WHEN** default state is generated
**THEN** default fuel SHALL be T × 5 fuel points

#### Scenario: Low fuel warning during BLK parsing

**GIVEN** a BLK document being parsed
**WHEN** fuel is less than 80 points
**THEN** the parser SHALL emit a warning: "Low fuel capacity may limit operational range"

### Requirement: Structural Integrity

The system SHALL track structural integrity for aerospace fighters.

**Rationale**: Structural integrity represents the aerospace unit's structural resilience and contributes to survivability.

**Priority**: High

#### Scenario: SI minimum

**GIVEN** an aerospace fighter
**WHEN** setting structural integrity
**THEN** SI MUST be at least 1

#### Scenario: Default SI

**GIVEN** a newly created aerospace fighter with tonnage T
**WHEN** default state is generated
**THEN** default SI SHALL be ceil(T / 10)

### Requirement: Cockpit Configuration

The system SHALL support multiple cockpit types for aerospace fighters.

**Rationale**: Different cockpit types provide trade-offs in weight, capabilities, and piloting modifiers.

**Priority**: High

#### Scenario: Available cockpit types

**GIVEN** an aerospace fighter in the customizer
**WHEN** selecting a cockpit type
**THEN** the following types SHALL be available: Standard, Small, Primitive, Command Console

#### Scenario: BLK cockpit type parsing

**GIVEN** a BLK document with a cockpit type code
**WHEN** parsing the cockpit type
**THEN** code 0 (or absent) SHALL map to Standard
**AND** code 1 SHALL map to Small
**AND** code 2 SHALL map to Primitive
**AND** code 3 SHALL map to Command Console

#### Scenario: Cockpit special options

**GIVEN** an aerospace fighter in the customizer
**WHEN** configuring cockpit options
**THEN** the system SHALL provide toggles for Reinforced Cockpit and Ejection Seat
**AND** Ejection Seat SHALL default to true for new fighters

### Requirement: Heat Sink Management

The system SHALL track heat sinks and heat dissipation for aerospace fighters.

**Rationale**: Heat sinks determine how much heat a fighter can dissipate per turn, critical for sustained weapons fire.

**Priority**: High

#### Scenario: Heat sink count

**GIVEN** an aerospace fighter in the customizer
**WHEN** adjusting heat sinks
**THEN** heat sink count MUST be non-negative (≥ 0)
**AND** default count SHALL be 10 for new fighters

#### Scenario: Double heat sinks

**GIVEN** an aerospace fighter with N heat sinks
**WHEN** double heat sinks is enabled
**THEN** heat dissipation SHALL be N × 2
**AND** the status bar SHALL display "DHS" label

#### Scenario: Single heat sinks

**GIVEN** an aerospace fighter with N heat sinks
**WHEN** double heat sinks is disabled
**THEN** heat dissipation SHALL be N × 1
**AND** the status bar SHALL display "SHS" label

### Requirement: Bomb Bay Support

The system SHALL support bomb bay configuration for aerospace fighters.

**Rationale**: Aerospace fighters may carry bombs for ground attack missions.

**Priority**: Medium

#### Scenario: Enabling bomb bay

**GIVEN** an aerospace fighter in the customizer
**WHEN** the bomb bay checkbox is enabled
**THEN** the system SHALL display a bomb capacity input
**AND** bomb capacity SHALL accept values from 0 to tonnage / 2

#### Scenario: Disabling bomb bay

**GIVEN** an aerospace fighter with bomb bay enabled
**WHEN** bomb bay is disabled
**THEN** bomb capacity SHALL be reset to 0

#### Scenario: BLK bomb bay detection

**GIVEN** a BLK document
**WHEN** parsing for bomb bay capability
**THEN** the parser SHALL check equipment names for "bomb" substring (case-insensitive)
**AND** the parser SHALL check raw tags for "bombbay" key
**AND** bomb capacity SHALL be floor(tonnage × 0.1) when detected

---

## Data Model Requirements

### Required Interfaces

The implementation MUST provide the following TypeScript interfaces:

```typescript
/**
 * Base interface for all aerospace units
 */
interface IAerospaceUnit extends IBaseUnit {
  readonly motionType: AerospaceMotionType;
  readonly movement: IAerospaceMovement;
  readonly fuel: number;
  readonly structuralIntegrity: number;
  readonly heatSinks: number;
  readonly heatSinkType: number; // 0 = single, 1 = double
  readonly engineType: number;
  readonly armorType: number;
  readonly armor: readonly number[];
  readonly totalArmorPoints: number;
}

/**
 * Aerospace movement configuration
 */
interface IAerospaceMovement {
  readonly safeThrust: number;
  readonly maxThrust: number;
}

/**
 * Aerospace fighter interface
 */
interface IAerospace extends IAerospaceUnit {
  readonly unitType: UnitType.AEROSPACE;
  readonly motionType: AerospaceMotionType.AERODYNE;
  readonly cockpitType: AerospaceCockpitType;
  readonly armorByArc: {
    readonly nose: number;
    readonly leftWing: number;
    readonly rightWing: number;
    readonly aft: number;
  };
  readonly equipment: readonly IAerospaceMountedEquipment[];
  readonly hasBombBay: boolean;
  readonly bombCapacity: number;
  readonly bombs: readonly string[];
  readonly hasReinforcedCockpit: boolean;
  readonly hasEjectionSeat: boolean;
}

/**
 * Mounted equipment on aerospace units
 */
interface IAerospaceMountedEquipment {
  readonly id: string;
  readonly equipmentId: string;
  readonly name: string;
  readonly location: AerospaceLocation;
  readonly linkedAmmoId?: string;
}

/**
 * Conventional fighter interface
 */
interface IConventionalFighter extends IAerospaceUnit {
  readonly unitType: UnitType.CONVENTIONAL_FIGHTER;
  readonly motionType: AerospaceMotionType.AERODYNE;
  readonly conventionalEngineType: ConventionalFighterEngineType;
  readonly cockpitType: AerospaceCockpitType;
  readonly armorByArc: {
    readonly nose: number;
    readonly leftWing: number;
    readonly rightWing: number;
    readonly aft: number;
  };
  readonly equipment: readonly IAerospaceMountedEquipment[];
  readonly hasBombBay: boolean;
  readonly bombCapacity: number;
}

/**
 * Small craft interface
 */
interface ISmallCraft extends IAerospaceUnit {
  readonly unitType: UnitType.SMALL_CRAFT;
  readonly motionType: AerospaceMotionType; // AERODYNE or SPHEROID
  readonly armorByArc: {
    readonly nose: number;
    readonly leftSide: number;
    readonly rightSide: number;
    readonly aft: number;
  };
  readonly equipment: readonly ISmallCraftMountedEquipment[];
  readonly crew: number;
  readonly passengers: number;
  readonly cargoCapacity: number;
  readonly escapePods: number;
  readonly lifeBoats: number;
}
```

### Required Enumerations

```typescript
enum AerospaceMotionType {
  AERODYNE = 'Aerodyne',
  SPHEROID = 'Spheroid',
}

enum AerospaceCockpitType {
  STANDARD = 'Standard',
  SMALL = 'Small',
  PRIMITIVE = 'Primitive',
  COMMAND_CONSOLE = 'Command Console',
}

enum ConventionalFighterEngineType {
  ICE = 'ICE',
  FUEL_CELL = 'Fuel Cell',
  ELECTRIC = 'Electric',
  MAGLEV = 'MagLev',
  SOLAR = 'Solar',
  FISSION = 'Fission',
  FUSION = 'Fusion',
}

enum AerospaceLocation {
  NOSE = 'Nose',
  LEFT_WING = 'Left Wing',
  RIGHT_WING = 'Right Wing',
  AFT = 'Aft',
  FUSELAGE = 'Fuselage',
}
```

### Required Properties

| Property               | Type                           | Required | Description                       | Valid Values              | Default            |
| ---------------------- | ------------------------------ | -------- | --------------------------------- | ------------------------- | ------------------ |
| `id`                   | `string`                       | Yes      | Unique aerospace identifier       | UUID                      | Generated          |
| `name`                 | `string`                       | Yes      | Display name (chassis + model)    | Non-empty string          | From options       |
| `chassis`              | `string`                       | Yes      | Base chassis name                 | Non-empty string          | First word of name |
| `model`                | `string`                       | Yes      | Model/variant designation         | String                    | Remainder of name  |
| `mulId`                | `string`                       | Yes      | Master Unit List ID               | String or "-1" (custom)   | `"-1"`             |
| `year`                 | `number`                       | Yes      | Introduction year                 | Positive integer          | `3025`             |
| `rulesLevel`           | `RulesLevel`                   | Yes      | Rules complexity level            | INTRODUCTORY–EXPERIMENTAL | `STANDARD`         |
| `tonnage`              | `number`                       | Yes      | Unit mass                         | 5–100                     | From options       |
| `weightClass`          | `WeightClass` (readonly)       | Yes      | Derived weight class              | LIGHT–ASSAULT             | Derived            |
| `techBase`             | `TechBase` (readonly)          | Yes      | Technology base                   | INNER_SPHERE or CLAN      | From options       |
| `unitType`             | `UnitType` (readonly)          | Yes      | Aerospace or Conventional Fighter | AEROSPACE, CONV_FIGHTER   | From options       |
| `motionType`           | `AerospaceMotionType`          | Yes      | Movement mode                     | AERODYNE                  | `AERODYNE`         |
| `isOmni`               | `boolean`                      | Yes      | OmniFighter flag                  | true/false                | `false`            |
| `engineType`           | `EngineType`                   | Yes      | Engine type                       | See engine options        | `STANDARD`         |
| `engineRating`         | `number`                       | Yes      | Engine rating                     | 10–400                    | tonnage × thrust   |
| `safeThrust`           | `number`                       | Yes      | Safe thrust rating                | 1–12                      | Tonnage-based      |
| `maxThrust`            | `number` (readonly)            | Yes      | Maximum thrust rating             | Derived                   | floor(safe × 1.5)  |
| `fuel`                 | `number`                       | Yes      | Fuel points                       | ≥ 0                       | tonnage × 5        |
| `structuralIntegrity`  | `number`                       | Yes      | Structural integrity rating       | ≥ 1                       | ceil(tonnage / 10) |
| `cockpitType`          | `AerospaceCockpitType`         | Yes      | Cockpit type                      | See enum                  | `STANDARD`         |
| `heatSinks`            | `number`                       | Yes      | Total heat sink count             | ≥ 0                       | `10`               |
| `doubleHeatSinks`      | `boolean`                      | Yes      | Double heat sink flag             | true/false                | `false`            |
| `armorType`            | `ArmorTypeEnum`                | Yes      | Armor type                        | See armor options         | `STANDARD`         |
| `armorTonnage`         | `number`                       | Yes      | Armor weight allocation           | ≥ 0                       | `0`                |
| `armorAllocation`      | `IAerospaceArmorAllocation`    | Yes      | Per-arc armor points              | See allocation rules      | All zeros          |
| `hasBombBay`           | `boolean`                      | Yes      | Bomb bay flag                     | true/false                | `false`            |
| `bombCapacity`         | `number`                       | Yes      | Bomb capacity in tons             | ≥ 0                       | `0`                |
| `hasReinforcedCockpit` | `boolean`                      | Yes      | Reinforced cockpit flag           | true/false                | `false`            |
| `hasEjectionSeat`      | `boolean`                      | Yes      | Ejection seat flag                | true/false                | `true`             |
| `equipment`            | `IAerospaceMountedEquipment[]` | Yes      | Mounted equipment list            | Array                     | `[]`               |
| `isModified`           | `boolean`                      | Yes      | Unsaved changes flag              | true/false                | `true`             |
| `createdAt`            | `number` (readonly)            | Yes      | Creation timestamp                | Epoch ms                  | `Date.now()`       |
| `lastModifiedAt`       | `number`                       | Yes      | Last modification timestamp       | Epoch ms                  | `Date.now()`       |

### Type Constraints

- `tonnage` MUST be a multiple of 5 between 5 and 100
- `engineRating` MUST be clamped to [10, 400] when recalculated
- `safeThrust` MUST be between 1 and 12 in the customizer UI
- `maxThrust` SHALL always equal `floor(safeThrust × 1.5)` and MUST NOT be independently set
- `fuel` MUST be non-negative; the store SHALL enforce `Math.max(0, fuel)`
- `structuralIntegrity` MUST be at least 1; the store SHALL enforce `Math.max(1, si)`
- `heatSinks` MUST be non-negative; the store SHALL enforce `Math.max(0, count)`
- `weightClass` is readonly and MUST be derived from tonnage, never set directly
- `techBase` is readonly and set at unit creation time
- When `hasBombBay` is set to false, `bombCapacity` SHALL be reset to 0

---

## Calculation Formulas

### Engine Rating

**Formula**:

```
engineRating = tonnage × safeThrust
```

**Where**:

- `tonnage` = unit mass in tons (5–100)
- `safeThrust` = safe thrust rating (1–12)

**Example**:

```
Input: tonnage = 50, safeThrust = 6
Calculation: engineRating = 50 × 6
Output: engineRating = 300
```

**Special Cases**:

- When tonnage changes, engine rating is recalculated to maintain the same safe thrust
- Engine rating is clamped to [10, 400]

### Max Thrust

**Formula**:

```
maxThrust = floor(safeThrust × 1.5)
```

**Example**:

```
Input: safeThrust = 5
Calculation: maxThrust = floor(5 × 1.5) = floor(7.5)
Output: maxThrust = 7
```

### Armor Auto-Allocation

**Formula**:

```
totalPoints = floor(armorTonnage × pointsPerTon)
nose     = floor(totalPoints × 0.35)
leftWing = floor(totalPoints × 0.25)
rightWing = floor(totalPoints × 0.25)
aft      = floor(totalPoints × 0.15)
```

**Where**:

- `armorTonnage` = tons of armor allocated
- `pointsPerTon` = armor type's points-per-ton ratio (default 16 for Standard)

**Example**:

```
Input: armorTonnage = 10, armorType = Standard (16 pts/ton)
Calculation: totalPoints = 160
  nose = floor(160 × 0.35) = 56
  leftWing = floor(160 × 0.25) = 40
  rightWing = floor(160 × 0.25) = 40
  aft = floor(160 × 0.15) = 24
Output: { nose: 56, leftWing: 40, rightWing: 40, aft: 24 }
```

### Maximum Armor Per Arc

**Formula**:

```
baseArmor = floor(tonnage × 0.8)
maxNose      = floor(baseArmor × 0.35)
maxLeftWing  = floor(baseArmor × 0.25)
maxRightWing = floor(baseArmor × 0.25)
maxAft       = floor(baseArmor × 0.15)
```

**Example**:

```
Input: tonnage = 50
Calculation: baseArmor = floor(50 × 0.8) = 40
  maxNose = floor(40 × 0.35) = 14
  maxWing = floor(40 × 0.25) = 10
  maxAft  = floor(40 × 0.15) = 6
Output: { nose: 14, wing: 10, aft: 6 }
```

### Simplified Weight Calculation (Handler)

**Formula**:

```
weight = engineWeight + structureWeight + armorWeight + heatSinkWeight + fuelWeight + cockpitWeight
```

**Where**:

- `engineWeight` = (safeThrust × tonnage) × 0.05
- `structureWeight` = tonnage × 0.1
- `armorWeight` = totalArmorPoints / 16
- `heatSinkWeight` = max(0, heatSinks - 10) × 1
- `fuelWeight` = fuel / 200
- `cockpitWeight` = 3

### Simplified BV Calculation (Handler)

**Formula**:

```
baseBV = (totalArmorPoints × 2) + (structuralIntegrity × 10)
thrustMod = 1 + (safeThrust - 5) × 0.05
bv = round(baseBV × thrustMod)
```

**Example**:

```
Input: totalArmorPoints = 96, SI = 8, safeThrust = 5
Calculation: baseBV = (96 × 2) + (8 × 10) = 272
  thrustMod = 1 + (5 - 5) × 0.05 = 1.0
  bv = round(272 × 1.0) = 272
Output: bv = 272
```

### Simplified Cost Calculation (Handler)

**Formula**:

```
cost = (tonnage × 50000) + (thrustRating × 10000) + (totalArmorPoints × 10000) + 200000
```

**Where**:

- `thrustRating` = safeThrust × tonnage

---

## Validation Rules

### Validation: VAL-AERO-001 — Engine Required

**Rule**: All aerospace category units MUST have an engine configured.

**Severity**: Critical Error

**Condition**: Unit has no `engine` property defined.

**Error Message**: "Engine required"

**User Action**: Select an engine for the aerospace unit.

**Applicable Unit Types**: Aerospace, Conventional Fighter, Small Craft, DropShip, JumpShip, WarShip, Space Station

### Validation: VAL-AERO-002 — Thrust Rating Valid

**Rule**: Aerospace fighters and conventional fighters MUST have a positive integer thrust rating.

**Severity**: Critical Error

**Condition**: `thrust` is undefined, non-integer, or ≤ 0.

**Error Message**: "Thrust rating must be positive integer"

**User Action**: Set a valid positive integer thrust rating.

**Applicable Unit Types**: Aerospace, Conventional Fighter

### Validation: VAL-AERO-003 — Structural Integrity Required

**Rule**: Aerospace units MUST have positive structural integrity.

**Severity**: Error

**Condition**: `structuralIntegrity` is undefined or ≤ 0.

**Error Message**: "Structural integrity must be positive"

**User Action**: Set a valid positive structural integrity value.

**Applicable Unit Types**: All aerospace category units

### Validation: VAL-AERO-004 — Fuel Capacity Valid

**Rule**: Aerospace units MUST have non-negative fuel capacity.

**Severity**: Error

**Condition**: `fuelCapacity` is defined and < 0.

**Error Message**: "Fuel capacity must be non-negative"

**User Action**: Set a valid non-negative fuel capacity.

**Applicable Unit Types**: All aerospace category units

### Validation: AERO-THRUST-001 — Thrust/Weight Ratio

**Rule**: Aerospace fighters MUST have sufficient thrust for their weight. Minimum ratio is 0.1 (1 safe thrust per 10 tons).

**Severity**: Error (below minimum), Warning (marginally acceptable, below 1.5× minimum)

**Condition**:

```typescript
const ratio = thrust / weight;
if (ratio < 0.1) {
  // Error: ratio too low
} else if (ratio < 0.15) {
  // Warning: marginally acceptable
}
```

**Error Message**: "Thrust/weight ratio too low: {ratio} (minimum: 0.1)"

**User Action**: Increase thrust to at least ceil(0.1 × weight).

**Applicable Unit Types**: Aerospace, Conventional Fighter

### Validation: AERO-FUEL-001 — Minimum Fuel Capacity

**Rule**: Aerospace fighters MUST have minimum fuel for operations, calculated as ceil(weight × 0.2 × 80) fuel points.

**Severity**: Error (below minimum), Warning (below 1.25× minimum)

**Error Message**: "Fuel capacity too low: {actual} (minimum: {minimum} points)"

**User Action**: Add at least ceil((minimum - actual) / 80) tons of fuel.

**Applicable Unit Types**: Aerospace, Conventional Fighter

### Validation: AERO-FUEL-002 — Maximum Fuel Capacity

**Rule**: Fuel capacity MUST NOT exceed the unit's maximum allowed fuel capacity when a maximum is defined.

**Severity**: Error

**Error Message**: "Fuel capacity exceeds maximum: {actual} > {maximum}"

**User Action**: Reduce fuel to maximum or less.

**Applicable Unit Types**: All aerospace category units

### Validation: AERO-ARC-001 — Weapon Arc Assignments

**Rule**: All aerospace weapons MUST have valid arc assignments from: nose, left-wing, right-wing, aft.

**Severity**: Error (missing or invalid arc), Info (no weapons assigned)

**Error Message**: 'Weapon "{name}" has no arc assignment' or 'Weapon "{name}" has invalid arc: {arc}'

**User Action**: Assign weapon to a valid arc.

**Applicable Unit Types**: All aerospace category units

### Validation: AERO-ARC-002 — Rear-Arc Weapon Restrictions

**Rule**: Aerospace fighters have limited rear-arc weapon capacity based on tonnage.

**Severity**: Error (exceeds max), Warning (at capacity)

**Condition**:

```
Max rear-arc weapons by tonnage:
  ≤ 50 tons: 1 weapon
  ≤ 75 tons: 2 weapons
  ≤ 100 tons: 3 weapons
```

**Error Message**: "Too many rear-arc weapons: {count} (max: {max} for {tonnage} ton unit)"

**User Action**: Remove rear-arc weapons or relocate to forward arcs.

**Applicable Unit Types**: Aerospace, Conventional Fighter

### Validation: Handler-Level — Tonnage Limits

**Rule**: Aerospace fighter tonnage MUST be between 5 and 100 tons.

**Severity**: Error

**Error Messages**: "Aerospace fighter tonnage must be at least 5 tons" / "Aerospace fighter tonnage cannot exceed 100 tons"

### Validation: Handler-Level — Minimum Heat Sinks

**Rule**: Aerospace fighters MUST have at least 10 heat sinks.

**Severity**: Error

**Error Message**: "Aerospace fighters must have at least 10 heat sinks"

### Validation: Handler-Level — Armor Balance

**Rule**: Aerospace armor distribution SHOULD be balanced. A warning is emitted when the maximum arc armor exceeds 3× the minimum arc armor.

**Severity**: Warning

**Error Message**: "Armor distribution is highly unbalanced"

---

## Technology Base Variants

### Inner Sphere Implementation

**Differences from base specification**:

- Engine options: Standard Fusion, XL Engine (IS), Light Engine, Compact Engine
- Armor options: Standard, Ferro-Fibrous (IS), Light Ferro-Fibrous, Heavy Ferro-Fibrous, Stealth

**Special Rules**:

- Tech base is parsed from BLK type string; strings containing "clan" (without "mixed") map to Clan, all others to Inner Sphere
- Rules level is inferred from BLK type string keywords: "level 1"/"introductory" → Introductory, "level 2"/"standard" → Standard, "level 3"/"advanced" → Advanced, "level 4"/"experimental" → Experimental

### Clan Implementation

**Differences from base specification**:

- Engine options: Standard Fusion, XL Engine (Clan)
- Armor options: Standard, Ferro-Fibrous (Clan)

**Special Rules**:

- Clan XL engines use fewer critical slots than IS XL
- Clan Ferro-Fibrous armor provides 19.2 points per ton vs IS 17.92

### Mixed Tech Rules

**When unit tech base is Mixed**:

- The customizer SHALL display both IS and Clan engine and armor options
- Tech base is determined at unit creation and is read-only in the customizer
- The BLK parser defaults to Inner Sphere when tech base string does not explicitly contain "clan"

---

## BLK Format Integration

### Requirement: BLK Parsing

The system SHALL parse aerospace fighters from BLK format documents via the `AerospaceUnitHandler`.

**Priority**: Critical

#### Scenario: Parsing a standard heavy fighter

**GIVEN** a BLK document with unitType "Aero" and mappedUnitType AEROSPACE
**WHEN** the document is parsed
**THEN** the handler SHALL extract:

- Identity: chassis, model, year, tonnage
- Movement: safeThrust from `document.safeThrust`, maxThrust = floor(safeThrust × 1.5)
- Fuel: from `document.fuel`
- Structure: structuralIntegrity from `document.structuralIntegrity`
- Heat sinks: from `document.heatsinks` (default 10), type from `document.sinkType`
- Armor: parsed as array [nose, leftWing, rightWing, aft] from `document.armor`
- Equipment: parsed from `document.equipmentByLocation` with location normalization
- Cockpit: type code from `document.cockpitType`
- Special features: from `document.rawTags`

#### Scenario: Location string normalization

**GIVEN** equipment location strings from a BLK document
**WHEN** normalizing to `AerospaceLocation` enum values
**THEN** the following mappings SHALL apply:

- "nose", "nose equipment" → NOSE
- "left wing", "left wing equipment" → LEFT_WING
- "right wing", "right wing equipment" → RIGHT_WING
- "aft", "aft equipment" → AFT
- "fuselage", "fuselage equipment" → FUSELAGE
- "wings", "wings equipment" → LEFT_WING (generic mapping)
- Any unrecognized location → FUSELAGE (fallback)

#### Scenario: Equipment mount ID generation

**GIVEN** equipment items parsed from BLK
**WHEN** creating mounted equipment instances
**THEN** each mount SHALL receive a sequential ID in format `mount-{N}` starting from 0

### Requirement: BLK Serialization

The system SHALL serialize aerospace units to the standard format.

**Priority**: High

#### Scenario: Serialization output

**GIVEN** an aerospace fighter
**WHEN** serialized
**THEN** the output SHALL include `configuration: "Aerodyne"` and `rulesLevel` as string

#### Scenario: Deserialization not yet implemented

**GIVEN** a serialized aerospace unit
**WHEN** deserialization is attempted
**THEN** the system SHALL return a failure result with message: "Aerospace deserialization not yet implemented"

---

## Customizer UI Workflow

### Requirement: Tabbed Interface

The aerospace customizer SHALL provide a tabbed interface with three tabs: Structure, Armor, and Equipment.

**Rationale**: Separating configuration into logical groups reduces cognitive load and follows the established MekStation customizer pattern.

**Priority**: Critical

#### Scenario: Default tab

**GIVEN** the aerospace customizer is opened
**WHEN** no initial tab is specified
**THEN** the Structure tab SHALL be displayed by default

#### Scenario: Tab definitions

**GIVEN** the aerospace customizer tab bar
**WHEN** rendered
**THEN** the following tabs SHALL be available:

- "Structure & Engine" (short: "Structure")
- "Armor Configuration" (short: "Armor")
- "Weapons & Equipment" (short: "Equipment")

#### Scenario: Read-only mode

**GIVEN** the aerospace customizer in read-only mode
**WHEN** any tab is displayed
**THEN** all input controls SHALL be disabled
**AND** the equipment tab SHALL display a notice: "This aerospace fighter is in read-only mode. Changes cannot be made."

### Requirement: Structure Tab

The Structure tab SHALL allow configuration of chassis, engine, thrust, cockpit, heat sinks, and special features.

**Priority**: Critical

#### Scenario: Structure tab sections

**GIVEN** the Structure tab is active
**WHEN** rendered
**THEN** it SHALL display four sections:

1. Chassis: tonnage select, tech base display (read-only), OmniFighter toggle
2. Engine & Movement: engine type select, safe thrust stepper (with max thrust display), engine rating display (read-only, calculated), fuel points input
3. Structure & Cockpit: structural integrity stepper, cockpit type select, reinforced cockpit toggle, ejection seat toggle
4. Heat Management & Special: heat sink stepper, double heat sinks toggle (with dissipation display), bomb bay toggle, bomb capacity input (shown only when bomb bay enabled)

### Requirement: Armor Tab

The Armor tab SHALL allow configuration of armor type, tonnage, and per-arc allocation.

**Priority**: Critical

#### Scenario: Armor configuration section

**GIVEN** the Armor tab is active
**WHEN** rendered
**THEN** it SHALL display: armor type select, armor tonnage input (step 0.5), points summary (available, allocated, unallocated, points/ton), and action buttons (Auto-Allocate, Maximize, Clear)

#### Scenario: Arc allocation

**GIVEN** the Armor tab
**WHEN** the arc allocation section is rendered
**THEN** it SHALL display sliders and numeric inputs for Nose, Left Wing, Right Wing, and Aft
**AND** each arc input SHALL be clamped to [0, maxArcArmor]

#### Scenario: Armor type options

**GIVEN** the armor type select
**WHEN** rendered
**THEN** the following options SHALL be available: Standard, Ferro-Fibrous (IS), Ferro-Fibrous (Clan), Light Ferro-Fibrous, Heavy Ferro-Fibrous, Stealth

#### Scenario: Armor diagram

**GIVEN** the Armor tab
**WHEN** rendered
**THEN** a simple text-based armor diagram SHALL display Nose, Left Wing, Right Wing, and Aft values in a spatial layout

### Requirement: Equipment Tab

The Equipment tab SHALL allow browsing, adding, and managing equipment by firing arc.

**Priority**: Critical

#### Scenario: Equipment browser

**GIVEN** the Equipment tab is active
**WHEN** rendered
**THEN** it SHALL display an equipment browser for adding new items
**AND** new equipment SHALL default to the NOSE arc

#### Scenario: Mounted equipment list

**GIVEN** equipment has been added to the aerospace unit
**WHEN** the mounted equipment section is rendered
**THEN** each item SHALL display: name, arc selector (Nose, Left Wing, Right Wing, Aft, Fuselage), and a remove button
**AND** a "Clear All" button SHALL appear when equipment exists

#### Scenario: Arc reassignment

**GIVEN** a mounted equipment item
**WHEN** the user changes the arc selector
**THEN** the equipment's firing arc SHALL be updated immediately

### Requirement: Fighter Diagram Sidebar

The aerospace customizer SHALL display a fighter overview diagram in a sidebar on large screens.

**Priority**: Medium

#### Scenario: Diagram display

**GIVEN** the aerospace customizer on a large screen (≥ lg breakpoint)
**WHEN** rendered
**THEN** a sidebar SHALL display an SVG top-down fighter diagram with:

- Fuselage body shape
- Left and right wing shapes
- Nose cone indicator
- Engine exhaust indicators
- Armor values overlaid per arc with color-coding (cyan > 75%, green > 50%, amber > 25%, red ≤ 25%)
- Structural Integrity displayed at center
- Thrust display in header ("Aerospace Fighter • {safe}/{max} Thrust")

#### Scenario: Compact diagram mode

**GIVEN** the diagram component with `compact=true`
**WHEN** rendered
**THEN** it SHALL display a minimal 3×3 grid with only armor values per arc

### Requirement: Status Bar

The aerospace customizer SHALL display a persistent status bar showing key statistics.

**Priority**: High

#### Scenario: Status bar items

**GIVEN** the aerospace customizer
**WHEN** the status bar is rendered
**THEN** it SHALL display: Tonnage (with "ASF" label), Weight Free (with percentage), Thrust (safe/max), Fuel (points), SI, Armor (with unallocated indicator), Heat (with DHS/SHS label), Equipment count

#### Scenario: Status indicators

**GIVEN** the status bar
**WHEN** weight or armor values change
**THEN** Weight Free SHALL show: error (red) if negative, success (green) if zero, normal (white) otherwise
**AND** Armor SHALL show: error (red) if over-allocated, warning (amber) if under-allocated, success (green) if fully allocated

#### Scenario: Compact status bar

**GIVEN** the status bar with `compact=true`
**WHEN** rendered
**THEN** it SHALL display a single-line summary: "{tonnage}t ASF | {safe}/{max} Thrust | {fuel} Fuel | {armor} armor | {remaining}t free"

---

## State Management

### Requirement: Zustand Store Architecture

The aerospace state SHALL be managed via isolated Zustand stores with one store instance per aerospace unit.

**Priority**: Critical

#### Scenario: Store creation

**GIVEN** a new aerospace unit
**WHEN** a store is created via `createAerospaceStore(initialState)`
**THEN** the store SHALL be a Zustand store with persist middleware
**AND** persistence key SHALL be `megamek-aerospace-{id}`
**AND** persistence SHALL use `clientSafeStorage` for SSR compatibility
**AND** hydration SHALL be skipped initially (`skipHydration: true`)

#### Scenario: Store partialize

**GIVEN** a persisted aerospace store
**WHEN** serializing state
**THEN** only state properties SHALL be persisted (not action functions)
**AND** all state fields listed in the Required Properties table SHALL be included

#### Scenario: React context

**GIVEN** an aerospace customizer component tree
**WHEN** accessing the store
**THEN** the `AerospaceStoreContext` SHALL provide the store instance
**AND** `useAerospaceStore(selector)` SHALL select state from context
**AND** accessing the store outside a provider SHALL throw: "useAerospaceStore must be used within an AerospaceStoreProvider"

#### Scenario: Modification tracking

**GIVEN** any state mutation action
**WHEN** the action completes
**THEN** `isModified` SHALL be set to `true`
**AND** `lastModifiedAt` SHALL be set to `Date.now()`

---

## Dependencies

### Depends On

- **engine-system**: Engine type definitions and weight multipliers used in status bar weight calculations
- **armor-system**: Armor type definitions, points-per-ton ratios for armor allocation and display
- **construction-rules-core**: Overall construction validation framework
- **unit-entity-model**: Base `IBaseUnit` interface that `IAerospaceUnit` extends
- **equipment-database**: Equipment item definitions used by the equipment browser
- **unit-validation-framework**: Validation rule interfaces (`IUnitValidationRuleDefinition`, severity levels, result factories)

### Used By

- **serialization-formats**: BLK format handling for aerospace units
- **customizer-tabs**: Aerospace customizer integrates into the main customizer tab system
- **unit-store-architecture**: Aerospace store follows the unit store registry pattern

### Construction Sequence

1. Create aerospace unit with tonnage, tech base, and unit type selection
2. Configure engine type and thrust (auto-calculates engine rating)
3. Set structural integrity, cockpit type, and heat sinks
4. Allocate armor type, tonnage, and per-arc distribution
5. Mount equipment by firing arc
6. Validate construction rules
7. Save/export unit

---

## Implementation Notes

### Performance Considerations

- Store selectors are used individually per field to minimize React re-renders
- Armor allocation calculations use `useMemo` for derived values
- Equipment list operations (add, remove, arc change) create new arrays for immutable state updates

### Edge Cases

- **Zero armor tonnage**: Auto-allocate SHALL produce all-zero allocations
- **Tonnage change with existing equipment**: Equipment is NOT cleared when tonnage changes
- **Generic "wings" location**: BLK files using generic "wings" location string SHALL map to LEFT_WING
- **Missing BLK fields**: Parser uses fallback defaults (safeThrust: 0, fuel: 0, heatsinks: 10, cockpitType: Standard)
- **Ejection seat default**: Defaults to `true` in both new unit creation and BLK parsing when not explicitly specified

### Common Pitfalls

- **Pitfall**: Setting maxThrust independently from safeThrust
  - **Solution**: maxThrust is always derived via `floor(safeThrust × 1.5)` and MUST NOT be set directly
- **Pitfall**: Forgetting to update name when chassis or model changes
  - **Solution**: `setChassis` and `setModel` actions automatically recompute `name` as `"{chassis} {model}"`
- **Pitfall**: Over-allocating armor points beyond available
  - **Solution**: UI displays unallocated count with color-coded warnings; validation catches over-allocation

---

## Examples

### Example 1: Creating a Default 50-Ton Fighter

**Input**:

```typescript
const options: CreateAerospaceOptions = {
  name: 'Eagle EGL-R6',
  tonnage: 50,
  techBase: TechBase.INNER_SPHERE,
};
```

**Processing**:

```typescript
const state = createDefaultAerospaceState(options);
// safeThrust = 6 (tonnage ≤ 60)
// engineRating = 50 × 6 = 300
// maxThrust = floor(6 × 1.5) = 9
// fuel = 50 × 5 = 250
// SI = ceil(50 / 10) = 5
```

**Output**:

```typescript
{
  name: 'Eagle EGL-R6',
  chassis: 'Eagle',
  model: 'EGL-R6',
  tonnage: 50,
  weightClass: WeightClass.MEDIUM,
  techBase: TechBase.INNER_SPHERE,
  unitType: UnitType.AEROSPACE,
  motionType: AerospaceMotionType.AERODYNE,
  engineType: EngineType.STANDARD,
  engineRating: 300,
  safeThrust: 6,
  maxThrust: 9,
  fuel: 250,
  structuralIntegrity: 5,
  cockpitType: AerospaceCockpitType.STANDARD,
  heatSinks: 10,
  doubleHeatSinks: false,
  armorType: ArmorTypeEnum.STANDARD,
  armorTonnage: 0,
  armorAllocation: { Nose: 0, 'Left Wing': 0, 'Right Wing': 0, Aft: 0 },
  hasBombBay: false,
  bombCapacity: 0,
  hasEjectionSeat: true,
}
```

### Example 2: Parsing a Stuka STU-K5 from BLK

**Input BLK Document**:

```typescript
{
  unitType: 'Aero',
  mappedUnitType: UnitType.AEROSPACE,
  name: 'Stuka',
  model: 'STU-K5',
  year: 2571,
  type: 'IS Level 2',
  tonnage: 100,
  safeThrust: 5,
  fuel: 400,
  structuralIntegrity: 8,
  heatsinks: 20,
  sinkType: 0,
  armor: [30, 24, 24, 18],
  equipmentByLocation: {
    'Nose Equipment': ['Large Laser', 'Large Laser'],
    'Left Wing Equipment': ['Medium Laser', 'Medium Laser'],
    'Right Wing Equipment': ['Medium Laser', 'Medium Laser'],
  },
}
```

**Output**:

```typescript
{
  unitType: UnitType.AEROSPACE,
  name: 'Stuka STU-K5',
  tonnage: 100,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  motionType: AerospaceMotionType.AERODYNE,
  movement: { safeThrust: 5, maxThrust: 7 },
  fuel: 400,
  structuralIntegrity: 8,
  heatSinks: 20,
  armorByArc: { nose: 30, leftWing: 24, rightWing: 24, aft: 18 },
  totalArmorPoints: 96,
  equipment: [
    { id: 'mount-0', name: 'Large Laser', location: AerospaceLocation.NOSE },
    { id: 'mount-1', name: 'Large Laser', location: AerospaceLocation.NOSE },
    { id: 'mount-2', name: 'Medium Laser', location: AerospaceLocation.LEFT_WING },
    { id: 'mount-3', name: 'Medium Laser', location: AerospaceLocation.LEFT_WING },
    { id: 'mount-4', name: 'Medium Laser', location: AerospaceLocation.RIGHT_WING },
    { id: 'mount-5', name: 'Medium Laser', location: AerospaceLocation.RIGHT_WING },
  ],
}
```

---

## References

### Official BattleTech Rules

- **TechManual**: Pages 197–224 — Aerospace Fighter Construction
- **Total Warfare**: Pages 77–106 — Aerospace Combat and Movement
- **Strategic Operations**: Capital Ship and Small Craft Construction

### Related Documentation

- `src/stores/aerospaceState.ts` — State interface and factory functions
- `src/stores/useAerospaceStore.ts` — Zustand store implementation
- `src/types/unit/AerospaceInterfaces.ts` — Type definitions
- `src/types/unit/BaseUnitInterfaces.ts` — Base aerospace unit interface
- `src/services/units/handlers/AerospaceUnitHandler.ts` — BLK handler
- `src/services/validation/rules/aerospace/AerospaceCategoryRules.ts` — Validation rules
- `src/components/customizer/aerospace/` — UI components (6 files)

---

## Changelog

### Version 1.0 (2026-02-13)

- Initial specification documenting fully-implemented aerospace unit system
- Covers state management, BLK parsing, validation rules, and customizer UI
- Documents all three aerospace unit types: ASF, Conventional Fighter, Small Craft
