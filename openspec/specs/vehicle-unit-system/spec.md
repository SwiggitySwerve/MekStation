# vehicle-unit-system Specification

## Purpose

Define the complete construction, state management, BLK parsing, customizer UI workflow, and validation rules for the Vehicle unit type — encompassing **combat vehicles** (tanks, APCs, naval), **VTOLs**, and **support vehicles** (civilian/logistics). Vehicles are the most common non-Mech unit type in BattleTech, featuring dual handler architecture, a turret system unique among unit types, and motion-type-driven configuration.

## Non-Goals

- Combat mechanics (damage resolution, motive hits, critical effects) — OUT OF SCOPE
- Record sheet PDF rendering — covered by separate spec
- Equipment database contents — covered by `equipment-database` spec
- BattleMech-specific construction (gyro, actuators, critical slots) — covered by Phase 2 construction specs

## Key Concepts

| Concept         | Description                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Combat Vehicle  | Armed military vehicle (UnitType.VEHICLE). Uses standard armor, turrets, 1–100 tons (superheavy up to 200).                     |
| VTOL            | Vertical Take-Off and Landing vehicle (UnitType.VTOL). Max 30 tons. Chin turret instead of standard turret. Has rotor location. |
| Support Vehicle | Non-combat/lightly-armed vehicle (UnitType.SUPPORT_VEHICLE). Uses BAR armor, size classes, up to 300 tons.                      |
| Motion Type     | Determines movement mode: Tracked, Wheeled, Hover, VTOL, Naval, Hydrofoil, Submarine, WiGE, Rail, Maglev.                       |
| Turret System   | Rotating weapon mount unique to vehicles. Types: None, Single (360°), Dual, Chin (VTOL), Sponson.                               |
| BAR Rating      | Barrier Armor Rating (1–10) used by support vehicles instead of standard armor types.                                           |
| Flank MP        | Derived movement: `floor(cruiseMP × 1.5)`.                                                                                      |

## Requirements

### Requirement: Vehicle Unit Type Classification

The system SHALL classify vehicles into three distinct unit types sharing the Vehicle category.

#### Scenario: Combat vehicle identification

- **GIVEN** a unit with `unitType: UnitType.VEHICLE`
- **WHEN** checking unit classification
- **THEN** the system SHALL treat it as a combat vehicle
- **AND** the `isVehicle()` type guard SHALL return `true`

#### Scenario: VTOL identification

- **GIVEN** a unit with `unitType: UnitType.VTOL`
- **WHEN** checking unit classification
- **THEN** the system SHALL treat it as a VTOL
- **AND** the `isVTOL()` type guard SHALL return `true`
- **AND** `motionType` SHALL always be `GroundMotionType.VTOL`

#### Scenario: Support vehicle identification

- **GIVEN** a unit with `unitType: UnitType.SUPPORT_VEHICLE`
- **WHEN** checking unit classification
- **THEN** the system SHALL treat it as a support vehicle
- **AND** the `isSupportVehicle()` type guard SHALL return `true`
- **AND** the vehicle SHALL have a `sizeClass` and `barRating`

### Requirement: Tonnage Ranges

The system SHALL enforce tonnage ranges per vehicle sub-type.

#### Scenario: Combat vehicle tonnage

- **WHEN** setting tonnage for a combat vehicle
- **THEN** tonnage MUST be between 1 and 100 tons (inclusive)
- **AND** vehicles over 100 tons SHALL be flagged as superheavy (up to 200 tons max for superheavy)

#### Scenario: VTOL tonnage

- **WHEN** setting tonnage for a VTOL
- **THEN** tonnage MUST be between 1 and 30 tons (inclusive)

#### Scenario: Support vehicle tonnage

- **WHEN** setting tonnage for a support vehicle
- **THEN** tonnage MUST be between 1 and 300 tons (inclusive)

### Requirement: Weight Class Determination

The system SHALL derive weight class from tonnage for vehicles.

#### Scenario: Vehicle weight class brackets

- **WHEN** determining weight class from tonnage
- **THEN** the system SHALL apply:
  - 1–19 tons → Light
  - 20–39 tons → Medium
  - 40–59 tons → Heavy
  - 60–100 tons → Assault
  - Over 100 tons → Superheavy

### Requirement: Motion Type System

The system SHALL support 10 motion types with per-type tonnage constraints.

#### Scenario: Motion type options with max tonnage

