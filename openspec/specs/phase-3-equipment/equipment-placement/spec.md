# Equipment Placement Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2025-11-28
**Dependencies**: Core Enumerations, Location System, Critical Slot Allocation, Weapon System, Ammunition System, Electronics System, Actuator System
**Affects**: Unit Construction, Equipment Configuration, Validation System, UI Components

---

## Overview

### Purpose
Defines the equipment placement system for BattleMech construction, specifying where equipment can be installed, placement constraints, location restrictions, and validation rules. This system ensures equipment is correctly positioned according to BattleTech construction rules while providing flexibility for valid configurations.

### Scope
**In Scope:**
- Equipment placement interfaces and data model
- General equipment placement rules
- Location-specific placement restrictions
- Rear-facing weapon placement
- Multi-slot equipment placement
- Actuator dependency constraints for arm-mounted equipment
- Placement validation rules
- Equipment removal and relocation
- Placement conflict detection

**Out of Scope:**
- System component placement (engine, gyro, actuators - covered in Critical Slot Allocation spec)
- Critical slot allocation algorithms (covered in Critical Slot Allocation spec)
- Specific equipment properties (weight, slots, heat - covered in equipment subsystem specs)
- Equipment database and catalog (covered in Equipment Database spec)
- Auto-placement and optimization algorithms (future spec)
- Combat effectiveness of placement choices (covered in Combat System spec)

### Key Concepts
- **Equipment Placement**: Physical positioning of equipment in a specific location and critical slots
- **Location Restriction**: Constraints limiting equipment to specific mech locations
- **Rear-Facing**: Weapons facing backward, only valid in torso locations
- **Actuator Restriction**: Equipment compatibility with arm actuator configurations
- **Placement Constraint**: Rules governing valid equipment placement
- **Split Equipment**: Equipment spanning multiple locations (prohibited except special cases)
- **Slot Occupancy**: Assignment of equipment to consecutive critical slots

---

## Requirements

### Requirement: Equipment Placement Interface
The system SHALL provide interfaces for equipment placement tracking and validation.

**Rationale**: Equipment placement must track location, slots occupied, and placement properties for validation and display.

**Priority**: Critical

#### Scenario: Standard equipment placement
**GIVEN** equipment with 3 critical slots
**WHEN** placing in Right Arm location
**THEN** placement SHALL record equipmentId, location, startSlot, endSlot
**AND** placement SHALL mark isRearMounted as false
**AND** placement SHALL be immutable once created
**AND** placement SHALL reference the equipment entity

#### Scenario: Rear-facing weapon placement
**GIVEN** a weapon marked as rear-facing
**WHEN** placing in Left Torso location
**THEN** placement SHALL record location as Left Torso
**AND** placement SHALL mark isRearMounted as true
**AND** placement SHALL occupy normal critical slots with rear designation
**AND** placement SHALL be validated for torso-only constraint

#### Scenario: Single-slot equipment placement
**GIVEN** equipment requiring 1 critical slot
**WHEN** creating placement record
**THEN** startSlot SHALL equal endSlot
**AND** total slots occupied = 1
**AND** placement SHALL be valid if slot is empty

### Requirement: General Placement Rules
Equipment SHALL be placeable in any location with available slots unless restricted.

**Rationale**: Most equipment can go anywhere; only specific items have location restrictions.

**Priority**: Critical

#### Scenario: Unrestricted equipment placement
**GIVEN** equipment with no location restrictions
**WHEN** attempting placement in any location
**THEN** placement SHALL succeed if sufficient consecutive slots available
**AND** placement SHALL not check location compatibility
**AND** only slot capacity SHALL be validated

#### Scenario: Multi-slot equipment placement
**GIVEN** equipment requiring N consecutive critical slots
**WHEN** placing equipment
**THEN** all N slots MUST be in the same location
**AND** all N slots MUST be consecutive
**AND** all N slots MUST be empty
**AND** placement SHALL fail if criteria not met

#### Scenario: Equipment overlapping system components
**GIVEN** equipment being placed in location
**WHEN** validating slot occupancy
**THEN** equipment MUST NOT overlap engine slots
**AND** equipment MUST NOT overlap gyro slots
**AND** equipment MUST NOT overlap actuator slots
**AND** equipment MUST NOT overlap critical slots occupied by other equipment
**AND** only empty slots SHALL be valid for placement

### Requirement: Head Location Restrictions
Head location SHALL have strict equipment limitations due to limited space.

**Rationale**: Head has only 1 available slot (slot 3) for standard cockpit, severely limiting equipment options.

**Priority**: High

#### Scenario: Equipment in head with standard cockpit
**GIVEN** BattleMech with standard cockpit
**WHEN** placing equipment in Head
**THEN** only slot 3 SHALL be available
**AND** equipment MUST require exactly 1 critical slot
**AND** equipment MUST be small electronics (sensors, comms, etc.)
**AND** multi-slot equipment SHALL be rejected

#### Scenario: Equipment in head with command console
**GIVEN** BattleMech with command console cockpit
**WHEN** placing equipment in Head
**THEN** only slot 3 SHALL be available
**AND** placement rules SHALL match standard cockpit
**AND** command console occupies slot 4 (fixed)

#### Scenario: Equipment in head with torso-mounted cockpit
**GIVEN** BattleMech with torso-mounted cockpit
**WHEN** placing equipment in Head
**THEN** only slot 5 SHALL be available
**AND** equipment MUST require exactly 1 critical slot
**AND** slots 1-4 contain sensors (fixed)

