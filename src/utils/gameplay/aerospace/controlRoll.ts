/**
 * Aerospace Control Roll
 *
 * Resolves the "Control Roll" triggered when damage exceeds 10% of the
 * target's current SI. Simplified TW formulation:
 *   result = 2d6 + pilotSkill + damageModifier
 *   TN 8
 *   passed ↔ result >= TN
 *
 * Damage modifier: +1 per 5 points of inbound damage (rounded down).
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/specs/combat-resolution/spec.md
 */

import { defaultD6Roller, roll2d6, type D6Roller } from '../diceTypes';

// ============================================================================
// Types
// ============================================================================

export interface IAerospaceControlRollParams {
  readonly unitId: string;
  readonly pilotSkill: number;
  readonly damageApplied: number;
  readonly diceRoller?: D6Roller;
}

export interface IAerospaceControlRollResult {
  readonly unitId: string;
  readonly targetNumber: number;
  readonly rollTotal: number;
  readonly dice: readonly [number, number];
  readonly passed: boolean;
  readonly modifier: number;
  readonly pilotSkill: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Target number the pilot's total must meet or exceed. */
export const AEROSPACE_CONTROL_TN = 8;

/**
 * +1 to-hit per 5 points of damage. Rounded down — 4 damage = +0, 5 = +1,
 * 10 = +2, etc.
 */
export function damageToControlModifier(damage: number): number {
  if (damage <= 0) return 0;
  return Math.floor(damage / 5);
}

// ============================================================================
// Roll
// ============================================================================

export function rollAerospaceControlCheck(
  params: IAerospaceControlRollParams,
): IAerospaceControlRollResult {
  const roller: D6Roller = params.diceRoller ?? defaultD6Roller;
  const roll = roll2d6(roller);

  const modifier = damageToControlModifier(params.damageApplied);
  const total = roll.total + params.pilotSkill + modifier;
  const passed = total >= AEROSPACE_CONTROL_TN;

  return {
    unitId: params.unitId,
    targetNumber: AEROSPACE_CONTROL_TN,
    rollTotal: total,
    dice: [roll.dice[0], roll.dice[1]],
    passed,
    modifier,
    pilotSkill: params.pilotSkill,
  };
}
