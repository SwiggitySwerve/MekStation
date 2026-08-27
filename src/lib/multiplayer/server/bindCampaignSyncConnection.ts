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

/**
 * The membership facts this module needs, narrowed to three questions.
 *
 * Narrow on purpose: the socket layer should be able to ask "is this
 * person admitted", "have they been revoked", and "record that they
 * joined" - and should not be able to reach the rest of the store from
 * inside a connection handler.
 */
export interface ICampaignSessionMembershipPort {
  readonly isActive: (
    campaignId: string,
    sessionId: string,
    participantId: string,
  ) => boolean;
  readonly isRevoked: (
    campaignId: string,
    sessionId: string,
    participantId: string,
  ) => boolean;
  readonly bind: (input: {
    readonly campaignId: string;
    readonly sessionId: string;
    readonly participantId: string;
    readonly seat: 'gm' | 'player';
  }) => ICampaignSeatBindOutcome;
}

/**
 * What the seat store answered, narrowed to the discriminant this layer
 * acts on. The store returns richer rows; nothing here needs them, and
 * keeping the port thin is the same instinct that kept it to three
 * questions in the first place.
 */
export interface ICampaignSeatBindOutcome {
  readonly kind:
    | 'bound'
    | 'already-bound'
    | 'gm-seat-taken'
    | 'tactical-seats-full'
    | 'revoked';
}

/**
 * Durable force ownership, narrowed to the one question this layer asks.
 *
 * Optional for the same reason membership is: the tests that bind a
 * socket have no database, and a session without durable ownership
 * behaves exactly as it did before this port existed.
 */
export interface ICampaignForceClaimPort {
  readonly claim: (input: {
    readonly campaignId: string;
    readonly sessionId: string;
    readonly missionId: string;
    readonly forceId: string;
    readonly participantId: string;
  }) => { readonly kind: 'claimed' | 'already-held' | 'held-by-other' };
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
   * Durable session membership (umbrella 6.1/6.2).
   *
   * Present in production; a socket bound WITHOUT it keeps the
   * pre-6.2 behaviour of deciding admission from the room code alone,
   * which is what lets this land without rewriting every caller at
   * once. Absence is the structural flag - there is no silent fallback
   * hiding inside the store.
   */
  membership?: ICampaignSessionMembershipPort | null;
  forceClaims?: ICampaignForceClaimPort | null;
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
  membership,
  forceClaims,
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
      membership,
      forceClaims,
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
  membership?: ICampaignSessionMembershipPort | null;
  forceClaims?: ICampaignForceClaimPort | null;
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
  membership,
  forceClaims,
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
      membership,
      forceClaims,
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
  membership?: ICampaignSessionMembershipPort | null;
  forceClaims?: ICampaignForceClaimPort | null;
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
  membership,
  forceClaims,
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
        membership,
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
      // No correlation id: the proposal envelope carries an opaque
      // `proposal`, and inventing a field to correlate against would be
      // a protocol claim this refusal does not need to make.
      if (refusedWhilePaused(entry, socket, matchId)) {
        return;
      }
      await handleCampaignProposal({ envelope, socket, entry, matchId });
      return;
    case 'CampaignDecision':
      if (refusedWhilePaused(entry, socket, matchId, envelope.proposalId)) {
        return;
      }
      await handleCampaignDecision({ envelope, socket, entry, matchId });
      return;
    case 'CampaignHostIntent':
      if (
        refusedWhilePaused(entry, socket, matchId, envelope.intent.intentId)
      ) {
        return;
      }
      await handleCampaignHostIntent({ envelope, socket, entry, matchId });
      return;
    case 'CampaignParticipation':
      handleCampaignParticipation({
        envelope,
        socket,
        entry,
        matchId,
        verifiedPlayerId,
        forceClaims,
      });
      return;
    default: {
      const exhaustive: never = envelope;
      void exhaustive;
    }
  }
}

/**
 * Refuse a state-changing campaign command while the session is paused
 * for GM loss, and say so truthfully.
 *
 * Only the three MUTATING kinds are refused. Join, grant-join, and
 * acknowledgement stay open on purpose: those are how a participant
 * gets back and how the GM returns to resume, and refusing them would
 * make the pause unrecoverable rather than recoverable.
 *
 * `MATCH_PAUSED` already means exactly this - an engine-mutating
 * command rejected because the session is waiting on someone to
 * reconnect - so no new code was minted for it.
 */
