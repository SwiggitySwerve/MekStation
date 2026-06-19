/**
 * Critical Slot Allocation Types
 *
 * Defines critical slot counts and allocation rules.
 *
 * @spec openspec/specs/critical-slot-allocation/spec.md
 */

/**
 * Mech locations for critical slot allocation
 *
 * Includes all locations across all mech configurations:
 * - Biped: HEAD, CT, LT, RT, LA, RA, LL, RL (8 locations)
 * - Quad: HEAD, CT, LT, RT, FLL, FRL, RLL, RRL (8 locations)
 * - Tripod: HEAD, CT, LT, RT, LA, RA, LL, RL, CL (9 locations)
 * - LAM Mech: Same as Biped
 * - LAM Fighter: NOSE, LW, RW, AFT, FUSELAGE (5 locations, for armor mapping)
 *
 * @spec openspec/specs/mech-configuration-system/spec.md
 */
export enum MechLocation {
  // Universal locations (all configurations)
  HEAD = 'Head',
  CENTER_TORSO = 'Center Torso',
  LEFT_TORSO = 'Left Torso',
  RIGHT_TORSO = 'Right Torso',

  // Biped/Tripod/LAM arm locations
  LEFT_ARM = 'Left Arm',
  RIGHT_ARM = 'Right Arm',

  // Biped/Tripod/LAM leg locations
  LEFT_LEG = 'Left Leg',
  RIGHT_LEG = 'Right Leg',

  // Tripod-specific location
  CENTER_LEG = 'Center Leg',

  // Quad/QuadVee-specific locations
  FRONT_LEFT_LEG = 'Front Left Leg',
  FRONT_RIGHT_LEG = 'Front Right Leg',
  REAR_LEFT_LEG = 'Rear Left Leg',
  REAR_RIGHT_LEG = 'Rear Right Leg',

  // LAM Fighter mode locations (for armor mapping)
  NOSE = 'Nose',
  LEFT_WING = 'Left Wing',
  RIGHT_WING = 'Right Wing',
  AFT = 'Aft',
  FUSELAGE = 'Fuselage',
}

/**
 * Critical slot counts per location
 *
 * Note: All leg locations (biped, quad, tripod) have 6 slots.
 * LAM fighter locations are for armor mapping only, not critical slots.
 */
export const LOCATION_SLOT_COUNTS: Readonly<Record<MechLocation, number>> = {
  // Universal locations
  [MechLocation.HEAD]: 6,
  [MechLocation.CENTER_TORSO]: 12,
  [MechLocation.LEFT_TORSO]: 12,
  [MechLocation.RIGHT_TORSO]: 12,

  // Biped/Tripod/LAM arm locations
  [MechLocation.LEFT_ARM]: 12,
  [MechLocation.RIGHT_ARM]: 12,

  // Biped/Tripod/LAM leg locations (6 slots)
  [MechLocation.LEFT_LEG]: 6,
  [MechLocation.RIGHT_LEG]: 6,

  // Tripod center leg
  [MechLocation.CENTER_LEG]: 6,

  // Quad/QuadVee leg locations (6 slots each - same as biped legs)
  [MechLocation.FRONT_LEFT_LEG]: 6,
  [MechLocation.FRONT_RIGHT_LEG]: 6,
  [MechLocation.REAR_LEFT_LEG]: 6,
  [MechLocation.REAR_RIGHT_LEG]: 6,

  // LAM Fighter mode locations (not used for critical slots, 0 by convention)
  [MechLocation.NOSE]: 0,
  [MechLocation.LEFT_WING]: 0,
  [MechLocation.RIGHT_WING]: 0,
  [MechLocation.AFT]: 0,
  [MechLocation.FUSELAGE]: 0,
};

/**
 * Total critical slots available on a mech
 */
export const TOTAL_CRITICAL_SLOTS = 78;

/**
 * Note on Superheavy Mechs:
 *
 * Superheavy mechs (105-200 tons) use the same entry count per location
 * as standard mechs (12 for torsos/arms, 6 for head/legs). The difference
 * is that each entry is a "double-slot" that can hold two single-crit items.
 * Equipment slot consumption is calculated via ceil(N/2) for crit entries.
 *
 * @see getLocationSlotCount in MechConfigurationSystem.ts for config-based lookup
 * @spec openspec/specs/superheavy-mech-system/spec.md
 */

/**
 * Fixed component placement in locations
 */
export interface FixedSlotAllocation {
  readonly location: MechLocation;
  readonly slotStart: number;
  readonly slotCount: number;
  readonly componentType: string;
  readonly isRequired: boolean;
}

function createFixedSlotAllocation(
  location: MechLocation,
  slotStart: number,
  componentType: string,
  isRequired: boolean,
): FixedSlotAllocation {
  return {
    location,
    slotStart,
    slotCount: 1,
    componentType,
    isRequired,
  };
}

type FixedSlotComponentSpec = readonly [
  slotStart: number,
  componentType: string,
  isRequired: boolean,
];

function createFixedSlotAllocations(
  location: MechLocation,
  components: readonly FixedSlotComponentSpec[],
): readonly FixedSlotAllocation[] {
  return components.map(([slotStart, componentType, isRequired]) =>
    createFixedSlotAllocation(location, slotStart, componentType, isRequired),
  );
}

const HEAD_FIXED_COMPONENTS: readonly FixedSlotComponentSpec[] = [
  [0, 'Life Support', true],
  [1, 'Sensors', true],
  [2, 'Cockpit', true],
  [4, 'Sensors', true],
  [5, 'Life Support', true],
];

