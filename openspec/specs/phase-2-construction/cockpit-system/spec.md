# Cockpit System Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2025-11-27
**Dependencies**: Core Entity Types, Physical Properties System, Critical Slot Allocation, Engine System, Gyro System
**Affects**: Unit construction, pilot survival rules, head/torso slot allocation, initiative modifiers, validation

---

## Overview

### Purpose
Defines the cockpit system for BattleMechs, including cockpit types, weight requirements, critical slot placement rules, special abilities, and pilot survival mechanics. The cockpit is the command center of a BattleMech, housing the pilot and control systems, and is one of the most critical components affecting mech operation and pilot safety.

### Scope
**In Scope:**
- Cockpit type definitions (Standard, Small, Command Console, Torso-Mounted, Primitive)
- Weight specifications for each cockpit type
- Critical slot placement rules in Head and Center Torso
- Head slot layout with Life Support, Sensors, and Cockpit components
- Special abilities and modifiers (initiative bonuses, piloting penalties, command capabilities)
- Pilot survival and critical hit rules
- Ejection system capabilities
- Tech base variants and availability by era
- Compatibility restrictions with other systems

**Out of Scope:**
- Pilot skill ratings and experience (covered in Pilot System spec)
- Combat damage calculations (covered in Damage System spec)
- Advanced cockpit types for IndustrialMechs (future IndustrialMech spec)
- Interface cockpit and DNI systems (experimental, future Advanced Cockpit spec)
- Dual cockpit configurations for training mechs (specialized variant)
- Vehicle and aerospace cockpits (covered in Vehicle/Aerospace specs)

### Key Concepts
- **Cockpit**: The control center and pilot compartment of a BattleMech, housing the pilot, controls, sensors, and life support
- **Head-Mounted Cockpit**: Standard configuration with cockpit in the Head location (Standard, Small, Command Console, Primitive)
- **Torso-Mounted Cockpit**: Alternative configuration with cockpit in Center Torso, leaving Head available for equipment
- **Life Support**: Critical system maintaining atmospheric and environmental control (2 critical slots in Head)
- **Sensors**: Target acquisition and battlefield awareness systems (2 critical slots in Head)
- **Cockpit Slot**: Single critical slot containing the cockpit control systems (1 slot in Head or CT)
- **Ejection System**: Emergency escape mechanism for pilot survival (not available on all cockpit types)
- **Command Console**: Specialized cockpit providing enhanced command and control for lance/company leadership

---

## Requirements

### Requirement: Cockpit Type Classification
All BattleMechs SHALL have exactly one cockpit type from the defined set of cockpit variants.

**Rationale**: BattleTech construction rules define specific cockpit types with distinct characteristics, weights, and capabilities. Each mech must have exactly one cockpit.

**Priority**: Critical

#### Scenario: Standard Cockpit default
**GIVEN** a new BattleMech is being constructed
**WHEN** no cockpit type is explicitly specified
**THEN** Standard Cockpit SHALL be used by default
**AND** weight SHALL be 3 tons
**AND** cockpit SHALL occupy 1 critical slot in Head
**AND** ejection system SHALL be available

#### Scenario: Only one cockpit per mech
**GIVEN** a BattleMech configuration
**WHEN** validating cockpit assignment
**THEN** exactly one cockpit type MUST be assigned
**AND** multiple cockpits SHALL NOT be allowed
**AND** zero cockpits SHALL fail validation

#### Scenario: Cockpit type must be valid
**GIVEN** a cockpit type assignment
**WHEN** validating the cockpit
**THEN** type MUST be one of: Standard, Small, Command Console, Torso-Mounted, Primitive
**AND** invalid cockpit types SHALL be rejected
**AND** error message SHALL list valid cockpit types

### Requirement: Standard Cockpit Specifications
The Standard Cockpit SHALL be the baseline cockpit with fixed weight and standard capabilities.

**Rationale**: Standard Cockpit is the most common configuration, available to all tech bases and eras, serving as the reference implementation.

**Priority**: Critical

#### Scenario: Standard Cockpit weight
**GIVEN** a BattleMech with Standard Cockpit
**WHEN** calculating cockpit weight
**THEN** weight SHALL be exactly 3.0 tons
**AND** weight SHALL NOT vary based on mech tonnage
**AND** weight SHALL be included in total mech weight

#### Scenario: Standard Cockpit head slot layout
**GIVEN** a BattleMech with Standard Cockpit
**WHEN** allocating Head critical slots
**THEN** slot 0 SHALL contain Life Support (fixed)
**AND** slot 1 SHALL contain Sensors (fixed)
**AND** slot 2 SHALL contain Cockpit (fixed)
**AND** slot 3 SHALL be available for equipment
**AND** slot 4 SHALL contain Sensors (fixed)
**AND** slot 5 SHALL contain Life Support (fixed)
**AND** total Head slots used by fixed components SHALL be 5
**AND** available Head slots for equipment SHALL be 1

#### Scenario: Standard Cockpit capabilities
**GIVEN** a BattleMech with Standard Cockpit
**WHEN** determining cockpit capabilities
**THEN** ejection system SHALL be available
**AND** life support SHALL be operational
**AND** no piloting skill modifiers SHALL apply
**AND** no initiative modifiers SHALL apply
**AND** tech base SHALL be Both (Inner Sphere and Clan)
**AND** rules level SHALL be Standard

### Requirement: Small Cockpit Specifications
The Small Cockpit SHALL provide weight savings at the cost of piloting penalties.

**Rationale**: Small Cockpit reduces weight by 1 ton but imposes a +1 piloting skill penalty due to cramped conditions.

**Priority**: High

#### Scenario: Small Cockpit weight savings
**GIVEN** a BattleMech with Small Cockpit
**WHEN** calculating cockpit weight
**THEN** weight SHALL be exactly 2.0 tons
**AND** weight savings SHALL be 1 ton compared to Standard Cockpit
**AND** this weight SHALL be available for other components

#### Scenario: Small Cockpit piloting penalty
**GIVEN** a BattleMech with Small Cockpit
**WHEN** pilot makes piloting skill checks
**THEN** a +1 penalty SHALL be applied to all piloting rolls
**AND** penalty SHALL represent cramped conditions
**AND** penalty SHALL apply for entire mech operation

#### Scenario: Small Cockpit head layout
**GIVEN** a BattleMech with Small Cockpit
**WHEN** allocating Head critical slots
**THEN** slot layout SHALL be identical to Standard Cockpit
**AND** slot 2 SHALL contain Small Cockpit instead of Standard Cockpit
**AND** 1 available equipment slot SHALL remain (slot 3)

