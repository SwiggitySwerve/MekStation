import type { ICampaignGrantLiveSource } from '@/lib/campaign/delivery/campaignGrantChannelSession';
import type { ICampaignGrantSigner } from '@/lib/campaign/grants/ICampaignGrantStore';
import type { SQLiteCampaignReplicaStore } from '@/lib/campaign/replica/SQLiteCampaignReplicaStore';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';
import type {
  ICampaignClientMessage,
  IClientMessage,
  IErrorCode,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import { reconcileCoopBattle } from '@/lib/campaign/coop/reconcileCoopBattle';
import { freezeCampaignEvent } from '@/lib/campaign/sync/campaignEventScope';
import {
  assertKnownCampaignSyncFrameKind,
  ClientMessageSchema,
  isCampaignClientMessage,
  nowIso,
} from '@/types/multiplayer/Protocol';

import type {
  CampaignHostRegistry,
  ICampaignHostRegistryEntry,
} from './CampaignHostRegistry';
import type { IMatchSocket } from './ServerMatchSocketTypes';

import {
  admitBoundCampaignParticipation,
  captureCampaignConnectionBaseline,
} from './authorizeCampaignParticipation';
import {
  createCampaignGrantChannelDepsFromSqlite,
  createCampaignReplicaStoreFromSqlite,
} from './campaignGrantChannelDeps';
import { getCampaignHostRegistry } from './CampaignHostRegistry';
import {
  handleCampaignGrantAck,
  type IBoundGrantSession,
} from './handleCampaignGrantAck';
import {
  handleCampaignGrantJoin,
  type ICampaignGrantChannelDeps,
} from './handleCampaignGrantJoin';
import { handleRoomCodeGuestJoin } from './handleRoomCodeGuestJoin';

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
  /**
   * Grant-channel projection/auth deps. Omitted sockets still accept
   * room-code CampaignJoin. A CampaignGrantJoin without a working
   * store closes as infrastructure, not as an auth refusal.
   */
  grantChannel?: ICampaignGrantChannelDeps | null;
  /**
   * Live wakeup for grant sockets. Defaults to the campaign host's
   * post-append subscriber set so fan-out cannot precede durable write.
   */
  grantLiveSource?: ICampaignGrantLiveSource;
  /**
   * Durable replica for the room-code guest path. Omitted sockets try
   * the process database; explicit null keeps joinGuest (unit tests
   * that are not proving grant/replica plumbing).
   */
  replicaStore?: SQLiteCampaignReplicaStore | null;
  /**
   * Issuer pinned on auto-issued room-code grants. Omitted joins mint
   * a process-local keypair once.
   */
  roomCodeGrantIssuer?: ICampaignGrantSigner;
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
  grantChannel,
  grantLiveSource,
  replicaStore,
  roomCodeGrantIssuer,
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
  /**
   * Grants THIS socket authenticated, keyed by grantId. Per-socket on
   * purpose: an acknowledgement may only move a cursor the connection
   * proved a token for, so one authenticated client cannot advance
   * another participant's place in the stream by naming their grant.
   */
  const boundGrants = new Map<string, IBoundGrantSession>();
  let cleanedUp = false;
  const cleanup = (): void => {
    if (cleanedUp) return;
    cleanedUp = true;
    cleanupFns.forEach((fn) => fn());
    cleanupFns.clear();
    boundGrants.clear();
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
      boundGrants,
      logger,
      grantChannel,
      grantLiveSource,
      replicaStore,
      roomCodeGrantIssuer,
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
  boundGrants: Map<string, IBoundGrantSession>;
  logger: Pick<Console, 'error' | 'warn' | 'log'>;
  grantChannel?: ICampaignGrantChannelDeps | null;
  grantLiveSource?: ICampaignGrantLiveSource;
  replicaStore?: SQLiteCampaignReplicaStore | null;
  roomCodeGrantIssuer?: ICampaignGrantSigner;
}

async function handleInbound({
  data,
  socket,
  entry,
  matchId,
  verifiedPlayerId,
  cleanup,
  cleanupFns,
  boundGrants,
  logger,
  grantChannel,
  grantLiveSource,
  replicaStore,
  roomCodeGrantIssuer,
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
      verifiedPlayerId,
      cleanup,
      cleanupFns,
      boundGrants,
      logger,
      grantChannel,
      grantLiveSource,
      replicaStore,
      roomCodeGrantIssuer,
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
  verifiedPlayerId: string;
  cleanup: () => void;
  cleanupFns: Set<() => void>;
  boundGrants: Map<string, IBoundGrantSession>;
  logger: Pick<Console, 'error' | 'warn' | 'log'>;
  grantChannel?: ICampaignGrantChannelDeps | null;
  grantLiveSource?: ICampaignGrantLiveSource;
  replicaStore?: SQLiteCampaignReplicaStore | null;
  roomCodeGrantIssuer?: ICampaignGrantSigner;
}

async function dispatchCampaignEnvelope({
  envelope,
  socket,
  entry,
  matchId,
  verifiedPlayerId,
  cleanup,
  cleanupFns,
  boundGrants,
  logger,
  grantChannel,
  grantLiveSource,
  replicaStore,
  roomCodeGrantIssuer,
}: IDispatchCampaignEnvelopeDeps): Promise<void> {
  switch (envelope.kind) {
    case 'CampaignJoin':
      await handleCampaignJoin({
        envelope,
        socket,
        entry,
        matchId,
        verifiedPlayerId,
        cleanup,
        cleanupFns,
        grantChannel,
        grantLiveSource,
        replicaStore,
        roomCodeGrantIssuer,
      });
      return;
    case 'CampaignGrantJoin':
      await handleCampaignGrantJoin({
        envelope,
        entry,
        matchId,
        verifiedPlayerId,
        cleanupFns,
        grantChannel: resolveGrantChannel(grantChannel),
        liveSource: grantLiveSource ?? hostAppendLiveSource(entry),
        send: (message) => send(socket, message),
        closeTyped: (code, reason) =>
          closeWithTypedError({
            socket,
            matchId,
            cleanup,
            code,
            reason,
          }),
        onBound: (grantId, session) => boundGrants.set(grantId, session),
      });
      return;
    case 'CampaignGrantAck': {
      const channel = resolveGrantChannel(grantChannel);
      const database = channel?.database;
      if (database === undefined) return;
      // Deliberately no reply frame and no close on refusal: a rejected
      // cursor claim is a bookkeeping disagreement, and dropping the
      // socket over one would turn it into a reconnect storm.
      await handleCampaignGrantAck({
        envelope,
        boundGrants,
        projectDeps: channel?.projectDeps,
        database,
        nowIso: () => channel?.nowIso() ?? nowIso(),
        logger,
      });
      return;
    }
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
      handleCampaignParticipation({
        envelope,
        socket,
        entry,
        matchId,
        verifiedPlayerId,
      });
      return;
    default: {
      const exhaustive: never = envelope;
      void exhaustive;
    }
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
  verifiedPlayerId,
  cleanup,
  cleanupFns,
  grantChannel,
  grantLiveSource,
  replicaStore,
  roomCodeGrantIssuer,
}: {
  envelope: Extract<ICampaignClientMessage, { kind: 'CampaignJoin' }>;
  socket: IWireCampaignSocket;
  entry: ICampaignHostRegistryEntry;
  matchId: string;
  verifiedPlayerId: string;
  cleanup: () => void;
  cleanupFns: Set<() => void>;
  grantChannel?: ICampaignGrantChannelDeps | null;
  grantLiveSource?: ICampaignGrantLiveSource;
  replicaStore?: SQLiteCampaignReplicaStore | null;
  roomCodeGrantIssuer?: ICampaignGrantSigner;
}): Promise<void> {
  addSocketToMatch(matchId, socket);
  const role: 'host' | 'guest' =
    verifiedPlayerId === entry.hostPlayerId ? 'host' : 'guest';
  const acknowledge = (): void => {
    captureCampaignConnectionBaseline(socket, {
      playerId: verifiedPlayerId,
      role,
      revision: entry.revision,
    });
  };

  if (role === 'host') {
    const eventUnsubscribe = entry.host.subscribe((event) => {
      sendCampaignEvent(socket, matchId, event);
    });
    cleanupFns.add(eventUnsubscribe);
    send(socket, {
      kind: 'CampaignSnapshot',
      matchId,
      ts: nowIso(),
      event: freezeCampaignEvent({
        type: 'CampaignSnapshotPublished',
        sequence: -1,
        campaignId: entry.campaignId,
        ts: nowIso(),
        authorPlayerId: entry.hostPlayerId,
        // Host-join snapshot is the shared ledger projection.
        scope: 'campaign',
        payload: entry.host.buildSnapshotPayload(),
      }),
    });
    sendPendingProposals(socket, matchId, entry.arbiter.getPendingProposals());
    const pendingUnsubscribe = entry.arbiter.subscribePending((pending) => {
      sendPendingProposals(socket, matchId, pending);
    });
    cleanupFns.add(pendingUnsubscribe);
    acknowledge();
    return;
  }

  const resolvedChannel = resolveGrantChannel(grantChannel);
  const resolvedReplica = resolveReplicaStore(replicaStore, resolvedChannel);
  const guestOutcome = await handleRoomCodeGuestJoin({
    envelope,
    entry,
    matchId,
    verifiedPlayerId,
    cleanupFns,
    grantChannel: resolvedChannel,
    replicaStore: resolvedReplica,
    liveSource: grantLiveSource ?? hostAppendLiveSource(entry),
    send: (message) => send(socket, message),
    closeTyped: (code, reason) =>
      closeWithTypedError({
        socket,
        matchId,
        cleanup,
        code,
        reason,
      }),
    issuer: roomCodeGrantIssuer,
  });
  if (guestOutcome === 'rejected') {
    return;
  }
  if (guestOutcome === 'served') {
    acknowledge();
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
  acknowledge();
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
  verifiedPlayerId,
}: {
  envelope: Extract<ICampaignClientMessage, { kind: 'CampaignParticipation' }>;
  socket: IWireCampaignSocket;
  entry: ICampaignHostRegistryEntry;
  matchId: string;
  verifiedPlayerId: string;
}): void {
  const admitted = admitBoundCampaignParticipation({
    socket,
    entry,
    verifiedPlayerId,
    payload: envelope.participation,
  });
  if (!admitted.ok) {
    send(socket, errorFrame(matchId, admitted.code, admitted.reason));
    return;
  }
  const acceptance = {
    kind: 'CampaignParticipation' as const,
    matchId,
    ts: nowIso(),
    playerId: admitted.record.playerId,
    role: admitted.record.role,
    participation: {
      missionId: admitted.record.missionId,
      forceId: admitted.record.force.id,
      choice: admitted.record.choice,
    },
  };
  if (admitted.idempotent) {
    send(socket, acceptance);
    return;
  }
  entry.publishParticipation(admitted.record);
  broadcast(matchId, acceptance);
}

function sendCampaignEvent(
  socket: IMatchSocket,
  matchId: string,
  event: ICampaignEvent,
): void {
  send(socket, {
    kind:
      event.type === 'CampaignSnapshotPublished'
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

/**
 * Uses an injected grant channel when present, including explicit null
 * (tests that want store-unavailable without touching process SQLite).
 * Omitted deps try the process database and map failure to null.
 */
function resolveGrantChannel(
  injected: ICampaignGrantChannelDeps | null | undefined,
): ICampaignGrantChannelDeps | null {
  if (injected !== undefined) return injected;
  try {
    return createCampaignGrantChannelDepsFromSqlite({
      clock: nowIso,
      nowMs: () => Date.parse(nowIso()),
      nowIso,
    });
  } catch {
    return null;
  }
}

/**
 * Uses an injected replica when present, including explicit null.
 * Omitted deps try the process database beside the grant channel clock.
 */
function resolveReplicaStore(
  injected: SQLiteCampaignReplicaStore | null | undefined,
  grantChannel: ICampaignGrantChannelDeps | null,
): SQLiteCampaignReplicaStore | null {
  if (injected !== undefined) return injected;
  if (grantChannel == null) return null;
  try {
    return createCampaignReplicaStoreFromSqlite(grantChannel.nowIso);
  } catch {
    return null;
  }
}

/**
 * Wakeups fire only from CampaignMatchHost subscribers, which run after
 * durable append. The host event itself is discarded so sequence
 * assignment stays inside projectCampaignStreamForGrant.
 */
function hostAppendLiveSource(
  entry: ICampaignHostRegistryEntry,
): ICampaignGrantLiveSource {
  return {
    subscribe: (listener) =>
      entry.host.subscribe(() => {
        listener();
      }),
  };
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
  try {
    socket.send(JSON.stringify(message));
  } catch {
    // A downstream socket is allowed to fail; the SOURCE is not allowed
    // to fail with it. A real socket throws from send when it is closing
    // or already closed, and this helper is called from the close path
    // itself - which runs inside a catch handler, so a throw here would
    // escape the handler entirely and surface as an unhandled rejection
    // in the source process. One-way data flow means a consumer can lose
    // frames, never that it can throw into the server.
  }
}
