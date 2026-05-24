import { GamePhase, GameStatus, type IGameSession } from '@/types/gameplay';

import {
  createGoProneMovementDeclaredEvent,
  createMovementLockedEvent,
} from './gameEvents';
import { appendEvent } from './gameSessionCore';

export function goProne(session: IGameSession, unitId: string): IGameSession {
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
    unit.prone
  ) {
    return session;
  }

  let currentSession = appendEvent(
    session,
    createGoProneMovementDeclaredEvent(
      session.id,
      session.events.length,
      turn,
      unitId,
      unit.position,
      unit.facing,
    ),
  );

  currentSession = appendEvent(
    currentSession,
    createMovementLockedEvent(
      currentSession.id,
      currentSession.events.length,
      turn,
      unitId,
    ),
  );

  return currentSession;
}
