/** ProtoMech construction mass. Native partial-weight accounting is preserved here. */
import type { IProtoMech } from '@/types/unit/PersonnelInterfaces';

import { readBlkProtoEquipmentEntry } from '@/services/conversion/BlkProtoEquipmentEntry';
import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import { getEquipmentEntry } from '@/utils/construction/equipmentBVResolver';

import { getProtoArmorDefinition, isProtoEDPArmorMount } from './armorType';
import { computeProtoEngineWeight } from './movementCaps';
import { getProtoAmmo } from './protoMechAmmo';
import { PROTO_MAX_STANDARD_TONNAGE } from './weightClass';

export type ProtoMinimumWeightInput = Pick<
  IProtoMech,
  | 'weightPerUnit'
  | 'engineRating'
  | 'armorType'
  | 'hasMainGun'
  | 'armorByLocation'
> & {
  equipment: readonly Pick<
    IProtoMech['equipment'][number],
    'equipmentId' | 'location'
  >[];
};

/**
 * Catalog weight of a mount, or undefined when it cannot be stated: the id is
 * not in the catalog, or the catalog marks the weight as depending on the unit.
 * Such a mount still takes its slot; no weight is invented for it.
 */
export function getProtoMountWeight(equipmentId: string): number | undefined {
  const entry = getEquipmentEntry(equipmentId);
  if (!entry || entry.weight === undefined) return undefined;
  if (entry.special?.includes('Variable weight')) return undefined;
  return entry.weight;
}

/** TestProtoMek/TestEntity 48fcb2f6: a lower bound, not a complete mass total.
 * Supported armor, structure, controls, engine, fixed-mass weapons, standard LRMs
 * and known ammo can prove overage. Other missiles/misc/jump/sink mass is omitted.
 */
function getProtoMinimumWeightExact(
  unit: ProtoMinimumWeightInput,
): number | undefined {
  const armor = computeProtoArmorWeight(
    Object.values(unit.armorByLocation).reduce(
      (sum, points) => sum + points,
      0,
    ),
    unit.armorType,
  );
  if (armor === null) return undefined;
  const engine = computeProtoEngineWeight(unit.engineRating);
  if (engine === null) return undefined;
  let weight =
    Math.round(unit.weightPerUnit * 0.1 * 1000) / 1000 +
    (unit.weightPerUnit > PROTO_MAX_STANDARD_TONNAGE ? 0.75 : 0.5) +
    engine +
    armor;
  for (const mount of unit.equipment) {
    if (mount.location === ProtoMechLocation.MAIN_GUN && !unit.hasMainGun)
      continue;
    weight += minimumMountWeight(mount.equipmentId);
  }
  return weight;
}

function minimumMountWeight(equipmentId: string): number {
  const syntax = readBlkProtoEquipmentEntry(equipmentId);
  if (!syntax.lookupName || syntax.errors.length) return 0;
  const ammo = getProtoAmmo(syntax.lookupName);
  if (ammo && syntax.shots !== undefined) {
    return Math.ceil(ammo.kgPerShot * syntax.shots) / 1000;
  }
  const entry = getEquipmentEntry(syntax.lookupName);
  // LRMWeapon.java:77-82 overrides BattleMech mass on ProtoMeks.
  const lrmRack = /^(?:CL|IS)LRM(\d+)$/.exec(syntax.lookupName);
  if (lrmRack && entry) {
    return Number(lrmRack[1]) * 0.2;
  }
  if (entry && ['Energy', 'Ballistic', 'Artillery'].includes(entry.category)) {
    return Math.max(0, entry.weight ?? 0);
  }
  return 0;
}

/** TestProtoMek.java:171-180: armor stays unrounded; total mass rounds to kg. */
export function computeProtoArmorWeight(
  points: number,
  armorType: number | undefined,
): number | null {
  const armor = getProtoArmorDefinition(armorType);
  if (!armor || !Number.isSafeInteger(points) || points < 0) return null;
  return points * armor.weightPerPoint;
}

export function getProtoMinimumWeight(
  unit: ProtoMinimumWeightInput,
): number | undefined {
  const exact = getProtoMinimumWeightExact(unit);
  return exact === undefined ? undefined : Math.round(exact * 1000) / 1000;
}

/** Complete only when every mounted mass and heat requirement can be stated.
 * TestProtoMek.java:130-180; TestEntity.calcHeatNeutralHSRequirement; MiscType
 * at 48fcb2f64: MASC 0.025 x unit mass, EI/armor 0, Quad melee fixed 1 t
 * (createProtoQuadMeleeSystem:9440-9450). That absent catalog entry is not a
 * variable weight. Unknown equipment never becomes a successful zero total.
 */
export function computeProtoWeight(unit: ProtoMinimumWeightInput): {
  total: number | null;
  missingEquipment: string[];
} {
  let total = getProtoMinimumWeightExact(unit);
  if (total === undefined)
    return {
      total: null,
      missingEquipment: ['Unsupported armor or engine mass'],
    };
  const missingEquipment: string[] = [];
  for (const mount of unit.equipment) {
    if (mount.location === ProtoMechLocation.MAIN_GUN && !unit.hasMainGun)
      continue;
    const syntax = readBlkProtoEquipmentEntry(mount.equipmentId);
    if (!syntax.lookupName || syntax.errors.length) {
      missingEquipment.push(mount.equipmentId);
      continue;
    }
    const entry = getEquipmentEntry(syntax.lookupName);
    const id = syntax.lookupName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const ammo = getProtoAmmo(syntax.lookupName);
    let weight: number | undefined;
    if (isProtoEDPArmorMount(syntax.lookupName) || id === 'eiinterface')
      weight = 0;
    else if (id === 'protoquadmeleesystem' || id === 'protomechquadmeleesystem')
      weight = 1;
    else if (id === 'clmyomerbooster' || id === 'protomekmyomerbooster')
      weight = Math.round(unit.weightPerUnit * 0.025 * 1000) / 1000;
    else if (ammo && syntax.shots !== undefined)
      weight = minimumMountWeight(mount.equipmentId);
    else if (entry && /^(?:CL|IS)LRM\d+$/.test(syntax.lookupName))
      weight = minimumMountWeight(mount.equipmentId);
    else if (!ammo) weight = getProtoMountWeight(syntax.lookupName);
    if (weight === undefined) missingEquipment.push(mount.equipmentId);
    else {
      total += weight - minimumMountWeight(mount.equipmentId);
      // ProtoMeks buy 0.25 t per heat-neutral sink. Unsupported linked/variable
      // equipment above prevents claiming a complete total for those builds.
      if (entry?.category === 'Energy') total += (entry.heat ?? 0) * 0.25;
    }
  }
  return {
    total: missingEquipment.length ? null : Math.round(total * 1000) / 1000,
    missingEquipment,
  };
}
