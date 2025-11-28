# Movement System Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2025-11-27
**Dependencies**: Engine System, Core Entity Types, Tech Base System, Rules Level System, Physical Properties System
**Affects**: Construction Rules, Heat Management, Critical Slot Allocation, Battle Value Calculation, Validation System

---

## Overview

### Purpose
Defines the movement system for BattleMech units, including walk/run movement point calculations, jump jet mechanics, movement enhancements (MASC, Supercharger, TSM), movement type classifications, and all movement-related formulas and constraints. This system determines a BattleMech's tactical mobility and maneuverability on the battlefield.

### Scope
**In Scope:**
- Walk MP and Run MP calculation formulas
- Jump MP mechanics and limitations
- Jump Jet types and variants (Standard, Improved, Extended, UMU, Mechanical, Partial Wing)
- Jump Jet weight calculation by mech tonnage class
- Jump Jet critical slot requirements
- Jump Jet placement rules and restrictions
- Movement enhancement systems (MASC, Supercharger, TSM)
- Movement type classifications (Biped, Quad, Tracked, Wheeled, VTOL, etc.)
- Movement heat generation
- Movement modifiers (terrain, damage, actuator loss)
- Maximum movement limitations
- Tech base variants for movement equipment

**Out of Scope:**
- Engine system implementation details (covered in Engine System spec)
- Engine rating calculations (covered in Engine System spec)
- Actuator damage effects on movement (covered in Damage System spec)
- Terrain-specific movement costs (covered in Tactical Rules spec)
- Movement-based to-hit modifiers (covered in Combat System spec)
- MASC failure mechanics (covered in Equipment Failure spec)
- Cost and Battle Value formulas (covered in Economics System spec)

### Key Concepts
- **Walk MP**: Base movement points calculated from engine rating divided by tonnage
- **Run MP**: Extended movement at 1.5× walk speed (rounded down)
- **Jump MP**: Vertical/jumping movement provided by jump jets (typically ≤ walk MP)
- **Movement Points (MP)**: Abstract units representing hexes moved per turn
- **Jump Jet**: Propulsion equipment providing jump capability (1 MP per jet typically)
- **Jump Jet Weight Classes**: Tonnage-based weight scaling (0.5t, 1.0t, 2.0t per jet)
- **MASC**: Myomer Accelerator Signal Circuitry for sprint movement (2× run MP)
- **Supercharger**: Engine enhancement for increased run speed (2× walk MP)
- **TSM**: Triple Strength Myomer providing movement bonus at high heat
- **Movement Type**: Motive system classification (Biped, Quad, etc.)
- **UMU**: Underwater Maneuvering Unit for aquatic operations

---

## Requirements

### Requirement: Walk Movement Calculation
The system SHALL calculate walk movement points based on engine rating and mech tonnage using the official formula.

**Rationale**: Walk MP is the fundamental movement rate determining tactical mobility.

**Priority**: Critical

#### Scenario: Standard walk calculation
**GIVEN** a mech with engine rating R and tonnage T
**WHEN** calculating walk MP
**THEN** walk MP = floor(R / T)
**AND** result MUST be rounded down to nearest integer
**AND** minimum walk MP SHALL be 1 (if engine provides sufficient rating)

#### Scenario: High-speed light mech
**GIVEN** a 20-ton mech with rating 160 engine
**WHEN** calculating walk MP
**THEN** walk MP = floor(160 / 20) = 8
**AND** this represents very fast movement

#### Scenario: Slow assault mech
**GIVEN** a 100-ton mech with rating 300 engine
**WHEN** calculating walk MP
**THEN** walk MP = floor(300 / 100) = 3
**AND** this represents typical assault mech speed

#### Scenario: Underpowered engine warning
**GIVEN** engine rating less than mech tonnage
**WHEN** calculating walk MP
**THEN** walk MP = 0 or less
**AND** system SHALL emit critical error
**AND** mech SHALL be invalid (no functional movement)

### Requirement: Run Movement Calculation
The system SHALL calculate run movement points as 1.5× walk MP rounded down.

**Rationale**: Running represents sprinting at increased speed with heat penalties.

**Priority**: Critical

#### Scenario: Standard run calculation
**GIVEN** walk MP of W
**WHEN** calculating run MP
**THEN** run MP = floor(W × 1.5)
**AND** result MUST be rounded down to nearest integer

#### Scenario: Even walk MP run calculation
**GIVEN** walk MP = 4
**WHEN** calculating run MP
**THEN** run MP = floor(4 × 1.5) = floor(6) = 6

#### Scenario: Odd walk MP run calculation
**GIVEN** walk MP = 5
**WHEN** calculating run MP
**THEN** run MP = floor(5 × 1.5) = floor(7.5) = 7
**AND** fractional MP SHALL be discarded

#### Scenario: Maximum walk MP run calculation
**GIVEN** walk MP = 8 (maximum practical)
**WHEN** calculating run MP
**THEN** run MP = floor(8 × 1.5) = floor(12) = 12

### Requirement: Jump Movement System
The system SHALL support jump jets providing vertical/jumping movement capability.

**Rationale**: Jump jets provide tactical mobility over terrain and obstacles.

**Priority**: Critical

#### Scenario: Standard jump jet jump MP
**GIVEN** N standard jump jets installed
**WHEN** calculating jump MP
**THEN** jump MP = N (1 MP per jet)
**AND** jump MP MUST NOT exceed walk MP (standard limit)

#### Scenario: Jump MP maximum limit
**GIVEN** walk MP = 5
**WHEN** installing jump jets
**THEN** maximum jump MP SHALL be 5
**AND** system SHALL prevent installing more than 5 standard jump jets

#### Scenario: No jump jets
**GIVEN** no jump jets installed
**WHEN** calculating jump MP
**THEN** jump MP = 0
**AND** mech CANNOT perform jumping movement

#### Scenario: Improved jump jets
**GIVEN** improved jump jets installed
**WHEN** calculating jump MP
**THEN** jump MP follows same 1 MP per jet rule
**AND** jump MP MUST NOT exceed walk MP
**AND** improved jets provide same MP but different benefits

#### Scenario: Extended jump jets
**GIVEN** extended jump jets installed
**WHEN** calculating jump MP
**THEN** jump MP MUST NOT exceed run MP (extended limit)
**AND** this allows higher jump capability than standard

### Requirement: Jump Jet Weight Calculation
The system SHALL calculate jump jet weight based on mech tonnage class using official weight brackets.

**Rationale**: Jump jet weight scales with mech size to maintain balance.

**Priority**: Critical

#### Scenario: Light mech jump jet weight
**GIVEN** mech tonnage ≤ 55 tons
**WHEN** calculating jump jet weight
**THEN** each standard jump jet weighs 0.5 tons

#### Scenario: Medium/Heavy mech jump jet weight
**GIVEN** mech tonnage 56-85 tons (inclusive)
**WHEN** calculating jump jet weight
**THEN** each standard jump jet weighs 1.0 ton

#### Scenario: Assault mech jump jet weight
**GIVEN** mech tonnage ≥ 86 tons
**WHEN** calculating jump jet weight
**THEN** each standard jump jet weighs 2.0 tons

#### Scenario: 55-ton boundary case
**GIVEN** mech tonnage exactly 55 tons
**WHEN** calculating jump jet weight
**THEN** each jump jet weighs 0.5 tons (in light bracket)

#### Scenario: 56-ton boundary case
**GIVEN** mech tonnage exactly 56 tons
**WHEN** calculating jump jet weight
**THEN** each jump jet weighs 1.0 ton (in medium bracket)

#### Scenario: 85-ton boundary case
**GIVEN** mech tonnage exactly 85 tons
**WHEN** calculating jump jet weight
**THEN** each jump jet weighs 1.0 ton (in medium bracket)

