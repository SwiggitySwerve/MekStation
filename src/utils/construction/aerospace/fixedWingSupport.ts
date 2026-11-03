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
import { getSupportVehicleBarRatings } from '../vehicle/armor';
import { supportFireControlFactor } from '../vehicle/vehicleBVOffensive';

/** MegaMek 48fcb2f6 FixedWingSupport:325-349; TestSupportVehicle.SVType:90.
 * Small <5 t, medium <=100 t, large <=200 t. Positive source mass is required.
 */
export const FWS_LARGE_THRESHOLD = 100;
export const FWS_MAX_TONNAGE = 200;
const FWS_MIN_TONNAGE = 0;

/** TestSupportVehicle:1570-1655. Shared by source validation and editor. */
export function getFixedWingSupportLimits(tonnage: number): {
  minTonnageExclusive: number;
  maxTonnage: number;
  largeThreshold: number;
  itemSlots: number;
  barRatings: number[];
} {
  return {
    minTonnageExclusive: FWS_MIN_TONNAGE,
    maxTonnage: FWS_MAX_TONNAGE,
    largeThreshold: FWS_LARGE_THRESHOLD,
    itemSlots: 5 + Math.floor(tonnage / 10),
    barRatings: getSupportVehicleBarRatings(),
  };
}

export function validateFixedWingSupportTonnage(tonnage: number): string[] {
  return !Number.isFinite(tonnage) ||
    tonnage <= FWS_MIN_TONNAGE ||
    tonnage > FWS_MAX_TONNAGE
    ? [
        `Fixed-wing support tonnage must be greater than ${FWS_MIN_TONNAGE} and at most ${FWS_MAX_TONNAGE} tons`,
      ]
    : [];
}

/** Display the classification already owned by the shared support BV rule. */
export function getFixedWingSupportFireControl(
  chassisEquipment: readonly string[],
): 'Basic' | 'Advanced' | 'None' {
  const factor = supportFireControlFactor({
    isSupportVehicle: true,
    chassisEquipment: [...chassisEquipment],
  });
  return factor === 0.9 ? 'Basic' : factor === 1 ? 'Advanced' : 'None';
}

/** TestSupportVehicle:1027-1038,1110-1116,1570-1655; ArmorType:283-294.
 * Represented equipment supplies a slot lower bound; unresolved costs are omitted.
 * Native Thunderbolt20.criticalSlots=5 overrides missing catalog slot metadata.
 */
export function validateFixedWingSupport(d: IBlkDocument): string[] {
  const errors = validateFixedWingSupportTonnage(d.tonnage);
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
  const available = getFixedWingSupportLimits(d.tonnage).itemSlots;
  if (used > available)
    errors.push(
      `Not enough item slots available! Using ${used - available} slot(s) too many.\nAvailable slots: ${available}`,
    );
  return errors;
}
