/**
 * getEligiblePhysicalAttacks — UI-facing projection per
 * `add-physical-attack-phase-ui` task 3.1 + `physical-attack-system`
 * spec delta "UI-Facing Eligibility Projection".
 *
 * For a given attacker + target pair, returns one row per physical
 * attack type (punch × up to 2 arms, kick × up to 2 legs, charge, DFA,
 * push, and any equipped melee weapons). Eligible rows carry an empty
 * `restrictionsFailed`; ineligible rows include the blocking reason
 * codes so the UI can render a disabled row + tooltip without
 * duplicating rules-engine logic.
 *
 * Per spec scenario "Non-adjacent target returns empty list", callers
 * passing `null`/non-adjacent targets receive an empty array — the
 * sub-panel uses that to render the "No eligible physical attacks this
 * turn" empty state.
 *
 * Adjacency is computed via `hexDistance(attacker.position,
 * target.position) === 1`.
 *
 * @spec openspec/changes/add-physical-attack-phase-ui/specs/physical-attack-system/spec.md
 */

import { type IUnitGameState, MovementType } from '@/types/gameplay';

import type { IEligibilityContext } from './eligibilityContext';
import type { IPhysicalAttackOption } from './types';

import { hexDistance } from '../hexMath';
import { buildEligibilityAttackOptions } from './eligibilityAttackOptions';
import { buildEligibilityBaseInput } from './eligibilityBaseInput';

export type { IEligibilityContext } from './eligibilityContext';

/**
 * Per spec scenario "Fully-intact mech returns punch + kick options":
 * the canonical entry point. Returns an empty list when target is null or
 * more than 1 hex away. Otherwise emits the physical attack projection rows
 * built by the focused eligibility helpers.
 */
export function getEligiblePhysicalAttacks(
  attacker: IUnitGameState | null,
  target: IUnitGameState | null,
  context: IEligibilityContext,
): readonly IPhysicalAttackOption[] {
  if (!attacker || !target) return [];
  if (
    attacker.destroyed ||
    target.destroyed ||
    target.hasRetreated ||
    target.hasEjected
  ) {
    return [];
  }

  const targetDistance = hexDistance(attacker.position, target.position);
  if (targetDistance > 1) return [];

  const baseInput = buildEligibilityBaseInput({
    attacker,
    target,
    context,
    targetDistance,
  });

  return buildEligibilityAttackOptions({
    baseInput,
    context,
    targetDistance,
    targetId: target.id,
    chargeAttackerJumpedThisTurn:
      attacker.movementThisTurn === MovementType.Jump,
  });
}
