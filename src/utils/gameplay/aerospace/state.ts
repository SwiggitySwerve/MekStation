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
}

// ============================================================================
// Arc lookup helpers
// ============================================================================

/**
 * Read armor for a given arc from the combat state.
 * Returns 0 when the arc is not present on this aerospace sub-type
 * (e.g. asking for `LEFT_WING` on a Small Craft).
 */
export function getArcArmor(
  state: IAerospaceCombatState,
  arc: AerospaceArc,
): number {
  switch (arc) {
    case AerospaceArc.NOSE:
      return state.armorByArc.nose;
    case AerospaceArc.LEFT_WING:
      return state.armorByArc.leftWing ?? 0;
    case AerospaceArc.RIGHT_WING:
      return state.armorByArc.rightWing ?? 0;
    case AerospaceArc.LEFT_SIDE:
      return state.armorByArc.leftSide ?? 0;
    case AerospaceArc.RIGHT_SIDE:
      return state.armorByArc.rightSide ?? 0;
    case AerospaceArc.AFT:
      return state.armorByArc.aft;
    case AerospaceArc.FUSELAGE:
      return 0;
    default:
      return 0;
  }
}

/**
 * Return a new arc-armor map with `value` written to `arc`.
 */
export function setArcArmor(
  armor: IAerospaceArcArmor,
  arc: AerospaceArc,
  value: number,
): IAerospaceArcArmor {
  switch (arc) {
    case AerospaceArc.NOSE:
      return { ...armor, nose: value };
    case AerospaceArc.LEFT_WING:
      return { ...armor, leftWing: value };
    case AerospaceArc.RIGHT_WING:
      return { ...armor, rightWing: value };
    case AerospaceArc.LEFT_SIDE:
      return { ...armor, leftSide: value };
    case AerospaceArc.RIGHT_SIDE:
      return { ...armor, rightSide: value };
    case AerospaceArc.AFT:
      return { ...armor, aft: value };
    case AerospaceArc.FUSELAGE:
      return armor;
    default:
      return armor;
  }
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
}): IAerospaceCombatState {
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
