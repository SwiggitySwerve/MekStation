/**
 * Motive Damage Module
 *
 * Rolls on the vehicle motive-damage table (TW p. 193) and applies the
 * resulting cruise-MP penalty. Hover / Hydrofoil / Naval motion types roll on
 * any hit (not just structure-exposing); all other motion types roll only
 * when damage exposes structure at Front/Side/Rear.
 *
 * @spec openspec/changes/add-vehicle-combat-behavior/specs/combat-resolution/spec.md
 *   #requirement vehicle-motive-damage-roll
 * @spec openspec/changes/add-vehicle-combat-behavior/specs/vehicle-unit-system/spec.md
 *   #requirement motive-damage-state-tracking
 */

import {
  IEffectiveVehicleMP,
  IMotiveDamageRollResult,
  IMotiveDamageState,
  MotiveDamageSeverity,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import { D6Roller, defaultD6Roller, roll2d6 } from './diceTypes';

// =============================================================================
// Motive-Damage Table
// =============================================================================

/**
 * 2d6 motive-damage table per TW:
 *   2-5  = no effect
 *   6-7  = minor (-1 cruise MP)
 *   8-9  = moderate (-2)
 *   10-11 = heavy (-3)
 *   12   = immobilized
 */
export function rollMotiveDamage(
  diceRoller: D6Roller = defaultD6Roller,
): IMotiveDamageRollResult {
  const rolled = roll2d6(diceRoller);
  return motiveDamageFromRoll([rolled.dice[0], rolled.dice[1]]);
}

/**
 * Resolve motive-damage outcome from a pre-determined 2d6 result.
 */
export function motiveDamageFromRoll(
  dice: readonly [number, number],
): IMotiveDamageRollResult {
  const [d1, d2] = dice;
  const roll = d1 + d2;

  let severity: MotiveDamageSeverity;
  let mpPenalty: number;
  let immobilized = false;

  if (roll <= 5) {
    severity = 'none';
    mpPenalty = 0;
  } else if (roll <= 7) {
    severity = 'minor';
    mpPenalty = 1;
  } else if (roll <= 9) {
    severity = 'moderate';
    mpPenalty = 2;
  } else if (roll <= 11) {
    severity = 'heavy';
    mpPenalty = 3;
  } else {
    severity = 'immobilized';
    mpPenalty = 0; // immobilized supersedes MP penalty
    immobilized = true;
  }

  return {
    dice: [d1, d2],
    roll,
    severity,
    mpPenalty,
    immobilized,
  };
}

// =============================================================================
// Motion-Type Policies
// =============================================================================

/**
 * Whether this motion type rolls for motive damage on ANY hit (not just
 * structure-exposing). Per TW: Hover, Hydrofoil, Naval vehicles are
 * motive-fragile (task 4.6 / spec scenario "Hover motive sensitivity").
 */
export function requiresMotiveRollOnAnyHit(
  motionType: GroundMotionType,
): boolean {
  return (
    motionType === GroundMotionType.HOVER ||
    motionType === GroundMotionType.HYDROFOIL ||
    motionType === GroundMotionType.NAVAL ||
    motionType === GroundMotionType.SUBMARINE ||
    motionType === GroundMotionType.WIGE
  );
}

/**
 * Apply motion-type-specific aggravation to a motive roll.
 *
 *   - Wheeled: a "heavy" result immobilizes outright.
 *   - Hover: "heavy" causes sinking (on water) / bog (on land) — represented
 *       here by `immobilized = true`. The caller decides destruction based on
 *       terrain.
 *   - Naval: "heavy" begins sinking (destroyed in N turns).
 *   - Tracked / Rail / Maglev / VTOL / WiGE / Submarine: use the raw table.
 */
export function applyMotionTypeAggravation(
  result: IMotiveDamageRollResult,
  motionType: GroundMotionType,
): IMotiveDamageRollResult {
  if (result.severity !== 'heavy') return result;

  switch (motionType) {
    case GroundMotionType.WHEELED:
    case GroundMotionType.HOVER:
      return { ...result, severity: 'immobilized', immobilized: true };
    case GroundMotionType.NAVAL:
    case GroundMotionType.HYDROFOIL:
    case GroundMotionType.SUBMARINE:
      // Heavy → sinking begins; upstream handler sets `sinking = true`.
      return { ...result, severity: 'heavy' };
    default:
      return result;
  }
}

// =============================================================================
// State Updates
// =============================================================================

/**
 * Apply a motive-damage roll outcome to the accumulated motive state.
 * Penalties STACK cumulatively. Immobilized is one-way.
 */
export function applyMotiveDamageToState(
  state: IMotiveDamageState,
  rollResult: IMotiveDamageRollResult,
): IMotiveDamageState {
  if (state.immobilized) {
    // Already immobilized — no further motive damage changes anything.
    return state;
  }

  const nextPenalty = Math.max(0, state.penaltyMP + rollResult.mpPenalty);

  return {
    ...state,
    penaltyMP: nextPenalty,
    immobilized: rollResult.immobilized || state.immobilized,
  };
}

/**
 * Create a fresh motive-damage state for a vehicle entering combat.
 */
export function createMotiveDamageState(
  originalCruiseMP: number,
): IMotiveDamageState {
  return {
    originalCruiseMP,
    penaltyMP: 0,
    immobilized: false,
    sinking: false,
    turretLocked: false,
    engineHits: 0,
    driverHits: 0,
    commanderHits: 0,
    crewStunnedPhases: 0,
  };
}

// =============================================================================
// Effective MP
// =============================================================================

/**
 * Effective cruise/flank MP after motive penalties.
 *  - Cruise MP = max(0, original - penalty)
 *  - Flank MP = floor(cruise × 1.5)
 *  - Both clamp to 0 when immobilized.
 */
export function computeEffectiveMP(
  state: IMotiveDamageState,
): IEffectiveVehicleMP {
  if (state.immobilized) {
    return { cruiseMP: 0, flankMP: 0, immobilized: true };
  }

  const cruiseMP = Math.max(0, state.originalCruiseMP - state.penaltyMP);
  const flankMP = Math.floor(cruiseMP * 1.5);

  return { cruiseMP, flankMP, immobilized: false };
}