### Requirement: Center Torso Placement
Center Torso SHALL be preferred location for critical equipment but has limited space.

**Rationale**: CT contains engine and gyro, leaving 0-2 slots for most mechs; preferred for protected equipment.

**Priority**: High

#### Scenario: Equipment in CT with standard engine and gyro
**GIVEN** BattleMech with standard engine and standard gyro
**WHEN** placing equipment in Center Torso
**THEN** slots 10-11 SHOULD be available (if not torso-mounted cockpit)
**AND** equipment requiring 1-2 slots SHALL fit
**AND** equipment requiring 3+ slots SHALL fail (insufficient space)

#### Scenario: CT for critical electronics
**GIVEN** Targeting Computer or ECM Suite
**WHEN** selecting placement location
**THEN** Center Torso SHOULD be recommended
**AND** placement SHALL succeed if slots available
**AND** CT provides maximum protection for critical systems

#### Scenario: CT with torso-mounted cockpit
**GIVEN** BattleMech with torso-mounted cockpit
**WHEN** placing equipment in Center Torso
**THEN** slot 11 contains cockpit (fixed)
**AND** only slot 10 SHOULD be available
**AND** equipment MUST require exactly 1 slot

### Requirement: Side Torso Placement
Side torso locations SHALL be common placement for weapons and ammunition.

**Rationale**: Side torsos provide 9-12 available slots (depending on engine type), ideal for weapons.

**Priority**: High

#### Scenario: Equipment in torso with standard engine
**GIVEN** BattleMech with standard engine
**WHEN** placing equipment in Left Torso or Right Torso
**THEN** all 12 slots SHALL be available
**AND** equipment of any slot count (1-12) SHALL fit
**AND** multiple equipment items MAY be placed

#### Scenario: Equipment in torso with XL engine
**GIVEN** BattleMech with XL engine (Inner Sphere)
**WHEN** placing equipment in side torso
**THEN** slots 0-2 contain engine (fixed)
**AND** slots 3-11 SHALL be available (9 slots)
**AND** equipment SHALL not overlap engine slots

#### Scenario: Equipment in torso with Clan XL engine
**GIVEN** BattleMech with XL engine (Clan)
**WHEN** placing equipment in side torso
**THEN** slots 0-1 contain engine (fixed)
**AND** slots 2-11 SHALL be available (10 slots)
**AND** Clan XL saves 1 slot per side torso vs IS XL

### Requirement: Arm Location Placement
Arm locations SHALL support weapons, ammunition, and physical weapons based on actuator configuration.

**Rationale**: Arms are ideal for weapons but actuator configuration affects available space.

**Priority**: Critical

#### Scenario: Equipment in arm with all actuators
**GIVEN** arm with shoulder, upper arm, lower arm, and hand actuators
**WHEN** placing equipment in arm
**THEN** slots 0-3 contain actuators (fixed for upper, conditionally-removable for lower/hand)
**AND** slots 4-11 SHALL be available (8 slots)
**AND** equipment SHALL fit in remaining space

#### Scenario: Equipment in arm without lower arm actuator
**GIVEN** arm with shoulder and upper arm actuators only
**WHEN** placing equipment in arm
**THEN** slots 0-1 contain actuators (fixed)
**AND** slots 2-11 SHALL be available (10 slots)
**AND** physical weapons (melee) SHALL be restricted (cannot use without hand)

#### Scenario: Large weapon in arm requires actuator removal
**GIVEN** PPC (3 slots) or Gauss Rifle (7 slots)
**WHEN** placing in arm with all actuators
**THEN** available slots = 8 (insufficient for Gauss)
**AND** user MUST remove lower arm and hand actuators
**AND** after removal, 10 slots available (sufficient for Gauss)
**AND** system SHOULD suggest actuator removal if needed

### Requirement: Leg Location Placement
Leg locations SHALL support jump jets and ammunition but generally prohibit weapons.

**Rationale**: Legs have limited space (2 available slots) and prohibit weapons except special cases.

**Priority**: High

#### Scenario: Jump jets in legs
**GIVEN** jump jets being placed
**WHEN** placing in leg location
**THEN** placement SHALL succeed if slots available
**AND** leg actuators occupy slots 0-3 (fixed)
**AND** slots 4-5 SHALL be available (2 slots)
**AND** up to 2 jump jets MAY be placed per leg

#### Scenario: Ammunition in legs
**GIVEN** ammunition being placed
**WHEN** placing in leg location
**THEN** placement SHALL succeed
**AND** ammunition placement in legs is legal
**AND** legs are vulnerable location for ammunition

#### Scenario: Weapons in legs prohibited
**GIVEN** standard weapon being placed
**WHEN** attempting placement in leg location
**THEN** placement SHALL fail
**AND** error SHALL indicate weapons not allowed in legs
**AND** exception: special leg-mounted weapons (future technology)

### Requirement: Rear-Facing Weapon Placement
Rear-facing weapons SHALL only be placeable in torso locations with rear designation.

**Rationale**: BattleTech rules restrict rear-facing weapons to torso locations for firing arc coverage.

**Priority**: High

