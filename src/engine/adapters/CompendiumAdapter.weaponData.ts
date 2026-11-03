import {
  buildWeaponLookupFromCatalogFiles,
  resolveCatalogDamage,
} from '@/simulation/runner/UnitHydration';
import {
  preferRegistryEquipment,
  WEAPON_CATALOG_FILES,
} from '@/utils/construction/equipmentBVCatalogData';

import type { IWeaponData } from '../types';

import {
  CLAN_PREFIX_PATTERNS,
  WEAPON_DATABASE,
  WEAPON_ID_ALIASES,
} from './CompendiumWeaponData';

const officialWeaponLookup =
  buildWeaponLookupFromCatalogFiles(WEAPON_CATALOG_FILES);

const fallbackWeaponLookup = buildWeaponLookupFromCatalogFiles(
  WEAPON_CATALOG_FILES,
  false,
);

function getOfficialWeaponData(
  equipmentId: string,
  lookup = officialWeaponLookup,
): IWeaponData | undefined {
  const catalogWeapon = lookup(equipmentId);
  if (!catalogWeapon) return undefined;

  return {
    id: catalogWeapon.id,
    name: catalogWeapon.name,
    shortRange: catalogWeapon.ranges.short,
    mediumRange: catalogWeapon.ranges.medium,
    longRange: catalogWeapon.ranges.long,
    ...(catalogWeapon.ranges.extreme !== undefined
      ? { extremeRange: catalogWeapon.ranges.extreme }
      : {}),
    damage: resolveCatalogDamage(catalogWeapon.damage, catalogWeapon.id),
    heat: catalogWeapon.heat,
    minRange: catalogWeapon.ranges.minimum,
    ammoPerTon: catalogWeapon.ammoPerTon ?? -1,
    destroyed: false,
  };
}

export function canonicalizeWeaponId(equipmentId: string): string {
  if (!equipmentId) return equipmentId;
  const raw = equipmentId.toLowerCase().trim();
  const normalized = raw.replace(/[\s/]+/g, '-').replace(/-+/g, '-');

  if (WEAPON_ID_ALIASES[normalized]) {
    return WEAPON_ID_ALIASES[normalized];
  }
  if (fallbackWeaponLookup(normalized) || WEAPON_DATABASE[normalized]) {
    return normalized;
  }
  for (const pattern of CLAN_PREFIX_PATTERNS) {
    if (pattern.test(normalized)) {
      const stripped = normalized.replace(pattern, '');
      const expandedClan = `clan-${stripped}`;
      if (fallbackWeaponLookup(expandedClan)) return expandedClan;
      if (fallbackWeaponLookup(stripped)) return stripped;
      if (WEAPON_DATABASE[stripped]) return stripped;
      if (WEAPON_ID_ALIASES[stripped]) return WEAPON_ID_ALIASES[stripped];
    }
  }
  return normalized;
}

export function getWeaponData(equipmentId: string): IWeaponData | undefined {
  const canonicalId = canonicalizeWeaponId(equipmentId);
  const legacy =
    getOfficialWeaponData(canonicalId, fallbackWeaponLookup) ??
    WEAPON_DATABASE[canonicalId];
  const imported = getOfficialWeaponData(equipmentId);
  return preferRegistryEquipment(legacy, imported, equipmentId);
}
