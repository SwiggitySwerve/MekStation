/**
 * Room-code guest path: grant resolve-or-issue, genesis-seeded
 * snapshot-plus-tail, replica backing, rejoin cursor, and scope filter
 * (task 3.5). Intent/veto/arbitration still uses CampaignProposal.
 */

import type { ICampaignSessionMembershipPort } from '@/lib/multiplayer/server/bindCampaignSyncConnection';
import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { campaignEventFromMessage } from '@/lib/campaign/coop/campaignSyncTransport';
import {
  EVENT_TS,
  ISSUER_PUBLIC_KEY,
  closeCampaignDeliveryHarness,
  openCampaignDeliveryHarness,
} from '@/lib/campaign/delivery/__tests__/grantProjectionHarness';
import { campaignJsonEquals } from '@/lib/campaign/delivery/foldCampaignGrantDelivery';
import { SQLiteCampaignReplicaStore } from '@/lib/campaign/replica/SQLiteCampaignReplicaStore';
import { freezeCampaignEvent } from '@/lib/campaign/sync/campaignEventScope';
import { bindCampaignSyncConnection } from '@/lib/multiplayer/server/bindCampaignSyncConnection';
import { CampaignHostRegistry } from '@/lib/multiplayer/server/CampaignHostRegistry';
import {
  _resetRoomCodeGuestIssuerForTest,
  roomCodeAdmitsGuest,
} from '@/lib/multiplayer/server/handleRoomCodeGuestJoin';
import { useCampaignMirrorStore } from '@/lib/p2p/campaignMirrorStore';
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

const MATCH_ID = 'match-room-code-guest';
const CAMPAIGN_ID = 'campaign-room-code-guest';
const HOST_ID = 'pid_host';
const GUEST_ID = 'pid_guest';
const ROOM_CODE = 'ABC234';
const GM_MARKER = 'WITHHELD-GM-ROOM-CODE';
const VISIBLE_REASON = 'VISIBLE-PRE-JOIN-SPEND';
const ISSUER = {
  publicKey: ISSUER_PUBLIC_KEY,
  privateKey: 'unused-room-code-issuer',
};

let harness: Awaited<ReturnType<typeof openCampaignDeliveryHarness>>;
let registry: CampaignHostRegistry;
let replica: SQLiteCampaignReplicaStore;

describe('roomCodeAdmitsGuest', () => {
  // Directly on the admission predicate: the heavy harness below can
  // only reach it through a live session, and the case that matters is
  // the one where the session's invite is GONE but the entry still
  // remembers the code it opened with.
  function entry(live: string | null) {
    // `roomCode` is the code the entry OPENED with and never changes;
    // `getRoomCode()` is the live invite. The gap between the two is
    // the whole case under test, so the stub has to carry both.
    return {
      roomCode: ROOM_CODE,
      syncSession: { getRoomCode: () => live },
    } as unknown as Parameters<typeof roomCodeAdmitsGuest>[0];
  }

  it('admits the live invite', () => {
    expect(roomCodeAdmitsGuest(entry(ROOM_CODE), ROOM_CODE)).toBe(true);
  });

  it('refuses the original code once the invite expired', () => {
    // Was admitted before: the predicate fell back to `entry.roomCode`,
    // which never changes, so an expired invite kept letting newcomers
    // in even though the session had stopped resolving the code.
    expect(roomCodeAdmitsGuest(entry(null), ROOM_CODE)).toBe(false);
  });

  it('refuses a guest presenting nothing', () => {
    expect(roomCodeAdmitsGuest(entry(ROOM_CODE), undefined)).toBe(false);
  });
});

