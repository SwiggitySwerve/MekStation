/**
 * Mech Configuration System
 *
 * Provides a data-driven configuration registry that defines location layouts,
 * actuator requirements, equipment rules, and visual components for each mech
 * configuration type (Biped, Quad, Tripod, LAM, QuadVee).
 *
 * @spec openspec/specs/mech-configuration-system/spec.md
 */

import { MechConfiguration } from '../unit/BattleMechInterfaces';
import { MechLocation } from './CriticalSlotAllocation';

// Re-export for convenience
export { MechLocation, MechConfiguration };

/**
 * Biped-only locations (for backward compatibility with existing code)
 */
export type BipedLocation =
  | MechLocation.HEAD
  | MechLocation.CENTER_TORSO
  | MechLocation.LEFT_TORSO
  | MechLocation.RIGHT_TORSO
  | MechLocation.LEFT_ARM
  | MechLocation.RIGHT_ARM
  | MechLocation.LEFT_LEG
  | MechLocation.RIGHT_LEG;

/**
 * All biped locations as an array
 */
export const BIPED_LOCATION_VALUES: BipedLocation[] = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
];

/**
 * Check if a location is a biped location
 */
export function isBipedLocation(location: MechLocation): location is BipedLocation {
  return BIPED_LOCATION_VALUES.includes(location as BipedLocation);
}

/**
 * Actuator types
 */
export enum ActuatorType {
  // Arm actuators
  SHOULDER = 'Shoulder',
  UPPER_ARM = 'Upper Arm Actuator',
  LOWER_ARM = 'Lower Arm Actuator',
  HAND = 'Hand Actuator',

  // Leg actuators
  HIP = 'Hip',
  UPPER_LEG = 'Upper Leg Actuator',
  LOWER_LEG = 'Lower Leg Actuator',
  FOOT = 'Foot Actuator',
}

/**
 * Actuator slot definition
 */
export interface IActuatorSlot {
  readonly type: ActuatorType;
  readonly slotIndex: number;
  readonly required: boolean;
  readonly removable: boolean;
}

/**
 * Location definition within a configuration
 */
export interface ILocationDefinition {
  readonly id: MechLocation;
  readonly displayName: string;
  readonly abbreviation: string;
  readonly criticalSlots: number;
  readonly hasRearArmor: boolean;
  readonly isLimb: boolean;
  readonly actuators: readonly IActuatorSlot[];
  readonly transfersTo?: MechLocation;
  readonly maxArmorMultiplier: number; // Multiplied by internal structure points
}

/**
 * Equipment mounting rule
 */
export interface IMountingRule {
  readonly equipmentCategory: string;
  readonly allowedLocations: readonly MechLocation[];
  readonly requiresActuator?: ActuatorType;
  readonly prohibitedReason?: string;
}

/**
 * LAM operating mode
 */
export enum LAMMode {
  MECH = 'Mech',
  AIRMECH = 'AirMech',
  FIGHTER = 'Fighter',
}

/**
 * LAM mode definition
 */
export interface ILAMModeDefinition {
  readonly mode: LAMMode;
  readonly displayName: string;
  readonly movementType: 'ground' | 'vtol' | 'aerospace';
  readonly weaponRestrictions: readonly string[];
  readonly armorLocationMapping?: Readonly<Record<MechLocation, MechLocation>>;
}

/**
 * QuadVee operating mode
 */
export enum QuadVeeMode {
  MECH = 'Mech',
  VEHICLE = 'Vehicle',
}

/**
 * QuadVee mode definition
 */
export interface IQuadVeeModeDefinition {
  readonly mode: QuadVeeMode;
  readonly displayName: string;
  readonly movementType: 'ground' | 'tracked';
  readonly description: string;
}

/**
 * QuadVee mode definitions
 */
export const QUADVEE_MODES: readonly IQuadVeeModeDefinition[] = [
  {
    mode: QuadVeeMode.MECH,
    displayName: 'Mech Mode',
    movementType: 'ground',
    description: 'Standard quad mech movement with legs',
  },
  {
    mode: QuadVeeMode.VEHICLE,
    displayName: 'Vehicle Mode',
    movementType: 'tracked',
    description: 'Tracked vehicle movement with wheels/treads',
  },
];

