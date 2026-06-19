/**
 * Aerospace Combat State
 *
 * Per-unit combat state carried by aerospace units during a battle.
 * Kept separate from construction `IAerospace` / `IConventionalFighter` /
 * `ISmallCraft` to avoid mutating the canonical construction interfaces —
 * this struct is owned by the combat engine.
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/specs/aerospace-unit-system/spec.md
 */

import { AerospaceArc } from '../../../types/unit/AerospaceInterfaces';

// ============================================================================
// Arc → armor map
// ============================================================================

/**
 * Armor remaining per firing arc.
 * ASF / CF: `nose`, `leftWing`, `rightWing`, `aft`.
 * Small Craft: `nose`, `leftSide`, `rightSide`, `aft`.
 * `fuselage` is not an armored arc — fuselage weapons fire from whichever arc
 * the pilot declares, so damage never "hits" fuselage directly.
 */
export interface IAerospaceArcArmor {
  nose: number;
  leftWing?: number;
  rightWing?: number;
  leftSide?: number;
  rightSide?: number;
  aft: number;
}

export type AerospaceAirborneState =
  | 'grounded'
  | 'taking-off'
  | 'airborne'
  | 'landing';

// ============================================================================
// Attack direction (inbound attack relative to target facing)
// ============================================================================

/**
 * Attack direction used when choosing an aerospace hit-location table.
 * This is the direction the attack is COMING FROM relative to the target —
 * "FRONT" means the shot strikes the target's front (nose-end).
 */
export enum AerospaceAttackDirection {
  FRONT = 'front',
  SIDE_LEFT = 'side_left',
  SIDE_RIGHT = 'side_right',
  REAR = 'rear',
}

// ============================================================================
// Combat state
// ============================================================================

/**
 * Aerospace combat state carried for the duration of a battle.
 *
 * Spec requires: `currentSI, armorByArc, heat, fuelRemaining, controlRollsFailed,
 * thrustPenalty, offMap, offMapReturnTurn` (see aerospace-unit-system delta).
 */
export interface IAerospaceCombatState {
  /** Construction-time SI ceiling; `currentSI` must never exceed this. */
  readonly maxSI: number;
  /** Remaining Structural Integrity points. */
  currentSI: number;
  /** Current armor by firing arc. */
  armorByArc: IAerospaceArcArmor;
  /** Construction armor ceiling per arc (used to cap repairs, if any). */
  readonly armorByArcMax: Readonly<IAerospaceArcArmor>;
  /** Current heat points on the aerospace heat track. */
  heat: number;
  /** Construction-time heat-sink count (affects dissipation). */
  readonly heatSinks: number;
  /** Fuel points remaining. */
  fuelRemaining: number;
  /** Running count of failed control rolls this battle. */
  controlRollsFailed: number;
  /**
   * Current turn's thrust penalty (applied at next movement phase).
   * +ve numbers reduce safeThrust (e.g. 1 = lose 1 thrust).
   */
  thrustPenalty: number;
  /** True while the unit has flown off the board. */
  offMap: boolean;
  /**
   * Turn number on which the unit may re-enter the map.
   * Ignored while `offMap === false`.
   */
  offMapReturnTurn: number;
  /** True when fuel has been exhausted and the unit must leave / has left. */
  fuelDepleted: boolean;
  /** Avionics damaged? Adds +1 to every future to-hit roll. */
  avionicsDamaged: boolean;
  /** Crew stunned? Skips next attack phase if true. */
  crewStunned: boolean;
  /** True once SI has been reduced to 0 or the catastrophic crit fired. */
  destroyed: boolean;
  /** Construction-time safe thrust (used when recomputing effective thrust). */
  readonly baseSafeThrust: number;
  /** Construction-time max thrust. */
  readonly baseMaxThrust: number;
  /**
   * Current altitude band (0 = landed; positive integers = airborne in
   * standard altitude bands per BattleTech aerospace rules). Per
   * `wire-combat-behavior-dispatch` (Council #1), this field is the canonical
   * altitude source consumed by `unitStateToToken`. The factory defaults to
   * `1` (airborne) — matching the prior render-time fallback in
   * `AerospaceToken`; velocity is projected alongside altitude by the same
   * adapter.
   */
  altitude: number;
  /** Velocity entering the current turn. */
  currentVelocity: number;
  /** Velocity after this turn's thrust spending. */
  nextVelocity: number;
  /** Current aerospace lifecycle state. */
  airborneState: AerospaceAirborneState;
  /** Opposing aerospace unit this unit is dogfighting, when any. */
  dogfightWith?: string;
}

// ============================================================================
// Arc lookup helpers
// ============================================================================

