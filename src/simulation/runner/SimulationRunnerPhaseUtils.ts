import { GameEventType, GamePhase, IGameEvent } from '@/types/gameplay';
import { D6Roller } from '@/utils/gameplay/hitLocation';

import { SeededRandom } from '../core/SeededRandom';

export function createD6Roller(random: SeededRandom): D6Roller {
  return () => Math.floor(random.next() * 6) + 1;
}

export function createGameEvent(
  gameId: string,
  sequence: number,
  type: GameEventType,
  turn: number,
  phase: GamePhase,
  payload: IGameEvent['payload'],
  actorId?: string,
): IGameEvent {
  return {
    id: `${gameId}-evt-${sequence}`,
    gameId,
    sequence,
    timestamp: new Date().toISOString(),
    type,
    turn,
    phase,
    payload,
    ...(actorId !== undefined ? { actorId } : {}),
  };
}