- **WHEN** selecting a motion type for a vehicle
- **THEN** the available options SHALL be:
  - Tracked — max 200 tons
  - Wheeled — max 80 tons
  - Hover — max 50 tons
  - VTOL — max 30 tons
  - Naval — max 300 tons
  - Hydrofoil — max 100 tons
  - Submarine — max 300 tons
  - WiGE — max 80 tons
  - Rail — max tonnage (tracked equivalent)
  - Maglev — max tonnage (tracked equivalent)
- **AND** tonnage SHALL be clamped to the maximum for the selected motion type

#### Scenario: Switching to VTOL motion type

- **WHEN** changing motion type to VTOL
- **THEN** the system SHALL update `unitType` to `UnitType.VTOL`
- **AND** armor allocation SHALL be reset to include the Rotor location
- **AND** turret options SHALL be limited to None or Chin

#### Scenario: Switching from VTOL motion type

- **WHEN** changing motion type from VTOL to a non-VTOL type
- **THEN** the system SHALL update `unitType` to `UnitType.VEHICLE`
- **AND** armor allocation SHALL be reset without the Rotor location
- **AND** standard turret options SHALL become available (Single, Dual)

### Requirement: Engine and Movement

The system SHALL manage engine configuration and derive movement points.

#### Scenario: Engine rating calculation

- **WHEN** configuring a vehicle's engine
- **THEN** engine rating SHALL equal `tonnage × cruiseMP`
- **AND** engine rating SHALL be clamped between 10 and 400
- **AND** changing tonnage SHALL recalculate engine rating to maintain cruise MP
- **AND** changing cruise MP SHALL recalculate engine rating

#### Scenario: Flank MP derivation

- **WHEN** cruise MP is set to any value
- **THEN** flank MP SHALL be `floor(cruiseMP × 1.5)`
- **AND** flank MP SHALL be read-only (derived)

#### Scenario: Engine type selection

- **WHEN** selecting an engine type
- **THEN** the available types SHALL include: Standard Fusion, XL (IS), XL (Clan), Light, XXL, Compact, ICE, Fuel Cell, Fission
- **AND** trailers SHALL have engine type disabled (no engine)

#### Scenario: Engine weight multipliers for combat vehicles

- **WHEN** calculating engine weight
- **THEN** the system SHALL apply these multipliers to base weight:
  - Standard Fusion: 1.0×
  - XL: 0.5×
  - XXL: 0.33×
  - Compact: 1.5×
  - Light: 0.75×
  - ICE: 2.0×
  - Fuel Cell: 1.2×
  - Fission: 1.75×

### Requirement: Turret System

The system SHALL provide turret configuration unique to the Vehicle unit type.

#### Scenario: Turret types

- **WHEN** configuring a turret
- **THEN** the available types SHALL be:
  - None — no turret, fixed weapon mounts only
  - Single — 360° rotation for weapons
  - Dual — two independent turrets
  - Chin — forward-facing VTOL turret (VTOL only)

#### Scenario: Turret type filtering by motion type

- **WHEN** the vehicle is a VTOL
- **THEN** only None and Chin turret types SHALL be available
- **WHEN** the vehicle is a ground vehicle (non-VTOL)
- **THEN** only None, Single, and Dual turret types SHALL be available (Chin excluded)

#### Scenario: Turret creation

- **WHEN** selecting a turret type other than None
- **THEN** the system SHALL create a turret configuration with:
  - `maxWeight`: 10% of vehicle tonnage
  - `currentWeight`: 0 (initially empty)
  - `rotationArc`: 360°

#### Scenario: Removing turret

- **WHEN** setting turret type to None
- **THEN** the turret configuration SHALL be set to `null`
- **AND** any turret-mounted equipment SHALL be moved to Body location

#### Scenario: Turret weight capacity validation

- **WHEN** turret-mounted equipment exceeds turret capacity
- **THEN** validation rule VAL-VEH-003 SHALL report an error
- **AND** the error SHALL include the overflow amount in tons

### Requirement: Armor System for Vehicles

The system SHALL manage armor allocation across vehicle locations.

#### Scenario: Combat vehicle armor locations

- **WHEN** configuring armor for a combat vehicle
- **THEN** the available locations SHALL be: Front, Left, Right, Rear, Turret (if turret configured), Body
- **AND** turret location SHALL only be available when a turret is configured

#### Scenario: VTOL armor locations

- **WHEN** configuring armor for a VTOL
- **THEN** the available locations SHALL include the standard vehicle locations plus Rotor
- **AND** rotor maximum armor SHALL be 2 points (fixed)

#### Scenario: Armor types for combat vehicles

