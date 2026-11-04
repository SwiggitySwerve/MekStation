import { decodeBlkVehicleEngine } from '@/services/conversion/blkEngineIdentity';
import { FormulaEvaluator } from '@/services/equipment/FormulaEvaluator';
import { VARIABLE_EQUIPMENT_FORMULAS } from '@/services/equipment/variableEquipmentFormulas';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { ISupportVehicle } from '@/types/unit/VehicleInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { getEquipmentEntry } from '@/utils/construction/equipmentBV';
import { isAmmunitionEquipmentId } from '@/utils/construction/equipmentBV/catalogLoader';
import { getAmmunitionWeightEntry } from '@/utils/construction/equipmentBV/resolution';

import { getVehicleHeatNeutralWeaponHeat } from './heatSinks';
import {
  computePowerAmplifierWeight,
  isPowerAmplifierEnergyWeapon,
  requiresPowerAmplifiers,
} from './powerAmplifier';
import { roundSupportComponentWeight } from './supportRounding';
import { computeTurretWeight } from './turret';

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
    const weapon = [
      'Energy',
      'Ballistic',
      'Missile',
      'Artillery',
      'Capital',
    ].includes(item.category);
    if (unit.tonnage < 5 && weapon) {
      unresolved.push(mount.equipmentId);
      return { ...mount, ammo, weapon, weight: 0, heat: 0, energy: false };
    } // Infantry mount/clip metadata is not in this catalog.
    const energy =
      weapon &&
      isPowerAmplifierEnergyWeapon({
        category:
          item.category === 'Energy'
            ? EquipmentCategory.ENERGY_WEAPON
            : EquipmentCategory.MISC_EQUIPMENT,
        special: item.special,
      });
    let weight = item.weight;
    // MiscType.java:724-730,820-842. These variable rules have no fixed catalog tonnage.
    const size = Number(mount.equipmentId.split(/:size:/i)[1] ?? 1);
    if (item.id === 'droneoperatingsystem') weight = unit.tonnage / 10 + 0.5;
    else if (item.id === 'boobytrap')
      weight = roundSupportComponentWeight(unit.tonnage / 10, unit.tonnage);
    else if (item.id === 'dronecarriercontrolsystem') weight = 2 + size * 0.5;
    else if (item.id === 'mash-equipment') weight = 2.5 + size;
    else if (['cargo', 'communications-equipment'].includes(item.id))
      weight = roundSupportComponentWeight(size, unit.tonnage);
    else if (
      item.special?.includes('Variable weight') ||
      item.variableEquipmentId
    ) {
      const formula =
        VARIABLE_EQUIPMENT_FORMULAS[item.variableEquipmentId ?? item.id];
      const context = { tonnage: unit.tonnage, engineWeight };
      if (formula && formula.requiredContext.every((key) => key in context))
        weight = new FormulaEvaluator().evaluate(
          unit.tonnage < 5 && formula.weight.type === 'MULTIPLY_ROUND'
            ? { ...formula.weight, roundTo: 0.001 }
            : formula.weight,
          context,
        );
      else if (
        !['basic-fire-control', 'advanced-fire-control'].includes(item.id)
      )
        unresolved.push(mount.equipmentId);
    }
    // TestEntity.java:938-982: heat-neutral weapon load; small SVs need no sinks.
    const heat = weapon
      ? getVehicleHeatNeutralWeaponHeat({
          ...item,
          category:
            item.category === 'Energy'
              ? EquipmentCategory.ENERGY_WEAPON
              : EquipmentCategory.BALLISTIC_WEAPON,
        })
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
      mount.weight = roundSupportComponentWeight(
        weapons / (mount.id === 'basic-fire-control' ? 20 : 10),
        unit.tonnage,
      ); // MiscType.java:700-723
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
