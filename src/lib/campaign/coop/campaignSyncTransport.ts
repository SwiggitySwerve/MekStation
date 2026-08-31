import type { GmDecision, IGuestProposal } from '@/types/campaign/CoopCampaign';
import type {
  ICampaignClientMessage,
  ICampaignParticipationPayload,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import { credentialProtocols } from '@/lib/multiplayer/socketCredentialProtocol';
import {
  isCampaignWireEvent,
  type ICampaignEvent,
  type ICampaignIntent,
  type ICampaignReconcileBattleIntent,
} from '@/types/campaign/CampaignSync';
import {
  encodeTokenForWire,
  type IPlayerToken,
} from '@/types/multiplayer/Player';
import {
  ClientMessageSchema,
  HEARTBEAT_INTERVAL_MS,
  nowIso,
  ServerMessageSchema,
} from '@/types/multiplayer/Protocol';

import { readCoopCampaignToken } from './coopCampaignAuthTokenStore';

export type CampaignSyncFrameHandler = (message: IServerMessage) => void;

export interface ICampaignSyncTransport {
  readonly matchId: string;
  readonly playerId: string;
  readonly role: 'host' | 'guest';
  sendProposal(proposal: IGuestProposal): void;
  sendDecision(proposalId: string, decision: GmDecision): void;
  sendHostIntent(
    intent: ICampaignIntent | ICampaignReconcileBattleIntent,
  ): void;
  sendParticipation(participation: ICampaignParticipationPayload): void;
  onFrame(handler: CampaignSyncFrameHandler): () => void;
  onError(handler: (error: unknown) => void): () => void;
  close(): void;
  lastSeq(): number;
}

export interface ICampaignSyncWebSocket {
  send(data: string): void;
  close(): void;
  readyState: number;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onclose: ((ev: unknown) => void) | null;
}

export type CampaignSyncSocketFactory = (
  url: string,
  protocols?: string[],
) => ICampaignSyncWebSocket;

export interface IConnectCampaignSyncOptions {
  readonly matchId: string;
  readonly role: 'host' | 'guest';
  readonly playerId: string;
  readonly wireToken: string | IPlayerToken;
  readonly roomCode?: string;
  readonly lastSeq?: number;
  readonly url?: string;
  readonly socketFactory?: CampaignSyncSocketFactory;
}

export interface IConnectStoredCampaignSyncOptions {
  readonly matchId: string | null | undefined;
  readonly role: 'host' | 'guest';
  readonly roomCode?: string;
  readonly lastSeq?: number;
  readonly url?: string;
  readonly socketFactory?: CampaignSyncSocketFactory;
}

const activeTransports = new Map<string, ICampaignSyncTransport>();

export function connectCampaignSyncTransport(
  options: IConnectCampaignSyncOptions,
): ICampaignSyncTransport {
  const listeners = new Set<CampaignSyncFrameHandler>();
  const errorListeners = new Set<(error: unknown) => void>();
  const pendingOutbound: ICampaignClientMessage[] = [];
  let lastSeq = options.lastSeq ?? -1;
  let closed = false;
  const wireToken = encodeCampaignSocketToken(options.wireToken);
  const socket = (options.socketFactory ?? defaultSocketFactory())(
    buildCampaignSyncSocketUrl(options),
    credentialProtocols(wireToken),
  );
  // The campaign socket participates in the same liveness policy as the
  // match socket (the server reaps idle connections after
  // HEARTBEAT_TIMEOUT_MS), so a quiet channel - a GM reading the screen
  // between commands - must carry heartbeats or be reaped for silence.
  // Same cadence as the match client: several beats fit inside one
  // timeout window, so a single dropped frame costs nothing.
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  const stopHeartbeat = (): void => {
    if (heartbeatTimer !== null) clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  };
  const startHeartbeat = (): void => {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      if (closed || socket.readyState !== 1) return;
      sendParsedEnvelope({
        kind: 'Heartbeat',
        matchId: options.matchId,
        ts: nowIso(),
      });
    }, HEARTBEAT_INTERVAL_MS);
  };

  const emitError = (error: unknown): void => {
    errorListeners.forEach((handler) => handler(error));
  };
  const sendEnvelope = (message: ICampaignClientMessage): void => {
    if (closed) return;
    const parsed = ClientMessageSchema.safeParse(message);
    if (!parsed.success) {
      emitError(new Error('Campaign sync frame failed local validation'));
      return;
    }
    if (socket.readyState !== 1) {
      pendingOutbound.push(parsed.data as ICampaignClientMessage);
      return;
    }
    sendParsedEnvelope(parsed.data as ICampaignClientMessage);
  };
  const sendParsedEnvelope = (message: ICampaignClientMessage): void => {
    socket.send(JSON.stringify(message));
  };

  const transport: ICampaignSyncTransport = {
    matchId: options.matchId,
    playerId: options.playerId,
    role: options.role,
    sendProposal: (proposal) => {
      sendEnvelope({
        kind: 'CampaignProposal',
        matchId: options.matchId,
        ts: nowIso(),
        playerId: options.playerId,
        proposal,
      });
    },
    sendDecision: (proposalId, decision) => {
      sendEnvelope({
        kind: 'CampaignDecision',
        matchId: options.matchId,
        ts: nowIso(),
        playerId: options.playerId,
        proposalId,
        decision,
      });
    },
    sendHostIntent: (
      intent: ICampaignIntent | ICampaignReconcileBattleIntent,
    ) => {
      sendEnvelope({
        kind: 'CampaignHostIntent',
        matchId: options.matchId,
        ts: nowIso(),
        playerId: options.playerId,
        intent,
      });
    },
    sendParticipation: (participation) => {
      sendEnvelope({
        kind: 'CampaignParticipation',
        matchId: options.matchId,
        ts: nowIso(),
        playerId: options.playerId,
        participation,
      });
    },
    onFrame: (handler) => {
      listeners.add(handler);
      return () => {
        listeners.delete(handler);
      };
    },
    onError: (handler) => {
      errorListeners.add(handler);
      return () => {
        errorListeners.delete(handler);
      };
    },
    close: () => {
      closed = true;
      stopHeartbeat();
      if (activeTransports.get(options.matchId) === transport) {
        activeTransports.delete(options.matchId);
      }
      socket.close();
    },
    lastSeq: () => lastSeq,
  };

  socket.onopen = () => {
    startHeartbeat();
    sendEnvelope({
      kind: 'CampaignJoin',
      matchId: options.matchId,
      ts: nowIso(),
      playerId: options.playerId,
      role: options.role,
      token: wireToken,
      roomCode: options.roomCode,
      ...(lastSeq >= 0 ? { lastSeq } : {}),
    });
    while (pendingOutbound.length > 0 && socket.readyState === 1) {
      const next = pendingOutbound.shift();
      if (next) sendParsedEnvelope(next);
    }
  };
  socket.onmessage = (ev) => {
    const message = parseServerMessage(ev.data);
    if (!message) return;
    updateLastSeq(message, (sequence) => {
      lastSeq = Math.max(lastSeq, sequence);
    });
    listeners.forEach((handler) => handler(message));
    if (
      message.kind === 'CampaignEvent' &&
      isCampaignWireEvent(message.event)
    ) {
      // A live event is acked at its own sequence. A resync snapshot is
      // stamped sequence -1 but leaves the client genuinely holding the
      // state at payload.revision, so it is acked at THAT revision -
      // without this, a large-gap rejoiner could never converge until an
      // unrelated live event happened to land, and progression deadlocked.
      const ackRevision =
        message.event.sequence >= 0
          ? message.event.sequence
          : snapshotAckRevision(message.event);
      if (ackRevision !== null) {
        sendEnvelope({
          kind: 'CampaignAck',
          matchId: options.matchId,
          ts: nowIso(),
          playerId: options.playerId,
          campaignId: message.event.campaignId,
          revision: ackRevision,
        });
      }
    }
  };
  socket.onerror = (ev) => emitError(ev);
  socket.onclose = () => {
    stopHeartbeat();
    if (activeTransports.get(options.matchId) === transport) {
      activeTransports.delete(options.matchId);
    }
  };

  activeTransports.set(options.matchId, transport);
  return transport;
}

