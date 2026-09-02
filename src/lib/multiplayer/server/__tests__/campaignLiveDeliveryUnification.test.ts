/**
 * One live-delivery route for every campaign join arm (umbrella 12.x —
 * "finding #12").
 *
 * Three arms admit a live campaign client and each used to attach live
 * delivery its own way: the GM host arm subscribed the raw host
 * directly (no scope boundary, no delivery bookkeeping), the legacy
 * room-code newcomer arm went through `CampaignSyncSession`, and the
 * grant/replica arm pushed frames out of its epoch projection. Which
 * arm a client landed on depended on server state, so "did the event
 * reach you" had three different answers.
 *
 * These rows pin the unified contract from the SOCKET side: one
 * committed command, one `CampaignEvent` frame on every connected
 * arm, and the same scope boundary and convergence bookkeeping applied
 * to all of them.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions
 */

import type { ICampaignSessionMembershipPort } from '@/lib/multiplayer/server/bindCampaignSyncConnection';
import type { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import {
  EVENT_TS,
  ISSUER_PUBLIC_KEY,
  closeCampaignDeliveryHarness,
  openCampaignDeliveryHarness,
} from '@/lib/campaign/delivery/__tests__/grantProjectionHarness';
import { SQLiteCampaignReplicaStore } from '@/lib/campaign/replica/SQLiteCampaignReplicaStore';
import { bindCampaignSyncConnection } from '@/lib/multiplayer/server/bindCampaignSyncConnection';
import { CampaignHostRegistry } from '@/lib/multiplayer/server/CampaignHostRegistry';
import { _resetRoomCodeGuestIssuerForTest } from '@/lib/multiplayer/server/handleRoomCodeGuestJoin';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { nowIso } from '@/types/multiplayer/Protocol';

import {
  MockWireSocket,
  drain,
  framesOf,
  harnessGrantChannel,
  quietLogger,
} from './campaignGrantChannel.test-helpers';

const MATCH_ID = 'match-delivery-unification';
const CAMPAIGN_ID = 'campaign-delivery-unification';
const HOST_ID = 'pid_host';
const LEGACY_GUEST_ID = 'pid_legacy_guest';
const GRANT_GUEST_ID = 'pid_grant_guest';
const ROOM_CODE = 'ABC234';
const GM_MARKER = 'WITHHELD-GM-UNIFIED';
const ISSUER = {
  publicKey: ISSUER_PUBLIC_KEY,
  privateKey: 'unused-unification-issuer',
};

let harness: Awaited<ReturnType<typeof openCampaignDeliveryHarness>>;
let registry: CampaignHostRegistry;
let replica: SQLiteCampaignReplicaStore;

describe('campaign live delivery — one route for every join arm', () => {
  beforeEach(async () => {
    harness = await openCampaignDeliveryHarness();
    replica = new SQLiteCampaignReplicaStore(
      getSQLiteService().getDatabase(),
      function () {
        return EVENT_TS;
      },
    );
    registry = new CampaignHostRegistry();
    await registry.register(MATCH_ID, {
      campaignId: CAMPAIGN_ID,
      hostPlayerId: HOST_ID,
      roomCode: ROOM_CODE,
      arbitrationMode: 'auto-approve',
      state: {
        ...createEmptyCampaignState(CAMPAIGN_ID),
        balance: 1_000_000,
      },
    });
    quietLogger.error.mockClear();
    quietLogger.warn.mockClear();
  });

  afterEach(async () => {
    registry.dispose(MATCH_ID);
    _resetRoomCodeGuestIssuerForTest();
    await closeCampaignDeliveryHarness(harness);
  });

  it('hydrates the GM from the session rather than a hand-built frame', async () => {
    // The host arm used to build its own `CampaignSnapshot` inline, so
    // the GM was the one client whose baseline did not come from the
    // session. The session's baseline names the match and the revision
    // it is a baseline OF; the hand-built one carried neither.
    const gm = await joinGm();

    const baseline = framesOf(gm, 'CampaignSnapshot')[0];
    expect(baseline).toBeDefined();
    expect(baseline?.event.payload).toEqual(
      expect.objectContaining({ matchId: MATCH_ID, revision: 0 }),
    );
  });

  it('delivers a committed command to the GM socket exactly once', async () => {
    const gm = await joinGm();

    await advanceDay('gm-arm-day');
    await drain(function () {
      return dayFrames(gm).length > 0;
    });

    expect(dayFrames(gm)).toHaveLength(1);
  });

  it('delivers a committed command to a legacy room-code guest exactly once', async () => {
    const guest = await joinLegacyGuest();

    await advanceDay('legacy-arm-day');
    await drain(function () {
      return dayFrames(guest).length > 0;
    });

    expect(dayFrames(guest)).toHaveLength(1);
  });

  it('delivers a committed command to a grant-channel guest exactly once', async () => {
    const guest = await joinGrantGuest();

    await advanceDay('grant-arm-day');
    await drain(function () {
      return dayFrames(guest).length > 0;
    });

    expect(dayFrames(guest)).toHaveLength(1);
    // Deliberate wire-shape pin: since the unification the grant arm's
    // live frames carry the JOURNAL sequence — the number the ack gate
    // reads — not the per-grant delivery sequence the projector used to
    // reattach. This matches the legacy arm's contract and the
    // sequence-concealment deferral recorded in
    // campaignWireScopeBoundary.ts; it is re-introduced knowingly, not
    // leaked. (The room-code arm always carried a `sequence` key; what
    // changed is which number space fills it.)
    expect(dayFrames(guest)[0]?.event.sequence).toBe(await currentRevision());
  });

  it('reaches all three arms once, and gm scope still stops at the GM', async () => {
    const gm = await joinGm();
    const legacy = await joinLegacyGuest();
    const grant = await joinGrantGuest();

    await advanceDay('cross-arm-day');
    await drain(function () {
      return (
        dayFrames(gm).length > 0 &&
        dayFrames(legacy).length > 0 &&
        dayFrames(grant).length > 0
      );
    });

    expect(dayFrames(gm)).toHaveLength(1);
    expect(dayFrames(legacy)).toHaveLength(1);
    expect(dayFrames(grant)).toHaveLength(1);

    // The control: unification must not turn "one route" into "one
    // audience". A GM-scoped fact committed through the same path is
    // admitted to the GM and withheld from both players.
    await commitGmFact();
    await drain(function () {
      return gm.sent.some(function (message) {
        return JSON.stringify(message).includes(GM_MARKER);
      });
    });

    expect(JSON.stringify(gm.sent)).toContain(GM_MARKER);
    expect(JSON.stringify(legacy.sent)).not.toContain(GM_MARKER);
    expect(JSON.stringify(grant.sent)).not.toContain(GM_MARKER);
  });

  it('retains a grant-channel guest in the convergence set until they ack', async () => {
    // The bookkeeping half of the same finding. A grant-arm guest was
    // delivered to by a path the session knew nothing about, so the
    // launch gate never waited on them: they could be arbitrarily far
    // behind and progression read as converged.
    const guest = await joinGrantGuest();
    const entry = registryEntry();

    await advanceDay('grant-arm-convergence-day');
    await drain(function () {
      return dayFrames(guest).length > 0;
    });

    expect(await entry.syncSession.evaluateScenarioLaunch()).toEqual(
      expect.objectContaining({
        ok: false,
        reason: 'participants-behind',
        behind: [expect.objectContaining({ participantId: GRANT_GUEST_ID })],
      }),
    );

    // ...and the ack clears it, which is only possible because the
    // unified path recorded what it delivered. Without `noteDelivered`
    // on this route the claim is refused `ahead-of-delivery` and the
    // gate never opens.
    const head = await currentRevision();
    guest.inbound({
      kind: 'CampaignAck',
      matchId: MATCH_ID,
      ts: nowIso(),
      playerId: GRANT_GUEST_ID,
      campaignId: CAMPAIGN_ID,
      revision: head,
    });
    await drain();

    expect(await entry.syncSession.evaluateScenarioLaunch()).toEqual({
      ok: true,
      requiredRevision: head,
    });
  });

  it('never makes the GM something their own launch gate waits on', async () => {
    // The GM joins as a member for scope and delivery purposes, but the
    // campaign's own authority is not a participant a launch waits for:
    // gating the GM's next command on the GM's acknowledgement of their
    // previous one is the authority waiting for itself.
    await joinGm();
    const entry = registryEntry();

    await advanceDay('gm-not-waited-on-day');
    await drain();

    expect(await entry.syncSession.evaluateScenarioLaunch()).toEqual({
      ok: true,
      requiredRevision: await currentRevision(),
    });
  });
});

/** The registered entry; the suite always registers one. */
function registryEntry(): NonNullable<ReturnType<CampaignHostRegistry['get']>> {
  const entry = registry.get(MATCH_ID);
  if (entry === null) throw new Error('expected a registered campaign entry');
  return entry;
}

/** The campaign's committed head. */
async function currentRevision(): Promise<number> {
  return Math.max(
    0,
    (await registryEntry().host.getEventLog().nextSequence()) - 1,
  );
}

/** Commits one AdvanceDay through the host's real intent path. */
async function advanceDay(intentId: string): Promise<void> {
  const result = await registryEntry().host.applyHostIntent({
    kind: 'AdvanceDay',
    campaignId: CAMPAIGN_ID,
    intentId,
    payload: { days: 1 },
  });
  expect(result.ok).toBe(true);
}

/**
 * Commits a gm-scoped fact through the real commit path so it fans out
 * to live subscribers. No production intent emits gm scope yet, and a
 * bare log append would never reach a subscriber at all.
 */
async function commitGmFact(): Promise<void> {
  const host: CampaignMatchHost = registryEntry().host;
  await host._commitEventsForTests([
    {
      type: 'FundsChanged',
      campaignId: CAMPAIGN_ID,
      ts: EVENT_TS,
      authorPlayerId: HOST_ID,
      scope: 'gm',
      payload: { delta: 0, reason: GM_MARKER, balance: 1_000_000 },
    },
  ]);
}

/** CampaignDayAdvanced frames a socket actually received. */
function dayFrames(
  socket: MockWireSocket,
): readonly Extract<IServerMessage, { kind: 'CampaignEvent' }>[] {
  return framesOf(socket, 'CampaignEvent').filter(function (frame) {
    return frame.event.type === 'CampaignDayAdvanced';
  });
}

/** GM socket, joined through the host arm. */
async function joinGm(): Promise<MockWireSocket> {
  const socket = new MockWireSocket();
  await bindCampaignSyncConnection({
    socket,
    registry,
    matchId: MATCH_ID,
    verifiedPlayerId: HOST_ID,
    logger: quietLogger,
    grantChannel: null,
    replicaStore: null,
  });
  socket.inbound({
    kind: 'CampaignJoin',
    matchId: MATCH_ID,
    ts: nowIso(),
    playerId: HOST_ID,
    role: 'host',
  });
  await drain(function () {
    return framesOf(socket, 'CampaignSnapshot').length > 0;
  });
  return socket;
}

/**
 * Newcomer on the legacy arm: no grant channel and no replica, so the
 * room-code join falls through to `joinGuest`.
 */
async function joinLegacyGuest(): Promise<MockWireSocket> {
  const socket = new MockWireSocket();
  await bindCampaignSyncConnection({
    socket,
    registry,
    matchId: MATCH_ID,
    verifiedPlayerId: LEGACY_GUEST_ID,
    logger: quietLogger,
    grantChannel: null,
    replicaStore: null,
    membership: openMembership(),
  });
  socket.inbound(guestJoinEnvelope(LEGACY_GUEST_ID));
  await drain(function () {
    return framesOf(socket, 'CampaignSnapshot').length > 0;
  });
  return socket;
}

/** Newcomer on the grant arm: grant channel plus durable replica. */
async function joinGrantGuest(): Promise<MockWireSocket> {
  const socket = new MockWireSocket();
  await bindCampaignSyncConnection({
    socket,
    registry,
    matchId: MATCH_ID,
    verifiedPlayerId: GRANT_GUEST_ID,
    logger: quietLogger,
    grantChannel: harnessGrantChannel(harness, 'snapshot-plus-tail'),
    replicaStore: replica,
    roomCodeGrantIssuer: ISSUER,
    membership: openMembership(),
  });
  socket.inbound(guestJoinEnvelope(GRANT_GUEST_ID));
  await drain(function () {
    return framesOf(socket, 'CampaignSnapshot').length > 0;
  });
  return socket;
}

/** Room-code CampaignJoin for a newcomer. */
function guestJoinEnvelope(playerId: string) {
  return {
    kind: 'CampaignJoin' as const,
    matchId: MATCH_ID,
    ts: nowIso(),
    playerId,
    role: 'guest' as const,
    roomCode: ROOM_CODE,
  };
}

/** Membership that seats anyone; seat refusal is not what these rows test. */
function openMembership(): ICampaignSessionMembershipPort {
  return {
    isActive: () => false,
    isRevoked: () => false,
    bind: () => ({ kind: 'bound' }),
    revoke: () => false,
  };
}
