/**
 * Ammunition Color Detection
 * Sub-type detection for missile vs ballistic ammo
 */

import { EquipmentCategory } from '@/types/equipment';

import {
  EQUIPMENT_CATEGORY_COLORS,
  type CategoryColorDefinition,
} from './equipmentColors.types';

// =============================================================================
// Ammunition Sub-Types
// =============================================================================

export type AmmoSubType = 'missile' | 'ballistic' | 'generic';

/** Missile ammo - the missile teal; slots add stripes to tell it from launchers */
export const MISSILE_AMMO_COLORS: CategoryColorDefinition = {
  label: 'Missile Ammo',
  badgeVariant: 'teal',
  slotBg: 'bg-teal-700',
  slotBorder: 'border-teal-400',
  slotText: 'text-white',
  slotHoverBg: 'hover:bg-teal-600',
  indicatorBg: 'bg-teal-500',
  accentBorder: 'border-l-teal-500',
};

/** Ballistic ammo - the ballistic red; slots add stripes to tell it from guns */
export const BALLISTIC_AMMO_COLORS: CategoryColorDefinition = {
  label: 'Ballistic Ammo',
  badgeVariant: 'red',
  slotBg: 'bg-red-700',
  slotBorder: 'border-red-400',
  slotText: 'text-white',
  slotHoverBg: 'hover:bg-red-600',
  indicatorBg: 'bg-red-500',
  accentBorder: 'border-l-red-500',
};

/** Patterns to detect missile ammo by name */
const MISSILE_AMMO_PATTERNS = [
  'lrm',
  'srm',
  'mrm',
  'atm',
  'mml',
  'streak',
  'narc',
  'arrow iv',
  'long range missile',
  'short range missile',
  'medium range missile',
];

/** Patterns to detect ballistic ammo by name */
const BALLISTIC_AMMO_PATTERNS = [
  'ac/',
  'ac ',
  'autocannon',
  'gauss',
  'machine gun',
  'mg ',
  'lb-x',
  'lb ',
  'ultra ac',
  'uac',
  'rotary',
  'rac/',
  'light ac',
  'lac',
];

/**
 * Detect ammunition sub-type from equipment name
 */
export function detectAmmoSubType(name: string): AmmoSubType {
  const lowerName = name.toLowerCase();

  // Check for missile ammo patterns
  if (MISSILE_AMMO_PATTERNS.some((pattern) => lowerName.includes(pattern))) {
    return 'missile';
  }

  // Check for ballistic ammo patterns
  if (BALLISTIC_AMMO_PATTERNS.some((pattern) => lowerName.includes(pattern))) {
    return 'ballistic';
  }

  return 'generic';
}

/**
 * Get colors for ammunition based on name (detects missile vs ballistic)
 */
export function getAmmoColors(name: string): CategoryColorDefinition {
  const subType = detectAmmoSubType(name);

  switch (subType) {
    case 'missile':
      return MISSILE_AMMO_COLORS;
    case 'ballistic':
      return BALLISTIC_AMMO_COLORS;
    default:
      return EQUIPMENT_CATEGORY_COLORS[EquipmentCategory.AMMUNITION];
  }
}