- **WHEN** selecting armor type
- **THEN** the available types SHALL include: Standard, Ferro-Fibrous (IS), Ferro-Fibrous (Clan), Light Ferro-Fibrous, Heavy Ferro-Fibrous, Stealth, Hardened, Reactive, Reflective

#### Scenario: Maximum armor calculation for combat vehicles

- **WHEN** calculating maximum armor for a combat vehicle
- **THEN** max total armor SHALL be `floor(tonnage × 3.5)`

#### Scenario: Auto-allocation algorithm

- **WHEN** auto-allocating armor
- **THEN** the system SHALL distribute armor with approximate TechManual percentages:
  - Front: 35%
  - Left/Right sides: 20% each
  - Rear: 15%
  - Turret (if present): 10%
  - Rotor (if VTOL): 2%
- **AND** all percentages SHALL be normalized to sum to 100%
- **AND** each location SHALL receive `floor(totalPoints × locationPercent / normalizer)`

#### Scenario: Armor points from tonnage

- **WHEN** calculating available armor points
- **THEN** points SHALL equal `floor(armorTonnage × pointsPerTon)`
- **AND** Standard armor provides 16 points per ton
- **AND** other armor types use their specific points-per-ton ratio from ArmorTypeEnum definitions

### Requirement: Support Vehicle Armor (BAR System)

Support vehicles SHALL use the BAR (Barrier Armor Rating) system instead of standard armor types.

#### Scenario: BAR rating range

- **WHEN** configuring support vehicle armor
- **THEN** BAR rating MUST be between 1 and 10

#### Scenario: BAR effect on max armor

- **WHEN** calculating maximum armor for a support vehicle
- **THEN** max armor SHALL be `floor(tonnage × 3.5 × (barRating / 10))`
- **AND** BAR 10 provides full armor effectiveness (equivalent to standard)
- **AND** BAR 5 provides half armor effectiveness

#### Scenario: BAR effect on armor weight

- **WHEN** calculating support vehicle armor weight
- **THEN** weight per armor point SHALL be `0.0625 × (barRating / 10)`
- **AND** lower BAR ratings result in lighter armor per point

### Requirement: Support Vehicle Size Classes

Support vehicles SHALL be classified by size based on tonnage.

#### Scenario: Size class determination

- **WHEN** determining support vehicle size class
- **THEN** the system SHALL classify as:
  - Small: 1–5 tons (max 5 tons)
  - Medium: 6–80 tons (max 80 tons)
  - Large: 81+ tons (max 300 tons)

#### Scenario: Size class tonnage limits in validation

- **WHEN** validating a support vehicle's tonnage against its size class
- **THEN** Small vehicles SHALL NOT exceed 5 tons
- **AND** Medium vehicles SHALL NOT exceed 80 tons
- **AND** Large vehicles SHALL NOT exceed 300 tons

### Requirement: Support Vehicle Specific Properties

Support vehicles SHALL have additional properties not found on combat vehicles.

#### Scenario: Cargo capacity

- **WHEN** configuring a support vehicle
- **THEN** the vehicle SHALL have a `cargoCapacity` in tons (default 0)
- **AND** cargo capacity SHALL be parsed from `cargo` or `cargocapacity` BLK raw tags

#### Scenario: Crew and passengers

- **WHEN** configuring a support vehicle
- **THEN** the vehicle SHALL track `crewSize` (default 1) and `passengerCapacity` (default 0)

#### Scenario: Tech ratings

- **WHEN** configuring a support vehicle
- **THEN** the vehicle SHALL track three tech ratings (default 5 each):
  - `structuralTechRating`
  - `armorTechRating`
  - `engineTechRating`

### Requirement: Vehicle Equipment Management

The system SHALL manage equipment mounting with vehicle-specific options.

#### Scenario: Equipment mount properties

- **WHEN** mounting equipment on a vehicle
- **THEN** each mount SHALL track:
  - `id`: unique mount identifier
  - `equipmentId`: reference to equipment definition
  - `name`: display name
  - `location`: VehicleLocation or VTOLLocation
  - `isRearMounted`: whether the equipment faces rear
  - `isTurretMounted`: whether mounted in turret
  - `isSponsonMounted`: whether in sponson mount
  - `linkedAmmoId`: optional linked ammunition

#### Scenario: Default equipment placement

- **WHEN** adding equipment without specifying a location
- **THEN** the equipment SHALL default to the Body location
- **AND** `isTurretMounted` SHALL default to `false`

#### Scenario: Moving equipment to turret