#### Scenario: Small Cockpit availability
**GIVEN** a unit configuration
**WHEN** validating Small Cockpit selection
**THEN** tech base SHALL be Both (Inner Sphere and Clan)
**AND** rules level SHALL be Advanced or Experimental
**AND** Standard rules level SHALL NOT allow Small Cockpit
**AND** ejection system SHALL be available

### Requirement: Command Console Cockpit Specifications
The Command Console Cockpit SHALL provide command and control capabilities with initiative bonus.

**Rationale**: Command Console enables a MechWarrior to coordinate lance/company operations, providing tactical advantages but requiring additional critical space and removing ejection capability.

**Priority**: High

#### Scenario: Command Console weight
**GIVEN** a BattleMech with Command Console
**WHEN** calculating cockpit weight
**THEN** weight SHALL be exactly 3.0 tons
**AND** weight SHALL be same as Standard Cockpit
**AND** additional command equipment SHALL not add weight

#### Scenario: Command Console initiative bonus
**GIVEN** a BattleMech with Command Console
**WHEN** rolling initiative
**THEN** a -2 modifier SHALL be applied to initiative roll
**AND** lower initiative number is better (acts sooner)
**AND** bonus SHALL represent enhanced tactical coordination

#### Scenario: Command Console head layout
**GIVEN** a BattleMech with Command Console
**WHEN** allocating Head critical slots
**THEN** slot 0 SHALL contain Life Support (fixed)
**AND** slot 1 SHALL contain Sensors (fixed)
**AND** slot 2 SHALL contain Cockpit (fixed)
**AND** slot 3 SHALL be available for equipment
**AND** slot 4 SHALL contain Command Console (fixed)
**AND** slot 5 SHALL contain Life Support (fixed)
**AND** total Head slots used by fixed components SHALL be 6
**AND** available Head slots for equipment SHALL be 0

#### Scenario: Command Console capabilities
**GIVEN** a BattleMech with Command Console
**WHEN** determining cockpit capabilities
**THEN** ejection system SHALL NOT be available
**AND** pilot CANNOT eject in emergency
**AND** command capabilities SHALL allow coordinating other units
**AND** +1 command bonus SHALL apply to coordinated units

#### Scenario: Command Console availability
**GIVEN** a unit configuration
**WHEN** validating Command Console selection
**THEN** tech base SHALL be Both (Inner Sphere and Clan)
**AND** rules level SHALL be Advanced or Experimental
**AND** Standard rules level SHALL NOT allow Command Console

### Requirement: Torso-Mounted Cockpit Specifications
The Torso-Mounted Cockpit SHALL be located in Center Torso, freeing Head slots for equipment.

**Rationale**: Torso-Mounted Cockpit moves the pilot compartment to the Center Torso, making the mech more survivable against headshots but increasing weight and imposing piloting penalties.

**Priority**: High

#### Scenario: Torso-Mounted Cockpit weight
**GIVEN** a BattleMech with Torso-Mounted Cockpit
**WHEN** calculating cockpit weight
**THEN** weight SHALL be exactly 4.0 tons
**AND** weight increase SHALL be 1 ton compared to Standard Cockpit
**AND** additional weight SHALL represent reinforced torso mounting

#### Scenario: Torso-Mounted Cockpit Center Torso placement
**GIVEN** a BattleMech with Torso-Mounted Cockpit
**WHEN** allocating Center Torso critical slots
**THEN** cockpit SHALL occupy CT slot 11 (fixed)
**AND** cockpit SHALL be placed after engine, gyro, and heat sinks
**AND** CT slot 11 SHALL NOT be available for other equipment

#### Scenario: Torso-Mounted Cockpit head modification
**GIVEN** a BattleMech with Torso-Mounted Cockpit
**WHEN** allocating Head critical slots
**THEN** slot 0 SHALL be empty (available)
**AND** slot 1 SHALL be empty (available)
**AND** slot 2 SHALL be empty (available)
**AND** slot 3 SHALL be empty (available)
**AND** slot 4 SHALL be empty (available)
**AND** slot 5 SHALL contain Life Support (fixed)
**AND** total Head slots available for equipment SHALL be 5
**AND** sensors SHALL be removed from Head
**AND** Life Support SHALL occupy only 1 slot (slot 5)

#### Scenario: Torso-Mounted Cockpit piloting penalty
**GIVEN** a BattleMech with Torso-Mounted Cockpit
**WHEN** pilot makes piloting skill checks
**THEN** a +1 penalty SHALL be applied to all piloting rolls
**AND** penalty SHALL represent non-standard pilot positioning

#### Scenario: Torso-Mounted Cockpit capabilities
**GIVEN** a BattleMech with Torso-Mounted Cockpit
**WHEN** determining cockpit capabilities
**THEN** ejection system SHALL NOT be available
**AND** pilot CANNOT eject in emergency
**AND** cockpit SHALL be more protected against head hits

#### Scenario: Torso-Mounted Cockpit gyro incompatibility
**GIVEN** a BattleMech configuration
**WHEN** Torso-Mounted Cockpit is selected with XL Gyro
**THEN** validation SHALL fail
**AND** error message SHALL indicate incompatibility
**AND** suggested fix SHALL be to select different gyro type
**AND** XL Gyro occupies CT slots needed for torso cockpit

#### Scenario: Torso-Mounted Cockpit availability
**GIVEN** a unit configuration
**WHEN** validating Torso-Mounted Cockpit selection
**THEN** tech base SHALL be Both (Inner Sphere and Clan)
**AND** rules level SHALL be Advanced or Experimental
**AND** Standard rules level SHALL NOT allow Torso-Mounted Cockpit

### Requirement: Primitive Cockpit Specifications
The Primitive Cockpit SHALL represent early BattleMech technology with increased weight and reduced capabilities.

**Rationale**: Primitive Cockpit is used in early-era BattleMechs, featuring bulkier systems and less efficient design.

**Priority**: Medium

#### Scenario: Primitive Cockpit weight
**GIVEN** a BattleMech with Primitive Cockpit
**WHEN** calculating cockpit weight
**THEN** weight SHALL be exactly 5.0 tons
**AND** weight increase SHALL be 2 tons compared to Standard Cockpit
**AND** additional weight SHALL represent primitive technology

#### Scenario: Primitive Cockpit head layout
**GIVEN** a BattleMech with Primitive Cockpit
**WHEN** allocating Head critical slots
**THEN** slot 0 SHALL contain Life Support (fixed)
**AND** slot 1 SHALL contain Sensors (fixed)
**AND** slot 2 SHALL contain Cockpit (fixed)
**AND** slot 3 SHALL contain Cockpit (fixed, extra primitive equipment)
**AND** slot 4 SHALL contain Sensors (fixed)
**AND** slot 5 SHALL contain Life Support (fixed)
**AND** total Head slots used by fixed components SHALL be 6
**AND** available Head slots for equipment SHALL be 0

