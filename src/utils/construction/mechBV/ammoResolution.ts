import {
  extractWeaponTypeFromAmmoId,
  normalizeWeaponKey,
} from '@/utils/construction/battleValueAmmo';
export { normalizeWeaponKey } from '@/utils/construction/battleValueAmmo';
import { AMMUNITION_CATALOG_FILES } from '@/utils/construction/equipmentBVCatalogData';
import { normalizeEquipmentId } from '@/utils/construction/equipmentBVResolver';

import { AMMO_BV_FALLBACKS, AMMO_BV_FORCE_OVERRIDES } from './ammoOverrides';
import { AMMO_RESOLUTION_RULES } from './ammoRules';

let ammoLookup: Map<string, { bv: number; weaponType: string }> | null = null;

function buildAmmoLookup(): Map<string, { bv: number; weaponType: string }> {
  if (ammoLookup) return ammoLookup;
  ammoLookup = new Map();

  for (const file of AMMUNITION_CATALOG_FILES) {
    for (const item of file.items ?? []) {
      if (typeof item.id !== 'string' || typeof item.battleValue !== 'number')
        continue;
      const weapons = item.compatibleWeaponIds;
      const wt =
        Array.isArray(weapons) && typeof weapons[0] === 'string'
          ? normalizeWeaponKey(weapons[0])
          : extractWeaponTypeFromAmmoId(item.id);
      ammoLookup.set(item.id, { bv: item.battleValue, weaponType: wt });
      const canon = item.id.replace(/[^a-z0-9]/g, '');
      if (!ammoLookup.has(canon))
        ammoLookup.set(canon, { bv: item.battleValue, weaponType: wt });
    }
  }

  for (const [id, bv, wt] of AMMO_BV_FALLBACKS) {
    if (!ammoLookup.has(id)) ammoLookup.set(id, { bv, weaponType: wt });
    const canon = id.replace(/[^a-z0-9]/g, '');
    if (!ammoLookup.has(canon)) ammoLookup.set(canon, { bv, weaponType: wt });
  }

  // Force-override: catalog entries with known wrong BV values (UNOFFICIAL entries)
  // These ALWAYS overwrite any catalog value, unlike the `hc` list above.

  for (const [id, bv, wt] of AMMO_BV_FORCE_OVERRIDES) {
    ammoLookup.set(id, { bv, weaponType: wt });
    const canon = id.replace(/[^a-z0-9]/g, '');
    ammoLookup.set(canon, { bv, weaponType: wt });
  }

  return ammoLookup;
}

export function resolveAmmoByPattern(
  name: string,
  _techBase: string,
): { bv: number; weaponType: string } | null {
  const lu = buildAmmoLookup();

  const clean = name
    .replace(/\s*\(omnipod\)/gi, '')
    .replace(/\s*\((?:Clan|IS)\)\s*(?:Artemis(?:\s*V)?|Narc)-?[Cc]apable/gi, '')
    .replace(/\s*(?:Artemis(?:\s*V)?|Narc)-?[Cc]apable/gi, '')
    .replace(/\|.*/g, '')
    .trim();

  // Early check for IS Streak SRM ammo: normalizeEquipmentId maps via name-mappings.json
  // to "clan-streak-srm-N" (Clan BV values). Intercept to use correct IS-specific BV.
  const isStreakMatch = clean.match(/^IS\s+Streak\s+SRM\s+(\d+)\s+Ammo$/i);
  if (isStreakMatch) {
    const key = `is-streak-srm-${isStreakMatch[1]}-ammo`;
    const found = lu.get(key);
    if (found) return found;
  }

  const norm = normalizeEquipmentId(clean);
  let e = lu.get(norm);
  if (e) return e;
  e = lu.get(norm + '-ammo');
  if (e) return e;

  const lo = clean.toLowerCase();
  const stripped = lo
    .replace(/\s*\((?:clan|is)\)\s*/g, '')
    .replace(/\s*-\s*(?:full|half|proto)\s*$/g, '')
    .replace(/\s*\(\d+\)\s*$/g, '')
    .trim();

  for (const rule of AMMO_RESOLUTION_RULES) {
    const m = stripped.match(rule.re);
    if (m) {
      for (const id of rule.ids(m)) {
        const found = lu.get(id);
        if (found) return found;
      }
    }
  }

  const canonKey = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
  const ce = lu.get(canonKey);
  if (ce) return ce;
  return null;
}