function refusedWhilePaused(
  entry: ICampaignHostRegistryEntry,
  socket: IWireCampaignSocket,
  matchId: string,
  correlationId?: string,
): boolean {
  if (!entry.syncSession.isPaused()) return false;
  send(
    socket,
    errorFrame(
      matchId,
      'MATCH_PAUSED',
      'campaign-paused-gm-absent',
      correlationId,
    ),
  );
  return true;
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
  membership,
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
  membership?: ICampaignSessionMembershipPort | null;
}): Promise<void> {
  // Durable membership decides first (umbrella 6.1/6.2). Two things
  // become possible only once it does:
  //
  // - A REVOKED participant is refused even holding a valid room code.
  //   Before this, revocation lasted exactly as long as they stayed
  //   disconnected, because the code was the whole check.
  // - A returning member is routed by their membership rather than by
  //   re-presenting the invite, so an expired or rotated code stops
  //   locking out people already admitted.
  if (membership) {
    if (membership.isRevoked(entry.campaignId, matchId, verifiedPlayerId)) {
      send(socket, errorFrame(matchId, 'AUTH_REJECTED', 'membership-revoked'));
      return;
    }
  }

  // Registration happens on each ACCEPTED path below, never here.
  // Doing it up front put the socket in the broadcast set before the
  // room code was checked, so a guest refused with UNKNOWN_MATCH stayed
  // a fan-out recipient and kept receiving the campaign's events - a
  // refusal that refused nothing. Umbrella 6.1: authenticated membership
  // precedes socket attachment.
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
    // Claim the gm seat BEFORE anything else happens, because the two
    // authorities can disagree. `role` is host by comparing the verified
    // principal to the registry's OWN in-memory `hostPlayerId`, while
    // durable membership is what actually decides - and its
    // single-active-GM index answers `gm-seat-taken` when a different
    // identity already holds the seat for this session.
    //
    // That answer used to be discarded, and the session was RESUMED
    // first, so a contested GM unpaused a live campaign on its way to
    // being ignored. Ordering is the fix as much as the refusal is:
    // nothing may resume, attach, or subscribe until the seat is ours.
    const gmSeat = membership?.bind({
      campaignId: entry.campaignId,
      sessionId: matchId,
      participantId: verifiedPlayerId,
      seat: 'gm',
    });
    if (gmSeat?.kind === 'gm-seat-taken') {
      send(
        socket,
        errorFrame(matchId, 'AUTH_REJECTED', 'campaign-gm-seat-taken'),
      );
      return;
    }
    // The GM is here. This resumes a session their previous connection
    // paused - and ONLY their own reconnection can, because `role` is
    // host precisely when the connection's VERIFIED principal matches
    // the registered host. A tactical player cannot reach this line.
    entry.syncSession.noteGmConnected();
    cleanupFns.add(() => {
      // ...and this is GM loss. The session pauses rather than
      // promoting anybody; authority waits for the same GM.
      entry.syncSession.noteGmDisconnected();
    });
    addSocketToMatch(matchId, socket);
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

  if (
    membership?.isActive(entry.campaignId, matchId, verifiedPlayerId) === true
  ) {
    // Routed by MEMBERSHIP, not by the invite. Re-presenting
    // `entry.roomCode` on their behalf worked only while the invite was
    // still live, so expiring it locked out the people already inside -
    // exactly backwards, since expiry exists to stop NEWCOMERS.
    const rejoin = await entry.syncSession.joinMember((event) => {
      sendCampaignEvent(socket, matchId, event);
    });
    if (rejoin.ok) {
      addSocketToMatch(matchId, socket);
      cleanupFns.add(rejoin.disconnect);
      acknowledge();
      return;
    }
    // Fall through rather than fail: a durable member whose live session
    // cannot take them right now is not an authorization problem, and
    // the paths below report the real reason.
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
    addSocketToMatch(matchId, socket);
    acknowledge();
    return;
  }

  // No fallback to `entry.roomCode`. Substituting the session's OWN
  // code for a missing one made omitting the invite equivalent to
  // presenting the correct invite, so any authenticated player who knew
  // the match id could join a campaign they were never invited to - the
  // room code protected nothing against them. A newcomer must present a
  // code; a durable member never reaches here, because the membership
  // path above already admitted them.
  const join = await entry.syncSession.joinGuest(
    envelope.roomCode ?? '',
    (event) => {
      sendCampaignEvent(socket, matchId, event);
    },
  );
  if (!join.ok) {
    send(socket, errorFrame(matchId, 'UNKNOWN_MATCH', 'unknown-room-code'));
    return;
  }
  // The invite worked, so this newcomer becomes a durable member and
  // will not need the code again.
  const seat = membership?.bind({
    campaignId: entry.campaignId,
    sessionId: matchId,
    participantId: verifiedPlayerId,
    seat: 'player',
  });
  // A campaign seats exactly two tactical players, and the store decides
  // that inside its bind transaction — which is what makes it safe
  // against two newcomers racing for the last seat, where a read-then-
  // admit check would let both through. Until now the answer was
  // discarded and the third player was admitted regardless.
  //
  // Undoing the hydration rather than pre-checking it keeps the store as
  // the single authority on seat count. The cost is that a refused
  // newcomer has already been sent the baseline before being turned
  // away; closing that needs the invite check and the seat check to
  // happen before any streaming, which is a larger change than this
  // refusal.
  if (seat?.kind === 'tactical-seats-full') {
    join.disconnect();
    send(
      socket,
      errorFrame(matchId, 'AUTH_REJECTED', 'campaign-tactical-seats-full'),
    );
    return;
  }
  addSocketToMatch(matchId, socket);
  cleanupFns.add(join.disconnect);
  acknowledge();
}

