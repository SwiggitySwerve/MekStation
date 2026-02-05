/**
 * Armor Validation Utilities
 *
 * Pure functions for building per-location armor data for validation.
 * Extracts armor calculation logic from useUnitValidation hook.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';
import {
  IArmorByLocation,
  IArmorLocationEntry,
} from '@/types/validation/UnitValidationInterfaces';
import { ARMOR_RATIOS } from '@/utils/armor/armorRatios';
import { getMaxArmorForLocation } from '@/utils/construction/armorCalculations';

/**
 * Armor allocation interface (per-location armor points)
 * Uses index signature to avoid circular dependency with unitState
 */
export interface IArmorAllocationInput {
  [key: string]: number;
}

/**
 * Standard front/rear armor distribution ratio (75/25 split)
 * Must match ArmorFills.tsx for consistent UI/validation behavior
 * @deprecated Use ARMOR_RATIOS from @/utils/armor/armorRatios instead
 */
export const FRONT_ARMOR_RATIO = ARMOR_RATIOS.FRONT;
export const REAR_ARMOR_RATIO = ARMOR_RATIOS.REAR;

/**
 * Add a non-torso location with full max armor
 */
function addLocation(
  armorByLocation: IArmorByLocation,
  key: string,
  displayName: string,
  locationKey: MechLocation | string,
  current: number,
  tonnage: number,
): void {
  const max = getMaxArmorForLocation(tonnage, locationKey as string);
  armorByLocation[key] = { current, max, displayName };
}

/**
 * Add front torso location with expected max (75% of total torso max)
 * This matches ArmorFills.tsx getTorsoFrontStatusColor calculation
 */
function addFrontTorsoLocation(
  armorByLocation: IArmorByLocation,
  key: string,
  displayName: string,
  torsoLocationKey: string,
  current: number,
  tonnage: number,
): void {
  const totalTorsoMax = getMaxArmorForLocation(tonnage, torsoLocationKey);
  const expectedFrontMax = Math.round(totalTorsoMax * FRONT_ARMOR_RATIO);
  armorByLocation[key] = { current, max: expectedFrontMax, displayName };
}

/**
 * Add rear torso location with expected max (25% of total torso max)
 * This matches ArmorFills.tsx getTorsoRearStatusColor calculation
 */
function addRearTorsoLocation(
  armorByLocation: IArmorByLocation,
  key: string,
  displayName: string,
  torsoLocationKey: string,
  current: number,
  tonnage: number,
): void {
  const totalTorsoMax = getMaxArmorForLocation(tonnage, torsoLocationKey);
  const expectedRearMax = Math.round(totalTorsoMax * REAR_ARMOR_RATIO);
  armorByLocation[key] = { current, max: expectedRearMax, displayName };
}

/**
 * Build per-location armor data based on mech configuration
 * Handles Biped, Quad, Tripod, LAM, and QuadVee configurations
 *
 * @param allocation - Current armor allocation from unit state
 * @param tonnage - Unit tonnage for calculating max armor
 * @param configuration - Mech configuration type
 * @returns Per-location armor data for validation
 */
