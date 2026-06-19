import {
  GameEventType,
  GamePhase,
  IAMSInterceptionPayload,
  IGameEvent,
} from '@/types/gameplay';

import { createEventBase } from './base';

export function createAMSInterceptionEvent(
  gameId: string,
  sequence: number,
  turn: number,
  payload: IAMSInterceptionPayload,
): IGameEvent {
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.AMSInterception,
      turn,
      GamePhase.WeaponAttack,
      payload.defenderId,
    ),
    payload,
  };
}