#### Scenario: Rear-facing weapon in torso
**GIVEN** weapon with isRearMounted = true
**WHEN** placing in Center Torso, Left Torso, or Right Torso
**THEN** placement SHALL succeed if slots available
**AND** weapon SHALL be marked as rear-facing in slot occupancy
**AND** weapon fires in rear arc during combat

#### Scenario: Rear-facing weapon in non-torso location
**GIVEN** weapon with isRearMounted = true
**WHEN** attempting placement in Head, Arms, or Legs
**THEN** placement SHALL fail
**AND** error SHALL indicate "Rear-facing weapons only allowed in torso locations"
**AND** user MUST select torso location or change to forward-facing

#### Scenario: Multiple rear weapons per location
**GIVEN** multiple rear-facing weapons
**WHEN** placing in same torso location
**THEN** each weapon SHALL occupy its own slots
**AND** rear weapons share slot pool with forward-facing equipment
**AND** total equipment MUST NOT exceed location capacity

### Requirement: Location-Restricted Equipment
Equipment with location restrictions SHALL only be placeable in allowed locations.

**Rationale**: Some equipment has specific mounting requirements per BattleTech rules.

**Priority**: Critical

#### Scenario: Targeting Computer in torso only
**GIVEN** Targeting Computer
**WHEN** placing equipment
**THEN** placement SHALL only succeed in Center Torso, Left Torso, or Right Torso
**AND** placement SHALL fail in Head, Arms, or Legs
**AND** error SHALL indicate "Targeting Computer must be placed in torso"

#### Scenario: Jump jets in legs and torso only
**GIVEN** jump jets
**WHEN** placing equipment
**THEN** placement SHALL succeed in CT, LT, RT, LL, RL
**AND** placement SHALL fail in Head, Left Arm, or Right Arm
**AND** error SHALL indicate "Jump jets allowed in torso and legs only"

#### Scenario: Physical weapons in arms only
**GIVEN** physical weapon (Hatchet, Sword, Claws)
**WHEN** placing equipment
**THEN** placement SHALL only succeed in Left Arm or Right Arm
**AND** arm MUST have hand actuator present
**AND** placement SHALL fail if hand actuator removed
**AND** error SHALL indicate "Physical weapons require arm location with hand actuator"

### Requirement: Split Equipment Prohibition
Equipment requiring multiple slots SHALL NOT be split across different locations.

**Rationale**: BattleTech rules prohibit splitting equipment across locations (except engines/gyros which are system components).

**Priority**: Critical

#### Scenario: Multi-slot equipment in single location
**GIVEN** equipment requiring 3 critical slots
**WHEN** placing equipment
**THEN** all 3 slots MUST be in the same location
**AND** slots MUST be consecutive
**AND** split placement SHALL be impossible by design

#### Scenario: Split placement attempted
**GIVEN** equipment requiring 2 slots
**WHEN** validating placement across Left Arm and Left Torso
**THEN** validation SHALL fail
**AND** error SHALL indicate "Equipment cannot be split across locations"
**AND** user MUST select single location with sufficient consecutive slots

#### Scenario: System components vs equipment splitting
**GIVEN** XL engine splits across CT and side torsos
**WHEN** comparing to equipment placement rules
**THEN** engine/gyro splitting is valid (system component exception)
**AND** equipment splitting is invalid (strict prohibition)
**AND** difference SHALL be enforced in placement validation

### Requirement: Actuator Dependency Constraints
Arm-mounted equipment SHALL respect actuator configuration requirements.

**Rationale**: Some equipment requires or prohibits specific actuators; physical weapons need hands.

**Priority**: High

#### Scenario: Physical weapon requires hand actuator
**GIVEN** Hatchet, Sword, or Claw
**WHEN** placing in arm location
**THEN** arm MUST have hand actuator present
**AND** placement SHALL fail if hand removed
**AND** error SHALL indicate "Physical weapon requires hand actuator"

#### Scenario: Large weapon fits better without actuators
**GIVEN** Gauss Rifle (7 slots)
**WHEN** checking placement options in arm
**THEN** arm with all actuators has 8 available slots (fits)
**AND** arm without lower/hand has 10 available slots (more room)
**AND** system MAY suggest actuator removal for additional space

#### Scenario: Equipment placement forces actuator removal
**GIVEN** equipment requiring 9+ slots
**WHEN** placing in arm location
**THEN** user MUST remove lower arm and hand actuators
**AND** placement SHALL fail if actuators not removed
**AND** error SHALL indicate "Insufficient slots - remove actuators to free space"

### Requirement: Placement Validation
Equipment placement SHALL be validated for location compatibility, slot availability, and rule compliance.

**Rationale**: Validation ensures legal mech configurations and prevents construction rules violations.

**Priority**: Critical

#### Scenario: Valid placement
**GIVEN** equipment placement request
**WHEN** validating placement
**THEN** location MUST be valid mech location
**AND** location MUST not be restricted for this equipment
**AND** required slots MUST be available and consecutive
**AND** slots MUST not overlap system components or other equipment
**AND** validation SHALL return success with no errors

#### Scenario: Invalid location restriction
**GIVEN** Targeting Computer placement in Right Arm
**WHEN** validating placement
**THEN** validation SHALL fail
**AND** error SHALL indicate "Targeting Computer must be placed in torso"
**AND** suggested locations SHALL be listed

#### Scenario: Insufficient consecutive slots
**GIVEN** equipment requiring 4 consecutive slots
**WHEN** validating placement in location with scattered equipment
**THEN** validation SHALL fail if no 4 consecutive slots available
**AND** error SHALL indicate "Requires 4 consecutive empty slots"
**AND** error SHALL specify available consecutive slot groups

