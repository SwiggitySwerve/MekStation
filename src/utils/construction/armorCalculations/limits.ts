import { getLocationsForConfig } from '@/types/construction/MechConfigurationSystem';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

import { getStructurePoints } from '../../../types/construction/InternalStructureType';

export const MAX_HEAD_ARMOR = 9;

export function getMaxArmorForLocation(
  tonnage: number,
  location: string,
): number {
  const normalizedLocation = location.toLowerCase();
  if (normalizedLocation.includes('head')) {
    return MAX_HEAD_ARMOR;
  }
  const structurePoints = getStructurePoints(tonnage, location);
  return structurePoints * 2;
}

export function getMaxTotalArmor(
  tonnage: number,
  configuration?: MechConfiguration,
): number {
  const config = configuration ?? MechConfiguration.BIPED;
  const locations = getLocationsForConfig(config);
  let total = 0;
  for (const location of locations) {
    total += getMaxArmorForLocation(tonnage, location);
  }
  return total;
}

export function validateLocationArmor(
  tonnage: number,
  location: string,
  front: number,
  rear: number = 0,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const maxArmor = getMaxArmorForLocation(tonnage, location);
  const total = front + rear;
  if (total > maxArmor) {
    errors.push(`${location} armor (${total}) exceeds maximum (${maxArmor})`);
  }
  if (front < 0) {
    errors.push(`${location} front armor cannot be negative`);
  }
  if (rear < 0) {
    errors.push(`${location} rear armor cannot be negative`);
  }
  const normalizedLocation = location.toLowerCase();
  if (normalizedLocation.includes('torso') && rear > 0) {
    // Rear armor is allowed for torso locations
  } else if (rear > 0) {
    errors.push(`${location} does not support rear armor`);
  }
  return { isValid: errors.length === 0, errors };
}
