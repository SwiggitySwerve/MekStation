/**
 * Vehicle Critical Hit Resolution
 *
 * 2d6 vehicle critical-hit table + effect application. Unlike mechs, vehicle
 * crits don't consume critical slots — they modify the combat state:
 *   - Crew Stunned: skip next movement + weapon phase.
 *   - Engine Hit: immobilizes the vehicle.
 *   - Driver/Commander: wound counter; 2 kills the crew (vehicle destroyed).
 *   - Fuel Tank: ICE/FuelCell only — vehicle destroyed by fuel explosion
 *     (MegaMek `Tank.CRIT_FUEL_TANK` → destroyEntity "fuel explosion");
 *     fusion → reroll.
 *   - Ammo Explosion: vehicle destroyed (per ammo-explosion system).
 *   - VTOL Rotor Damage: cumulative MP penalty; immobilized once the penalty
 *     reaches the original cruise MP (MegaMek `VTOL.CRIT_ROTOR_DAMAGE`).
 *
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
  vehicleCritFromRollForLocation,
  type IVehicleCriticalTableContext,
} from './vehicleCriticalTables';

const VEHICLE_CRIT_ROLL_TABLE: readonly {
  readonly maxRoll: number;
  readonly kind: VehicleCritKind;
}[] = [
  { maxRoll: 5, kind: 'none' },
  { maxRoll: 6, kind: 'crew_stunned' },
  { maxRoll: 7, kind: 'weapon_destroyed' },
  { maxRoll: 8, kind: 'cargo_hit' },
  { maxRoll: 9, kind: 'driver_hit' },
  { maxRoll: 10, kind: 'fuel_tank' },
  { maxRoll: 11, kind: 'engine_hit' },
  { maxRoll: 12, kind: 'ammo_explosion' },
];

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
  const kind =
    VEHICLE_CRIT_ROLL_TABLE.find((entry) => roll <= entry.maxRoll)?.kind ??
    'ammo_explosion';

  return { dice: [d1, d2], roll, kind };
}

/**
 * Roll a vehicle crit. With a location context the roll resolves against the
 * MegaMek Tank/VTOL struck-location table; without one it falls back to the
 * legacy generic 2d6 table for older direct callers.
 */
export function rollVehicleCrit(
  diceRoller: D6Roller = defaultD6Roller,
  context?: IVehicleCriticalTableContext,
): IVehicleCritRollResult {
  const rolled = roll2d6(diceRoller);
  if (context) {
    return vehicleCritFromRollForLocation(
      [rolled.dice[0], rolled.dice[1]],
      context,
    );
  }
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

interface IVehicleCritEffectHandlerResult {
  readonly state: IVehicleCombatState;
  readonly ammoExplosion?: boolean;
}

type VehicleCritEffectHandler = (
  state: IVehicleCombatState,
  ctx: IVehicleCritEffectContext,
) => IVehicleCritEffectHandlerResult;

const noStateEffectKinds = new Set<VehicleCritKind>([
  'weapon_destroyed',
  'weapon_jammed',
  'cargo_hit',
  'stabilizer_hit',
  'sensor_hit',
  'turret_jammed',
  'flight_stabilizer',
]);

const vehicleCritEffectHandlers: Partial<
  Record<VehicleCritKind, VehicleCritEffectHandler>
> = {
  crew_stunned: (state) => ({ state: applyCrewStunned(state) }),
  driver_hit: (state) => ({ state: applyDriverHit(state) }),
  pilot_hit: (state) => ({ state: applyDriverHit(state) }),
  commander_hit: (state) => ({ state: applyCommanderHit(state) }),
  copilot_hit: (state) => ({ state: applyCommanderHit(state) }),
  crew_killed: (state) => ({
    state: { ...state, destroyed: true, destructionCause: 'crew_killed' },
  }),
  engine_hit: (state) => ({ state: applyEngineHit(state) }),
  turret_locked: (state, ctx) => ({
    state: applyTurretLocked(state, ctx.secondaryTurret === true),
  }),
  turret_destroyed: (state) => ({ state: applyTurretDestroyed(state) }),
  rotor_damage: (state) => ({ state: applyRotorDamage(state) }),
  rotor_destroyed: (state) => ({
    state: {
      ...state,
      motive: { ...state.motive, immobilized: true },
    },
  }),
};

function noVehicleCritEffect(
  state: IVehicleCombatState,
  applied: IVehicleCritRollResult,
): IVehicleCritEffectResult {
  return { state, applied, ammoExplosion: false };
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
    return noVehicleCritEffect(state, crit);
  }

  const applied = crit;
  if (applied.kind === 'none' || noStateEffectKinds.has(applied.kind)) {
    return noVehicleCritEffect(state, applied);
  }

  if (applied.kind === 'fuel_tank') {
    if (!engineHasFuelTank(ctx.engineType)) {
      return noVehicleCritEffect(state, { ...applied, kind: 'none' });
    }
    return {
      state: {
        ...state,
        destroyed: true,
        destructionCause: 'fuel_tank_explosion',
      },
      applied,
      ammoExplosion: false,
    };
  }

  if (applied.kind === 'ammo_explosion') {
    if (!ctx.hasAmmoInSlot) {
      return noVehicleCritEffect(state, { ...applied, kind: 'none' });
    }
    return {
      state: {
        ...state,
        destroyed: true,
        destructionCause: 'ammo_explosion',
      },
      applied,
      ammoExplosion: true,
    };
  }

  const handled = vehicleCritEffectHandlers[applied.kind]?.(state, ctx);
  if (!handled) {
    return noVehicleCritEffect(state, applied);
  }

  return {
    state: handled.state,
    applied,
    ammoExplosion: handled.ammoExplosion === true,
  };
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

// =============================================================================
// Per-kind effect helpers
// =============================================================================

/** Crew stunned: skip the next movement + weapon phase (2 phases). */
function applyCrewStunned(state: IVehicleCombatState): IVehicleCombatState {
  return {
    ...state,
    motive: {
      ...state.motive,
      crewStunnedPhases: state.motive.crewStunnedPhases + 2,
    },
  };
}

/** Driver/pilot wound counter; the second hit kills the crew. */
function applyDriverHit(state: IVehicleCombatState): IVehicleCombatState {
  const driverHits = state.motive.driverHits + 1;
  return {
    ...state,
    motive: { ...state.motive, driverHits },
    destroyed: driverHits >= 2 ? true : state.destroyed,
    destructionCause: driverHits >= 2 ? 'crew_killed' : state.destructionCause,
  };
}

/**
 * Commander/copilot wound counter. A commander hit also stuns the crew for
 * a turn (TW vehicle crit table: treat as Crew Stunned for one turn); the
 * second hit kills the crew.
 */
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

/** Engine hit counter; each hit immobilizes but does not destroy the vehicle. */
function applyEngineHit(state: IVehicleCombatState): IVehicleCombatState {
  const engineHits = state.motive.engineHits + 1;
  return {
    ...state,
    motive: { ...state.motive, engineHits, immobilized: true },
  };
}

/**
 * Turret destroyed: record the turret as a destroyed location and destroy
 * the vehicle, mirroring MegaMek `Tank.CRIT_TURRET_DESTROYED`
 * (destroyLocation + destroyEntity "turret blown off").
 */
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

/**
 * VTOL rotor damage: each hit adds 1 MP penalty; the VTOL immobilizes once
 * the accumulated penalty reaches its original cruise MP (MegaMek
 * `VTOL.CRIT_ROTOR_DAMAGE`: setMotiveDamage + immobilize at originalWalkMP).
 */
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
