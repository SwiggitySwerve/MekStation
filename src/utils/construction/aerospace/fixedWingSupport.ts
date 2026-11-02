import type { IBlkDocument } from '@/types/formats/BlkFormat';

import {
  extractWeaponTypeFromAmmoId,
  getCatalogAmmoBVGroup,
} from '../battleValueAmmo';
import { isAmmunitionEquipmentId } from '../equipmentBV/catalogLoader';
import {
  getEquipmentEntry,
  normalizeEquipmentId,
  getAmmunitionWeightEntry,
} from '../equipmentBVResolver';

/** MegaMek 48fcb2f6 FixedWingSupport:325-349; TestSupportVehicle.SVType:90.
 * Small <5 t, medium <=100 t, large <=200 t. Positive source mass is required.
 */
export const FWS_LARGE_THRESHOLD = 100;
export const FWS_MAX_TONNAGE = 200;

/** TestSupportVehicle:1027-1038,1110-1116,1570-1655; ArmorType:283-294.
 * Represented equipment supplies a slot lower bound; unresolved costs are omitted.
 * Native Thunderbolt20.criticalSlots=5 overrides missing catalog slot metadata.
 */
export function validateFixedWingSupport(d: IBlkDocument): string[] {
  const errors: string[] = [];
  if (
    !Number.isFinite(d.tonnage) ||
    d.tonnage <= 0 ||
    d.tonnage > FWS_MAX_TONNAGE
  )
    errors.push(
      `Fixed-wing support tonnage must be greater than 0 and at most ${FWS_MAX_TONNAGE} tons`,
    );
  const mounts = Object.entries(d.rawTags)
    .filter(([k]) => /equipment$/i.test(k))
    .flatMap(([, v]) =>
      Array.isArray(v) ? v : v.split(/\r?\n/).filter(Boolean),
    )
    .map((raw) => raw.replace(/:OMNI$/i, '').split(':')[0]);
  const amphibious = mounts.some((id) =>
    /^(?:sv)?amphibious(?:chassis(?:mod)?)?$/i.test(
      id.replace(/[^a-z0-9]/gi, ''),
    ),
  );
  const ammo = new Set<string>();
  let slots = 0;
  for (const id of mounts) {
    if (isAmmunitionEquipmentId(id) || /ammo/i.test(id)) {
      const entry = getAmmunitionWeightEntry(id);
      const key = entry?.id ?? normalizeEquipmentId(id);
      if (d.tonnage >= 5)
        ammo.add(
          getCatalogAmmoBVGroup(key) ?? extractWeaponTypeFromAmmoId(key),
        );
      continue;
    }
    const entry = getEquipmentEntry(id);
    // Misc critical slots can differ from SV slots; only CASE is certified here.
    const weapon =
      entry &&
      /^(Energy|Ballistic|Missile|Artillery|Capital)$/.test(entry.category);
    if (weapon || entry?.id === 'case')
      slots += entry?.id === 'thunderbolt-20' ? 5 : (entry?.criticalSlots ?? 0);
    if (
      entry &&
      /^(?:lifeboat|escape-pod)-maritime$/.test(entry.id) &&
      !amphibious
    )
      errors.push(
        `${entry.name} requires naval support vehicle or amphibious chassis modification.`,
      );
  }
  const tech = Number(d.rawTags.armor_tech_rating ?? 0);
  // BAR 10 at E/F uses IS/Clan ferro-fibrous support slots (2/1).
  const armor = d.armorType === 51 && tech >= 4 ? (tech === 5 ? 1 : 2) : 0;
  const used = slots + ammo.size + armor;
  const available = 5 + Math.floor(d.tonnage / 10);
  if (used > available)
    errors.push(
      `Not enough item slots available! Using ${used - available} slot(s) too many.\nAvailable slots: ${available}`,
    );
  return errors;
}