- **WHEN** changing equipment location to Turret
- **THEN** `isTurretMounted` SHALL be set to `true`
- **AND** the equipment SHALL count against turret weight capacity

#### Scenario: Removing equipment from turret

- **WHEN** removing equipment from turret
- **THEN** the equipment SHALL be moved to Body location
- **AND** `isTurretMounted` SHALL be set to `false`

#### Scenario: Equipment location options by vehicle type

- **WHEN** displaying equipment location options for a ground vehicle
- **THEN** options SHALL include: Front, Left, Right, Rear, Turret (if configured), Body
- **WHEN** displaying equipment location options for a VTOL
- **THEN** options SHALL include: Front, Left, Right, Rear, Chin Turret (if configured), Body, Rotor

### Requirement: Special Vehicle Features

The system SHALL support vehicle-specific construction features.

#### Scenario: Special feature toggles

- **WHEN** configuring a combat vehicle
- **THEN** the following boolean features SHALL be available:
  - Environmental Sealing
  - Flotation Hull
  - Amphibious
  - Trailer Hitch
  - Is Trailer (no engine)
- **AND** marking as Trailer SHALL disable engine type selection
- **AND** trailers SHALL not require minimum cruise MP

#### Scenario: OmniVehicle toggle

- **WHEN** toggling OmniVehicle
- **THEN** `isOmni` SHALL be set accordingly
- **AND** this affects pod space availability (implementation detail)

### Requirement: Vehicle State Shape

The system SHALL maintain vehicle state with the following structure.

#### Scenario: VehicleState interface

- **WHEN** creating or loading a vehicle
- **THEN** the state SHALL include:
  - **Identity**: `id`, `name`, `chassis`, `model`, `mulId`, `year`, `rulesLevel`, `tonnage`, `weightClass` (readonly, derived), `techBase` (readonly)
  - **Configuration**: `unitType` (VEHICLE | VTOL | SUPPORT_VEHICLE), `motionType`, `isOmni`
  - **Engine**: `engineType`, `engineRating`, `cruiseMP`, `flankMP` (readonly, derived)
  - **Turret**: `turret` (ITurretConfiguration | null), `secondaryTurret` (ITurretConfiguration | null)
  - **Armor**: `armorType`, `armorTonnage`, `armorAllocation` (IVehicleArmorAllocation | IVTOLArmorAllocation)
  - **Special Features**: `isSuperheavy`, `hasEnvironmentalSealing`, `hasFlotationHull`, `isAmphibious`, `hasTrailerHitch`, `isTrailer`
  - **Equipment**: `equipment` (readonly IVehicleMountedEquipment[])
  - **Metadata**: `isModified`, `createdAt` (readonly), `lastModifiedAt`

#### Scenario: Default vehicle state

- **WHEN** creating a new vehicle with default options
- **THEN** the defaults SHALL be:
  - `motionType`: Tracked
  - `unitType`: VEHICLE
  - `cruiseMP`: 4
  - `engineRating`: tonnage × 4
  - `engineType`: Standard Fusion
  - `armorType`: Standard
  - `armorTonnage`: 0
  - `turret`: null
  - All special features: false
  - `isSuperheavy`: tonnage > 100
  - `equipment`: empty array

### Requirement: Vehicle Store Actions

The system SHALL expose actions for modifying vehicle state.

#### Scenario: Tonnage change side effects

- **WHEN** changing vehicle tonnage
- **THEN** the system SHALL:
  - Recalculate `weightClass`
  - Recalculate `engineRating` to maintain current `cruiseMP`
  - Clamp engine rating between 10 and 400
  - Update `isSuperheavy` flag
  - Mark state as modified

#### Scenario: Cruise MP change side effects

- **WHEN** changing cruise MP
- **THEN** the system SHALL:
  - Update `flankMP` to `floor(cruiseMP × 1.5)`
  - Recalculate `engineRating` to `tonnage × cruiseMP`
  - Mark state as modified

#### Scenario: Engine rating change side effects

- **WHEN** changing engine rating directly
- **THEN** the system SHALL:
  - Update `cruiseMP` to `floor(rating / tonnage)`
  - Update `flankMP` accordingly
  - Mark state as modified

### Requirement: Customizer UI Workflow

The system SHALL provide a tabbed customizer interface for vehicles.

#### Scenario: Tab layout

- **WHEN** opening the vehicle customizer
- **THEN** the system SHALL display four tabs:
  1. **Structure & Engine** — tonnage, motion type, engine, turret type, special features
  2. **Armor Configuration** — armor type, tonnage, per-location allocation with diagram
  3. **Equipment** — equipment browser with mounted equipment management
  4. **Turret** — turret type config, turret weapon management, move-to/from-turret