export function buildArmorByLocation(
  allocation: IArmorAllocationInput,
  tonnage: number,
  configuration?: MechConfiguration,
): IArmorByLocation {
  const armorByLocation: IArmorByLocation = {};

  // Universal locations (all configurations have these)
  addLocation(
    armorByLocation,
    'head',
    'Head',
    'head',
    allocation[MechLocation.HEAD] || 0,
    tonnage,
  );
  addFrontTorsoLocation(
    armorByLocation,
    'centerTorso',
    'Center Torso',
    'centerTorso',
    allocation[MechLocation.CENTER_TORSO] || 0,
    tonnage,
  );
  addRearTorsoLocation(
    armorByLocation,
    'centerTorsoRear',
    'Center Torso (Rear)',
    'centerTorso',
    allocation.centerTorsoRear || 0,
    tonnage,
  );
  addFrontTorsoLocation(
    armorByLocation,
    'leftTorso',
    'Left Torso',
    'leftTorso',
    allocation[MechLocation.LEFT_TORSO] || 0,
    tonnage,
  );
  addRearTorsoLocation(
    armorByLocation,
    'leftTorsoRear',
    'Left Torso (Rear)',
    'leftTorso',
    allocation.leftTorsoRear || 0,
    tonnage,
  );
  addFrontTorsoLocation(
    armorByLocation,
    'rightTorso',
    'Right Torso',
    'rightTorso',
    allocation[MechLocation.RIGHT_TORSO] || 0,
    tonnage,
  );
  addRearTorsoLocation(
    armorByLocation,
    'rightTorsoRear',
    'Right Torso (Rear)',
    'rightTorso',
    allocation.rightTorsoRear || 0,
    tonnage,
  );

  // Configuration-specific limb locations
  if (
    configuration === MechConfiguration.QUAD ||
    configuration === MechConfiguration.QUADVEE
  ) {
    // Quad mechs have 4 legs, no arms
    addLocation(
      armorByLocation,
      'frontLeftLeg',
      'Front Left Leg',
      MechLocation.FRONT_LEFT_LEG,
      allocation[MechLocation.FRONT_LEFT_LEG] || 0,
      tonnage,
    );
    addLocation(
      armorByLocation,
      'frontRightLeg',
      'Front Right Leg',
      MechLocation.FRONT_RIGHT_LEG,
      allocation[MechLocation.FRONT_RIGHT_LEG] || 0,
      tonnage,
    );
    addLocation(
      armorByLocation,
      'rearLeftLeg',
      'Rear Left Leg',
      MechLocation.REAR_LEFT_LEG,
      allocation[MechLocation.REAR_LEFT_LEG] || 0,
      tonnage,
    );
    addLocation(
      armorByLocation,
      'rearRightLeg',
      'Rear Right Leg',
      MechLocation.REAR_RIGHT_LEG,
      allocation[MechLocation.REAR_RIGHT_LEG] || 0,
      tonnage,
    );
  } else if (configuration === MechConfiguration.TRIPOD) {
    // Tripod has arms + 3 legs (including center leg)
    addLocation(
      armorByLocation,
      'leftArm',
      'Left Arm',
      'leftArm',
      allocation[MechLocation.LEFT_ARM] || 0,
      tonnage,
    );
    addLocation(
      armorByLocation,
      'rightArm',
      'Right Arm',
      'rightArm',
      allocation[MechLocation.RIGHT_ARM] || 0,
      tonnage,
    );
    addLocation(
      armorByLocation,
      'leftLeg',
      'Left Leg',
      'leftLeg',
      allocation[MechLocation.LEFT_LEG] || 0,
      tonnage,
    );
    addLocation(
      armorByLocation,
      'rightLeg',
      'Right Leg',
      'rightLeg',
      allocation[MechLocation.RIGHT_LEG] || 0,
      tonnage,
    );
    addLocation(
      armorByLocation,
      'centerLeg',
      'Center Leg',
      MechLocation.CENTER_LEG,
      allocation[MechLocation.CENTER_LEG] || 0,
      tonnage,
    );
  } else {
    // Biped/LAM/default: standard arms + legs
    addLocation(
      armorByLocation,
      'leftArm',
      'Left Arm',
      'leftArm',
      allocation[MechLocation.LEFT_ARM] || 0,
      tonnage,
    );
    addLocation(
      armorByLocation,
      'rightArm',
      'Right Arm',
      'rightArm',
      allocation[MechLocation.RIGHT_ARM] || 0,
      tonnage,
    );
    addLocation(
      armorByLocation,
      'leftLeg',
      'Left Leg',
      'leftLeg',
      allocation[MechLocation.LEFT_LEG] || 0,
      tonnage,
    );
    addLocation(
      armorByLocation,
      'rightLeg',
      'Right Leg',
      'rightLeg',
      allocation[MechLocation.RIGHT_LEG] || 0,
      tonnage,
    );
  }

  return armorByLocation;
}

/**
 * Get the expected max armor for a torso location (front or rear)
 * based on the standard 75/25 distribution
 *
 * @param tonnage - Unit tonnage
 * @param torsoLocationKey - The torso location key (e.g., 'centerTorso')
 * @param isFront - Whether this is the front (true) or rear (false) location
 * @returns Expected max armor for that side
 */
export function getExpectedTorsoArmorMax(
  tonnage: number,
  torsoLocationKey: string,
  isFront: boolean,
): number {
  const totalTorsoMax = getMaxArmorForLocation(tonnage, torsoLocationKey);
  return isFront
    ? Math.round(totalTorsoMax * FRONT_ARMOR_RATIO)
    : Math.round(totalTorsoMax * REAR_ARMOR_RATIO);
}

/**
 * Create a single armor location entry
 *
 * @param current - Current armor points
 * @param max - Maximum armor points
 * @param displayName - Display name for the location
 * @returns Armor location entry
 */
export function createArmorLocationEntry(
  current: number,
  max: number,
  displayName: string,
): IArmorLocationEntry {
  return { current, max, displayName };
}
