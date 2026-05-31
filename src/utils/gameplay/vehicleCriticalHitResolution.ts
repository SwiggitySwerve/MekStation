/**
 * Vehicle Critical Hit Resolution
 *
 * Applies vehicle critical effects to the represented combat-state envelope.
 * The legacy `vehicleCritFromRoll` generic table remains for direct callers;
 * committed session attacks pass a location context to `rollVehicleCrit` so
 * Tank / VTOL critical results follow the struck location table.
 *
 * @spec openspec/changes/add-vehicle-combat-behavior/specs/combat-resolution/spec.md
 *   #requirement vehicle-critical-hit-table
 * @spec openspec/changes/align-vehicle-critical-location-tables/specs/combat-resolution/spec.md
 */

import { EngineType } from '@/types/construction/EngineType';
import { VehicleLocation } from '@/types/construction/UnitLocation';
import {
  IVehicleCombatState,
  IVehicleCritRollResult,
  VehicleCritKind,
} from '@/types/gameplay';

import { D6Roller, defaultD6Roller, roll2d6 } from './diceTypes';
import {
  type IVehicleCriticalTableContext,
  vehicleCritFromRollForLocation,
} from './vehicleCriticalTables';

export function vehicleCritFromRoll(
  dice: readonly [number, number],
): IVehicleCritRollResult {
  const [d1, d2] = dice;
  const roll = d1 + d2;

  let kind: VehicleCritKind;
  if (roll <= 5) kind = 'none';
  else if (roll === 6) kind = 'crew_stunned';
  else if (roll === 7) kind = 'weapon_destroyed';
  else if (roll === 8) kind = 'cargo_hit';
  else if (roll === 9) kind = 'driver_hit';
  else if (roll === 10) kind = 'fuel_tank';
  else if (roll === 11) kind = 'engine_hit';
  else kind = 'ammo_explosion';

  return { dice: [d1, d2], roll, kind };
}

export function rollVehicleCrit(
  diceRoller: D6Roller = defaultD6Roller,
  context?: IVehicleCriticalTableContext,
): IVehicleCritRollResult {
  const rolled = roll2d6(diceRoller);
  const dice = [rolled.dice[0], rolled.dice[1]] as const;
  return context
    ? vehicleCritFromRollForLocation(dice, context)
    : vehicleCritFromRoll(dice);
}

export function engineHasFuelTank(
  engineType: EngineType | string | number,
): boolean {
  return engineType === EngineType.ICE || engineType === EngineType.FUEL_CELL;
}

export interface IVehicleCritEffectContext {
  readonly engineType: EngineType | string | number;
  readonly hasAmmoInSlot: boolean;
  readonly secondaryTurret?: boolean;
}

export interface IVehicleCritEffectResult {
  readonly state: IVehicleCombatState;
  readonly applied: IVehicleCritRollResult;
  readonly ammoExplosion: boolean;
}

export function applyVehicleCritEffect(
  state: IVehicleCombatState,
  crit: IVehicleCritRollResult,
  ctx: IVehicleCritEffectContext,
): IVehicleCritEffectResult {
  if (state.destroyed) {
    return { state, applied: crit, ammoExplosion: false };
  }

  const applied = crit;
  let ammoExplosion = false;
  let next: IVehicleCombatState = state;

  switch (applied.kind) {
    case 'none':
      return { state, applied, ammoExplosion: false };
    case 'crew_stunned':
      next = applyCrewStunned(state);
      break;
    case 'driver_hit':
    case 'pilot_hit':
      next = applyDriverHit(state);
      break;
    case 'commander_hit':
    case 'copilot_hit':
      next = applyCommanderHit(state);
      break;
    case 'crew_killed':
      next = { ...state, destroyed: true, destructionCause: 'crew_killed' };
      break;
    case 'fuel_tank':
      if (!engineHasFuelTank(ctx.engineType)) {
        return {
          state,
          applied: { ...applied, kind: 'none' },
          ammoExplosion: false,
        };
      }
      next = {
        ...state,
        destroyed: true,
        destructionCause: 'fuel_tank_explosion',
      };
      break;
    case 'engine_hit':
      next = applyEngineHit(state);
      break;
    case 'ammo_explosion':
      if (!ctx.hasAmmoInSlot) {
        return {
          state,
          applied: { ...applied, kind: 'none' },
          ammoExplosion: false,
        };
      }
      ammoExplosion = true;
      next = { ...state, destroyed: true, destructionCause: 'ammo_explosion' };
      break;
    case 'turret_locked':
      next = applyTurretLocked(state, ctx.secondaryTurret === true);
      break;
    case 'turret_destroyed':
      next = applyTurretDestroyed(state);
      break;
    case 'rotor_damage':
      next = applyRotorDamage(state);
      break;
    case 'rotor_destroyed':
      next = {
        ...state,
        motive: { ...state.motive, immobilized: true },
      };
      break;
    case 'weapon_destroyed':
    case 'weapon_jammed':
    case 'cargo_hit':
    case 'stabilizer_hit':
    case 'sensor_hit':
    case 'turret_jammed':
    case 'flight_stabilizer':
      return { state, applied, ammoExplosion: false };
  }

  return { state: next, applied, ammoExplosion };
}