#### Scenario: Primitive Cockpit piloting penalty
**GIVEN** a BattleMech with Primitive Cockpit
**WHEN** pilot makes piloting skill checks
**THEN** a +1 penalty SHALL be applied to all piloting rolls
**AND** penalty SHALL represent primitive control systems

#### Scenario: Primitive Cockpit capabilities
**GIVEN** a BattleMech with Primitive Cockpit
**WHEN** determining cockpit capabilities
**THEN** ejection system SHALL NOT be available
**AND** life support SHALL be operational but primitive
**AND** no initiative modifiers SHALL apply

#### Scenario: Primitive Cockpit availability
**GIVEN** a unit configuration
**WHEN** validating Primitive Cockpit selection
**THEN** tech base SHALL be Both (Inner Sphere and Clan)
**AND** rules level SHALL be Standard, Tournament, Advanced, or Experimental
**AND** Primitive Cockpit SHALL be available at all rules levels
**AND** era SHALL typically be Age of War or early Succession Wars

### Requirement: Head Slot Component Placement
Life Support and Sensors SHALL occupy fixed slots in the Head location according to cockpit type.

**Rationale**: BattleTech construction rules specify exact slot positions for fixed head components to ensure consistency.

**Priority**: Critical

#### Scenario: Life Support placement for standard cockpits
**GIVEN** a BattleMech with head-mounted cockpit (Standard, Small, Command Console, Primitive)
**WHEN** allocating Life Support critical slots
**THEN** slot 0 SHALL contain Life Support
**AND** slot 5 SHALL contain Life Support
**AND** Life Support SHALL occupy exactly 2 critical slots
**AND** Life Support SHALL be fixed (not removable)

#### Scenario: Sensors placement for standard cockpits
**GIVEN** a BattleMech with head-mounted cockpit (Standard, Small, Command Console, Primitive)
**WHEN** allocating Sensors critical slots
**THEN** slot 1 SHALL contain Sensors
**AND** slot 4 SHALL contain Sensors
**AND** Sensors SHALL occupy exactly 2 critical slots
**AND** Sensors SHALL be fixed (not removable)

#### Scenario: Life Support placement for Torso-Mounted Cockpit
**GIVEN** a BattleMech with Torso-Mounted Cockpit
**WHEN** allocating Life Support critical slots
**THEN** slot 5 SHALL contain Life Support (only one slot in Head)
**AND** Life Support SHALL occupy exactly 1 critical slot in Head
**AND** Life Support SHALL be fixed (not removable)

#### Scenario: Sensors removal for Torso-Mounted Cockpit
**GIVEN** a BattleMech with Torso-Mounted Cockpit
**WHEN** allocating Head critical slots
**THEN** Sensors SHALL NOT be placed in Head
**AND** sensor functionality SHALL be integrated into torso cockpit
**AND** slots 1 and 4 SHALL be available for equipment

### Requirement: Cockpit Critical Slot Count
Each cockpit type SHALL occupy a specific number of critical slots.

**Rationale**: Different cockpit designs require different amounts of critical space.

**Priority**: Critical

#### Scenario: Standard Cockpit slots
**GIVEN** a BattleMech with Standard Cockpit
**WHEN** calculating critical slot requirements
**THEN** cockpit component SHALL occupy 1 critical slot in Head
**AND** Life Support SHALL occupy 2 critical slots in Head
**AND** Sensors SHALL occupy 2 critical slots in Head
**AND** total fixed Head slots SHALL be 5

#### Scenario: Small Cockpit slots
**GIVEN** a BattleMech with Small Cockpit
**WHEN** calculating critical slot requirements
**THEN** cockpit component SHALL occupy 1 critical slot in Head
**AND** Life Support SHALL occupy 2 critical slots in Head
**AND** Sensors SHALL occupy 2 critical slots in Head
**AND** total fixed Head slots SHALL be 5

#### Scenario: Command Console slots
**GIVEN** a BattleMech with Command Console
**WHEN** calculating critical slot requirements
**THEN** cockpit component SHALL occupy 1 critical slot in Head
**AND** Command Console component SHALL occupy 1 critical slot in Head
**AND** Life Support SHALL occupy 2 critical slots in Head
**AND** Sensors SHALL occupy 2 critical slots in Head
**AND** total fixed Head slots SHALL be 6

#### Scenario: Torso-Mounted Cockpit slots
**GIVEN** a BattleMech with Torso-Mounted Cockpit
**WHEN** calculating critical slot requirements
**THEN** cockpit component SHALL occupy 1 critical slot in Center Torso
**AND** Life Support SHALL occupy 1 critical slot in Head
**AND** Sensors SHALL occupy 0 critical slots
**AND** total fixed Head slots SHALL be 1

#### Scenario: Primitive Cockpit slots
**GIVEN** a BattleMech with Primitive Cockpit
**WHEN** calculating critical slot requirements
**THEN** cockpit component SHALL occupy 2 critical slots in Head
**AND** Life Support SHALL occupy 2 critical slots in Head
**AND** Sensors SHALL occupy 2 critical slots in Head
**AND** total fixed Head slots SHALL be 6

### Requirement: Ejection System Rules
Cockpit types with ejection systems SHALL allow pilot escape, while others SHALL NOT.

**Rationale**: Not all cockpit designs include ejection seats. Command Console and Torso-Mounted cockpits sacrifice ejection capability for other benefits.

**Priority**: High

#### Scenario: Standard Cockpit ejection
**GIVEN** a BattleMech with Standard Cockpit
**WHEN** pilot attempts to eject
**THEN** ejection SHALL be allowed
**AND** pilot SHALL escape if ejection succeeds
**AND** ejection system SHALL be operational

#### Scenario: Small Cockpit ejection
**GIVEN** a BattleMech with Small Cockpit
**WHEN** pilot attempts to eject
**THEN** ejection SHALL be allowed
**AND** ejection system SHALL be operational despite smaller size

#### Scenario: Command Console no ejection
**GIVEN** a BattleMech with Command Console
**WHEN** pilot attempts to eject
**THEN** ejection SHALL NOT be allowed
**AND** pilot MUST remain with mech
**AND** warning SHALL indicate no ejection system

#### Scenario: Torso-Mounted Cockpit no ejection
**GIVEN** a BattleMech with Torso-Mounted Cockpit
**WHEN** pilot attempts to eject
**THEN** ejection SHALL NOT be allowed
**AND** pilot MUST remain with mech
**AND** warning SHALL indicate no ejection system

#### Scenario: Primitive Cockpit no ejection
**GIVEN** a BattleMech with Primitive Cockpit
**WHEN** pilot attempts to eject
**THEN** ejection SHALL NOT be allowed
**AND** primitive technology lacks ejection system
**AND** warning SHALL indicate no ejection system