#### Scenario: 86-ton boundary case
**GIVEN** mech tonnage exactly 86 tons
**WHEN** calculating jump jet weight
**THEN** each jump jet weighs 2.0 tons (in assault bracket)

### Requirement: Jump Jet Critical Slot Allocation
The system SHALL allocate critical slots for jump jets according to type-specific requirements.

**Rationale**: Different jump jet types occupy different amounts of critical space.

**Priority**: Critical

#### Scenario: Standard jump jet slots
**GIVEN** standard jump jet
**WHEN** allocating critical slots
**THEN** each jet occupies exactly 1 critical slot

#### Scenario: Improved jump jet slots
**GIVEN** improved jump jet (IS)
**WHEN** allocating critical slots
**THEN** each jet occupies exactly 2 critical slots
**AND** provides improved efficiency over standard

#### Scenario: Jump booster slots (Clan)
**GIVEN** jump booster (Clan improved variant)
**WHEN** allocating critical slots
**THEN** each booster occupies exactly 2 critical slots

#### Scenario: Mechanical jump booster slots
**GIVEN** mechanical jump booster
**WHEN** allocating critical slots for mech tonnage T
**THEN** if T ≤ 55: occupies 4 slots
**AND** if T 56-85: occupies 6 slots
**AND** if T ≥ 86: occupies 8 slots
**AND** provides only 1 jump MP total

#### Scenario: Partial wing slots
**GIVEN** partial wing installation
**WHEN** allocating critical slots
**THEN** occupies 6 total slots (3 per side torso)
**AND** MUST be split between left and right torso
**AND** does not provide jump MP directly (reduces weight of other JJs)

### Requirement: Jump Jet Placement Restrictions
The system SHALL enforce location restrictions for jump jet placement.

**Rationale**: Jump jets can only be installed in torso and leg locations per construction rules.

**Priority**: High

#### Scenario: Valid jump jet locations
**GIVEN** jump jet being placed
**WHEN** validating placement location
**THEN** location MAY be Center Torso
**OR** location MAY be Left Torso
**OR** location MAY be Right Torso
**OR** location MAY be Left Leg
**OR** location MAY be Right Leg
**AND** location MUST NOT be Head, Left Arm, or Right Arm

#### Scenario: Invalid arm placement
**GIVEN** jump jet placement in Left Arm or Right Arm
**WHEN** validating placement
**THEN** placement SHALL be rejected
**AND** error SHALL indicate arms cannot contain jump jets

#### Scenario: Invalid head placement
**GIVEN** jump jet placement in Head
**WHEN** validating placement
**THEN** placement SHALL be rejected
**AND** error SHALL indicate head cannot contain jump jets

#### Scenario: Partial wing placement restriction
**GIVEN** partial wing being placed
**WHEN** validating placement location
**THEN** location MUST be Left Torso (3 slots) or Right Torso (3 slots)
**AND** MUST occupy both side torsos (3 slots each)
**AND** placement in legs or center torso SHALL be rejected

### Requirement: Movement Enhancement - MASC
The system SHALL support MASC (Myomer Accelerator Signal Circuitry) for sprint movement.

**Rationale**: MASC provides temporary speed boost for tactical advantage.

**Priority**: High

#### Scenario: MASC sprint movement calculation
**GIVEN** mech equipped with MASC and walk MP = W
**WHEN** activating MASC
**THEN** sprint MP = floor(W × 2.0)
**AND** run MP is replaced by sprint MP for that turn
**AND** MASC generates heat when activated

#### Scenario: MASC with walk 4
**GIVEN** walk MP = 4 and MASC installed
**WHEN** activating MASC
**THEN** sprint MP = floor(4 × 2.0) = 8
**AND** mech can move up to 8 hexes

#### Scenario: MASC with walk 5
**GIVEN** walk MP = 5 and MASC installed
**WHEN** activating MASC
**THEN** sprint MP = floor(5 × 2.0) = 10

#### Scenario: MASC incompatibility with TSM
**GIVEN** mech has TSM installed
**WHEN** attempting to install MASC
**THEN** installation SHALL be rejected
**AND** error SHALL indicate TSM and MASC are mutually exclusive

### Requirement: Movement Enhancement - Supercharger
The system SHALL support Supercharger for increased run speed.

**Rationale**: Supercharger boosts engine performance for higher sustained speed.

**Priority**: High

#### Scenario: Supercharger run boost calculation
**GIVEN** mech equipped with Supercharger and walk MP = W
**WHEN** calculating enhanced run MP
**THEN** enhanced run MP = floor(W × 2.0)
**AND** replaces standard run MP = floor(W × 1.5)

#### Scenario: Supercharger with walk 4
**GIVEN** walk MP = 4 and Supercharger installed
**WHEN** calculating run MP
**THEN** run MP = floor(4 × 2.0) = 8 (instead of 6)

#### Scenario: Supercharger with walk 5
**GIVEN** walk MP = 5 and Supercharger installed
**WHEN** calculating run MP
**THEN** run MP = floor(5 × 2.0) = 10 (instead of 7)

#### Scenario: Supercharger placement restriction
**GIVEN** Supercharger being placed
**WHEN** validating placement location
**THEN** location MUST be in torso with engine critical slots
**AND** placement outside engine locations SHALL be rejected

#### Scenario: Supercharger with TSM compatibility
**GIVEN** mech has TSM active and Supercharger installed
**WHEN** calculating run MP
**THEN** Supercharger uses TSM-boosted walk MP
**AND** run MP = floor(TSM_walk × 2.0)

#### Scenario: Supercharger with MASC combination
**GIVEN** mech has both Supercharger and MASC
**WHEN** activating MASC
**THEN** sprint MP = floor(walk × 2.5)
**AND** combined effect provides 2.5× multiplier

### Requirement: Movement Enhancement - Triple Strength Myomer
The system SHALL support TSM providing movement bonus at high heat levels.

**Rationale**: TSM enhances physical capabilities when mech reaches operational heat threshold.

**Priority**: High

#### Scenario: TSM activation threshold
**GIVEN** mech equipped with TSM
**WHEN** heat level reaches 9 or higher
**THEN** TSM activates
**AND** walk MP increases by 1 (net: +2 from TSM, -1 from heat)
**AND** run MP = ceiling(walk × 1.5) using TSM walk

#### Scenario: TSM with base walk 4
**GIVEN** walk MP = 4 and TSM active (9+ heat)
**WHEN** calculating movement
**THEN** walk MP = 4 + 1 = 5
**AND** run MP = ceiling(5 × 1.5) = ceiling(7.5) = 8

#### Scenario: TSM below activation threshold
**GIVEN** walk MP = 4 and TSM installed but heat < 9
**WHEN** calculating movement
**THEN** walk MP = 4 (no TSM bonus)
**AND** run MP = floor(4 × 1.5) = 6

#### Scenario: TSM ceiling calculation
**GIVEN** TSM active with walk MP = W
**WHEN** calculating run MP
**THEN** run MP = ceiling(W × 1.5)
**AND** uses ceiling instead of floor (unlike standard calculation)

#### Scenario: TSM incompatibility with MASC
**GIVEN** mech has MASC installed
**WHEN** attempting to install TSM
**THEN** installation SHALL be rejected
**AND** error SHALL indicate TSM and MASC are mutually exclusive

### Requirement: Jump Jet Type Variants
The system SHALL support all official jump jet type variants with distinct characteristics.

**Rationale**: Different jump jet technologies offer trade-offs between weight, slots, and capabilities.

**Priority**: High

#### Scenario: Standard Jump Jet
**GIVEN** Standard Jump Jet type
**WHEN** querying specifications
**THEN** tech base SHALL be Both (IS and Clan)
**AND** rules level SHALL be Standard
**AND** critical slots SHALL be 1 per jet
**AND** weight calculation SHALL be standard (tonnage-based)
**AND** max jump MP SHALL be walk MP
**AND** heat generation SHALL be 1 per MP when jumping

