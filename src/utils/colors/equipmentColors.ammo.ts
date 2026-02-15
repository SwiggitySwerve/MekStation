/**
 * Ammunition Color Detection
 * Sub-type detection for missile vs ballistic ammo
 */

import { EquipmentCategory } from '@/types/equipment';

import {
  EQUIPMENT_CATEGORY_COLORS,
  type CategoryColorDefinition,
} from './equipmentColors';

// =============================================================================
// Ammunition Sub-Types
// =============================================================================

export type AmmoSubType = 'missile' | 'ballistic' | 'generic';

/** Missile ammo - Mint colored */
export const MISSILE_AMMO_COLORS: CategoryColorDefinition = {
  label: 'Missile Ammo',
  badgeVariant: 'emerald',
  slotBg: 'bg-emerald-600',
  slotBorder: 'border-emerald-700',
  slotText: 'text-white',
  slotHoverBg: 'hover:bg-emerald-500',
  indicatorBg: 'bg-emerald-400',
};

/** Ballistic ammo - Amber colored */
export const BALLISTIC_AMMO_COLORS: CategoryColorDefinition = {
  label: 'Ballistic Ammo',
  badgeVariant: 'amber',
  slotBg: 'bg-amber-600',
  slotBorder: 'border-amber-700',
  slotText: 'text-white',
  slotHoverBg: 'hover:bg-amber-500',
  indicatorBg: 'bg-amber-400',
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