const ARM_FIXED_COMPONENTS: readonly FixedSlotComponentSpec[] = [
  [0, 'Shoulder', true],
  [1, 'Upper Arm Actuator', true],
  [2, 'Lower Arm Actuator', false],
  [3, 'Hand Actuator', false],
];

const LEG_FIXED_COMPONENTS: readonly FixedSlotComponentSpec[] = [
  [0, 'Hip', true],
  [1, 'Upper Leg Actuator', true],
  [2, 'Lower Leg Actuator', true],
  [3, 'Foot Actuator', true],
];

/**
 * Standard fixed allocations for biped mechs
 */
export const STANDARD_FIXED_ALLOCATIONS: readonly FixedSlotAllocation[] = [
  // Head
  ...createFixedSlotAllocations(MechLocation.HEAD, HEAD_FIXED_COMPONENTS),

  // Left Arm (standard biped)
  ...createFixedSlotAllocations(MechLocation.LEFT_ARM, ARM_FIXED_COMPONENTS),

  // Right Arm (standard biped)
  ...createFixedSlotAllocations(MechLocation.RIGHT_ARM, ARM_FIXED_COMPONENTS),

  // Left Leg
  ...createFixedSlotAllocations(MechLocation.LEFT_LEG, LEG_FIXED_COMPONENTS),

  // Right Leg
  ...createFixedSlotAllocations(MechLocation.RIGHT_LEG, LEG_FIXED_COMPONENTS),
];

/**
 * Get available slots for a location (after fixed components)
 */
export function getAvailableSlots(
  location: MechLocation,
  engineCTSlots: number = 6,
  gyroSlots: number = 4,
  hasLowerArmActuator: boolean = true,
  hasHandActuator: boolean = true,
): number {
  let available = LOCATION_SLOT_COUNTS[location];

  switch (location) {
    case MechLocation.HEAD:
      // 5 fixed (life support ×2, sensors ×2, cockpit) - varies by cockpit type
      available -= 5;
      break;

    case MechLocation.CENTER_TORSO:
      // Engine + Gyro
      available -= engineCTSlots;
      available -= gyroSlots;
      break;

    case MechLocation.LEFT_ARM:
    case MechLocation.RIGHT_ARM:
      // Shoulder + Upper Arm are required
      available -= 2;
      if (hasLowerArmActuator) available -= 1;
      if (hasHandActuator) available -= 1;
      break;

    case MechLocation.LEFT_LEG:
    case MechLocation.RIGHT_LEG:
      // Hip + Upper/Lower/Foot actuators are all required
      available -= 4;
      break;

    default:
      // Side torsos have no fixed components
      break;
  }

  return Math.max(0, available);
}

/**
 * Get all available slots across the mech
 */
export function getTotalAvailableSlots(
  engineCTSlots: number = 6,
  gyroSlots: number = 4,
  hasLowerArmActuators: boolean = true,
  hasHandActuators: boolean = true,
): number {
  let total = 0;

  for (const location of Object.values(MechLocation)) {
    total += getAvailableSlots(
      location as MechLocation,
      engineCTSlots,
      gyroSlots,
      hasLowerArmActuators,
      hasHandActuators,
    );
  }

  return total;
}

/**
 * Distributed component allocation rules
 * Components like Endo Steel and Ferro-Fibrous can be placed anywhere
 */
export interface DistributedAllocationRule {
  readonly componentType: string;
  readonly totalSlots: number;
  readonly slotsPerUnit: number;
  readonly canAllocateToHead: boolean;
  readonly preferredLocations: MechLocation[];
}

function createFullDistributedPreferredLocations(): MechLocation[] {
  return [
    MechLocation.LEFT_TORSO,
    MechLocation.RIGHT_TORSO,
    MechLocation.LEFT_ARM,
    MechLocation.RIGHT_ARM,
    MechLocation.LEFT_LEG,
    MechLocation.RIGHT_LEG,
  ];
}

function createUpperDistributedPreferredLocations(): MechLocation[] {
  return [
    MechLocation.LEFT_TORSO,
    MechLocation.RIGHT_TORSO,
    MechLocation.LEFT_ARM,
    MechLocation.RIGHT_ARM,
  ];
}

function createTorsoDistributedPreferredLocations(): MechLocation[] {
  return [MechLocation.LEFT_TORSO, MechLocation.RIGHT_TORSO];
}

/**
 * Standard distributed allocation rules
 */
export const DISTRIBUTED_ALLOCATION_RULES: readonly DistributedAllocationRule[] =
  [
    {
      componentType: 'Endo Steel (IS)',
      totalSlots: 14,
      slotsPerUnit: 1,
      canAllocateToHead: true, // Technically allowed but not recommended
      preferredLocations: createFullDistributedPreferredLocations(),
    },
    {
      componentType: 'Endo Steel (Clan)',
      totalSlots: 7,
      slotsPerUnit: 1,
      canAllocateToHead: true,
      preferredLocations: createUpperDistributedPreferredLocations(),
    },
    {
      componentType: 'Ferro-Fibrous (IS)',
      totalSlots: 14,
      slotsPerUnit: 1,
      canAllocateToHead: true,
      preferredLocations: createFullDistributedPreferredLocations(),
    },
    {
      componentType: 'Ferro-Fibrous (Clan)',
      totalSlots: 7,
      slotsPerUnit: 1,
      canAllocateToHead: true,
      preferredLocations: createTorsoDistributedPreferredLocations(),
    },
  ];