#### Scenario: Improved Jump Jet (IS)
**GIVEN** Improved Jump Jet type
**WHEN** querying specifications
**THEN** tech base SHALL be Inner Sphere only
**AND** rules level SHALL be Advanced
**AND** critical slots SHALL be 2 per jet
**AND** weight calculation SHALL be standard (tonnage-based)
**AND** max jump MP SHALL be walk MP
**AND** provides improved efficiency over standard

#### Scenario: Extended Jump Jet
**GIVEN** Extended Jump Jet type
**WHEN** querying specifications
**THEN** tech base SHALL be Inner Sphere
**AND** rules level SHALL be Experimental
**AND** critical slots SHALL be 1 per jet
**AND** weight calculation SHALL be standard (tonnage-based)
**AND** max jump MP SHALL be run MP (extended capability)
**AND** heat generation SHALL be 1 per MP

#### Scenario: UMU (Underwater Maneuvering Unit)
**GIVEN** UMU type
**WHEN** querying specifications
**THEN** tech base SHALL be Both (IS and Clan)
**AND** rules level SHALL be Standard
**AND** critical slots SHALL be 1 per unit
**AND** weight calculation SHALL be standard (tonnage-based)
**AND** max jump MP SHALL be walk MP
**AND** functions only underwater

#### Scenario: Mechanical Jump Booster
**GIVEN** Mechanical Jump Booster type
**WHEN** querying specifications
**THEN** tech base SHALL be Inner Sphere
**AND** rules level SHALL be Advanced
**AND** critical slots SHALL be variable (4-8 based on tonnage)
**AND** weight SHALL be 10% of mech tonnage
**AND** max jump MP SHALL be exactly 1 (total, not per booster)
**AND** heat generation SHALL be 1 when jumping

#### Scenario: Partial Wing
**GIVEN** Partial Wing type
**WHEN** querying specifications
**THEN** tech base SHALL be Inner Sphere
**AND** rules level SHALL be Advanced
**AND** critical slots SHALL be 6 (3 per side torso)
**AND** weight SHALL be tonnage-based (2-5 tons fixed)
**AND** reduces other jump jet weight by 50%
**AND** heat generation SHALL be 0 (no heat)
**AND** requires other jump jets to function

#### Scenario: Jump Booster (Clan)
**GIVEN** Jump Booster (Clan) type
**WHEN** querying specifications
**THEN** tech base SHALL be Clan only
**AND** rules level SHALL be Advanced
**AND** critical slots SHALL be 2 per booster
**AND** weight calculation SHALL be standard (tonnage-based)
**AND** max jump MP SHALL be walk MP
**AND** enhanced reliability over IS improved JJ

#### Scenario: Prototype Jump Jet
**GIVEN** Prototype Jump Jet type
**WHEN** querying specifications
**THEN** tech base SHALL be Inner Sphere
**AND** rules level SHALL be Experimental
**AND** critical slots SHALL be 2 per jet
**AND** weight calculation SHALL be standard (tonnage-based)
**AND** max jump MP SHALL be walk MP
**AND** heat generation SHALL be 2 per MP (inefficient)
**AND** unreliable performance

### Requirement: Partial Wing Weight Reduction
The system SHALL apply 50% weight reduction to other jump jets when partial wing is installed.

**Rationale**: Partial wings provide aerodynamic lift reducing propellant requirements.

**Priority**: High

#### Scenario: Partial wing discount calculation
**GIVEN** partial wing installed and N standard jump jets
**WHEN** calculating total jump jet weight
**THEN** partial wing weight = tonnage-based fixed weight
**AND** jump jet weight = (N × weight per jet) × 0.5
**AND** total weight = partial wing weight + discounted jet weight

#### Scenario: 55-ton mech with partial wing and 5 jump jets
**GIVEN** 55-ton mech with partial wing and 5 standard jump jets
**WHEN** calculating weight
**THEN** partial wing = 2.0 tons (fixed for ≤55t)
**AND** jump jets without wing = 5 × 0.5 = 2.5 tons
**AND** jump jets with wing = 2.5 × 0.5 = 1.25 tons
**AND** total = 2.0 + 1.25 = 3.25 tons (rounded to 3.5)

#### Scenario: Partial wing without other jump jets
**GIVEN** partial wing installed but no other jump jets
**WHEN** validating configuration
**THEN** validation SHALL fail
**AND** error SHALL indicate partial wing requires other jump jets

### Requirement: Movement Heat Generation
The system SHALL calculate heat generated by movement actions.

**Rationale**: Movement generates heat that must be managed by heat sink system.

**Priority**: High

#### Scenario: Walking heat
**GIVEN** mech performs walk movement
**WHEN** calculating heat
**THEN** heat generated = 1 point

#### Scenario: Running heat
**GIVEN** mech performs run movement
**WHEN** calculating heat
**THEN** heat generated = 2 points

#### Scenario: Jumping heat with standard jump jets
**GIVEN** mech jumps J hexes with standard jump jets
**WHEN** calculating heat
**THEN** heat generated = J points (1 per hex jumped)

#### Scenario: Jumping heat with prototype jump jets
**GIVEN** mech jumps J hexes with prototype jump jets
**WHEN** calculating heat
**THEN** heat generated = J × 2 points (2 per hex jumped)

#### Scenario: Partial wing heat
**GIVEN** mech jumps with partial wing installed
**WHEN** calculating heat
**THEN** partial wing generates 0 heat
**AND** jump jets still generate their normal heat

#### Scenario: MASC heat
**GIVEN** mech activates MASC for sprint
**WHEN** calculating heat
**THEN** MASC generates heat based on weight class
**AND** movement generates sprint heat (2 points)

### Requirement: Movement Type Classification
The system SHALL support different movement type classifications for future unit types.

**Rationale**: Provides foundation for non-biped units (vehicles, quad mechs, etc.).

**Priority**: Medium

#### Scenario: Biped movement type
**GIVEN** standard two-legged BattleMech
**WHEN** determining movement type
**THEN** movement type SHALL be Biped
**AND** walk/run formulas SHALL use standard calculations

#### Scenario: Quad movement type
**GIVEN** four-legged BattleMech
**WHEN** determining movement type
**THEN** movement type SHALL be Quad
**AND** walk/run formulas SHALL use standard calculations
**AND** jump jets MAY have different restrictions

#### Scenario: Tracked movement type (future)
**GIVEN** tracked vehicle unit
**WHEN** determining movement type
**THEN** movement type SHALL be Tracked
**AND** movement formulas SHALL account for vehicle rules

#### Scenario: Wheeled movement type (future)
**GIVEN** wheeled vehicle unit
**WHEN** determining movement type
**THEN** movement type SHALL be Wheeled
**AND** movement formulas SHALL account for vehicle rules

#### Scenario: VTOL movement type (future)
**GIVEN** VTOL unit
**WHEN** determining movement type
**THEN** movement type SHALL be VTOL
**AND** movement SHALL be airborne by default

### Requirement: Maximum Movement Limitations
The system SHALL enforce maximum movement limitations based on construction rules.

**Rationale**: Game balance and construction rules limit maximum practical movement.

**Priority**: High

#### Scenario: Maximum walk MP recommendation
**GIVEN** any BattleMech
**WHEN** validating walk MP
**THEN** practical maximum walk MP SHOULD be 8
**AND** walk MP > 8 MAY trigger warning
**AND** walk MP > 8 requires very high engine rating

#### Scenario: Maximum run MP
**GIVEN** walk MP = 8 (maximum practical)
**WHEN** calculating run MP
**THEN** run MP = floor(8 × 1.5) = 12
**AND** this represents extreme speed

#### Scenario: Maximum jump MP for standard jets
**GIVEN** standard jump jets and walk MP = W
**WHEN** determining maximum jump MP
**THEN** max jump MP SHALL NOT exceed W
**AND** installing more than W jets SHALL be rejected

