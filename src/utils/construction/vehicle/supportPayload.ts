import { decodeBlkVehicleEngine } from '@/services/conversion/blkEngineIdentity';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { ISupportVehicle } from '@/types/unit/VehicleInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { getEquipmentEntry } from '@/utils/construction/equipmentBV';
import { isAmmunitionEquipmentId } from '@/utils/construction/equipmentBV/catalogLoader';
import { getAmmunitionWeightEntry } from '@/utils/construction/equipmentBV/resolution';

import { getVehicleHeatNeutralWeaponHeat } from './mountedWeight';
import {
  computePowerAmplifierWeight,
  isPowerAmplifierEnergyWeapon,
  requiresPowerAmplifiers,
} from './powerAmplifier';
import { computeTurretWeight } from './turret';
import { resolveVehicleVariableMass } from './variableEquipmentMass';

/** TestEntity.java:631-667,716-769: sum catalog mount weights by kind.
 */
export function computeSupportPayloadWeights(
  unit: ISupportVehicle,
  engineWeight: number,
): {
  weapons: number;
  ammo: number;
  miscEquipment: number;
  heatSinks: number;
  powerAmplifiers: number;
  misc: number;
  unresolved: string[];
} {
  const unresolved: string[] = [];
  const mounts = unit.equipment.map((mount) => {
    const ammo = isAmmunitionEquipmentId(mount.equipmentId);
    const item = ammo
      ? getAmmunitionWeightEntry(mount.equipmentId)
      : (getEquipmentEntry(mount.equipmentId) ??
        getEquipmentEntry(mount.equipmentId.replace(/[ /]+/g, '-')));
    if (!item || item.weight === undefined) {
      unresolved.push(mount.equipmentId);
      return {
        ...mount,
        ammo,
        weapon: false,
        weight: 0,
        heat: 0,
        energy: false,
      };
    }
    // TestEntity.java:716-724,753-769: an artillery ammo category is not a weapon.
    const weapon =
      !ammo &&
      ['Energy', 'Ballistic', 'Missile', 'Artillery', 'Capital'].includes(
        item.category,
      );
    if (unit.tonnage < 5 && weapon) {
      unresolved.push(mount.equipmentId);
      return { ...mount, ammo, weapon, weight: 0, heat: 0, energy: false };
    } // Infantry mount/clip metadata is not in this catalog.
    const energy =
      weapon &&
      isPowerAmplifierEnergyWeapon({
        id: item.id,
        name: item.name,
        category:
          item.category === 'Energy'
            ? EquipmentCategory.ENERGY_WEAPON
            : EquipmentCategory.MISC_EQUIPMENT,
        special: item.special,
      });
    const resolvedWeight = resolveVehicleVariableMass(item, mount.equipmentId, {
      tonnage: unit.tonnage,
      engineWeight,
      isSupportVehicle: true,
    });
    if (resolvedWeight === undefined) unresolved.push(mount.equipmentId);
    const weight = resolvedWeight ?? item.weight;
    // TestEntity.java:938-982: heat-neutral weapon load; small SVs need no sinks.
    const heat = weapon
      ? (getVehicleHeatNeutralWeaponHeat({
          ...item,
          category:
            item.category === 'Energy'
              ? EquipmentCategory.ENERGY_WEAPON
              : EquipmentCategory.BALLISTIC_WEAPON,
        }) ?? 0)
      : 0;
    return { ...mount, ammo, weapon, weight, heat, energy, id: item.id };
  });
  const sum = (predicate: (mount: (typeof mounts)[number]) => boolean) =>
    mounts.filter(predicate).reduce((n, m) => n + m.weight, 0);
  const weapons = sum((m) => m.weapon),
    ammo = unit.tonnage < 5 ? 0 : sum((m) => m.ammo);
  // At this pin hasFlag(EXCLUDE) requires ALL flags (EquipmentBitSet.java:81-91),
  // so individual fire controls remain in misc, despite the stale exclusion comment.
  for (const mount of mounts)
    if (
      mount.id === 'basic-fire-control' ||
      mount.id === 'advanced-fire-control'
    )
      mount.weight =
        resolveVehicleVariableMass(
          { id: mount.id, weight: mount.weight },
          mount.equipmentId,
          {
            tonnage: unit.tonnage,
            engineWeight,
            weaponWeight: weapons,
            isSupportVehicle: true,
          },
        ) ?? mount.weight;
  const miscEquipment = sum((m) => !m.ammo && !m.weapon);
  const heatSinks =
    unit.tonnage < 5 ? 0 : mounts.reduce((n, m) => n + m.heat, 0);
  const powerAmplifiers =
    unit.tonnage < 5 ||
    !requiresPowerAmplifiers(decodeBlkVehicleEngine(unit.engineType, false))
      ? 0
      : computePowerAmplifierWeight(sum((m) => m.energy)); // TestSupportVehicle.java:871-901
  const turret = (location: string) => {
    const weight = sum((m) => !m.ammo && m.location === location);
    return unit.tonnage < 5
      ? Math.ceil((weight / 10) * 1000) / 1000
      : computeTurretWeight(TurretType.SINGLE, weight);
  };
  const misc = turret('Turret') + turret('Turret 2'); // TestTank.java:178-235; SV :837-854
  return {
    weapons,
    ammo,
    miscEquipment,
    heatSinks,
    powerAmplifiers,
    misc,
    unresolved,
  };
}