export function getActiveCampaignSyncTransport(
  matchId: string | null | undefined,
): ICampaignSyncTransport | null {
  if (!matchId) return null;
  return activeTransports.get(matchId) ?? null;
}

export function connectStoredCampaignSyncTransport(
  options: IConnectStoredCampaignSyncOptions,
): ICampaignSyncTransport | null {
  if (!options.matchId) return null;
  const existing = getActiveCampaignSyncTransport(options.matchId);
  if (existing) return existing;
  const token = readCoopCampaignToken(options.matchId);
  if (!token) return null;
  return connectCampaignSyncTransport({
    matchId: options.matchId,
    role: options.role,
    playerId: token.playerId,
    wireToken: token.wireToken,
    roomCode: options.roomCode,
    lastSeq: options.lastSeq,
    url: options.url,
    socketFactory: options.socketFactory,
  });
}

export function registerCampaignSyncTransport(
  transport: ICampaignSyncTransport,
): () => void {
  activeTransports.set(transport.matchId, transport);
  return () => {
    if (activeTransports.get(transport.matchId) === transport) {
      activeTransports.delete(transport.matchId);
    }
  };
}

function encodeCampaignSocketToken(token: string | IPlayerToken): string {
  return typeof token === 'string' ? token : encodeTokenForWire(token);
}

