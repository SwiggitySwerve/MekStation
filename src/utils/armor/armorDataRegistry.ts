/**
 * Armor Data Registry
 *
 * Provides a centralized registry for sample armor data by mech configuration type.
 * This eliminates the need for switch statements when adding new configuration types.
 *
 * @module utils/armor/armorDataRegistry
 */

import { MechLocation } from '@/types/construction';
import { LocationArmorData } from '@/components/customizer/armor/ArmorDiagram';
import { MechConfigType } from '@/components/customizer/armor/shared/layout/useResolvedLayout';

/**
 * Sample armor data for biped mechs
 */
const SAMPLE_BIPED_ARMOR_DATA: LocationArmorData[] = [
  { location: MechLocation.HEAD, current: 9, maximum: 9 },
  { location: MechLocation.CENTER_TORSO, current: 35, maximum: 47, rear: 12, rearMaximum: 23 },
  { location: MechLocation.LEFT_TORSO, current: 24, maximum: 32, rear: 8, rearMaximum: 16 },
  { location: MechLocation.RIGHT_TORSO, current: 24, maximum: 32, rear: 8, rearMaximum: 16 },
  { location: MechLocation.LEFT_ARM, current: 20, maximum: 24 },
  { location: MechLocation.RIGHT_ARM, current: 20, maximum: 24 },
  { location: MechLocation.LEFT_LEG, current: 28, maximum: 32 },
  { location: MechLocation.RIGHT_LEG, current: 28, maximum: 32 },
];

/**
 * Sample armor data for quad mechs
 */
const SAMPLE_QUAD_ARMOR_DATA: LocationArmorData[] = [
  { location: MechLocation.HEAD, current: 9, maximum: 9 },
  { location: MechLocation.CENTER_TORSO, current: 38, maximum: 50, rear: 14, rearMaximum: 25 },
  { location: MechLocation.LEFT_TORSO, current: 26, maximum: 34, rear: 10, rearMaximum: 17 },
  { location: MechLocation.RIGHT_TORSO, current: 26, maximum: 34, rear: 10, rearMaximum: 17 },
  { location: MechLocation.FRONT_LEFT_LEG, current: 22, maximum: 28 },
  { location: MechLocation.FRONT_RIGHT_LEG, current: 22, maximum: 28 },
  { location: MechLocation.REAR_LEFT_LEG, current: 22, maximum: 28 },
  { location: MechLocation.REAR_RIGHT_LEG, current: 22, maximum: 28 },
];

/**
 * Sample armor data for tripod mechs
 */
const SAMPLE_TRIPOD_ARMOR_DATA: LocationArmorData[] = [
  { location: MechLocation.HEAD, current: 9, maximum: 9 },
  { location: MechLocation.CENTER_TORSO, current: 40, maximum: 52, rear: 15, rearMaximum: 26 },
  { location: MechLocation.LEFT_TORSO, current: 28, maximum: 36, rear: 10, rearMaximum: 18 },
  { location: MechLocation.RIGHT_TORSO, current: 28, maximum: 36, rear: 10, rearMaximum: 18 },
  { location: MechLocation.LEFT_ARM, current: 22, maximum: 26 },
  { location: MechLocation.RIGHT_ARM, current: 22, maximum: 26 },
  { location: MechLocation.LEFT_LEG, current: 26, maximum: 32 },
  { location: MechLocation.RIGHT_LEG, current: 26, maximum: 32 },
  { location: MechLocation.CENTER_LEG, current: 30, maximum: 36 },
];

/**
 * Sample armor data for LAM mechs
 */
const SAMPLE_LAM_ARMOR_DATA: LocationArmorData[] = [
  { location: MechLocation.HEAD, current: 8, maximum: 9 },
  { location: MechLocation.CENTER_TORSO, current: 28, maximum: 35, rear: 10, rearMaximum: 17 },
  { location: MechLocation.LEFT_TORSO, current: 20, maximum: 26, rear: 7, rearMaximum: 13 },
  { location: MechLocation.RIGHT_TORSO, current: 20, maximum: 26, rear: 7, rearMaximum: 13 },
  { location: MechLocation.LEFT_ARM, current: 16, maximum: 20 },
  { location: MechLocation.RIGHT_ARM, current: 16, maximum: 20 },
  { location: MechLocation.LEFT_LEG, current: 22, maximum: 26 },
  { location: MechLocation.RIGHT_LEG, current: 22, maximum: 26 },
];

/**
 * Sample armor data for QuadVee mechs
 */
const SAMPLE_QUADVEE_ARMOR_DATA: LocationArmorData[] = [
  { location: MechLocation.HEAD, current: 9, maximum: 9 },
  { location: MechLocation.CENTER_TORSO, current: 42, maximum: 54, rear: 16, rearMaximum: 27 },
  { location: MechLocation.LEFT_TORSO, current: 28, maximum: 36, rear: 11, rearMaximum: 18 },
  { location: MechLocation.RIGHT_TORSO, current: 28, maximum: 36, rear: 11, rearMaximum: 18 },
  { location: MechLocation.FRONT_LEFT_LEG, current: 24, maximum: 30 },
  { location: MechLocation.FRONT_RIGHT_LEG, current: 24, maximum: 30 },
  { location: MechLocation.REAR_LEFT_LEG, current: 24, maximum: 30 },
  { location: MechLocation.REAR_RIGHT_LEG, current: 24, maximum: 30 },
];

/**
 * Registry mapping mech configuration types to their sample armor data.
 * To add a new configuration type, simply add a new entry to this registry.
 */
export const ARMOR_DATA_REGISTRY: Record<MechConfigType, LocationArmorData[]> = {
  biped: SAMPLE_BIPED_ARMOR_DATA,
  quad: SAMPLE_QUAD_ARMOR_DATA,
  tripod: SAMPLE_TRIPOD_ARMOR_DATA,
  lam: SAMPLE_LAM_ARMOR_DATA,
  quadvee: SAMPLE_QUADVEE_ARMOR_DATA,
};

/**
 * Get sample armor data for a given mech configuration type.
 * Returns biped data as default if the configuration type is not found.
 *
 * @param configType - The mech configuration type
 * @returns Sample armor data for the configuration
 */
export function getSampleArmorData(configType: MechConfigType): LocationArmorData[] {
  return ARMOR_DATA_REGISTRY[configType] ?? ARMOR_DATA_REGISTRY.biped;
}

/**
 * Export individual sample data arrays for backward compatibility
 */
export {
  SAMPLE_BIPED_ARMOR_DATA,
  SAMPLE_QUAD_ARMOR_DATA,
  SAMPLE_TRIPOD_ARMOR_DATA,
  SAMPLE_LAM_ARMOR_DATA,
  SAMPLE_QUADVEE_ARMOR_DATA,
};
