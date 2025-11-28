# Critical Slot Allocation System Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2025-11-27
**Dependencies**: Core Entity Types, Physical Properties System, Engine System, Gyro System, Heat Sink System
**Affects**: Unit Construction, Equipment Placement, Validation System, UI Components

---

## Overview

### Purpose
Defines the critical slot allocation system for BattleMech construction, including location-specific slot counts, fixed component placement rules, placement order, validation logic, and allocation algorithms. This system ensures all components are correctly placed according to BattleTech construction rules.

### Scope
**In Scope:**
- BattleMech location definitions and slot counts
- Fixed system component placement (actuators, life support, sensors, cockpit)
- Engine and gyro placement rules and interaction
- Placement order and priority sequencing
- Slot allocation algorithms
- Location-specific restrictions
- Validation rules for slot usage
- Component removal and replacement logic
- Rear-facing weapon placement
- Split component handling
- Empty slot management

**Out of Scope:**
- Specific engine types and their slot requirements (covered in Engine System spec)
- Specific gyro types and their slot requirements (covered in Gyro System spec)
- Heat sink integration rules (covered in Heat Sink System spec)
- Equipment database and properties (covered in Equipment Database spec)
- Armor and structure slot allocation (part of advanced equipment)
- Combat effectiveness calculations (covered in Combat System spec)
- Vehicle or aerospace unit slot systems (future specs)

### Key Concepts
- **Location**: A physical section of a BattleMech (Head, Center Torso, Left/Right Torso, Left/Right Arm, Left/Right Leg)
- **Critical Slot**: A discrete space within a location that can hold equipment or system components
- **Fixed Component**: System component that must be in a specific location (e.g., shoulder actuators, life support)
- **Removable Component**: Equipment or conditionally-removable system component (e.g., hand actuator)
- **Placement Order**: Sequence in which components are allocated (engine → gyro → actuators → equipment)
- **Slot Occupancy**: Whether a slot is empty, occupied by system component, or occupied by equipment
- **Location Restriction**: Constraints on where specific equipment can be placed

---

## Requirements

### Requirement: Standard Location Definitions
All BattleMechs SHALL have exactly eight locations with standardized slot counts.

**Rationale**: BattleTech construction rules define fixed location structure for all standard BattleMechs.

**Priority**: Critical

#### Scenario: Location initialization
**GIVEN** a new BattleMech is being created
**WHEN** initializing critical slot structure
**THEN** it MUST have exactly 8 locations
**AND** locations MUST be: Head, Center Torso, Left Torso, Right Torso, Left Arm, Right Arm, Left Leg, Right Leg
**AND** each location MUST have correct slot count

#### Scenario: Slot count validation
**GIVEN** a BattleMech location
**WHEN** validating slot count
**THEN** Head MUST have exactly 6 slots
**AND** Center Torso MUST have exactly 12 slots
**AND** Left Torso MUST have exactly 12 slots
**AND** Right Torso MUST have exactly 12 slots
**AND** Left Arm MUST have exactly 12 slots
**AND** Right Arm MUST have exactly 12 slots
**AND** Left Leg MUST have exactly 6 slots
**AND** Right Leg MUST have exactly 6 slots

#### Scenario: Invalid location rejected
**GIVEN** a component allocation request
**WHEN** the location is not one of the 8 standard locations
**THEN** allocation SHALL fail
**AND** error SHALL indicate invalid location

### Requirement: Fixed Head Components
The Head location SHALL contain fixed life support, sensors, and cockpit components in specific slots.

**Rationale**: Head structure is standardized across all BattleMechs except for torso-mounted cockpit variants.

**Priority**: Critical

#### Scenario: Standard cockpit head layout
**GIVEN** a BattleMech with standard cockpit
**WHEN** initializing head slots
**THEN** slot 0 MUST contain Life Support (fixed)
**AND** slot 1 MUST contain Sensors (fixed)
**AND** slot 2 MUST contain Standard Cockpit (fixed)
**AND** slot 3 MUST be empty (available for equipment)
**AND** slot 4 MUST contain Sensors (fixed)
**AND** slot 5 MUST contain Life Support (fixed)

#### Scenario: Command console head layout
**GIVEN** a BattleMech with command console cockpit
**WHEN** initializing head slots
**THEN** slots 0, 1, 2, 5 SHALL follow standard layout
**AND** slot 3 MUST be empty (available for equipment)
**AND** slot 4 MUST contain Command Console (fixed)

#### Scenario: Torso-mounted cockpit head layout
**GIVEN** a BattleMech with torso-mounted cockpit
**WHEN** initializing head slots
**THEN** slot 0 MUST contain Life Support (fixed)
**AND** slots 1-4 MUST each contain Sensors (fixed)
**AND** slot 5 MUST be empty (available for equipment)
**AND** Center Torso slot 11 MUST contain Torso-Mounted Cockpit (fixed)

### Requirement: Engine Placement
Engine components SHALL be placed in Center Torso with specific slot allocation based on engine type.

**Rationale**: Engine placement follows strict BattleTech rules and varies by engine type.

**Priority**: Critical

#### Scenario: Standard engine placement
**GIVEN** a BattleMech with Standard/ICE/Fuel Cell engine
**WHEN** allocating engine slots
**THEN** 6 engine slots MUST be placed in Center Torso
**AND** slots 0-2 MUST contain Engine (first group)
**AND** slots must continue after gyro ends (second group of 3)
**AND** all engine slots MUST be fixed (non-removable)

#### Scenario: XL engine placement
**GIVEN** a BattleMech with XL engine
**WHEN** allocating engine slots
**THEN** 12 total engine slots MUST be allocated
**AND** 6 slots MUST be in Center Torso
**AND** 3 slots MUST be in Left Torso
**AND** 3 slots MUST be in Right Torso
**AND** Center Torso slots 0-2 MUST contain Engine
**AND** additional CT slots continue after gyro ends
**AND** all engine slots MUST be fixed

#### Scenario: Light engine placement
**GIVEN** a BattleMech with Light engine
**WHEN** allocating engine slots
**THEN** 8 total engine slots MUST be allocated
**AND** 6 slots MUST be in Center Torso
**AND** 2 slots MUST be in Left Torso OR Right Torso
**AND** placement follows same CT pattern as XL engine

### Requirement: Gyro Placement
Gyro components SHALL be placed in Center Torso immediately following first engine group.

