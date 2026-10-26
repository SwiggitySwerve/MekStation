/**
 * Ammunition Alias Utilities
 *
 * Provides alias generation for ammunition equipment.
 * Handles techbase prefixes and slug-style IDs for ammunition.
 *
 * @module services/equipment/aliases/ammunition
 * @spec openspec/changes/customizer-ammunition-and-era-availability/specs/equipment-services/spec.md
 */

import { TechBase } from '@/types/enums/TechBase';
import { IAmmunition } from '@/types/equipment/AmmunitionTypes';

/**
 * Add aliases for ammunition
 */
export function addAmmunitionAliases(
  ammo: IAmmunition,
  nameToIdMap: Map<string, string>,
  normalizeName: (name: string) => string,
): void {
  const name = ammo.name;
  const id = ammo.id;
  const isClan = ammo.techBase === TechBase.CLAN;

  // Handle "IS Ammo" and "Clan Ammo" prefixes
  if (ammo.techBase === TechBase.INNER_SPHERE) {
    nameToIdMap.set(`IS ${name}`, id);
    nameToIdMap.set(
      `IS Ammo ${name.replace(' Ammo', '').replace('Ammo ', '')}`,
      id,
    );
  } else if (isClan) {
    nameToIdMap.set(`Clan ${name}`, id);
    nameToIdMap.set(
      `Clan Ammo ${name.replace(' Ammo', '').replace('Ammo ', '')}`,
      id,
    );
  }

  // Handle various ammo naming patterns from MTF files
  const weaponBase = name.replace(' Ammo', '').replace('Ammo ', '');
  nameToIdMap.set(`Ammo ${weaponBase}`, id);
  nameToIdMap.set(`${weaponBase} Ammo`, id);

  // Add slug-style ID aliases for ammo (e.g., 'ultra-ac-5-ammo' → 'uac-5-ammo')
  addAmmunitionSlugAliases(id, isClan, nameToIdMap);
  addInternalAmmunitionAliases(ammo, nameToIdMap, normalizeName);
}

/** Only mounting and guidance-capability labels are incidental to bin identity.
 * Keep munition variants and bin sizes in the lookup key.
 */
export function ammunitionAliasKey(
  token: string,
  normalizeName: (name: string) => string,
): string | undefined {
  if (!/ammo/i.test(token)) return undefined;
  return normalizeName(
    token
      .replace(/\s*\(omnipod\)/gi, '')
      .replace(/\s*\((?:Clan|IS)\)/gi, '')
      .replace(/\s+(?:Artemis(?:\s+(?:IV|V))?|Narc)-capable\b/gi, ''),
  );
}

function addInternalAmmunitionAliases(
  ammo: IAmmunition,
  aliases: Map<string, string>,
  normalizeName: (name: string) => string,
): void {
  // Some imported half-bin records incorrectly weigh one ton. Do not create
  // additional aliases for them or turn an unknown half bin into a full bin.
  if (/half/i.test(ammo.name) && ammo.weight !== 0.5) return;
  const base = ammo.name.replace(/\s*\(Clan\)/i, '');
  const names = new Set([base]);
  if (/^MG Ammo/.test(base)) {
    names.add(base.replace(/^MG/, 'Machine Gun'));
    names.add(`MG Ammo (${ammo.shotsPerTon})`);
    if (ammo.weight === 1) names.add('MG Ammo - Full');
  }
  if (/^[LS]RT \d+ Ammo$/.test(base)) {
    names.add(base.replace(/^([LS]R)T /, '$1Torpedo '));
  }
  if (/Chemical Laser Ammo/.test(base)) {
    names.add(base.replace('Chemical Laser', 'ChemLaser'));
  }
  if (/Gauss/.test(base)) {
    names.add(base.replace(' Gauss Ammo', ' Gauss Rifle Ammo'));
    names.add(base.replace('Gauss Rifle', 'Gauss'));
  }
  if (/^LB \d+-X/.test(base)) {
    names.add(base.replace(/^LB (\d+)-X (?:Slug|AC) Ammo$/, 'LBXAC$1 Ammo'));
    names.add(base.replace(/^LB (\d+)-X Cluster Ammo$/, 'LBXAC$1 CL Ammo'));
  }
  if (/^Anti-Personnel Gauss Rifle/.test(base)) {
    names.add(base.replace('Anti-Personnel', 'AP'));
  }
  if (/^AP Gauss Ammo/.test(base)) names.add('APGaussRifle Ammo');
  const atm = base.match(
    /^(Standard|Extended-Range|High-Explosive) (i?ATM\/\d+) Ammo$/,
  );
  if (atm) {
    const variant =
      atm[1] === 'Standard' ? '' : atm[1] === 'Extended-Range' ? ' ER' : ' HE';
    names.add(`${atm[2]}${variant} Ammo`);
  }
  const clanOnly =
    ammo.techBase === TechBase.CLAN || ammo.id.startsWith('clan-');
  for (const name of names) {
    for (const prefix of clanOnly ? ['CL', 'Clan '] : ['IS', 'CL', 'Clan ']) {
      const key = ammunitionAliasKey(`${prefix}${name}`, normalizeName);
      // Shared ammunition is a fallback; a dedicated Clan bin (e.g. AMS)
      // takes precedence and retains its own capacity and BV.
      if (key && (clanOnly || !aliases.has(key))) aliases.set(key, ammo.id);
      const ammoFirst = name.replace(/ Ammo\b/, '');
      const firstKey = ammunitionAliasKey(
        `${prefix} Ammo ${ammoFirst}`,
        normalizeName,
      );
      if (firstKey && (clanOnly || !aliases.has(firstKey)))
        aliases.set(firstKey, ammo.id);
    }
  }
}

/**
 * Add slug-style ID aliases for ammunition
 * Handles legacy ID formats like 'ultra-ac-5-ammo' → 'uac-5-ammo'
 */
export function addAmmunitionSlugAliases(
  id: string,
  isClan: boolean,
  nameToIdMap: Map<string, string>,
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