#### Scenario: Status bar

- **WHEN** the vehicle customizer is open
- **THEN** a status bar SHALL display: tonnage, weight free, movement (cruise/flank), armor allocated, turret capacity (if applicable), equipment count
- **AND** weight overages SHALL show in red
- **AND** unallocated armor SHALL show in amber

#### Scenario: Vehicle diagram sidebar

- **WHEN** on large screens
- **THEN** a vehicle diagram sidebar SHALL show an SVG top-down view
- **AND** the diagram SHALL display armor values per location color-coded by fill percentage
- **AND** the diagram SHALL show motion-type-specific visual indicators (tracks, wheels, rotors)

### Requirement: BLK Format Parsing — Combat Vehicles

The `VehicleUnitHandler` SHALL parse combat vehicle BLK documents.

#### Scenario: Basic combat vehicle parsing

- **GIVEN** a BLK document with `mappedUnitType: UnitType.VEHICLE`
- **WHEN** parsing the document
- **THEN** the handler SHALL extract:
  - Motion type from `document.motionType` (case-insensitive, default: Tracked)
  - Cruise/Flank MP from `document.cruiseMP`
  - Engine rating as `cruiseMP × tonnage`
  - Armor array mapped to locations in order: Front, Left, Right, Rear, Turret

#### Scenario: Turret detection in BLK

- **WHEN** parsing equipment locations
- **THEN** the handler SHALL detect turrets from:
  - Equipment in `Turret Equipment` or `Turret` location keys
  - `turrettype` raw tag (values: `dual`, `chin`)
- **AND** default turret type SHALL be Single if turret equipment exists

#### Scenario: Vehicle special flags from raw tags

- **WHEN** parsing raw BLK tags
- **THEN** the handler SHALL extract boolean flags:
  - `environmentalsealing` → `hasEnvironmentalSealing`
  - `flotationhull` → `hasFlotationHull`
  - `amphibious` → `isAmphibious`
  - `trailerhitch` → `hasTrailerHitch`
  - `trailer` → `isTrailer`
- **AND** boolean parsing SHALL accept `true` or `1` (case-insensitive)

#### Scenario: Equipment location normalization

- **WHEN** parsing equipment from BLK location keys
- **THEN** the handler SHALL normalize locations:
  - `Front Equipment` / `Front` → VehicleLocation.FRONT
  - `Left Equipment` / `Left Side` → VehicleLocation.LEFT
  - `Right Equipment` / `Right Side` → VehicleLocation.RIGHT
  - `Rear Equipment` / `Rear` → VehicleLocation.REAR
  - `Turret Equipment` / `Turret` → VehicleLocation.TURRET (turret-mounted)
  - `Body Equipment` / `Body` / default → VehicleLocation.BODY

### Requirement: BLK Format Parsing — Support Vehicles

The `SupportVehicleUnitHandler` SHALL parse support vehicle BLK documents.

#### Scenario: Basic support vehicle parsing

- **GIVEN** a BLK document with `mappedUnitType: UnitType.SUPPORT_VEHICLE`
- **WHEN** parsing the document
- **THEN** the handler SHALL extract:
  - Motion type (case-insensitive, default: Wheeled)
  - BAR rating from `bar` or `barrating` raw tags (default: 5)
  - Cargo capacity from `cargo` or `cargocapacity` raw tags (default: 0)
  - Crew size from `document.crew` (default: 1)
  - Passenger capacity from `document.passengers` (default: 0)
  - Tech ratings from `structuraltechrating`, `armortechrating`, `enginetechrating` raw tags (default: 5 each)
  - Size class derived from tonnage

#### Scenario: Support vehicle motion type mapping

- **WHEN** parsing motion type for support vehicles
- **THEN** the handler SHALL map additional types:
  - `Airship` → Hover
  - `Fixed` → Tracked (placeholder)
- **AND** unknown types SHALL default to Wheeled

#### Scenario: Stationary support vehicles

- **WHEN** a support vehicle has 0 cruise MP
- **THEN** flank MP SHALL also be 0
- **AND** this SHALL be valid (support vehicles may be stationary)

### Requirement: Tech Base Parsing

The system SHALL parse tech base from BLK type strings.

#### Scenario: Inner Sphere tech base

- **WHEN** the BLK `type` string contains `IS` or does not contain `Clan`
- **THEN** tech base SHALL be `TechBase.INNER_SPHERE`

