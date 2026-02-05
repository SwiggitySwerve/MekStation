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
 * Fixed component placement in locations
 */
export interface FixedSlotAllocation {
  readonly location: MechLocation;
  readonly slotStart: number;
  readonly slotCount: number;
  readonly componentType: string;
  readonly isRequired: boolean;
}

/**
 * Standard fixed allocations for biped mechs
 */
export const STANDARD_FIXED_ALLOCATIONS: readonly FixedSlotAllocation[] = [
  // Head
  {
    location: MechLocation.HEAD,
    slotStart: 0,
    slotCount: 1,
    componentType: 'Life Support',
    isRequired: true,
  },
  {
    location: MechLocation.HEAD,
    slotStart: 1,
    slotCount: 1,
    componentType: 'Sensors',
    isRequired: true,
  },
  {
    location: MechLocation.HEAD,
    slotStart: 2,
    slotCount: 1,
    componentType: 'Cockpit',
    isRequired: true,
  },
  {
    location: MechLocation.HEAD,
    slotStart: 4,
    slotCount: 1,
    componentType: 'Sensors',
    isRequired: true,
  },
  {
    location: MechLocation.HEAD,
    slotStart: 5,
    slotCount: 1,
    componentType: 'Life Support',
    isRequired: true,
  },

  // Left Arm (standard biped)
  {
    location: MechLocation.LEFT_ARM,
    slotStart: 0,
    slotCount: 1,
    componentType: 'Shoulder',
    isRequired: true,
  },
  {
    location: MechLocation.LEFT_ARM,
    slotStart: 1,
    slotCount: 1,
    componentType: 'Upper Arm Actuator',
    isRequired: true,
  },
  {
    location: MechLocation.LEFT_ARM,
    slotStart: 2,
    slotCount: 1,
    componentType: 'Lower Arm Actuator',
    isRequired: false,
  },
  {
    location: MechLocation.LEFT_ARM,
    slotStart: 3,
    slotCount: 1,
    componentType: 'Hand Actuator',
    isRequired: false,
  },

  // Right Arm (standard biped)
  {
    location: MechLocation.RIGHT_ARM,
    slotStart: 0,
    slotCount: 1,
    componentType: 'Shoulder',
    isRequired: true,
  },
  {
    location: MechLocation.RIGHT_ARM,
    slotStart: 1,
    slotCount: 1,
    componentType: 'Upper Arm Actuator',
    isRequired: true,
  },
  {
    location: MechLocation.RIGHT_ARM,
    slotStart: 2,
    slotCount: 1,
    componentType: 'Lower Arm Actuator',
    isRequired: false,
  },
  {
    location: MechLocation.RIGHT_ARM,
    slotStart: 3,
    slotCount: 1,
    componentType: 'Hand Actuator',
    isRequired: false,
  },

  // Left Leg
  {
    location: MechLocation.LEFT_LEG,
    slotStart: 0,
    slotCount: 1,
    componentType: 'Hip',
    isRequired: true,
  },
  {
    location: MechLocation.LEFT_LEG,
    slotStart: 1,
    slotCount: 1,
    componentType: 'Upper Leg Actuator',
    isRequired: true,
  },
  {
    location: MechLocation.LEFT_LEG,
    slotStart: 2,
    slotCount: 1,
    componentType: 'Lower Leg Actuator',
    isRequired: true,
  },
  {
    location: MechLocation.LEFT_LEG,
    slotStart: 3,
    slotCount: 1,
    componentType: 'Foot Actuator',
    isRequired: true,
  },

  // Right Leg
  {
    location: MechLocation.RIGHT_LEG,
    slotStart: 0,
    slotCount: 1,
    componentType: 'Hip',
    isRequired: true,
  },
  {
    location: MechLocation.RIGHT_LEG,
    slotStart: 1,
    slotCount: 1,
    componentType: 'Upper Leg Actuator',
    isRequired: true,
  },
  {
    location: MechLocation.RIGHT_LEG,
    slotStart: 2,
    slotCount: 1,
    componentType: 'Lower Leg Actuator',
    isRequired: true,
  },
  {
    location: MechLocation.RIGHT_LEG,
    slotStart: 3,
    slotCount: 1,
    componentType: 'Foot Actuator',
    isRequired: true,
  },
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
      preferredLocations: [
        MechLocation.LEFT_TORSO,
        MechLocation.RIGHT_TORSO,
        MechLocation.LEFT_ARM,
        MechLocation.RIGHT_ARM,
        MechLocation.LEFT_LEG,
        MechLocation.RIGHT_LEG,
      ],
    },
    {
      componentType: 'Endo Steel (Clan)',
      totalSlots: 7,
      slotsPerUnit: 1,
      canAllocateToHead: true,
      preferredLocations: [
        MechLocation.LEFT_TORSO,
        MechLocation.RIGHT_TORSO,
        MechLocation.LEFT_ARM,
        MechLocation.RIGHT_ARM,
      ],
    },
    {
      componentType: 'Ferro-Fibrous (IS)',
      totalSlots: 14,
      slotsPerUnit: 1,
      canAllocateToHead: true,
      preferredLocations: [
        MechLocation.LEFT_TORSO,
        MechLocation.RIGHT_TORSO,
        MechLocation.LEFT_ARM,
        MechLocation.RIGHT_ARM,
        MechLocation.LEFT_LEG,
        MechLocation.RIGHT_LEG,
      ],
    },
    {
      componentType: 'Ferro-Fibrous (Clan)',
      totalSlots: 7,
      slotsPerUnit: 1,
      canAllocateToHead: true,
      preferredLocations: [MechLocation.LEFT_TORSO, MechLocation.RIGHT_TORSO],
    },
  ];