const arcArmorReaders: Record<
  AerospaceArc,
  (armor: IAerospaceArcArmor) => number
> = {
  [AerospaceArc.NOSE]: (armor) => armor.nose,
  [AerospaceArc.LEFT_WING]: (armor) => armor.leftWing ?? 0,
  [AerospaceArc.RIGHT_WING]: (armor) => armor.rightWing ?? 0,
  [AerospaceArc.LEFT_SIDE]: (armor) => armor.leftSide ?? 0,
  [AerospaceArc.RIGHT_SIDE]: (armor) => armor.rightSide ?? 0,
  [AerospaceArc.AFT]: (armor) => armor.aft,
  [AerospaceArc.FUSELAGE]: () => 0,
};

/**
 * Read armor for a given arc from the combat state.
 * Returns 0 when the arc is not present on this aerospace sub-type
 * (e.g. asking for `LEFT_WING` on a Small Craft).
 */
export function getArcArmor(
  state: IAerospaceCombatState,
  arc: AerospaceArc,
): number {
  return arcArmorReaders[arc]?.(state.armorByArc) ?? 0;
}

const arcArmorWriters: Partial<
  Record<
    AerospaceArc,
    (armor: IAerospaceArcArmor, value: number) => IAerospaceArcArmor
  >
> = {
  [AerospaceArc.NOSE]: (armor, value) => ({ ...armor, nose: value }),
  [AerospaceArc.LEFT_WING]: (armor, value) => ({ ...armor, leftWing: value }),
  [AerospaceArc.RIGHT_WING]: (armor, value) => ({
    ...armor,
    rightWing: value,
  }),
  [AerospaceArc.LEFT_SIDE]: (armor, value) => ({ ...armor, leftSide: value }),
  [AerospaceArc.RIGHT_SIDE]: (armor, value) => ({
    ...armor,
    rightSide: value,
  }),
  [AerospaceArc.AFT]: (armor, value) => ({ ...armor, aft: value }),
};

/**
 * Return a new arc-armor map with `value` written to `arc`.
 */
export function setArcArmor(
  armor: IAerospaceArcArmor,
  arc: AerospaceArc,
  value: number,
): IAerospaceArcArmor {
  return arcArmorWriters[arc]?.(armor, value) ?? armor;
}

// ============================================================================
// State construction
// ============================================================================

/**
 * Build a fresh combat state for an aerospace unit at battle start.
 */
export function createAerospaceCombatState(params: {
  readonly maxSI: number;
  readonly armorByArc: IAerospaceArcArmor;
  readonly heatSinks: number;
  readonly fuelPoints: number;
  readonly safeThrust: number;
  readonly maxThrust: number;
  /**
   * Initial altitude band. Defaults to `1` (airborne) — matches the prior
   * `AerospaceToken` render fallback. Pass `0` to spawn the unit landed.
   */
  readonly altitude?: number;
  /** Velocity entering the current turn. Defaults to 0. */
  readonly currentVelocity?: number;
  /** Velocity after this turn's thrust spending. Defaults to currentVelocity. */
  readonly nextVelocity?: number;
  /** Aerospace lifecycle state. Defaults from altitude. */
  readonly airborneState?: AerospaceAirborneState;
  /** Dogfight opponent if the scenario starts mid-dogfight. */
  readonly dogfightWith?: string;
}): IAerospaceCombatState {
  const altitude = params.altitude ?? 1;
  const currentVelocity = params.currentVelocity ?? 0;

  return {
    maxSI: params.maxSI,
    currentSI: params.maxSI,
    armorByArc: { ...params.armorByArc },
    armorByArcMax: Object.freeze({ ...params.armorByArc }),
    heat: 0,
    heatSinks: params.heatSinks,
    fuelRemaining: params.fuelPoints,
    controlRollsFailed: 0,
    thrustPenalty: 0,
    offMap: false,
    offMapReturnTurn: -1,
    fuelDepleted: false,
    avionicsDamaged: false,
    crewStunned: false,
    destroyed: false,
    altitude,
    currentVelocity,
    nextVelocity: params.nextVelocity ?? currentVelocity,
    airborneState:
      params.airborneState ?? (altitude === 0 ? 'grounded' : 'airborne'),
    dogfightWith: params.dogfightWith,
    baseSafeThrust: params.safeThrust,
    baseMaxThrust: params.maxThrust,
  };
}

/**
 * Clamp `currentSI` so it never exceeds `maxSI` (repair events, future).
 * Returns a new state object.
 */
export function clampSI(state: IAerospaceCombatState): IAerospaceCombatState {
  if (state.currentSI <= state.maxSI) {
    return state;
  }
  return { ...state, currentSI: state.maxSI };
}