describe('room-code guest grant path', () => {
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
        rosterUnits: {
          'unit-guest': {
            unitId: 'unit-guest',
            designation: 'Guest Mech',
            status: 'operational',
          },
        },
        forceUnits: { 'force-guest': ['unit-guest'] },
      },
    });
    useCampaignMirrorStore.getState().reset();
    quietLogger.error.mockClear();
    quietLogger.warn.mockClear();
  });

  afterEach(async () => {
    registry.dispose(MATCH_ID);
    _resetRoomCodeGuestIssuerForTest();
    await closeCampaignDeliveryHarness(harness);
  });

  it('hydrates pre-join history into the guest snapshot (empty-state trap)', async () => {
    const entry = registry.get(MATCH_ID);
    expect(entry).not.toBeNull();
    const advanced = await entry!.host.applyHostIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'pre-join-day',
      payload: { days: 3 },
    });
    expect(advanced.ok).toBe(true);

    const socket = await joinGuest();
    const snapshot = guestSnapshotState(socket);
    expect(snapshot.balance).toBe(1_000_000);
    expect(snapshot.day).toBe(3);
    expect(snapshot.rosterUnits['unit-guest']?.designation).toBe('Guest Mech');
    expect(snapshot.forceUnits?.['force-guest']).toEqual(['unit-guest']);
    expect(framesOf(socket, 'CampaignGrantDelivery')).toHaveLength(0);
    expect(framesOf(socket, 'CampaignGrantSnapshot')).toHaveLength(0);
  });

  it('resumes from the replica cursor and does not re-send history events', async () => {
    const entry = registry.get(MATCH_ID);
    expect(entry).not.toBeNull();
    await entry!.host.applyHostIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'pre-join-day',
      payload: { days: 2 },
    });

    const first = await joinGuest();
    const grantId = activeGuestGrantId();
    const storedBefore = await replica.storedEventCount(CAMPAIGN_ID, grantId);
    expect(storedBefore).toBeGreaterThan(0);
    first.close();

    const second = new MockWireSocket();
    await bindGuest(second);
    second.inbound(joinEnvelope());
    await drain(function () {
      return framesOf(second, 'CampaignSnapshot').length > 0;
    });

    const historyEvents = framesOf(second, 'CampaignEvent');
    expect(historyEvents).toHaveLength(0);
    const snapshot = guestSnapshotState(second);
    expect(snapshot.day).toBe(2);
    expect(snapshot.balance).toBe(1_000_000);
    const storedAfter = await replica.storedEventCount(CAMPAIGN_ID, grantId);
    expect(storedAfter).toBe(storedBefore);

    const beforeLive = second.sent.length;
    await entry!.host.applyHostIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'post-rejoin-day',
      payload: { days: 1 },
    });
    await drain(function () {
      return second.sent.length > beforeLive;
    });
    expect(
      framesOf(second, 'CampaignEvent').some(function (frame) {
        return frame.event.type === 'CampaignDayAdvanced';
      }),
    ).toBe(true);
    await expect(guestMirrorAgreesWithReplica(second, grantId)).resolves.toBe(
      true,
    );
    expect(
      harness.grantStore.listGrants(CAMPAIGN_ID).filter(function (row) {
        return row.participantId === GUEST_ID && row.revokedAt === null;
      }),
    ).toHaveLength(1);
  });

  it('never puts gm-scope events in guest frames or projected state', async () => {
    const entry = registry.get(MATCH_ID);
    expect(entry).not.toBeNull();
    await appendGmFunds(entry!.host, GM_MARKER, 42);
    await entry!.host.applyHostIntent({
      kind: 'SpendFunds',
      campaignId: CAMPAIGN_ID,
      intentId: 'visible-spend',
      payload: { amount: 25_000, reason: VISIBLE_REASON },
    });

    const socket = await joinGuest();
    expect(JSON.stringify(socket.sent)).not.toContain(GM_MARKER);
    const snapshot = guestSnapshotState(socket);
    expect(snapshot.balance).toBe(975_000);
    expect(JSON.stringify(snapshot)).not.toContain(GM_MARKER);

    const beforeLive = socket.sent.length;
    await appendGmFunds(entry!.host, `${GM_MARKER}-LIVE`, 7);
    await entry!.host.applyHostIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'post-join-day',
      payload: { days: 1 },
    });
    await drain(function () {
      return socket.sent.length > beforeLive;
    });
    expect(JSON.stringify(socket.sent)).not.toContain(GM_MARKER);
    expect(
      framesOf(socket, 'CampaignEvent').some(function (frame) {
        return frame.event.type === 'CampaignDayAdvanced';
      }),
    ).toBe(true);
  });

  it('keeps proposal-to-approval on the existing arbiter path', async () => {
    const socket = await joinGuest();
    const before = socket.sent.length;
    socket.inbound({
      kind: 'CampaignProposal',
      matchId: MATCH_ID,
      ts: nowIso(),
      playerId: GUEST_ID,
      proposal: {
        proposalId: 'proposal-spend',
        campaignId: CAMPAIGN_ID,
        proposingPlayerId: GUEST_ID,
        ts: nowIso(),
        intent: {
          kind: 'SpendFunds',
          campaignId: CAMPAIGN_ID,
          intentId: 'intent-spend',
          payload: { amount: 50_000, reason: 'Ammo' },
        },
      },
    });
    await drain(function () {
      return (
        socket.sent.length > before &&
        socket.sent.some(function (message) {
          return isCommittedDecision(message);
        }) &&
        socket.sent.some(function (message) {
          return (
            message.kind === 'CampaignEvent' &&
            message.event.type === 'FundsChanged'
          );
        })
      );
    });
    expect(socket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'CampaignDecision',
        proposalId: 'proposal-spend',
        result: expect.objectContaining({ status: 'committed' }),
      }),
    );
    const grantId = activeGuestGrantId();
    const replicaState = await replica.readReplicaState(CAMPAIGN_ID, grantId);
    expect(replicaState.state.balance).toBe(950_000);
  });

  it('keeps readReplicaState in agreement with the applied guest mirror', async () => {
    const entry = registry.get(MATCH_ID);
    expect(entry).not.toBeNull();
    await entry!.host.applyHostIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'pre-join-day',
      payload: { days: 1 },
    });
    const socket = await joinGuest();
    const grantId = activeGuestGrantId();
    await expect(guestMirrorAgreesWithReplica(socket, grantId)).resolves.toBe(
      true,
    );

    const beforeLive = socket.sent.length;
    await entry!.host.applyHostIntent({
      kind: 'SpendFunds',
      campaignId: CAMPAIGN_ID,
      intentId: 'live-spend',
      payload: { amount: 10_000, reason: 'Parts' },
    });
    await drain(function () {
      return socket.sent.length > beforeLive;
    });
    await expect(guestMirrorAgreesWithReplica(socket, grantId)).resolves.toBe(
      true,
    );
  });

  it('does not issue a grant for an unknown room code', async () => {
    const socket = new MockWireSocket();
    await bindGuest(socket);
    const before = socket.sent.length;
    socket.inbound({
      ...joinEnvelope(),
      roomCode: 'WRONGX',
    });
    await drain(function () {
      return socket.sent.length > before;
    });
    expect(socket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'Error',
        code: 'UNKNOWN_MATCH',
        reason: 'unknown-room-code',
      }),
    );
    expect(harness.grantStore.listGrants(CAMPAIGN_ID)).toHaveLength(0);
  });

  it('binds seats before streaming, refuses the third guest, and admits a seated rejoin', async () => {
    const membership = tacticalSeatMembership();
    const first = await joinGuest('pid_first', membership);
    await joinGuest('pid_second', membership);
    expect(framesOf(first, 'CampaignSnapshot')).toHaveLength(1);

    const refused = new MockWireSocket();
    await bindGuest(refused, 'pid_third', membership);
    refused.inbound(joinEnvelope('pid_third'));
    await drain(function () {
      return refused.closes.length > 0;
    });

    expect(framesOf(refused, 'CampaignSnapshot')).toHaveLength(0);
    expect(refused.sent).toEqual([
      expect.objectContaining({
        kind: 'Error',
        code: 'AUTH_REJECTED',
        reason: 'campaign-tactical-seats-full',
      }),
      expect.objectContaining({
        kind: 'Close',
        code: 'AUTH_REJECTED',
        reason: 'campaign-tactical-seats-full',
      }),
    ]);

    first.close();
    const rejoin = new MockWireSocket();
    await bindGuest(rejoin, 'pid_first', membership);
    rejoin.inbound(joinEnvelope('pid_first'));
    await drain(function () {
      return framesOf(rejoin, 'CampaignSnapshot').length > 0;
    });
    expect(framesOf(rejoin, 'CampaignSnapshot')).toHaveLength(1);
  });

  it('serves a room-code guest when the durable bind reports already-bound', async () => {
    const socket = new MockWireSocket();
    const bind = jest.fn(() => ({ kind: 'already-bound' as const }));
    const membership: ICampaignSessionMembershipPort = {
      isActive: () => false,
      isRevoked: () => false,
      bind,
      revoke: () => false,
    };

    await bindGuest(socket, GUEST_ID, membership);
    socket.inbound(joinEnvelope());
    await drain(function () {
      return framesOf(socket, 'CampaignSnapshot').length > 0;
    });

    expect(framesOf(socket, 'CampaignSnapshot')).toHaveLength(1);
    expect(bind).toHaveBeenCalledWith({
      campaignId: CAMPAIGN_ID,
      sessionId: MATCH_ID,
      participantId: GUEST_ID,
      seat: 'player',
    });
  });
});