#### Scenario: Overlapping placement
**GIVEN** equipment placement overlapping existing equipment
**WHEN** validating placement
**THEN** validation SHALL fail
**AND** error SHALL indicate "Slots occupied by [component name]"
**AND** occupied slot indices SHALL be listed

### Requirement: Equipment Removal
Equipment SHALL be removable, freeing occupied slots for reallocation.

**Rationale**: Users must be able to reconfigure equipment during mech construction.

**Priority**: High

#### Scenario: Remove single-slot equipment
**GIVEN** single-slot equipment in location
**WHEN** removing equipment
**THEN** occupied slot SHALL become empty
**AND** slot SHALL be available for new equipment
**AND** equipment SHALL be removed from placement tracking

#### Scenario: Remove multi-slot equipment
**GIVEN** multi-slot equipment occupying 3 consecutive slots
**WHEN** removing equipment
**THEN** all 3 slots SHALL become empty
**AND** all 3 slots SHALL be available for new equipment
**AND** equipment SHALL be removed as single atomic operation

#### Scenario: Remove equipment with dependencies
**GIVEN** ammunition dependent on weapon present
**WHEN** removing the weapon
**THEN** removal SHOULD warn user about orphaned ammunition
**AND** user MAY choose to remove ammunition as well
**AND** removal SHALL proceed if user confirms

### Requirement: Placement Conflict Detection
The system SHALL detect and report placement conflicts during construction.

**Rationale**: Conflicts must be identified early to guide user toward valid configurations.

**Priority**: High

#### Scenario: Slot capacity conflict
**GIVEN** location with 3 available slots
**WHEN** attempting to place 5-slot equipment
**THEN** conflict SHALL be detected before placement
**AND** error SHALL indicate insufficient capacity
**AND** alternative locations with sufficient capacity SHALL be suggested

#### Scenario: Actuator conflict
**GIVEN** physical weapon requiring hand actuator
**WHEN** hand actuator is removed
**THEN** conflict SHALL be detected
**AND** error SHALL indicate "Physical weapon requires hand actuator"
**AND** user MUST re-add hand actuator or remove physical weapon

#### Scenario: Location restriction conflict
**GIVEN** equipment with location restriction
**WHEN** validating current placement after restriction change
**THEN** conflict SHALL be detected if location now invalid
**AND** equipment SHALL be marked as conflicted
**AND** user MUST relocate equipment to valid location

---

## Data Model Requirements

### Required Interfaces

```typescript
/**
 * Equipment placement record
 */
interface IEquipmentPlacement {
  /**
   * Unique placement identifier
   */
  readonly id: string;

  /**
   * Equipment being placed
   */
  readonly equipmentId: string;

  /**
   * Mech location where equipment is placed
   */
  readonly location: MechLocation;

  /**
   * Starting critical slot index (0-based)
   */
  readonly startSlot: number;

  /**
   * Ending critical slot index (inclusive)
   * For single-slot equipment, endSlot === startSlot
   */
  readonly endSlot: number;

  /**
   * Whether equipment is rear-facing (torso weapons only)
   */
  readonly isRearMounted: boolean;

  /**
   * Whether placement was manually assigned or auto-placed
   */
  readonly isManuallyPlaced: boolean;

  /**
   * Timestamp of placement
   */
  readonly placedAt?: number;
}

/**
 * Placement rule for equipment
 */
interface IPlacementRule {
  /**
   * Rule type classification
   */
  readonly type: 'location_restriction' | 'actuator_requirement' | 'slot_requirement' | 'tech_restriction' | 'custom';

  /**
   * Human-readable rule description
   */
  readonly description: string;

  /**
   * Validation function
   * @returns true if rule satisfied, false otherwise
   */
  readonly validate: (placement: IEquipmentPlacement, context: IPlacementContext) => boolean;

  /**
   * Error message if validation fails
   */
  readonly errorMessage: string;

  /**
   * Suggested fix for validation failure
   */
  readonly suggestion?: string;
}

/**
 * Placement constraint for specific equipment
 */
interface IPlacementConstraint {
  /**
   * Equipment this constraint applies to
   */
  readonly equipmentId: string;

  /**
   * Allowed locations (if restricted)
   * Undefined = no location restriction
   */
  readonly allowedLocations?: MechLocation[];

  /**
   * Prohibited locations (alternative to allowed)
   */
  readonly prohibitedLocations?: MechLocation[];

  /**
   * Requires hand actuator present (physical weapons)
   */
  readonly requiresHandActuator?: boolean;

  /**
   * Allows rear-facing placement (weapons only)
   */
  readonly allowsRearFacing?: boolean;

  /**
   * Custom validation rules
   */
  readonly customRules?: IPlacementRule[];
}

/**
 * Placement context for validation
 */
interface IPlacementContext {
  /**
   * Current mech configuration
   */
  readonly mech: IBattleMech;

  /**
   * Critical slot allocation map
   */
  readonly slotMap: ICriticalAllocationMap;

  /**
   * All current equipment placements
   */
  readonly placements: IEquipmentPlacement[];

  /**
   * Available slots per location
   */
  readonly availableSlots: Map<MechLocation, number[]>;

  /**
   * Actuator configuration per arm
   */
  readonly actuatorConfig: {
    readonly leftArm: IArmActuatorConfig;
    readonly rightArm: IArmActuatorConfig;
  };
}

/**
 * Arm actuator configuration
 */
interface IArmActuatorConfig {
  /**
   * Shoulder always present (cannot remove)
   */
  readonly hasShoulder: true;

  /**
   * Upper arm always present (cannot remove)
   */
  readonly hasUpperArm: true;

  /**
   * Lower arm actuator present
   */
  readonly hasLowerArm: boolean;

  /**
   * Hand actuator present (requires lower arm)
   */
  readonly hasHand: boolean;
}

/**
 * Placement validation result
 */
interface IPlacementValidationResult {
  /**
   * Whether placement is valid
   */
  readonly isValid: boolean;

  /**
   * Critical errors preventing placement
   */
  readonly errors: string[];

  /**
   * Warnings (placement allowed but unusual)
   */
  readonly warnings: string[];

  /**
   * Suggestions for fixing errors
   */
  readonly suggestions: string[];

  /**
   * Alternative valid locations (if current invalid)
   */
  readonly alternativeLocations?: MechLocation[];
}

/**
 * Equipment placement request
 */
interface IPlacementRequest {
  /**
   * Equipment to place
   */
  readonly equipment: IEquipment & IEntity;

  /**
   * Target location
   */
  readonly location: MechLocation;

  /**
   * Preferred starting slot (optional, auto-find if not specified)
   */
  readonly preferredStartSlot?: number;

  /**
   * Whether to mount rear-facing (weapons only)
   */
  readonly rearFacing?: boolean;

  /**
   * Whether to force placement (override warnings)
   */
  readonly force?: boolean;
}

/**
 * Equipment placement result
 */
interface IPlacementResult {
  /**
   * Whether placement succeeded
   */
  readonly success: boolean;

  /**
   * Created placement record (if successful)
   */
  readonly placement?: IEquipmentPlacement;

  /**
   * Validation result
   */
  readonly validation: IPlacementValidationResult;

  /**
   * Updated slot allocation map (if successful)
   */
  readonly updatedSlotMap?: ICriticalAllocationMap;
}
```

