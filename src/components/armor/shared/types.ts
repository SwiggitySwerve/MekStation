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
 * Short labels for locations (all configurations)
 */
export const LOCATION_SHORT_LABELS: Record<MechLocation, string> = {
  // Universal
  [MechLocation.HEAD]: 'HD',
  [MechLocation.CENTER_TORSO]: 'CT',
  [MechLocation.LEFT_TORSO]: 'LT',
  [MechLocation.RIGHT_TORSO]: 'RT',
  // Biped/Tripod/LAM
  [MechLocation.LEFT_ARM]: 'LA',
  [MechLocation.RIGHT_ARM]: 'RA',
  [MechLocation.LEFT_LEG]: 'LL',
  [MechLocation.RIGHT_LEG]: 'RL',
  // Tripod
  [MechLocation.CENTER_LEG]: 'CL',
  // Quad/QuadVee
  [MechLocation.FRONT_LEFT_LEG]: 'FLL',
  [MechLocation.FRONT_RIGHT_LEG]: 'FRL',
  [MechLocation.REAR_LEFT_LEG]: 'RLL',
  [MechLocation.REAR_RIGHT_LEG]: 'RRL',
  // LAM Fighter
  [MechLocation.NOSE]: 'NOS',
  [MechLocation.LEFT_WING]: 'LW',
  [MechLocation.RIGHT_WING]: 'RW',
  [MechLocation.AFT]: 'AFT',
  [MechLocation.FUSELAGE]: 'FUS',
};

// Re-export UI components from separate TSX file
export { ArmorStatusLegend, ArmorDiagramInstructions } from './ArmorStatusLegend';