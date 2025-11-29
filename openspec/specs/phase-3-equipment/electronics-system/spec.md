# Electronics System Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2025-11-28
**Dependencies**: Core Entity Types, Core Enumerations, Tech Base Integration, Critical Slot Allocation
**Affects**: Equipment configuration, unit validation, critical slot allocation, tech base locking

---

## Overview

### Purpose
Defines the electronics equipment system for BattleMechs, including targeting computers, electronic warfare systems, command and control networks, and special equipment controllers. Establishes the interfaces, placement rules, functionality, and validation requirements for electronic equipment.

### Scope
**In Scope:**
- Electronics interface definitions (IElectronics base, specialized interfaces)
- Targeting and fire control systems (Targeting Computer, Artemis IV/V, Apollo FCS)
- Electronic warfare systems (ECM, Guardian ECM, Angel ECM, BAP, Bloodhound)
- Command and control systems (C3 Master, C3 Slave, C3i, C3 Boosted)
- Special equipment controllers (MASC, Supercharger, Triple-Strength Myomer controller)
- Tech base variants (IS vs Clan differences)
- Placement restrictions and location rules
- Critical slot requirements and weight calculations
- Mutual exclusivity and compatibility rules

**Out of Scope:**
- Weapon systems (covered in Weapon System spec)
- Ammunition systems (covered in Ammunition System spec)
- Physical equipment effects in combat (covered in Game Mechanics spec)
- Damage and critical hits to electronics (covered in Damage System spec)
- Advanced sensor rules for aerospace and vehicles (covered in Vehicle spec)

### Key Concepts
- **Electronics**: Removable equipment providing targeting, electronic warfare, command, or control functionality
- **Targeting Computer**: Fire control system providing accuracy bonuses to direct-fire weapons
- **Electronic Counter Measures (ECM)**: System that jams enemy targeting and sensors within radius
- **Active Probe**: Enhanced sensor system that detects hidden units and counters ECM
- **Command Network**: C3/C3i system enabling shared targeting data across multiple units
- **Effect Range**: Radius in hexes where electronics provide benefit or penalty
- **Location Restriction**: Requirement that specific electronics must be placed in certain locations

---

## Requirements

### Requirement: Base Electronics Interface
All electronic equipment SHALL implement the IElectronics base interface.

**Rationale**: Electronics share common properties (weight, slots, tech base) while providing diverse functionality. A base interface ensures consistency.

**Priority**: Critical

#### Scenario: Electronics component definition
**GIVEN** an electronic equipment is being defined
**WHEN** creating the interface
**THEN** it MUST extend IElectronics
**AND** provide weight property
**AND** provide criticalSlots property
**AND** provide techBase property
**AND** provide functionality description

#### Scenario: Electronics identification
**GIVEN** a component in the equipment list
**WHEN** determining if it is electronics
**THEN** check if it implements IElectronics
**AND** electronics SHALL be distinguishable from weapons and ammunition

### Requirement: Targeting Computer System
Targeting Computers SHALL provide accuracy bonuses and MUST be placed in torso locations only.

**Rationale**: Targeting Computers are fire control systems that enhance direct-fire weapon accuracy. Torso placement reflects their integration with the mech's main computer systems.

**Priority**: Critical

#### Scenario: Targeting Computer definition
**GIVEN** a Targeting Computer is defined
**WHEN** specifying its properties
**THEN** it SHALL implement ITargetingComputer
**AND** weight SHALL be calculated as ceiling(tonnage / 4) for IS, ceiling(tonnage / 5) for Clan
**AND** criticalSlots SHALL be calculated as ceiling(tonnage / 4) for IS, ceiling(tonnage / 5) for Clan
**AND** it SHALL provide accuracy bonus to direct-fire weapons
**AND** it SHALL NOT provide bonus to indirect-fire weapons

#### Scenario: Targeting Computer placement validation
**GIVEN** a Targeting Computer is being placed
**WHEN** user selects a location
**THEN** location MUST be Center Torso, Left Torso, or Right Torso
**AND** Head, arms, and legs SHALL be invalid locations
**AND** validation error SHALL be raised if placed in invalid location
**AND** error message SHALL be "Targeting Computer must be placed in torso location"

#### Scenario: Targeting Computer weight calculation - Light mech
**GIVEN** a 35-ton BattleMech with Inner Sphere tech base
**WHEN** calculating Targeting Computer requirements
**THEN** weight SHALL be ceiling(35 / 4) = 9 tons
**AND** criticalSlots SHALL be ceiling(35 / 4) = 9 slots

#### Scenario: Targeting Computer weight calculation - Assault mech Clan
**GIVEN** a 100-ton BattleMech with Clan tech base
**WHEN** calculating Targeting Computer requirements
**THEN** weight SHALL be ceiling(100 / 5) = 20 tons
**AND** criticalSlots SHALL be ceiling(100 / 5) = 20 slots

### Requirement: Fire Control Systems
Fire control systems (Artemis IV/V, Apollo) SHALL enhance specific missile weapon accuracy.

**Rationale**: Fire control systems are weapon-specific enhancements that require compatible ammunition and provide targeting bonuses to missile systems.

**Priority**: High

#### Scenario: Artemis IV FCS definition
**GIVEN** an Artemis IV FCS is defined
**WHEN** specifying its properties
**THEN** it SHALL weigh 1 ton per launcher
**AND** it SHALL require 1 critical slot per launcher
**AND** it SHALL be available to both Inner Sphere and Clan
**AND** it SHALL enhance LRM and SRM launchers only
**AND** it SHALL require Artemis-compatible ammunition