### Required Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `equipmentId` | `string` | Yes | Equipment identifier | Valid equipment ID | - |
| `location` | `MechLocation` | Yes | Placement location | 8 standard locations | - |
| `startSlot` | `number` | Yes | Starting slot index | 0 to (totalSlots - 1) | - |
| `endSlot` | `number` | Yes | Ending slot index | startSlot to (totalSlots - 1) | - |
| `isRearMounted` | `boolean` | Yes | Rear-facing flag | true/false | false |
| `isManuallyPlaced` | `boolean` | Yes | Manual vs auto placement | true/false | true |

### Type Constraints

- `startSlot` MUST be >= 0 and < location.totalSlots
- `endSlot` MUST be >= startSlot and < location.totalSlots
- `endSlot - startSlot + 1` MUST equal equipment.criticalSlots
- When `isRearMounted` is true, `location` MUST be Center Torso, Left Torso, or Right Torso
- `allowedLocations` and `prohibitedLocations` MUST NOT both be defined (mutually exclusive)
- When `requiresHandActuator` is true, `allowedLocations` MUST only include Left Arm or Right Arm
- `location` MUST be one of the 8 standard MechLocation values

---

## Validation Rules

### Validation: Location Restriction
**Rule**: Equipment must be placed in allowed location

**Severity**: Error

**Condition**:
```typescript
if (constraint.allowedLocations && !constraint.allowedLocations.includes(placement.location)) {
  return {
    isValid: false,
    errors: [`${equipment.name} cannot be placed in ${placement.location}. Allowed locations: ${constraint.allowedLocations.join(', ')}`],
    alternativeLocations: constraint.allowedLocations
  };
}
```

**Error Message**: "[Equipment] cannot be placed in [Location]. Allowed locations: [List]"

**User Action**: Select an allowed location from the provided list

### Validation: Slot Availability
**Rule**: Required slots must be available and consecutive

**Severity**: Error

**Condition**:
```typescript
const requiredSlots = placement.endSlot - placement.startSlot + 1;
const hasConsecutiveSlots = checkConsecutiveEmpty(slotMap[placement.location], placement.startSlot, requiredSlots);

if (!hasConsecutiveSlots) {
  return {
    isValid: false,
    errors: [`Insufficient consecutive slots in ${placement.location}. Required: ${requiredSlots} consecutive slots`]
  };
}
```

**Error Message**: "Insufficient consecutive slots in [Location]. Required: [N] consecutive slots"

**User Action**: Remove existing equipment to free consecutive slots or choose different location

### Validation: Rear-Facing Location
**Rule**: Rear-facing weapons only in torso locations

**Severity**: Error

**Condition**:
```typescript
const torsoLocations: MechLocation[] = ['Center Torso', 'Left Torso', 'Right Torso'];

if (placement.isRearMounted && !torsoLocations.includes(placement.location)) {
  return {
    isValid: false,
    errors: ['Rear-facing weapons can only be placed in torso locations (CT, LT, RT)'],
    alternativeLocations: torsoLocations
  };
}
```

**Error Message**: "Rear-facing weapons can only be placed in torso locations (CT, LT, RT)"

**User Action**: Select a torso location or change weapon to forward-facing

### Validation: Hand Actuator Requirement
**Rule**: Physical weapons require hand actuator

