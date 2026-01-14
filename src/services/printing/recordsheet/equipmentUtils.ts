/**
 * Equipment Utilities
 * 
 * Helper functions for weapon lookup, damage calculation, and equipment classification.
 */

import { IWeapon, WeaponCategory } from '@/types/equipment';

/**
 * Get damage type code based on weapon category
 * Format matches MegaMekLab output:
 * - [DE] = Direct Energy
 * - [DB] = Direct Ballistic  
 * - [M,C,S] = Missile, Cluster, Salvo
 * - [AE] = Area Effect
 */
export function getDamageCode(category: WeaponCategory): string {
  switch (category) {
    case WeaponCategory.ENERGY:
      return '[DE]';
    case WeaponCategory.BALLISTIC:
      return '[DB]';
    case WeaponCategory.MISSILE:
      return '[M,C,S]'; // Missile, Cluster, Salvo
    case WeaponCategory.ARTILLERY:
      return '[AE]';
    case WeaponCategory.PHYSICAL:
      return '[P]';
    default:
      return '';
  }
}

/**
 * Format missile damage as "X/Msl" where X is damage per missile
 */
export function formatMissileDamage(weaponName: string, baseDamage: number | string): string {
  const name = weaponName.toLowerCase();
  
  // LRMs do 1 damage per missile
  if (name.includes('lrm')) {
    return '1/Msl';
  }
  // SRMs do 2 damage per missile
  if (name.includes('srm') || name.includes('streak srm')) {
    return '2/Msl';
  }
  // MRMs do 1 damage per missile
  if (name.includes('mrm')) {
    return '1/Msl';
  }
  // ATMs vary - default to 2/Msl
  if (name.includes('atm')) {
    return '2/Msl';
  }
  
  // Default: return base damage
  return String(baseDamage);
}

/**
 * Look up weapon data from the database by name or id
 */
export function lookupWeapon(weapons: readonly IWeapon[], name: string, id?: string): IWeapon | undefined {
  // First try exact id match
  if (id) {
    const byId = weapons.find(w => w.id === id);
    if (byId) return byId;
  }
  
  // Try exact name match
  const byName = weapons.find(w => w.name === name);
  if (byName) return byName;
  
  // Try case-insensitive name match
  const lowerName = name.toLowerCase();
  const byLowerName = weapons.find(w => w.name.toLowerCase() === lowerName);
  if (byLowerName) return byLowerName;
  
  // Try partial match (weapon name contains the search name)
  const byPartial = weapons.find(w => 
    w.name.toLowerCase().includes(lowerName) || 
    lowerName.includes(w.name.toLowerCase())
  );
  
  return byPartial;
}

/**
 * Check if equipment name represents an unhittable slot
 * Unhittables include: Endo Steel, Ferro-Fibrous, TSM, and other non-damageable slots
 */
export function isUnhittableEquipmentName(name: string): boolean {
  const lowerName = name.toLowerCase();
  
  // Endo Steel variants (internal structure)
  if (lowerName.includes('endo steel') || lowerName.includes('endo-steel')) {
    return true;
  }
  
  // Ferro-Fibrous variants (armor)
  if (lowerName.includes('ferro') || lowerName.includes('ferro-fibrous')) {
    return true;
  }
  
  // Triple Strength Myomer
  if (lowerName.includes('triple strength') || lowerName.includes('tsm') || 
      (lowerName.includes('myomer') && !lowerName.includes('standard'))) {
    return true;
  }
  
  // Stealth armor
  if (lowerName.includes('stealth')) {
    return true;
  }
  
  // Reactive/Reflective armor
  if (lowerName.includes('reactive') || lowerName.includes('reflective')) {
    return true;
  }
  
  // Blue Shield
  if (lowerName.includes('blue shield')) {
    return true;
  }
  
  return false;
}