#### Scenario: Artemis V FCS definition
**GIVEN** an Artemis V FCS is defined
**WHEN** specifying its properties
**THEN** it SHALL weigh 1 ton per launcher
**AND** it SHALL require 1 critical slot per launcher
**AND** it SHALL be Inner Sphere only
**AND** it SHALL enhance LRM and SRM launchers
**AND** it SHALL provide superior bonus compared to Artemis IV
**AND** it SHALL require Artemis V-compatible ammunition

#### Scenario: Apollo FCS definition
**GIVEN** an Apollo FCS is defined
**WHEN** specifying its properties
**THEN** it SHALL weigh 1 ton per launcher
**AND** it SHALL require 1 critical slot per launcher
**AND** it SHALL be Inner Sphere only
**AND** it SHALL enhance MML (Multi-Missile Launcher) only
**AND** it SHALL work with standard ammunition

### Requirement: Electronic Counter Measures (ECM)
ECM systems SHALL provide jamming within effect radius and have placement flexibility.

**Rationale**: ECM disrupts enemy targeting and communications. Different tech bases have different implementations with varying effectiveness and size.

**Priority**: High

#### Scenario: Guardian ECM Suite definition
**GIVEN** a Guardian ECM Suite is defined
**WHEN** specifying its properties
**THEN** it SHALL be Inner Sphere tech base
**AND** it SHALL weigh 1.5 tons
**AND** it SHALL require 2 critical slots
**AND** it SHALL have 6 hex effect radius
**AND** it SHALL be placeable in any location except Head
**AND** it SHALL jam enemy targeting within radius

#### Scenario: ECM Suite (Clan) definition
**GIVEN** a Clan ECM Suite is defined
**WHEN** specifying its properties
**THEN** it SHALL be Clan tech base
**AND** it SHALL weigh 1 ton
**AND** it SHALL require 1 critical slot
**AND** it SHALL have 6 hex effect radius
**AND** it SHALL be placeable in any location except Head
**AND** it SHALL jam enemy targeting within radius

#### Scenario: Angel ECM Suite definition
**GIVEN** an Angel ECM Suite is defined
**WHEN** specifying its properties
**THEN** it SHALL be Inner Sphere tech base
**AND** it SHALL weigh 2 tons
**AND** it SHALL require 2 critical slots
**AND** it SHALL have 6 hex effect radius
**AND** it SHALL provide enhanced ECM protection
**AND** it SHALL be Experimental rules level

#### Scenario: ECM placement validation
**GIVEN** an ECM Suite is being placed
**WHEN** user selects Head location
**THEN** validation SHALL fail
**AND** error message SHALL be "ECM cannot be placed in Head location"
**WHEN** user selects any other location
**THEN** validation SHALL pass

### Requirement: Active Probe Systems
Active Probes SHALL enhance sensor range and counter ECM effects.

**Rationale**: Active Probes provide advanced detection capabilities and can penetrate ECM jamming, with tech base variants offering different performance characteristics.

**Priority**: High

#### Scenario: Beagle Active Probe definition
**GIVEN** a Beagle Active Probe is defined
**WHEN** specifying its properties
**THEN** it SHALL be Inner Sphere tech base
**AND** it SHALL weigh 1.5 tons
**AND** it SHALL require 2 critical slots
**AND** it SHALL have 4 hex extended sensor range
**AND** it SHALL detect hidden units within range
**AND** it SHALL counter ECM effects
**AND** it SHALL be placeable in any location

#### Scenario: Active Probe (Clan) definition
**GIVEN** a Clan Active Probe is defined
**WHEN** specifying its properties
**THEN** it SHALL be Clan tech base
**AND** it SHALL weigh 1 ton
**AND** it SHALL require 1 critical slot
**AND** it SHALL have 5 hex extended sensor range
**AND** it SHALL detect hidden units within range
**AND** it SHALL counter ECM effects
**AND** it SHALL be placeable in any location

#### Scenario: Bloodhound Active Probe definition
**GIVEN** a Bloodhound Active Probe is defined
**WHEN** specifying its properties
**THEN** it SHALL be Inner Sphere tech base
**AND** it SHALL weigh 2 tons
**AND** it SHALL require 3 critical slots
**AND** it SHALL have 8 hex extended sensor range
**AND** it SHALL provide superior detection capability
**AND** it SHALL be Advanced rules level

### Requirement: Command Network Systems
C3 systems SHALL enable shared targeting data across networked units.

**Rationale**: C3 networks allow multiple units to share targeting information, providing tactical advantages. Different C3 types have different network topologies and requirements.

**Priority**: High

#### Scenario: C3 Master Computer definition
**GIVEN** a C3 Master Computer is defined
**WHEN** specifying its properties
**THEN** it SHALL be Inner Sphere tech base
**AND** it SHALL weigh 5 tons
**AND** it SHALL require 5 critical slots
**AND** it SHALL support up to 3 C3 Slave units
**AND** it SHALL be the network hub
**AND** it SHALL be placeable in any location except Head
**AND** only one SHALL be allowed per unit

#### Scenario: C3 Slave Unit definition
**GIVEN** a C3 Slave Unit is defined
**WHEN** specifying its properties
**THEN** it SHALL be Inner Sphere tech base
**AND** it SHALL weigh 1 ton
**AND** it SHALL require 1 critical slot
**AND** it SHALL connect to C3 Master
**AND** it SHALL be placeable in any location except Head
**AND** only one SHALL be allowed per unit

#### Scenario: C3i Computer definition
**GIVEN** a C3i Computer is defined
**WHEN** specifying its properties
**THEN** it SHALL be Inner Sphere tech base
**AND** it SHALL weigh 2.5 tons
**AND** it SHALL require 2 critical slots
**AND** it SHALL support peer-to-peer network (no master required)
**AND** it SHALL be placeable in any location except Head
**AND** only one SHALL be allowed per unit
**AND** it SHALL be mutually exclusive with C3 Master/Slave

