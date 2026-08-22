/**
 * Socket admission + revocation contract (authority-audit PR 2).
 *
 * Pins (the 2.1 failing-first set, now green): a verified but
 * NON-MEMBER principal is refused at admission with a typed
 * AUTH_REJECTED Error + Close as the ONLY frames ever sent (no
 * baseline, replay, lobby, or event payload precedes the resolver
 * verdict) and never attaches; a seated member admits and attaches; a
 * lobby mutation that vacates a member's seat closes that member's
 * socket immediately (revocation closes subsequent publication and
 * reconnect) while a healthy authorized member stays attached and a
 * reconnect attempt by the revoked member is refused; membership
 * derives from durable seats/roster only.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/authority-history/spec.md
 */

import type { IGameUnit } from '@/types/gameplay';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { defaultSeats } from '@/types/multiplayer/Lobby';

import { InMemoryMatchStore } from '../../InMemoryMatchStore';
import { ServerMatchHost, type IMatchSocket } from '../../ServerMatchHost';
import { MatchSeatMembershipSource } from '../MatchSeatMembershipSource';

interface IRecorded {
  parsed: { kind: string; code?: string };
}

function makeMockSocket(): IMatchSocket & {
  sent: IRecorded[];
  closed: boolean;
} {
  const sent: IRecorded[] = [];
  const socket = {
    send(data: string) {
      sent.push({ parsed: JSON.parse(data) as { kind: string } });
    },
    close() {
      socket.closed = true;
    },
    get readyState() {
      return 1;
    },
    sent,
    closed: false,
  } as IMatchSocket & { sent: IRecorded[]; closed: boolean };
  return socket;
}

async function makeSeatedHost(): Promise<{
  host: ServerMatchHost;
  store: InMemoryMatchStore;
  matchId: string;
}> {
  const store = new InMemoryMatchStore({ quiet: true });
  const matchId = 'match-admission';
  const now = new Date().toISOString();
  await store.createMatch({
    matchId,
    hostPlayerId: 'pid_host',
    playerIds: ['pid_host', 'pid_guest'],
    sideAssignments: [
      { playerId: 'pid_host', side: 'player' },
      { playerId: 'pid_guest', side: 'opponent' },
    ],
    status: 'lobby',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
    layout: '1v1',
    seats: defaultSeats('1v1').map((seat) => {
      if (seat.slotId === 'alpha-1')
        return {
          ...seat,
          occupant: { playerId: 'pid_host', displayName: 'Host' },
        };
      if (seat.slotId === 'bravo-1')
        return {
          ...seat,
          occupant: { playerId: 'pid_guest', displayName: 'Guest' },
        };
      return seat;
    }),
    roomCode: 'ADMITX',
  });

  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(7),
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: [] as readonly IGameUnit[],
  });
  await Promise.resolve();
  await Promise.resolve();
  return { host, store, matchId };
}

