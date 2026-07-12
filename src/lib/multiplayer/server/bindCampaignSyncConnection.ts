import type {
  ICampaignClientMessage,
  IClientMessage,
  IErrorCode,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import { reconcileCoopBattle } from '@/lib/campaign/coop/reconcileCoopBattle';
import {
  assertKnownCampaignSyncFrameKind,
  ClientMessageSchema,
  isCampaignClientMessage,
  nowIso,
} from '@/types/multiplayer/Protocol';

import type {
  CampaignHostRegistry,
  ICampaignHostRegistryEntry,
  ICampaignParticipationRecord,
} from './CampaignHostRegistry';
import type { IMatchSocket } from './ServerMatchSocketTypes';

import { getCampaignHostRegistry } from './CampaignHostRegistry';

export interface IWireCampaignSocket extends IMatchSocket {
  on(event: 'message', listener: (data: unknown) => void): this;
  on(event: 'close' | 'error', listener: () => void): this;
}

export interface ICampaignHostRegistryLike {
  get(matchId: string | undefined): ICampaignHostRegistryEntry | null;
  getOrCreate?(
    matchId: string | undefined,
  ): Promise<ICampaignHostRegistryEntry | null>;
}

export interface IBindCampaignSyncConnectionDeps {
  socket: IWireCampaignSocket;
  matchId: string;
  verifiedPlayerId: string;
  registry?:
    | Pick<CampaignHostRegistry, 'get' | 'getOrCreate'>
    | ICampaignHostRegistryLike;
  logger?: Pick<Console, 'error' | 'warn' | 'log'>;
}

export interface IBoundCampaignSyncConnection {
  entry: ICampaignHostRegistryEntry;
}

const socketsByMatch = new Map<string, Set<IWireCampaignSocket>>();

export async function bindCampaignSyncConnection({
  socket,
  matchId,
  verifiedPlayerId,
  registry = getCampaignHostRegistry(),
  logger = console,
}: IBindCampaignSyncConnectionDeps): Promise<IBoundCampaignSyncConnection | null> {
  const entry = registry.getOrCreate
    ? await registry.getOrCreate(matchId)
    : registry.get(matchId);
  if (!entry) {
    closeWithTypedError({
      socket,
      matchId,
      code: 'UNKNOWN_MATCH',
      reason: 'unknown-campaign-match',
      cleanup: () => undefined,
    });
    return null;
  }

  const cleanupFns = new Set<() => void>();
  let cleanedUp = false;
  const cleanup = (): void => {
    if (cleanedUp) return;
    cleanedUp = true;
    cleanupFns.forEach((fn) => fn());
    cleanupFns.clear();
    const sockets = socketsByMatch.get(matchId);
    sockets?.delete(socket);
    if (sockets?.size === 0) socketsByMatch.delete(matchId);
  };

  socket.on('message', (data) => {
    void handleInbound({
      data,
      socket,
      entry,
      matchId,
      verifiedPlayerId,
      cleanup,
      cleanupFns,
      logger,
    });
  });
  socket.on('close', cleanup);
  socket.on('error', cleanup);

  return { entry };
}

interface IHandleInboundDeps {
  data: unknown;
  socket: IWireCampaignSocket;
  entry: ICampaignHostRegistryEntry;
  matchId: string;
  verifiedPlayerId: string;
  cleanup: () => void;
  cleanupFns: Set<() => void>;
  logger: Pick<Console, 'error' | 'warn' | 'log'>;
}

async function handleInbound({
  data,
  socket,
  entry,
  matchId,
  verifiedPlayerId,
  cleanup,
  cleanupFns,
  logger,
}: IHandleInboundDeps): Promise<void> {
  const parsedJson = parseJsonPayload(data);
  if (!parsedJson.ok) {
    logger.warn(
      `[campaign-sync] bad envelope matchId=${matchId} reason=${parsedJson.reason}`,
    );
    send(socket, errorFrame(matchId, 'BAD_ENVELOPE', parsedJson.reason));
    return;
  }

  try {
    const kind = readKind(parsedJson.value);
    if (typeof kind === 'string' && kind.startsWith('Campaign')) {
      assertKnownCampaignSyncFrameKind(kind);
    }
  } catch (error) {
    logger.warn(`[campaign-sync] unknown frame kind matchId=${matchId}`);
    send(
      socket,
      errorFrame(
        matchId,
        'BAD_ENVELOPE',
        error instanceof Error ? error.message : 'unknown-campaign-kind',
      ),
    );
    return;
  }

  const parsedEnvelope = ClientMessageSchema.safeParse(parsedJson.value);
  if (!parsedEnvelope.success) {
    logger.warn(`[campaign-sync] malformed envelope matchId=${matchId}`);
    send(socket, errorFrame(matchId, 'BAD_ENVELOPE', 'malformed-envelope'));
    return;
  }

  const envelope: IClientMessage = parsedEnvelope.data;
  if (!isCampaignClientMessage(envelope)) {
    send(socket, errorFrame(matchId, 'BAD_ENVELOPE', 'not-campaign-sync'));
    return;
  }
  if (envelope.matchId !== matchId) {
    closeWithTypedError({
      socket,
      matchId,
      cleanup,
      code: 'UNKNOWN_MATCH',
      reason: 'wrong-match',
    });
    return;
  }
  if (envelope.playerId !== verifiedPlayerId) {
    closeWithTypedError({
      socket,
      matchId,
      cleanup,
      code: 'AUTH_REJECTED',
      reason: 'player-mismatch',
    });
    return;
  }

  try {
    await dispatchCampaignEnvelope({
      envelope,
      socket,
      entry,
      matchId,
      cleanupFns,
    });
  } catch (error) {
    logger.error('[campaign-sync] dispatch failed', error);
    closeWithTypedError({
      socket,
      matchId,
      cleanup,
      code: 'INTERNAL_ERROR',
      reason: 'dispatch-failed',
    });
  }
}

interface IDispatchCampaignEnvelopeDeps {
  envelope: ICampaignClientMessage;
  socket: IWireCampaignSocket;
  entry: ICampaignHostRegistryEntry;
  matchId: string;
  cleanupFns: Set<() => void>;
}

async function dispatchCampaignEnvelope({
  envelope,
  socket,
  entry,
  matchId,
  cleanupFns,
}: IDispatchCampaignEnvelopeDeps): Promise<void> {
  switch (envelope.kind) {
    case 'CampaignJoin':
      await handleCampaignJoin({
        envelope,
        socket,
        entry,
        matchId,
        cleanupFns,
      });
      return;
    case 'CampaignProposal':
      await handleCampaignProposal({ envelope, socket, entry, matchId });
      return;
    case 'CampaignDecision':
      await handleCampaignDecision({ envelope, socket, entry, matchId });
      return;
    case 'CampaignHostIntent':
      await handleCampaignHostIntent({ envelope, socket, entry, matchId });
      return;
    case 'CampaignParticipation':
      handleCampaignParticipation({ envelope, socket, entry, matchId });
      return;
  }
}

async function handleCampaignHostIntent({
  envelope,
  socket,
  entry,
  matchId,
}: {
  envelope: Extract<ICampaignClientMessage, { kind: 'CampaignHostIntent' }>;
  socket: IWireCampaignSocket;
  entry: ICampaignHostRegistryEntry;
  matchId: string;
}): Promise<void> {
  if (envelope.playerId !== entry.hostPlayerId) {
    send(
      socket,
      errorFrame(
        matchId,
        'AUTH_REJECTED',
        'campaign-host-intent-requires-host',
        envelope.intent.intentId,
      ),
    );
    return;
  }

  if (envelope.intent.kind === 'ReconcileBattle') {
    const battleMatchId = envelope.intent.payload.matchId;
    if (entry.hasReconciledBattle(battleMatchId)) {
      return;
    }

    const result = await reconcileCoopBattle(
      entry.host,
      envelope.intent.payload,
    );
    entry.recordReconciledBattle(battleMatchId);
    if (!result.ok) {
      send(
        socket,
        errorFrame(
          matchId,
          'INVALID_INTENT',
          result.error ?? 'battle-reconciliation-failed',
          envelope.intent.intentId,
        ),
      );
    }
    return;
  }

  const result = await entry.host.applyHostIntent(envelope.intent);
  if (!result.ok) {
    send(
      socket,
      errorFrame(
        matchId,
        'INVALID_INTENT',
        result.reason,
        envelope.intent.intentId,
      ),
    );
  }
}

async function handleCampaignJoin({
  envelope,
  socket,
  entry,
  matchId,
  cleanupFns,
}: {
  envelope: Extract<ICampaignClientMessage, { kind: 'CampaignJoin' }>;
  socket: IWireCampaignSocket;
  entry: ICampaignHostRegistryEntry;
  matchId: string;
  cleanupFns: Set<() => void>;
}): Promise<void> {
  addSocketToMatch(matchId, socket);

  if (envelope.role === 'host') {
    const eventUnsubscribe = entry.host.subscribe((event) => {
      sendCampaignEvent(socket, matchId, event);
    });
    cleanupFns.add(eventUnsubscribe);
    send(socket, {
      kind: 'CampaignSnapshot',
      matchId,
      ts: nowIso(),
      event: {
        type: 'CampaignSnapshotPublished',
        sequence: -1,
        campaignId: entry.campaignId,
        ts: nowIso(),
        authorPlayerId: entry.hostPlayerId,
        payload: entry.host.buildSnapshotPayload(),
      },
    });
    sendPendingProposals(socket, matchId, entry.arbiter.getPendingProposals());
    const pendingUnsubscribe = entry.arbiter.subscribePending((pending) => {
      sendPendingProposals(socket, matchId, pending);
    });
    cleanupFns.add(pendingUnsubscribe);
    return;
  }

  const join = await entry.syncSession.joinGuest(
    envelope.roomCode ?? entry.roomCode,
    (event) => {
      sendCampaignEvent(socket, matchId, event);
    },
  );
  if (!join.ok) {
    send(socket, errorFrame(matchId, 'UNKNOWN_MATCH', 'unknown-room-code'));
    return;
  }
  cleanupFns.add(join.disconnect);
}

async function handleCampaignProposal({
  envelope,
  socket,
  entry,
  matchId,
}: {
  envelope: Extract<ICampaignClientMessage, { kind: 'CampaignProposal' }>;
  socket: IWireCampaignSocket;
  entry: ICampaignHostRegistryEntry;
  matchId: string;
}): Promise<void> {
  const result = await entry.arbiter.submitProposal(envelope.proposal);
  send(socket, {
    kind: 'CampaignDecision',
    matchId,
    ts: nowIso(),
    proposalId: result.proposalId,
    result,
  });
  if (result.status !== 'pending') {
    broadcast(matchId, {
      kind: 'CampaignDecision',
      matchId,
      ts: nowIso(),
      proposalId: result.proposalId,
      result,
    });
  }
}

async function handleCampaignDecision({
  envelope,
  socket,
  entry,
  matchId,
}: {
  envelope: Extract<ICampaignClientMessage, { kind: 'CampaignDecision' }>;
  socket: IWireCampaignSocket;
  entry: ICampaignHostRegistryEntry;
  matchId: string;
}): Promise<void> {
  void socket;
  const result = await entry.arbiter.decide(
    envelope.proposalId,
    envelope.decision,
  );
  if (!result) {
    send(socket, errorFrame(matchId, 'BAD_ENVELOPE', 'unknown-proposal'));
    return;
  }
  broadcast(matchId, {
    kind: 'CampaignDecision',
    matchId,
    ts: nowIso(),
    proposalId: result.proposalId,
    result,
  });
}

function handleCampaignParticipation({
  envelope,
  socket,
  entry,
  matchId,
}: {
  envelope: Extract<ICampaignClientMessage, { kind: 'CampaignParticipation' }>;
  socket: IWireCampaignSocket;
  entry: ICampaignHostRegistryEntry;
  matchId: string;
}): void {
  void socket;
  const record = envelope.participation as ICampaignParticipationRecord;
  entry.publishParticipation(record);
  broadcast(matchId, {
    kind: 'CampaignParticipation',
    matchId,
    ts: nowIso(),
    participation: record,
  });
}

function sendCampaignEvent(
  socket: IMatchSocket,
  matchId: string,
  event: unknown,
): void {
  const type =
    typeof event === 'object' && event !== null && 'type' in event
      ? (event as { type?: unknown }).type
      : null;
  send(socket, {
    kind:
      type === 'CampaignSnapshotPublished'
        ? 'CampaignSnapshot'
        : 'CampaignEvent',
    matchId,
    ts: nowIso(),
    event,
  });
}

function sendPendingProposals(
  socket: IMatchSocket,
  matchId: string,
  pending: readonly unknown[],
): void {
  for (const proposal of pending) {
    send(socket, {
      kind: 'CampaignProposal',
      matchId,
      ts: nowIso(),
      proposal,
    });
  }
}

function addSocketToMatch(matchId: string, socket: IWireCampaignSocket): void {
  let sockets = socketsByMatch.get(matchId);
  if (!sockets) {
    sockets = new Set();
    socketsByMatch.set(matchId, sockets);
  }
  sockets.add(socket);
}

function broadcast(matchId: string, message: IServerMessage): void {
  const sockets = socketsByMatch.get(matchId);
  if (!sockets) return;
  sockets.forEach((socket) => send(socket, message));
}

function parseJsonPayload(
  data: unknown,
): { ok: true; value: unknown } | { ok: false; reason: string } {
  const text = payloadToString(data);
  if (text == null) {
    return { ok: false, reason: 'unsupported-payload' };
  }
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, reason: 'malformed-json' };
  }
}