**Rationale**: Gyro placement is standardized and its size affects where remaining engine slots are placed.

**Priority**: Critical

#### Scenario: Standard gyro placement
**GIVEN** a BattleMech with Standard gyro
**WHEN** allocating gyro slots
**THEN** 4 gyro slots MUST be placed in Center Torso
**AND** gyro MUST occupy slots 3-6
**AND** gyro MUST be placed after first engine group (slots 0-2)
**AND** gyro MUST be placed before second engine group
**AND** all gyro slots MUST be fixed

#### Scenario: XL gyro placement
**GIVEN** a BattleMech with XL gyro
**WHEN** allocating gyro slots
**THEN** 6 gyro slots MUST be placed in Center Torso
**AND** gyro MUST occupy slots 3-8
**AND** remaining engine slots MUST be placed at slots 9-11

#### Scenario: Compact gyro placement
**GIVEN** a BattleMech with Compact gyro
**WHEN** allocating gyro slots
**THEN** 2 gyro slots MUST be placed in Center Torso
**AND** gyro MUST occupy slots 3-4
**AND** second engine group starts at slot 5

### Requirement: Arm Actuator Placement
Arm locations SHALL contain shoulder and upper arm actuators (fixed), with conditionally-removable lower arm and hand actuators.

**Rationale**: Actuator placement follows BattleTech construction rules. Shoulder and upper arm are always present; lower arm and hand can be removed to free slots.

**Priority**: Critical

#### Scenario: Full arm actuators
**GIVEN** an arm location with all actuators
**WHEN** initializing arm slots
**THEN** slot 0 MUST contain Shoulder (fixed, non-removable)
**AND** slot 1 MUST contain Upper Arm Actuator (fixed, non-removable)
**AND** slot 2 MUST contain Lower Arm Actuator (conditionally-removable)
**AND** slot 3 MUST contain Hand Actuator (conditionally-removable)
**AND** slots 4-11 MUST be empty (available for equipment)

#### Scenario: Remove lower arm actuator
**GIVEN** an arm with lower arm and hand actuators
**WHEN** lower arm actuator is removed
**THEN** slot 2 MUST become empty
**AND** hand actuator MUST also be removed (slot 3 becomes empty)
**AND** validation SHALL enforce hand requires lower arm

#### Scenario: Remove hand actuator
**GIVEN** an arm with lower arm and hand actuators
**WHEN** hand actuator is removed
**THEN** slot 3 MUST become empty
**AND** lower arm actuator MUST remain in slot 2
**AND** hand MAY be re-added later if lower arm present

#### Scenario: No lower arm actuator
**GIVEN** an arm without lower arm actuator
**WHEN** validating hand actuator
**THEN** hand actuator MUST NOT be present
**AND** attempting to add hand MUST fail with error
**AND** error SHALL indicate lower arm required first

### Requirement: Leg Actuator Placement
Leg locations SHALL contain fixed hip, upper leg, lower leg, and foot actuators.

**Rationale**: Leg actuators are always present and cannot be removed according to standard construction rules.

**Priority**: Critical

#### Scenario: Leg initialization
**GIVEN** a leg location
**WHEN** initializing leg slots
**THEN** slot 0 MUST contain Hip (fixed, non-removable)
**AND** slot 1 MUST contain Upper Leg Actuator (fixed, non-removable)
**AND** slot 2 MUST contain Lower Leg Actuator (fixed, non-removable)
**AND** slot 3 MUST contain Foot Actuator (fixed, non-removable)
**AND** slots 4-5 MUST be empty (available for equipment)

#### Scenario: Leg actuator removal attempted
**GIVEN** a leg with standard actuators
**WHEN** attempting to remove any leg actuator
**THEN** removal SHALL fail
**AND** error SHALL indicate leg actuators are fixed

### Requirement: Placement Order
Components SHALL be allocated in specific order: engine, gyro, actuators, cockpit, then equipment.

**Rationale**: System components must be placed before equipment. Order ensures slots are correctly reserved.

**Priority**: Critical

#### Scenario: Initial construction sequence
**GIVEN** a new BattleMech being constructed
**WHEN** allocating critical slots
**THEN** engine MUST be placed first
**AND** gyro MUST be placed second (after engine)
**AND** actuators MUST be placed third
**AND** cockpit components MUST be placed fourth
**AND** equipment MAY be placed only after all system components
**AND** each step MUST complete before next begins

#### Scenario: Component change requires reallocation
**GIVEN** a BattleMech with existing slot allocations
**WHEN** engine type or gyro type changes
**THEN** all Center Torso slots MUST be recalculated
**AND** equipment in affected slots MUST be unallocated
**AND** placement order MUST be re-executed
**AND** user MUST be notified of displaced equipment

### Requirement: Slot Occupancy Validation
Each slot SHALL be occupied by at most one component.

**Rationale**: Physical slots cannot hold multiple components simultaneously.

**Priority**: Critical

#### Scenario: Single occupancy
**GIVEN** a critical slot
**WHEN** validating slot state
**THEN** slot MUST be either empty OR contain exactly one component
**AND** slot MUST NOT contain multiple components
**AND** component MUST have valid reference

#### Scenario: Equipment allocation to occupied slot
**GIVEN** a slot already containing a component
**WHEN** attempting to allocate equipment to that slot
**THEN** allocation SHALL fail
**AND** error SHALL indicate slot is occupied
**AND** current occupant SHALL be identified in error message

#### Scenario: Multi-slot equipment
**GIVEN** equipment requiring N critical slots
**WHEN** allocating the equipment
**THEN** N consecutive slots MUST be available
**AND** all N slots MUST be in the same location
**AND** equipment reference MUST span all N slots
**AND** each slot MUST track which multi-slot group it belongs to

### Requirement: Location Capacity Validation
Equipment SHALL NOT exceed available slots in a location.

**Rationale**: Physical limitation - cannot exceed slot count per location.

**Priority**: Critical

#### Scenario: Within capacity
**GIVEN** a location with available slots
**WHEN** allocating equipment
**THEN** allocation SHALL succeed if slots available >= equipment criticalSlots
**AND** remaining slots MUST be updated
**AND** occupied slot count MUST be tracked

#### Scenario: Exceeds capacity
**GIVEN** a location with M available slots
**WHEN** attempting to allocate equipment requiring N slots where N > M
**THEN** allocation SHALL fail
**AND** error SHALL indicate insufficient slots
**AND** error SHALL specify available (M) vs required (N)

