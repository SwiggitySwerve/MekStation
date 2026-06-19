import type { IGameSession } from '@/types/gameplay/GameSessionInterfaces';

import { resolveEdge } from '@/simulation/ai/RetreatAI';
import {
  applyForcedWithdrawalCheck,
  applyMoralePass,
  applyWithdrawalEdgeExits,
} from '@/utils/gameplay/morale';

/**
 * Per `add-combat-morale-and-withdrawal`: run in-battle morale, forced
 * withdrawal, and withdrawal edge exits at the end of a phase.
 */
export function runEngineMoraleAndWithdrawalPass(
  session: IGameSession,
): IGameSession {
  let next = applyMoralePass(session);
  next = applyForcedWithdrawalCheck(next, (unitId) => {
    const unit = next.currentState.units[unitId];
    if (!unit) return null;
    return resolveEdge(
      { retreatEdge: 'nearest' } as Parameters<typeof resolveEdge>[0],
      unit.position,
      next.config.mapRadius,
    );
  });
  next = applyWithdrawalEdgeExits(next);
  return next;
}
