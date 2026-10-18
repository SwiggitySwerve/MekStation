import {
  IProtoMechMountedEquipment,
  IProtoMechUnit,
  ProtoLocation,
} from '@/types/unit/ProtoMechInterfaces';

import { resolveEquipmentBV } from '../equipmentBVResolver';

/** IDs treated as defensive-only equipment (no weapon BV contribution). */
const DEFENSIVE_EQUIPMENT_HINTS: readonly string[] = [
  'ams',
  'amsammo',
  'ecm',
  'guardian-ecm',
  'ecm-suite',
  'angel-ecm',
  'bap',
  'beagle-active-probe',
  'activeprobe',
  'active-probe',
  'light-active-probe',
];

/** IDs treated as offensive non-weapon equipment (e.g. targeting computer). */
const OFFENSIVE_EQUIPMENT_HINTS: readonly string[] = [
  'targeting-computer',
  'tc',
  'c3',
  'c3-master',
  'c3-slave',
  'c3i',
  'tag',
];

/**
 * Explosive weapon hints — any ammo-bearing / explosive weapon on a proto
 * incurs the standard 15 BV per crit penalty (proto slot = 1 crit for these
 * purposes; most relevant categories are AC and Gauss rifles).
 *
 * Protos are Clan-only and typically lack CASE; we treat all main-gun
 * ACs / Gauss as explosive. Ammo crits themselves add penalty equal to
 * number of ammo shots stored but TechManual clamps proto ammo contribution
 * small enough that 15 per ammo mount is a conservative match.
 */
const EXPLOSIVE_SUBTYPE_HINTS: readonly string[] = [
  'auto cannon',
  'ac/',
  'gauss',
  'lbx',
  'lb-x',
  'ultra ac',
];

// =============================================================================
// Helpers
// =============================================================================

function sumNumericRecord(rec: object | undefined): number {
  if (!rec) return 0;
  let sum = 0;
  for (const v of Object.values(rec)) {
    if (typeof v === 'number') sum += v;
  }
  return sum;
}

function armorTotal(unit: IProtoMechUnit): number {
  return sumNumericRecord(unit.armorByLocation);
}

function structureTotal(unit: IProtoMechUnit): number {
  return sumNumericRecord(unit.structureByLocation);
}

function classifyEquipment(
  mount: IProtoMechMountedEquipment,
): 'weapon' | 'defensive' | 'offensive' | 'ammo' | 'other' {
  const id = mount.equipmentId.toLowerCase();

  if (id.includes('ammo')) return 'ammo';

  for (const hint of DEFENSIVE_EQUIPMENT_HINTS) {
    if (id.includes(hint)) return 'defensive';
  }
  for (const hint of OFFENSIVE_EQUIPMENT_HINTS) {
    if (id.includes(hint)) return 'offensive';
  }

  // The resolver is the source of truth: if it returns a nonzero BV, assume
  // weapon. Anything else (structure, special) contributes 0 and gets tagged
  // 'other' to keep the breakdown honest.
  const resolved = resolveEquipmentBV(mount.equipmentId);
  if (resolved.resolved && resolved.battleValue > 0) return 'weapon';
  return 'other';
}

function isExplosiveWeapon(mount: IProtoMechMountedEquipment): boolean {
  const id = mount.equipmentId.toLowerCase();
  for (const hint of EXPLOSIVE_SUBTYPE_HINTS) {
    if (id.includes(hint)) return true;
  }
  return false;
}

function isMainGunMount(mount: IProtoMechMountedEquipment): boolean {
  return mount.isMainGun || mount.location === ProtoLocation.MAIN_GUN;
}

export {
  armorTotal,
  structureTotal,
  classifyEquipment,
  isExplosiveWeapon,
  isMainGunMount,
};