/**
 * Complete mech configuration definition
 */
export interface IMechConfigurationDefinition {
  readonly id: MechConfiguration;
  readonly displayName: string;
  readonly description: string;

  // Location layout
  readonly locations: readonly ILocationDefinition[];

  // Equipment restrictions
  readonly mountingRules: readonly IMountingRule[];
  readonly prohibitedEquipment: readonly string[];

  // Movement modifiers
  readonly baseMovementModifier: number;

  // For transforming units (LAM, QuadVee)
  readonly modes?: readonly ILAMModeDefinition[];

  // Required equipment (e.g., LAM needs Landing Gear and Avionics)
  readonly requiredEquipment?: readonly {
    readonly equipmentId: string;
    readonly locations: readonly MechLocation[];
  }[];

  // Visual component reference
  readonly diagramComponentName: string;
}

/**
 * Standard arm actuators (biped/tripod/LAM)
 */
export const ARM_ACTUATORS: readonly IActuatorSlot[] = [
  { type: ActuatorType.SHOULDER, slotIndex: 0, required: true, removable: false },
  { type: ActuatorType.UPPER_ARM, slotIndex: 1, required: true, removable: false },
  { type: ActuatorType.LOWER_ARM, slotIndex: 2, required: false, removable: true },
  { type: ActuatorType.HAND, slotIndex: 3, required: false, removable: true },
];

/**
 * Standard leg actuators (all configurations)
 */
export const LEG_ACTUATORS: readonly IActuatorSlot[] = [
  { type: ActuatorType.HIP, slotIndex: 0, required: true, removable: false },
  { type: ActuatorType.UPPER_LEG, slotIndex: 1, required: true, removable: false },
  { type: ActuatorType.LOWER_LEG, slotIndex: 2, required: true, removable: false },
  { type: ActuatorType.FOOT, slotIndex: 3, required: true, removable: false },
];

/**
 * Biped location set
 */
export const BIPED_LOCATIONS: MechLocation[] = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
];

/**
 * Quad location set
 */
export const QUAD_LOCATIONS: MechLocation[] = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.FRONT_LEFT_LEG,
  MechLocation.FRONT_RIGHT_LEG,
  MechLocation.REAR_LEFT_LEG,
  MechLocation.REAR_RIGHT_LEG,
];

/**
 * Tripod location set
 */
export const TRIPOD_LOCATIONS: MechLocation[] = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
  MechLocation.CENTER_LEG,
];

/**
 * LAM Fighter mode location set
 */
export const LAM_FIGHTER_LOCATIONS: MechLocation[] = [
  MechLocation.NOSE,
  MechLocation.LEFT_WING,
  MechLocation.RIGHT_WING,
  MechLocation.AFT,
  MechLocation.FUSELAGE,
];

/**
 * Get locations for a specific configuration
 */
export function getLocationsForConfig(config: MechConfiguration): MechLocation[] {
  switch (config) {
    case MechConfiguration.QUAD:
    case MechConfiguration.QUADVEE:
      return QUAD_LOCATIONS;
    case MechConfiguration.TRIPOD:
      return TRIPOD_LOCATIONS;
    case MechConfiguration.LAM:
    case MechConfiguration.BIPED:
    default:
      return BIPED_LOCATIONS;
  }
}

/**
 * Check if a location is valid for a configuration
 */
export function isValidLocationForConfig(location: MechLocation, config: MechConfiguration): boolean {
  const validLocations = getLocationsForConfig(config);
  return validLocations.includes(location);
}

/**
 * Get display name for a location in a specific configuration context
 */
export function getLocationDisplayName(location: MechLocation): string {
  return location; // The enum value is already the display name
}

/**
 * Get the short abbreviation for a location (used in MTF format)
 */