/** Binds a guest socket with grant channel, replica, and test issuer. */
async function bindGuest(
  socket: MockWireSocket,
  playerId = GUEST_ID,
  membership?: ICampaignSessionMembershipPort,
): Promise<void> {
  await bindCampaignSyncConnection({
    socket,
    registry,
    matchId: MATCH_ID,
    verifiedPlayerId: playerId,
    logger: quietLogger,
    grantChannel: harnessGrantChannel(harness, 'snapshot-plus-tail'),
    replicaStore: replica,
    roomCodeGrantIssuer: ISSUER,
    membership,
  });
}

/** Sends CampaignJoin and waits until a snapshot arrives. */
async function joinGuest(
  playerId = GUEST_ID,
  membership?: ICampaignSessionMembershipPort,
): Promise<MockWireSocket> {
  const socket = new MockWireSocket();
  await bindGuest(socket, playerId, membership);
  socket.inbound(joinEnvelope(playerId));
  await drain(function () {
    return framesOf(socket, 'CampaignSnapshot').length > 0;
  });
  return socket;
}

/** Room-code CampaignJoin envelope for the guest under test. */
function joinEnvelope(playerId = GUEST_ID) {
  return {
    kind: 'CampaignJoin' as const,
    matchId: MATCH_ID,
    ts: nowIso(),
    playerId,
    role: 'guest' as const,
    roomCode: ROOM_CODE,
  };
}

