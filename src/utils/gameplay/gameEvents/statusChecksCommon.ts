import type {
  GameEventPayload,
  GameEventType,
  IGameEvent,
} from '@/types/gameplay';

import type { IGameplayEventContext } from './eventContext';

import { createEventBase } from './base';

export type IStatusCheckEventContext = IGameplayEventContext;

export function createStatusCheckEvent(
  eventType: GameEventType,
  context: IStatusCheckEventContext,
  payload: GameEventPayload,
): IGameEvent {
  return {
    ...createEventBase(
      context.gameId,
      context.sequence,
      eventType,
      context.turn,
      context.phase,
      context.unitId,
    ),
    payload,
  };
}
