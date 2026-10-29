/**
 * Vehicle Status Bar weight figures.
 *
 * Every term comes from the construction helpers that the validation
 * pipeline uses, so the bar and the validator describe the same vehicle.
 */

import type { EngineType } from '@/types/construction/EngineType';
import type {
  IVehicleMountedEquipment,
  ITurretConfiguration,
} from '@/types/unit/VehicleInterfaces';

import { VehicleLocation } from '@/types/construction/UnitLocation';
import { IEquipmentItem } from '@/types/equipment';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { computeVehicleEngineWeight } from '@/utils/construction/vehicle/engine';
import { computeTurretEquipmentWeight } from '@/utils/construction/vehicle/equipmentMounts';
import {
  computePowerAmplifierWeight,
  isPowerAmplifierEnergyWeapon,
  requiresPowerAmplifiers,
} from '@/utils/construction/vehicle/powerAmplifier';
import { computeVehicleStructureWeight } from '@/utils/construction/vehicle/structure';
import { computeTurretWeight } from '@/utils/construction/vehicle/turret';

import type { VehicleStructureType } from './structure';

import {
  computeVehicleControlsLiftWeights,
  type VehicleControlsLiftContext,
} from './controlsLift';

export type EquipmentResolver = (
  equipmentId: string,
) => IEquipmentItem | undefined;

export interface VehicleWeightState extends VehicleControlsLiftContext {
  engineRating: number;
  engineType: EngineType;
  structureType: VehicleStructureType;
  armorTonnage: number;
  equipment: readonly IVehicleMountedEquipment[];
  turret: ITurretConfiguration | null;
  secondaryTurret: ITurretConfiguration | null;
  powerAmpWeight: number;
}

export interface VehicleWeightBreakdown {
  engine: number;
  controls: number;
  lift: number;
  structure: number;
  armor: number;
  equipment: number;
  turret: number;
  secondaryTurret: number;
  powerAmplifiers: number;
  /** Tons of non-ammunition equipment in the primary turret (structure basis) */
  turretEquipment: number;
  /** Tons of non-ammunition equipment in the secondary turret */
  secondaryTurretEquipment: number;
  /** Tons of everything mounted in the primary turret, ammunition included */
  turretMounted: number;
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
      isAmmunition: item?.category === EquipmentCategory.AMMUNITION,
      needsAmplifier: item !== undefined && isPowerAmplifierEnergyWeapon(item),
      inSecondaryTurret: e.location === VehicleLocation.TURRET_2,
      inPrimaryTurret:
        e.isTurretMounted && e.location !== VehicleLocation.TURRET_2,
    };
  });

  const equipment = mounted.reduce((sum, m) => sum + m.weight, 0);
  // Turret structure is 10% of the turret's equipment, ammunition excluded.
  const turretEquipment = computeTurretEquipmentWeight(
    mounted.map((m) => ({
      isTurretMounted: m.inPrimaryTurret && !m.isAmmunition,
      weight: m.weight,
    })),
  );
  const secondaryTurretEquipment = computeTurretEquipmentWeight(
    mounted.map((m) => ({
      isTurretMounted: m.inSecondaryTurret && !m.isAmmunition,
      weight: m.weight,
    })),
  );
  const turretMounted = computeTurretEquipmentWeight(
    mounted.map((m) => ({
      isTurretMounted: m.inPrimaryTurret,
      weight: m.weight,
    })),
  );
  const energyWeapons = mounted
    .filter((m) => m.needsAmplifier)
    .reduce((sum, m) => sum + m.weight, 0);

  const engine = computeVehicleEngineWeight(
    state.engineRating,
    state.engineType,
    { tonnage: state.tonnage, motionType: state.motionType },
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

  const { controls, lift } = computeVehicleControlsLiftWeights(state);

  const totalUsed =
    engine +
    controls +
    lift +
    structure +
    armor +
    equipment +
    turret +
    secondaryTurret +
    powerAmplifiers;

  return {
    engine,
    controls,
    lift,
    structure,
    armor,
    equipment,
    turret,
    secondaryTurret,
    powerAmplifiers,
    turretEquipment,
    secondaryTurretEquipment,
    turretMounted,
    energyWeapons,
    remaining: state.tonnage - totalUsed,
  };
}
