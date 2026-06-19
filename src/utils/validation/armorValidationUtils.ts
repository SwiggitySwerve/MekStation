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

type ArmorSpecKind = 'standard' | 'frontTorso' | 'rearTorso';

interface ArmorLocationSpec {
  readonly key: string;
  readonly displayName: string;
  readonly locationKey: MechLocation | string;
  readonly allocationKey: MechLocation | string;
  readonly kind?: ArmorSpecKind;
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

const UNIVERSAL_ARMOR_SPECS: readonly ArmorLocationSpec[] = [
  {
    key: 'head',
    displayName: 'Head',
    locationKey: 'head',
    allocationKey: MechLocation.HEAD,
  },
  {
    key: 'centerTorso',
    displayName: 'Center Torso',
    locationKey: 'centerTorso',
    allocationKey: MechLocation.CENTER_TORSO,
    kind: 'frontTorso',
  },
  {
    key: 'centerTorsoRear',
    displayName: 'Center Torso (Rear)',
    locationKey: 'centerTorso',
    allocationKey: 'centerTorsoRear',
    kind: 'rearTorso',
  },
  {
    key: 'leftTorso',
    displayName: 'Left Torso',
    locationKey: 'leftTorso',
    allocationKey: MechLocation.LEFT_TORSO,
    kind: 'frontTorso',
  },
  {
    key: 'leftTorsoRear',
    displayName: 'Left Torso (Rear)',
    locationKey: 'leftTorso',
    allocationKey: 'leftTorsoRear',
    kind: 'rearTorso',
  },
  {
    key: 'rightTorso',
    displayName: 'Right Torso',
    locationKey: 'rightTorso',
    allocationKey: MechLocation.RIGHT_TORSO,
    kind: 'frontTorso',
  },
  {
    key: 'rightTorsoRear',
    displayName: 'Right Torso (Rear)',
    locationKey: 'rightTorso',
    allocationKey: 'rightTorsoRear',
    kind: 'rearTorso',
  },
];

const STANDARD_LIMB_SPECS: readonly ArmorLocationSpec[] = [
  {
    key: 'leftArm',
    displayName: 'Left Arm',
    locationKey: 'leftArm',
    allocationKey: MechLocation.LEFT_ARM,
  },
  {
    key: 'rightArm',
    displayName: 'Right Arm',
    locationKey: 'rightArm',
    allocationKey: MechLocation.RIGHT_ARM,
  },
  {
    key: 'leftLeg',
    displayName: 'Left Leg',
    locationKey: 'leftLeg',
    allocationKey: MechLocation.LEFT_LEG,
  },
  {
    key: 'rightLeg',
    displayName: 'Right Leg',
    locationKey: 'rightLeg',
    allocationKey: MechLocation.RIGHT_LEG,
  },
];

const QUAD_LIMB_SPECS: readonly ArmorLocationSpec[] = [
  {
    key: 'frontLeftLeg',
    displayName: 'Front Left Leg',
    locationKey: MechLocation.FRONT_LEFT_LEG,
    allocationKey: MechLocation.FRONT_LEFT_LEG,
  },
  {
    key: 'frontRightLeg',
    displayName: 'Front Right Leg',
    locationKey: MechLocation.FRONT_RIGHT_LEG,
    allocationKey: MechLocation.FRONT_RIGHT_LEG,
  },
  {
    key: 'rearLeftLeg',
    displayName: 'Rear Left Leg',
    locationKey: MechLocation.REAR_LEFT_LEG,
    allocationKey: MechLocation.REAR_LEFT_LEG,
  },
  {
    key: 'rearRightLeg',
    displayName: 'Rear Right Leg',
    locationKey: MechLocation.REAR_RIGHT_LEG,
    allocationKey: MechLocation.REAR_RIGHT_LEG,
  },
];

const TRIPOD_LIMB_SPECS: readonly ArmorLocationSpec[] = [
  ...STANDARD_LIMB_SPECS,
  {
    key: 'centerLeg',
    displayName: 'Center Leg',
    locationKey: MechLocation.CENTER_LEG,
    allocationKey: MechLocation.CENTER_LEG,
  },
];

const QUAD_CONFIGURATIONS = new Set<MechConfiguration>([
  MechConfiguration.QUAD,
  MechConfiguration.QUADVEE,
]);

function getLimbSpecs(
  configuration?: MechConfiguration,
): readonly ArmorLocationSpec[] {
  if (configuration === MechConfiguration.TRIPOD) {
    return TRIPOD_LIMB_SPECS;
  }

  return configuration && QUAD_CONFIGURATIONS.has(configuration)
    ? QUAD_LIMB_SPECS
    : STANDARD_LIMB_SPECS;
}

function applyArmorSpec(
  armorByLocation: IArmorByLocation,
  allocation: IArmorAllocationInput,
  tonnage: number,
  spec: ArmorLocationSpec,
): void {
  const current = allocation[spec.allocationKey] || 0;

  if (spec.kind === 'frontTorso') {
    addFrontTorsoLocation(
      armorByLocation,
      spec.key,
      spec.displayName,
      spec.locationKey,
      current,
      tonnage,
    );
    return;
  }

  if (spec.kind === 'rearTorso') {
    addRearTorsoLocation(
      armorByLocation,
      spec.key,
      spec.displayName,
      spec.locationKey,
      current,
      tonnage,
    );
    return;
  }

  addLocation(
    armorByLocation,
    spec.key,
    spec.displayName,
    spec.locationKey,
    current,
    tonnage,
  );
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

  for (const spec of [
    ...UNIVERSAL_ARMOR_SPECS,
    ...getLimbSpecs(configuration),
  ]) {
    applyArmorSpec(armorByLocation, allocation, tonnage, spec);
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