export function getLocationAbbreviation(location: MechLocation): string {
  const abbreviations: Record<MechLocation, string> = {
    [MechLocation.HEAD]: 'HD',
    [MechLocation.CENTER_TORSO]: 'CT',
    [MechLocation.LEFT_TORSO]: 'LT',
    [MechLocation.RIGHT_TORSO]: 'RT',
    [MechLocation.LEFT_ARM]: 'LA',
    [MechLocation.RIGHT_ARM]: 'RA',
    [MechLocation.LEFT_LEG]: 'LL',
    [MechLocation.RIGHT_LEG]: 'RL',
    [MechLocation.CENTER_LEG]: 'CL',
    [MechLocation.FRONT_LEFT_LEG]: 'FLL',
    [MechLocation.FRONT_RIGHT_LEG]: 'FRL',
    [MechLocation.REAR_LEFT_LEG]: 'RLL',
    [MechLocation.REAR_RIGHT_LEG]: 'RRL',
    [MechLocation.NOSE]: 'NOS',
    [MechLocation.LEFT_WING]: 'LW',
    [MechLocation.RIGHT_WING]: 'RW',
    [MechLocation.AFT]: 'AFT',
    [MechLocation.FUSELAGE]: 'FUS',
  };
  return abbreviations[location] || location;
}

/**
 * Get critical slot count for a location based on configuration
 */
export function getLocationSlotCount(location: MechLocation, config: MechConfiguration): number {
  // Head always has 6 slots
  if (location === MechLocation.HEAD) {
    return 6;
  }

  // Torsos always have 12 slots
  if ([MechLocation.CENTER_TORSO, MechLocation.LEFT_TORSO, MechLocation.RIGHT_TORSO].includes(location)) {
    return 12;
  }

  // Arms have 12 slots
  if ([MechLocation.LEFT_ARM, MechLocation.RIGHT_ARM].includes(location)) {
    return 12;
  }

  // Biped/Tripod legs have 6 slots
  if ([MechLocation.LEFT_LEG, MechLocation.RIGHT_LEG, MechLocation.CENTER_LEG].includes(location)) {
    return 6;
  }

  // Quad legs have 12 slots (same as arms in biped)
  if ([MechLocation.FRONT_LEFT_LEG, MechLocation.FRONT_RIGHT_LEG,
       MechLocation.REAR_LEFT_LEG, MechLocation.REAR_RIGHT_LEG].includes(location)) {
    return 12;
  }

  return 0;
}

/**
 * Check if a location is a leg (for actuator purposes)
 */
export function isLegLocation(location: MechLocation): boolean {
  return [
    MechLocation.LEFT_LEG,
    MechLocation.RIGHT_LEG,
    MechLocation.CENTER_LEG,
    MechLocation.FRONT_LEFT_LEG,
    MechLocation.FRONT_RIGHT_LEG,
    MechLocation.REAR_LEFT_LEG,
    MechLocation.REAR_RIGHT_LEG,
  ].includes(location);
}

/**
 * Check if a location is an arm
 */
export function isArmLocation(location: MechLocation): boolean {
  return [MechLocation.LEFT_ARM, MechLocation.RIGHT_ARM].includes(location);
}

/**
 * Check if a location has rear armor
 */
export function hasRearArmor(location: MechLocation): boolean {
  return [
    MechLocation.CENTER_TORSO,
    MechLocation.LEFT_TORSO,
    MechLocation.RIGHT_TORSO,
  ].includes(location);
}

/**
 * Get actuators for a location based on configuration
 */
export function getActuatorsForLocation(
  location: MechLocation,
  config: MechConfiguration
): readonly IActuatorSlot[] {
  // Head, torsos have no actuators
  if ([MechLocation.HEAD, MechLocation.CENTER_TORSO,
       MechLocation.LEFT_TORSO, MechLocation.RIGHT_TORSO].includes(location)) {
    return [];
  }

  // Arms use arm actuators (biped, tripod, LAM only)
  if (isArmLocation(location)) {
    if (config === MechConfiguration.QUAD || config === MechConfiguration.QUADVEE) {
      return []; // Quads don't have arms
    }
    return ARM_ACTUATORS;
  }

  // All legs use leg actuators
  if (isLegLocation(location)) {
    return LEG_ACTUATORS;
  }

  return [];
}

// =============================================================================
// Configuration Definitions
// =============================================================================

/**
 * Helper to create a location definition
 */
