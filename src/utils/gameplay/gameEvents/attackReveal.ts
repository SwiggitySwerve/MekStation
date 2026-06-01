import {
  GameEventType,
  GamePhase,
  IAttacksRevealedPayload,
  IGameEvent,
} from '@/types/gameplay';

import { createEventBase } from './base';

export function createAttacksRevealedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitIds: readonly string[],
  attackCount: number,
): IGameEvent {
  const payload: IAttacksRevealedPayload = { unitIds, attackCount };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.AttacksRevealed,
      turn,
      GamePhase.WeaponAttack,
    ),
    payload,
  };
}
