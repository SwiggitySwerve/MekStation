import {
  GameEventType,
  GamePhase,
  GameSide,
  IGameEvent,
  ReplaySource,
} from '@/types/gameplay';
import { D6Roller } from '@/utils/gameplay/hitLocation';

import { SeededRandom } from '../../core/SeededRandom';

export function createD6Roller(random: SeededRandom): D6Roller {
  return () => Math.floor(random.next() * 6) + 1;
}

/**
 * Per `denormalize-event-envelope-and-close-emission-contract-gaps`
 * (game-event-system delta — Event Envelope Side Denormalization): derive
 * the `side` field from the `actorId` prefix using the same lookup the
 * runner already uses for its `player-N` / `opponent-N` unit ids. This is
 * the canonical chokepoint — `createGameEvent` is the single emission
 * builder used by every runner phase, so populating `side` here means
 * every event lands on the wire with side already denormalized.
 *
 * Returns `undefined` for ids that don't match either prefix (system
 * events with no actor, or test fixtures with synthetic ids); the
 * envelope omits the field in that case so consumers can fall back to
 * `MetricsCollector.sideFromUnitId` if they need to derive it from
 * `payload.unitId` instead.
 */
function deriveSide(actorId: string | undefined): GameSide | undefined {
  if (!actorId) return undefined;
  if (actorId.startsWith('player-')) return GameSide.Player;
  if (actorId.startsWith('opponent-')) return GameSide.Opponent;
  return undefined;
}

/**
 * Single chokepoint for emitting `IGameEvent` records. Per add-replay-library
 * (game-event-system delta — Event Envelope Replay Source Discriminator):
 * accepts an optional `replaySource` that flows onto the envelope so
 * consumers (replay viewer, library page, backfill scan) can route events
 * by origin without filename archaeology.
 *
 * `replaySource` is optional for back-compat: callers from legacy code
 * paths that haven't been threaded yet pass nothing, the field is omitted,
 * and consumers fall back to inferring from filesystem location.
 */
export function createGameEvent(
  gameId: string,
  sequence: number,
  type: GameEventType,
  turn: number,
  phase: GamePhase,
  payload: IGameEvent['payload'],
  actorId?: string,
  replaySource?: ReplaySource,
): IGameEvent {
  const side = deriveSide(actorId);
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
    ...(side !== undefined ? { side } : {}),
    ...(replaySource !== undefined ? { replaySource } : {}),
  };
}

export function createRunnerTurnStartedEvent(
  gameId: string,
  sequence: number,
  turn: number,
): IGameEvent {
  return createGameEvent(
    gameId,
    sequence,
    GameEventType.TurnStarted,
    turn,
    GamePhase.Initiative,
    { _type: 'turn_started' as const },
  );
}
