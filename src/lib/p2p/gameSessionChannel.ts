import type * as Y from 'yjs';

import {
  GAME_INTENT_TYPES,
  GameEventType,
  isGameEvent,
  type GameIntentType,
  type IGameEvent,
  type IGameIntent,
} from '@/types/gameplay/GameSessionInterfaces';
import { REPLAY_CHUNK_SIZE } from '@/types/multiplayer/Protocol';
import {
  deserializeEvent,
  serializeEvent,
} from '@/utils/gameplay/gameEvents/serialization';

import { matchLogStorage, type MatchLogStorage } from './matchLogStorage';
import { getLocalPeerId, getYArray } from './SyncProvider';

export const GAME_SESSION_EVENTS_ARRAY = 'gameEvents';

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

export type PeerEventCallback = (
  event: IGameEvent,
  envelope: IGameEventEnvelope,
) => void;

export type PeerIntentCallback = (
  intent: IGameIntent,
  envelope: IGameIntentEnvelope,
) => void;

export type PeerRejectedCallback = (envelope: IPeerRejectedEnvelope) => void;
export type ReconnectRequestCallback = (
  envelope: IReconnectRequestEnvelope,
) => void;
export type ReplayStreamCallback = (envelope: IReplayStreamEnvelope) => void;
export type ReconnectRejectCallback = (
  envelope: IReconnectRejectEnvelope,
) => void;

export type MatchLogPersistence = Pick<MatchLogStorage, 'appendEvent'>;
export type MatchLogCompletion = Pick<MatchLogStorage, 'markMatchCompleted'>;

export type GameSessionChannelLogger = Pick<Console, 'error'>;

export interface IGameSessionChannel {
  readonly broadcastEvent: (event: IGameEvent) => void;
  readonly onPeerEvent: (callback: PeerEventCallback) => () => void;
  readonly broadcastIntent: (intent: IGameIntent) => void;
  readonly onPeerIntent: (callback: PeerIntentCallback) => () => void;
  readonly broadcastRejection: (
    rejection: Omit<IPeerRejectedEnvelope, 'kind'>,
  ) => void;
  readonly onPeerRejection: (callback: PeerRejectedCallback) => () => void;
  readonly broadcastReconnectRequest: (
    request: Omit<IReconnectRequestEnvelope, 'kind' | 'authorPeerId'>,
  ) => void;
  readonly onReconnectRequest: (
    callback: ReconnectRequestCallback,
  ) => () => void;
  readonly broadcastReplayStream: (
    stream: Omit<IReplayStreamEnvelope, 'kind'>,
  ) => void;
  readonly onReplayStream: (callback: ReplayStreamCallback) => () => void;
  readonly broadcastReconnectReject: (
    rejection: Omit<IReconnectRejectEnvelope, 'kind'>,
  ) => void;
  readonly onReconnectReject: (
    callback: ReconnectRejectCallback,
  ) => () => void;
}

export interface IGameSessionChannelOptions {
  readonly localPeerId?: string;
  readonly eventArray?: Y.Array<string>;
  readonly getEventArray?: () => Y.Array<string> | null;
  readonly matchId?: string;
  readonly getMatchId?: () => string | null | undefined;
  readonly matchLog?: MatchLogPersistence & Partial<MatchLogCompletion>;
  readonly logger?: GameSessionChannelLogger;
}

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