#### Scenario: C3 Boosted System definition
**GIVEN** a C3 Boosted System is defined
**WHEN** specifying its properties
**THEN** it SHALL be Clan tech base
**AND** it SHALL weigh 3 tons
**AND** it SHALL require 2 critical slots
**AND** it SHALL provide enhanced C3 capability
**AND** it SHALL be Advanced rules level
**AND** only one SHALL be allowed per unit

### Requirement: Special Equipment Controllers
Special controllers SHALL enable advanced movement and strength systems.

**Rationale**: MASC, Supercharger, and TSM require control systems that manage their operation and integration with the mech's systems.

**Priority**: Medium

#### Scenario: MASC (Myomer Accelerator Signal Circuitry)
**GIVEN** a MASC system is defined
**WHEN** specifying its properties
**THEN** it SHALL weigh tonnage × 0.05 (5% of mech weight)
**AND** it SHALL require ceiling(weight) critical slots (minimum 1)
**AND** it SHALL increase maximum running speed
**AND** it SHALL be placeable in any location except Head
**AND** it SHALL be mutually exclusive with Supercharger
**AND** it SHALL be both Inner Sphere and Clan variants

#### Scenario: Supercharger
**GIVEN** a Supercharger is defined
**WHEN** specifying its properties
**THEN** it SHALL weigh engine rating / 10 tons
**AND** it SHALL require 1 critical slot
**AND** it SHALL increase maximum running speed
**AND** it SHALL be placeable in any location except Head
**AND** it SHALL be mutually exclusive with MASC
**AND** it SHALL be available to both Inner Sphere and Clan

#### Scenario: Triple-Strength Myomer Controller
**GIVEN** a TSM system is equipped
**WHEN** specifying controller requirements
**THEN** TSM itself SHALL require no additional weight
**AND** TSM SHALL require no additional slots
**AND** TSM SHALL be integrated into internal structure
**AND** TSM SHALL increase melee damage and movement when hot
**AND** it SHALL be Inner Sphere only
**AND** it SHALL be mutually exclusive with MASC

### Requirement: Tech Base Variants
Electronics SHALL have distinct Inner Sphere and Clan implementations where applicable.

**Rationale**: Tech base differences reflect different technological approaches, with Clan equipment typically being lighter and more efficient.

**Priority**: High

#### Scenario: Tech base weight efficiency
**GIVEN** comparable electronics from different tech bases
**WHEN** comparing specifications
**THEN** Clan variants SHALL typically weigh less
**AND** Clan variants SHALL typically require fewer critical slots
**AND** Clan variants MAY have superior performance characteristics
**AND** each variant SHALL have distinct introduction years

#### Scenario: Tech base exclusive equipment
**GIVEN** specialized electronics
**WHEN** filtering by tech base
**THEN** Guardian ECM SHALL be Inner Sphere only
**AND** Beagle Active Probe SHALL be Inner Sphere only
**AND** Artemis V SHALL be Inner Sphere only
**AND** Apollo FCS SHALL be Inner Sphere only
**AND** C3 Master/Slave/C3i SHALL be Inner Sphere only
**AND** C3 Boosted SHALL be Clan only
**AND** some electronics SHALL be available to both tech bases

### Requirement: Mutual Exclusivity Rules
Certain electronics SHALL be mutually exclusive and cannot coexist on the same unit.

**Rationale**: Some electronics serve similar purposes or have incompatible systems, preventing simultaneous installation.

**Priority**: High

#### Scenario: C3 network mutual exclusivity
**GIVEN** a unit has C3 Master or C3 Slave
**WHEN** attempting to add C3i Computer
**THEN** validation SHALL fail
**AND** error message SHALL be "Cannot have both C3 Master/Slave and C3i on same unit"
**AND** user SHALL be required to remove existing C3 equipment

#### Scenario: MASC and Supercharger combination
**GIVEN** a unit has MASC installed
**WHEN** attempting to add Supercharger
**THEN** validation SHALL pass
**AND** combined sprint MP = floor(walkMP × 2.5)
**AND** this represents the most extreme speed boost available

#### Scenario: TSM and MASC mutual exclusivity
**GIVEN** a unit has Triple-Strength Myomer
**WHEN** attempting to add MASC
**THEN** validation SHALL fail
**AND** error message SHALL be "Triple-Strength Myomer and MASC are mutually exclusive"

#### Scenario: Multiple Targeting Computers
**GIVEN** a unit has one Targeting Computer
**WHEN** attempting to add another Targeting Computer
**THEN** validation SHALL fail
**AND** error message SHALL be "Only one Targeting Computer allowed per unit"

### Requirement: Electronics Quantity Limits
Certain electronics SHALL have installation limits.

**Rationale**: Game balance and rules restrictions limit how many of certain electronics can be installed on a single unit.

**Priority**: High

#### Scenario: Single instance electronics
**GIVEN** electronics requiring unique installation
**WHEN** validating equipment list
**THEN** only one Targeting Computer SHALL be allowed
**AND** only one C3 system (Master, Slave, C3i, or Boosted) SHALL be allowed
**AND** only one MASC SHALL be allowed
**AND** only one Supercharger SHALL be allowed

#### Scenario: Multiple ECM allowed
**GIVEN** a unit configuration
**WHEN** adding ECM systems
**THEN** multiple ECM units MAY be installed
**AND** each SHALL function independently
**AND** no mutual exclusivity SHALL apply between ECM variants

#### Scenario: Multiple Active Probes allowed
**GIVEN** a unit configuration
**WHEN** adding Active Probes
**THEN** multiple Active Probes MAY be installed
**AND** no mutual exclusivity SHALL apply