function createLocationDef(
  id: MechLocation,
  displayName: string,
  abbreviation: string,
  criticalSlots: number,
  options: {
    hasRearArmor?: boolean;
    isLimb?: boolean;
    actuators?: readonly IActuatorSlot[];
    transfersTo?: MechLocation;
    maxArmorMultiplier?: number;
  } = {}
): ILocationDefinition {
  return {
    id,
    displayName,
    abbreviation,
    criticalSlots,
    hasRearArmor: options.hasRearArmor ?? false,
    isLimb: options.isLimb ?? false,
    actuators: options.actuators ?? [],
    transfersTo: options.transfersTo,
    maxArmorMultiplier: options.maxArmorMultiplier ?? 2,
  };
}

/**
 * Biped mech configuration definition
 */
export const BIPED_CONFIGURATION: IMechConfigurationDefinition = {
  id: MechConfiguration.BIPED,
  displayName: 'Biped',
  description: 'Standard two-legged BattleMech with arms',
  locations: [
    createLocationDef(MechLocation.HEAD, 'Head', 'HD', 6, { maxArmorMultiplier: 3 }),
    createLocationDef(MechLocation.CENTER_TORSO, 'Center Torso', 'CT', 12, { hasRearArmor: true }),
    createLocationDef(MechLocation.LEFT_TORSO, 'Left Torso', 'LT', 12, { hasRearArmor: true, transfersTo: MechLocation.CENTER_TORSO }),
    createLocationDef(MechLocation.RIGHT_TORSO, 'Right Torso', 'RT', 12, { hasRearArmor: true, transfersTo: MechLocation.CENTER_TORSO }),
    createLocationDef(MechLocation.LEFT_ARM, 'Left Arm', 'LA', 12, { isLimb: true, actuators: ARM_ACTUATORS, transfersTo: MechLocation.LEFT_TORSO }),
    createLocationDef(MechLocation.RIGHT_ARM, 'Right Arm', 'RA', 12, { isLimb: true, actuators: ARM_ACTUATORS, transfersTo: MechLocation.RIGHT_TORSO }),
    createLocationDef(MechLocation.LEFT_LEG, 'Left Leg', 'LL', 6, { isLimb: true, actuators: LEG_ACTUATORS, transfersTo: MechLocation.LEFT_TORSO }),
    createLocationDef(MechLocation.RIGHT_LEG, 'Right Leg', 'RL', 6, { isLimb: true, actuators: LEG_ACTUATORS, transfersTo: MechLocation.RIGHT_TORSO }),
  ],
  mountingRules: [],
  prohibitedEquipment: [],
  baseMovementModifier: 0,
  diagramComponentName: 'BipedArmorDiagram',
};

/**
 * Quad mech configuration definition
 */
export const QUAD_CONFIGURATION: IMechConfigurationDefinition = {
  id: MechConfiguration.QUAD,
  displayName: 'Quad',
  description: 'Four-legged BattleMech without arms',
  locations: [
    createLocationDef(MechLocation.HEAD, 'Head', 'HD', 6, { maxArmorMultiplier: 3 }),
    createLocationDef(MechLocation.CENTER_TORSO, 'Center Torso', 'CT', 12, { hasRearArmor: true }),
    createLocationDef(MechLocation.LEFT_TORSO, 'Left Torso', 'LT', 12, { hasRearArmor: true, transfersTo: MechLocation.CENTER_TORSO }),
    createLocationDef(MechLocation.RIGHT_TORSO, 'Right Torso', 'RT', 12, { hasRearArmor: true, transfersTo: MechLocation.CENTER_TORSO }),
    createLocationDef(MechLocation.FRONT_LEFT_LEG, 'Front Left Leg', 'FLL', 12, { isLimb: true, actuators: LEG_ACTUATORS, transfersTo: MechLocation.LEFT_TORSO }),
    createLocationDef(MechLocation.FRONT_RIGHT_LEG, 'Front Right Leg', 'FRL', 12, { isLimb: true, actuators: LEG_ACTUATORS, transfersTo: MechLocation.RIGHT_TORSO }),
    createLocationDef(MechLocation.REAR_LEFT_LEG, 'Rear Left Leg', 'RLL', 12, { isLimb: true, actuators: LEG_ACTUATORS, transfersTo: MechLocation.LEFT_TORSO }),
    createLocationDef(MechLocation.REAR_RIGHT_LEG, 'Rear Right Leg', 'RRL', 12, { isLimb: true, actuators: LEG_ACTUATORS, transfersTo: MechLocation.RIGHT_TORSO }),
  ],
  mountingRules: [],
  prohibitedEquipment: [],
  baseMovementModifier: 0,
  diagramComponentName: 'QuadArmorDiagram',
};

