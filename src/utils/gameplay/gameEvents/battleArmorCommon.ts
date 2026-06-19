import type { GameEventType, IGameEventBase } from '@/types/gameplay';

import type { IGameplayEventContext } from './eventContext';

import { createEventBase } from './base';

export type IBattleArmorEventContext = IGameplayEventContext;

export function createBattleArmorEventBase(
  input: IBattleArmorEventContext,
  type: GameEventType,
): IGameEventBase {
  return createEventBase(
    input.gameId,
    input.sequence,
    type,
    input.turn,
    input.phase,
    input.unitId,
  );
}