---

## Data Model Requirements

### Required Interfaces

```typescript
/**
 * Base interface for all electronics equipment
 */
interface IElectronics extends
  ITechBaseEntity,
  IPlaceableComponent,
  IValuedComponent,
  ITemporalEntity,
  IDocumentedEntity {
  /**
   * Electronics category classification
   */
  readonly category: ElectronicsCategory;

  /**
   * Functional description of what this electronics provides
   */
  readonly functionality: string;

  /**
   * Effect range in hexes (if applicable)
   * Undefined for electronics without area effect
   */
  readonly effectRange?: number;

  /**
   * Location restrictions for placement
   * Empty array means placeable anywhere
   */
  readonly locationRestrictions: LocationRestriction[];
}

/**
 * Targeting Computer interface
 */
interface ITargetingComputer extends IElectronics {
  readonly category: ElectronicsCategory.TARGETING;

  /**
   * Accuracy bonus provided to direct-fire weapons
   */
  readonly accuracyBonus: number;

  /**
   * Whether this TC affects energy weapons
   */
  readonly affectsEnergy: boolean;

  /**
   * Whether this TC affects ballistic weapons
   */
  readonly affectsBallistic: boolean;

  /**
   * Whether this TC affects missile weapons
   */
  readonly affectsMissile: boolean;
}

/**
 * Fire Control System interface (Artemis, Apollo)
 */
interface IFireControlSystem extends IElectronics {
  readonly category: ElectronicsCategory.TARGETING;

  /**
   * Weapon types this FCS is compatible with
   */
  readonly compatibleWeapons: WeaponType[];

  /**
   * Whether special ammunition is required
   */
  readonly requiresSpecialAmmo: boolean;

  /**
   * Accuracy bonus modifier
   */
  readonly accuracyBonus: number;
}

/**
 * Electronic Counter Measures interface
 */
interface IECM extends IElectronics {
  readonly category: ElectronicsCategory.ELECTRONIC_WARFARE;
  readonly effectRange: number; // Always defined for ECM

  /**
   * Whether this ECM can jam C3 networks
   */
  readonly jamsC3: boolean;

  /**
   * Whether this is enhanced/improved ECM
   */
  readonly isEnhanced: boolean;
}

/**
 * Active Probe interface
 */
interface IActiveProbe extends IElectronics {
  readonly category: ElectronicsCategory.ELECTRONIC_WARFARE;
  readonly effectRange: number; // Always defined for probes

  /**
   * Whether this probe can counter ECM
   */
  readonly countersECM: boolean;

  /**
   * Whether this probe detects hidden units
   */
  readonly detectsHidden: boolean;
}

/**
 * Command and Control Network interface
 */
interface IC3System extends IElectronics {
  readonly category: ElectronicsCategory.COMMAND_CONTROL;

  /**
   * Network topology type
   */
  readonly networkType: C3NetworkType;

  /**
   * Maximum number of connected units (undefined = unlimited in network)
   */
  readonly maxConnections?: number;

  /**
   * Whether this is a network master/hub
   */
  readonly isMaster: boolean;
}

/**
 * Special Equipment Controller interface
 */
interface ISpecialController extends IElectronics {
  readonly category: ElectronicsCategory.SPECIAL_SYSTEMS;

  /**
   * System this controller operates
   */
  readonly controlsSystem: SpecialSystemType;

  /**
   * Weight calculation formula (if weight depends on unit tonnage or engine)
   */
  readonly weightFormula?: string;
}
```

### Required Enumerations

```typescript
/**
 * Electronics category classification
 */
enum ElectronicsCategory {
  /**
   * Targeting and fire control systems
   */
  TARGETING = 'Targeting',

  /**
   * Electronic warfare (ECM, Active Probe)
   */
  ELECTRONIC_WARFARE = 'Electronic Warfare',

  /**
   * Command and control networks
   */
  COMMAND_CONTROL = 'Command & Control',

  /**
   * Special system controllers
   */
  SPECIAL_SYSTEMS = 'Special Systems'
}

/**
 * Location placement restrictions
 */
enum LocationRestriction {
  /**
   * Must be placed in torso (CT, LT, or RT)
   */
  TORSO_ONLY = 'TorsoOnly',

  /**
   * Cannot be placed in Head
   */
  NO_HEAD = 'NoHead',

  /**
   * Cannot be placed in Legs
   */
  NO_LEGS = 'NoLegs',

  /**
   * Can be placed anywhere
   */
  UNRESTRICTED = 'Unrestricted'
}

/**
 * C3 Network topology types
 */
enum C3NetworkType {
  /**
   * C3 Master (hub of network)
   */
  MASTER = 'Master',

  /**
   * C3 Slave (connects to master)
   */
  SLAVE = 'Slave',

  /**
   * C3i (peer-to-peer network)
   */
  C3I = 'C3i',

  /**
   * C3 Boosted (Clan enhanced)
   */
  BOOSTED = 'Boosted'
}

/**
 * Special systems requiring controllers
 */
enum SpecialSystemType {
  /**
   * Myomer Accelerator Signal Circuitry
   */
  MASC = 'MASC',

  /**
   * Engine Supercharger
   */
  SUPERCHARGER = 'Supercharger',

  /**
   * Triple-Strength Myomer
   */
  TSM = 'Triple-Strength Myomer'
}
```

