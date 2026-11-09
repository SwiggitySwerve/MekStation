/**
 * Armor Allocation Types
 *
 * Per-location armor allocation for BattleMechs.
 * Supports all mech configurations: Biped, Quad, Tripod, LAM, QuadVee.
 *
 * @spec openspec/specs/construction-rules-core/spec.md
 */

import { MechConfiguration } from '../unit/BattleMechInterfaces';
import { MechLocation } from './CriticalSlotAllocation';

/**
 * Per-location armor allocation
 * Stores armor points assigned to each location (front and rear for torsos)
 * Supports all mech configurations: Biped, Quad, Tripod, LAM, QuadVee
 */
export interface IArmorAllocation {
  /** Index signature allowing any MechLocation key */
  [key: string]: number;

  // === Universal locations (all configurations) ===
  /** Head armor points */
  [MechLocation.HEAD]: number;
  /** Center Torso front armor points */
  [MechLocation.CENTER_TORSO]: number;
  /** Center Torso rear armor points */
  centerTorsoRear: number;
  /** Left Torso front armor points */
  [MechLocation.LEFT_TORSO]: number;
  /** Left Torso rear armor points */
  leftTorsoRear: number;
  /** Right Torso front armor points */
  [MechLocation.RIGHT_TORSO]: number;
  /** Right Torso rear armor points */
  rightTorsoRear: number;

  // === Biped/Tripod/LAM arm locations ===
  /** Left Arm armor points */
  [MechLocation.LEFT_ARM]: number;
  /** Right Arm armor points */
  [MechLocation.RIGHT_ARM]: number;

  // === Biped/Tripod/LAM leg locations ===
  /** Left Leg armor points */
  [MechLocation.LEFT_LEG]: number;
  /** Right Leg armor points */
  [MechLocation.RIGHT_LEG]: number;

  // === Tripod-specific location ===
  /** Center Leg armor points (Tripod only) */
  [MechLocation.CENTER_LEG]: number;

  // === Quad/QuadVee-specific locations ===
  /** Front Left Leg armor points (Quad/QuadVee only) */
  [MechLocation.FRONT_LEFT_LEG]: number;
  /** Front Right Leg armor points (Quad/QuadVee only) */
  [MechLocation.FRONT_RIGHT_LEG]: number;
  /** Rear Left Leg armor points (Quad/QuadVee only) */
  [MechLocation.REAR_LEFT_LEG]: number;
  /** Rear Right Leg armor points (Quad/QuadVee only) */
  [MechLocation.REAR_RIGHT_LEG]: number;
}

/**
 * Create empty armor allocation (all zeros)
 * Includes all possible locations for all mech configurations
 */
export function createEmptyArmorAllocation(): IArmorAllocation {
  return {
    // Universal locations
    [MechLocation.HEAD]: 0,
    [MechLocation.CENTER_TORSO]: 0,
    centerTorsoRear: 0,
    [MechLocation.LEFT_TORSO]: 0,
    leftTorsoRear: 0,
    [MechLocation.RIGHT_TORSO]: 0,
    rightTorsoRear: 0,
    // Biped/Tripod/LAM locations
    [MechLocation.LEFT_ARM]: 0,
    [MechLocation.RIGHT_ARM]: 0,
    [MechLocation.LEFT_LEG]: 0,
    [MechLocation.RIGHT_LEG]: 0,
    // Tripod-specific
    [MechLocation.CENTER_LEG]: 0,
    // Quad/QuadVee-specific
    [MechLocation.FRONT_LEFT_LEG]: 0,
    [MechLocation.FRONT_RIGHT_LEG]: 0,
    [MechLocation.REAR_LEFT_LEG]: 0,
    [MechLocation.REAR_RIGHT_LEG]: 0,
  };
}

/**
 * Calculate total allocated armor points from allocation based on configuration
 * Uses the configuration to determine which locations to include
 */
export function getTotalAllocatedArmor(
  allocation: IArmorAllocation,
  configuration?: MechConfiguration,
): number {
  return armorLocationsForConfiguration(configuration).reduce<number>(
    (total, location) => total + (allocation[location] || 0),
    0,
  );
}

type ArmorLocation = keyof IArmorAllocation;

const CORE_ARMOR_LOCATIONS: readonly ArmorLocation[] = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  'centerTorsoRear',
  MechLocation.LEFT_TORSO,
  'leftTorsoRear',
  MechLocation.RIGHT_TORSO,
  'rightTorsoRear',
];

const STANDARD_LIMB_ARMOR_LOCATIONS: readonly ArmorLocation[] = [
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
];

const QUAD_LIMB_ARMOR_LOCATIONS: readonly ArmorLocation[] = [
  MechLocation.FRONT_LEFT_LEG,
  MechLocation.FRONT_RIGHT_LEG,
  MechLocation.REAR_LEFT_LEG,
  MechLocation.REAR_RIGHT_LEG,
];

const TRIPOD_LIMB_ARMOR_LOCATIONS: readonly ArmorLocation[] = [
  ...STANDARD_LIMB_ARMOR_LOCATIONS,
  MechLocation.CENTER_LEG,
];

function armorLocationsForConfiguration(
  configuration?: MechConfiguration,
): readonly ArmorLocation[] {
  if (
    configuration === MechConfiguration.QUAD ||
    configuration === MechConfiguration.QUADVEE
  ) {
    return [...CORE_ARMOR_LOCATIONS, ...QUAD_LIMB_ARMOR_LOCATIONS];
  }

  if (configuration === MechConfiguration.TRIPOD) {
    return [...CORE_ARMOR_LOCATIONS, ...TRIPOD_LIMB_ARMOR_LOCATIONS];
  }

  return [...CORE_ARMOR_LOCATIONS, ...STANDARD_LIMB_ARMOR_LOCATIONS];
}
