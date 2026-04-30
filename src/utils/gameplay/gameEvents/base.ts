import { v4 as uuidv4 } from 'uuid';

import type { IGameEventBase } from '@/types/gameplay';

import { GameEventType, GamePhase } from '@/types/gameplay';
import { classifyGameEventVisibility } from '@/utils/gameplay/gameEventVisibility';

export function generateEventId(): string {
  return uuidv4();
}

export function createEventBase(
  gameId: string,
  sequence: number,
  type: GameEventType,
  turn: number,
  phase: GamePhase,
  actorId?: string,
): IGameEventBase {
  return {
    id: generateEventId(),
    gameId,
    sequence,
    timestamp: new Date().toISOString(),
    type,
    turn,
    phase,
    actorId,
    visibility: classifyGameEventVisibility({ type }),
  };
}