**Severity**: Error

**Condition**:
```typescript
if (constraint.requiresHandActuator) {
  const armLocation = placement.location; // 'Left Arm' or 'Right Arm'
  const actuatorConfig = context.actuatorConfig[armLocation === 'Left Arm' ? 'leftArm' : 'rightArm'];

  if (!actuatorConfig.hasHand) {
    return {
      isValid: false,
      errors: [`${equipment.name} requires hand actuator to be present in ${armLocation}`],
      suggestions: ['Add hand actuator to arm before placing physical weapon']
    };
  }
}
```

**Error Message**: "[Equipment] requires hand actuator to be present in [Arm]"

**User Action**: Add hand actuator to arm before placing physical weapon

### Validation: Slot Overlap
**Rule**: Equipment must not overlap existing components

**Severity**: Error

**Condition**:
```typescript
for (let i = placement.startSlot; i <= placement.endSlot; i++) {
  const slot = slotMap[placement.location][i];
  if (slot.type !== 'empty') {
    return {
      isValid: false,
      errors: [`Slot ${i} in ${placement.location} is occupied by ${slot.name}`]
    };
  }
}
```

**Error Message**: "Slot [N] in [Location] is occupied by [Component]"

**User Action**: Choose different starting slot or remove conflicting component

### Validation: Head Capacity
**Rule**: Head location severely limited by cockpit

**Severity**: Error

**Condition**:
```typescript
if (placement.location === 'Head') {
  const availableSlots = getAvailableHeadSlots(context.mech.cockpitType);
  // Standard cockpit: slot 3 only
  // Torso-mounted: slot 5 only

  if (equipment.criticalSlots > 1) {
    return {
      isValid: false,
      errors: ['Head location only allows single-slot equipment'],
      suggestions: ['Choose torso or arm location for multi-slot equipment']
    };
  }
}
```

**Error Message**: "Head location only allows single-slot equipment"

**User Action**: Choose torso or arm location for multi-slot equipment

---

## Tech Base Variants

### Inner Sphere Equipment Placement

**Characteristics**:
- XL engines reduce side torso slots (3 per side)
- Endo Steel/Ferro-Fibrous spread across multiple locations (14 slots total)
- Double heat sinks require 3 slots each (external)
- Generally more restricted equipment options

**Placement Impact**:
- Side torsos: 9 available slots with IS XL engine
- Must plan carefully for distributed equipment (Endo/Ferro)
- Equipment placement more constrained due to larger component sizes

### Clan Equipment Placement

**Characteristics**:
- XL engines reduce side torso slots (2 per side)
- Endo Steel/Ferro-Fibrous more compact (7 slots total)
- Double heat sinks require 2 slots each (external)
- Generally more compact equipment

**Placement Impact**:
- Side torsos: 10 available slots with Clan XL engine
- More flexible placement due to compact components
- Can fit more equipment in same space
- +1 slot advantage per side torso vs IS XL

### Mixed Tech Placement

**When unit tech base is Mixed**:
- Track tech base per equipment item
- Apply correct slot requirements based on equipment tech base
- Validate tech base compatibility per component
- Clan components generally preferred for slot efficiency

**Example**:
```typescript
// IS XL engine + Clan Double Heat Sinks
// Side torso: 12 total - 3 engine = 9 available
// Each Clan DHS: 2 slots (vs IS DHS: 3 slots)
// Can fit 4 Clan DHS (8 slots) vs 3 IS DHS (9 slots)
```

---

## Dependencies

### Defines
- **IEquipmentPlacement interface**: Placement tracking with location, slots, rear-facing
- **IPlacementRule interface**: Validation rules for equipment placement
- **IPlacementConstraint interface**: Equipment-specific placement restrictions
- **IPlacementValidationResult interface**: Validation feedback and suggestions
- **Placement validation rules**: Location restrictions, actuator requirements, rear-facing constraints
- **Equipment placement patterns**: General rules vs location-specific restrictions

### Depends On
- [Core Enumerations](../../phase-1-foundation/core-enumerations/spec.md) - Uses TechBase, RulesLevel, Era enums
- [Critical Slot Allocation](../../phase-2-construction/critical-slot-allocation/spec.md) - Uses MechLocation, ICriticalSlot, slot allocation logic
- **Location System**: Head, CT, LT, RT, LA, RA, LL, RL definitions and slot counts
- **Weapon System** (Phase 3): Weapon properties including rear-facing capability
- **Ammunition System** (Phase 3): Ammunition placement rules
- **Electronics System** (Phase 3): Electronics location restrictions (TC in torso)
- **Actuator System** (Phase 2): Arm actuator configuration for placement constraints

### Used By
- [Construction Rules Core](../../phase-2-construction/construction-rules-core/spec.md) - Validates equipment placement for legal mech
- **Equipment Configuration UI**: Displays placement options and validates user selections
- **Validation System**: Validates complete equipment placement
- **Auto-Placement System** (Future): Automatically places equipment optimally
- **Import/Export**: Serializes and deserializes equipment placements

### Construction Sequence
1. System components placed (engine, gyro, actuators, cockpit) - from Critical Slot Allocation
2. Determine available slots per location
3. User selects equipment to place
4. Validate location restrictions
5. Validate slot availability
6. Create placement record
7. Update slot allocation map
8. Validate complete configuration

---

## Implementation Notes

