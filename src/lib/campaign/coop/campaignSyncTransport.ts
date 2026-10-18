import type { GmDecision, IGuestProposal } from '@/types/campaign/CoopCampaign';
import type {
  ICampaignClientMessage,
  ICampaignApplicationAck,
  ICampaignApplicationOffer,
  ICampaignParticipationPayload,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import { credentialProtocols } from '@/lib/multiplayer/socketCredentialProtocol';
import {
  isCampaignWireEvent,
  type CampaignHostCommand,
  type ICampaignEvent,
  type ICampaignReconcileBattleIntent,
} from '@/types/campaign/CampaignSync';
import {
  encodeTokenForWire,
  type IPlayerToken,
} from '@/types/multiplayer/Player';
import {
  ClientMessageSchema,
  CampaignApplicationClientMessageSchema,
  CampaignApplicationServerMessageSchema,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT_MS,
  nowIso,
} from '@/types/multiplayer/Protocol';
import { logger } from '@/utils/logger';

import { readCoopCampaignToken } from './coopCampaignAuthTokenStore';

export type CampaignSyncFrameHandler = (message: IServerMessage) => void;

export type CampaignAppliedOutcome =
  | { status: 'applied' }
  | {
      status: 'failed';
      reason: 'fold-rejected' | 'projection-failed' | 'adjunct-failed';
    };
export type CampaignAppliedResult =
  | { status: 'ack-sent' | 'prefix-pending' | 'already-completed' }
  | {
      status: 'refused';
      reason: 'unbound' | 'unknown-offer' | 'stale-offer' | 'closed';
    }
  | {
      status: 'recovery-required';
      reason:
        | 'application-failed'
        | 'application-refused'
        | 'prefix-conflict'
        | 'pending-overflow'
        | 'send-failed'
        | 'head-drift-exhausted'
        | 'confirmation-timeout'
        | 'socket-closed';
    };

export interface ICampaignSyncTransport {
  readonly matchId: string;
  readonly playerId: string;
  readonly role: 'host' | 'guest';
  readonly campaignId?: string;
  confirmApplied?(
    offer: ICampaignApplicationOffer,
    outcome: CampaignAppliedOutcome,
  ): CampaignAppliedResult;
  onAppliedViewConfirmed?(
    handler: (ack: ICampaignApplicationAck) => void,
  ): () => void;
  sendProposal(proposal: IGuestProposal): void;
  sendDecision(proposalId: string, decision: GmDecision): void;
  sendHostIntent(
    intent: CampaignHostCommand | ICampaignReconcileBattleIntent,
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
  readonly expectedCampaignId?: string;
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
  readonly expectedCampaignId?: string;
  readonly matchId: string | null | undefined;
  readonly role: 'host' | 'guest';
  readonly roomCode?: string;
  readonly lastSeq?: number;
  readonly url?: string;
  readonly socketFactory?: CampaignSyncSocketFactory;
}

const activeTransports = new Map<string, ICampaignSyncTransport>();
const activeObservers = new Map<string, Set<() => void>>();
const MAX_PENDING_APPLICATION_OFFERS = 64;
/** Identical re-sends of one unconfirmed ACK on head-drift (CF8). */
export const MAX_HEAD_DRIFT_RESENDS = 3;
/** How long one sent ACK waits for its confirmation or refusal (CF8). */
export const APPLICATION_CONFIRMATION_TIMEOUT_MS = HEARTBEAT_TIMEOUT_MS;

export function connectCampaignSyncTransport(
  options: IConnectCampaignSyncOptions,
): ICampaignSyncTransport {
  options = { ...options };
  const listeners = new Set<CampaignSyncFrameHandler>();
  const errorListeners = new Set<(error: unknown) => void>();
  const confirmations = new Set<(ack: ICampaignApplicationAck) => void>();
  const pending: { frame: ICampaignApplicationOffer; applied: boolean }[] = [];
  let latest: ICampaignApplicationOffer | null = null;
  let sent: ICampaignApplicationOffer | null = null;
  // The exact bytes of `sent`'s ACK, and whether the server confirmed it.
  let sentAck = '';
  let confirmed = false;
  // Both belong to `sent` alone: a new ACK resets them, nothing else does.
  let driftResends = 0;
  let confirmationTimer: ReturnType<typeof setTimeout> | null = null;
  const stopConfirmationWait = (): void => {
    if (confirmationTimer !== null) clearTimeout(confirmationTimer);
    confirmationTimer = null;
  };
  let failed = false;
  let dispatching = false;
  let receiptMode = false;
  let awaitingBaseline = false;
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
  const recover = (
    reason: Extract<
      CampaignAppliedResult,
      { status: 'recovery-required' }
    >['reason'],
  ): CampaignAppliedResult => {
    failed = true;
    pending.length = 0;
    sent = null;
    stopConfirmationWait();
    emitError(new Error(`Campaign application recovery required: ${reason}`));
    return { status: 'recovery-required', reason };
  };
  const drain = (): CampaignAppliedResult => {
    if (dispatching) return { status: 'prefix-pending' };
    while (pending[0]?.applied) pending.shift();
    if (pending.length || !latest) return { status: 'prefix-pending' };
    if (latest === sent) return { status: 'already-completed' };
    if (closed || socket.readyState !== 1) return recover('send-failed');
    const ack = CampaignApplicationClientMessageSchema.parse({
      kind: 'CampaignAck',
      matchId: options.matchId,
      ts: nowIso(),
      playerId: options.playerId,
      campaignId: options.expectedCampaignId,
      appliedView: latest.appliedView,
    });
    const raw = JSON.stringify(ack);
    try {
      socket.send(raw);
    } catch {
      return recover('send-failed');
    }
    sent = latest;
    sentAck = raw;
    confirmed = false;
    driftResends = 0;
    stopConfirmationWait();
    const waiting = sent;
    // A lost confirmation or refusal must not leave the view waiting forever.
    confirmationTimer = setTimeout(() => {
      confirmationTimer = null;
      if (
        !closed &&
        !failed &&
        !confirmed &&
        sent === waiting &&
        latest === sent
      )
        recover('confirmation-timeout');
    }, APPLICATION_CONFIRMATION_TIMEOUT_MS);
    return { status: 'ack-sent' };
  };
  // P2CE3: head-drift committed nothing and leaves the view live, so the
  // same ACK is retried, a bounded number of times, while it is still the
  // latest and unconfirmed. A newer offer is ACKed by drain once ready. An
  // unknown receipt is moot once a newer offer arrived after the refused
  // ACK (CF7 a). Every other typed refusal must not be retried with the
  // same frame: the consumer rejoins.
  const handleApplicationRefusal = (reason: string): void => {
    if (
      reason === 'campaign-application-unknown-receipt' &&
      sent !== null &&
      latest !== sent
    )
      return;
    if (reason !== 'campaign-application-head-drift') {
      recover('application-refused');
    } else if (sent && sent === latest && !confirmed) {
      if (driftResends >= MAX_HEAD_DRIFT_RESENDS) {
        recover('head-drift-exhausted');
        return;
      }
      driftResends += 1;
      try {
        socket.send(sentAck);
      } catch {
        recover('send-failed');
      }
    }
  };
  const registerOffer = (frame: ICampaignApplicationOffer): boolean => {
    if (failed || closed) return false;
    if (
      !options.expectedCampaignId ||
      frame.matchId !== options.matchId ||
      frame.event.campaignId !== options.expectedCampaignId ||
      !isCampaignWireEvent(frame.event)
    ) {
      recover('prefix-conflict');
      return false;
    }
    const view = frame.appliedView;
    const duplicate =
      pending.find(
        (entry) => entry.frame.appliedView.receiptId === view.receiptId,
      )?.frame ??
      (latest?.appliedView.receiptId === view.receiptId ? latest : null);
    if (duplicate) {
      if (JSON.stringify(duplicate) !== JSON.stringify(frame))
        recover('prefix-conflict');
      return false;
    }
    if (view.previousReceiptId === null) {
      if (
        !awaitingBaseline ||
        latest ||
        frame.kind !== 'CampaignSnapshot' ||
        frame.event.type !== 'CampaignSnapshotPublished' ||
        frame.event.sequence !== -1 ||
        !frame.hydrationFacts
      ) {
        recover('prefix-conflict');
        return false;
      }
      awaitingBaseline = false;
    } else if (
      !latest ||
      view.viewId !== latest.appliedView.viewId ||
      view.previousReceiptId !== latest.appliedView.receiptId
    ) {
      recover('prefix-conflict');
      return false;
    }
    if (pending.length === MAX_PENDING_APPLICATION_OFFERS) {
      recover('pending-overflow');
      return false;
    }
    freezeApplicationFrame(frame);
    latest = frame;
    pending.push({ frame, applied: false });
    return true;
  };
  const sendEnvelope = (message: ICampaignClientMessage): boolean => {
    if (closed) return false;
    const parsed = ClientMessageSchema.safeParse(message);
    if (!parsed.success) {
      emitError(new Error('Campaign sync frame failed local validation'));
      return false;
    }
    if (socket.readyState !== 1) {
      pendingOutbound.push(parsed.data as ICampaignClientMessage);
      return false;
    }
    sendParsedEnvelope(parsed.data as ICampaignClientMessage);
    return true;
  };
  const sendParsedEnvelope = (message: ICampaignClientMessage): void => {
    socket.send(JSON.stringify(message));
  };

  const transport: ICampaignSyncTransport = {
    matchId: options.matchId,
    playerId: options.playerId,
    role: options.role,
    campaignId: options.expectedCampaignId,
    confirmApplied: (offer, outcome) => {
      if (closed) return { status: 'refused', reason: 'closed' };
      if (!options.expectedCampaignId)
        return { status: 'refused', reason: 'unbound' };
      if (failed) return { status: 'refused', reason: 'stale-offer' };
      if (offer === sent) return { status: 'already-completed' };
      const entry = pending.find((item) => item.frame === offer);
      if (!entry) return { status: 'refused', reason: 'unknown-offer' };
      if (outcome.status !== 'applied') return recover('application-failed');
      entry.applied = true;
      return drain();
    },
    onAppliedViewConfirmed: (handler) => {
      confirmations.add(handler);
      return () => {
        confirmations.delete(handler);
      };
    },
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
      intent: CampaignHostCommand | ICampaignReconcileBattleIntent,
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
      pending.length = 0;
      sent = null;
      stopHeartbeat();
      stopConfirmationWait();
      releaseActiveTransport(transport);
      socket.close();
    },
    lastSeq: () => lastSeq,
  };

  socket.onopen = () => {
    if (closed || failed) return;
    startHeartbeat();
    awaitingBaseline = sendEnvelope({
      kind: 'CampaignJoin',
      matchId: options.matchId,
      ts: nowIso(),
      playerId: options.playerId,
      role: options.role,
      token: wireToken,
      roomCode: options.roomCode,
      // Quoted bound or not; in receipt mode the server derives the cut.
      ...(lastSeq >= 0 ? { lastSeq } : {}),
    });
    while (pendingOutbound.length > 0 && socket.readyState === 1) {
      const next = pendingOutbound.shift();
      if (next) sendParsedEnvelope(next);
    }
  };
  socket.onmessage = (ev) => {
    if (closed) return;
    const parsed = parseServerMessage(ev.data);
    if (parsed.receiptIntent) receiptMode = true;
    const message = parsed.message;
    if (!message) {
      if (parsed.offerIntent) recover('prefix-conflict');
      return;
    }
    if (message.kind === 'CampaignAck') {
      if (
        !failed &&
        sent === latest &&
        sent &&
        message.matchId === options.matchId &&
        message.playerId === options.playerId &&
        message.campaignId === options.expectedCampaignId &&
        JSON.stringify(message.appliedView) === JSON.stringify(sent.appliedView)
      ) {
        confirmed = true;
        stopConfirmationWait();
        confirmations.forEach((handler) => handler(message));
      }
      return;
    }
    const offered =
      (message.kind === 'CampaignSnapshot' ||
        message.kind === 'CampaignEvent') &&
      message.appliedView;
    if (offered && !registerOffer(message as ICampaignApplicationOffer)) return;
    if (
      receiptMode &&
      options.expectedCampaignId &&
      !failed &&
      message.kind === 'Error' &&
      message.code === 'INVALID_INTENT' &&
      message.reason?.startsWith('campaign-application-')
    ) {
      handleApplicationRefusal(message.reason);
    }
    updateLastSeq(message, (sequence) => {
      lastSeq = Math.max(lastSeq, sequence);
    });
    dispatching = true;
    try {
      listeners.forEach((handler) => handler(message));
    } catch (error) {
      if (receiptMode) {
        recover('application-failed');
        emitError(error);
        return;
      }
      throw error;
    } finally {
      dispatching = false;
    }
    if ((offered || receiptMode) && !failed && !closed) drain();
    if (
      !receiptMode &&
      message.kind === 'CampaignEvent' &&
      isCampaignWireEvent(message.event)
    ) {
      // Temporary legacy observation, never durable application proof.
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
    // CF12: a receipt-mode close nobody asked for is a recovery signal, once.
    if (!closed && !failed && receiptMode && options.expectedCampaignId)
      recover('socket-closed');
    closed = true;
    pending.length = 0;
    sent = null;
    stopHeartbeat();
    stopConfirmationWait();
    releaseActiveTransport(transport);
  };

  setActiveTransport(options.matchId, transport);
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
  if (existing)
    return options.expectedCampaignId !== undefined &&
      existing.campaignId !== options.expectedCampaignId
      ? null
      : existing;
  const token = readCoopCampaignToken(options.matchId);
  if (!token) return null;
  return connectCampaignSyncTransport({
    expectedCampaignId: options.expectedCampaignId,
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
  setActiveTransport(transport.matchId, transport);
  return () => releaseActiveTransport(transport);
}

/**
 * G2-RESEAT-1: notifies after the active transport for `matchId` changes
 * identity. An invalidation signal only, never seat or receipt authority:
 * re-read the getter on every use.
 */
export function subscribeActiveCampaignSyncTransport(
  matchId: string,
  onChange: () => void,
): () => void {
  const observers = activeObservers.get(matchId) ?? new Set<() => void>();
  activeObservers.set(matchId, observers);
  const observer = (): void => onChange();
  observers.add(observer);
  return () => {
    observers.delete(observer);
  };
}

function setActiveTransport(
  matchId: string,
  next: ICampaignSyncTransport | null,
): void {
  if ((activeTransports.get(matchId) ?? null) === next) return;
  if (next) activeTransports.set(matchId, next);
  else activeTransports.delete(matchId);
  [...(activeObservers.get(matchId) ?? [])].forEach((observer) => {
    try {
      observer();
    } catch (error) {
      logger.warn('Campaign transport observer failed', error);
    }
  });
}

/** Only the active object itself may clear its slot (late A never drops B). */
function releaseActiveTransport(transport: ICampaignSyncTransport): void {
  if (activeTransports.get(transport.matchId) === transport)
    setActiveTransport(transport.matchId, null);
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

function freezeApplicationFrame(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  Object.values(value).forEach(freezeApplicationFrame);
  Object.freeze(value);
}

function parseServerMessage(data: unknown): {
  message: IServerMessage | ICampaignApplicationAck | null;
  receiptIntent: boolean;
  offerIntent: boolean;
} {
  const raw = typeof data === 'string' ? data : String(data);
  try {
    const body: unknown = JSON.parse(raw);
    const receiptIntent =
      typeof body === 'object' && body !== null && 'appliedView' in body;
    const offerIntent =
      receiptIntent &&
      'kind' in body &&
      (body.kind === 'CampaignSnapshot' || body.kind === 'CampaignEvent');
    const parsed = CampaignApplicationServerMessageSchema.safeParse(body);
    return {
      message: parsed.success ? parsed.data : null,
      receiptIntent,
      offerIntent,
    };
  } catch {
    return { message: null, receiptIntent: false, offerIntent: false };
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
  activeObservers.clear();
}
