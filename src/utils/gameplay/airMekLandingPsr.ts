import type { IRuntimeMovementStateChangedPayload } from '@/types/gameplay/GameSessionMovementEvents';
import type { IGameSession } from '@/types/gameplay/GameSessionStateTypes';

import { createPSRTriggeredEvent } from './gameEvents';
import { appendEvent } from './gameSessionCore';
import { createAirMekLandingPSR } from './pilotingSkillRolls';

export function queueAirMekLandingControlPSR(
  session: IGameSession,
  unitId: string,
  patch: Omit<IRuntimeMovementStateChangedPayload, 'unitId'>,
): IGameSession {
  if (patch.lamAirMekLandingControlRequired !== true) return session;

  const unitState = session.currentState.units[unitId];
  if (!unitState || unitState.destroyed || !unitState.pilotConscious) {
    return session;
  }

  const unit = session.units.find((entry) => entry.id === unitId);
  const psr = createAirMekLandingPSR(
    unitId,
    patch.lamAirMekLandingControlModifier ?? 0,
  );

  return appendEvent(
    session,
    createPSRTriggeredEvent(
      session.id,
      session.events.length,
      session.currentState.turn,
      session.currentState.phase,
      unitId,
      psr.reason,
      psr.additionalModifier,
      psr.triggerSource,
      unit?.piloting,
      psr.reasonCode,
    ),
  );
}
