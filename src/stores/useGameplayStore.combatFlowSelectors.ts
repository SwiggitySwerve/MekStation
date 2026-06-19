import { GamePhase, type IGameSession } from '@/types/gameplay';

import type { IAttackPlan } from './useGameplayStore.combatFlowTypes';

export function isPhysicalAttackPhase(session: IGameSession | null): boolean {
  if (!session) return false;
  return session.currentState.phase === GamePhase.PhysicalAttack;
}

export function getAttackPlanFor(
  plan: IAttackPlan,
  activeAttackerId: string | null,
  attackerId: string,
): IAttackPlan | null {
  if (activeAttackerId !== attackerId) return null;
  return plan;
}

export function shouldClearAttackPlanOnPhaseChange(
  prevPhase: GamePhase | null,
  nextPhase: GamePhase | null,
): boolean {
  if (
    prevPhase === GamePhase.WeaponAttack &&
    nextPhase !== GamePhase.WeaponAttack
  ) {
    return true;
  }
  return false;
}
