import type { IAILanceContext } from './AILancePlanner';
import type { IAITierCoordinationParameters } from './AITierRegistry';
import type { AttackAI } from './AttackAI';
import type { IAIUnitState } from './types';

export function selectCoordinatedTarget({
  attackAI,
  coordination,
  attacker,
  validTargets,
  lanceContext,
}: {
  attackAI: AttackAI;
  coordination: IAITierCoordinationParameters;
  attacker: IAIUnitState;
  validTargets: readonly IAIUnitState[];
  lanceContext?: IAILanceContext;
}): IAIUnitState | null {
  if (!lanceContext) return null;
  if (!coordination.lanceCoordination) return null;

  const assignedId = lanceContext.plan.fireAssignment.assignments.get(
    attacker.unitId,
  );
  if (!assignedId) return null;

  const assigned = validTargets.find((t) => t.unitId === assignedId);
  if (!assigned) return null;

  const firingList = attackAI.selectWeapons(attacker, assigned);
  if (firingList.length === 0) return null;

  return assigned;
}