function payloadToString(data: unknown): string | null {
  if (typeof data === 'string') return data;
  if (data instanceof Buffer) return data.toString('utf8');
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  if (Array.isArray(data) && data.every((item) => item instanceof Buffer)) {
    return Buffer.concat(data).toString('utf8');
  }
  return null;
}

function readKind(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || !('kind' in value)) {
    return null;
  }
  return (value as { kind?: unknown }).kind;
}

function closeWithTypedError({
  socket,
  matchId,
  cleanup,
  code,
  reason,
}: {
  socket: IWireCampaignSocket;
  matchId: string;
  cleanup: () => void;
  code: IErrorCode;
  reason: string;
}): void {
  send(socket, errorFrame(matchId, code, reason));
  send(socket, closeFrame(matchId, code, reason));
  socket.close(1008, reason);
  cleanup();
}

function errorFrame(
  matchId: string,
  code: IErrorCode,
  reason: string,
  intentId?: string,
): Extract<IServerMessage, { kind: 'Error' }> {
  return {
    kind: 'Error',
    matchId,
    ts: nowIso(),
    code,
    reason,
    ...(intentId ? { intentId } : {}),
  };
}

function closeFrame(
  matchId: string,
  code: IErrorCode,
  reason: string,
): Extract<IServerMessage, { kind: 'Close' }> {
  return {
    kind: 'Close',
    matchId,
    ts: nowIso(),
    code,
    reason,
  };
}

function send(socket: IMatchSocket, message: IServerMessage): void {
  if (socket.readyState !== 1) return;
  socket.send(JSON.stringify(message));
}
