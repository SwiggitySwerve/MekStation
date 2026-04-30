import type * as Y from 'yjs';

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
  readonly intentId: string;
  readonly reason: string;
}

export type GameSessionChannelEnvelope =
  | IGameEventEnvelope
  | IGameIntentEnvelope
  | IPeerRejectedEnvelope;

export type PeerEventCallback = (
  event: IGameEvent,
  envelope: IGameEventEnvelope,
) => void;

export type PeerIntentCallback = (
  intent: IGameIntent,
  envelope: IGameIntentEnvelope,
) => void;

export type PeerRejectedCallback = (envelope: IPeerRejectedEnvelope) => void;

export interface IGameSessionChannel {
  readonly broadcastEvent: (event: IGameEvent) => void;
  readonly onPeerEvent: (callback: PeerEventCallback) => () => void;
  readonly broadcastIntent: (intent: IGameIntent) => void;
  readonly onPeerIntent: (callback: PeerIntentCallback) => () => void;
  readonly broadcastRejection: (
    rejection: Omit<IPeerRejectedEnvelope, 'kind'>,
  ) => void;
  readonly onPeerRejection: (callback: PeerRejectedCallback) => () => void;
}

export interface IGameSessionChannelOptions {
  readonly localPeerId?: string;
  readonly eventArray?: Y.Array<string>;
  readonly getEventArray?: () => Y.Array<string> | null;
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
    if (
      typeof parsed.intentId !== 'string' ||
      typeof parsed.reason !== 'string'
    ) {
      throw new Error('Invalid peer rejection envelope payload');
    }
    return {
      kind: 'peer-rejected',
      intentId: parsed.intentId,
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
    },
    onPeerEvent: (callback: PeerEventCallback): (() => void) => {
      return observeEnvelopes((envelope) => {
        if (envelope.kind !== 'game-event') return;
        if (isLocalAuthor(envelope.authorPeerId)) return;
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
