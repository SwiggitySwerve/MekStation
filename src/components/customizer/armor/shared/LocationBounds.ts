import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { MechConfiguration } from '@/services/assets/MmDataAssetService';

export interface LocationBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  path?: string;
}

export const BIPED_LOCATION_BOUNDS: Record<string, LocationBounds> = {
  [MechLocation.HEAD]: { x: 285, y: 90, width: 42, height: 35 },
  [MechLocation.CENTER_TORSO]: { x: 270, y: 130, width: 72, height: 90 },
  [MechLocation.LEFT_TORSO]: { x: 200, y: 130, width: 65, height: 90 },
  [MechLocation.RIGHT_TORSO]: { x: 347, y: 130, width: 65, height: 90 },
  [MechLocation.LEFT_ARM]: { x: 145, y: 100, width: 50, height: 120 },
  [MechLocation.RIGHT_ARM]: { x: 417, y: 100, width: 50, height: 120 },
  [MechLocation.LEFT_LEG]: { x: 220, y: 225, width: 55, height: 110 },
  [MechLocation.RIGHT_LEG]: { x: 337, y: 225, width: 55, height: 110 },
};

export const QUAD_LOCATION_BOUNDS: Record<string, LocationBounds> = {
  [MechLocation.HEAD]: { x: 285, y: 70, width: 42, height: 35 },
  [MechLocation.CENTER_TORSO]: { x: 260, y: 110, width: 92, height: 70 },
  [MechLocation.LEFT_TORSO]: { x: 180, y: 110, width: 75, height: 70 },
  [MechLocation.RIGHT_TORSO]: { x: 357, y: 110, width: 75, height: 70 },
  [MechLocation.FRONT_LEFT_LEG]: { x: 160, y: 185, width: 55, height: 100 },
  [MechLocation.FRONT_RIGHT_LEG]: { x: 397, y: 185, width: 55, height: 100 },
  [MechLocation.REAR_LEFT_LEG]: { x: 200, y: 185, width: 55, height: 100 },
  [MechLocation.REAR_RIGHT_LEG]: { x: 357, y: 185, width: 55, height: 100 },
};

export const TRIPOD_LOCATION_BOUNDS: Record<string, LocationBounds> = {
  [MechLocation.HEAD]: { x: 285, y: 80, width: 42, height: 35 },
  [MechLocation.CENTER_TORSO]: { x: 265, y: 120, width: 82, height: 80 },
  [MechLocation.LEFT_TORSO]: { x: 190, y: 120, width: 70, height: 80 },
  [MechLocation.RIGHT_TORSO]: { x: 352, y: 120, width: 70, height: 80 },
  [MechLocation.LEFT_ARM]: { x: 135, y: 90, width: 50, height: 110 },
  [MechLocation.RIGHT_ARM]: { x: 427, y: 90, width: 50, height: 110 },
  [MechLocation.LEFT_LEG]: { x: 195, y: 205, width: 55, height: 100 },
  [MechLocation.RIGHT_LEG]: { x: 362, y: 205, width: 55, height: 100 },
  [MechLocation.CENTER_LEG]: { x: 278, y: 205, width: 55, height: 100 },
};

export const LAM_LOCATION_BOUNDS = BIPED_LOCATION_BOUNDS;
export const QUADVEE_LOCATION_BOUNDS = QUAD_LOCATION_BOUNDS;

export function getLocationBoundsForConfiguration(
  config: MechConfiguration
): Record<string, LocationBounds> {
  switch (config) {
    case MechConfiguration.BIPED:
      return BIPED_LOCATION_BOUNDS;
    case MechConfiguration.QUAD:
      return QUAD_LOCATION_BOUNDS;
    case MechConfiguration.TRIPOD:
      return TRIPOD_LOCATION_BOUNDS;
    case MechConfiguration.LAM:
      return LAM_LOCATION_BOUNDS;
    case MechConfiguration.QUADVEE:
      return QUADVEE_LOCATION_BOUNDS;
    default:
      return BIPED_LOCATION_BOUNDS;
  }
}

export function getLocationBounds(
  config: MechConfiguration,
  location: MechLocation | string
): LocationBounds | undefined {
  const bounds = getLocationBoundsForConfiguration(config);
  return bounds[location];
}