### Requirement: Cockpit Critical Hit Effects
Critical hits to cockpit components SHALL have severe consequences for pilot survival and mech operation.

**Rationale**: Cockpit, Life Support, and Sensors are vital systems, and damage to them directly threatens pilot survival.

**Priority**: High

#### Scenario: Cockpit component critical hit
**GIVEN** a BattleMech in combat
**WHEN** a critical hit strikes the Cockpit slot
**THEN** pilot SHALL take damage
**AND** second cockpit critical hit SHALL kill the pilot
**AND** mech SHALL be incapacitated if pilot dies

#### Scenario: Life Support critical hit
**GIVEN** a BattleMech in combat
**WHEN** a critical hit strikes a Life Support slot
**THEN** 1 hit SHALL damage Life Support
**AND** 2 hits SHALL destroy Life Support
**AND** destroyed Life Support SHALL cause pilot damage from environmental exposure
**AND** pilot SHALL take heat damage each turn
**AND** vacuum or hostile environment SHALL kill pilot immediately

#### Scenario: Sensors critical hit
**GIVEN** a BattleMech in combat
**WHEN** a critical hit strikes a Sensors slot
**THEN** 1 hit SHALL impose +2 penalty to all attack rolls
**AND** 2 hits SHALL destroy Sensors
**AND** destroyed Sensors SHALL impose +4 penalty to all attack rolls
**AND** mech SHALL be nearly blind

#### Scenario: Head destruction
**GIVEN** a BattleMech with head-mounted cockpit
**WHEN** Head location is destroyed
**THEN** pilot SHALL be killed instantly
**AND** mech SHALL be incapacitated
**AND** no saving throw SHALL be allowed

#### Scenario: Torso-Mounted Cockpit protection
**GIVEN** a BattleMech with Torso-Mounted Cockpit
**WHEN** Head location is destroyed
**THEN** pilot SHALL NOT be killed
**AND** mech SHALL remain operational
**AND** cockpit in Center Torso SHALL protect pilot

### Requirement: Pilot Survival Rules
Pilot survival SHALL depend on cockpit integrity and critical hit location.

**Rationale**: The pilot is the most critical component of a BattleMech. Cockpit damage directly threatens pilot survival.

**Priority**: High

#### Scenario: Pilot consciousness check
**GIVEN** a BattleMech takes significant damage
**WHEN** pilot takes 2+ points of damage in one attack
**THEN** pilot SHALL make consciousness check
**AND** failed check SHALL cause pilot to pass out
**AND** unconscious pilot SHALL cause mech shutdown

#### Scenario: Pilot survival with functional cockpit
**GIVEN** a BattleMech is disabled but cockpit is intact
**WHEN** determining pilot survival
**THEN** pilot SHALL survive
**AND** pilot MAY attempt to eject if system available

#### Scenario: Pilot death from cockpit destruction
**GIVEN** a BattleMech takes critical hit to cockpit
**WHEN** second cockpit critical occurs
**THEN** pilot SHALL be killed
**AND** mech SHALL be incapacitated
**AND** no further actions SHALL be possible

#### Scenario: Pilot survival with ejection
**GIVEN** a BattleMech with ejection-capable cockpit
**WHEN** mech is about to be destroyed and pilot ejects
**THEN** pilot SHALL make ejection roll
**AND** successful ejection SHALL save pilot
**AND** failed ejection SHALL kill pilot

---

## Data Model Requirements

### Required Interfaces

The implementation MUST provide the following TypeScript interfaces:

```typescript
/**
 * Cockpit type enumeration
 */
enum CockpitType {
  STANDARD = 'Standard',
  SMALL = 'Small',
  COMMAND_CONSOLE = 'Command Console',
  TORSO_MOUNTED = 'Torso-Mounted Cockpit',
  PRIMITIVE = 'Primitive Cockpit'
}

/**
 * Core cockpit interface
 * Extends base entity types for tech base and slot requirements
 */
interface ICockpit extends ITechBaseEntity, ISlottedComponent {
  /**
   * Unique identifier for the cockpit
   * @example "cockpit-std-001"
   */
  readonly id: string;

  /**
   * Display name of the cockpit
   * @example "Standard Cockpit"
   */
  readonly name: string;

  /**
   * Type of cockpit
   * @example CockpitType.STANDARD
   */
  readonly cockpitType: CockpitType;

  /**
   * Weight of cockpit in tons (fixed weight, does not scale with mech tonnage)
   * @example 3.0
   */
  readonly weight: number;

  /**
   * Critical slots required by cockpit component itself (not including Life Support/Sensors)
   * @example 1
   */
  readonly criticalSlots: number;

  /**
   * Technology base (Inner Sphere, Clan, or Both)
   * @example TechBase.BOTH
   */
  readonly techBase: TechBase;

  /**
   * Rules level required to use this cockpit
   * @example RulesLevel.STANDARD
   */
  readonly rulesLevel: RulesLevel;

  /**
   * Special properties and capabilities
   */
  readonly capabilities: ICockpitCapabilities;

  /**
   * Slot placement configuration
   */
  readonly slotPlacement: ICockpitSlotPlacement;
}

/**
 * Cockpit capabilities interface
 */
interface ICockpitCapabilities {
  /**
   * Whether cockpit has ejection system
   * @example true
   */
  readonly ejectionCapable: boolean;

  /**
   * Whether cockpit provides life support
   * @example true
   */
  readonly lifeSupport: boolean;

  /**
   * Initiative modifier (negative is better)
   * @example -2 for Command Console
   */
  readonly initiativeModifier?: number;

  /**
   * Piloting skill modifier (positive is penalty)
   * @example 1 for Small Cockpit
   */
  readonly pilotingModifier?: number;

  /**
   * Command bonus for coordinating other units
   * @example 1 for Command Console
   */
  readonly commandBonus?: number;

  /**
   * Whether pilot can remain conscious after damage
   * @example true
   */
  readonly consciousnessSupport: boolean;
}

/**
 * Cockpit slot placement configuration
 */
interface ICockpitSlotPlacement {
  /**
   * Number of critical slots used in Head
   * @example 1 for Standard, 0 for Torso-Mounted
   */
  readonly headSlots: number;

  /**
   * Number of critical slots used in Center Torso
   * @example 0 for Standard, 1 for Torso-Mounted
   */
  readonly centerTorsoSlots: number;

  /**
   * Detailed head slot layout (6 slots total: 0-5)
   * null means slot is available for equipment
   */
  readonly headLayout: {
    readonly slot0: 'Life Support' | null;
    readonly slot1: 'Sensors' | null;
    readonly slot2: 'Cockpit' | null;
    readonly slot3: 'Cockpit' | 'Command Console' | null;
    readonly slot4: 'Sensors' | null;
    readonly slot5: 'Life Support' | null;
  };

  /**
   * Center Torso slot for Torso-Mounted Cockpit (typically slot 11)
   * null for head-mounted cockpits
   */
  readonly centerTorsoSlot?: number | null;
}

/**
 * Cockpit validation result
 */
interface ICockpitValidation {
  /**
   * Whether cockpit configuration is valid
   */
  readonly isValid: boolean;

  /**
   * Cockpit type being validated
   */
  readonly cockpitType: CockpitType;

  /**
   * Calculated cockpit weight
   */
  readonly cockpitWeight: number;

  /**
   * List of validation violations
   */
  readonly violations: ICockpitViolation[];

  /**
   * Recommendations for improvement
   */
  readonly recommendations: string[];
}

/**
 * Cockpit validation violation
 */
interface ICockpitViolation {
  /**
   * Type of violation
   */
  readonly type: 'invalid_type' | 'weight_mismatch' | 'incompatible_gyro' | 'era_incompatible' | 'rules_level_violation';

  /**
   * Human-readable violation message
   */
  readonly message: string;

  /**
   * Severity level
   */
  readonly severity: 'critical' | 'major' | 'minor';

  /**
   * Suggested fix for the violation
   */
  readonly suggestedFix: string;
}
```

