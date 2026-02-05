/**
 * Equipment Placement Rules
 *
 * Defines location restrictions and placement rules for equipment.
 *
 * @spec openspec/specs/equipment-placement/spec.md
 */

import { MechLocation } from '../construction/CriticalSlotAllocation';
import { WeaponCategory } from './weapons';

/**
 * Location restriction types
 */
export enum LocationRestriction {
  NONE = 'None', // Can be placed anywhere
  ARM_ONLY = 'Arm Only', // Arms only
  TORSO_ONLY = 'Torso Only', // CT, LT, RT only
  LEG_ONLY = 'Leg Only', // Legs only
  HEAD_ONLY = 'Head Only', // Head only
  NOT_HEAD = 'Not Head', // Anywhere except head
  NOT_LEGS = 'Not Legs', // Anywhere except legs
  NOT_ARMS = 'Not Arms', // Anywhere except arms
  CENTER_TORSO = 'Center Torso', // CT only
  SIDE_TORSO = 'Side Torso', // LT or RT only
  TORSO_OR_LEG = 'Torso or Leg', // CT, LT, RT, LL, RL (for jump jets)
  FRONT_ONLY = 'Front Only', // Front-facing locations
}

/**
 * Equipment placement rule
 */
export interface EquipmentPlacementRule {
  readonly equipmentId: string;
  readonly restriction: LocationRestriction;
  readonly mustBeContiguous: boolean;
  readonly canSplit: boolean;
  readonly maxPerLocation: number;
  readonly requiredLocations?: MechLocation[];
  readonly forbiddenLocations?: MechLocation[];
}

/**
 * Standard placement rules
 */
export const PLACEMENT_RULES: readonly EquipmentPlacementRule[] = [
  // ECM must be in torso
  {
    equipmentId: 'guardian-ecm',
    restriction: LocationRestriction.TORSO_ONLY,
    mustBeContiguous: true,
    canSplit: false,
    maxPerLocation: 1,
  },
  // C3 Master can't be in head
  {
    equipmentId: 'c3-master',
    restriction: LocationRestriction.NOT_HEAD,
    mustBeContiguous: true,
    canSplit: false,
    maxPerLocation: 1,
  },
  // Beagle must be in torso
  {
    equipmentId: 'beagle-probe',
    restriction: LocationRestriction.TORSO_ONLY,
    mustBeContiguous: true,
    canSplit: false,
    maxPerLocation: 1,
  },
  // CASE goes in torso with ammo
  {
    equipmentId: 'case',
    restriction: LocationRestriction.SIDE_TORSO,
    mustBeContiguous: false,
    canSplit: false,
    maxPerLocation: 1,
  },
  // Jump Jets - can only go in torsos and legs
  {
    equipmentId: 'jump-jet-light',
    restriction: LocationRestriction.TORSO_OR_LEG,
    mustBeContiguous: false,
    canSplit: false,
    maxPerLocation: 6,
  },
  {
    equipmentId: 'jump-jet-medium',
    restriction: LocationRestriction.TORSO_OR_LEG,
    mustBeContiguous: false,
    canSplit: false,
    maxPerLocation: 6,
  },
  {
    equipmentId: 'jump-jet-heavy',
    restriction: LocationRestriction.TORSO_OR_LEG,
    mustBeContiguous: false,
    canSplit: false,
    maxPerLocation: 6,
  },
  {
    equipmentId: 'improved-jump-jet-light',
    restriction: LocationRestriction.TORSO_OR_LEG,
    mustBeContiguous: false,
    canSplit: false,
    maxPerLocation: 3, // 2 slots each
  },
  {
    equipmentId: 'improved-jump-jet-medium',
    restriction: LocationRestriction.TORSO_OR_LEG,
    mustBeContiguous: false,
    canSplit: false,
    maxPerLocation: 3,
  },
  {
    equipmentId: 'improved-jump-jet-heavy',
    restriction: LocationRestriction.TORSO_OR_LEG,
    mustBeContiguous: false,
    canSplit: false,
    maxPerLocation: 3,
  },
] as const;

/**
 * Get placement rule for equipment
 */
export function getPlacementRule(
  equipmentId: string,
): EquipmentPlacementRule | undefined {
  return PLACEMENT_RULES.find((r) => r.equipmentId === equipmentId);
}

/**
 * Check if location is valid for equipment
 */