#### Scenario: Exactly full
**GIVEN** a location with M available slots
**WHEN** allocating equipment requiring exactly M slots
**THEN** allocation SHALL succeed
**AND** location SHALL be marked as full
**AND** no further equipment allocations SHALL be allowed

### Requirement: Location-Specific Restrictions
Equipment with location restrictions SHALL only be placeable in allowed locations.

**Rationale**: Some equipment can only be mounted in specific locations per BattleTech rules.

**Priority**: High

#### Scenario: Equipment with allowed locations
**GIVEN** equipment with allowedLocations = ["Left Arm", "Right Arm"]
**WHEN** attempting allocation
**THEN** allocation to Left Arm or Right Arm SHALL succeed (if slots available)
**AND** allocation to any other location SHALL fail
**AND** error SHALL indicate location restriction

#### Scenario: Equipment without location restrictions
**GIVEN** equipment with no allowedLocations property
**WHEN** attempting allocation
**THEN** allocation MAY succeed to any location (if slots available)
**AND** only slot capacity SHALL be validated

#### Scenario: Head-restricted equipment
**GIVEN** equipment restricted to Head only
**WHEN** attempting allocation to Head
**THEN** allocation SHALL succeed only if slots available in Head
**AND** Head has only 1 available slot (slot 3) for standard cockpit

### Requirement: Rear-Facing Weapons
Torso locations SHALL support rear-facing weapon placement in designated rear slots.

**Rationale**: BattleTech rules allow rear-facing weapons in torso locations only.

**Priority**: High

#### Scenario: Rear weapon in torso
**GIVEN** a weapon marked as rear-facing
**WHEN** allocating to Left Torso, Right Torso, or Center Torso
**THEN** weapon MUST be allocated to rear-designated slots
**AND** rear slots MUST be tracked separately
**AND** rear weapon count MUST not exceed location limits

#### Scenario: Rear weapon in non-torso location
**GIVEN** a weapon marked as rear-facing
**WHEN** attempting allocation to Head, Arms, or Legs
**THEN** allocation SHALL fail
**AND** error SHALL indicate rear weapons only in torso

#### Scenario: Rear slot capacity
**GIVEN** a torso location
**WHEN** counting rear slots
**THEN** rear slots SHALL share the same physical slots as normal slots
**AND** rear designation SHALL be a property of the slot content
**AND** rear slot count SHALL be limited per BattleTech rules

### Requirement: Split Component Prohibition
Equipment requiring multiple slots SHALL NOT be split across different locations.

**Rationale**: BattleTech rules prohibit splitting components across locations (except engines and gyros which have special rules).

**Priority**: Critical

#### Scenario: Multi-slot equipment in single location
**GIVEN** equipment requiring 3 critical slots
**WHEN** allocating the equipment
**THEN** all 3 slots MUST be in the same location
**AND** slots MUST be consecutive
**AND** allocation SHALL fail if consecutive slots unavailable

#### Scenario: Split allocation attempted
**GIVEN** equipment requiring 2 slots
**WHEN** attempting to place 1 slot in Left Arm and 1 slot in Left Torso
**THEN** allocation SHALL fail
**AND** error SHALL indicate components cannot be split

#### Scenario: Engine special case
**GIVEN** an XL engine
**WHEN** allocating engine slots
**THEN** engine MAY span Center Torso and side torsos
**AND** this is the ONLY exception to split prohibition
**AND** exception SHALL be explicitly coded in engine placement logic

### Requirement: Component Removal
Removable equipment and conditionally-removable system components SHALL be removable, freeing their slots.

**Rationale**: Users must be able to reconfigure equipment and remove certain actuators.

**Priority**: High

#### Scenario: Remove equipment
**GIVEN** equipment allocated to location
**WHEN** user removes the equipment
**THEN** all occupied slots MUST become empty
**AND** slots MUST be available for new equipment
**AND** location available slot count MUST increase
**AND** equipment MUST be removed from inventory tracking

#### Scenario: Remove conditionally-removable actuator
**GIVEN** hand actuator in arm slot 3
**WHEN** user removes hand actuator
**THEN** slot 3 MUST become empty
**AND** lower arm actuator MAY remain (if present)
**AND** slot 3 becomes available for equipment

#### Scenario: Attempt to remove fixed component
**GIVEN** a fixed component (e.g., shoulder actuator, engine, gyro)
**WHEN** user attempts removal
**THEN** removal SHALL fail
**AND** error SHALL indicate component is fixed
**AND** slot state MUST NOT change

#### Scenario: Remove equipment dependencies
**GIVEN** equipment A requires equipment B to be present
**WHEN** removing equipment B
**THEN** removal SHALL fail
**AND** error SHALL indicate equipment A depends on B
**AND** user MUST remove A first, then B

### Requirement: Component Replacement
When system components change (engine type, gyro type), affected slots SHALL be recalculated.

**Rationale**: Changing engine or gyro type changes slot allocation pattern and may displace equipment.

**Priority**: High

#### Scenario: Engine type change
**GIVEN** a BattleMech with Standard engine and equipment in CT slots 7-9
**WHEN** engine type changes to XL engine
**THEN** engine allocation MUST be recalculated
**AND** equipment in conflicting slots MUST be unallocated
**AND** side torso engine slots MUST be allocated
**AND** user MUST be notified of displaced equipment

#### Scenario: Gyro type change
**GIVEN** a BattleMech with Standard gyro
**WHEN** gyro type changes to XL gyro
**THEN** gyro slots MUST expand from 4 to 6 slots
**AND** remaining engine slots MUST shift
**AND** equipment in affected slots MUST be unallocated
**AND** displaced equipment list MUST be provided to user

#### Scenario: Non-conflicting change
**GIVEN** a BattleMech with equipment not in system slots
**WHEN** changing system component type
**THEN** equipment MUST remain allocated if not in conflict
**AND** only conflicting equipment MUST be displaced

### Requirement: Empty Slot Tracking
All empty slots SHALL be tracked and available for equipment allocation.

**Rationale**: System must know which slots are available for allocation.

**Priority**: Critical

#### Scenario: Count empty slots
**GIVEN** a location with some allocated equipment
**WHEN** calculating available slots
**THEN** empty slot count MUST equal total slots minus occupied slots
**AND** each empty slot MUST be identifiable by index
**AND** empty slots MUST be marked as type 'empty'

