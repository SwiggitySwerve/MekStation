/**
 * Vehicle Status Bar weight figures.
 *
 * Every term comes from the construction helpers that the validation
 * pipeline uses, so the bar and the validator describe the same vehicle.
 */

import { type VehicleEngineType } from '@/types/construction/EngineType';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  computeSupportVehicleEngineWeight,
  computeVehicleEngineWeight,
} from '@/utils/construction/vehicle/engine';
import {
  computePowerAmplifierWeight,
  requiresPowerAmplifiers,
} from '@/utils/construction/vehicle/powerAmplifier';
import { computeVehicleStructureWeight } from '@/utils/construction/vehicle/structure';

import type { VehicleStructureType } from './structure';

import {
  computeVehicleControlsLiftWeights,
  type VehicleControlsLiftContext,
} from './controlsLift';
import {
  computeVehicleMountedWeightBreakdown,
  type EquipmentResolver,
  type VehicleMountedWeightState,
  type VehicleMountedWeightBreakdown,
} from './mountedWeight';
import { computeSupportStructureWeight } from './supportWeight';
export type { EquipmentResolver } from './mountedWeight';

export interface VehicleWeightState
  extends VehicleControlsLiftContext, VehicleMountedWeightState {
  engineRating: number;
  engineType: VehicleEngineType;
  cruiseMP: number;
  engineTechRating?: number;
  structuralTechRating?: number;
  structureType: VehicleStructureType;
  armorTonnage: number;
  powerAmpWeight: number;
}

export interface VehicleWeightBreakdown extends VehicleMountedWeightBreakdown {
  engine: number;
  controls: number;
  lift: number;
  structure: number;
  armor: number;
  powerAmplifiers: number;
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
  const {
    equipment,
    turretEquipment,
    secondaryTurretEquipment,
    turretMounted,
    energyWeapons,
    turret,
    secondaryTurret,
  } = computeVehicleMountedWeightBreakdown(state, resolve);

  const engineContext = {
    tonnage: state.tonnage,
    motionType: state.motionType,
    cruiseMP: state.cruiseMP,
    engineTechRating: state.engineTechRating,
  };
  // Every support engine takes Java's support table (Engine.getWeightEngine).
  const engine =
    state.unitType === UnitType.SUPPORT_VEHICLE
      ? computeSupportVehicleEngineWeight(
          state.engineRating,
          state.engineType,
          engineContext,
        )
      : computeVehicleEngineWeight(
          state.engineRating,
          state.engineType,
          engineContext,
        );
  const structure =
    state.unitType === UnitType.SUPPORT_VEHICLE
      ? computeSupportStructureWeight(state)
      : computeVehicleStructureWeight(state.tonnage, state.structureType);
  const armor = state.armorTonnage;
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
