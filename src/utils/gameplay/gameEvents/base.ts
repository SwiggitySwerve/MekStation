import { v4 as uuidv4 } from 'uuid';

import type { IGameEventBase } from '@/types/gameplay';

import { GameEventType, GamePhase, GameSide } from '@/types/gameplay';
import { classifyGameEventVisibility } from '@/utils/gameplay/gameEventVisibility';

export function generateEventId(): string {
  return uuidv4();
}

/**
 * Per `denormalize-event-envelope-and-close-emission-contract-gaps`
 * (game-event-system delta — Event Envelope Side Denormalization): mirror
 * `createGameEvent`'s `actorId` → `side` derivation here so the
 * non-runner emit paths (lifecycle / status / movement helpers) also land
 * with `side` populated on the envelope. The two builders use the same
 * `'player-'` / `'opponent-'` prefix rules; legacy `MetricsCollector.sideFromUnitId`
 * remains the fallback for replaying NDJSON streams written before this
 * change.
 */
function deriveSide(actorId: string | undefined): GameSide | undefined {
  if (!actorId) return undefined;
  if (actorId.startsWith('player-')) return GameSide.Player;
  if (actorId.startsWith('opponent-')) return GameSide.Opponent;
  return undefined;
}

export function createEventBase(
  gameId: string,
  sequence: number,
  type: GameEventType,
  turn: number,
  phase: GamePhase,
  actorId?: string,
): IGameEventBase {
  const side = deriveSide(actorId);
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
    ...(side !== undefined ? { side } : {}),
  };
}