### Required Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `category` | `ElectronicsCategory` | Yes | Electronics type | Enum value | - |
| `functionality` | `string` | Yes | Functional description | Non-empty string | - |
| `effectRange` | `number` | No | Effect radius in hexes | Integer >= 0 | undefined |
| `locationRestrictions` | `LocationRestriction[]` | Yes | Placement rules | Array of enum values | [] |
| `accuracyBonus` | `number` | Yes* | Accuracy modifier | >= 0 | - |
| `compatibleWeapons` | `WeaponType[]` | Yes** | Compatible weapon types | Array of enum values | - |
| `requiresSpecialAmmo` | `boolean` | Yes** | Special ammo required | true/false | - |
| `networkType` | `C3NetworkType` | Yes*** | C3 topology | Enum value | - |
| `maxConnections` | `number` | No | Max network size | Integer > 0 | undefined |
| `isMaster` | `boolean` | Yes*** | Is network master | true/false | - |
| `controlsSystem` | `SpecialSystemType` | Yes**** | Controlled system | Enum value | - |
| `weightFormula` | `string` | No | Weight calculation | Formula string | undefined |

\* Required for ITargetingComputer and IFireControlSystem
\** Required for IFireControlSystem
\*** Required for IC3System
\**** Required for ISpecialController

### Type Constraints

- `effectRange` MUST be a positive integer when defined
- `locationRestrictions` array MUST contain valid LocationRestriction values
- `accuracyBonus` MUST be >= 0
- `maxConnections` MUST be > 0 when defined
- `compatibleWeapons` array MUST NOT be empty for IFireControlSystem
- Targeting Computer weight formula: `ceiling(mechTonnage / divisor)` where divisor = 4 (IS) or 5 (Clan)
- MASC weight formula: `mechTonnage × 0.05`
- Supercharger weight formula: `engineRating / 10`

---

## Calculation Formulas

### Targeting Computer Weight and Slots

**Formula**:
```
For Inner Sphere:
  weight = ceiling(mechTonnage / 4)
  criticalSlots = ceiling(mechTonnage / 4)

For Clan:
  weight = ceiling(mechTonnage / 5)
  criticalSlots = ceiling(mechTonnage / 5)
```

**Where**:
- `mechTonnage` = total tonnage of the BattleMech
- `ceiling()` = round up to nearest integer

**Example**:
```
Input: 65-ton BattleMech, Inner Sphere
Calculation:
  weight = ceiling(65 / 4) = ceiling(16.25) = 17 tons
  criticalSlots = ceiling(65 / 4) = 17 slots
Output: Targeting Computer weighs 17 tons, requires 17 slots
```

**Special Cases**:
- Minimum weight/slots: 1 (for mechs under 4 tons for IS, 5 tons for Clan - theoretical only)
- Maximum practical: 25 tons/slots (100-ton mech with IS TC)

### MASC Weight and Slots

**Formula**:
```
weight = mechTonnage × 0.05
criticalSlots = ceiling(weight)
minimum criticalSlots = 1
```

**Where**:
- `mechTonnage` = total tonnage of the BattleMech
- Weight is exact (may be fractional)
- Slots are always integer (rounded up)

**Example**:
```
Input: 55-ton BattleMech
Calculation:
  weight = 55 × 0.05 = 2.75 tons
  criticalSlots = ceiling(2.75) = 3 slots
Output: MASC weighs 2.75 tons, requires 3 slots
```

**Special Cases**:
- Minimum: 1 ton, 1 slot (20-ton mech)
- Maximum: 5 tons, 5 slots (100-ton mech)

### Supercharger Weight

**Formula**:
```
weight = engineRating / 10
criticalSlots = 1 (always)
```

**Where**:
- `engineRating` = engine rating number

**Example**:
```
Input: Engine Rating 300
Calculation:
  weight = 300 / 10 = 30 tons
  criticalSlots = 1
Output: Supercharger weighs 30 tons, requires 1 slot
```

**Special Cases**:
- Result may be fractional (e.g., 175 rating = 17.5 tons)
- Always exactly 1 critical slot regardless of weight

**Rounding Rules**:
- Targeting Computer: Always round UP (ceiling function)
- MASC weight: No rounding (exact fractional tons)
- MASC slots: Round UP (ceiling function)
- Supercharger weight: No rounding (exact fractional tons)

---

## Validation Rules

### Validation: Targeting Computer Location

**Rule**: Targeting Computer must be placed in torso locations only

**Severity**: Error

**Condition**:
```typescript
if (equipment instanceof ITargetingComputer) {
  const validLocations = [
    MechLocation.CENTER_TORSO,
    MechLocation.LEFT_TORSO,
    MechLocation.RIGHT_TORSO
  ];
  if (!validLocations.includes(equipment.location)) {
    // invalid - emit error
  }
}
```

**Error Message**: "Targeting Computer must be placed in torso location (CT, LT, or RT)"

**User Action**: Move Targeting Computer to Center Torso, Left Torso, or Right Torso

### Validation: ECM Head Placement

**Rule**: ECM systems cannot be placed in Head location

**Severity**: Error

**Condition**:
```typescript
if (equipment instanceof IECM) {
  if (equipment.location === MechLocation.HEAD) {
    // invalid - emit error
  }
}
```

**Error Message**: "ECM cannot be placed in Head location"

**User Action**: Move ECM to any location except Head

### Validation: C3 Mutual Exclusivity

**Rule**: Unit cannot have both C3 Master/Slave and C3i systems

**Severity**: Error

**Condition**:
```typescript
const hasC3MasterOrSlave = equipment.some(e =>
  e instanceof IC3System &&
  (e.networkType === C3NetworkType.MASTER || e.networkType === C3NetworkType.SLAVE)
);
const hasC3i = equipment.some(e =>
  e instanceof IC3System && e.networkType === C3NetworkType.C3I
);

if (hasC3MasterOrSlave && hasC3i) {
  // invalid - emit error
}
```

