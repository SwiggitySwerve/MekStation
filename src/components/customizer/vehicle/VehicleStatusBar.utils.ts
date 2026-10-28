/**
 * Vehicle Status Bar weight figures.
 *
 * Every term comes from the construction helpers that the validation
 * pipeline uses, so the bar and the validator describe the same vehicle.
 */

import type { VehicleStore } from '@/stores/useVehicleStore';

import { VehicleLocation } from '@/types/construction/UnitLocation';
import { IEquipmentItem } from '@/types/equipment';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { computeVehicleEngineWeight } from '@/utils/construction/vehicle/engine';
import { computeTurretEquipmentWeight } from '@/utils/construction/vehicle/equipmentMounts';
import {
  computePowerAmplifierWeight,
  requiresPowerAmplifiers,
} from '@/utils/construction/vehicle/powerAmplifier';
import { computeVehicleStructureWeight } from '@/utils/construction/vehicle/structure';
import { computeTurretWeight } from '@/utils/construction/vehicle/turret';

export type EquipmentResolver = (
  equipmentId: string,
) => IEquipmentItem | undefined;

export type VehicleWeightState = Pick<
  VehicleStore,
  | 'tonnage'
  | 'engineRating'
  | 'engineType'
  | 'structureType'
  | 'armorTonnage'
  | 'equipment'
  | 'turret'
  | 'secondaryTurret'
  | 'powerAmpWeight'
>;

export interface VehicleWeightBreakdown {
  engine: number;
  structure: number;
  armor: number;
  equipment: number;
  turret: number;
  secondaryTurret: number;
  powerAmplifiers: number;
  /** Tons of equipment mounted in the primary turret */
  turretEquipment: number;
  /** Tons of equipment mounted in the secondary turret */
  secondaryTurretEquipment: number;
  /** Tons of energy weapons (what power amplifiers are sized from) */
  energyWeapons: number;
  remaining: number;
}

/**
 * Tonnage of every figure the bar subtracts from the vehicle's tonnage.
 * Equipment the resolver cannot find counts as 0.
 */
export function computeVehicleWeightBreakdown(
  state: VehicleWeightState,
  resolve: EquipmentResolver,
): VehicleWeightBreakdown {
  const mounted = state.equipment.map((e) => {
    const item = resolve(e.equipmentId);
    return {
      weight: item?.weight ?? 0,
      isEnergyWeapon: item?.category === EquipmentCategory.ENERGY_WEAPON,
      inSecondaryTurret: e.location === VehicleLocation.TURRET_2,
      inPrimaryTurret:
        e.isTurretMounted && e.location !== VehicleLocation.TURRET_2,
    };
  });

  const equipment = mounted.reduce((sum, m) => sum + m.weight, 0);
  const turretEquipment = computeTurretEquipmentWeight(
    mounted.map((m) => ({
      isTurretMounted: m.inPrimaryTurret,
      weight: m.weight,
    })),
  );
  const secondaryTurretEquipment = computeTurretEquipmentWeight(
    mounted.map((m) => ({
      isTurretMounted: m.inSecondaryTurret,
      weight: m.weight,
    })),
  );
  const energyWeapons = mounted
    .filter((m) => m.isEnergyWeapon)
    .reduce((sum, m) => sum + m.weight, 0);

  const engine = computeVehicleEngineWeight(
    state.engineRating,
    state.engineType,
  );
  const structure = computeVehicleStructureWeight(
    state.tonnage,
    state.structureType,
  );
  const armor = state.armorTonnage;
  const turret = state.turret
    ? computeTurretWeight(state.turret.type, turretEquipment)
    : 0;
  const secondaryTurret = state.secondaryTurret
    ? computeTurretWeight(state.secondaryTurret.type, secondaryTurretEquipment)
    : 0;
  // A vehicle that needs amplifiers carries at least the required weight,
  // even before the store has derived `powerAmpWeight`.
  const requiredAmps = requiresPowerAmplifiers(state.engineType)
    ? computePowerAmplifierWeight(energyWeapons)
    : 0;
  const powerAmplifiers = Math.max(state.powerAmpWeight, requiredAmps);

  const totalUsed =
    engine +
    structure +
    armor +
    equipment +
    turret +
    secondaryTurret +
    powerAmplifiers;

  return {
    engine,
    structure,
    armor,
    equipment,
    turret,
    secondaryTurret,
    powerAmplifiers,
    turretEquipment,
    secondaryTurretEquipment,
    energyWeapons,
    remaining: state.tonnage - totalUsed,
  };
}
