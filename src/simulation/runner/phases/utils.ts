import {
  GameEventType,
  GamePhase,
  GameSide,
  IGameEvent,
  type IAttackResolvedPayload,
  type IPSRTriggeredPayload,
  type IUnitDestroyedPayload,
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

export interface ICreateGameEventInput {
  readonly gameId: string;
  readonly sequence: number;
  readonly type: GameEventType;
  readonly turn: number;
  readonly phase: GamePhase;
  readonly payload: IGameEvent['payload'];
  readonly actorId?: string;
  readonly replaySource?: ReplaySource;
}

type LegacyCreateGameEventArgs = readonly [
  gameId: string,
  sequence: number,
  type: GameEventType,
  turn: number,
  phase: GamePhase,
  payload: IGameEvent['payload'],
  actorId?: string,
  replaySource?: ReplaySource,
];

type CreateGameEventArgs =
  | readonly [input: ICreateGameEventInput]
  | LegacyCreateGameEventArgs;

function normalizeCreateGameEventInput(
  args: CreateGameEventArgs,
): ICreateGameEventInput {
  if (args.length === 1) {
    return args[0];
  }

  const [gameId, sequence, type, turn, phase, payload, actorId, replaySource] =
    args;
  return {
    gameId,
    sequence,
    type,
    turn,
    phase,
    payload,
    ...(actorId !== undefined ? { actorId } : {}),
    ...(replaySource !== undefined ? { replaySource } : {}),
  };
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
export function createGameEvent(...args: CreateGameEventArgs): IGameEvent {
  const {
    gameId,
    sequence,
    type,
    turn,
    phase,
    payload,
    actorId,
    replaySource,
  } = normalizeCreateGameEventInput(args);
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

export interface IAppendUnitDestroyedEventInput {
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly turn: number;
  readonly phase: GamePhase;
  readonly unitId: string;
  readonly cause: IUnitDestroyedPayload['cause'];
  readonly actorId?: string;
  readonly killerUnitId?: string;
}

export function appendUnitDestroyedEvent(
  options: IAppendUnitDestroyedEventInput,
): void {
  const payload: IUnitDestroyedPayload = {
    unitId: options.unitId,
    cause: options.cause,
    ...(options.killerUnitId !== undefined
      ? { killerUnitId: options.killerUnitId }
      : {}),
  };
  options.events.push(
    createGameEvent({
      gameId: options.gameId,
      sequence: options.events.length,
      type: GameEventType.UnitDestroyed,
      turn: options.turn,
      phase: options.phase,
      payload,
      ...(options.actorId !== undefined ? { actorId: options.actorId } : {}),
    }),
  );
}

export interface IAppendPsrTriggeredEventInput {
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly turn: number;
  readonly phase: GamePhase;
  readonly unitId: string;
  readonly reason: IPSRTriggeredPayload['reason'];
  readonly additionalModifier: IPSRTriggeredPayload['additionalModifier'];
  readonly triggerSource: IPSRTriggeredPayload['triggerSource'];
  readonly actorId?: string;
  readonly basePilotingSkill?: IPSRTriggeredPayload['basePilotingSkill'];
  readonly fixedTargetNumber?: IPSRTriggeredPayload['fixedTargetNumber'];
  readonly reasonCode?: IPSRTriggeredPayload['reasonCode'];
}

export function appendPsrTriggeredEvent(
  options: IAppendPsrTriggeredEventInput,
): void {
  const payload: IPSRTriggeredPayload = {
    unitId: options.unitId,
    reason: options.reason,
    additionalModifier: options.additionalModifier,
    triggerSource: options.triggerSource,
    ...(options.basePilotingSkill !== undefined
      ? { basePilotingSkill: options.basePilotingSkill }
      : {}),
    ...(options.fixedTargetNumber !== undefined
      ? { fixedTargetNumber: options.fixedTargetNumber }
      : {}),
    ...(options.reasonCode !== undefined
      ? { reasonCode: options.reasonCode }
      : {}),
  };

  options.events.push(
    createGameEvent({
      gameId: options.gameId,
      sequence: options.events.length,
      type: GameEventType.PSRTriggered,
      turn: options.turn,
      phase: options.phase,
      payload,
      ...(options.actorId !== undefined ? { actorId: options.actorId } : {}),
    }),
  );
}

export interface IAppendAttackResolvedEventInput {
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly turn: number;
  readonly payload: IAttackResolvedPayload;
  readonly actorId?: string;
}

export function appendAttackResolvedEvent(
  options: IAppendAttackResolvedEventInput,
): void {
  options.events.push(
    createGameEvent({
      gameId: options.gameId,
      sequence: options.events.length,
      type: GameEventType.AttackResolved,
      turn: options.turn,
      phase: GamePhase.WeaponAttack,
      payload: options.payload,
      ...(options.actorId !== undefined ? { actorId: options.actorId } : {}),
    }),
  );
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
