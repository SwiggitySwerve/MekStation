import { v4 as uuidv4 } from 'uuid';

import { GameEventType, GamePhase, IGameEventBase } from '@/types/gameplay';

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
  };
}