### Required Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `id` | `string` | Yes | Unique identifier | Any valid string | N/A |
| `name` | `string` | Yes | Display name | Any string | N/A |
| `cockpitType` | `CockpitType` | Yes | Type of cockpit | Standard, Small, Command Console, Torso-Mounted, Primitive | Standard |
| `weight` | `number` | Yes | Weight in tons | 2.0, 3.0, 4.0, 5.0 | 3.0 |
| `criticalSlots` | `number` | Yes | Cockpit component slots | 1 or 2 | 1 |
| `techBase` | `TechBase` | Yes | Technology base | INNER_SPHERE, CLAN, BOTH | BOTH |
| `rulesLevel` | `RulesLevel` | Yes | Rules level | STANDARD, ADVANCED, EXPERIMENTAL | STANDARD |
| `ejectionCapable` | `boolean` | Yes | Has ejection system | true, false | true |
| `initiativeModifier` | `number` | No | Initiative modifier | -2 to 0 | 0 |
| `pilotingModifier` | `number` | No | Piloting penalty | 0 to 2 | 0 |

### Type Constraints

- `weight` MUST be one of: 2.0 (Small), 3.0 (Standard/Command Console), 4.0 (Torso-Mounted), 5.0 (Primitive)
- `criticalSlots` MUST be 1 or 2 (2 only for Primitive)
- When `cockpitType` is COMMAND_CONSOLE, `headLayout.slot3` SHALL be 'Command Console'
- When `cockpitType` is TORSO_MOUNTED, `centerTorsoSlot` SHALL be 11
- When `cockpitType` is PRIMITIVE, `criticalSlots` SHALL be 2
- `initiativeModifier` MUST be negative or zero (negative is better)
- `pilotingModifier` MUST be positive or zero (positive is penalty)

---

## Calculation Formulas

### Cockpit Weight

**Formula**:
```
cockpitWeight = COCKPIT_WEIGHTS[cockpitType]
```

**Where**:
- `cockpitType` = Type of cockpit selected
- `COCKPIT_WEIGHTS` = Constant lookup table

**Values**:
```typescript
const COCKPIT_WEIGHTS: Record<CockpitType, number> = {
  'Standard': 3.0,
  'Small': 2.0,
  'Command Console': 3.0,
  'Torso-Mounted Cockpit': 4.0,
  'Primitive Cockpit': 5.0
}
```

**Example**:
```
Input: cockpitType = 'Small'
Calculation: cockpitWeight = COCKPIT_WEIGHTS['Small']
Output: cockpitWeight = 2.0 tons
```

**Special Cases**:
- Cockpit weight does NOT scale with mech tonnage
- All cockpit weights are fixed constants
- No rounding required (all values are exact)

### Available Head Slots

**Formula**:
```
availableHeadSlots = 6 - fixedHeadSlots[cockpitType]
```

**Where**:
- `fixedHeadSlots` = Number of fixed component slots for cockpit type

**Values**:
```typescript
const FIXED_HEAD_SLOTS: Record<CockpitType, number> = {
  'Standard': 5,          // Life Support (2) + Sensors (2) + Cockpit (1)
  'Small': 5,             // Life Support (2) + Sensors (2) + Cockpit (1)
  'Command Console': 6,   // Life Support (2) + Sensors (2) + Cockpit (1) + Command Console (1)
  'Torso-Mounted Cockpit': 1,  // Only Life Support (1)
  'Primitive Cockpit': 6  // Life Support (2) + Sensors (2) + Cockpit (2)
}
```

**Examples**:
```
Input: cockpitType = 'Standard'
Calculation: availableHeadSlots = 6 - 5
Output: 1 slot available (slot 3)

Input: cockpitType = 'Torso-Mounted Cockpit'
Calculation: availableHeadSlots = 6 - 1
Output: 5 slots available (slots 0-4)

Input: cockpitType = 'Command Console'
Calculation: availableHeadSlots = 6 - 6
Output: 0 slots available
```

### Initiative Modifier

**Formula**:
```
effectiveInitiative = baseInitiative + initiativeModifier[cockpitType]
```

**Where**:
- `baseInitiative` = Base initiative roll result
- `initiativeModifier` = Cockpit-specific modifier

**Values**:
```typescript
const INITIATIVE_MODIFIERS: Record<CockpitType, number> = {
  'Standard': 0,
  'Small': 0,
  'Command Console': -2,  // Acts sooner (better)
  'Torso-Mounted Cockpit': 0,
  'Primitive Cockpit': 0
}
```

**Example**:
```
Input: baseInitiative = 10, cockpitType = 'Command Console'
Calculation: effectiveInitiative = 10 + (-2)
Output: effectiveInitiative = 8 (acts sooner)
```

**Special Cases**:
- Lower initiative numbers act first
- Negative modifier is beneficial
- Only Command Console provides initiative bonus

### Piloting Skill Modifier

**Formula**:
```
effectivePiloting = basePiloting + pilotingModifier[cockpitType]
```

**Where**:
- `basePiloting` = Pilot's base piloting skill
- `pilotingModifier` = Cockpit-specific penalty

**Values**:
```typescript
const PILOTING_MODIFIERS: Record<CockpitType, number> = {
  'Standard': 0,
  'Small': 1,             // +1 penalty (harder to pilot)
  'Command Console': 0,
  'Torso-Mounted Cockpit': 1,  // +1 penalty
  'Primitive Cockpit': 1  // +1 penalty
}
```

**Example**:
```
Input: basePiloting = 4, cockpitType = 'Small'
Calculation: effectivePiloting = 4 + 1
Output: effectivePiloting = 5 (worse skill)
```

