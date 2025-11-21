/**
 * Location Name Mapping Utilities
 * 
 * Provides conversion between display location names (e.g., "Center Torso")
 * and camelCase property names (e.g., "centerTorso") used in interfaces.
 */

import { IArmorAllocation } from '../../types/core/UnitInterfaces';

/**
 * Maps display location names to camelCase property names
 */
export const LOCATION_NAME_TO_PROPERTY: Record<string, keyof IArmorAllocation> = {
  'Head': 'head',
  'Center Torso': 'centerTorso',
  'Left Torso': 'leftTorso',
  'Right Torso': 'rightTorso',
  'Left Arm': 'leftArm',
  'Right Arm': 'rightArm',
  'Left Leg': 'leftLeg',
  'Right Leg': 'rightLeg',
} as const;

/**
 * Maps camelCase property names to display location names
 */
export const PROPERTY_TO_LOCATION_NAME: Record<keyof IArmorAllocation, string> = {
  head: 'Head',
  centerTorso: 'Center Torso',
  centerTorsoRear: 'Center Torso (Rear)',
  leftTorso: 'Left Torso',
  leftTorsoRear: 'Left Torso (Rear)',
  rightTorso: 'Right Torso',
  rightTorsoRear: 'Right Torso (Rear)',
  leftArm: 'Left Arm',
  rightArm: 'Right Arm',
  leftLeg: 'Left Leg',
  rightLeg: 'Right Leg',
} as const;

/**
 * Converts display location name to camelCase property name
 * 
 * @param displayName - Display location name (e.g., "Center Torso")
 * @returns Property name (e.g., "centerTorso") or null if not found
 */
export function locationNameToProperty(displayName: string): keyof IArmorAllocation | null {
  return LOCATION_NAME_TO_PROPERTY[displayName] ?? null;
}

/**
 * Converts camelCase property name to display location name
 * 
 * @param property - Property name (e.g., "centerTorso")
 * @returns Display location name (e.g., "Center Torso")
 */
export function propertyToLocationName(property: keyof IArmorAllocation): string {
  return PROPERTY_TO_LOCATION_NAME[property] ?? property;
}

/**
 * Checks if a string is a valid display location name
 * 
 * @param displayName - String to check
 * @returns True if the string is a valid location name
 */
export function isValidLocationName(displayName: string): boolean {
  return displayName in LOCATION_NAME_TO_PROPERTY;
}

/**
 * Checks if a string is a valid property name for armor allocation
 * 
 * @param property - String to check
 * @returns True if the string is a valid property name
 */
export function isValidArmorProperty(property: string): property is keyof IArmorAllocation {
  return property in PROPERTY_TO_LOCATION_NAME;
}

/**
 * Gets all valid display location names
 * 
 * @returns Array of all valid location names
 */
export function getAllLocationNames(): string[] {
  return Object.keys(LOCATION_NAME_TO_PROPERTY);
}

/**
 * Gets all valid property names for armor allocation
 * 
 * @returns Array of all valid property names
 */
export function getAllArmorProperties(): (keyof IArmorAllocation)[] {
  return Object.keys(PROPERTY_TO_LOCATION_NAME) as (keyof IArmorAllocation)[];
}
