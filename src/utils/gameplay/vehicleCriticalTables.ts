/**
 * Location-sensitive vehicle critical tables.
 *
 * Mirrors MegaMek's Tank / VTOL table shape at the effect-selection layer:
 * front, rear, side/body, turret, and VTOL rotor locations can resolve the
 * same 2d6 total to different vehicle critical effects. When represented
 * availability state is supplied, unavailable entries fall through the table in
 * the same shape as MegaMek's Tank / VTOL getCriticalEffect implementations.
 *
 * @spec openspec/changes/align-vehicle-critical-location-tables/specs/combat-resolution/spec.md
 * @spec openspec/changes/align-vehicle-critical-availability-fallthrough/specs/combat-resolution/spec.md
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
  readonly hasEngine?: boolean;
  readonly engineAlreadyHit?: boolean;
  readonly driverAlreadyHit?: boolean;
  readonly commanderAlreadyHit?: boolean;
  readonly crewAlive?: boolean;
  readonly hasAvailableAmmo?: boolean;
  readonly hasCargoLoaded?: boolean;
  readonly hasWeaponAtLocation?: boolean;
  readonly hasJammableWeaponAtLocation?: boolean;
  readonly hasDestroyableWeaponAtLocation?: boolean;
  readonly stabilizerAlreadyHit?: boolean;
  readonly sensorHits?: number;
  readonly turretAlreadyLocked?: boolean;
  readonly vehicleImmobile?: boolean;
  readonly flightStabilizerAlreadyHit?: boolean;
}

type VehicleCritSelector = (
  context: IVehicleCriticalTableContext,
) => VehicleCritKind | undefined;

type VehicleCritTable = Readonly<Record<number, VehicleCritSelector>>;

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
      return tableLookup(roll, TANK_FRONT_CRITS, context);
    case VehicleLocation.REAR:
      return tableLookup(roll, TANK_REAR_CRITS, context);
    case VehicleLocation.TURRET:
      return tableLookup(roll, TURRET_CRITS, context);
    default:
      return tableLookup(roll, TANK_SIDE_CRITS, context);
  }
}

function vtolCritKindFromRoll(
  roll: number,
  context: IVehicleCriticalTableContext,
): VehicleCritKind {
  switch (context.location) {
    case VTOLLocation.ROTOR:
      return tableLookup(roll, VTOL_ROTOR_CRITS, context);
    case VehicleLocation.FRONT:
      return tableLookup(roll, VTOL_FRONT_CRITS, context);
    case VehicleLocation.REAR:
      return tableLookup(roll, VTOL_REAR_CRITS, context);
    case VehicleLocation.TURRET:
      return tableLookup(roll, TURRET_CRITS, context);
    default:
      return tableLookup(roll, VTOL_SIDE_CRITS, context);
  }
}

function tableLookup(
  roll: number,
  table: VehicleCritTable,
  context: IVehicleCriticalTableContext,
): VehicleCritKind {
  const startingRolls = roll === 6 ? [6] : [roll, 6];
  for (const startingRoll of startingRolls) {
    for (
      let candidateRoll = startingRoll;
      candidateRoll <= 12;
      candidateRoll++
    ) {
      const selection = table[candidateRoll]?.(context);
      if (selection !== undefined) {
        return selection;
      }
    }
  }
  return 'none';
}

function engineCrit(
  context: IVehicleCriticalTableContext,
): VehicleCritKind | undefined {
  if (context.hasEngine === false) {
    return 'none';
  }
  return context.engineAlreadyHit === true ? undefined : 'engine_hit';
}

function engineOrFuelTankCrit(
  context: IVehicleCriticalTableContext,
): VehicleCritKind | undefined {
  if (context.hasEngine === false) {
    return 'none';
  }
  if (engineHasFuelTankType(context.engineType ?? EngineType.STANDARD)) {
    return 'fuel_tank';
  }
  return engineCrit(context);
}

function engineHasFuelTankType(
  engineType: EngineType | string | number,
): boolean {
  return engineType === EngineType.ICE || engineType === EngineType.FUEL_CELL;
}

function fixed(kind: VehicleCritKind): VehicleCritSelector {
  return () => kind;
}

function crewIsAvailable(context: IVehicleCriticalTableContext): boolean {
  return context.crewAlive !== false;
}

function tankDriverCrit(
  context: IVehicleCriticalTableContext,
): VehicleCritKind | undefined {
  if (!crewIsAvailable(context)) return undefined;
  if (context.driverAlreadyHit !== true) return 'driver_hit';
  if (context.commanderAlreadyHit !== true) return 'crew_stunned';
  return 'crew_killed';
}

function tankCommanderCrit(
  context: IVehicleCriticalTableContext,
): VehicleCritKind | undefined {
  if (!crewIsAvailable(context)) return undefined;
  if (context.commanderAlreadyHit !== true) return 'commander_hit';
  if (context.driverAlreadyHit !== true) return 'crew_stunned';
  return 'crew_killed';
}

function tankCrewStunnedOrKilled(
  context: IVehicleCriticalTableContext,
): VehicleCritKind | undefined {
  if (!crewIsAvailable(context)) return undefined;
  return context.commanderAlreadyHit === true &&
    context.driverAlreadyHit === true
    ? 'crew_killed'
    : 'crew_stunned';
}

function vtolCopilotCrit(
  context: IVehicleCriticalTableContext,
): VehicleCritKind | undefined {
  if (context.driverAlreadyHit !== true) return 'copilot_hit';
  return crewIsAvailable(context) ? 'crew_killed' : undefined;
}

function vtolPilotCrit(
  context: IVehicleCriticalTableContext,
): VehicleCritKind | undefined {
  if (context.commanderAlreadyHit !== true) return 'pilot_hit';
  return crewIsAvailable(context) ? 'crew_killed' : undefined;
}

function jammableWeaponCrit(
  context: IVehicleCriticalTableContext,
): VehicleCritKind | undefined {
  if (context.hasWeaponAtLocation === false) return undefined;
  return context.hasJammableWeaponAtLocation === false
    ? undefined
    : 'weapon_jammed';
}

function destroyableWeaponCrit(
  context: IVehicleCriticalTableContext,
): VehicleCritKind | undefined {
  if (context.hasWeaponAtLocation === false) return undefined;
  return context.hasDestroyableWeaponAtLocation === false
    ? undefined
    : 'weapon_destroyed';
}

function stabilizerCrit(
  context: IVehicleCriticalTableContext,
): VehicleCritKind | undefined {
  if (
    context.stabilizerAlreadyHit === true ||
    context.hasWeaponAtLocation === false
  ) {
    return undefined;
  }
  return 'stabilizer_hit';
}

function sensorCrit(
  context: IVehicleCriticalTableContext,
): VehicleCritKind | undefined {
  return (context.sensorHits ?? 0) < 4 ? 'sensor_hit' : undefined;
}

function cargoCrit(
  context: IVehicleCriticalTableContext,
): VehicleCritKind | undefined {
  return context.hasCargoLoaded === false ? undefined : 'cargo_hit';
}

function ammoCrit(
  context: IVehicleCriticalTableContext,
): VehicleCritKind | undefined {
  return context.hasAvailableAmmo === false ? undefined : 'ammo_explosion';
}

function turretJamCrit(
  context: IVehicleCriticalTableContext,
): VehicleCritKind | undefined {
  if (context.motionType === GroundMotionType.VTOL) return 'turret_jammed';
  return context.turretAlreadyLocked === true ? undefined : 'turret_jammed';
}

function turretLockCrit(
  context: IVehicleCriticalTableContext,
): VehicleCritKind | undefined {
  if (context.motionType === GroundMotionType.VTOL) return 'turret_locked';
  return context.turretAlreadyLocked === true ? undefined : 'turret_locked';
}

function rotorDamageCrit(
  context: IVehicleCriticalTableContext,
): VehicleCritKind | undefined {
  return context.vehicleImmobile === true ? undefined : 'rotor_damage';
}

function flightStabilizerCrit(
  context: IVehicleCriticalTableContext,
): VehicleCritKind | undefined {
  return context.flightStabilizerAlreadyHit === true
    ? undefined
    : 'flight_stabilizer';
}

const TANK_FRONT_CRITS: VehicleCritTable = {
  6: tankDriverCrit,
  7: jammableWeaponCrit,
  8: stabilizerCrit,
  9: sensorCrit,
  10: tankCommanderCrit,
  11: destroyableWeaponCrit,
  12: fixed('crew_killed'),
};

const TANK_REAR_CRITS: VehicleCritTable = {
  6: jammableWeaponCrit,
  7: cargoCrit,
  8: stabilizerCrit,
  9: destroyableWeaponCrit,
  10: engineCrit,
  11: ammoCrit,
  12: engineOrFuelTankCrit,
};

const TANK_SIDE_CRITS: VehicleCritTable = {
  6: cargoCrit,
  7: jammableWeaponCrit,
  8: tankCrewStunnedOrKilled,
  9: stabilizerCrit,
  10: destroyableWeaponCrit,
  11: engineCrit,
  12: engineOrFuelTankCrit,
};

const TURRET_CRITS: VehicleCritTable = {
  6: stabilizerCrit,
  7: turretJamCrit,
  8: jammableWeaponCrit,
  9: turretLockCrit,
  10: destroyableWeaponCrit,
  11: ammoCrit,
  12: fixed('turret_destroyed'),
};

const VTOL_FRONT_CRITS: VehicleCritTable = {
  6: vtolCopilotCrit,
  7: jammableWeaponCrit,
  8: stabilizerCrit,
  9: sensorCrit,
  10: vtolPilotCrit,
  11: destroyableWeaponCrit,
  12: fixed('crew_killed'),
};

const VTOL_REAR_CRITS: VehicleCritTable = {
  6: cargoCrit,
  7: jammableWeaponCrit,
  8: stabilizerCrit,
  9: destroyableWeaponCrit,
  10: sensorCrit,
  11: engineCrit,
  12: engineOrFuelTankCrit,
};

const VTOL_SIDE_CRITS: VehicleCritTable = {
  6: jammableWeaponCrit,
  7: cargoCrit,
  8: stabilizerCrit,
  9: destroyableWeaponCrit,
  10: engineCrit,
  11: ammoCrit,
  12: engineOrFuelTankCrit,
};

const VTOL_ROTOR_CRITS: VehicleCritTable = {
  6: rotorDamageCrit,
  7: rotorDamageCrit,
  8: rotorDamageCrit,
  9: flightStabilizerCrit,
  10: flightStabilizerCrit,
  11: fixed('rotor_destroyed'),
  12: fixed('rotor_destroyed'),
};
