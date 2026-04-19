/**
 * Vehicle Critical Hit Resolution
 *
 * 2d6 vehicle critical-hit table + effect application. Unlike mechs, vehicle
 * crits don't consume critical slots — they modify the combat state:
 *   - Crew Stunned: skip next movement + weapon phase.
 *   - Engine Hit: 1st disables for a turn, 2nd destroys the vehicle.
 *   - Driver/Commander: wound counter; 2 kills the crew (vehicle destroyed).
 *   - Fuel Tank: ICE/FuelCell only — engine disabled; fusion → reroll.
 *   - Ammo Explosion: vehicle destroyed (per ammo-explosion system).
 *
 * @spec openspec/changes/add-vehicle-combat-behavior/specs/combat-resolution/spec.md
 *   #requirement vehicle-critical-hit-table
 */

import { EngineType } from '@/types/construction/EngineType';
import {
  IVehicleCombatState,
  IVehicleCritRollResult,
  VehicleCritKind,
} from '@/types/gameplay';

import { D6Roller, defaultD6Roller, roll2d6 } from './diceTypes';

// =============================================================================
// Crit Table
// =============================================================================

/**
 * Vehicle 2d6 crit table (spec delta, authoritative):
 *   2-5  = no critical
 *   6    = Crew Stunned
 *   7    = Weapon Destroyed
 *   8    = Cargo / Infantry Hit
 *   9    = Driver Hit
 *   10   = Fuel Tank Hit (ICE/Fuel Cell only; energy → reroll)
 *   11   = Engine Hit
 *   12   = Ammo Explosion (if ammo in slot)
 */
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
): IVehicleCritRollResult {
  const rolled = roll2d6(diceRoller);
  return vehicleCritFromRoll([rolled.dice[0], rolled.dice[1]]);
}

// =============================================================================
// Engine-type helpers
// =============================================================================

/**
 * Whether this engine has a physical fuel tank (ICE, Fuel Cell).
 * Fusion/XL/Light/XXL engines have no fuel-tank crit target — a Fuel Tank
 * roll for them becomes a reroll per TW.
 */
export function engineHasFuelTank(
  engineType: EngineType | string | number,
): boolean {
  return engineType === EngineType.ICE || engineType === EngineType.FUEL_CELL;
}

// =============================================================================
// Crit Effect Application
// =============================================================================

export interface IVehicleCritEffectContext {
  /** Engine type of the target (governs fuel-tank reroll). */
  readonly engineType: EngineType | string | number;
  /** Whether ammo is mounted at the crit location (governs ammo-explosion resolution). */
  readonly hasAmmoInSlot: boolean;
  /** True if the secondary turret took the crit (dual turrets). */
  readonly secondaryTurret?: boolean;
}

export interface IVehicleCritEffectResult {
  readonly state: IVehicleCombatState;
  /** The crit that was actually applied (may differ from rolled on reroll). */
  readonly applied: IVehicleCritRollResult;
  /** True when this crit triggers additional resolution (e.g., ammo explosion event). */
  readonly ammoExplosion: boolean;
}

/**
 * Apply a rolled vehicle crit to combat state. Returns the updated state
 * plus flags for callers that need to emit events (ammo explosion, crew
 * killed, etc.).
 */
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

    case 'crew_stunned': {
      // Skip next movement + weapon phase (2 phases).
      next = {
        ...state,
        motive: {
          ...state.motive,
          crewStunnedPhases: state.motive.crewStunnedPhases + 2,
        },
      };
      break;
    }

    case 'weapon_destroyed':
      // Weapon destruction handled by the equipment subsystem; combat state
      // doesn't track weapon status here. Caller emits `ComponentDestroyed`.
      return { state, applied, ammoExplosion: false };

    case 'cargo_hit':
      // Cargo / infantry damage handled by transport subsystem.
      return { state, applied, ammoExplosion: false };

    case 'driver_hit': {
      const newDriverHits = state.motive.driverHits + 1;
      const crewKilled = newDriverHits >= 2;
      next = {
        ...state,
        motive: { ...state.motive, driverHits: newDriverHits },
        destroyed: crewKilled ? true : state.destroyed,
        destructionCause: crewKilled ? 'crew_killed' : state.destructionCause,
      };
      break;
    }

    case 'fuel_tank': {
      if (!engineHasFuelTank(ctx.engineType)) {
        // Fusion/energy engines → reroll becomes "no effect" in this
        // simplified implementation (caller may opt to reroll).
        return {
          state,
          applied: { ...applied, kind: 'none' },
          ammoExplosion: false,
        };
      }
      // Fuel tank: engine disabled this turn (treat as first engine hit).
      next = {
        ...state,
        motive: { ...state.motive, engineHits: state.motive.engineHits + 1 },
      };
      break;
    }

    case 'engine_hit': {
      const newEngineHits = state.motive.engineHits + 1;
      const destroyed = newEngineHits >= 2;
      next = {
        ...state,
        motive: { ...state.motive, engineHits: newEngineHits },
        destroyed: destroyed ? true : state.destroyed,
        destructionCause: destroyed
          ? 'engine_destroyed'
          : state.destructionCause,
      };
      break;
    }

    case 'ammo_explosion': {
      if (!ctx.hasAmmoInSlot) {
        // No ammo in slot → no effect (per spec).
        return {
          state,
          applied: { ...applied, kind: 'none' },
          ammoExplosion: false,
        };
      }
      ammoExplosion = true;
      next = {
        ...state,
        destroyed: true,
        destructionCause: 'ammo_explosion',
      };
      break;
    }
  }

  return { state: next, applied, ammoExplosion };
}

/**
 * Roll + apply a vehicle crit in one call. The caller passes context telling
 * the resolver about the engine type and whether ammo is in the slot.
 */
export function vehicleResolveCriticalHits(
  state: IVehicleCombatState,
  ctx: IVehicleCritEffectContext,
  diceRoller: D6Roller = defaultD6Roller,
): IVehicleCritEffectResult {
  const rolled = rollVehicleCrit(diceRoller);
  return applyVehicleCritEffect(state, rolled, ctx);
}

// =============================================================================
// Turret Lock
// =============================================================================

/**
 * Apply a "turret locked" critical to the primary (or secondary) turret.
 * The locked turret subsequently uses the chassis Front arc only.
 */
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