export function vehicleResolveCriticalHits(
  state: IVehicleCombatState,
  ctx: IVehicleCritEffectContext,
  diceRoller: D6Roller = defaultD6Roller,
): IVehicleCritEffectResult {
  const rolled = rollVehicleCrit(diceRoller);
  return applyVehicleCritEffect(state, rolled, ctx);
}

export function applyTurretLocked(
  state: IVehicleCombatState,
  secondary = false,
): IVehicleCombatState {
  return {
    ...state,
    turretLock: secondary
      ? { ...state.turretLock, secondaryLocked: true }
      : { ...state.turretLock, primaryLocked: true },
    motive: secondary ? state.motive : { ...state.motive, turretLocked: true },
  };
}

function applyCrewStunned(state: IVehicleCombatState): IVehicleCombatState {
  return {
    ...state,
    motive: {
      ...state.motive,
      crewStunnedPhases: state.motive.crewStunnedPhases + 2,
    },
  };
}

function applyDriverHit(state: IVehicleCombatState): IVehicleCombatState {
  const driverHits = state.motive.driverHits + 1;
  return {
    ...state,
    motive: { ...state.motive, driverHits },
    destroyed: driverHits >= 2 ? true : state.destroyed,
    destructionCause: driverHits >= 2 ? 'crew_killed' : state.destructionCause,
  };
}

function applyCommanderHit(state: IVehicleCombatState): IVehicleCombatState {
  const commanderHits = state.motive.commanderHits + 1;
  const crewKilled = commanderHits >= 2;
  return {
    ...state,
    motive: {
      ...state.motive,
      commanderHits,
      crewStunnedPhases: state.motive.crewStunnedPhases + 2,
    },
    destroyed: crewKilled ? true : state.destroyed,
    destructionCause: crewKilled ? 'crew_killed' : state.destructionCause,
  };
}

function applyEngineHit(state: IVehicleCombatState): IVehicleCombatState {
  const engineHits = state.motive.engineHits + 1;
  return {
    ...state,
    motive: { ...state.motive, engineHits },
    destroyed: engineHits >= 2 ? true : state.destroyed,
    destructionCause:
      engineHits >= 2 ? 'engine_destroyed' : state.destructionCause,
  };
}

function applyTurretDestroyed(state: IVehicleCombatState): IVehicleCombatState {
  const turretLocation = VehicleLocation.TURRET;
  return {
    ...state,
    destroyedLocations: state.destroyedLocations.includes(turretLocation)
      ? state.destroyedLocations
      : [...state.destroyedLocations, turretLocation],
    destroyed: true,
    destructionCause: 'turret_destroyed',
  };
}

function applyRotorDamage(state: IVehicleCombatState): IVehicleCombatState {
  const penaltyMP = state.motive.penaltyMP + 1;
  return {
    ...state,
    motive: {
      ...state.motive,
      penaltyMP,
      immobilized:
        state.motive.immobilized || penaltyMP >= state.motive.originalCruiseMP,
    },
  };
}
