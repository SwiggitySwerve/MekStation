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
import { isValidWeight } from '@/utils/physical/weightUtils';

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
  powerAmplifiers: number | null;
  remaining: number | null;
  isComplete: boolean;
}

/**
 * Tonnage of every figure the bar subtracts from the vehicle's tonnage.
 * Unknown mounted terms remain unavailable through the remaining budget.
 */
export function computeVehicleWeightBreakdown(
  state: VehicleWeightState,
  resolve: EquipmentResolver,
): VehicleWeightBreakdown {
  const mounted = computeVehicleMountedWeightBreakdown(state, resolve);
  const { equipment, energyWeapons, turret, secondaryTurret } = mounted;

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
    ? energyWeapons === null
      ? null
      : computePowerAmplifierWeight(energyWeapons)
    : 0;
  const powerAmplifiers =
    requiredAmps === null || !isValidWeight(state.powerAmpWeight)
      ? null
      : Math.max(state.powerAmpWeight, requiredAmps);
  const issues = [...mounted.issues];
  if (powerAmplifiers === null)
    issues.push('Power amplifier mass is unresolved or invalid');

  const { controls, lift } = computeVehicleControlsLiftWeights(state);

  const totalUsed =
    equipment === null ||
    turret === null ||
    secondaryTurret === null ||
    powerAmplifiers === null
      ? null
      : engine +
        controls +
        lift +
        structure +
        armor +
        equipment +
        turret +
        secondaryTurret +
        powerAmplifiers;
  const remaining = totalUsed === null ? null : state.tonnage - totalUsed;
  const finiteRemaining =
    remaining !== null && Number.isFinite(remaining) ? remaining : null;
  if (remaining !== null && finiteRemaining === null)
    issues.push('Remaining mass is nonfinite');
  return {
    ...mounted,
    engine,
    controls,
    lift,
    structure,
    armor,
    powerAmplifiers,
    issues,
    remaining: finiteRemaining,
    isComplete: finiteRemaining !== null,
  };
}
