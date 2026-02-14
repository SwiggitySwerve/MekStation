import {
  GameEventType,
  IGameEvent,
  IPhaseChangedPayload,
  GamePhase,
} from '@/types/gameplay';

import { createEventBase } from './base';

export function createPhaseChangedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  fromPhase: GamePhase,
  toPhase: GamePhase,
): IGameEvent {
  const payload: IPhaseChangedPayload = { fromPhase, toPhase };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.PhaseChanged,
      turn,
      toPhase,
    ),
    payload,
  };
}