#### Scenario: Find consecutive empty slots
**GIVEN** a location with scattered equipment
**WHEN** searching for N consecutive empty slots
**THEN** system MUST identify all groups of N+ consecutive empty slots
**AND** return start index and length for each group
**AND** prioritize lowest available index

#### Scenario: No empty slots
**GIVEN** a location completely full
**WHEN** attempting to allocate equipment
**THEN** allocation SHALL fail immediately
**AND** error SHALL indicate location full
**AND** suggest other locations if equipment allows

---

## Data Model Requirements

### Required Interfaces

```typescript
/**
 * BattleMech location identifier
 */
type MechLocation =
  | 'Head'
  | 'Center Torso'
  | 'Left Torso'
  | 'Right Torso'
  | 'Left Arm'
  | 'Right Arm'
  | 'Left Leg'
  | 'Right Leg';

/**
 * Slot type classification
 */
type SlotType = 'normal' | 'rear' | 'turret';

/**
 * Component type classification
 */
type ComponentType =
  | 'engine'
  | 'gyro'
  | 'cockpit'
  | 'actuator'
  | 'life_support'
  | 'sensors'
  | 'equipment'
  | 'weapon'
  | 'ammo'
  | 'heat_sink'
  | 'jump_jet'
  | 'structure'
  | 'armor'
  | 'empty';

/**
 * Individual critical slot
 */
interface ICriticalSlot {
  /**
   * Slot index within location (0-based)
   * Head: 0-5, Torso: 0-11, Arm: 0-11, Leg: 0-5
   */
  readonly index: number;

  /**
   * Component name or '-Empty-' for empty slots
   */
  readonly name: string;

  /**
   * Component type classification
   */
  readonly type: ComponentType;

  /**
   * Whether slot is fixed (cannot be removed by user)
   * Engine, gyro, shoulder/upper arm actuators are fixed
   */
  readonly isFixed: boolean;

  /**
   * Whether component was manually placed by user (vs auto-placed)
   */
  readonly isManuallyPlaced: boolean;

  /**
   * Whether component can be removed under certain conditions
   * E.g., hand actuator, lower arm actuator
   */
  readonly isConditionallyRemovable?: boolean;

  /**
   * For multi-slot components, ID linking related slots
   */
  readonly multiSlotGroupId?: string;

  /**
   * For multi-slot components, which slot in the group (0-based)
   */
  readonly multiSlotIndex?: number;

  /**
   * Slot designation (normal, rear-facing, turret)
   */
  readonly slotType?: SlotType;

  /**
   * Equipment reference if slot contains equipment
   */
  readonly equipmentId?: string;

  /**
   * Context menu options for UI (e.g., remove actuator)
   */
  readonly contextMenuOptions?: Array<{
    label: string;
    action: 'add' | 'remove' | 'replace';
    component: string;
    isEnabled: () => boolean;
  }>;
}

/**
 * Critical slot allocation map for entire mech
 * Maps location name to array of slots
 */
interface ICriticalAllocationMap {
  readonly [location: string]: ICriticalSlot[];
}

/**
 * Location configuration and metadata
 */
interface ILocationConfig {
  /**
   * Location identifier
   */
  readonly location: MechLocation;

  /**
   * Total slots in this location
   */
  readonly totalSlots: number;

  /**
   * Number of slots occupied
   */
  readonly occupiedSlots: number;

  /**
   * Number of slots available for equipment
   */
  readonly availableSlots: number;

  /**
   * Fixed system component slots (cannot be used for equipment)
   */
  readonly fixedSlots: number[];

  /**
   * Indices of empty slots available for allocation
   */
  readonly emptySlotIndices: number[];

  /**
   * Whether location supports rear-facing equipment
   */
  readonly supportsRear: boolean;

  /**
   * Number of rear slots available (if applicable)
   */
  readonly rearSlots?: number;
}

/**
 * Equipment allocation request
 */
interface IEquipmentAllocationRequest {
  /**
   * Equipment being allocated
   */
  readonly equipment: IPlaceableComponent & IEntity;

  /**
   * Target location
   */
  readonly location: MechLocation;

  /**
   * Starting slot index (optional, auto-find if not specified)
   */
  readonly startSlot?: number;

  /**
   * Whether equipment is rear-facing (torso only)
   */
  readonly isRear?: boolean;
}

/**
 * Equipment allocation result
 */
interface IEquipmentAllocationResult {
  /**
   * Whether allocation succeeded
   */
  readonly success: boolean;

  /**
   * Equipment ID if successful
   */
  readonly equipmentId?: string;

  /**
   * Location where allocated
   */
  readonly location?: MechLocation;

  /**
   * Slot indices occupied
   */
  readonly occupiedSlots?: number[];

  /**
   * Error message if failed
   */
  readonly error?: string;

  /**
   * Updated allocation map if successful
   */
  readonly updatedMap?: ICriticalAllocationMap;
}

/**
 * Component removal request
 */
interface IComponentRemovalRequest {
  /**
   * Location containing component
   */
  readonly location: MechLocation;

  /**
   * Slot index of component (for multi-slot, any slot in the group)
   */
  readonly slotIndex: number;
}

/**
 * Component removal result
 */
interface IComponentRemovalResult {
  /**
   * Whether removal succeeded
   */
  readonly success: boolean;

  /**
   * Removed component name
   */
  readonly removedComponent?: string;

  /**
   * Slots freed
   */
  readonly freedSlots?: number[];

  /**
   * Error message if failed
   */
  readonly error?: string;

  /**
   * Updated allocation map if successful
   */
  readonly updatedMap?: ICriticalAllocationMap;
}

/**
 * Slot validation result
 */
interface ISlotValidationResult {
  /**
   * Whether allocation is valid
   */
  readonly isValid: boolean;

  /**
   * Critical errors (prevent allocation)
   */
  readonly errors: string[];

  /**
   * Warnings (allow allocation but inform user)
   */
  readonly warnings: string[];

  /**
   * Information messages
   */
  readonly info?: string[];
}

/**
 * Location restrictions for equipment
 */
interface ILocationRestrictions {
  /**
   * Restriction type
   */
  readonly type: 'allowed_locations' | 'prohibited_locations' | 'custom';

  /**
   * Allowed locations (if type is 'allowed_locations')
   */
  readonly allowedLocations?: MechLocation[];

  /**
   * Prohibited locations (if type is 'prohibited_locations')
   */
  readonly prohibitedLocations?: MechLocation[];

  /**
   * Custom validator function
   */
  readonly validator?: (location: MechLocation, mech: unknown) => boolean;
}
```