**Special Cases**:
- Higher piloting numbers are worse
- Positive modifier is penalty
- Multiple cockpit types impose +1 penalty

---

## Validation Rules

### Validation: Cockpit Type Compatibility

**Rule**: Torso-Mounted Cockpit is incompatible with XL Gyro

**Severity**: Error

**Condition**:
```typescript
if (cockpitType === 'Torso-Mounted Cockpit' && gyroType === 'XL') {
  // Invalid - XL Gyro uses CT slot 11 needed for cockpit
  return {
    isValid: false,
    violation: {
      type: 'incompatible_gyro',
      message: 'Torso-Mounted Cockpit requires CT slot 11, but XL Gyro occupies slots 7-12',
      severity: 'critical',
      suggestedFix: 'Select Standard, Compact, or Heavy-Duty Gyro instead of XL Gyro'
    }
  };
}
```

**Error Message**: "Torso-Mounted Cockpit is incompatible with XL Gyro. XL Gyro occupies Center Torso slots 7-12, which includes slot 11 required for the cockpit."

**User Action**: Change gyro type to Standard, Compact, or Heavy-Duty, or change cockpit type to head-mounted variant

### Validation: Rules Level Restriction

**Rule**: Small Cockpit and Command Console require Advanced rules level or higher

**Severity**: Warning

**Condition**:
```typescript
if ((cockpitType === 'Small' || cockpitType === 'Command Console') &&
    rulesLevel === 'Standard') {
  return {
    isValid: false,
    violation: {
      type: 'rules_level_violation',
      message: `${cockpitType} requires Advanced or Experimental rules level`,
      severity: 'major',
      suggestedFix: 'Change rules level to Advanced, or use Standard Cockpit'
    }
  };
}
```

**Error Message**: "[Cockpit Type] requires Advanced or Experimental rules level. Current rules level is Standard."

**User Action**: Change rules level to Advanced/Experimental, or select Standard/Primitive cockpit

### Validation: Era Compatibility

**Rule**: Command Console is not available before 3050 (Inner Sphere) or 2828 (Clan)

**Severity**: Warning

**Condition**:
```typescript
if (cockpitType === 'Command Console') {
  const requiredYear = (techBase === 'Clan') ? 2828 : 3050;
  if (constructionYear < requiredYear) {
    return {
      isValid: false,
      violation: {
        type: 'era_incompatible',
        message: `Command Console not available in year ${constructionYear}`,
        severity: 'major',
        suggestedFix: `Use Standard Cockpit or set year to ${requiredYear} or later`
      }
    };
  }
}
```

**Error Message**: "Command Console not available in [year]. Inner Sphere introduction: 3050. Clan introduction: 2828."

**User Action**: Change construction year to appropriate era, or select different cockpit type

### Validation: Cockpit Weight Accuracy

**Rule**: Cockpit weight must match expected weight for cockpit type

**Severity**: Error

**Condition**:
```typescript
const expectedWeight = COCKPIT_WEIGHTS[cockpitType];
if (Math.abs(actualWeight - expectedWeight) > 0.01) {
  return {
    isValid: false,
    violation: {
      type: 'weight_mismatch',
      message: `Cockpit weight is ${actualWeight} tons, expected ${expectedWeight} tons`,
      severity: 'critical',
      suggestedFix: `Recalculate cockpit weight to ${expectedWeight} tons`
    }
  };
}
```

**Error Message**: "Cockpit weight mismatch. Actual: [X] tons, Expected: [Y] tons for [Cockpit Type]."

**User Action**: Recalculate unit weight to use correct cockpit weight

---

## Technology Base Variants

See [Tech Base Variants Reference](../tech-base-variants-reference/spec.md) for general Inner Sphere vs Clan differences.

### Cockpit-Specific Tech Base Differences

**Minimal Cockpit Differences**:
- Most cockpit types available to both Inner Sphere and Clan
- Weight, slots, and functionality identical between tech bases
- Primary difference is introduction year timing

**Clan-Exclusive Cockpits**:
- No Clan-exclusive standard cockpit types
- Clan versions may have earlier introduction years

**Introduction Year Patterns**:
- Standard Cockpit: Available to both since BattleMech introduction
- Command Console: Inner Sphere invention (3040s)
- Advanced cockpits: Vary by specific type, check component database

**Mixed Tech Application**:
- Cockpit selection generally not affected by tech base choice
- Weight and slot requirements identical
- Use appropriate introduction year for tech base


---

## Dependencies

### Defines
- **CockpitType enum**: Defines five cockpit types (Standard, Small, Command Console, Torso-Mounted, Primitive)
- **Cockpit weights**: Standard 3t, Small 2t, Command Console 3t, Torso-Mounted 4t, Primitive 5t
- **Head slot layouts**: Standard/Small/Primitive use slots 0-5, Torso-Mounted uses CT slot 11
- **Special abilities**: Command Console (lance coordination), Small (piloting penalty), etc.
- **Ejection system rules**: Available on Standard/Command Console/Torso-Mounted, not on Small/Primitive
- **Gyro compatibility**: Torso-Mounted incompatible with XL Gyro (slot conflict)
- **ICockpit interface**: Complete cockpit specification
- **ICockpitConfiguration interface**: Cockpit configuration data

### Depends On
- [Core Entity Types](../../phase-1-foundation/core-entity-types/spec.md) - Extends ITechBaseEntity, ITemporalEntity
- [Physical Properties System](../../phase-1-foundation/physical-properties-system/spec.md) - Weight and critical slot property standards
- [Critical Slot Allocation](../critical-slot-allocation/spec.md) - Head and Center Torso slot structure and placement rules
- [Engine System](../engine-system/spec.md) - Engine type affects heat sink capacity, which affects CT slot availability
- [Gyro System](../gyro-system/spec.md) - Gyro type affects CT slot usage, particularly relevant for Torso-Mounted Cockpit

### Used By
- [Construction Rules Core](../construction-rules-core/spec.md) - Cockpit weight contributes to total, validates cockpit compatibility
- **Pilot System**: Cockpit type affects piloting skill checks and initiative rolls
- **Critical Hit System**: Cockpit critical hits affect pilot survival and mech operation
- **UI Components**: Cockpit selection UI must display weight, slot usage, and special capabilities

### Construction Sequence
1. Select mech tonnage and configuration (determines base structure)
2. Select engine type and rating (determines CT slots for engine)
3. Select gyro type (determines CT slots for gyro, affects Torso-Mounted compatibility)
4. Select cockpit type (this step - determines head/CT slot usage)
5. Allocate heat sinks (uses remaining CT slots after cockpit)
6. Place equipment (uses available head slots determined by cockpit type)

---

## Implementation Notes