function buildCampaignSyncSocketUrl(
  options: IConnectCampaignSyncOptions,
): string {
  const base = options.url ?? defaultCampaignSocketUrl();
  // No `token` here - it travels in the subprotocol header instead, so
  // the credential stays out of access and proxy logs. `channel` and
  // the ids are routing hints; the server derives the principal from
  // the token alone and trusts neither.
  const params = new URLSearchParams({
    matchId: options.matchId,
    playerId: options.playerId,
    channel: 'campaign',
  });
  return `${base}${base.includes('?') ? '&' : '?'}${params.toString()}`;
}

function defaultCampaignSocketUrl(): string {
  if (typeof window === 'undefined') {
    return 'ws://localhost:3000/api/multiplayer/socket';
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/multiplayer/socket`;
}

function defaultSocketFactory(): CampaignSyncSocketFactory {
  return (url: string, protocols?: string[]) => {
    const Ctor =
      typeof globalThis !== 'undefined'
        ? (
            globalThis as {
              WebSocket?: new (
                url: string,
                protocols?: string[],
              ) => ICampaignSyncWebSocket;
            }
          ).WebSocket
        : undefined;
    if (!Ctor) {
      throw new Error(
        'No WebSocket constructor available; pass options.socketFactory',
      );
    }
    return new Ctor(url, protocols);
  };
}

function parseServerMessage(data: unknown): IServerMessage | null {
  const raw = typeof data === 'string' ? data : String(data);
  try {
    const parsed = ServerMessageSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * The revision a snapshot baseline entitles the client to acknowledge,
 * or null when the frame is not an ack-able snapshot. Only a
 * CampaignSnapshotPublished carrying a non-negative integer revision
 * qualifies - anything else acks nothing rather than guessing.
 */
function snapshotAckRevision(event: {
  readonly type: string;
  readonly payload?: unknown;
}): number | null {
  if (event.type !== 'CampaignSnapshotPublished') return null;
  const payload = event.payload;
  if (typeof payload !== 'object' || payload === null) return null;
  const revision = Reflect.get(payload, 'revision');
  return typeof revision === 'number' &&
    Number.isInteger(revision) &&
    revision >= 0
    ? revision
    : null;
}

function updateLastSeq(
  message: IServerMessage,
  setSequence: (sequence: number) => void,
): void {
  if (
    (message.kind === 'CampaignSnapshot' || message.kind === 'CampaignEvent') &&
    isCampaignWireEvent(message.event)
  ) {
    setSequence(message.event.sequence);
  }
}

export function campaignEventFromMessage(
  message: IServerMessage,
): ICampaignEvent | null {
  if (
    (message.kind === 'CampaignSnapshot' || message.kind === 'CampaignEvent') &&
    isCampaignWireEvent(message.event)
  ) {
    return message.event;
  }
  return null;
}

export function campaignSnapshotFromMessage(
  message: IServerMessage,
): ICampaignEvent<'CampaignSnapshotPublished'> | null {
  const event = campaignEventFromMessage(message);
  return event?.type === 'CampaignSnapshotPublished' ? event : null;
}

export function _resetCampaignSyncTransportsForTest(): void {
  activeTransports.forEach((transport) => transport.close());
  activeTransports.clear();
}