### Required Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `location` | `MechLocation` | Yes | Location identifier | 8 standard locations | - |
| `totalSlots` | `number` | Yes | Total critical slots | 6 (head/leg), 12 (torso/arm) | - |
| `index` | `number` | Yes | Slot index | 0 to (totalSlots - 1) | - |
| `isFixed` | `boolean` | Yes | Whether slot is fixed | true/false | false |
| `type` | `ComponentType` | Yes | Component classification | See ComponentType | 'empty' |
| `name` | `string` | Yes | Component name | Any string, '-Empty-' for empty | '-Empty-' |

### Type Constraints

- `index` MUST be >= 0 and < totalSlots for the location
- `isFixed` MUST be true for engine, gyro, shoulder, upper arm, leg actuators
- `isFixed` MUST be false for equipment and conditionally-removable actuators
- `multiSlotGroupId` MUST be identical across all slots of multi-slot component
- `multiSlotIndex` MUST be 0 to (componentSlots - 1)
- When `slotType` is 'rear', location MUST be torso
- `location` MUST be one of the 8 standard MechLocation values

---

## Allocation Algorithm

### Slot Allocation Algorithm

**Algorithm**: Find and allocate consecutive empty slots for equipment

```
function allocateEquipment(request: IEquipmentAllocationRequest, map: ICriticalAllocationMap): IEquipmentAllocationResult
  equipment = request.equipment
  location = request.location
  requiredSlots = equipment.criticalSlots

  // Validate location restriction
  if equipment has location restrictions
    if location not in allowed locations
      return failure("Equipment cannot be placed in " + location)

  // Get location slots
  locationSlots = map[location]
  if locationSlots is null
    return failure("Invalid location: " + location)

  // Check if rear-facing is valid
  if request.isRear
    if location not in [Center Torso, Left Torso, Right Torso]
      return failure("Rear-facing equipment only allowed in torso")

  // Find consecutive empty slots
  if request.startSlot is specified
    startIndex = request.startSlot
    if not hasConsecutiveEmptySlots(locationSlots, startIndex, requiredSlots)
      return failure("Insufficient consecutive slots at index " + startIndex)
  else
    startIndex = findFirstConsecutiveEmptySlots(locationSlots, requiredSlots)
    if startIndex is null
      return failure("Insufficient consecutive empty slots in " + location)

  // Generate equipment ID
  equipmentId = generateUniqueId()
  groupId = generateUniqueId()

  // Allocate slots
  for i from 0 to (requiredSlots - 1)
    slotIndex = startIndex + i
    locationSlots[slotIndex] = {
      index: slotIndex,
      name: equipment.name,
      type: determineComponentType(equipment),
      isFixed: false,
      isManuallyPlaced: true,
      multiSlotGroupId: requiredSlots > 1 ? groupId : undefined,
      multiSlotIndex: requiredSlots > 1 ? i : undefined,
      slotType: request.isRear ? 'rear' : 'normal',
      equipmentId: equipmentId
    }

  return success({
    equipmentId: equipmentId,
    location: location,
    occupiedSlots: [startIndex to startIndex + requiredSlots - 1],
    updatedMap: map
  })
```

**Helper Function**: Find consecutive empty slots

```
function findFirstConsecutiveEmptySlots(slots: ICriticalSlot[], requiredSlots: number): number | null
  for startIndex from 0 to (slots.length - requiredSlots)
    allEmpty = true
    for i from 0 to (requiredSlots - 1)
      if slots[startIndex + i].type !== 'empty'
        allEmpty = false
        break
    if allEmpty
      return startIndex
  return null
```

### Placement Order Algorithm

**Algorithm**: Initialize critical slots in correct sequence

```
function initializeCriticalSlots(systemComponents, mechTonnage): ICriticalAllocationMap
  // Step 1: Create empty slot structure
  map = createEmptySlotMap()

  // Step 2: Place engine (highest priority, determines layout)
  placeEngine(map, systemComponents.engine.type, systemComponents.gyro.type)

  // Step 3: Place gyro (must be after first engine group)
  placeGyro(map, systemComponents.gyro.type)

  // Step 4: Place actuators
  placeArmActuators(map, systemComponents.leftArmActuators, systemComponents.rightArmActuators)
  placeLegActuators(map)

  // Step 5: Place cockpit and head components
  placeCockpitComponents(map, systemComponents.cockpit.type)

  // Step 6: Equipment is NOT placed automatically - user places manually

  return map
```

---

## Validation Rules

### Validation: Slot Capacity
**Rule**: Location must have sufficient empty slots for equipment

**Severity**: Error

**Condition**:
```typescript
if (equipmentRequiredSlots > locationAvailableSlots) {
  // invalid - insufficient space
  return {
    isValid: false,
    errors: [`Insufficient slots in ${location}. Required: ${equipmentRequiredSlots}, Available: ${locationAvailableSlots}`]
  };
}
```

**Error Message**: "Insufficient slots in [Location]. Required: [N], Available: [M]"

**User Action**: Choose different location or remove existing equipment to free slots

### Validation: Consecutive Slots
**Rule**: Multi-slot equipment must occupy consecutive slots

**Severity**: Error

**Condition**:
```typescript
function validateConsecutiveSlots(slots: ICriticalSlot[], startIndex: number, count: number): boolean {
  for (let i = 0; i < count; i++) {
    if (slots[startIndex + i].type !== 'empty') {
      return false; // slot occupied or non-consecutive
    }
  }
  return true;
}
```

**Error Message**: "Equipment requires [N] consecutive empty slots"

**User Action**: Remove equipment blocking consecutive slots or choose different location

### Validation: Location Restriction
**Rule**: Equipment must be placed in allowed location

**Severity**: Error

**Condition**:
```typescript
if (equipment.allowedLocations && !equipment.allowedLocations.includes(location)) {
  return {
    isValid: false,
    errors: [`${equipment.name} cannot be placed in ${location}. Allowed: ${equipment.allowedLocations.join(', ')}`]
  };
}
```

**Error Message**: "[Equipment] cannot be placed in [Location]. Allowed: [List]"