### Performance Considerations
- Cockpit weight lookup should use constant-time hash map access
- Head slot layout can be pre-computed for each cockpit type
- Validation rules should short-circuit on first critical error
- Cache cockpit validation results for repeated validations

### Edge Cases
- **XL Gyro + Torso-Mounted Cockpit**: MUST reject this combination. XL Gyro uses CT slots 7-12, which includes slot 11 needed for torso cockpit.
- **Compact Gyro + Torso-Mounted Cockpit**: Valid combination. Compact uses slots 7-8, leaving slot 11 available.
- **Command Console + No Available Head Slots**: Valid design. All 6 head slots are occupied by fixed components.
- **Primitive Cockpit + Modern Era**: Valid but unusual. Some retro designs or captured mechs may use primitive cockpits.
- **Multiple Cockpits**: MUST be rejected. Each mech has exactly one cockpit.
- **Zero Weight Cockpit**: Invalid. All cockpits have minimum weight of 2 tons (Small).

### Common Pitfalls
- **Pitfall**: Forgetting that Torso-Mounted Cockpit removes Sensors from head
  - **Solution**: Always check cockpit type before allocating sensor slots
- **Pitfall**: Allowing XL Gyro with Torso-Mounted Cockpit
  - **Solution**: Implement explicit validation rule for this incompatibility