/**
 * Tripod mech configuration definition
 */
export const TRIPOD_CONFIGURATION: IMechConfigurationDefinition = {
  id: MechConfiguration.TRIPOD,
  displayName: 'Tripod',
  description: 'Three-legged BattleMech with arms and center leg',
  locations: [
    createLocationDef(MechLocation.HEAD, 'Head', 'HD', 6, { maxArmorMultiplier: 3 }),
    createLocationDef(MechLocation.CENTER_TORSO, 'Center Torso', 'CT', 12, { hasRearArmor: true }),
    createLocationDef(MechLocation.LEFT_TORSO, 'Left Torso', 'LT', 12, { hasRearArmor: true, transfersTo: MechLocation.CENTER_TORSO }),
    createLocationDef(MechLocation.RIGHT_TORSO, 'Right Torso', 'RT', 12, { hasRearArmor: true, transfersTo: MechLocation.CENTER_TORSO }),
    createLocationDef(MechLocation.LEFT_ARM, 'Left Arm', 'LA', 12, { isLimb: true, actuators: ARM_ACTUATORS, transfersTo: MechLocation.LEFT_TORSO }),
    createLocationDef(MechLocation.RIGHT_ARM, 'Right Arm', 'RA', 12, { isLimb: true, actuators: ARM_ACTUATORS, transfersTo: MechLocation.RIGHT_TORSO }),
    createLocationDef(MechLocation.LEFT_LEG, 'Left Leg', 'LL', 6, { isLimb: true, actuators: LEG_ACTUATORS, transfersTo: MechLocation.LEFT_TORSO }),
    createLocationDef(MechLocation.RIGHT_LEG, 'Right Leg', 'RL', 6, { isLimb: true, actuators: LEG_ACTUATORS, transfersTo: MechLocation.RIGHT_TORSO }),
    createLocationDef(MechLocation.CENTER_LEG, 'Center Leg', 'CL', 6, { isLimb: true, actuators: LEG_ACTUATORS, transfersTo: MechLocation.CENTER_TORSO }),
  ],
  mountingRules: [],
  prohibitedEquipment: [],
  baseMovementModifier: 0,
  diagramComponentName: 'TripodArmorDiagram',
};

/**
 * LAM equipment definitions
 * Landing Gear: 3 slots total (1 each in CT, LT, RT)
 * Avionics: 3 slots total (1 each in HD, LT, RT)
 */
export const LAM_EQUIPMENT = {
  LANDING_GEAR: {
    id: 'landing-gear',
    name: 'Landing Gear',
    slots: 1,
    locations: [MechLocation.CENTER_TORSO, MechLocation.LEFT_TORSO, MechLocation.RIGHT_TORSO],
  },
  AVIONICS: {
    id: 'avionics',
    name: 'Avionics',
    slots: 1,
    locations: [MechLocation.HEAD, MechLocation.LEFT_TORSO, MechLocation.RIGHT_TORSO],
  },
} as const;

/**
 * LAM mech configuration definition
 * LAMs are limited to 55 tons max and cannot use XL engines, Endo Steel, or Ferro-Fibrous armor
 */