#### Scenario: Maximum jump MP for extended jets
**GIVEN** extended jump jets and run MP = R
**WHEN** determining maximum jump MP
**THEN** max jump MP SHALL NOT exceed R
**AND** allows higher jump than standard jets

---

## Data Model Requirements

### Required Interfaces

The implementation MUST provide the following TypeScript interfaces:

```typescript
/**
 * Movement type enumeration
 * Defines all supported movement systems
 */
enum MovementType {
  BIPED = 'Biped',
  QUAD = 'Quad',
  TRACKED = 'Tracked',
  WHEELED = 'Wheeled',
  VTOL = 'VTOL',
  HOVER = 'Hover',
  NAVAL = 'Naval',
  SUBMARINE = 'Submarine',
  WIGE = 'WiGE', // Wing-in-Ground Effect
}

/**
 * Jump jet type enumeration
 * Defines all jump jet technology variants
 */
enum JumpJetType {
  STANDARD = 'Standard Jump Jet',
  IMPROVED = 'Improved Jump Jet',
  EXTENDED = 'Extended Jump Jet',
  UMU = 'UMU',
  MECHANICAL_BOOSTER = 'Mechanical Jump Booster',
  PARTIAL_WING = 'Partial Wing',
  JUMP_BOOSTER = 'Jump Booster', // Clan
  PROTOTYPE = 'Prototype Jump Jet',
}

/**
 * Movement profile for a BattleMech
 * Contains all movement-related calculated properties
 */
interface IMovementProfile {
  /**
   * Walk movement points (base)
   * Formula: floor(engine rating / tonnage)
   * @example 4
   */
  readonly walkMP: number;

  /**
   * Run movement points (base)
   * Formula: floor(walk MP × 1.5)
   * @example 6
   */
  readonly runMP: number;

  /**
   * Jump movement points
   * Typically = number of jump jets, max = walk MP
   * @example 4
   */
  readonly jumpMP: number;

  /**
   * Movement type classification
   * @example MovementType.BIPED
   */
  readonly movementType: MovementType;

  /**
   * Enhanced walk MP (with TSM, etc.)
   * May differ from base walk MP
   * @example 5 (with TSM active)
   */
  readonly enhancedWalkMP?: number;

  /**
   * Enhanced run MP (with MASC, Supercharger, etc.)
   * May differ from base run MP
   * @example 8 (with Supercharger)
   */
  readonly enhancedRunMP?: number;

  /**
   * Sprint MP (MASC activation)
   * Available when MASC is installed
   * @example 8 (walk × 2)
   */
  readonly sprintMP?: number;

  /**
   * Display string for movement
   * Format: "walk / run / jump" or with enhancements
   * @example "4 / 6 / 4" or "4 [5] / 6 [8] / 4"
   */
  readonly displayString: string;
}

/**
 * Jump jet component specification
 * Extends IPlaceableComponent from Core Entity Types
 */
interface IJumpJet extends ITechBaseEntity, IPlaceableComponent {
  /**
   * Jump jet type classification
   * @example JumpJetType.STANDARD
   */
  readonly jumpJetType: JumpJetType;

  /**
   * Weight per jump jet in tons
   * Depends on mech tonnage class
   * @example 0.5 for light mech, 1.0 for medium, 2.0 for assault
   */
  readonly weight: number;

  /**
   * Critical slots per jump jet
   * @example 1 for standard, 2 for improved
   */
  readonly criticalSlots: number;

  /**
   * Heat generated per MP when jumping
   * @example 1 for standard, 2 for prototype
   */
  readonly heatPerMP: number;

  /**
   * Maximum jump MP allowed
   * @example 'walk' for standard, 'run' for extended
   */
  readonly maxJumpMP: 'walk' | 'run' | number;

  /**
   * Allowed placement locations
   * @example ['CT', 'LT', 'RT', 'LL', 'RL']
   */
  readonly allowedLocations: string[];
}

/**
 * Movement enhancement component
 * Base interface for MASC, Supercharger, TSM
 */
interface IMovementEnhancement extends ITechBaseEntity, IPlaceableComponent {
  /**
   * Enhancement type
   * @example 'MASC', 'Supercharger', 'Triple Strength Myomer'
   */
  readonly enhancementType: string;

  /**
   * Walk MP modifier
   * @example 1 for TSM (when active)
   */
  readonly walkModifier: number;

  /**
   * Run MP calculation mode
   * @example 'multiplier' for MASC/Supercharger, 'recalculate' for TSM
   */
  readonly runModifier: 'multiplier' | 'recalculate' | number;

  /**
   * Jump MP modifier
   * @example 0 (most enhancements don't affect jump)
   */
  readonly jumpModifier: number;

  /**
   * Activation condition
   * @example "9+ heat" for TSM
   */
  readonly condition?: string;

  /**
   * Mutually exclusive enhancements
   * @example ['MASC'] for TSM
   */
  readonly incompatibleWith?: string[];
}

/**
 * Jump jet configuration for a unit
 * Tracks all jump jet installations
 */
interface IJumpJetConfiguration {
  /**
   * Count of each jump jet type
   * @example { 'Standard Jump Jet': 5 }
   */
  readonly jumpJetCounts: Partial<Record<JumpJetType, number>>;

  /**
   * Has partial wing installed
   * @example true
   */
  readonly hasPartialWing: boolean;

  /**
   * Total jump MP provided
   * @example 5
   */
  readonly totalJumpMP: number;

  /**
   * Total weight of all jump jets
   * Includes partial wing discount if applicable
   * @example 2.5 tons
   */
  readonly totalWeight: number;

  /**
   * Total critical slots occupied
   * @example 5 (standard) or 10 (improved)
   */
  readonly totalCriticalSlots: number;

  /**
   * Heat generated when jumping full distance
   * @example 5 (1 per MP)
   */
  readonly heatGeneration: number;
}
```

### Required Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `walkMP` | `number` | Yes | Walk movement points | 1-8 typical, 0-12 absolute | Calculated |
| `runMP` | `number` | Yes | Run movement points | 1-12 typical, 0-18 absolute | Calculated |
| `jumpMP` | `number` | No | Jump movement points | 0-8 typical | 0 |
| `movementType` | `MovementType` | Yes | Movement system type | MovementType enum values | BIPED |
| `jumpJetType` | `JumpJetType` | No | Jump jet variant | JumpJetType enum values | N/A |
| `jumpJetWeight` | `number` | No | Weight per jet | 0.5, 1.0, or 2.0 | Tonnage-based |
| `jumpJetSlots` | `number` | No | Slots per jet | 1-8 | Type-dependent |
| `enhancedWalkMP` | `number` | No | Enhanced walk MP | walkMP + modifiers | walkMP |
| `enhancedRunMP` | `number` | No | Enhanced run MP | runMP + modifiers | runMP |
| `sprintMP` | `number` | No | Sprint MP (MASC) | walkMP × 2 | N/A |

### Type Constraints

- `walkMP` MUST equal floor(engine rating / tonnage)
- `walkMP` MUST be >= 1 for valid construction (0 is invalid)
- `runMP` MUST equal floor(walkMP × 1.5) for standard calculation
- `runMP` MAY be modified by Supercharger, MASC, or TSM
- `jumpMP` MUST NOT exceed walkMP for standard jump jets
- `jumpMP` MUST NOT exceed runMP for extended jump jets
- `jumpMP` MUST equal number of jump jets (except mechanical booster = 1 max)
- `jumpJetWeight` MUST be 0.5t for tonnage ≤ 55
- `jumpJetWeight` MUST be 1.0t for tonnage 56-85
- `jumpJetWeight` MUST be 2.0t for tonnage ≥ 86
- When `jumpJetType` is `MECHANICAL_BOOSTER`, total `jumpMP` MUST be exactly 1
- When `jumpJetType` is `PARTIAL_WING`, other jump jets MUST be installed
- When TSM is installed, MASC MUST NOT be installed (mutually exclusive)
- When MASC is installed, TSM MUST NOT be installed (mutually exclusive)
- `enhancedWalkMP` with TSM active = walkMP + 1 (net: +2 from TSM, -1 from heat)
- `enhancedRunMP` with Supercharger = floor(walkMP × 2.0)
- `sprintMP` with MASC = floor(walkMP × 2.0)
- `sprintMP` with MASC + Supercharger = floor(walkMP × 2.5)