**Error Message**: "Cannot equip both C3 Master/Slave and C3i on the same unit"

**User Action**: Remove either C3 Master/Slave or C3i system

### Validation: MASC and Supercharger Combination

**Rule**: MASC and Supercharger MAY be combined for enhanced speed

**Severity**: Info (no error)

**Behavior**:
```typescript
const hasMASC = equipment.some(e =>
  e instanceof ISpecialController && e.controlsSystem === SpecialSystemType.MASC
);
const hasSupercharger = equipment.some(e =>
  e instanceof ISpecialController && e.controlsSystem === SpecialSystemType.SUPERCHARGER
);

if (hasMASC && hasSupercharger) {
  // VALID - combined sprint MP = floor(walkMP × 2.5)
  // This is the most extreme speed boost available
}
```

**Effect**: When MASC is activated with Supercharger installed, sprint MP = floor(walkMP × 2.5)

**Note**: Both systems have individual risks (MASC damage, Supercharger explosion) that stack

### Validation: TSM and MASC Exclusivity

**Rule**: Triple-Strength Myomer and MASC are mutually exclusive

**Severity**: Error

**Condition**:
```typescript
const hasTSM = internalStructure.structureType === StructureType.TSM;
const hasMASC = equipment.some(e =>
  e instanceof ISpecialController && e.controlsSystem === SpecialSystemType.MASC
);

if (hasTSM && hasMASC) {
  // invalid - emit error
}
```

**Error Message**: "Triple-Strength Myomer and MASC are mutually exclusive"

**User Action**: Remove MASC or change internal structure away from TSM

### Validation: Single Targeting Computer

**Rule**: Only one Targeting Computer allowed per unit

**Severity**: Error

**Condition**:
```typescript
const targetingComputers = equipment.filter(e => e instanceof ITargetingComputer);
if (targetingComputers.length > 1) {
  // invalid - emit error
}
```

**Error Message**: "Only one Targeting Computer allowed per unit"

**User Action**: Remove duplicate Targeting Computers

### Validation: Single C3 System

**Rule**: Only one C3 system (Master, Slave, C3i, or Boosted) allowed per unit

**Severity**: Error

**Condition**:
```typescript
const c3Systems = equipment.filter(e => e instanceof IC3System);
if (c3Systems.length > 1) {
  // invalid - emit error
}
```

**Error Message**: "Only one C3 system allowed per unit"

**User Action**: Remove duplicate C3 systems

### Validation: Electronics Weight Budget

**Rule**: Electronics weight must not exceed available tonnage

**Severity**: Error

**Condition**:
```typescript
const electronicsWeight = equipment
  .filter(e => e instanceof IElectronics)
  .reduce((sum, e) => sum + e.weight, 0);

if (totalAllocatedWeight > mechTonnage) {
  // invalid - emit error
}
```

**Error Message**: "Electronics weight exceeds available tonnage budget"

**User Action**: Remove electronics or reduce other equipment weight

### Validation: Critical Slot Availability

**Rule**: Electronics critical slots must fit in allocated locations

**Severity**: Error

**Condition**:
```typescript
for (const location of mechLocations) {
  const usedSlots = getUsedSlotsInLocation(location);
  const maxSlots = getMaxSlotsForLocation(location);

  if (usedSlots > maxSlots) {
    // invalid - emit error for this location
  }
}
```

**Error Message**: "Insufficient critical slots in [Location] for electronics"

**User Action**: Move electronics to location with available slots or remove equipment

---

## Tech Base Variants

### Inner Sphere Implementation

**Differences from base specification**:
- Targeting Computer: `weight = ceiling(tonnage / 4)`, `slots = ceiling(tonnage / 4)`
- Guardian ECM Suite: 1.5 tons, 2 slots, 6 hex range
- Beagle Active Probe: 1.5 tons, 2 slots, 4 hex range
- Bloodhound Active Probe: 2 tons, 3 slots, 8 hex range
- C3 Master: 5 tons, 5 slots, supports 3 slaves
- C3 Slave: 1 ton, 1 slot
- C3i Computer: 2.5 tons, 2 slots
- MASC (IS): Same weight formula, may have different introduction year

**Special Rules**:
- Artemis V and Apollo FCS are Inner Sphere exclusive
- C3 systems (Master/Slave/C3i) are Inner Sphere exclusive
- Guardian ECM is Inner Sphere only (Clan has standard ECM)

**Example**:
```typescript
const guardianECM: IECM = {
  id: 'ecm-guardian-is',
  name: 'Guardian ECM Suite',
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  category: ElectronicsCategory.ELECTRONIC_WARFARE,
  weight: 1.5,
  criticalSlots: 2,
  effectRange: 6,
  jamsC3: true,
  isEnhanced: false,
  locationRestrictions: [LocationRestriction.NO_HEAD]
};
```

### Clan Implementation

**Differences from base specification**:
- Targeting Computer: `weight = ceiling(tonnage / 5)`, `slots = ceiling(tonnage / 5)` (more efficient)
- ECM Suite (Clan): 1 ton, 1 slot, 6 hex range
- Active Probe (Clan): 1 ton, 1 slot, 5 hex range (better than Beagle)
- C3 Boosted System: 3 tons, 2 slots, Clan exclusive
- MASC (Clan): Same weight formula, different introduction year

