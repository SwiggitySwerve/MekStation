import { MechLocation } from '@/types/construction';

import { LocationPosition } from './MechSilhouette.types';

export function getLocationCenter(pos: LocationPosition): {
  x: number;
  y: number;
} {
  return {
    x: pos.x + pos.width / 2,
    y: pos.y + pos.height / 2,
  };
}

export function getTorsoSplit(
  pos: LocationPosition,
  frontRatio: number = 0.7,
): { front: LocationPosition; rear: LocationPosition } {
  const frontHeight = pos.height * frontRatio;
  const rearHeight = pos.height * (1 - frontRatio);

  return {
    front: {
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: frontHeight,
    },
    rear: {
      x: pos.x,
      y: pos.y + frontHeight,
      width: pos.width,
      height: rearHeight,
    },
  };
}

export const TORSO_LOCATIONS = [
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
] as const;

export function hasTorsoRear(location: MechLocation): boolean {
  return TORSO_LOCATIONS.includes(location as (typeof TORSO_LOCATIONS)[number]);
}