---

## Calculation Formulas

### Walk MP Formula

**Formula**:
```
walkMP = floor(engineRating / mechTonnage)
```

**Where**:
- `engineRating` = Engine rating (10-500, multiples of 5)
- `mechTonnage` = Mech tonnage (20-100 for standard BattleMechs)
- `floor()` = Round down to nearest integer

**Example**:
```
Input: engineRating = 300, mechTonnage = 75
Calculation: walkMP = floor(300 / 75) = floor(4) = 4
Output: walkMP = 4

Input: engineRating = 280, mechTonnage = 55
Calculation: walkMP = floor(280 / 55) = floor(5.09) = 5
Output: walkMP = 5
```

**Special Cases**:
- When engineRating < mechTonnage: walkMP = 0 (invalid, engine too weak)
- When engineRating = mechTonnage: walkMP = 1 (minimum viable)
- When walkMP > 8: Very fast mech, requires high engine rating

**Rounding Rules**:
- Always round down (floor function)
- No fractional movement points allowed

### Run MP Formula

**Formula**:
```
runMP = floor(walkMP × 1.5)
```

**Where**:
- `walkMP` = Walk movement points (calculated above)
- `floor()` = Round down to nearest integer

**Example**:
```
Input: walkMP = 4
Calculation: runMP = floor(4 × 1.5) = floor(6) = 6
Output: runMP = 6

Input: walkMP = 5
Calculation: runMP = floor(5 × 1.5) = floor(7.5) = 7
Output: runMP = 7
```

**Special Cases**:
- Even walkMP: runMP = walkMP × 1.5 exactly (no rounding loss)
- Odd walkMP: runMP loses 0.5 MP to rounding

**Rounding Rules**:
- Always round down (floor function)
- Examples: 6.0 → 6, 7.5 → 7, 9.0 → 9

### Enhanced Run MP with Supercharger

**Formula**:
```
enhancedRunMP = floor(walkMP × 2.0)
```

**Where**:
- `walkMP` = Current walk MP (may be TSM-enhanced)
- `floor()` = Round down to nearest integer

**Example**:
```
Input: walkMP = 4, has Supercharger
Calculation: enhancedRunMP = floor(4 × 2.0) = 8
Output: runMP = 8 (instead of standard 6)

Input: walkMP = 5 (TSM active), has Supercharger
Calculation: enhancedRunMP = floor(5 × 2.0) = 10
Output: runMP = 10
```

**Special Cases**:
- Supercharger replaces standard run calculation
- If TSM active: uses TSM-boosted walk MP as base
- If both Supercharger and MASC: see combined formula below

### Sprint MP with MASC

**Formula**:
```
sprintMP = floor(walkMP × 2.0)
```

**Where**:
- `walkMP` = Current walk MP
- Available only when MASC is activated

**Example**:
```
Input: walkMP = 4, MASC activated
Calculation: sprintMP = floor(4 × 2.0) = 8
Output: can move up to 8 hexes this turn
```

**Special Cases**:
- MASC and TSM are mutually exclusive (cannot coexist)
- MASC activation generates heat and risks equipment damage
- Sprint replaces run for that turn

### Combined MASC + Supercharger Formula

**Formula**:
```
sprintMP = floor(walkMP × 2.5)
```

**Where**:
- `walkMP` = Current walk MP
- Both MASC and Supercharger must be installed
- MASC must be activated

**Example**:
```
Input: walkMP = 4, has both MASC and Supercharger, MASC activated
Calculation: sprintMP = floor(4 × 2.5) = floor(10) = 10
Output: can move up to 10 hexes this turn
```

**Special Cases**:
- Most extreme speed boost available
- High heat generation and MASC damage risk

### TSM Enhanced Walk MP Formula

**Formula**:
```
enhancedWalkMP = baseWalkMP + 1
```

**Where**:
- `baseWalkMP` = Normal walk MP from engine
- TSM must be active (heat >= 9)
- Net effect: +2 from TSM, -1 from heat penalty = +1

**Example**:
```
Input: baseWalkMP = 4, heat = 10 (TSM active)
Calculation: enhancedWalkMP = 4 + 1 = 5
Output: walkMP = 5 when heat >= 9
```

**Special Cases**:
- Below 9 heat: enhancedWalkMP = baseWalkMP (TSM inactive)
- At or above 9 heat: enhancedWalkMP = baseWalkMP + 1

### TSM Enhanced Run MP Formula

**Formula**:
```
enhancedRunMP = ceiling(enhancedWalkMP × 1.5)
```

**Where**:
- `enhancedWalkMP` = TSM-boosted walk MP
- `ceiling()` = Round UP to nearest integer (unique to TSM)

**Example**:
```
Input: enhancedWalkMP = 5 (TSM active)
Calculation: enhancedRunMP = ceiling(5 × 1.5) = ceiling(7.5) = 8
Output: runMP = 8 (instead of floor = 7)
```

**Special Cases**:
- TSM uses ceiling instead of floor for run calculation
- This is unique to TSM; standard calculation uses floor

### Jump MP Formula

**Formula**:
```
For Standard/Improved/UMU/Extended jump jets:
  jumpMP = numberOfJumpJets

For Mechanical Jump Booster:
  jumpMP = 1 (regardless of count)

For Partial Wing:
  jumpMP = 0 (does not provide jump MP)
```

**Where**:
- `numberOfJumpJets` = Count of jump jets installed
- Does not include partial wing in count

**Example**:
```
Input: 5 standard jump jets installed
Calculation: jumpMP = 5
Output: jumpMP = 5

Input: 1 mechanical jump booster installed
Calculation: jumpMP = 1 (maximum allowed)
Output: jumpMP = 1
```

**Special Cases**:
- Standard jets: jumpMP ≤ walkMP (hard limit)
- Extended jets: jumpMP ≤ runMP (higher limit)
- Mechanical booster: jumpMP = 1 exactly (cannot exceed)

**Rounding Rules**:
- No rounding needed (always integer count)

### Jump Jet Weight Formula

**Formula**:
```
For Standard/Improved/Extended/UMU/Jump Booster/Prototype:
  if mechTonnage <= 55:
    weightPerJet = 0.5 tons
  else if mechTonnage <= 85:
    weightPerJet = 1.0 ton
  else:
    weightPerJet = 2.0 tons

  totalWeight = weightPerJet × numberOfJets

For Mechanical Jump Booster:
  totalWeight = mechTonnage × 0.1 × jumpMP

For Partial Wing:
  if mechTonnage <= 55:
    partialWingWeight = 2.0 tons
  else if mechTonnage <= 85:
    partialWingWeight = 3.0 tons
  else:
    partialWingWeight = 5.0 tons
```

**Where**:
- `mechTonnage` = Mech tonnage class
- `numberOfJets` = Count of jump jets installed
- `jumpMP` = Jump movement points (for mechanical booster)

**Example**:
```
Input: mechTonnage = 55, numberOfJets = 5 (standard)
Calculation: weightPerJet = 0.5, totalWeight = 0.5 × 5 = 2.5 tons
Output: 2.5 tons

Input: mechTonnage = 75, numberOfJets = 4 (standard)
Calculation: weightPerJet = 1.0, totalWeight = 1.0 × 4 = 4.0 tons
Output: 4.0 tons

Input: mechTonnage = 100, numberOfJets = 3 (standard)
Calculation: weightPerJet = 2.0, totalWeight = 2.0 × 3 = 6.0 tons
Output: 6.0 tons
```