export function createGameSessionChannel(
  options: IGameSessionChannelOptions = {},
): IGameSessionChannel {
  const appendEnvelope = (envelope: GameSessionChannelEnvelope): void => {
    const eventArray = requireGameEventsArray(options);
    eventArray.push([serializeGameSessionEnvelope(envelope)]);
  };

  const persistEvent = (event: IGameEvent): void => {
    const matchId = getPersistenceMatchId(options);
    if (!matchId) return;

    const storage = options.matchLog ?? matchLogStorage;
    void storage
      .appendEvent(matchId, event)
      .then(() => {
        if (event.type !== GameEventType.GameEnded) return;
        return storage.markMatchCompleted?.(matchId, event.timestamp);
      })
      .catch((error: unknown) => {
        const logger = options.logger ?? console;
        logger.error('Failed to persist P2P match event', {
          matchId,
          sequence: event.sequence,
          error,
        });
      });
  };

  const observeEnvelopes = (
    callback: (envelope: GameSessionChannelEnvelope) => void,
  ): (() => void) => {
    const eventArray = requireGameEventsArray(options);
    const observer = (event: Y.YArrayEvent<string>): void => {
      for (const serialized of insertedValues(event)) {
        const envelope = tryDeserializeGameSessionEnvelope(serialized);
        if (!envelope) continue;
        callback(envelope);
      }
    };

    eventArray.observe(observer);
    return () => {
      eventArray.unobserve(observer);
    };
  };

  const isLocalAuthor = (authorPeerId: string): boolean => {
    return authorPeerId === requireLocalPeerId(options);
  };

  return {
    broadcastEvent: (event: IGameEvent): void => {
      appendEnvelope({
        kind: 'game-event',
        event,
        authorPeerId: requireLocalPeerId(options),
      });
      persistEvent(event);
    },
    onPeerEvent: (callback: PeerEventCallback): (() => void) => {
      return observeEnvelopes((envelope) => {
        if (envelope.kind !== 'game-event') return;
        if (isLocalAuthor(envelope.authorPeerId)) return;
        persistEvent(envelope.event);
        callback(envelope.event, envelope);
      });
    },
    broadcastIntent: (intent: IGameIntent): void => {
      const authorPeerId = requireLocalPeerId(options);
      appendEnvelope({
        kind: 'game-intent',
        intent: { ...intent, authorPeerId },
        authorPeerId,
      });
    },
    onPeerIntent: (callback: PeerIntentCallback): (() => void) => {
      return observeEnvelopes((envelope) => {
        if (envelope.kind !== 'game-intent') return;
        if (isLocalAuthor(envelope.authorPeerId)) return;
        callback(envelope.intent, envelope);
      });
    },
    broadcastRejection: (
      rejection: Omit<IPeerRejectedEnvelope, 'kind'>,
    ): void => {
      appendEnvelope({
        kind: 'peer-rejected',
        intentId: rejection.intentId,
        reason: rejection.reason,
      });
    },
    onPeerRejection: (callback: PeerRejectedCallback): (() => void) => {
      return observeEnvelopes((envelope) => {
        if (envelope.kind !== 'peer-rejected') return;
        callback(envelope);
      });
    },
    broadcastReconnectRequest: (
      request: Omit<IReconnectRequestEnvelope, 'kind' | 'authorPeerId'>,
    ): void => {
      appendEnvelope(
        createReconnectRequestEnvelope({
          ...request,
          authorPeerId: requireLocalPeerId(options),
        }),
      );
    },
    onReconnectRequest: (callback: ReconnectRequestCallback): (() => void) => {
      return observeEnvelopes((envelope) => {
        if (envelope.kind !== 'reconnect-request') return;
        if (isLocalAuthor(envelope.authorPeerId)) return;
        callback(envelope);
      });
    },
    broadcastReplayStream: (
      stream: Omit<IReplayStreamEnvelope, 'kind'>,
    ): void => {
      appendEnvelope({
        kind: 'replay-stream',
        matchId: stream.matchId,
        events: stream.events,
        done: stream.done,
      });
    },
    onReplayStream: (callback: ReplayStreamCallback): (() => void) => {
      return observeEnvelopes((envelope) => {
        if (envelope.kind !== 'replay-stream') return;
        callback(envelope);
      });
    },
    broadcastReconnectReject: (
      rejection: Omit<IReconnectRejectEnvelope, 'kind'>,
    ): void => {
      appendEnvelope({
        kind: 'reconnect-reject',
        matchId: rejection.matchId,
        reason: rejection.reason,
      });
    },
    onReconnectReject: (callback: ReconnectRejectCallback): (() => void) => {
      return observeEnvelopes((envelope) => {
        if (envelope.kind !== 'reconnect-reject') return;
        callback(envelope);
      });
    },
  };
}

export function broadcastEvent(event: IGameEvent): void {
  createGameSessionChannel().broadcastEvent(event);
}

export function onPeerEvent(callback: PeerEventCallback): () => void {
  return createGameSessionChannel().onPeerEvent(callback);
}

export function broadcastIntent(intent: IGameIntent): void {
  createGameSessionChannel().broadcastIntent(intent);
}

export function onPeerIntent(callback: PeerIntentCallback): () => void {
  return createGameSessionChannel().onPeerIntent(callback);
}

export function broadcastRejection(
  rejection: Omit<IPeerRejectedEnvelope, 'kind'>,
): void {
  createGameSessionChannel().broadcastRejection(rejection);
}

export function onPeerRejection(callback: PeerRejectedCallback): () => void {
  return createGameSessionChannel().onPeerRejection(callback);
}

