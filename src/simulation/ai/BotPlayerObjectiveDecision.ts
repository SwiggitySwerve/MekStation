import type { IHexCoordinate } from '@/types/gameplay';

import type { IAILanceContext } from './AILancePlanner';
import type { IScoreMoveContext } from './MoveAI';
import type { IAIUnitState } from './types';

export function objectiveMoveFields(
  unitId: string,
  lanceContext?: IAILanceContext,
): Partial<Pick<IScoreMoveContext, 'objectiveRole' | 'objectiveHex'>> {
  const objectivePlan = lanceContext?.plan.objectivePlan;
  if (!objectivePlan) return {};

  const role = objectivePlan.roles.get(unitId);
  if (!role || role === 'screen') return {};

  const hex = objectivePlan.targetHexes.get(unitId);
  if (!hex) return {};

  return { objectiveRole: role, objectiveHex: hex };
}

export function shouldHoldObjectiveHex(
  unit: IAIUnitState,
  lanceContext?: IAILanceContext,
): boolean {
  const objectivePlan = lanceContext?.plan.objectivePlan;
  if (!objectivePlan) return false;

  const role = objectivePlan.roles.get(unit.unitId);
  if (role !== 'capture' && role !== 'hold') return false;

  const hex = objectivePlan.targetHexes.get(unit.unitId);
  if (!hex) return false;

  return unit.position.q === hex.q && unit.position.r === hex.r;
}

export function applyObjectiveTargetDiscipline(
  attacker: IAIUnitState,
  validTargets: readonly IAIUnitState[],
  lanceContext?: IAILanceContext,
): readonly IAIUnitState[] {
  const objectivePlan = lanceContext?.plan.objectivePlan;
  if (!objectivePlan) return validTargets;

  const role = objectivePlan.roles.get(attacker.unitId);
  if (!role || role === 'screen') return validTargets;

  const hex = objectivePlan.targetHexes.get(attacker.unitId);
  if (!hex) return validTargets;

  let maxRange = 0;
  for (const weapon of attacker.weapons) {
    if (weapon.destroyed) continue;
    const range = weapon.extremeRange ?? weapon.longRange;
    if (range > maxRange) maxRange = range;
  }
  if (maxRange <= 0) return validTargets;

  const inDiscipline = validTargets.filter(
    (target) => cubeHexDistance(hex, target.position) <= maxRange,
  );
  return inDiscipline.length > 0 ? inDiscipline : validTargets;
}

function cubeHexDistance(a: IHexCoordinate, b: IHexCoordinate): number {
  const dq = b.q - a.q;
  const dr = b.r - a.r;
  const ds = -dq - dr;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
}