/** In-memory tactical-seat adapter with the store's re-bind semantics. */
function tacticalSeatMembership(): ICampaignSessionMembershipPort {
  const active = new Set<string>();
  return {
    isActive: (_campaignId, _sessionId, participantId) =>
      active.has(participantId),
    isRevoked: () => false,
    bind: (input) => {
      if (input.seat === 'gm') return { kind: 'bound' };
      if (active.has(input.participantId)) return { kind: 'already-bound' };
      if (active.size >= 2) {
        return { kind: 'tactical-seats-full', limit: 2 };
      }
      active.add(input.participantId);
      return { kind: 'bound' };
    },
    revoke: (input) => active.delete(input.participantId),
  };
}

/** Active grant minted for the guest on this campaign. */
function activeGuestGrantId(): string {
  const grant = harness.grantStore.listGrants(CAMPAIGN_ID).find(function (row) {
    return row.participantId === GUEST_ID && row.revokedAt === null;
  });
  if (grant === undefined) {
    throw new Error('expected an active guest grant');
  }
  return grant.grantId;
}

/** Snapshot payload state from the first CampaignSnapshot frame. */
function guestSnapshotState(
  socket: MockWireSocket,
): ICampaignAuthoritativeState {
  const frame = framesOf(socket, 'CampaignSnapshot')[0];
  if (frame === undefined) {
    throw new Error('expected a CampaignSnapshot');
  }
  const payload = frame.event.payload as {
    readonly state: ICampaignAuthoritativeState;
  };
  return payload.state;
}

/**
 * Applies guest frames into the mirror store and compares to replica
 * state. Returns a promise so callers can await the replica read.
 */
async function guestMirrorAgreesWithReplica(
  socket: MockWireSocket,
  grantId: string,
): Promise<boolean> {
  applyFramesToMirror(socket);
  const read = await replica.readReplicaState(CAMPAIGN_ID, grantId);
  const mirror = useCampaignMirrorStore.getState().campaign;
  return campaignJsonEquals(mirror, read.state);
}

/** Seeds the mirror store from CampaignSnapshot / CampaignEvent frames. */
function applyFramesToMirror(socket: MockWireSocket): void {
  const store = useCampaignMirrorStore.getState();
  store.reset();
  for (const message of socket.sent) {
    applyOneFrame(store, message);
  }
}

/** Applies one client-visible campaign frame into the mirror. */
function applyOneFrame(
  store: ReturnType<typeof useCampaignMirrorStore.getState>,
  message: IServerMessage,
): void {
  const event = campaignEventFromMessage(message);
  if (event === null) return;
  if (message.kind === 'CampaignSnapshot') {
    if (store.peers === null) {
      store.beginMirror(
        {
          hostPeerId: event.authorPlayerId,
          guestPeerId: GUEST_ID,
        },
        GUEST_ID,
      );
    }
    store.applySnapshot(event, 0);
    return;
  }
  store.applyEvent(event);
}

/** True when a CampaignDecision frame reports a committed proposal. */
function isCommittedDecision(message: IServerMessage): boolean {
  if (message.kind !== 'CampaignDecision') return false;
  const result = message.result;
  if (typeof result !== 'object' || result === null) return false;
  return Reflect.get(result, 'status') === 'committed';
}

/** Appends a gm-scope funds marker that must never reach the guest. */
async function appendGmFunds(
  host: NonNullable<ReturnType<CampaignHostRegistry['get']>>['host'],
  reason: string,
  balance: number,
): Promise<void> {
  const sequence = await host.getEventLog().nextSequence();
  await host.getEventLog().append(
    freezeCampaignEvent({
      type: 'FundsChanged',
      sequence,
      campaignId: CAMPAIGN_ID,
      ts: EVENT_TS,
      authorPlayerId: HOST_ID,
      scope: 'gm',
      payload: { delta: 0, reason, balance },
    }),
  );
}
