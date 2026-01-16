/**
 * Weapon Alias Utilities
 *
 * Provides alias generation for weapon equipment.
 * Handles common naming variations, slug-style IDs, and tech base prefixes.
 *
 * @module services/equipment/aliases/weapon
 */

import { TechBase } from '@/types/enums/TechBase';
import { IWeapon } from '@/types/equipment/weapons/interfaces';

/**
 * Add common aliases for weapons
 */
export function addCommonWeaponAliases(
  id: string,
  name: string,
  weapon: IWeapon,
  nameToIdMap: Map<string, string>,
  normalizeName: (name: string) => string
): void {
  // Add aliases for common naming variations

  // Handle "PPC" variations
  if (name.includes('PPC')) {
    nameToIdMap.set('Particle Projector Cannon', id);
  }

  // Handle clan weapons with "(Clan)" suffix
  if (weapon.techBase === TechBase.CLAN && !name.includes('Clan')) {
    // Allow lookup without "(Clan)" if unique
    const baseName = name.replace(' (Clan)', '').replace('(Clan)', '');
    // Only add if no IS version exists with same base name
    const normalizedBase = normalizeName(baseName);
    if (!nameToIdMap.has(normalizedBase)) {
      nameToIdMap.set(normalizedBase, id);
    }
  }

  // Handle AC/X naming
  if (name.startsWith('AC/')) {
    const altName = name.replace('AC/', 'Autocannon/');
    nameToIdMap.set(altName, id);
    nameToIdMap.set(normalizeName(altName), id);
  }

  // Handle LRM/SRM spacing
  if (name.match(/^[LS]RM\s*\d+/)) {
    const noSpace = name.replace(/^([LS]RM)\s+/, '$1');
    const withSpace = name.replace(/^([LS]RM)(\d)/, '$1 $2');
    nameToIdMap.set(noSpace, id);
    nameToIdMap.set(withSpace, id);
  }

  // Add slug-style ID aliases for common weapon patterns
  // This handles unit JSON files that use legacy IDs like 'ultra-ac-5' instead of 'uac-5'
  addWeaponSlugAliases(id, name, weapon.techBase === TechBase.CLAN, nameToIdMap);
}

/**
 * Add slug-style ID aliases (e.g., 'ultra-ac-5' → 'uac-5')
 * Handles legacy ID formats commonly found in unit JSON files
 */
export function addWeaponSlugAliases(
  id: string,
  name: string,
  isClan: boolean,
  nameToIdMap: Map<string, string>
): void {
  const prefix = isClan ? 'clan-' : '';

  // Ultra AC patterns: 'uac-5' should also match 'ultra-ac-5'
  const ultraMatch = id.match(/^(clan-)?uac-(\d+)$/);
  if (ultraMatch) {
    const num = ultraMatch[2];
    nameToIdMap.set(`${prefix}ultra-ac-${num}`, id);
    nameToIdMap.set(`ultra-ac-${num}`, id); // Also without prefix for fallback
  }

  // Rotary AC patterns: 'rac-5' should also match 'rotary-ac-5'
  const rotaryMatch = id.match(/^(clan-)?rac-(\d+)$/);
  if (rotaryMatch) {
    const num = rotaryMatch[2];
    nameToIdMap.set(`${prefix}rotary-ac-${num}`, id);
    nameToIdMap.set(`rotary-ac-${num}`, id);
  }

  // Light AC patterns: 'lac-5' should also match 'light-ac-5'
  const lightMatch = id.match(/^(clan-)?lac-(\d+)$/);
  if (lightMatch) {
    const num = lightMatch[2];
    nameToIdMap.set(`${prefix}light-ac-${num}`, id);
    nameToIdMap.set(`light-ac-${num}`, id);
  }

  // LB-X AC patterns: 'lb-10x-ac' should also match 'lb-10-x-ac'
  const lbxMatch = id.match(/^(clan-)?lb-(\d+)x-ac$/);
  if (lbxMatch) {
    const num = lbxMatch[2];
    nameToIdMap.set(`${prefix}lb-${num}-x-ac`, id);
    nameToIdMap.set(`lb-${num}-x-ac`, id);
  }

  // ER Laser patterns: 'er-medium-laser' should match 'extended-range-medium-laser'
  const erMatch = id.match(/^(clan-)?er-(.+)-laser$/);
  if (erMatch) {
    const size = erMatch[2];
    nameToIdMap.set(`${prefix}extended-range-${size}-laser`, id);
    nameToIdMap.set(`extended-range-${size}-laser`, id);
  }

  // Pulse laser patterns with different naming
  const pulseMatch = id.match(/^(clan-)?(.+)-pulse-laser$/);
  if (pulseMatch) {
    const size = pulseMatch[2];
    nameToIdMap.set(`${prefix}pulse-${size}-laser`, id);
    nameToIdMap.set(`pulse-${size}-laser`, id);
  }
}