/**
 * Read a string field off a wire value the arbiter has not parsed yet.
 *
 * `CampaignProposal.proposal` is deliberately `unknown` here: the
 * arbiter owns parsing it. This layer needs exactly one field early, to
 * compare a claim against a proved identity, and returns null when the
 * value is absent or the wrong shape so a MALFORMED proposal stays the
 * arbiter's typed rejection rather than becoming an attribution error.
 */
function readStringField(value: unknown, field: string): string | null {
  if (typeof value !== 'object' || value === null) return null;
  const read = Reflect.get(value, field);
  return typeof read === 'string' && read.length > 0 ? read : null;
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
  // The envelope's identity is proved - the inbound guard closes any
  // socket whose `playerId` differs from the one the connection
  // authenticated as. The PROPOSAL carries its own author one level
  // down, and that field was never compared to it, so a player could
  // file a request under someone else's name.
  //
  // That matters because the field is not decoration: the GM's review
  // surface renders `proposal.proposingPlayerId` directly, so it decides
  // whose name sits next to a request the GM is about to approve. An
  // unchecked string was choosing what the deciding authority believed.
  const claimedProposer = readStringField(
    envelope.proposal,
    'proposingPlayerId',
  );
  if (claimedProposer !== null && claimedProposer !== envelope.playerId) {
    send(
      socket,
      errorFrame(
        matchId,
        'AUTH_REJECTED',
        'campaign-proposal-attribution',
        readStringField(envelope.proposal, 'proposalId') ?? undefined,
      ),
    );
    return;
  }
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
  if (envelope.playerId !== entry.hostPlayerId) {
    // GM review is the entire point of `host-review` mode, and without
    // this a guest could submit a proposal and immediately approve
    // their own - committing it to the campaign with the GM never
    // consulted. `handleCampaignHostIntent` has always checked this;
    // the decision path simply never did.
    //
    // Comparing the ENVELOPE's playerId is safe because the inbound
    // guard upstream closes any socket whose envelope claims an
    // identity other than the one the connection proved.
    send(
      socket,
      errorFrame(
        matchId,
        'AUTH_REJECTED',
        'campaign-decision-requires-gm',
        envelope.proposalId,
      ),
    );
    return;
  }
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
  forceClaims,
}: {
  envelope: Extract<ICampaignClientMessage, { kind: 'CampaignParticipation' }>;
  socket: IWireCampaignSocket;
  entry: ICampaignHostRegistryEntry;
  matchId: string;
  verifiedPlayerId: string;
  forceClaims?: ICampaignForceClaimPort | null;
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
  // The in-memory rule already refused a force a teammate holds THIS
  // session. The durable claim is what makes that survive a restart,
  // which is when the in-memory records are gone and the force would
  // otherwise be free for the taking. Writing it is also what settles a
  // race: the insert either wins or names the holder, where two
  // read-then-admit checks could both pass.
  if (!admitted.idempotent) {
    const claimed = forceClaims?.claim({
      campaignId: entry.campaignId,
      sessionId: matchId,
      missionId: admitted.record.missionId,
      forceId: admitted.record.force.id,
      participantId: admitted.record.playerId,
    });
    if (claimed?.kind === 'held-by-other') {
      send(socket, errorFrame(matchId, 'INVALID_INTENT', 'foreign-force'));
      return;
    }
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
