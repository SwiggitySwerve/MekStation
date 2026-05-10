import type * as Y from 'yjs';

import {
  GameEventType,
  type IGameEvent,
  type IGameIntent,
} from '@/types/gameplay/GameSessionInterfaces';
import { REPLAY_CHUNK_SIZE } from '@/types/multiplayer/Protocol';

import {
  serializeGameSessionEnvelope,
  tryDeserializeGameSessionEnvelope,
  type GameSessionChannelEnvelope,
  type IGameEventEnvelope,
  type IGameIntentEnvelope,
  type IPeerRejectedEnvelope,
  type IReconnectRejectEnvelope,
  type IReconnectRequestEnvelope,
  type IReplayStreamEnvelope,
} from './gameSessionEnvelope';
import { matchLogStorage, type MatchLogStorage } from './matchLogStorage';
import { getLocalPeerId, getYArray } from './SyncProvider';

export {
  deserializeGameSessionEnvelope,
  isGameIntent,
  serializeGameSessionEnvelope,
  tryDeserializeGameSessionEnvelope,
  type GameSessionChannelEnvelope,
  type IGameEventEnvelope,
  type IGameIntentEnvelope,
  type IPeerRejectedEnvelope,
  type IReconnectRejectEnvelope,
  type IReconnectRequestEnvelope,
  type IReplayStreamEnvelope,
} from './gameSessionEnvelope';

export const GAME_SESSION_EVENTS_ARRAY = 'gameEvents';

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
  readonly onReconnectReject: (callback: ReconnectRejectCallback) => () => void;
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