#### Scenario: Clan tech base

- **WHEN** the BLK `type` string contains `Clan` (but not `Mixed`)
- **THEN** tech base SHALL be `TechBase.CLAN`

#### Scenario: Mixed tech

- **WHEN** the BLK `type` string contains `Mixed`
- **THEN** tech base SHALL default to `TechBase.INNER_SPHERE` per VAL-ENUM-004

### Requirement: Rules Level Parsing

The system SHALL parse rules level from BLK type strings.

#### Scenario: Rules level detection

- **WHEN** parsing rules level from the `type` string
- **THEN** the system SHALL map:
  - `Level 1` or `Introductory` → INTRODUCTORY
  - `Level 2` or `Standard` → STANDARD
  - `Level 3` or `Advanced` → ADVANCED
  - `Level 4` or `Experimental` → EXPERIMENTAL
  - Default → STANDARD

### Requirement: Validation Rules

The system SHALL enforce vehicle-specific validation rules.

#### Scenario: VAL-VEH-001 — Engine Required

- **WHEN** validating any vehicle category unit
- **THEN** the unit MUST have an engine
- **AND** violation SHALL be `CRITICAL_ERROR` severity

#### Scenario: VAL-VEH-002 — Motive System Required

- **WHEN** validating any vehicle category unit
- **THEN** the unit MUST have a motive system type selected
- **AND** violation SHALL be `CRITICAL_ERROR` severity

#### Scenario: VAL-VEH-003 — Turret Capacity Limits

- **WHEN** validating a vehicle with a turret (VEHICLE or SUPPORT_VEHICLE, not VTOL)
- **THEN** turret equipment weight MUST NOT exceed turret capacity
- **AND** violation SHALL be `ERROR` severity
- **AND** the error SHALL report the overflow amount

#### Scenario: VAL-VEH-004 — VTOL Rotor Required

- **WHEN** validating a VTOL unit
- **THEN** the VTOL MUST have a rotor system
- **AND** violation SHALL be `CRITICAL_ERROR` severity

#### Scenario: VAL-VEH-005 — Vehicle Tonnage Range

- **WHEN** validating vehicle tonnage
- **THEN** tonnage MUST be within the valid range for the unit type:
  - VEHICLE: 1–100 tons
  - VTOL: 1–30 tons
  - SUPPORT_VEHICLE: 1–300 tons
- **AND** violation SHALL be `CRITICAL_ERROR` severity

#### Scenario: Combat vehicle handler validation

- **WHEN** the VehicleUnitHandler validates a combat vehicle
- **THEN** it SHALL additionally check:
  - Tonnage ≥ 1 ton
  - Vehicles over 100 tons MUST be marked superheavy
  - Tonnage SHALL NOT exceed 200 tons (absolute max)
  - Non-trailer vehicles MUST have ≥ 1 cruise MP
  - Total armor SHALL NOT exceed max armor points (`floor(tonnage × 3.5)`)
  - Turret weight SHALL NOT exceed turret capacity
  - Hover vehicles over 50 tons generate a WARNING

#### Scenario: Support vehicle handler validation

- **WHEN** the SupportVehicleUnitHandler validates a support vehicle
- **THEN** it SHALL additionally check:
  - Size class tonnage limits (Small ≤ 5, Medium ≤ 80, Large ≤ 300)
  - BAR rating between 1 and 10
  - Total armor SHALL NOT exceed max armor points (`floor(tonnage × 3.5 × barRating / 10)`)
  - Cargo capacity generates an INFO message when > 0

### Requirement: Combat vs Support Vehicle Differences

The system SHALL maintain clear distinctions between combat and support vehicles.

#### Scenario: Key differences summary

- **WHEN** comparing combat and support vehicles
- **THEN** the differences SHALL be:

| Aspect         | Combat Vehicle         | Support Vehicle                      |
| -------------- | ---------------------- | ------------------------------------ |
| Unit Type      | `UnitType.VEHICLE`     | `UnitType.SUPPORT_VEHICLE`           |
| Handler        | `VehicleUnitHandler`   | `SupportVehicleUnitHandler`          |
| Max Tonnage    | 100 (200 superheavy)   | 300                                  |
| Armor System   | Standard armor types   | BAR rating (1–10)                    |
| Size Classes   | Weight class only      | Small/Medium/Large                   |
| Default Motion | Tracked                | Wheeled                              |
| Cargo          | Not tracked            | `cargoCapacity` property             |
| Crew           | Not tracked            | `crewSize`, `passengerCapacity`      |
| Tech Ratings   | Not tracked            | structural/armor/engine tech ratings |
| Turret         | Standard turret        | Turret available                     |
| Superheavy     | Over 100 tons flag     | Not applicable                       |
| Stationary     | Not allowed (min 1 MP) | Allowed (0 MP)                       |
| Base Cost      | tonnage × 10,000       | tonnage × 5,000                      |
| Engine Cost    | rating × 5,000         | rating × 2,000                       |
| BV Formula     | armor × 2.5 × moveMod  | armor × 1.5 × (BAR/10) × moveMod     |