export function createReconnectRequestEnvelope(input: {
  readonly matchId: string;
  readonly lastLocalSeq: number;
  readonly authorPeerId: string;
}): IReconnectRequestEnvelope {
  return {
    kind: 'reconnect-request',
    matchId: input.matchId,
    lastLocalSeq: input.lastLocalSeq,
    authorPeerId: input.authorPeerId,
  };
}

export function createReplayStreamEnvelopes(
  matchId: string,
  events: readonly IGameEvent[],
  chunkSize: number = REPLAY_CHUNK_SIZE,
): IReplayStreamEnvelope[] {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new Error('Replay chunk size must be a positive integer');
  }

  if (events.length === 0) {
    return [
      {
        kind: 'replay-stream',
        matchId,
        events: [],
        done: true,
      },
    ];
  }

  const envelopes: IReplayStreamEnvelope[] = [];
  for (let index = 0; index < events.length; index += chunkSize) {
    const chunk = events.slice(index, index + chunkSize);
    envelopes.push({
      kind: 'replay-stream',
      matchId,
      events: chunk,
      done: index + chunkSize >= events.length,
    });
  }
  return envelopes;
}

export function getReplayEventsAfterSeq(
  events: readonly IGameEvent[],
  lastLocalSeq: number,
): IGameEvent[] {
  return events
    .filter((event) => event.sequence > lastLocalSeq)
    .sort((left, right) => left.sequence - right.sequence);
}

export function applyReplayStreamEvents(
  streams: readonly IReplayStreamEnvelope[],
  appendEvent: (event: IGameEvent) => void,
): void {
  const events = streams.flatMap((stream) => stream.events);
  for (const event of events.sort(
    (left, right) => left.sequence - right.sequence,
  )) {
    appendEvent(event);
  }
}

export interface IReconnectPeerMetadata {
  readonly hostPeerId?: string | null;
  readonly guestPeerId?: string | null;
}

export type ReconnectResponseChannel = Pick<
  IGameSessionChannel,
  'broadcastRejection' | 'broadcastReconnectReject' | 'broadcastReplayStream'
>;

export type ReconnectResponseResult =
  | 'wrong-match'
  | 'rejected'
  | 'ignored-host'
  | 'streamed';

export async function answerReconnectRequest(
  request: IReconnectRequestEnvelope,
  options: {
    readonly matchId: string;
    readonly metadata: IReconnectPeerMetadata | null | undefined;
    readonly channel: ReconnectResponseChannel;
    readonly getEventsFromSeq: (
      seq: number,
    ) => readonly IGameEvent[] | Promise<readonly IGameEvent[]>;
  },
): Promise<ReconnectResponseResult> {
  if (request.matchId !== options.matchId) {
    options.channel.broadcastRejection({ reason: 'wrong-match' });
    return 'wrong-match';
  }

  const hostPeerId = options.metadata?.hostPeerId ?? null;
  const guestPeerId = options.metadata?.guestPeerId ?? null;
  const peerId = request.authorPeerId;

  if (peerId !== hostPeerId && peerId !== guestPeerId) {
    options.channel.broadcastReconnectReject({
      matchId: options.matchId,
      reason: 'Match in progress',
    });
    return 'rejected';
  }

  if (peerId !== guestPeerId) {
    return 'ignored-host';
  }

  const events = await options.getEventsFromSeq(request.lastLocalSeq + 1);
  for (const stream of createReplayStreamEnvelopes(options.matchId, events)) {
    options.channel.broadcastReplayStream(stream);
  }
  return 'streamed';
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

function requireGameEventsArray(
  options: IGameSessionChannelOptions,
): Y.Array<string> {
  const eventArray =
    options.eventArray ??
    options.getEventArray?.() ??
    getYArray<string>(GAME_SESSION_EVENTS_ARRAY);

  if (!eventArray) {
    throw new Error('No active gameEvents Y.Array');
  }

  return eventArray;
}

function requireLocalPeerId(options: IGameSessionChannelOptions): string {
  const peerId = options.localPeerId ?? getLocalPeerId();
  if (!peerId) {
    throw new Error('No local peer id available');
  }
  return peerId;
}

function getPersistenceMatchId(
  options: IGameSessionChannelOptions,
): string | null {
  return options.matchId ?? options.getMatchId?.() ?? null;
}

function insertedValues(event: Y.YArrayEvent<string>): readonly string[] {
  const values: string[] = [];

  for (const change of event.changes.delta) {
    const insert = 'insert' in change ? change.insert : undefined;
    if (Array.isArray(insert)) {
      for (const value of insert) {
        if (typeof value === 'string') {
          values.push(value);
        }
      }
    } else if (typeof insert === 'string') {
      values.push(insert);
    }
  }

  return values;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