export function isValidLocationForEquipment(
  equipmentId: string,
  location: MechLocation,
  restriction?: LocationRestriction,
): boolean {
  const rule = getPlacementRule(equipmentId);

  // Check forbiddenLocations first
  if (rule?.forbiddenLocations?.includes(location)) {
    return false;
  }

  const actualRestriction =
    restriction ?? rule?.restriction ?? LocationRestriction.NONE;

  switch (actualRestriction) {
    case LocationRestriction.NONE:
      return true;

    case LocationRestriction.ARM_ONLY:
      return (
        location === MechLocation.LEFT_ARM ||
        location === MechLocation.RIGHT_ARM
      );

    case LocationRestriction.TORSO_ONLY:
      return [
        MechLocation.CENTER_TORSO,
        MechLocation.LEFT_TORSO,
        MechLocation.RIGHT_TORSO,
      ].includes(location);

    case LocationRestriction.LEG_ONLY:
      return (
        location === MechLocation.LEFT_LEG ||
        location === MechLocation.RIGHT_LEG
      );

    case LocationRestriction.HEAD_ONLY:
      return location === MechLocation.HEAD;

    case LocationRestriction.NOT_HEAD:
      return location !== MechLocation.HEAD;

    case LocationRestriction.NOT_LEGS:
      return (
        location !== MechLocation.LEFT_LEG &&
        location !== MechLocation.RIGHT_LEG
      );

    case LocationRestriction.NOT_ARMS:
      return (
        location !== MechLocation.LEFT_ARM &&
        location !== MechLocation.RIGHT_ARM
      );

    case LocationRestriction.TORSO_OR_LEG:
      return [
        MechLocation.CENTER_TORSO,
        MechLocation.LEFT_TORSO,
        MechLocation.RIGHT_TORSO,
        MechLocation.LEFT_LEG,
        MechLocation.RIGHT_LEG,
      ].includes(location);

    case LocationRestriction.CENTER_TORSO:
      return location === MechLocation.CENTER_TORSO;

    case LocationRestriction.SIDE_TORSO:
      return (
        location === MechLocation.LEFT_TORSO ||
        location === MechLocation.RIGHT_TORSO
      );

    case LocationRestriction.FRONT_ONLY:
      // Arms and legs are "front" facing
      return location !== MechLocation.CENTER_TORSO;

    default:
      return true;
  }
}

/**
 * Split equipment rules
 * Some equipment can be split across locations (like XL engine)
 */
export interface SplitEquipmentRule {
  readonly equipmentId: string;
  readonly totalSlots: number;
  readonly canSplitAcross: MechLocation[];
  readonly minimumSlotsPerLocation: number;
  readonly maximumLocations: number;
}

/**
 * Standard split equipment rules
 */
export const SPLIT_EQUIPMENT_RULES: readonly SplitEquipmentRule[] = [
  // Endo Steel (IS) - 14 slots, can go anywhere
  {
    equipmentId: 'endo-steel-is',
    totalSlots: 14,
    canSplitAcross: Object.values(MechLocation) as MechLocation[],
    minimumSlotsPerLocation: 1,
    maximumLocations: 8,
  },
  // Endo Steel (Clan) - 7 slots
  {
    equipmentId: 'endo-steel-clan',
    totalSlots: 7,
    canSplitAcross: Object.values(MechLocation) as MechLocation[],
    minimumSlotsPerLocation: 1,
    maximumLocations: 7,
  },
  // Ferro-Fibrous (IS) - 14 slots
  {
    equipmentId: 'ferro-fibrous-is',
    totalSlots: 14,
    canSplitAcross: Object.values(MechLocation) as MechLocation[],
    minimumSlotsPerLocation: 1,
    maximumLocations: 8,
  },
  // Ferro-Fibrous (Clan) - 7 slots
  {
    equipmentId: 'ferro-fibrous-clan',
    totalSlots: 7,
    canSplitAcross: Object.values(MechLocation) as MechLocation[],
    minimumSlotsPerLocation: 1,
    maximumLocations: 7,
  },
] as const;

/**
 * Get split equipment rule
 */
export function getSplitEquipmentRule(
  equipmentId: string,
): SplitEquipmentRule | undefined {
  return SPLIT_EQUIPMENT_RULES.find((r) => r.equipmentId === equipmentId);
}

/**
 * Validate split equipment allocation
 */
export function validateSplitAllocation(
  equipmentId: string,
  allocation: Record<MechLocation, number>,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const rule = getSplitEquipmentRule(equipmentId);

  if (!rule) {
    // Not a split equipment, use standard rules
    return { isValid: true, errors };
  }

  // Check total slots
  const totalAllocated = Object.values(allocation).reduce(
    (sum, slots) => sum + slots,
    0,
  );
  if (totalAllocated !== rule.totalSlots) {
    errors.push(
      `${equipmentId} requires exactly ${rule.totalSlots} slots (allocated ${totalAllocated})`,
    );
  }

  // Check valid locations
  for (const [location, slots] of Object.entries(allocation)) {
    if (slots > 0 && !rule.canSplitAcross.includes(location as MechLocation)) {
      errors.push(`${equipmentId} cannot be placed in ${location}`);
    }
    if (slots > 0 && slots < rule.minimumSlotsPerLocation) {
      errors.push(
        `${equipmentId} requires at least ${rule.minimumSlotsPerLocation} slots per location`,
      );
    }
  }

  // Check number of locations used
  const locationsUsed = Object.values(allocation).filter(
    (slots) => slots > 0,
  ).length;
  if (locationsUsed > rule.maximumLocations) {
    errors.push(
      `${equipmentId} can only span ${rule.maximumLocations} locations (using ${locationsUsed})`,
    );
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Arm-mounted weapon restrictions
 */
export function validateArmWeaponPlacement(
  weaponCategory: WeaponCategory,
  location: MechLocation,
  hasLowerArmActuator: boolean,
  _hasHandActuator: boolean,
): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Only check for arm locations
  if (
    location !== MechLocation.LEFT_ARM &&
    location !== MechLocation.RIGHT_ARM
  ) {
    return { isValid: true, warnings };
  }

  // Physical weapons have stricter requirements (handled in PhysicalWeaponTypes)
  if (weaponCategory === WeaponCategory.PHYSICAL) {
    // Let the physical weapon validation handle this
    return { isValid: true, warnings };
  }

  // Energy and ballistic weapons can flip when lower arm actuator removed
  if (!hasLowerArmActuator) {
    warnings.push('Arm can flip to rear arc without lower arm actuator');
  }

  return { isValid: true, warnings };
}