**User Action**: Select an allowed location from the list

### Validation: Fixed Component Removal
**Rule**: Fixed components cannot be removed

**Severity**: Error

**Condition**:
```typescript
if (slot.isFixed && !slot.isConditionallyRemovable) {
  return {
    isValid: false,
    errors: [`${slot.name} is a fixed component and cannot be removed`]
  };
}
```

**Error Message**: "[Component] is a fixed component and cannot be removed"

**User Action**: Cannot remove - component is required by construction rules

### Validation: Actuator Dependency
**Rule**: Hand actuator requires lower arm actuator

**Severity**: Error

**Condition**:
```typescript
if (slot.name === 'Hand Actuator' && !hasLowerArmActuator(location)) {
  return {
    isValid: false,
    errors: ['Hand Actuator requires Lower Arm Actuator to be present']
  };
}
```

**Error Message**: "Hand Actuator requires Lower Arm Actuator to be present"

**User Action**: Add Lower Arm Actuator before adding Hand Actuator

### Validation: Rear-Facing Location
**Rule**: Rear-facing equipment only in torso locations

**Severity**: Error

**Condition**:
```typescript
const torsoLocations = ['Center Torso', 'Left Torso', 'Right Torso'];
if (isRearFacing && !torsoLocations.includes(location)) {
  return {
    isValid: false,
    errors: ['Rear-facing equipment can only be placed in torso locations']
  };
}
```

**Error Message**: "Rear-facing equipment can only be placed in torso locations"

**User Action**: Select a torso location or change equipment to forward-facing

---

## Technology Base Variants

See [Tech Base Variants Reference](../tech-base-variants-reference/spec.md) for general Inner Sphere vs Clan differences affecting slot allocation patterns.

### Slot Allocation Tech Base Differences

**Engine Slot Variations**:
- Standard engines: No difference (6 CT slots for both)
- XL engines: IS requires 3 side torso slots per side, Clan requires 2
- Light engines: IS-only, requires 2 side torso slots
- Impact: Clan XL saves 2 total slots vs IS XL

**Heat Sink Slot Variations**:
- Engine-integrated: No difference (0 slots for both)
- External Double Heat Sinks: IS requires 3 slots, Clan requires 2
- Impact: Each external Clan DHS saves 1 slot vs IS

**Distributed Component Slots**:
- Endo Steel: IS 14 slots, Clan 7 slots
- Ferro-Fibrous: IS 14 slots, Clan 7 slots
- Impact: Clan saves 7 slots per advanced structure/armor type

**Net Slot Impact**:
Typical advanced Clan mech vs IS equivalent:
- XL Engine: +2 slots (Clan advantage)
- Endo Steel: +7 slots (Clan advantage)
- Ferro-Fibrous: +7 slots (Clan advantage)
- 5× External DHS: +5 slots (Clan advantage)
- Total: ~21 more available slots for Clan configuration

**Mixed Tech Slot Planning**:
- Choose Clan variants for advanced equipment to maximize available slots
- Track tech base per component for correct slot allocation
- Validate slot capacity remains available after all allocations


---

## Dependencies

### Defines
- **MechLocation type**: 8 standard locations (Head, CT, LT, RT, LA, RA, LL, RL)
- **Slot counts**: Head/Legs 6, Torsos/Arms 12
- **ComponentType enum**: Classifications (engine, gyro, cockpit, actuator, equipment, weapon, etc.)
- **SlotType enum**: Designations (normal, rear, turret)
- **ICriticalSlot interface**: Individual slot specification with index, name, type, isFixed, etc.
- **ICriticalAllocationMap interface**: Maps locations to slot arrays
- **Fixed component placement rules**: Actuators, life support, sensors placement patterns
- **Placement order algorithm**: Engine → Gyro → Actuators → Cockpit → Equipment
- **Validation rules**: Single occupancy, capacity limits, consecutive slots for multi-slot items

### Depends On
- [Core Entity Types](../../phase-1-foundation/core-entity-types/spec.md) - Uses IEntity, IPlaceableComponent, IWeightedComponent, ISlottedComponent
- [Physical Properties System](../../phase-1-foundation/physical-properties-system/spec.md) - Uses weight and criticalSlots properties
- [Engine System](../engine-system/spec.md) - Engine type determines CT and side torso slot allocation
- [Gyro System](../gyro-system/spec.md) - Gyro type determines CT slot allocation and affects engine placement
- [Heat Sink System](../heat-sink-system/spec.md) - Engine-integrated heat sinks occupy CT slots near engine

### Used By
- [Construction Rules Core](../construction-rules-core/spec.md) - Validates slot allocation for legal mech
- **Equipment Placement UI**: Displays available slots and validates placement
- **Validation System**: Validates complete slot allocation
- **Import/Export**: Serializes and deserializes slot allocations
- **Auto-Allocation**: Automatically places equipment in optimal locations

### Construction Sequence
1. Initialize locations (8 locations with correct slot counts)
2. Place engine (CT and side torsos for XL/Light)
3. Place gyro (CT after first engine group)
4. Place actuators (arms and legs)
5. Place cockpit components (head and CT)
6. User equipment placement (manual allocation to empty slots)
7. Validation (validate complete allocation before finalizing)

---

## Implementation Notes

### Performance Considerations
- **Slot Lookup**: Use direct array indexing for O(1) slot access
- **Empty Slot Search**: Cache empty slot indices to avoid repeated scans
- **Validation**: Run validation only on affected location, not entire mech
- **Multi-Slot Components**: Use multiSlotGroupId for fast lookup of related slots

### Edge Cases
- **Torso-Mounted Cockpit**: Head has only 1 available slot (slot 5), CT has cockpit in slot 11
- **XL Gyro + XL Engine**: Engine slots must avoid gyro slots 3-8, use 0-2 and 9-11
- **Compact Gyro**: Frees extra CT slots (gyro only uses slots 3-4)
- **No Actuators**: Arms without lower arm/hand free slots 2-3 for equipment
- **Head Equipment**: Only slot 3 available for standard cockpit (or slot 5 for torso-mounted)

### Common Pitfalls
- **Pitfall**: Forgetting to check consecutive slots for multi-slot equipment
  - **Solution**: Always use findConsecutiveEmptySlots before allocation

- **Pitfall**: Not updating slot counts after removal
  - **Solution**: Recalculate availableSlots after every add/remove operation

