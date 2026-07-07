import type { ICampaignEvent } from '@/types/campaign/CampaignSync';
import type { GmDecision, IGuestProposal } from '@/types/campaign/CoopCampaign';
import type {
  ICampaignClientMessage,
  ICampaignParticipationPayload,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import {
  ClientMessageSchema,
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

export type CampaignSyncSocketFactory = (url: string) => ICampaignSyncWebSocket;

export interface IConnectCampaignSyncOptions {
  readonly matchId: string;
  readonly role: 'host' | 'guest';
  readonly playerId: string;
  readonly wireToken: string;
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
  const socket = (options.socketFactory ?? defaultSocketFactory())(
    buildCampaignSyncSocketUrl(options),
  );

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
      if (activeTransports.get(options.matchId) === transport) {
        activeTransports.delete(options.matchId);
      }
      socket.close();
    },
    lastSeq: () => lastSeq,
  };

  socket.onopen = () => {
    sendEnvelope({
      kind: 'CampaignJoin',
      matchId: options.matchId,
      ts: nowIso(),
      playerId: options.playerId,
      role: options.role,
      token: options.wireToken,
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
  };
  socket.onerror = (ev) => emitError(ev);
  socket.onclose = () => {
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

function buildCampaignSyncSocketUrl(
  options: IConnectCampaignSyncOptions,
): string {
  const base = options.url ?? defaultCampaignSocketUrl();
  const params = new URLSearchParams({
    matchId: options.matchId,
    token: options.wireToken,
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
  return (url: string) => {
    const Ctor =
      typeof globalThis !== 'undefined'
        ? (
            globalThis as {
              WebSocket?: new (url: string) => ICampaignSyncWebSocket;
            }
          ).WebSocket
        : undefined;
    if (!Ctor) {
      throw new Error(
        'No WebSocket constructor available; pass options.socketFactory',
      );
    }
    return new Ctor(url);
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

function updateLastSeq(
  message: IServerMessage,
  setSequence: (sequence: number) => void,
): void {
  if (
    (message.kind === 'CampaignSnapshot' || message.kind === 'CampaignEvent') &&
    isCampaignSyncEvent(message.event)
  ) {
    setSequence(message.event.sequence);
  }
}

export function campaignEventFromMessage(
  message: IServerMessage,
): ICampaignEvent | null {
  if (
    (message.kind === 'CampaignSnapshot' || message.kind === 'CampaignEvent') &&
    isCampaignSyncEvent(message.event)
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

function isCampaignSyncEvent(value: unknown): value is ICampaignEvent {
  if (typeof value !== 'object' || value === null) return false;
  const event = value as Partial<ICampaignEvent>;
  return (
    typeof event.type === 'string' &&
    typeof event.sequence === 'number' &&
    Number.isInteger(event.sequence) &&
    event.sequence >= -1 &&
    typeof event.campaignId === 'string' &&
    typeof event.ts === 'string' &&
    typeof event.authorPlayerId === 'string' &&
    typeof event.payload === 'object' &&
    event.payload !== null
  );
}
