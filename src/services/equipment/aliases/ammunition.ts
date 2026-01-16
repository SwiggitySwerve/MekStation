/**
 * Ammunition Alias Utilities
 *
 * Provides alias generation for ammunition equipment.
 * Handles techbase prefixes and slug-style IDs for ammunition.
 *
 * @module services/equipment/aliases/ammunition
 */

import { TechBase } from '@/types/enums/TechBase';
import { IAmmunition } from '@/types/equipment/AmmunitionTypes';

/**
 * Add aliases for ammunition
 */
export function addAmmunitionAliases(
  ammo: IAmmunition,
  nameToIdMap: Map<string, string>
): void {
  const name = ammo.name;
  const id = ammo.id;
  const isClan = ammo.techBase === TechBase.CLAN;

  // Handle "IS Ammo" and "Clan Ammo" prefixes
  if (ammo.techBase === TechBase.INNER_SPHERE) {
    nameToIdMap.set(`IS ${name}`, id);
    nameToIdMap.set(`IS Ammo ${name.replace(' Ammo', '').replace('Ammo ', '')}`, id);
  } else if (isClan) {
    nameToIdMap.set(`Clan ${name}`, id);
    nameToIdMap.set(`Clan Ammo ${name.replace(' Ammo', '').replace('Ammo ', '')}`, id);
  }

  // Handle various ammo naming patterns from MTF files
  const weaponBase = name.replace(' Ammo', '').replace('Ammo ', '');
  nameToIdMap.set(`Ammo ${weaponBase}`, id);
  nameToIdMap.set(`${weaponBase} Ammo`, id);

  // Add slug-style ID aliases for ammo (e.g., 'ultra-ac-5-ammo' → 'uac-5-ammo')
  addAmmunitionSlugAliases(id, isClan, nameToIdMap);
}

/**
 * Add slug-style ID aliases for ammunition
 * Handles legacy ID formats like 'ultra-ac-5-ammo' → 'uac-5-ammo'
 */
export function addAmmunitionSlugAliases(
  id: string,
  isClan: boolean,
  nameToIdMap: Map<string, string>
): void {
  const prefix = isClan ? 'clan-' : '';

  // Ultra AC ammo: 'uac-5-ammo' should also match 'ultra-ac-5-ammo'
  const uacMatch = id.match(/^(clan-)?uac-(\d+)-ammo$/);
  if (uacMatch) {
    const num = uacMatch[2];
    nameToIdMap.set(`${prefix}ultra-ac-${num}-ammo`, id);
    nameToIdMap.set(`ultra-ac-${num}-ammo`, id);
  }

  // Rotary AC ammo: 'rac-5-ammo' should also match 'rotary-ac-5-ammo'
  const racMatch = id.match(/^(clan-)?rac-(\d+)-ammo$/);
  if (racMatch) {
    const num = racMatch[2];
    nameToIdMap.set(`${prefix}rotary-ac-${num}-ammo`, id);
    nameToIdMap.set(`rotary-ac-${num}-ammo`, id);
  }

  // Light AC ammo: 'lac-5-ammo' should also match 'light-ac-5-ammo'
  const lacMatch = id.match(/^(clan-)?lac-(\d+)-ammo$/);
  if (lacMatch) {
    const num = lacMatch[2];
    nameToIdMap.set(`${prefix}light-ac-${num}-ammo`, id);
    nameToIdMap.set(`light-ac-${num}-ammo`, id);
  }

  // LB-X AC ammo: 'lb-10x-ac-ammo' should also match 'lb-10-x-ac-ammo'
  const lbxMatch = id.match(/^(clan-)?lb-(\d+)x-ac-(.*ammo.*)$/);
  if (lbxMatch) {
    const num = lbxMatch[2];
    const suffix = lbxMatch[3];
    nameToIdMap.set(`${prefix}lb-${num}-x-ac-${suffix}`, id);
    nameToIdMap.set(`lb-${num}-x-ac-${suffix}`, id);
  }
}
