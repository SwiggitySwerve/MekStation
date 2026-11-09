/** ProtoMech construction mass. Native partial-weight accounting is preserved here. */
import type { IProtoMech } from '@/types/unit/PersonnelInterfaces';

import { readBlkProtoEquipmentEntry } from '@/services/conversion/BlkProtoEquipmentEntry';
import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import { getEquipmentEntry } from '@/utils/construction/equipmentBVResolver';

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

/** TestProtoMek/TestEntity 48fcb2f6: a lower bound, not a complete mass total.
 * Standard armor, structure, controls, engine, fixed-mass weapons, standard LRMs
 * and known ammo can prove overage. Other missiles/misc/jump/sink mass is omitted.
 */
export function getProtoMinimumWeight(
  unit: ProtoMinimumWeightInput,
): number | undefined {
  if (unit.armorType !== 42) return undefined;
  const engine = computeProtoEngineWeight(unit.engineRating);
  if (engine === null) return undefined;
  let weight =
    Math.round(unit.weightPerUnit * 0.1 * 1000) / 1000 +
    (unit.weightPerUnit > PROTO_MAX_STANDARD_TONNAGE ? 0.75 : 0.5) +
    engine +
    Object.values(unit.armorByLocation).reduce(
      (sum, points) => sum + points,
      0,
    ) *
      0.05;
  for (const mount of unit.equipment) {
    if (mount.location === ProtoMechLocation.MAIN_GUN && !unit.hasMainGun)
      continue;
    const syntax = readBlkProtoEquipmentEntry(mount.equipmentId);
    if (!syntax.lookupName || syntax.errors.length) continue;
    const ammo = getProtoAmmo(syntax.lookupName);
    if (ammo && syntax.shots !== undefined) {
      weight += Math.ceil(ammo.kgPerShot * syntax.shots) / 1000;
      continue;
    }
    const entry = getEquipmentEntry(syntax.lookupName);
    // LRMWeapon.java:77-82 overrides BattleMech mass on ProtoMeks.
    const lrmRack = /^(?:CL|IS)LRM(\d+)$/.exec(syntax.lookupName);
    if (lrmRack && entry) {
      weight += Number(lrmRack[1]) * 0.2;
      continue;
    }
    if (
      entry &&
      ['Energy', 'Ballistic', 'Artillery'].includes(entry.category)
    ) {
      weight += Math.max(0, entry.weight ?? 0);
    }
  }
  return Math.round(weight * 1000) / 1000;
}
