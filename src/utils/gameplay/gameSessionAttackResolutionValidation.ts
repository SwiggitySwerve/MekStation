import { IGameSession } from '@/types/gameplay';

import { createAttackInvalidEvent } from './gameEvents';
import { appendEvent } from './gameSessionCore';

export function invalidateSameHexAttack(
  session: IGameSession,
  attackerId: string,
  targetId: string,
): IGameSession | null {
  const attackerPos = session.currentState.units[attackerId]?.position;
  const targetPos = session.currentState.units[targetId]?.position;
  if (
    !attackerPos ||
    !targetPos ||
    attackerPos.q !== targetPos.q ||
    attackerPos.r !== targetPos.r
  ) {
    return null;
  }
  return appendEvent(
    session,
    createAttackInvalidEvent(
      session.id,
      session.events.length,
      session.currentState.turn,
      attackerId,
      targetId,
      'SameHex',
      undefined,
      'Attacker and target occupy the same hex',
    ),
  );
}