- **Pitfall**: Treating Life Support as 2 slots for Torso-Mounted (it's only 1)
  - **Solution**: Use cockpit-specific head layout configuration
- **Pitfall**: Applying Small Cockpit piloting penalty to Command Console
  - **Solution**: Use per-cockpit-type modifier lookup table
- **Pitfall**: Allowing ejection from Command Console or Torso-Mounted
  - **Solution**: Check ejectionCapable flag before allowing ejection
- **Pitfall**: Forgetting Command Console occupies slot 4 in addition to slot 2
  - **Solution**: Use complete head layout specification for each cockpit type

---

## Examples

### Example 1: Standard Cockpit - Atlas AS7-D

**Input**:
```typescript
const config = {
  mechName: 'Atlas AS7-D',
  tonnage: 100,
  cockpitType: CockpitType.STANDARD,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  gyroType: GyroType.STANDARD
};
```

**Processing**:
```typescript
// Step 1: Get cockpit weight
const cockpitWeight = COCKPIT_WEIGHTS[CockpitType.STANDARD]; // 3.0 tons

// Step 2: Determine head slot layout
const headLayout = {
  slot0: 'Life Support',  // Fixed
  slot1: 'Sensors',       // Fixed
  slot2: 'Cockpit',       // Fixed
  slot3: null,            // Available for equipment
  slot4: 'Sensors',       // Fixed
  slot5: 'Life Support'   // Fixed
};

// Step 3: Calculate available slots
const availableHeadSlots = 1; // Only slot 3 available

// Step 4: Check capabilities
const capabilities = {
  ejectionCapable: true,
  lifeSupport: true,
  initiativeModifier: 0,
  pilotingModifier: 0,
  commandBonus: 0,
  consciousnessSupport: true
};
```

**Output**:
```typescript
const result = {
  cockpitType: 'Standard',
  weight: 3.0,
  headSlotsUsed: 5,
  headSlotsAvailable: 1,
  centerTorsoSlotsUsed: 0,
  canEject: true,
  pilotingPenalty: 0,
  initiativeBonus: 0
};
```

### Example 2: Small Cockpit - Light Mech Weight Savings

**Input**:
```typescript
const config = {
  mechName: 'Flea FLE-19',
  tonnage: 20,
  cockpitType: CockpitType.SMALL,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.ADVANCED,
  gyroType: GyroType.STANDARD
};
```

**Processing**:
```typescript
// Step 1: Get cockpit weight
const cockpitWeight = COCKPIT_WEIGHTS[CockpitType.SMALL]; // 2.0 tons

// Step 2: Calculate weight savings
const weightSavings = 3.0 - 2.0; // 1.0 ton saved vs Standard

// Step 3: Determine head slot layout (same as Standard)
const headLayout = {
  slot0: 'Life Support',
  slot1: 'Sensors',
  slot2: 'Cockpit',
  slot3: null,            // Available
  slot4: 'Sensors',
  slot5: 'Life Support'
};

// Step 4: Check capabilities and penalties
const capabilities = {
  ejectionCapable: true,
  lifeSupport: true,
  pilotingModifier: 1,    // +1 penalty due to cramped conditions
  consciousnessSupport: true
};
```

**Output**:
```typescript
const result = {
  cockpitType: 'Small',
  weight: 2.0,
  weightSavings: 1.0,
  headSlotsUsed: 5,
  headSlotsAvailable: 1,
  canEject: true,
  pilotingPenalty: 1,     // Makes piloting checks harder
  notes: 'Weight saved can be used for additional equipment'
};
```

### Example 3: Command Console - Lance Commander Mech

**Input**:
```typescript
const config = {
  mechName: 'Cyclops CP-10-Z',
  tonnage: 90,
  cockpitType: CockpitType.COMMAND_CONSOLE,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.ADVANCED,
  gyroType: GyroType.STANDARD,
  year: 3050
};
```

**Processing**:
```typescript
// Step 1: Get cockpit weight
const cockpitWeight = COCKPIT_WEIGHTS[CockpitType.COMMAND_CONSOLE]; // 3.0 tons

// Step 2: Determine head slot layout
const headLayout = {
  slot0: 'Life Support',
  slot1: 'Sensors',
  slot2: 'Cockpit',
  slot3: null,                 // Could be available, but...
  slot4: 'Command Console',    // Command Console uses this slot
  slot5: 'Life Support'
};

// Step 3: Calculate available slots
const availableHeadSlots = 0; // All slots occupied

// Step 4: Check capabilities
const capabilities = {
  ejectionCapable: false,      // No ejection system
  lifeSupport: true,
  initiativeModifier: -2,      // Better initiative (acts sooner)
  commandBonus: 1,             // Can coordinate other units
  consciousnessSupport: true
};
```

**Output**:
```typescript
const result = {
  cockpitType: 'Command Console',
  weight: 3.0,
  headSlotsUsed: 6,
  headSlotsAvailable: 0,       // No room for head equipment
  canEject: false,             // Pilot cannot eject
  initiativeBonus: -2,         // Acts 2 steps sooner
  commandBonus: 1,
  specialRules: [
    'Provides +1 bonus to coordinated units',
    'Reduces initiative by 2 (better)',
    'No ejection system available'
  ]
};
```

### Example 4: Torso-Mounted Cockpit - Headshot Protection

**Input**:
```typescript
const config = {
  mechName: 'Gunslinger Custom',
  tonnage: 85,
  cockpitType: CockpitType.TORSO_MOUNTED,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.ADVANCED,
  gyroType: GyroType.STANDARD,  // Must not be XL
  engineRating: 340
};
```

**Processing**:
```typescript
// Step 1: Validate gyro compatibility
if (gyroType === GyroType.XL) {
  throw new Error('Torso-Mounted Cockpit incompatible with XL Gyro');
}

// Step 2: Get cockpit weight
const cockpitWeight = COCKPIT_WEIGHTS[CockpitType.TORSO_MOUNTED]; // 4.0 tons

// Step 3: Determine head slot layout
const headLayout = {
  slot0: null,            // Available!
  slot1: null,            // Available!
  slot2: null,            // Available!
  slot3: null,            // Available!
  slot4: null,            // Available!
  slot5: 'Life Support'   // Only fixed component
};

// Step 4: Determine Center Torso placement
const centerTorsoSlot = 11; // Cockpit in CT slot 11

// Step 5: Check capabilities
const capabilities = {
  ejectionCapable: false,
  lifeSupport: true,
  pilotingModifier: 1,    // +1 penalty
  consciousnessSupport: true
};
```

**Output**:
```typescript
const result = {
  cockpitType: 'Torso-Mounted Cockpit',
  weight: 4.0,
  weightPenalty: 1.0,          // 1 ton heavier than Standard
  headSlotsUsed: 1,            // Only Life Support
  headSlotsAvailable: 5,       // Excellent for equipment
  centerTorsoSlotUsed: 11,
  canEject: false,
  pilotingPenalty: 1,
  specialRules: [
    'Pilot survives head destruction',
    'Head has 5 available slots for equipment',
    'Cannot use XL Gyro (needs CT slot 11)',
    '+1 ton weight penalty',
    '+1 piloting skill penalty'
  ]
};
```

### Example 5: Primitive Cockpit - Early Era Mech

**Input**:
```typescript
const config = {
  mechName: 'Mackie MSK-6S',
  tonnage: 100,
  cockpitType: CockpitType.PRIMITIVE,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  gyroType: GyroType.STANDARD,
  year: 2439  // Age of War era
};
```

**Processing**:
```typescript
// Step 1: Get cockpit weight
const cockpitWeight = COCKPIT_WEIGHTS[CockpitType.PRIMITIVE]; // 5.0 tons

// Step 2: Determine head slot layout
const headLayout = {
  slot0: 'Life Support',
  slot1: 'Sensors',
  slot2: 'Cockpit',
  slot3: 'Cockpit',        // Primitive cockpit uses 2 slots
  slot4: 'Sensors',
  slot5: 'Life Support'
};

// Step 3: Calculate available slots
const availableHeadSlots = 0; // All 6 slots occupied

// Step 4: Check capabilities
const capabilities = {
  ejectionCapable: false,
  lifeSupport: true,
  pilotingModifier: 1,     // +1 penalty
  consciousnessSupport: true
};
```

**Output**:
```typescript
const result = {
  cockpitType: 'Primitive Cockpit',
  weight: 5.0,
  weightPenalty: 2.0,          // 2 tons heavier than Standard
  headSlotsUsed: 6,
  headSlotsAvailable: 0,       // No room for equipment
  cockpitSlotsRequired: 2,     // Uses 2 head slots
  canEject: false,
  pilotingPenalty: 1,
  specialRules: [
    'Early technology, bulky design',
    'No ejection system',
    '+1 piloting skill penalty',
    'All head slots occupied',
    'Available at Standard rules level'
  ]
};
```

### Example 6: Validation - XL Gyro Incompatibility

**Input**:
```typescript
const config = {
  mechName: 'Invalid Configuration',
  tonnage: 75,
  cockpitType: CockpitType.TORSO_MOUNTED,
  gyroType: GyroType.XL,  // INVALID!
  techBase: TechBase.INNER_SPHERE
};
```

**Processing**:
```typescript
// Validation check
function validateCockpitGyroCompatibility(cockpit, gyro) {
  if (cockpit === CockpitType.TORSO_MOUNTED && gyro === GyroType.XL) {
    return {
      isValid: false,
      violation: {
        type: 'incompatible_gyro',
        message: 'Torso-Mounted Cockpit requires CT slot 11, but XL Gyro occupies slots 7-12',
        severity: 'critical',
        suggestedFix: 'Change gyro to Standard, Compact, or Heavy-Duty'
      }
    };
  }
  return { isValid: true };
}

const validation = validateCockpitGyroCompatibility(
  config.cockpitType,
  config.gyroType
);
```

**Output**:
```typescript
const result = {
  isValid: false,
  violations: [
    {
      type: 'incompatible_gyro',
      message: 'Torso-Mounted Cockpit incompatible with XL Gyro',
      severity: 'critical',
      suggestedFix: 'Select Standard, Compact, or Heavy-Duty Gyro',
      explanation: 'XL Gyro uses Center Torso slots 7-12, which includes slot 11 needed for Torso-Mounted Cockpit'
    }
  ],
  validAlternatives: [
    'Use Standard Gyro (slots 7-10)',
    'Use Compact Gyro (slots 7-8)',
    'Use Heavy-Duty Gyro (slots 7-10)',
    'Change to head-mounted cockpit type'
  ]
};
```

---

## References

### Official BattleTech Rules
- **TechManual**: Page 45-46 - Cockpit Types and Specifications
- **TechManual**: Page 90-93 - Critical Slots and Head Layout
- **TechManual**: Page 118-120 - Cockpit Critical Hits
- **Total Warfare**: Page 36 - Pilot Survival and Consciousness
- **Total Warfare**: Page 127-128 - Critical Hits to Cockpit
- **Tactical Operations**: Page 89-90 - Command Console Rules
- **Tactical Operations**: Page 91 - Torso-Mounted Cockpit
- **Interstellar Operations**: Page 76 - Primitive Cockpit
- **Strategic Operations**: Page 82 - Ejection System Rules

### Related Documentation
- **Critical Slot Allocation Specification**: Head slot structure and allocation rules
- **Pilot System Specification**: Pilot skills, consciousness, and survival mechanics
- **Engine System Specification**: Engine placement affecting CT slot availability
- **Gyro System Specification**: Gyro slot usage and compatibility
- **Construction Rules Specification**: Overall mech construction sequence

---

## Changelog

### Version 1.0 (2025-11-27)
- Initial specification for Cockpit System
- Defined five cockpit types: Standard, Small, Command Console, Torso-Mounted, Primitive
- Specified weight values: 2-5 tons depending on type
- Documented head slot layouts with Life Support, Sensors, and Cockpit placement
- Defined special abilities: initiative modifiers, piloting penalties, command bonuses
- Specified ejection system availability rules
- Documented XL Gyro incompatibility with Torso-Mounted Cockpit
- Included pilot survival and critical hit rules
- Provided comprehensive examples for all cockpit types
- Defined validation rules for compatibility and era restrictions
