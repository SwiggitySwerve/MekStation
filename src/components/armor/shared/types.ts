// src/components/armor/shared/types.ts
import { MechLocation } from '@/types/construction';

/**
 * Armor data for a single location
 */
export interface LocationArmorData {
  location: MechLocation;
  current: number;
  maximum: number;
  rear?: number;
  rearMaximum?: number;
}

/**
 * Props shared by all armor diagram modes
 */
export interface ArmorDiagramBaseProps {
  armorData: LocationArmorData[];
  selectedLocation: MechLocation | null;
  unallocatedPoints: number;
  onLocationClick: (location: MechLocation) => void;
  onAutoAllocate?: () => void;
  className?: string;
}

/**
 * Locations that have rear armor (torsos only)
 */
export const TORSO_LOCATIONS: readonly MechLocation[] = [
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
] as const;

/**
 * Check if a location has rear armor
 */
export function hasRearArmor(location: MechLocation): boolean {
  return TORSO_LOCATIONS.includes(location);
}

/**
 * All mech locations in anatomical order (top to bottom, left to right)
 */
export const MECH_LOCATIONS_ORDERED: readonly MechLocation[] = [
  MechLocation.HEAD,
  MechLocation.LEFT_TORSO,
  MechLocation.CENTER_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
] as const;

/**
 * Short labels for locations
 */
export const LOCATION_SHORT_LABELS: Record<MechLocation, string> = {
  [MechLocation.HEAD]: 'HD',
  [MechLocation.CENTER_TORSO]: 'CT',
  [MechLocation.LEFT_TORSO]: 'LT',
  [MechLocation.RIGHT_TORSO]: 'RT',
  [MechLocation.LEFT_ARM]: 'LA',
  [MechLocation.RIGHT_ARM]: 'RA',
  [MechLocation.LEFT_LEG]: 'LL',
  [MechLocation.RIGHT_LEG]: 'RL',
};