export const LAM_CONFIGURATION: IMechConfigurationDefinition = {
  id: MechConfiguration.LAM,
  displayName: 'Land-Air Mech',
  description: 'Transformable BattleMech capable of flight (max 55 tons)',
  locations: [
    createLocationDef(MechLocation.HEAD, 'Head', 'HD', 6, { maxArmorMultiplier: 3 }),
    createLocationDef(MechLocation.CENTER_TORSO, 'Center Torso', 'CT', 12, { hasRearArmor: true }),
    createLocationDef(MechLocation.LEFT_TORSO, 'Left Torso', 'LT', 12, { hasRearArmor: true, transfersTo: MechLocation.CENTER_TORSO }),
    createLocationDef(MechLocation.RIGHT_TORSO, 'Right Torso', 'RT', 12, { hasRearArmor: true, transfersTo: MechLocation.CENTER_TORSO }),
    createLocationDef(MechLocation.LEFT_ARM, 'Left Arm', 'LA', 12, { isLimb: true, actuators: ARM_ACTUATORS, transfersTo: MechLocation.LEFT_TORSO }),
    createLocationDef(MechLocation.RIGHT_ARM, 'Right Arm', 'RA', 12, { isLimb: true, actuators: ARM_ACTUATORS, transfersTo: MechLocation.RIGHT_TORSO }),
    createLocationDef(MechLocation.LEFT_LEG, 'Left Leg', 'LL', 6, { isLimb: true, actuators: LEG_ACTUATORS, transfersTo: MechLocation.LEFT_TORSO }),
    createLocationDef(MechLocation.RIGHT_LEG, 'Right Leg', 'RL', 6, { isLimb: true, actuators: LEG_ACTUATORS, transfersTo: MechLocation.RIGHT_TORSO }),
  ],
  mountingRules: [],
  prohibitedEquipment: [
    'endo-steel',
    'endo-steel-clan',
    'ferro-fibrous',
    'ferro-fibrous-clan',
    'light-ferro-fibrous',
    'heavy-ferro-fibrous',
    'stealth-armor',
  ],
  baseMovementModifier: 0,
  modes: [
    {
      mode: LAMMode.MECH,
      displayName: 'Mech Mode',
      movementType: 'ground',
      weaponRestrictions: [],
    },
    {
      mode: LAMMode.AIRMECH,
      displayName: 'AirMech Mode',
      movementType: 'vtol',
      weaponRestrictions: [],
    },
    {
      mode: LAMMode.FIGHTER,
      displayName: 'Fighter Mode',
      movementType: 'aerospace',
      weaponRestrictions: ['physical'],
      armorLocationMapping: {
        [MechLocation.HEAD]: MechLocation.NOSE,
        [MechLocation.CENTER_TORSO]: MechLocation.FUSELAGE,
        [MechLocation.LEFT_TORSO]: MechLocation.LEFT_WING,
        [MechLocation.RIGHT_TORSO]: MechLocation.RIGHT_WING,
        [MechLocation.LEFT_ARM]: MechLocation.LEFT_WING,
        [MechLocation.RIGHT_ARM]: MechLocation.RIGHT_WING,
        [MechLocation.LEFT_LEG]: MechLocation.AFT,
        [MechLocation.RIGHT_LEG]: MechLocation.AFT,
        // Fighter-only locations map to themselves
        [MechLocation.NOSE]: MechLocation.NOSE,
        [MechLocation.LEFT_WING]: MechLocation.LEFT_WING,
        [MechLocation.RIGHT_WING]: MechLocation.RIGHT_WING,
        [MechLocation.AFT]: MechLocation.AFT,
        [MechLocation.FUSELAGE]: MechLocation.FUSELAGE,
        // Non-LAM locations (should not be used but required by type)
        [MechLocation.CENTER_LEG]: MechLocation.AFT,
        [MechLocation.FRONT_LEFT_LEG]: MechLocation.AFT,
        [MechLocation.FRONT_RIGHT_LEG]: MechLocation.AFT,
        [MechLocation.REAR_LEFT_LEG]: MechLocation.AFT,
        [MechLocation.REAR_RIGHT_LEG]: MechLocation.AFT,
      },
    },
  ],
  requiredEquipment: [
    // Landing Gear: 1 slot each in CT, LT, RT
    { equipmentId: LAM_EQUIPMENT.LANDING_GEAR.id, locations: LAM_EQUIPMENT.LANDING_GEAR.locations },
    // Avionics: 1 slot each in HD, LT, RT
    { equipmentId: LAM_EQUIPMENT.AVIONICS.id, locations: LAM_EQUIPMENT.AVIONICS.locations },
  ],
  diagramComponentName: 'LAMArmorDiagram',
};

/**
 * QuadVee required equipment definitions
 * Conversion Equipment: Required in each leg for transformation
 */