**Special Cases**:
- Tonnage exactly 55: uses 0.5 tons per jet (light bracket)
- Tonnage exactly 56: uses 1.0 ton per jet (medium bracket)
- Tonnage exactly 85: uses 1.0 ton per jet (medium bracket)
- Tonnage exactly 86: uses 2.0 tons per jet (assault bracket)

### Partial Wing Weight Discount Formula

**Formula**:
```
otherJetWeight = weightPerJet × numberOfJets
discountedJetWeight = otherJetWeight × 0.5
totalWeight = partialWingWeight + discountedJetWeight
```

**Where**:
- `partialWingWeight` = Fixed weight for partial wing (tonnage-based)
- `otherJetWeight` = Weight of other jump jets before discount
- 50% discount applied to other jump jets only

**Example**:
```
Input: mechTonnage = 55, partialWing = true, 5 standard jump jets
Calculation:
  partialWingWeight = 2.0 tons
  otherJetWeight = 5 × 0.5 = 2.5 tons
  discountedJetWeight = 2.5 × 0.5 = 1.25 tons
  totalWeight = 2.0 + 1.25 = 3.25 tons → 3.5 tons
Output: 3.5 tons total
```

**Special Cases**:
- Partial wing without other jets: invalid configuration
- Discount applies only to standard jump jet types
- Mechanical jump booster not affected by partial wing

**Rounding Rules**:
- Final weight rounded to nearest 0.5 ton

### Jump Heat Generation Formula

**Formula**:
```
For Standard/Improved/Extended/UMU/Mechanical/Jump Booster:
  heatGenerated = jumpMP × 1

For Prototype Jump Jet:
  heatGenerated = jumpMP × 2

For Partial Wing:
  heatGenerated = 0 (wing itself)
```

**Where**:
- `jumpMP` = Distance jumped in hexes
- Heat is per hex jumped

**Example**:
```
Input: jump 4 hexes with standard jump jets
Calculation: heatGenerated = 4 × 1 = 4 points
Output: 4 heat

Input: jump 3 hexes with prototype jump jets
Calculation: heatGenerated = 3 × 2 = 6 points
Output: 6 heat
```

**Special Cases**:
- Partial wing generates no heat itself
- Jump jets with partial wing still generate their normal heat
- Heat is only generated when jumping, not when installed

---

## Validation Rules

### Validation: Minimum Walk MP
**Rule**: Engine must provide at least 1 walk MP for valid construction

**Severity**: Error

**Condition**:
```typescript
const walkMP = Math.floor(engineRating / tonnage);
if (walkMP < 1) {
  // Error: Engine too weak
}
```

**Error Message**: "Engine rating {rating} too low for {tonnage}-ton mech (provides 0 walk MP)"

**User Action**: Increase engine rating to at least match mech tonnage

### Validation: Jump MP Maximum (Standard Jets)
**Rule**: Jump MP must not exceed walk MP for standard jump jets

**Severity**: Error

**Condition**:
```typescript
if (jumpJetType === JumpJetType.STANDARD && jumpMP > walkMP) {
  // Error: Too many jump jets
}
```

**Error Message**: "Jump MP ({jumpMP}) exceeds maximum allowed ({walkMP}) for standard jump jets"

**User Action**: Remove jump jets or use extended jump jets for higher jump MP

### Validation: Jump MP Maximum (Extended Jets)
**Rule**: Jump MP must not exceed run MP for extended jump jets

**Severity**: Error

**Condition**:
```typescript
if (jumpJetType === JumpJetType.EXTENDED && jumpMP > runMP) {
  // Error: Too many extended jets
}
```

**Error Message**: "Jump MP ({jumpMP}) exceeds maximum allowed ({runMP}) for extended jump jets"

**User Action**: Remove extended jump jets to meet run MP limit

### Validation: Mechanical Jump Booster Limit
**Rule**: Mechanical jump booster provides exactly 1 jump MP total

**Severity**: Error

**Condition**:
```typescript
if (jumpJetType === JumpJetType.MECHANICAL_BOOSTER && jumpMP !== 1) {
  // Error: Mechanical booster limited to 1 MP
}
```

**Error Message**: "Mechanical Jump Booster provides exactly 1 Jump MP (current: {jumpMP})"

**User Action**: Set jump MP to 1 or remove mechanical jump booster

### Validation: Partial Wing Requires Other Jets
**Rule**: Partial wing must be installed with other jump jets

**Severity**: Error

**Condition**:
```typescript
if (hasPartialWing && otherJumpJetCount === 0) {
  // Error: Partial wing alone is invalid
}
```

**Error Message**: "Partial Wing requires other jump jets to function"

**User Action**: Install standard/improved/extended jump jets with partial wing

### Validation: MASC and TSM Mutual Exclusivity
**Rule**: MASC and TSM cannot be installed on the same mech

**Severity**: Error

**Condition**:
```typescript
if (hasMASC && hasTSM) {
  // Error: Mutually exclusive
}
```

**Error Message**: "MASC and Triple Strength Myomer are mutually exclusive"

**User Action**: Remove either MASC or TSM

### Validation: Jump Jet Location Restriction
**Rule**: Jump jets can only be placed in torso and leg locations

**Severity**: Error

**Condition**:
```typescript
const validLocations = ['CT', 'LT', 'RT', 'LL', 'RL'];
if (!validLocations.includes(location)) {
  // Error: Invalid location
}
```

**Error Message**: "Jump jets cannot be placed in {location} (allowed: CT, LT, RT, LL, RL)"

**User Action**: Move jump jet to valid location

### Validation: Partial Wing Location Restriction
**Rule**: Partial wing must occupy both side torsos

**Severity**: Error

**Condition**:
```typescript
if (equipmentType === 'Partial Wing') {
  if (!hasPartialWingInLocation('LT') || !hasPartialWingInLocation('RT')) {
    // Error: Must be in both torsos
  }
}
```

**Error Message**: "Partial Wing must occupy 3 slots in both Left Torso and Right Torso"

**User Action**: Place partial wing components in both LT and RT

### Validation: Supercharger Location Restriction
**Rule**: Supercharger must be placed in location with engine slots

**Severity**: Error

**Condition**:
```typescript
if (equipmentType === 'Supercharger' && !locationHasEngineSlots(location)) {
  // Error: Must be in engine location
}
```

**Error Message**: "Supercharger must be placed in torso location with engine critical slots"

**User Action**: Place supercharger in CT, LT (if XL), or RT (if XL)

### Validation: Movement Classification Warning
**Rule**: Very high or very low movement should trigger warnings

**Severity**: Warning

**Condition**:
```typescript
if (walkMP > 8) {
  // Warning: Exceptionally fast
}
if (walkMP <= 2) {
  // Warning: Very slow
}
```

**Error Message**: "Walk MP {walkMP} is {classification} - ensure design is intentional"

**User Action**: Review engine rating and mech design goals

---

## Technology Base Variants

See [Tech Base Variants Reference](../tech-base-variants-reference/spec.md) for general Inner Sphere vs Clan differences.

### Movement System Tech Base Differences

**No Direct Movement Formula Differences**:
- Walk MP = engine rating / tonnage (identical formula for both)
- Run MP = walk MP × 1.5 (identical formula for both)
- Jump MP = jump jet count (identical calculation for both)

**Indirect Tech Base Effects**:
- Engine weight differences affect available tonnage for equipment
- XL engine slot differences affect jump jet placement options
- No difference in movement calculation itself

**Component Availability**:
- Standard jump jets: Available to both tech bases
- Improved jump jets: Check specific introduction years by tech base
- Mechanical jump boosters: Availability varies

**Mixed Tech Application**:
- Movement calculation remains tech-base independent
- Use engine's specific tech base for weight/slot calculations
- Final movement capacity depends on engine rating and tonnage


---

## Dependencies

