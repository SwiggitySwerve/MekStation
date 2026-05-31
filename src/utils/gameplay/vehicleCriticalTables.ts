/**
 * Location-sensitive vehicle critical tables.
 *
 * Mirrors MegaMek's Tank / VTOL table shape at the effect-selection layer:
 * front, rear, side/body, turret, and VTOL rotor locations can resolve the
 * same 2d6 total to different vehicle critical effects. Equipment availability
 * fallthrough is handled as later fidelity work.
 *
 * @spec openspec/changes/align-vehicle-critical-location-tables/specs/combat-resolution/spec.md
 */

import { EngineType } from '@/types/construction/EngineType';
import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import { IVehicleCritRollResult, VehicleCritKind } from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

export interface IVehicleCriticalTableContext {
  readonly location: VehicleLocation | VTOLLocation;
  readonly motionType: GroundMotionType;
  readonly engineType?: EngineType | string | number;
  readonly engineAlreadyHit?: boolean;
}

export function vehicleCritFromRollForLocation(
  dice: readonly [number, number],
  context: IVehicleCriticalTableContext,
): IVehicleCritRollResult {
  const [d1, d2] = dice;
  const roll = Math.max(2, Math.min(12, d1 + d2));
  const kind = roll < 6 ? 'none' : vehicleCritKindFromRoll(roll, context);
  return { dice: [d1, d2], roll, kind };
}

function vehicleCritKindFromRoll(
  roll: number,
  context: IVehicleCriticalTableContext,
): VehicleCritKind {
  if (context.motionType === GroundMotionType.VTOL) {
    return vtolCritKindFromRoll(roll, context);
  }
  return tankCritKindFromRoll(roll, context);
}

function tankCritKindFromRoll(
  roll: number,
  context: IVehicleCriticalTableContext,
): VehicleCritKind {
  switch (context.location) {
    case VehicleLocation.FRONT:
      return tableLookup(roll, TANK_FRONT_CRITS);
    case VehicleLocation.REAR:
      return tableLookup(roll, tankRearCrits(context));
    case VehicleLocation.TURRET:
      return tableLookup(roll, TURRET_CRITS);
    default:
      return tableLookup(roll, tankSideCrits(context));
  }
}

function vtolCritKindFromRoll(
  roll: number,
  context: IVehicleCriticalTableContext,
): VehicleCritKind {
  switch (context.location) {
    case VTOLLocation.ROTOR:
      return tableLookup(roll, VTOL_ROTOR_CRITS);
    case VehicleLocation.FRONT:
      return tableLookup(roll, VTOL_FRONT_CRITS);
    case VehicleLocation.REAR:
      return tableLookup(roll, vtolRearCrits(context));
    case VehicleLocation.TURRET:
      return tableLookup(roll, TURRET_CRITS);
    default:
      return tableLookup(roll, vtolSideCrits(context));
  }
}

function tableLookup(
  roll: number,
  table: Readonly<Record<number, VehicleCritKind>>,
): VehicleCritKind {
  return table[roll] ?? 'none';
}

function tankRearCrits(
  context: IVehicleCriticalTableContext,
): Readonly<Record<number, VehicleCritKind>> {
  return {
    6: 'weapon_jammed',
    7: 'cargo_hit',
    8: 'stabilizer_hit',
    9: 'weapon_destroyed',
    10: engineCritOrNone(context),
    11: 'ammo_explosion',
    12: engineOrFuelTankCrit(context),
  };
}

function tankSideCrits(
  context: IVehicleCriticalTableContext,
): Readonly<Record<number, VehicleCritKind>> {
  return {
    6: 'cargo_hit',
    7: 'weapon_jammed',
    8: 'crew_stunned',
    9: 'stabilizer_hit',
    10: 'weapon_destroyed',
    11: engineCritOrNone(context),
    12: engineOrFuelTankCrit(context),
  };
}

function vtolRearCrits(
  context: IVehicleCriticalTableContext,
): Readonly<Record<number, VehicleCritKind>> {
  return {
    6: 'cargo_hit',
    7: 'weapon_jammed',
    8: 'stabilizer_hit',
    9: 'weapon_destroyed',
    10: 'sensor_hit',
    11: engineCritOrNone(context),
    12: engineOrFuelTankCrit(context),
  };
}

function vtolSideCrits(
  context: IVehicleCriticalTableContext,
): Readonly<Record<number, VehicleCritKind>> {
  return {
    6: 'weapon_jammed',
    7: 'cargo_hit',
    8: 'stabilizer_hit',
    9: 'weapon_destroyed',
    10: engineCritOrNone(context),
    11: 'ammo_explosion',
    12: engineOrFuelTankCrit(context),
  };
}

function engineCritOrNone(
  context: IVehicleCriticalTableContext,
): VehicleCritKind {
  return context.engineAlreadyHit === true ? 'none' : 'engine_hit';
}

function engineOrFuelTankCrit(
  context: IVehicleCriticalTableContext,
): VehicleCritKind {
  if (engineHasFuelTankType(context.engineType ?? EngineType.STANDARD)) {
    return 'fuel_tank';
  }
  return engineCritOrNone(context);
}

function engineHasFuelTankType(
  engineType: EngineType | string | number,
): boolean {
  return engineType === EngineType.ICE || engineType === EngineType.FUEL_CELL;
}

const TANK_FRONT_CRITS: Readonly<Record<number, VehicleCritKind>> = {
  6: 'driver_hit',
  7: 'weapon_jammed',
  8: 'stabilizer_hit',
  9: 'sensor_hit',
  10: 'commander_hit',
  11: 'weapon_destroyed',
  12: 'crew_killed',
};

const TURRET_CRITS: Readonly<Record<number, VehicleCritKind>> = {
  6: 'stabilizer_hit',
  7: 'turret_jammed',
  8: 'weapon_jammed',
  9: 'turret_locked',
  10: 'weapon_destroyed',
  11: 'ammo_explosion',
  12: 'turret_destroyed',
};

const VTOL_FRONT_CRITS: Readonly<Record<number, VehicleCritKind>> = {
  6: 'copilot_hit',
  7: 'weapon_jammed',
  8: 'stabilizer_hit',
  9: 'sensor_hit',
  10: 'pilot_hit',
  11: 'weapon_destroyed',
  12: 'crew_killed',
};

const VTOL_ROTOR_CRITS: Readonly<Record<number, VehicleCritKind>> = {
  6: 'rotor_damage',
  7: 'rotor_damage',
  8: 'rotor_damage',
  9: 'flight_stabilizer',
  10: 'flight_stabilizer',
  11: 'rotor_destroyed',
  12: 'rotor_destroyed',
};