### Performance Considerations
- **Placement Validation**: Cache available slot indices per location to avoid repeated scans
- **Constraint Checking**: Build constraint map once during equipment loading, reuse for all validations
- **Slot Search**: Use binary search for finding consecutive empty slots in sorted arrays
- **Conflict Detection**: Maintain occupancy bitmap for O(1) slot availability checks

### Edge Cases
- **Head with Torso-Mounted Cockpit**: Only slot 5 available (slot 3 used by sensors)
- **Physical Weapons**: Must validate hand actuator presence before placement
- **Rear-Facing in CT**: Center Torso can have both forward and rear-facing weapons
- **Clan XL vs IS XL**: Different side torso slot consumption affects available space
- **Compact Gyro**: Frees extra CT slots, may allow more CT equipment

### Common Pitfalls
- **Pitfall**: Allowing rear-facing weapons in non-torso locations
  - **Solution**: Always validate location against torso-only constraint for rear-facing

- **Pitfall**: Not checking actuator configuration for physical weapons
  - **Solution**: Validate hand actuator presence for all physical weapons

- **Pitfall**: Allowing equipment to overlap system components
  - **Solution**: Check slot type is 'empty' before allowing placement

- **Pitfall**: Not accounting for cockpit type affecting head slots
  - **Solution**: Query cockpit type to determine available head slots

- **Pitfall**: Forgetting Clan vs IS slot count differences
  - **Solution**: Apply tech base-specific slot requirements based on equipment tech base

---

## Examples

### Example 1: Placing PPC in Right Arm

**Input**:
```typescript
const equipment: IEquipment = {
  id: 'ppc-1',
  name: 'PPC',
  weight: 7,
  criticalSlots: 3,
  // ... other properties
};

const request: IPlacementRequest = {
  equipment: equipment,
  location: 'Right Arm',
  // Auto-find starting slot
};
```

**Processing**:
```typescript
// Right Arm has actuators in slots 0-3
// Slots 4-11 available (8 slots)

// Validate location (no restriction for PPCs)
// Find 3 consecutive empty slots starting from slot 4
const placement: IEquipmentPlacement = {
  id: 'placement-ppc-1',
  equipmentId: 'ppc-1',
  location: 'Right Arm',
  startSlot: 4,
  endSlot: 6,  // 3 slots total
  isRearMounted: false,
  isManuallyPlaced: true
};

// Update slot map
slotMap['Right Arm'][4] = { name: 'PPC', type: 'weapon', equipmentId: 'ppc-1', ... };
slotMap['Right Arm'][5] = { name: 'PPC', type: 'weapon', equipmentId: 'ppc-1', ... };
slotMap['Right Arm'][6] = { name: 'PPC', type: 'weapon', equipmentId: 'ppc-1', ... };
```

**Output**:
```typescript
const result: IPlacementResult = {
  success: true,
  placement: placement,
  validation: {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: []
  },
  updatedSlotMap: slotMap
};

// Right Arm now has:
// Slots 0-3: Actuators
// Slots 4-6: PPC
// Slots 7-11: Empty (5 slots remaining)
```

### Example 2: Placing Rear-Facing Medium Laser in Left Torso

**Input**:
```typescript
const equipment: IEquipment = {
  id: 'ml-rear-1',
  name: 'Medium Laser',
  weight: 1,
  criticalSlots: 1
};

const request: IPlacementRequest = {
  equipment: equipment,
  location: 'Left Torso',
  rearFacing: true
};
```

**Processing**:
```typescript
// Validate rear-facing allowed in torso
const torsoLocations = ['Center Torso', 'Left Torso', 'Right Torso'];
if (!torsoLocations.includes('Left Torso')) {
  // Would fail, but Left Torso is valid
}

// Find first empty slot in Left Torso
// Assuming slots 0-11 all empty (standard engine)
const placement: IEquipmentPlacement = {
  id: 'placement-ml-rear-1',
  equipmentId: 'ml-rear-1',
  location: 'Left Torso',
  startSlot: 0,
  endSlot: 0,  // Single slot
  isRearMounted: true,  // Rear-facing!
  isManuallyPlaced: true
};

// Update slot map with rear designation
slotMap['Left Torso'][0] = {
  name: 'Medium Laser',
  type: 'weapon',
  equipmentId: 'ml-rear-1',
  slotType: 'rear',  // Rear-facing designation
  ...
};
```

**Output**:
```typescript
const result: IPlacementResult = {
  success: true,
  placement: placement,
  validation: {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: []
  },
  updatedSlotMap: slotMap
};

// Left Torso now has:
// Slot 0: Medium Laser (rear-facing)
// Slots 1-11: Empty
```

### Example 3: Failed Placement - Targeting Computer in Arm

**Input**:
```typescript
const equipment: IEquipment = {
  id: 'tc-1',
  name: 'Targeting Computer',
  weight: 1,
  criticalSlots: 1
};

const constraint: IPlacementConstraint = {
  equipmentId: 'tc-1',
  allowedLocations: ['Center Torso', 'Left Torso', 'Right Torso']
};

const request: IPlacementRequest = {
  equipment: equipment,
  location: 'Right Arm'  // Invalid!
};
```