### Defines
- **Walk MP formula**: floor(engineRating / tonnage)
- **Run MP formula**: floor(walkMP × 1.5)
- **Jump MP mechanics**: Typically 1 MP per jump jet, max ≤ walkMP
- **JumpJetType enum**: Standard, Improved, Extended, UMU, Mechanical, Partial Wing, Jump Booster
- **Jump jet weight brackets**: Light (≤55t) 0.5t, Medium (60-85t) 1.0t, Heavy (90-100t) 2.0t
- **Jump jet slot requirements**: Most 1 slot, Improved 2 slots
- **MASC mechanics**: Sprint at 2× run MP, failure risks
- **Supercharger mechanics**: Increased run to 2× walk MP
- **TSM mechanics**: Movement bonus at high heat (9+ heat)
- **IJumpJet interface**: Jump jet specification
- **IMovementConfiguration interface**: Complete movement configuration

### Depends On
- [Engine System](../engine-system/spec.md) - Uses engine rating to calculate walk MP (rating/tonnage)
- [Core Entity Types](../../phase-1-foundation/core-entity-types/spec.md) - IJumpJet extends ITechBaseEntity and IPlaceableComponent
- [Tech Base System] - Uses TechBase enum for IS/Clan classification (referenced but spec doesn't exist yet)
- [Rules Level System](../../phase-1-foundation/rules-level-system/spec.md) - Uses RulesLevel enum for technology availability
- [Physical Properties System](../../phase-1-foundation/physical-properties-system/spec.md) - Implements weight and critical slot properties

### Used By
- [Construction Rules Core](../construction-rules-core/spec.md) - Movement affects mech validity, jump jet weight contributes to total
- [Critical Slot Allocation](../critical-slot-allocation/spec.md) - Jump jets and enhancements occupy slots
- **Heat Management System**: Movement generates heat requiring dissipation (jumping, MASC, running)
- **Battle Value Calculation**: Movement affects combat value
- **Combat System**: Movement determines tactical positioning

### Construction Sequence
1. Select chassis (tonnage determines jump jet weight bracket)
2. Select engine (engine rating determines walk/run MP)
3. Calculate base movement: walk = floor(rating/tonnage), run = floor(walk × 1.5)
4. Install jump jets (select type, calculate weight and slots)
5. Install movement enhancements (MASC, Supercharger, or TSM if desired)
6. Calculate enhanced movement (apply modifiers from enhancements)
7. Validate movement (check all movement constraints and limits)
8. Allocate critical slots (place jump jets and enhancements in valid locations)

---

## Implementation Notes

### Performance Considerations
- Movement calculations are frequently used; consider caching results
- Jump jet weight lookup table faster than runtime calculation
- Pre-calculate movement brackets for common tonnage classes
- Movement display string should be memoized for UI performance

### Edge Cases
- **Tonnage = 55**: Use 0.5t jump jet weight (light bracket boundary)
- **Tonnage = 56**: Use 1.0t jump jet weight (medium bracket boundary)
- **Tonnage = 85**: Use 1.0t jump jet weight (medium bracket boundary)
- **Tonnage = 86**: Use 2.0t jump jet weight (assault bracket boundary)
- **Walk MP = 0**: Invalid configuration, engine too weak
- **Walk MP > 8**: Rare but valid, extremely fast mech
- **Partial Wing Alone**: Invalid, must have other jump jets
- **Mechanical Booster > 1 MP**: Invalid, hard limit of 1 MP
- **MASC + TSM**: Invalid, mutually exclusive
- **TSM Below 9 Heat**: No bonus, acts as dead weight
- **Supercharger + TSM**: Valid, Supercharger uses TSM-boosted walk

### Common Pitfalls
- **Pitfall**: Using floor for TSM run calculation
  - **Solution**: TSM uses ceiling for run MP calculation (unique behavior)

- **Pitfall**: Forgetting partial wing requires other jump jets
  - **Solution**: Validate partial wing always has companion jump jets

- **Pitfall**: Allowing MASC and TSM together
  - **Solution**: Check mutual exclusivity before allowing installation

- **Pitfall**: Wrong weight bracket for 55/56 or 85/86 ton mechs
  - **Solution**: Use <= for lower bound, > for upper bound in conditionals

- **Pitfall**: Allowing jump jets in arms or head
  - **Solution**: Validate location against allowed list (CT, LT, RT, LL, RL only)

- **Pitfall**: Not applying partial wing discount correctly
  - **Solution**: Calculate other jet weight first, then apply 50% discount, then add wing weight

- **Pitfall**: Forgetting supercharger must be in engine location
  - **Solution**: Check location has engine critical slots before allowing placement

- **Pitfall**: Calculating enhanced run before enhanced walk
  - **Solution**: Apply walk modifiers first, then calculate run from modified walk

---

## Examples

### Example 1: Light Scout Mech (Locust)

**Input**:
```typescript
const config = {
  tonnage: 20,
  engineRating: 160,
  engineType: EngineType.STANDARD,
  jumpJets: 6,
  jumpJetType: JumpJetType.STANDARD,
};
```

**Processing**:
```typescript
// Movement calculation
const walkMP = Math.floor(160 / 20); // 8
const runMP = Math.floor(8 * 1.5); // 12

// Jump jet weight (light bracket: ≤55 tons = 0.5t each)
const jumpJetWeight = 6 * 0.5; // 3.0 tons

// Jump MP (1 per jet, max = walk MP)
const jumpMP = 6; // Valid, 6 ≤ 8

// Critical slots
const jumpJetSlots = 6 * 1; // 6 slots

// Heat when jumping
const jumpHeat = 6 * 1; // 6 heat
```

**Output**:
```typescript
const movement: IMovementProfile = {
  walkMP: 8,
  runMP: 12,
  jumpMP: 6,
  movementType: MovementType.BIPED,
  displayString: '8 / 12 / 6',
};

const jumpConfig: IJumpJetConfiguration = {
  jumpJetCounts: { 'Standard Jump Jet': 6 },
  hasPartialWing: false,
  totalJumpMP: 6,
  totalWeight: 3.0,
  totalCriticalSlots: 6,
  heatGeneration: 6,
};
```

### Example 2: Medium Mech with Partial Wing (Griffin)

**Input**:
```typescript
const config = {
  tonnage: 55,
  engineRating: 275,
  engineType: EngineType.STANDARD,
  jumpJets: 5,
  jumpJetType: JumpJetType.STANDARD,
  hasPartialWing: true,
};
```

**Processing**:
```typescript
// Movement calculation
const walkMP = Math.floor(275 / 55); // 5
const runMP = Math.floor(5 * 1.5); // 7

// Jump jet weight (light bracket: 55 tons = 0.5t each)
const standardJetWeight = 5 * 0.5; // 2.5 tons
const partialWingWeight = 2.0; // Fixed for ≤55 tons
const discountedJetWeight = standardJetWeight * 0.5; // 1.25 tons
const totalWeight = partialWingWeight + discountedJetWeight; // 3.25 → 3.5 tons

// Jump MP
const jumpMP = 5; // Valid, 5 ≤ 5

// Critical slots
const jumpJetSlots = 5 * 1; // 5 slots
const partialWingSlots = 6; // 3 per side torso
const totalSlots = 11;

// Heat (partial wing generates 0 heat)
const jumpHeat = 5 * 1; // 5 heat from jets only
```

**Output**:
```typescript
const movement: IMovementProfile = {
  walkMP: 5,
  runMP: 7,
  jumpMP: 5,
  movementType: MovementType.BIPED,
  displayString: '5 / 7 / 5',
};

const jumpConfig: IJumpJetConfiguration = {
  jumpJetCounts: {
    'Standard Jump Jet': 5,
    'Partial Wing': 1,
  },
  hasPartialWing: true,
  totalJumpMP: 5,
  totalWeight: 3.5, // Rounded from 3.25
  totalCriticalSlots: 11,
  heatGeneration: 5,
};
```

### Example 3: Assault Mech with TSM and Supercharger (Atlas II)

**Input**:
```typescript
const config = {
  tonnage: 100,
  engineRating: 400,
  engineType: EngineType.XL_CLAN,
  jumpJets: 0,
  hasTSM: true,
  hasSupercharger: true,
  currentHeat: 10, // TSM active
};
```

**Processing**:
```typescript
// Base movement calculation
const baseWalkMP = Math.floor(400 / 100); // 4
const baseRunMP = Math.floor(4 * 1.5); // 6

// TSM enhancement (active at 10 heat)
const tsmWalkMP = baseWalkMP + 1; // 5 (net: +2 from TSM, -1 from heat)
const tsmRunMP = Math.ceil(tsmWalkMP * 1.5); // ceil(7.5) = 8

// Supercharger enhancement (uses TSM walk)
const superchargerRunMP = Math.floor(tsmWalkMP * 2.0); // 10

// Final movement
const walkMP = tsmWalkMP; // 5
const runMP = superchargerRunMP; // 10 (Supercharger overrides TSM run)
```

**Output**:
```typescript
const movement: IMovementProfile = {
  walkMP: 4,
  runMP: 6,
  jumpMP: 0,
  movementType: MovementType.BIPED,
  enhancedWalkMP: 5, // With TSM at 10 heat
  enhancedRunMP: 10, // With Supercharger using TSM walk
  displayString: '4 [5] / 6 [10] / 0',
};
```

### Example 4: Fast Medium with MASC and Supercharger

**Input**:
```typescript
const config = {
  tonnage: 55,
  engineRating: 330,
  engineType: EngineType.XL_INNER_SPHERE,
  jumpJets: 0,
  hasMASC: true,
  hasSupercharger: true,
};
```

**Processing**:
```typescript
// Base movement calculation
const walkMP = Math.floor(330 / 55); // 6
const baseRunMP = Math.floor(6 * 1.5); // 9

// Supercharger enhancement (passive)
const superchargerRunMP = Math.floor(6 * 2.0); // 12

// MASC + Supercharger combination (when MASC activated)
const sprintMP = Math.floor(6 * 2.5); // 15

// Final movement
const runMP = superchargerRunMP; // 12 (normal with Supercharger)
const mascSprintMP = sprintMP; // 15 (when MASC activated)
```

**Output**:
```typescript
const movement: IMovementProfile = {
  walkMP: 6,
  runMP: 9,
  jumpMP: 0,
  movementType: MovementType.BIPED,
  enhancedRunMP: 12, // With Supercharger
  sprintMP: 15, // When MASC activated
  displayString: '6 / 9 [12] / 0', // Shows Supercharger run
};

// When MASC activated:
const mascMovement: IMovementProfile = {
  walkMP: 6,
  runMP: 9,
  jumpMP: 0,
  movementType: MovementType.BIPED,
  sprintMP: 15,
  displayString: '6 / 9 [15] / 0', // Shows MASC sprint
};
```

### Example 5: Assault Mech with Mechanical Jump Booster

**Input**:
```typescript
const config = {
  tonnage: 100,
  engineRating: 300,
  engineType: EngineType.STANDARD,
  mechanicalJumpBooster: true,
};
```

**Processing**:
```typescript
// Movement calculation
const walkMP = Math.floor(300 / 100); // 3
const runMP = Math.floor(3 * 1.5); // 4

// Mechanical jump booster weight
const boosterWeight = 100 * 0.1; // 10.0 tons (10% of tonnage)

// Mechanical jump booster slots (assault tonnage)
const boosterSlots = 8; // 8 slots for 100-ton mech

// Jump MP (hard limit)
const jumpMP = 1; // Mechanical booster provides exactly 1 MP

// Heat
const jumpHeat = 1; // 1 heat when jumping
```

**Output**:
```typescript
const movement: IMovementProfile = {
  walkMP: 3,
  runMP: 4,
  jumpMP: 1,
  movementType: MovementType.BIPED,
  displayString: '3 / 4 / 1',
};

const jumpConfig: IJumpJetConfiguration = {
  jumpJetCounts: { 'Mechanical Jump Booster': 1 },
  hasPartialWing: false,
  totalJumpMP: 1,
  totalWeight: 10.0, // 10% of 100 tons
  totalCriticalSlots: 8,
  heatGeneration: 1,
};
```

### Example 6: Clan Heavy Mech with Jump Boosters

**Input**:
```typescript
const config = {
  tonnage: 75,
  engineRating: 375,
  engineType: EngineType.XL_CLAN,
  jumpBoosters: 5,
  techBase: TechBase.CLAN,
};
```

**Processing**:
```typescript
// Movement calculation
const walkMP = Math.floor(375 / 75); // 5
const runMP = Math.floor(5 * 1.5); // 7

// Jump booster weight (medium bracket: 56-85 tons = 1.0t each)
const boosterWeight = 5 * 1.0; // 5.0 tons

// Jump booster slots (Clan improved variant)
const boosterSlots = 5 * 2; // 10 slots (2 per booster)

// Jump MP
const jumpMP = 5; // Valid, 5 ≤ 5

// Heat
const jumpHeat = 5 * 1; // 5 heat
```

**Output**:
```typescript
const movement: IMovementProfile = {
  walkMP: 5,
  runMP: 7,
  jumpMP: 5,
  movementType: MovementType.BIPED,
  displayString: '5 / 7 / 5',
};

const jumpConfig: IJumpJetConfiguration = {
  jumpJetCounts: { 'Jump Booster': 5 },
  hasPartialWing: false,
  totalJumpMP: 5,
  totalWeight: 5.0,
  totalCriticalSlots: 10,
  heatGeneration: 5,
};
```

---

## References

### Official BattleTech Rules
- **TechManual**: Pages 78-81 - Movement System Overview
- **TechManual**: Pages 118-119 - Jump Jet Weight by Tonnage
- **TechManual**: Page 203 - Jump Jet Types and Variants
- **Total Warfare**: Pages 48-52 - Movement Rules
- **Total Warfare**: Page 59 - Jump Movement Mechanics
- **Tactical Operations**: Pages 100-102 - Advanced Movement Equipment
- **Tactical Operations**: Page 282 - MASC Rules
- **Tactical Operations**: Page 285 - Supercharger Rules
- **Tactical Operations**: Page 288 - Triple Strength Myomer
- **Strategic Operations**: Pages 80-82 - Movement Enhancements
- **Interstellar Operations**: Pages 76-77 - Partial Wing Rules

### Related Documentation
- Engine System Specification (engine rating and walk/run MP relationship)
- Core Entity Types Specification (ITechBaseEntity, IPlaceableComponent)
- Tech Base System Specification (TechBase enum)
- Rules Level System Specification (RulesLevel enum)
- Physical Properties System Specification (weight and slot properties)
- Heat Management System Specification (movement heat generation)
- Critical Slot Allocation Specification (jump jet placement rules)

---

## Changelog

### Version 1.0 (2025-11-27)
- Initial specification
- Defined walk/run MP calculation formulas
- Specified all jump jet types (Standard, Improved, Extended, UMU, Mechanical, Partial Wing, Jump Booster, Prototype)
- Documented jump jet weight by tonnage class (0.5t / 1.0t / 2.0t)
- Specified jump jet critical slot requirements
- Defined jump jet placement restrictions (torso and legs only)
- Documented movement enhancement systems (MASC, Supercharger, TSM)
- Specified partial wing weight discount mechanics (50% reduction)
- Defined mutual exclusivity (MASC and TSM)
- Documented combined enhancement effects (MASC + Supercharger = 2.5×)
- Included comprehensive examples for all movement configurations
- Specified movement heat generation formulas
- Defined movement type classifications (Biped, Quad, etc.)
- Documented tech base variants (IS vs Clan jump jet differences)