**Special Rules**:
- Clan electronics are typically lighter and require fewer slots
- Clan Active Probe has 5 hex range vs Beagle's 4 hex
- C3 Boosted is Clan exclusive (but Clan doesn't have Master/Slave/C3i)

**Example**:
```typescript
const clanECM: IECM = {
  id: 'ecm-clan',
  name: 'ECM Suite',
  techBase: TechBase.CLAN,
  rulesLevel: RulesLevel.STANDARD,
  category: ElectronicsCategory.ELECTRONIC_WARFARE,
  weight: 1,
  criticalSlots: 1,
  effectRange: 6,
  jamsC3: true,
  isEnhanced: false,
  locationRestrictions: [LocationRestriction.NO_HEAD]
};
```

### Mixed Tech Rules

**When unit tech base is Mixed**:
- Unit may equip electronics from either tech base
- Targeting Computer tech base determines weight/slot formula used
- Cannot mix C3 systems from different tech bases in same network
- ECM and Active Probe can be mixed freely
- Tech base compatibility rules apply to all electronics
- Each electronics piece maintains its original tech base classification

---

## Dependencies

### Depends On
- **Core Entity Types**: IEntity, ITechBaseEntity, IPlaceableComponent, IValuedComponent, ITemporalEntity, IDocumentedEntity
- **Core Enumerations**: TechBase, RulesLevel, Era
- **Tech Base Integration**: Tech base locking rules, compatibility validation
- **Critical Slot Allocation**: Slot placement, location constraints
- **Engine System** (for Supercharger weight calculation): Engine rating access

### Used By
- **Equipment Configuration**: Electronics selection and configuration
- **Unit Validation**: Mutual exclusivity checks, location validation
- **Critical Slot Allocation**: Slot assignment for electronics
- **Weight Calculation**: Total equipment weight budget
- **Tech Base Validation**: Tech base locking based on electronics choices

### Construction Sequence
1. Define core enumerations (TechBase, RulesLevel, Era)
2. Define base entity interfaces (IEntity, ITechBaseEntity, etc.)
3. Define electronics interfaces and enumerations (this spec)
4. Validate location restrictions during placement
5. Calculate electronics weight contributions
6. Validate mutual exclusivity rules
7. Verify critical slot allocation
8. Check tech base compatibility

---

## Implementation Notes

### Performance Considerations
- Cache Targeting Computer weight/slot calculations based on mech tonnage
- Validate mutual exclusivity only when electronics are added/removed
- Location restriction checks can be performed at UI level before validation
- Electronics filtering by tech base should use indexed lookups

### Edge Cases
- **Fractional weights**: MASC and Supercharger can have fractional weights (store as exact decimal)
- **Zero-weight electronics**: None exist, all electronics have weight >= 1 ton
- **Head placement**: Only general prohibition is for ECM; most electronics avoid Head due to limited slots (6)
- **Targeting Computer size**: On very heavy mechs (80-100 tons), TC becomes very large and may not fit
- **C3 networks**: Network functionality requires multiple units; single unit validation only checks component limits
- **TSM interaction**: TSM is part of internal structure, not electronics, but affects MASC compatibility

### Common Pitfalls
- **Pitfall**: Forgetting to validate Targeting Computer location (torso only)
  - **Solution**: Always check location restrictions in placement validation
- **Pitfall**: Allowing multiple C3 systems on same unit
  - **Solution**: Enforce single C3 system rule in validation
- **Pitfall**: Not recalculating Targeting Computer weight when mech tonnage changes
  - **Solution**: Trigger recalculation on tonnage change, show warning if TC no longer fits
- **Pitfall**: Using integer division for Supercharger weight
  - **Solution**: Store exact fractional weight (e.g., 17.5 tons for rating 175)
- **Pitfall**: Forgetting tech base exclusive equipment (Artemis V, C3i, etc.)
  - **Solution**: Filter electronics by tech base before displaying in selection UI

---

## Examples

### Example 1: Guardian ECM Suite

**Input**:
```typescript
const guardianECM: IECM = {
  id: 'ecm-guardian-is',
  name: 'Guardian ECM Suite',
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  category: ElectronicsCategory.ELECTRONIC_WARFARE,
  functionality: 'Jams enemy targeting and communications within 6 hex radius',
  weight: 1.5,
  criticalSlots: 2,
  cost: 200000,
  battleValue: 61,
  effectRange: 6,
  jamsC3: true,
  isEnhanced: false,
  locationRestrictions: [LocationRestriction.NO_HEAD],
  introductionYear: 3045,
  era: Era.CLAN_INVASION,
  sourceBook: 'TechManual',
  pageReference: 213
};
```

**Processing**:
```typescript
// Validate placement
if (selectedLocation === MechLocation.HEAD) {
  throw new ValidationError('ECM cannot be placed in Head location');
}

// Allocate slots in selected location (e.g., Left Torso)
allocateSlots(MechLocation.LEFT_TORSO, guardianECM, 2);
```

**Output**:
```typescript
// Guardian ECM successfully placed in Left Torso
// Slots 1-2 occupied
// Weight: 1.5 tons allocated to equipment budget
// ECM provides 6 hex jamming radius during combat
```

### Example 2: Targeting Computer for 75-ton Mech (IS)

**Input**:
```typescript
const mechTonnage = 75;
const techBase = TechBase.INNER_SPHERE;
```

**Processing**:
```typescript
// Calculate TC requirements
const divisor = techBase === TechBase.INNER_SPHERE ? 4 : 5;
const tcWeight = Math.ceil(mechTonnage / divisor);
const tcSlots = Math.ceil(mechTonnage / divisor);

const targetingComputer: ITargetingComputer = {
  id: 'tc-is-75ton',
  name: 'Targeting Computer',
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  category: ElectronicsCategory.TARGETING,
  functionality: 'Provides accuracy bonus to direct-fire weapons',
  weight: tcWeight, // 19 tons
  criticalSlots: tcSlots, // 19 slots
  accuracyBonus: -1, // -1 to-hit modifier (better accuracy)
  affectsEnergy: true,
  affectsBallistic: true,
  affectsMissile: true,
  locationRestrictions: [LocationRestriction.TORSO_ONLY]
};
```

**Output**:
```typescript
// Targeting Computer: 19 tons, 19 slots
// Must be placed in CT, LT, or RT
// Likely requires split placement across multiple torso locations
// Example: 12 slots in CT, 7 slots in LT
```

### Example 3: MASC for 55-ton Mech

**Input**:
```typescript
const mechTonnage = 55;
const techBase = TechBase.INNER_SPHERE;
```

**Processing**:
```typescript
// Calculate MASC weight
const mascWeight = mechTonnage * 0.05; // 2.75 tons
const mascSlots = Math.ceil(mascWeight); // 3 slots

const masc: ISpecialController = {
  id: 'masc-is',
  name: 'MASC',
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.ADVANCED,
  category: ElectronicsCategory.SPECIAL_SYSTEMS,
  functionality: 'Increases maximum running speed beyond normal limits',
  weight: mascWeight,
  criticalSlots: mascSlots,
  controlsSystem: SpecialSystemType.MASC,
  weightFormula: 'tonnage * 0.05',
  locationRestrictions: [LocationRestriction.NO_HEAD]
};
```

**Output**:
```typescript
// MASC: 2.75 tons, 3 slots
// Can be placed in CT, LT, RT, LA, RA, LL, or RL
// Mutually exclusive with Supercharger and TSM
```

### Example 4: C3 Network Setup

**Input**:
```typescript
// Master unit
const c3Master: IC3System = {
  id: 'c3-master-is',
  name: 'C3 Master Computer',
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  category: ElectronicsCategory.COMMAND_CONTROL,
  functionality: 'Network hub enabling shared targeting for up to 3 slave units',
  weight: 5,
  criticalSlots: 5,
  networkType: C3NetworkType.MASTER,
  maxConnections: 3,
  isMaster: true,
  locationRestrictions: [LocationRestriction.NO_HEAD]
};

// Slave unit
const c3Slave: IC3System = {
  id: 'c3-slave-is',
  name: 'C3 Slave',
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  category: ElectronicsCategory.COMMAND_CONTROL,
  functionality: 'Connects to C3 Master for shared targeting data',
  weight: 1,
  criticalSlots: 1,
  networkType: C3NetworkType.SLAVE,
  isMaster: false,
  locationRestrictions: [LocationRestriction.NO_HEAD]
};
```

**Processing**:
```typescript
// Validate: Cannot have both master and slave on same unit
const hasMultipleC3 = equipment.filter(e => e instanceof IC3System).length > 1;
if (hasMultipleC3) {
  throw new ValidationError('Only one C3 system allowed per unit');
}

// Network-level validation (requires multi-unit context)
// - Ensure slave units connect to a master
// - Verify master doesn't exceed 3 connections
// - Check all units in network are Inner Sphere tech base
```

**Output**:
```typescript
// Master unit: 5 tons, 5 slots for C3 Master
// Slave units (3x): 1 ton, 1 slot each for C3 Slave
// Total network: 1 master + 3 slaves = 4 unit lance
```

### Example 5: Tech Base Comparison - Active Probes

**Inner Sphere**:
```typescript
const beagle: IActiveProbe = {
  id: 'probe-beagle-is',
  name: 'Beagle Active Probe',
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 1.5,
  criticalSlots: 2,
  effectRange: 4, // 4 hex range
  countersECM: true,
  detectsHidden: true
};
```

**Clan**:
```typescript
const clanProbe: IActiveProbe = {
  id: 'probe-clan',
  name: 'Active Probe',
  techBase: TechBase.CLAN,
  rulesLevel: RulesLevel.STANDARD,
  weight: 1, // Lighter
  criticalSlots: 1, // Fewer slots
  effectRange: 5, // Better range
  countersECM: true,
  detectsHidden: true
};
```

**Comparison**:
- Clan: 1 ton, 1 slot, 5 hex range
- IS Beagle: 1.5 tons, 2 slots, 4 hex range
- Clan version is superior in all metrics (lighter, fewer slots, better range)

---

## References

### Official BattleTech Rules
- **TechManual**: Pages 212-214 - Electronic Warfare Equipment
- **TechManual**: Pages 214-216 - Targeting Computer
- **TechManual**: Pages 216-218 - C3 Systems
- **TechManual**: Pages 201-203 - MASC, Supercharger
- **Tactical Operations**: Pages 285-290 - Advanced Electronics
- **Strategic Operations**: C3 Network Rules

### Related Documentation
- [Core Entity Types](../../phase-1-foundation/core-entity-types/spec.md) - Base interfaces
- [Core Enumerations](../../phase-1-foundation/core-enumerations/spec.md) - TechBase, RulesLevel, Era
- [Critical Slot Allocation](../../phase-2-construction/critical-slot-allocation/spec.md) - Slot placement
- [Tech Base Integration](../../phase-2-construction/tech-base-integration/spec.md) - Tech base rules
- [Engine System](../../phase-2-construction/engine-system/spec.md) - Engine rating for Supercharger

### Code References
- Types: `src/types/Equipment.ts`, `src/types/core/EquipmentInterfaces.ts`
- Validation: `src/services/validation/electronicsValidation.ts`
- Calculations: `src/utils/electronicsCalculations.ts`

---

## Changelog

### Version 1.0 (2025-11-28)
- Initial specification
- Defined base IElectronics interface and specialized interfaces
- Specified Targeting Computer, Fire Control Systems, ECM, Active Probe, C3, and Special Controllers
- Established placement restrictions and validation rules
- Defined tech base variants and mutual exclusivity rules
- Added calculation formulas for Targeting Computer, MASC, and Supercharger
- Documented examples for all major electronics categories
