import {
  GAME_INTENT_TYPES,
  isGameEvent,
  type GameIntentType,
  type IGameEvent,
  type IGameIntent,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  deserializeEvent,
  serializeEvent,
} from '@/utils/gameplay/gameEvents/serialization';

export interface IGameEventEnvelope {
  readonly kind: 'game-event';
  readonly event: IGameEvent;
  readonly authorPeerId: string;
}

export interface IGameIntentEnvelope {
  readonly kind: 'game-intent';
  readonly intent: IGameIntent;
  readonly authorPeerId: string;
}

export interface IPeerRejectedEnvelope {
  readonly kind: 'peer-rejected';
  readonly intentId?: string;
  readonly reason: string;
}

export interface IReconnectRequestEnvelope {
  readonly kind: 'reconnect-request';
  readonly matchId: string;
  readonly lastLocalSeq: number;
  readonly authorPeerId: string;
}

export interface IReplayStreamEnvelope {
  readonly kind: 'replay-stream';
  readonly matchId: string;
  readonly events: readonly IGameEvent[];
  readonly done: boolean;
}

export interface IReconnectRejectEnvelope {
  readonly kind: 'reconnect-reject';
  readonly matchId: string;
  readonly reason: string;
}

export type GameSessionChannelEnvelope =
  | IGameEventEnvelope
  | IGameIntentEnvelope
  | IPeerRejectedEnvelope
  | IReconnectRequestEnvelope
  | IReplayStreamEnvelope
  | IReconnectRejectEnvelope;

export function serializeGameSessionEnvelope(
  envelope: GameSessionChannelEnvelope,
): string {
  if (envelope.kind === 'game-event') {
    const event: unknown = JSON.parse(serializeEvent(envelope.event));
    return JSON.stringify({
      kind: envelope.kind,
      event,
      authorPeerId: envelope.authorPeerId,
    });
  }

  if (envelope.kind === 'replay-stream') {
    const events = envelope.events.map((event) =>
      JSON.parse(serializeEvent(event)),
    );
    return JSON.stringify({
      kind: envelope.kind,
      matchId: envelope.matchId,
      events,
      done: envelope.done,
    });
  }

  return JSON.stringify(envelope);
}

export function deserializeGameSessionEnvelope(
  serialized: string,
): GameSessionChannelEnvelope {
  const parsed: unknown = JSON.parse(serialized);
  if (!isRecord(parsed)) {
    throw new Error('Invalid game session channel envelope');
  }

  if (parsed.kind === 'game-event') {
    if (typeof parsed.authorPeerId !== 'string') {
      throw new Error('Invalid game event envelope author');
    }
    const event = deserializeEvent(JSON.stringify(parsed.event));
    if (!isGameEvent(event)) {
      throw new Error('Invalid game event envelope payload');
    }
    return {
      kind: 'game-event',
      event,
      authorPeerId: parsed.authorPeerId,
    };
  }

  if (parsed.kind === 'game-intent') {
    if (typeof parsed.authorPeerId !== 'string') {
      throw new Error('Invalid game intent envelope author');
    }
    if (!isGameIntent(parsed.intent)) {
      throw new Error('Invalid game intent envelope payload');
    }
    return {
      kind: 'game-intent',
      intent: parsed.intent,
      authorPeerId: parsed.authorPeerId,
    };
  }

  if (parsed.kind === 'peer-rejected') {
    const intentId = parsed.intentId;
    if (
      (intentId !== undefined && typeof intentId !== 'string') ||
      typeof parsed.reason !== 'string'
    ) {
      throw new Error('Invalid peer rejection envelope payload');
    }
    return {
      kind: 'peer-rejected',
      intentId,
      reason: parsed.reason,
    };
  }

  if (parsed.kind === 'reconnect-request') {
    if (
      typeof parsed.matchId !== 'string' ||
      typeof parsed.lastLocalSeq !== 'number' ||
      !Number.isInteger(parsed.lastLocalSeq) ||
      parsed.lastLocalSeq < 0 ||
      typeof parsed.authorPeerId !== 'string'
    ) {
      throw new Error('Invalid reconnect request envelope payload');
    }
    return {
      kind: 'reconnect-request',
      matchId: parsed.matchId,
      lastLocalSeq: parsed.lastLocalSeq,
      authorPeerId: parsed.authorPeerId,
    };
  }

  if (parsed.kind === 'replay-stream') {
    if (
      typeof parsed.matchId !== 'string' ||
      !Array.isArray(parsed.events) ||
      typeof parsed.done !== 'boolean'
    ) {
      throw new Error('Invalid replay stream envelope payload');
    }
    const events = parsed.events.map((event) =>
      deserializeEvent(JSON.stringify(event)),
    );
    if (!events.every(isGameEvent)) {
      throw new Error('Invalid replay stream event payload');
    }
    return {
      kind: 'replay-stream',
      matchId: parsed.matchId,
      events,
      done: parsed.done,
    };
  }

  if (parsed.kind === 'reconnect-reject') {
    if (
      typeof parsed.matchId !== 'string' ||
      typeof parsed.reason !== 'string'
    ) {
      throw new Error('Invalid reconnect rejection envelope payload');
    }
    return {
      kind: 'reconnect-reject',
      matchId: parsed.matchId,
      reason: parsed.reason,
    };
  }

  throw new Error('Unknown game session channel envelope kind');
}

export function tryDeserializeGameSessionEnvelope(
  serialized: string,
): GameSessionChannelEnvelope | null {
  try {
    return deserializeGameSessionEnvelope(serialized);
  } catch {
    return null;
  }
}

export function isGameIntent(value: unknown): value is IGameIntent {
  if (!isRecord(value)) return false;
  return (
    isGameIntentType(value.type) &&
    'payload' in value &&
    typeof value.authorPeerId === 'string'
  );
}

function isGameIntentType(value: unknown): value is GameIntentType {
  return (
    typeof value === 'string' &&
    GAME_INTENT_TYPES.some((intentType) => intentType === value)
  );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