- **Pitfall**: Allowing rear-facing equipment in non-torso locations
  - **Solution**: Validate location type before setting slotType to 'rear'

- **Pitfall**: Not handling multi-slot removal properly
  - **Solution**: When removing any slot of multi-slot component, remove entire group using multiSlotGroupId

- **Pitfall**: Not recalculating on engine/gyro change
  - **Solution**: Trigger full recalculation when system components change

---

## Examples

### Example 1: Standard BattleMech Initialization

**Input**:
```typescript
const systemComponents: SystemComponents = {
  engine: { type: 'Standard', rating: 300 },
  gyro: { type: 'Standard' },
  cockpit: { type: 'Standard' },
  leftArmActuators: { hasLowerArm: true, hasHand: true },
  rightArmActuators: { hasLowerArm: true, hasHand: true }
};
const tonnage = 75;
```

**Processing**:
```typescript
// Step 1: Create empty structure
const map = {};
for (const [location, count] of Object.entries(LOCATION_SLOT_COUNTS)) {
  map[location] = Array(count).fill(null).map((_, i) => ({
    index: i,
    name: '-Empty-',
    type: 'empty',
    isFixed: false,
    isManuallyPlaced: false
  }));
}

// Step 2: Place Standard Engine (6 slots in CT)
// Slots 0-2: Engine
// Slots 3-6: Gyro (placed next)
// Slots 7-9: Engine
map['Center Torso'][0] = { index: 0, name: 'Engine', type: 'engine', isFixed: true };
map['Center Torso'][1] = { index: 1, name: 'Engine', type: 'engine', isFixed: true };
map['Center Torso'][2] = { index: 2, name: 'Engine', type: 'engine', isFixed: true };
map['Center Torso'][7] = { index: 7, name: 'Engine', type: 'engine', isFixed: true };
map['Center Torso'][8] = { index: 8, name: 'Engine', type: 'engine', isFixed: true };
map['Center Torso'][9] = { index: 9, name: 'Engine', type: 'engine', isFixed: true };

// Step 3: Place Standard Gyro (4 slots in CT)
map['Center Torso'][3] = { index: 3, name: 'Gyro', type: 'gyro', isFixed: true };
map['Center Torso'][4] = { index: 4, name: 'Gyro', type: 'gyro', isFixed: true };
map['Center Torso'][5] = { index: 5, name: 'Gyro', type: 'gyro', isFixed: true };
map['Center Torso'][6] = { index: 6, name: 'Gyro', type: 'gyro', isFixed: true };

// Step 4: Place Arm Actuators
map['Left Arm'][0] = { index: 0, name: 'Shoulder', type: 'actuator', isFixed: true };
map['Left Arm'][1] = { index: 1, name: 'Upper Arm Actuator', type: 'actuator', isFixed: true };
map['Left Arm'][2] = { index: 2, name: 'Lower Arm Actuator', type: 'actuator', isFixed: false, isConditionallyRemovable: true };
map['Left Arm'][3] = { index: 3, name: 'Hand Actuator', type: 'actuator', isFixed: false, isConditionallyRemovable: true };
// Repeat for Right Arm

// Step 5: Place Leg Actuators
map['Left Leg'][0] = { index: 0, name: 'Hip', type: 'actuator', isFixed: true };
map['Left Leg'][1] = { index: 1, name: 'Upper Leg Actuator', type: 'actuator', isFixed: true };
map['Left Leg'][2] = { index: 2, name: 'Lower Leg Actuator', type: 'actuator', isFixed: true };
map['Left Leg'][3] = { index: 3, name: 'Foot Actuator', type: 'actuator', isFixed: true };
// Repeat for Right Leg

// Step 6: Place Cockpit Components
map['Head'][0] = { index: 0, name: 'Life Support', type: 'life_support', isFixed: true };
map['Head'][1] = { index: 1, name: 'Sensors', type: 'sensors', isFixed: true };
map['Head'][2] = { index: 2, name: 'Standard Cockpit', type: 'cockpit', isFixed: true };
map['Head'][3] = { index: 3, name: '-Empty-', type: 'empty', isFixed: false }; // Available
map['Head'][4] = { index: 4, name: 'Sensors', type: 'sensors', isFixed: true };
map['Head'][5] = { index: 5, name: 'Life Support', type: 'life_support', isFixed: true };
```

**Output**:
```typescript
// Center Torso: 10 slots used (6 engine + 4 gyro), 2 available (slots 10-11)
// Head: 5 slots used, 1 available (slot 3)
// Left/Right Torso: 0 slots used, 12 available each
// Left/Right Arm: 4 slots used, 8 available each (slots 4-11)
// Left/Right Leg: 4 slots used, 2 available each (slots 4-5)

const locationConfigs: ILocationConfig[] = [
  {
    location: 'Head',
    totalSlots: 6,
    occupiedSlots: 5,
    availableSlots: 1,
    fixedSlots: [0, 1, 2, 4, 5],
    emptySlotIndices: [3],
    supportsRear: false
  },
  {
    location: 'Center Torso',
    totalSlots: 12,
    occupiedSlots: 10,
    availableSlots: 2,
    fixedSlots: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    emptySlotIndices: [10, 11],
    supportsRear: true,
    rearSlots: 2
  },
  // ... other locations
];
```

### Example 2: Allocating Multi-Slot Equipment

**Input**:
```typescript
const equipment: IPlaceableComponent & IEntity = {
  id: 'ppc-1',
  name: 'PPC',
  weight: 7,
  criticalSlots: 3
};

const request: IEquipmentAllocationRequest = {
  equipment: equipment,
  location: 'Right Arm'
  // No startSlot - auto-find
};
```

**Processing**:
```typescript
// Right Arm currently has:
// Slots 0-3: Actuators (fixed)
// Slots 4-11: Empty

// Find 3 consecutive empty slots starting from lowest index
const startIndex = findFirstConsecutiveEmptySlots(map['Right Arm'], 3);
// Returns 4 (first group of 3+ consecutive empty slots)

// Allocate PPC to slots 4, 5, 6
const groupId = 'ppc-1-group';
map['Right Arm'][4] = {
  index: 4,
  name: 'PPC',
  type: 'weapon',
  isFixed: false,
  isManuallyPlaced: true,
  multiSlotGroupId: groupId,
  multiSlotIndex: 0,
  equipmentId: 'ppc-1'
};
map['Right Arm'][5] = {
  index: 5,
  name: 'PPC',
  type: 'weapon',
  isFixed: false,
  isManuallyPlaced: true,
  multiSlotGroupId: groupId,
  multiSlotIndex: 1,
  equipmentId: 'ppc-1'
};
map['Right Arm'][6] = {
  index: 6,
  name: 'PPC',
  type: 'weapon',
  isFixed: false,
  isManuallyPlaced: true,
  multiSlotGroupId: groupId,
  multiSlotIndex: 2,
  equipmentId: 'ppc-1'
};
```