export const QUADVEE_EQUIPMENT = {
  CONVERSION_EQUIPMENT: {
    id: 'conversion-equipment',
    name: 'Conversion Equipment',
    slots: 1,
    locations: [
      MechLocation.FRONT_LEFT_LEG,
      MechLocation.FRONT_RIGHT_LEG,
      MechLocation.REAR_LEFT_LEG,
      MechLocation.REAR_RIGHT_LEG,
    ],
  },
  TRACKS: {
    id: 'tracks',
    name: 'Tracks',
    slots: 1,
    locations: [
      MechLocation.FRONT_LEFT_LEG,
      MechLocation.FRONT_RIGHT_LEG,
      MechLocation.REAR_LEFT_LEG,
      MechLocation.REAR_RIGHT_LEG,
    ],
  },
} as const;

/**
 * QuadVee mech configuration definition
 */
export const QUADVEE_CONFIGURATION: IMechConfigurationDefinition = {
  id: MechConfiguration.QUADVEE,
  displayName: 'QuadVee',
  description: 'Transformable quad mech capable of vehicle mode',
  locations: [
    createLocationDef(MechLocation.HEAD, 'Head', 'HD', 6, { maxArmorMultiplier: 3 }),
    createLocationDef(MechLocation.CENTER_TORSO, 'Center Torso', 'CT', 12, { hasRearArmor: true }),
    createLocationDef(MechLocation.LEFT_TORSO, 'Left Torso', 'LT', 12, { hasRearArmor: true, transfersTo: MechLocation.CENTER_TORSO }),
    createLocationDef(MechLocation.RIGHT_TORSO, 'Right Torso', 'RT', 12, { hasRearArmor: true, transfersTo: MechLocation.CENTER_TORSO }),
    createLocationDef(MechLocation.FRONT_LEFT_LEG, 'Front Left Leg', 'FLL', 12, { isLimb: true, actuators: LEG_ACTUATORS, transfersTo: MechLocation.LEFT_TORSO }),
    createLocationDef(MechLocation.FRONT_RIGHT_LEG, 'Front Right Leg', 'FRL', 12, { isLimb: true, actuators: LEG_ACTUATORS, transfersTo: MechLocation.RIGHT_TORSO }),
    createLocationDef(MechLocation.REAR_LEFT_LEG, 'Rear Left Leg', 'RLL', 12, { isLimb: true, actuators: LEG_ACTUATORS, transfersTo: MechLocation.LEFT_TORSO }),
    createLocationDef(MechLocation.REAR_RIGHT_LEG, 'Rear Right Leg', 'RRL', 12, { isLimb: true, actuators: LEG_ACTUATORS, transfersTo: MechLocation.RIGHT_TORSO }),
  ],
  mountingRules: [],
  prohibitedEquipment: [],
  baseMovementModifier: 0,
  requiredEquipment: [
    { equipmentId: QUADVEE_EQUIPMENT.CONVERSION_EQUIPMENT.id, locations: QUADVEE_EQUIPMENT.CONVERSION_EQUIPMENT.locations },
  ],
  diagramComponentName: 'QuadVeeArmorDiagram',
};

// =============================================================================
// Configuration Registry
// =============================================================================

/**
 * Registry of all mech configuration definitions
 */
class MechConfigurationRegistry {
  private readonly configurations: Map<MechConfiguration, IMechConfigurationDefinition>;

  constructor() {
    this.configurations = new Map([
      [MechConfiguration.BIPED, BIPED_CONFIGURATION],
      [MechConfiguration.QUAD, QUAD_CONFIGURATION],
      [MechConfiguration.TRIPOD, TRIPOD_CONFIGURATION],
      [MechConfiguration.LAM, LAM_CONFIGURATION],
      [MechConfiguration.QUADVEE, QUADVEE_CONFIGURATION],
    ]);
  }

  /**
   * Get configuration definition by type
   */
  getConfiguration(type: MechConfiguration): IMechConfigurationDefinition {
    const config = this.configurations.get(type);
    if (!config) {
      // Default to biped if unknown configuration
      return BIPED_CONFIGURATION;
    }
    return config;
  }