**Processing**:
```typescript
// Validate location restriction
if (!constraint.allowedLocations.includes('Right Arm')) {
  return {
    success: false,
    validation: {
      isValid: false,
      errors: ['Targeting Computer cannot be placed in Right Arm. Allowed locations: Center Torso, Left Torso, Right Torso'],
      warnings: [],
      suggestions: ['Select a torso location for Targeting Computer'],
      alternativeLocations: ['Center Torso', 'Left Torso', 'Right Torso']
    }
  };
}
```

**Output**:
```typescript
const result: IPlacementResult = {
  success: false,
  placement: undefined,
  validation: {
    isValid: false,
    errors: ['Targeting Computer cannot be placed in Right Arm. Allowed locations: Center Torso, Left Torso, Right Torso'],
    warnings: [],
    suggestions: ['Select a torso location for Targeting Computer'],
    alternativeLocations: ['Center Torso', 'Left Torso', 'Right Torso']
  }
};
```

### Example 4: Placing Hatchet Requires Hand Actuator

**Input**:
```typescript
const equipment: IEquipment = {
  id: 'hatchet-1',
  name: 'Hatchet',
  weight: 3,  // 3 tons for 50-ton mech
  criticalSlots: 1
};

const constraint: IPlacementConstraint = {
  equipmentId: 'hatchet-1',
  allowedLocations: ['Left Arm', 'Right Arm'],
  requiresHandActuator: true
};

const request: IPlacementRequest = {
  equipment: equipment,
  location: 'Right Arm'
};

const actuatorConfig: IArmActuatorConfig = {
  hasShoulder: true,
  hasUpperArm: true,
  hasLowerArm: false,  // Removed!
  hasHand: false       // Removed!
};
```

**Processing**:
```typescript
// Validate hand actuator requirement
if (constraint.requiresHandActuator && !actuatorConfig.hasHand) {
  return {
    success: false,
    validation: {
      isValid: false,
      errors: ['Hatchet requires hand actuator to be present in Right Arm'],
      warnings: [],
      suggestions: ['Add hand actuator to Right Arm before placing Hatchet']
    }
  };
}
```

**Output**:
```typescript
const result: IPlacementResult = {
  success: false,
  placement: undefined,
  validation: {
    isValid: false,
    errors: ['Hatchet requires hand actuator to be present in Right Arm'],
    warnings: [],
    suggestions: ['Add hand actuator to Right Arm before placing Hatchet']
  }
};

// User must re-add hand actuator (and lower arm) before placing Hatchet
```

### Example 5: Gauss Rifle Placement with Actuator Consideration

**Input**:
```typescript
const equipment: IEquipment = {
  id: 'gauss-1',
  name: 'Gauss Rifle',
  weight: 15,
  criticalSlots: 7
};

const request: IPlacementRequest = {
  equipment: equipment,
  location: 'Right Arm'
};

// Initial arm state: all actuators present
// Slots 0-3: Actuators (shoulder, upper, lower, hand)
// Slots 4-11: Empty (8 slots available)
```

**Processing**:
```typescript
// Check if 7 consecutive slots available
const availableSlots = 8; // Slots 4-11

if (equipment.criticalSlots <= availableSlots) {
  // Fits! Place in slots 4-10
  const placement: IEquipmentPlacement = {
    id: 'placement-gauss-1',
    equipmentId: 'gauss-1',
    location: 'Right Arm',
    startSlot: 4,
    endSlot: 10,  // 7 slots total
    isRearMounted: false,
    isManuallyPlaced: true
  };

  return {
    success: true,
    placement: placement,
    validation: {
      isValid: true,
      errors: [],
      warnings: ['Consider removing lower arm and hand actuators for additional space'],
      suggestions: []
    }
  };
}
```

**Output**:
```typescript
const result: IPlacementResult = {
  success: true,
  placement: {
    id: 'placement-gauss-1',
    equipmentId: 'gauss-1',
    location: 'Right Arm',
    startSlot: 4,
    endSlot: 10,
    isRearMounted: false,
    isManuallyPlaced: true
  },
  validation: {
    isValid: true,
    errors: [],
    warnings: ['Consider removing lower arm and hand actuators for additional space'],
    suggestions: []
  },
  updatedSlotMap: slotMap
};

// Right Arm after placement:
// Slots 0-3: Actuators
// Slots 4-10: Gauss Rifle (7 slots)
// Slot 11: Empty (1 slot remaining)
```

---

## References

### Official BattleTech Rules
- **TechManual**: Pages 208-216 - Equipment Placement Rules
- **TechManual**: Page 213 - Weapon Placement Restrictions
- **TechManual**: Page 215 - Rear-Facing Weapons
- **Total Warfare**: Page 119 - Critical Hits and Equipment Location
- **TechManual**: Page 217 - Physical Weapons and Actuator Requirements

### Related Documentation
- Critical Slot Allocation Specification (defines slot structure and allocation)
- Weapon System Specification (defines weapon properties and rear-facing)
- Ammunition System Specification (defines ammunition placement rules)
- Electronics System Specification (defines electronics location restrictions)
- Actuator System Specification (defines actuator configurations)

---

## Changelog

### Version 1.0 (2025-11-28)
- Initial specification
- Defined equipment placement interfaces (IEquipmentPlacement, IPlacementRule, IPlacementConstraint)
- Specified general placement rules for equipment
- Defined location-specific restrictions (head, torso, arms, legs)
- Established rear-facing weapon placement rules
- Created actuator dependency constraints for physical weapons
- Defined placement validation rules
- Provided comprehensive examples for various placement scenarios