**Output**:
```typescript
const result: IEquipmentAllocationResult = {
  success: true,
  equipmentId: 'ppc-1',
  location: 'Right Arm',
  occupiedSlots: [4, 5, 6],
  updatedMap: map
};

// Right Arm now has:
// Slots 0-6: Occupied (4 actuators + 3 PPC)
// Slots 7-11: Available (5 slots remaining)
```

### Example 3: XL Engine and XL Gyro Interaction

**Input**:
```typescript
const systemComponents: SystemComponents = {
  engine: { type: 'XL', rating: 300 },
  gyro: { type: 'XL' },
  // ... other components
};
```

**Processing**:
```typescript
// XL Gyro uses 6 slots (3-8)
// XL Engine uses 12 slots total: 6 CT + 3 LT + 3 RT
// CT slots for XL engine must avoid gyro slots 3-8

// Place first engine group
map['Center Torso'][0] = { index: 0, name: 'Engine', type: 'engine', isFixed: true };
map['Center Torso'][1] = { index: 1, name: 'Engine', type: 'engine', isFixed: true };
map['Center Torso'][2] = { index: 2, name: 'Engine', type: 'engine', isFixed: true };

// Place XL Gyro
map['Center Torso'][3] = { index: 3, name: 'Gyro', type: 'gyro', isFixed: true };
map['Center Torso'][4] = { index: 4, name: 'Gyro', type: 'gyro', isFixed: true };
map['Center Torso'][5] = { index: 5, name: 'Gyro', type: 'gyro', isFixed: true };
map['Center Torso'][6] = { index: 6, name: 'Gyro', type: 'gyro', isFixed: true };
map['Center Torso'][7] = { index: 7, name: 'Gyro', type: 'gyro', isFixed: true };
map['Center Torso'][8] = { index: 8, name: 'Gyro', type: 'gyro', isFixed: true };

// Place second engine group after XL gyro (slots 9-11)
map['Center Torso'][9] = { index: 9, name: 'Engine', type: 'engine', isFixed: true };
map['Center Torso'][10] = { index: 10, name: 'Engine', type: 'engine', isFixed: true };
map['Center Torso'][11] = { index: 11, name: 'Engine', type: 'engine', isFixed: true };

// Place side torso engine slots
map['Left Torso'][0] = { index: 0, name: 'Engine', type: 'engine', isFixed: true };
map['Left Torso'][1] = { index: 1, name: 'Engine', type: 'engine', isFixed: true };
map['Left Torso'][2] = { index: 2, name: 'Engine', type: 'engine', isFixed: true };

map['Right Torso'][0] = { index: 0, name: 'Engine', type: 'engine', isFixed: true };
map['Right Torso'][1] = { index: 1, name: 'Engine', type: 'engine', isFixed: true };
map['Right Torso'][2] = { index: 2, name: 'Engine', type: 'engine', isFixed: true };
```

**Output**:
```typescript
// Center Torso: 12 slots used (6 engine + 6 gyro), 0 available
// Left Torso: 3 slots used (engine), 9 available
// Right Torso: 3 slots used (engine), 9 available
```

### Example 4: Removing Lower Arm Actuator

**Input**:
```typescript
const removalRequest: IComponentRemovalRequest = {
  location: 'Left Arm',
  slotIndex: 2  // Lower Arm Actuator
};
```

**Processing**:
```typescript
// Check if slot 2 is removable
const slot = map['Left Arm'][2];
if (slot.isFixed && !slot.isConditionallyRemovable) {
  return { success: false, error: 'Component is fixed and cannot be removed' };
}

// Lower arm is conditionally removable
// Removing lower arm also removes hand (dependency)
const removedSlots = [];

// Remove lower arm
map['Left Arm'][2] = {
  index: 2,
  name: '-Empty-',
  type: 'empty',
  isFixed: false,
  isManuallyPlaced: false
};
removedSlots.push(2);

// Remove hand if present
if (map['Left Arm'][3].name === 'Hand Actuator') {
  map['Left Arm'][3] = {
    index: 3,
    name: '-Empty-',
    type: 'empty',
    isFixed: false,
    isManuallyPlaced: false
  };
  removedSlots.push(3);
}
```

**Output**:
```typescript
const result: IComponentRemovalResult = {
  success: true,
  removedComponent: 'Lower Arm Actuator (and Hand Actuator)',
  freedSlots: [2, 3],
  updatedMap: map
};

// Left Arm now has:
// Slots 0-1: Shoulder, Upper Arm (fixed)
// Slots 2-11: Empty (available for equipment - 10 slots total)
```

---

## References

### Official BattleTech Rules
- **TechManual**: Pages 24-34 - Critical Hit Tables and Slot Allocation
- **TechManual**: Page 28 - BattleMech Critical Hits Table
- **TechManual**: Page 208 - Engine Slot Requirements
- **TechManual**: Page 212 - Gyro Slot Requirements
- **Total Warfare**: Page 44 - BattleMech Record Sheet Reference
- **Total Warfare**: Page 117 - Critical Hits and Location Structure

### Related Documentation
- Engine System Specification (defines engine slot requirements)
- Gyro System Specification (defines gyro slot requirements)
- Heat Sink System Specification (defines engine-integrated heat sink placement)
- Core Entity Types Specification (defines IPlaceableComponent)
- Physical Properties System Specification (defines weight and criticalSlots)

---

## Changelog

### Version 1.0 (2025-11-27)
- Initial specification
- Defined 8 standard BattleMech locations with slot counts
- Specified fixed component placement rules (actuators, cockpit, life support, sensors)
- Defined engine and gyro placement interaction
- Established placement order and priority
- Created allocation and removal algorithms
- Defined validation rules for capacity, location restrictions, and dependencies
- Provided comprehensive examples for standard initialization, equipment allocation, XL engine/gyro, and actuator removal