  /**
   * Get all configuration definitions
   */
  getAllConfigurations(): IMechConfigurationDefinition[] {
    return Array.from(this.configurations.values());
  }

  /**
   * Get location definitions for a configuration
   */
  getLocationDefinitions(type: MechConfiguration): readonly ILocationDefinition[] {
    return this.getConfiguration(type).locations;
  }

  /**
   * Get a specific location definition
   */
  getLocationDefinition(type: MechConfiguration, location: MechLocation): ILocationDefinition | undefined {
    return this.getConfiguration(type).locations.find(loc => loc.id === location);
  }

  /**
   * Check if a configuration supports a specific location
   */
  hasLocation(type: MechConfiguration, location: MechLocation): boolean {
    return this.getConfiguration(type).locations.some(loc => loc.id === location);
  }

  /**
   * Get all valid locations for a configuration
   */
  getValidLocations(type: MechConfiguration): MechLocation[] {
    return this.getConfiguration(type).locations.map(loc => loc.id);
  }

  /**
   * Get the diagram component name for a configuration
   */
  getDiagramComponentName(type: MechConfiguration): string {
    return this.getConfiguration(type).diagramComponentName;
  }

  /**
   * Check if configuration is a quad type (Quad or QuadVee)
   */
  isQuadConfiguration(type: MechConfiguration): boolean {
    return type === MechConfiguration.QUAD || type === MechConfiguration.QUADVEE;
  }

  /**
   * Check if configuration is a transforming type (LAM or QuadVee)
   */
  isTransformingConfiguration(type: MechConfiguration): boolean {
    return type === MechConfiguration.LAM || type === MechConfiguration.QUADVEE;
  }

  /**
   * Check if configuration is a LAM
   */
  isLAMConfiguration(type: MechConfiguration): boolean {
    return type === MechConfiguration.LAM;
  }

  /**
   * Get available modes for a configuration (LAM or QuadVee)
   */
  getModes(type: MechConfiguration): readonly ILAMModeDefinition[] | undefined {
    return this.getConfiguration(type).modes;
  }

  /**
   * Get mode definition by mode value
   */
  getModeDefinition(type: MechConfiguration, mode: LAMMode): ILAMModeDefinition | undefined {
    const modes = this.getModes(type);
    return modes?.find(m => m.mode === mode);
  }

  /**
   * Get fighter mode armor location mapping for LAM
   */
  getFighterArmorMapping(type: MechConfiguration): Readonly<Record<MechLocation, MechLocation>> | undefined {
    const fighterMode = this.getModeDefinition(type, LAMMode.FIGHTER);
    return fighterMode?.armorLocationMapping;
  }

  /**
   * Check if configuration is a QuadVee
   */
  isQuadVeeConfiguration(type: MechConfiguration): boolean {
    return type === MechConfiguration.QUADVEE;
  }

  /**
   * Get QuadVee mode definitions
   */
  getQuadVeeModes(): readonly IQuadVeeModeDefinition[] {
    return QUADVEE_MODES;
  }

  /**
   * Get QuadVee mode definition by mode value
   */
  getQuadVeeModeDefinition(mode: QuadVeeMode): IQuadVeeModeDefinition | undefined {
    return QUADVEE_MODES.find(m => m.mode === mode);
  }

  /**
   * Get required equipment for a configuration
   */
  getRequiredEquipment(type: MechConfiguration): readonly { equipmentId: string; locations: readonly MechLocation[] }[] {
    return this.getConfiguration(type).requiredEquipment ?? [];
  }

  /**
   * Get prohibited equipment for a configuration
   */
  getProhibitedEquipment(type: MechConfiguration): readonly string[] {
    return this.getConfiguration(type).prohibitedEquipment;
  }

  /**
   * Get max tonnage for a configuration (55 for LAM, undefined for unlimited)
   */
  getMaxTonnage(type: MechConfiguration): number | undefined {
    if (type === MechConfiguration.LAM) {
      return 55;
    }
    return undefined; // No limit for other configurations
  }
}

/**
 * Singleton instance of the configuration registry
 */
export const configurationRegistry = new MechConfigurationRegistry();

/**
 * Type alias for export
 */
export type { MechConfigurationRegistry };
