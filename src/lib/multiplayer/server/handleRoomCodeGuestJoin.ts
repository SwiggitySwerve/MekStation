/**
 * Room-code guest join via grant channel + durable replica (task 3.5).
 *
 * After the host has admitted the principal (valid room code), the
 * source resolves-or-issues a campaign-scope grant, hydrates through
 * snapshot-plus-tail (seeded from host-log genesis so a restricted
 * grant does not start empty), persists into the replica, and keeps
 * the client's CampaignSnapshot / CampaignEvent kinds so the existing
 * intent, veto, and arbitration frames stay on the same socket.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/tasks.md (3.5)
 */

import type { ICampaignGrantLiveSource } from '@/lib/campaign/delivery/campaignGrantChannelSession';
import type { IProjectCampaignStreamDeps } from '@/lib/campaign/delivery/projectCampaignStreamForGrant';
import type { ICampaignGrantSigner } from '@/lib/campaign/grants/ICampaignGrantStore';
import type { SQLiteCampaignReplicaStore } from '@/lib/campaign/replica/SQLiteCampaignReplicaStore';
import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';
import type {
  ICampaignClientMessage,
  IErrorCode,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import { resolveOrIssueRoomCodeGuestGrant } from '@/lib/campaign/coop/resolveOrIssueRoomCodeGuestGrant';
import {
  buildRoomCodeGuestHydration,
  grantCursorFromReplicaCursor,
  roomCodeGuestClientSnapshotEvent,
} from '@/lib/campaign/coop/roomCodeGuestHydration';
import {
  buildScopedCampaignSnapshot,
  projectedHeadDeliverySequence,
} from '@/lib/campaign/delivery/buildScopedCampaignSnapshot';
import { createHostCampaignEventJournal } from '@/lib/campaign/sync/hostCampaignEventJournal';
import { mintVerifiedPrincipal } from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import { normalizeRoomCode } from '@/lib/p2p/roomCodes';
import { generateKeyPair, toBase64 } from '@/services/vault/IdentityService';

import type { ICampaignSessionMembershipPort } from './bindCampaignSyncConnection';
import type { ICampaignHostRegistryEntry } from './CampaignHostRegistry';
import type { ICampaignGrantChannelDeps } from './handleCampaignGrantJoin';

import { attachRoomCodeGuestLiveSession } from './roomCodeGuestLiveFanout';

export type RoomCodeGuestJoinOutcome = 'served' | 'fallback' | 'rejected';

export interface IHandleRoomCodeGuestJoinDeps {
  readonly envelope: Extract<ICampaignClientMessage, { kind: 'CampaignJoin' }>;
  readonly entry: ICampaignHostRegistryEntry;
  readonly matchId: string;
  readonly verifiedPlayerId: string;
  readonly cleanupFns: Set<() => void>;
  readonly grantChannel: ICampaignGrantChannelDeps | null;
  readonly replicaStore: SQLiteCampaignReplicaStore | null;
  readonly liveSource: ICampaignGrantLiveSource;
  readonly send: (message: IServerMessage) => void;
  readonly closeTyped: (code: IErrorCode, reason: string) => void;
  readonly issuer?: ICampaignGrantSigner;
  readonly membership?: ICampaignSessionMembershipPort | null;
}

let cachedRoomCodeGuestIssuer: ICampaignGrantSigner | null = null;

/**
 * Process-local issuer for auto-issued room-code grants. Tokens are
 * not minted on this path; the public key is pinned on the grant row
 * so a later share-UI token cannot be verified against a missing key.
 */
export async function resolveRoomCodeGuestIssuer(
  injected?: ICampaignGrantSigner,
): Promise<ICampaignGrantSigner> {
  if (injected) return injected;
  if (cachedRoomCodeGuestIssuer) return cachedRoomCodeGuestIssuer;
  const keyPair = await generateKeyPair();
  cachedRoomCodeGuestIssuer = {
    publicKey: toBase64(keyPair.publicKey),
    privateKey: toBase64(keyPair.privateKey),
  };
  return cachedRoomCodeGuestIssuer;
}

/**
 * True when the join's room code matches the registered campaign.
 * A mismatch is "not admitted"; resolve-or-issue must not run.
 */
export function roomCodeAdmitsGuest(
  entry: Pick<ICampaignHostRegistryEntry, 'syncSession'>,
  roomCode: string | undefined,
): boolean {
  // The LIVE invite only. There is deliberately no fallback to
  // `entry.roomCode`: that field holds the code the entry opened with
  // and never changes, so falling back to it made an expired invite
  // keep admitting newcomers - the session had stopped resolving the
  // code and this path handed back the original anyway. `null` here
  // means expired, and expired must mean refused.
  const expected = entry.syncSession.getRoomCode();
  if (!roomCode || expected === null || expected.length === 0) return false;
  return normalizeRoomCode(roomCode) === normalizeRoomCode(expected);
}

/**
 * Serves a room-code guest through grants + replica. Returns fallback
 * when grant/replica deps are missing so existing in-memory tests keep
 * the joinGuest path. rejected means the room code was wrong.
 */
export async function handleRoomCodeGuestJoin(
  deps: IHandleRoomCodeGuestJoinDeps,
): Promise<RoomCodeGuestJoinOutcome> {
  if (deps.grantChannel == null || deps.replicaStore == null) {
    return 'fallback';
  }
  if (!roomCodeAdmitsGuest(deps.entry, deps.envelope.roomCode)) {
    deps.send({
      kind: 'Error',
      matchId: deps.matchId,
      ts: deps.grantChannel.nowIso(),
      code: 'UNKNOWN_MATCH',
      reason: 'unknown-room-code',
    });
    return 'rejected';
  }

  // Seat before grant/snapshot/live attach. A refused guest must not
  // receive any campaign frame through the grant channel on the way to
  // learning that tactical seats are full. `already-bound` is admitted:
  // the durable store returns it for an idempotent player-seat rejoin.
  const seat = deps.membership?.bind({
    campaignId: deps.entry.campaignId,
    sessionId: deps.matchId,
    participantId: deps.verifiedPlayerId,
    seat: 'player',
  });
  if (seat?.kind === 'tactical-seats-full') {
    deps.closeTyped('AUTH_REJECTED', 'campaign-tactical-seats-full');
    return 'rejected';
  }

  const nowIso = deps.grantChannel.nowIso();
  const issuer = await resolveRoomCodeGuestIssuer(deps.issuer);
  let resolved;
  try {
    resolved = resolveOrIssueRoomCodeGuestGrant({
      grantStore: deps.grantChannel.projectDeps.grantStore,
      campaignId: deps.entry.campaignId,
      participantId: deps.verifiedPlayerId,
      issuer,
      issuedAt: nowIso,
      nowIso,
    });
  } catch {
    deps.closeTyped('INTERNAL_ERROR', 'grant-store-unavailable');
    return 'rejected';
  }

  const grant = resolved.grant;
  const replica = deps.replicaStore;
  replica.setConnectionStatus('connected');
  deps.cleanupFns.add(function () {
    replica.setConnectionStatus('disconnected');
  });

  const projectDeps = projectDepsOverHostLog(
    deps.grantChannel.projectDeps,
    deps.entry,
  );
  const principal = mintVerifiedPrincipal(grant.participantId);
  const lastCursor = await replica.lastCursor(grant.campaignId, grant.grantId);

  const pendingLive: IServerMessage[] = [];
  let snapshotReleased = false;
  /**
   * Holds CampaignEvent frames until the client baseline is published
   * so applyEvent cannot run against an empty mirror.
   */
  const sendAfterSnapshot = function (message: IServerMessage): void {
    if (!snapshotReleased && message.kind === 'CampaignEvent') {
      pendingLive.push(message);
      return;
    }
    deps.send(message);
  };
  const fanout = liveFanoutDeps(
    deps,
    grant.campaignId,
    grant.grantId,
    principal,
    projectDeps,
    replica,
    sendAfterSnapshot,
  );

  if (lastCursor === null) {
    const hydrated = await hydrateFirstJoin({
      deps,
      replica,
      grantId: grant.grantId,
      projectDeps,
      principal,
      nowIso,
    });
    if (!hydrated) return 'rejected';
    await attachRoomCodeGuestLiveSession(fanout, {
      deliveryEpochId: hydrated.deliveryEpochId,
      afterSequence: hydrated.projectorHead,
    });
    sendGuestSnapshot(
      deps,
      grant.campaignId,
      hydrated.state,
      hydrated.projectorHead,
      nowIso,
    );
    snapshotReleased = true;
    flushPendingLive(pendingLive, deps.send);
    return 'served';
  }

  await attachRoomCodeGuestLiveSession(
    fanout,
    grantCursorFromReplicaCursor(lastCursor),
  );
  await sendReplicaSnapshot(deps, grant.campaignId, grant.grantId, replica);
  snapshotReleased = true;
  pendingLive.length = 0;
  return 'served';
}

/**
 * Replaces the SQLite source journal with the host-log adapter so
 * projection sees live co-op commits while the flag-off host still
 * writes ICampaignEventStore.
 */
function projectDepsOverHostLog(
  base: IProjectCampaignStreamDeps,
  entry: ICampaignHostRegistryEntry,
): IProjectCampaignStreamDeps {
  return {
    ...base,
    journal: createHostCampaignEventJournal(entry.campaignId, function () {
      return entry.host.getEventLog().getCampaignEvents(0);
    }),
  };
}

interface IFirstJoinHydration {
  readonly deliveryEpochId: string;
  readonly projectorHead: number;
  readonly state: ICampaignAuthoritativeState;
}

/**
 * Snapshot-plus-tail first join: compose genesis-seeded state and ingest
 * it into the replica. The CampaignSnapshot frame is sent after live
 * attach so a join waiter that keys off the snapshot also has fan-out.
 */
async function hydrateFirstJoin(args: {
  readonly deps: IHandleRoomCodeGuestJoinDeps;
  readonly replica: SQLiteCampaignReplicaStore;
  readonly grantId: string;
  readonly projectDeps: IProjectCampaignStreamDeps;
  readonly principal: ReturnType<typeof mintVerifiedPrincipal>;
  readonly nowIso: string;
}): Promise<IFirstJoinHydration | null> {
  const { deps, replica, grantId, projectDeps, principal, nowIso } = args;
  let built;
  try {
    built = await buildScopedCampaignSnapshot(projectDeps, {
      principal,
      grantId,
      nowIso,
    });
  } catch {
    deps.closeTyped('INTERNAL_ERROR', 'grant-channel-internal');
    return null;
  }
  if (built.kind === 'refused') {
    deps.closeTyped('AUTH_REJECTED', 'no-active-membership');
    return null;
  }
  if (built.kind === 'stale-epoch' || built.kind === 'cut-rejected') {
    deps.closeTyped('INTERNAL_ERROR', 'grant-channel-internal');
    return null;
  }

  const hostEvents = await deps.entry.host.getEventLog().getCampaignEvents(0);
  const hydration = buildRoomCodeGuestHydration(
    deps.entry.campaignId,
    hostEvents,
    built.page.items,
    built.page.deliveryEpochId,
    nowIso,
    deps.entry.hostPlayerId,
  );
  const ingested = await replica.ingest(deps.entry.campaignId, grantId, {
    deliveryEpochId: built.page.deliveryEpochId,
    items: hydration.replicaItems,
  });
  if (ingested.kind !== 'applied' && ingested.kind !== 'duplicate') {
    deps.closeTyped('INTERNAL_ERROR', ingested.reason);
    return null;
  }

  const projectorHead = projectedHeadDeliverySequence(built.page.items);
  return {
    deliveryEpochId: built.page.deliveryEpochId,
    projectorHead,
    state: hydration.state,
  };
}

/**
 * Emits the client-visible baseline. Grant-channel kinds stay off this
 * socket so existing CampaignSnapshot handlers keep working.
 */
function sendGuestSnapshot(
  deps: IHandleRoomCodeGuestJoinDeps,
  campaignId: string,
  state: ICampaignAuthoritativeState,
  projectorHead: number,
  nowIso: string,
): void {
  deps.send({
    kind: 'CampaignSnapshot',
    matchId: deps.matchId,
    ts: nowIso,
    event: roomCodeGuestClientSnapshotEvent({
      campaignId,
      matchId: deps.matchId,
      state,
      ts: nowIso,
      authorPlayerId: deps.entry.hostPlayerId,
      revision: projectorHead,
    }),
  });
}

/**
 * Flushes live CampaignEvent frames that arrived while the snapshot
 * was still unpublished. Rejoin drops that buffer instead so catch-up
 * already folded into replica state is not applied twice.
 */
function flushPendingLive(
  pending: readonly IServerMessage[],
  send: (message: IServerMessage) => void,
): void {
  for (const message of pending) {
    send(message);
  }
}

/**
 * Rejoin hydration from replica state. The grant channel is then
 * started from the persisted cursor so history is not re-sent.
 */
async function sendReplicaSnapshot(
  deps: IHandleRoomCodeGuestJoinDeps,
  campaignId: string,
  grantId: string,
  replica: SQLiteCampaignReplicaStore,
): Promise<void> {
  const read = await replica.readReplicaState(campaignId, grantId);
  const channel = deps.grantChannel;
  if (channel == null) return;
  const ts = channel.nowIso();
  deps.send({
    kind: 'CampaignSnapshot',
    matchId: deps.matchId,
    ts,
    event: roomCodeGuestClientSnapshotEvent({
      campaignId,
      matchId: deps.matchId,
      state: read.state,
      ts,
      authorPlayerId: deps.entry.hostPlayerId,
      revision: Math.max(0, read.lastDeliverySequence - 1),
    }),
  });
}

/**
 * Packs live-session deps after grantChannel has already been proven
 * non-null by handleRoomCodeGuestJoin. send is snapshot-gated so
 * catch-up cannot precede the client baseline.
 */
function liveFanoutDeps(
  joinDeps: IHandleRoomCodeGuestJoinDeps,
  campaignId: string,
  grantId: string,
  principal: ReturnType<typeof mintVerifiedPrincipal>,
  projectDeps: IProjectCampaignStreamDeps,
  replica: SQLiteCampaignReplicaStore,
  send: (message: IServerMessage) => void,
) {
  const channel = joinDeps.grantChannel;
  if (channel == null) {
    throw new Error('live fan-out requires grant channel deps');
  }
  return {
    matchId: joinDeps.matchId,
    campaignId,
    grantId,
    principal,
    projectDeps,
    liveSource: joinDeps.liveSource,
    replica,
    cleanupFns: joinDeps.cleanupFns,
    nowIso: channel.nowIso,
    send,
    closeTyped: joinDeps.closeTyped,
  };
}

/**
 * Test reset for the cached issuer. Production never calls this.
 */
export function _resetRoomCodeGuestIssuerForTest(): void {
  cachedRoomCodeGuestIssuer = null;
}