### Requirement: Vehicle Store Persistence

The system SHALL persist vehicle state using Zustand with localStorage.

#### Scenario: Store creation and persistence

- **WHEN** creating a vehicle store
- **THEN** the store SHALL use `persist` middleware with `zustand/middleware`
- **AND** storage key SHALL be `megamek-vehicle-{vehicleId}`
- **AND** hydration SHALL be skipped initially (`skipHydration: true`)
- **AND** only state (not actions) SHALL be persisted via `partialize`

#### Scenario: React context integration

- **WHEN** rendering vehicle customizer components
- **THEN** the vehicle store SHALL be provided via `VehicleStoreContext`
- **AND** components SHALL access state via `useVehicleStore(selector)` hook
- **AND** the store API SHALL be accessible via `useVehicleStoreApi()` hook

### Requirement: BV and Cost Calculations

The system SHALL calculate Battle Value and C-Bill cost for vehicles.

#### Scenario: Combat vehicle BV calculation

- **WHEN** calculating BV for a combat vehicle
- **THEN** base BV SHALL include:
  - Armor BV: `totalArmorPoints × 2.5`
  - Movement modifier: `1 + (cruiseMP - 1) × 0.1`
  - Total: `armorBV × movementModifier`

#### Scenario: Support vehicle BV calculation

- **WHEN** calculating BV for a support vehicle
- **THEN** base BV SHALL include:
  - Armor BV: `totalArmorPoints × 1.5 × (barRating / 10)`
  - Movement modifier: `1 + cruiseMP × 0.05` (if mobile)
  - Stationary vehicles get no movement modifier

#### Scenario: Combat vehicle cost calculation

- **WHEN** calculating cost for a combat vehicle
- **THEN** cost SHALL include:
  - Structure: `tonnage × 10,000`
  - Engine: `engineRating × 5,000`
  - Armor: `totalArmorPoints × 10,000`

#### Scenario: Support vehicle cost calculation

- **WHEN** calculating cost for a support vehicle
- **THEN** cost SHALL include:
  - Chassis: `tonnage × 5,000`
  - Engine: `engineRating × 2,000` (if mobile)
  - Armor: `totalArmorPoints × 5,000 × (barRating / 10)`
  - Cargo: `cargoCapacity × 1,000`

## Data Model

### IVehicle Interface

```typescript
interface IVehicle extends IGroundUnit {
  readonly unitType: UnitType.VEHICLE;
  readonly motionType: GroundMotionType;
  readonly turret?: ITurretConfiguration;
  readonly secondaryTurret?: ITurretConfiguration;
  readonly internalStructureType: number;
  readonly armorByLocation: Record<VehicleLocation, number>;
  readonly equipment: readonly IVehicleMountedEquipment[];
  readonly isSuperheavy: boolean;
  readonly hasEnvironmentalSealing: boolean;
  readonly hasFlotationHull: boolean;
  readonly isAmphibious: boolean;
  readonly hasTrailerHitch: boolean;
  readonly isTrailer: boolean;
}
```

### ISupportVehicle Interface

```typescript
interface ISupportVehicle extends IGroundUnit {
  readonly unitType: UnitType.SUPPORT_VEHICLE;
  readonly motionType: GroundMotionType;
  readonly sizeClass: SupportVehicleSizeClass; // Small | Medium | Large
  readonly barRating: number; // 1–10
  readonly structuralTechRating: number;
  readonly armorTechRating: number;
  readonly engineTechRating: number;
  readonly cargoCapacity: number;
  readonly crewSize: number;
  readonly passengerCapacity: number;
  readonly equipment: readonly IVehicleMountedEquipment[];
}
```

### ITurretConfiguration Interface

```typescript
interface ITurretConfiguration {
  readonly type: TurretType; // None | Single | Dual | Chin | Sponson Left | Sponson Right
  readonly maxWeight: number; // Maximum turret weight capacity
  readonly currentWeight: number; // Current turret weight usage
  readonly rotationArc: number; // Degrees (360 for full rotation)
}
```

