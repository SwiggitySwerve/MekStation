import {
  GamePhase,
  GameStatus,
  LockState,
  type IGameSession,
  type MovementEnhancementActivationKind,
} from '@/types/gameplay';

import { createMovementEnhancementActivatedEvent } from './gameEvents';
import { appendEvent } from './gameSessionCore';

export function activateMovementEnhancement(
  session: IGameSession,
  unitId: string,
  enhancement: MovementEnhancementActivationKind,
): IGameSession {
  const { phase, status, turn } = session.currentState;
  if (status !== GameStatus.Active || phase !== GamePhase.Movement) {
    return session;
  }

  const unit = session.currentState.units[unitId];
  if (
    !unit ||
    unit.destroyed ||
    unit.hasRetreated ||
    unit.hasEjected ||
    unit.lockState === LockState.Locked
  ) {
    return session;
  }

  if (enhancement === 'MASC') {
    if (!unit.hasMASC || unit.activeMASC) return session;
  } else if (!unit.hasSupercharger || unit.activeSupercharger) {
    return session;
  }

  return appendEvent(
    session,
    createMovementEnhancementActivatedEvent(
      session.id,
      session.events.length,
      turn,
      unitId,
      enhancement,
    ),
  );
}