describe('membership-gated socket admission', () => {
  it('a verified non-member is refused with typed frames only and never attaches', async () => {
    const { host, store, matchId } = await makeSeatedHost();
    // Post-lobby: occupancy IS membership; a stranger has no path in.
    await store.updateMatchMeta(matchId, { status: 'active' });
    const socket = makeMockSocket();

    const viewer = await host.admitSocket(socket, 'pid_stranger');
    expect(viewer).toBeNull();
    expect(socket.closed).toBe(true);
    // The ONLY frames ever sent: typed Error then Close. No baseline,
    // replay, lobby, or event payload preceded the resolver verdict.
    expect(socket.sent.map((frame) => frame.parsed.kind)).toEqual([
      'Error',
      'Close',
    ]);
    expect(socket.sent[0]?.parsed.code).toBe('AUTH_REJECTED');
  });

  it('a seated member admits, attaches, and carries seat-derived scope', async () => {
    const { host } = await makeSeatedHost();
    const socket = makeMockSocket();

    const viewer = await host.admitSocket(socket, 'pid_guest');
    expect(viewer).not.toBeNull();
    expect(viewer?.participantId).toBe('bravo-1');
    expect(viewer?.ownedForceIds).toEqual(['bravo-1']);
    expect(viewer?.role).toBe('player');
    expect(socket.closed).toBe(false);
    expect(socket.sent).toEqual([]);
  });

  it('membership derives from durable seats - a store change is the revocation', async () => {
    const { host, store, matchId } = await makeSeatedHost();
    const hostSocket = makeMockSocket();
    const guestSocket = makeMockSocket();
    expect(await host.admitSocket(hostSocket, 'pid_host')).not.toBeNull();
    expect(await host.admitSocket(guestSocket, 'pid_guest')).not.toBeNull();

    // Post-lobby, occupancy IS membership: start the match, then
    // durably vacate the guest's seat and revalidate (the lobby
    // dispatcher runs this after every mutation).
    const meta = await store.getMatchMeta(matchId);
    await store.updateMatchMeta(matchId, {
      status: 'active',
      seats: (meta.seats ?? []).map((seat) =>
        seat.slotId === 'bravo-1' ? { ...seat, occupant: null } : seat,
      ),
    });
    await host.revalidateAttachedViewers();

    // Revoked member: typed close, socket closed.
    expect(guestSocket.closed).toBe(true);
    expect(
      guestSocket.sent.some(
        (frame) =>
          frame.parsed.kind === 'Close' &&
          frame.parsed.code === 'AUTH_REJECTED',
      ),
    ).toBe(true);
    // Healthy control member: untouched.
    expect(hostSocket.closed).toBe(false);

    // Reconnect by the revoked member is refused at admission.
    const reconnect = makeMockSocket();
    expect(await host.admitSocket(reconnect, 'pid_guest')).toBeNull();
    expect(reconnect.closed).toBe(true);

    // The healthy member can still re-admit (control).
    const hostReconnect = makeMockSocket();
    expect(await host.admitSocket(hostReconnect, 'pid_host')).not.toBeNull();
  });

  it('a verified room-code joiner admits during lobby BEFORE occupying a seat', async () => {
    const { host, store, matchId } = await makeSeatedHost();
    // Open a joinable human seat (vacate bravo-1) while still in lobby.
    const meta = await store.getMatchMeta(matchId);
    await store.updateMatchMeta(matchId, {
      seats: (meta.seats ?? []).map((seat) =>
        seat.slotId === 'bravo-1' ? { ...seat, occupant: null } : seat,
      ),
    });

    const socket = makeMockSocket();
    const viewer = await host.admitSocket(socket, 'pid_joiner');
    // Lobby invitee: member with no owned forces until OccupySeat.
    expect(viewer).not.toBeNull();
    expect(viewer?.ownedForceIds).toEqual([]);
    expect(socket.closed).toBe(false);

    // Once the match starts without them, the invitee path closes.
    await store.updateMatchMeta(matchId, { status: 'active' });
    const late = makeMockSocket();
    expect(await host.admitSocket(late, 'pid_joiner')).toBeNull();
  });

  it('an attached invitee is kicked when the last joinable seat fills', async () => {
    const { host, store, matchId } = await makeSeatedHost();
    const meta = await store.getMatchMeta(matchId);
    await store.updateMatchMeta(matchId, {
      seats: (meta.seats ?? []).map((seat) =>
        seat.slotId === 'bravo-1' ? { ...seat, occupant: null } : seat,
      ),
    });
    const inviteeSocket = makeMockSocket();
    expect(await host.admitSocket(inviteeSocket, 'pid_watcher')).not.toBeNull();

    // Someone else takes the last open human seat.
    const open = await store.getMatchMeta(matchId);
    await store.updateMatchMeta(matchId, {
      seats: (open.seats ?? []).map((seat) =>
        seat.slotId === 'bravo-1'
          ? {
              ...seat,
              occupant: { playerId: 'pid_faster', displayName: 'Faster' },
            }
          : seat,
      ),
    });
    await host.revalidateAttachedViewers();
    expect(inviteeSocket.closed).toBe(true);
  });

  it('a status-only transition changes the membership epoch', async () => {
    const { store, matchId } = await makeSeatedHost();
    const source = new MatchSeatMembershipSource(store);
    const lobbyEpoch = await source.currentMembershipRevision(matchId);
    await store.updateMatchMeta(matchId, { status: 'active' });
    const activeEpoch = await source.currentMembershipRevision(matchId);
    expect(activeEpoch).not.toBe(lobbyEpoch);
  });

  it('an AI seat with a leftover occupant never mints membership', async () => {
    const { store, matchId } = await makeSeatedHost();
    const meta = await store.getMatchMeta(matchId);
    await store.updateMatchMeta(matchId, {
      status: 'active',
      seats: (meta.seats ?? []).map((seat) =>
        seat.slotId === 'bravo-1'
          ? {
              ...seat,
              kind: 'ai' as const,
              occupant: { playerId: 'pid_guest', displayName: 'Ghost' },
            }
          : seat,
      ),
    });
    const source = new MatchSeatMembershipSource(store);
    expect(await source.lookupMembership('pid_guest', matchId)).toBeNull();
  });

  it('an infrastructure failure is NOT revocation - attached members stay', async () => {
    const { host, store, matchId } = await makeSeatedHost();
    const socket = makeMockSocket();
    expect(await host.admitSocket(socket, 'pid_guest')).not.toBeNull();

    // Break the store AFTER admission.
    const originalGet = store.getMatchMeta;
    store.getMatchMeta = async () => {
      throw new Error('disk exploded');
    };
    await host.revalidateAttachedViewers();
    expect(socket.closed).toBe(false);

    // But NEW admission fails closed with an infra close, not an auth
    // verdict.
    const fresh = makeMockSocket();
    expect(await host.admitSocket(fresh, 'pid_host')).toBeNull();
    expect(fresh.closed).toBe(true);
    expect(
      fresh.sent.some(
        (frame) =>
          frame.parsed.kind === 'Close' &&
          frame.parsed.code === 'INTERNAL_ERROR',
      ),
    ).toBe(true);
    store.getMatchMeta = originalGet;
    void matchId;
  });

  it('the seat membership source is durable-state-only', async () => {
    const { store, matchId } = await makeSeatedHost();
    const source = new MatchSeatMembershipSource(store);

    const guest = await source.lookupMembership('pid_guest', matchId);
    expect(guest?.participantId).toBe('bravo-1');
    expect(guest?.principalKind).toBe('human');

    const stranger = await source.lookupMembership('pid_stranger', matchId);
    expect(stranger).toBeNull();

    const unknownMatch = await source.lookupMembership(
      'pid_guest',
      'no-such-match',
    );
    expect(unknownMatch).toBeNull();

    // The epoch changes exactly when durable membership changes.
    const before = await source.currentMembershipRevision(matchId);
    const meta = await store.getMatchMeta(matchId);
    await store.updateMatchMeta(matchId, {
      seats: (meta.seats ?? []).map((seat) =>
        seat.slotId === 'bravo-1' ? { ...seat, occupant: null } : seat,
      ),
    });
    const after = await source.currentMembershipRevision(matchId);
    expect(after).not.toBe(before);
  });
});