### IVehicleMountedEquipment Interface

```typescript
interface IVehicleMountedEquipment {
  readonly id: string;
  readonly equipmentId: string;
  readonly name: string;
  readonly location: VehicleLocation | VTOLLocation;
  readonly isRearMounted: boolean;
  readonly isTurretMounted: boolean;
  readonly isSponsonMounted: boolean;
  readonly linkedAmmoId?: string;
}
```

### VehicleState Interface

```typescript
interface VehicleState {
  // Identity
  readonly id: string;
  name: string;
  chassis: string;
  model: string;
  mulId: string;
  year: number;
  rulesLevel: RulesLevel;
  tonnage: number;
  readonly weightClass: WeightClass;
  readonly techBase: TechBase;

  // Configuration
  readonly unitType:
    | UnitType.VEHICLE
    | UnitType.VTOL
    | UnitType.SUPPORT_VEHICLE;
  motionType: GroundMotionType;
  isOmni: boolean;

  // Engine & Movement
  engineType: EngineType;
  engineRating: number;
  cruiseMP: number;
  readonly flankMP: number;

  // Turret
  turret: ITurretConfiguration | null;
  secondaryTurret: ITurretConfiguration | null;

  // Armor
  armorType: ArmorTypeEnum;
  armorTonnage: number;
  armorAllocation: IVehicleArmorAllocation | IVTOLArmorAllocation;

  // Special Features
  isSuperheavy: boolean;
  hasEnvironmentalSealing: boolean;
  hasFlotationHull: boolean;
  isAmphibious: boolean;
  hasTrailerHitch: boolean;
  isTrailer: boolean;

  // Equipment
  equipment: readonly IVehicleMountedEquipment[];

  // Metadata
  isModified: boolean;
  readonly createdAt: number;
  lastModifiedAt: number;
}
```

## Source Files

| File                                                            | Lines | Purpose                                                                                       |
| --------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------- |
| `src/types/unit/VehicleInterfaces.ts`                           | 223   | IVehicle, ISupportVehicle, IVTOL, ITurretConfiguration, IVehicleMountedEquipment, type guards |
| `src/stores/vehicleState.ts`                                    | 461   | VehicleState, VehicleActions, factory functions, armor allocation helpers                     |
| `src/stores/useVehicleStore.ts`                                 | 577   | Zustand store factory, persistence, React context, hooks                                      |
| `src/services/units/handlers/VehicleUnitHandler.ts`             | 602   | Combat vehicle BLK parsing, validation, serialization, calculations                           |
| `src/services/units/handlers/SupportVehicleUnitHandler.ts`      | 504   | Support vehicle BLK parsing, BAR system, size classes, calculations                           |
| `src/services/validation/rules/vehicle/VehicleCategoryRules.ts` | 319   | VAL-VEH-001 through VAL-VEH-005 validation rules                                              |
| `src/components/customizer/vehicle/VehicleCustomizer.tsx`       | 181   | Main customizer with 4-tab layout                                                             |
| `src/components/customizer/vehicle/VehicleStructureTab.tsx`     | 402   | Chassis, engine, movement, turret type, special features                                      |
| `src/components/customizer/vehicle/VehicleArmorTab.tsx`         | 539   | Armor type, tonnage, per-location allocation, diagram                                         |
| `src/components/customizer/vehicle/VehicleEquipmentTab.tsx`     | 306   | Equipment browser, mounted equipment, location selection                                      |
| `src/components/customizer/vehicle/VehicleTurretTab.tsx`        | 394   | Turret configuration, turret weapon management                                                |
| `src/components/customizer/vehicle/VehicleStatusBar.tsx`        | 299   | Compact stats bar (tonnage, movement, armor, weight free)                                     |
| `src/components/customizer/vehicle/VehicleDiagram.tsx`          | 396   | SVG vehicle diagram with armor values                                                         |
| `src/services/construction/constructionConstants.ts`            | —     | VEHICLE_TONNAGE, VTOL_TONNAGE, SUPPORT_VEHICLE_TONNAGE ranges                                 |

## Dependencies

- `armor-system` — armor types, points-per-ton definitions
- `engine-system` — engine type definitions, weight calculations
- `unit-store-architecture` — store registry pattern, context provider pattern
- `equipment-database` — equipment item definitions
- `unit-validation-framework` — validation rule interfaces, severity levels
- `core-enumerations` — TechBase, RulesLevel, Era, WeightClass, UnitType enums
- `construction-rules-core` — general construction rule framework
