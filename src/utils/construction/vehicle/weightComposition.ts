/**
 * Vehicle Status Bar weight figures.
 *
 * Every term comes from the construction helpers that the validation
 * pipeline uses, so the bar and the validator describe the same vehicle.
 */

import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import {
  EngineType,
  type VehicleEngineType,
} from '@/types/construction/EngineType';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  computeVehicleInstalledEngineWeight,
  isVehicleFusionEngine,
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
  computeVehicleMountedWeightFigures,
  type EquipmentResolver,
  type VehicleMountedWeightState,
  type VehicleMountedWeightBreakdown,
} from './mountedWeight';
import { computeSupportStructureWeight } from './supportWeight';
export type { EquipmentResolver } from './mountedWeight';

export interface VehicleWeightState
  extends
    VehicleControlsLiftContext,
    Omit<VehicleMountedWeightState, keyof VehicleControlsLiftContext> {
  engineRating: number;
  engineType: VehicleEngineType;
  cruiseMP: number;
  engineTechRating?: number;
  structuralTechRating?: number;
  structureType: VehicleStructureType;
  armorTonnage: number;
  armorType?: ArmorTypeEnum;
  powerAmpWeight: number;
}

export interface VehicleWeightBreakdown extends VehicleMountedWeightBreakdown {
  /** Combat heat-neutral sinks; support's existing editor terms are unchanged. */
  heatSinks?: number | null;
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
  const engine = computeVehicleInstalledEngineWeight(state);
  const {
    rawWeaponHeat,
    primarySummary: _primary,
    secondarySummary: _secondary,
    ...mounted
  } = computeVehicleMountedWeightFigures(
    { ...state, engineWeight: engine },
    resolve,
  );
  // Engine.java:480-493; TestTank.java:264-270 and TestEntity.java:980-981,
  // MegaMek 48fcb2f64a1b. Combat sinks weigh one ton beyond the free allowance.
  const freeHeatSinks = isVehicleFusionEngine(state.engineType)
    ? 10
    : state.engineType === EngineType.FISSION
      ? 5
      : state.engineType === EngineType.FUEL_CELL
        ? 1
        : 0;
  const heatSinks =
    state.unitType === UnitType.SUPPORT_VEHICLE
      ? 0
      : rawWeaponHeat === null
        ? null
        : Math.max(
            0,
            rawWeaponHeat +
              (state.armorType === ArmorTypeEnum.STEALTH ? 10 : 0) -
              freeHeatSinks,
          );
  const { equipment, energyWeapons, turret, secondaryTurret } = mounted;

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
  if (heatSinks === null)
    issues.push('Heat sink mass is unresolved or invalid');
  if (powerAmplifiers === null)
    issues.push('Power amplifier mass is unresolved or invalid');

  const { controls, lift } = computeVehicleControlsLiftWeights(state);

  const totalUsed =
    equipment === null ||
    turret === null ||
    secondaryTurret === null ||
    powerAmplifiers === null ||
    heatSinks === null
      ? null
      : engine +
        controls +
        lift +
        structure +
        armor +
        equipment +
        turret +
        secondaryTurret +
        powerAmplifiers +
        heatSinks;
  const remaining = totalUsed === null ? null : state.tonnage - totalUsed;
  const finiteRemaining =
    remaining !== null && Number.isFinite(remaining) ? remaining : null;
  if (remaining !== null && finiteRemaining === null)
    issues.push('Remaining mass is nonfinite');
  return {
    ...mounted,
    ...(state.unitType === UnitType.SUPPORT_VEHICLE ? {} : { heatSinks }),
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
