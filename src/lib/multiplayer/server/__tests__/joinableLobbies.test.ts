/**
 * Joinable-lobby + spectatable-match query tests — M3.
 *
 * Covers design D2: a joinable lobby is `status: 'lobby'` with at least
 * one open human seat; a full lobby and a launched match are excluded.
 * Spectatable matches are `status: 'active'` only.
 *
 * @spec openspec/changes/add-matchmaking-and-spectator/specs/multiplayer-matchmaking/spec.md
 */

import type { IPlayerRef } from '@/types/multiplayer/Player';

import {
  defaultSeats,
  type IMatchSeat,
  type TeamLayout,
} from '@/types/multiplayer/Lobby';

import type { IMatchMeta, MatchStatus } from '../IMatchStore';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { getJoinableLobbies, getSpectatableMatches } from '../joinableLobbies';
import { occupySeat } from '../lobby/lobbyStateMachine';
import { addSpectatorSeat } from '../lobby/spectatorSeats';

const HOST: IPlayerRef = { playerId: 'pid_host', displayName: 'Host' };
const GUEST: IPlayerRef = { playerId: 'pid_guest', displayName: 'Guest' };

function makeMeta(opts: {
  matchId: string;
  status: MatchStatus;
  layout: TeamLayout;
  seats: readonly IMatchSeat[];
  roomCode?: string;
  fogOfWar?: boolean;
  createdAt?: string;
}): IMatchMeta {
  const now = opts.createdAt ?? new Date().toISOString();
  return {
    matchId: opts.matchId,
    hostPlayerId: HOST.playerId,
    playerIds: [HOST.playerId],
    sideAssignments: [{ playerId: HOST.playerId, side: 'player' }],
    status: opts.status,
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 8, turnLimit: 20, fogOfWar: opts.fogOfWar ?? false },
    layout: opts.layout,
    seats: opts.seats,
    roomCode: opts.status === 'lobby' ? opts.roomCode : undefined,
  };
}

describe('getJoinableLobbies', () => {
  it('returns an open lobby with layout, host, and occupancy', async () => {
    // Scenario: Open lobby is listed.
    const store = new InMemoryMatchStore({ quiet: true });
    const seats = occupySeat(defaultSeats('1v1'), 'alpha-1', HOST);
    await store.createMatch(
      makeMeta({
        matchId: 'm-open',
        status: 'lobby',
        layout: '1v1',
        seats,
        roomCode: 'ABC123',
      }),
    );

    const lobbies = await getJoinableLobbies(store);
    expect(lobbies).toHaveLength(1);
    expect(lobbies[0]).toMatchObject({
      matchId: 'm-open',
      roomCode: 'ABC123',
      layout: '1v1',
      hostDisplayName: 'Host',
    });
    expect(lobbies[0].occupancy).toMatchObject({
      humanSeats: 2,
      occupiedHumanSeats: 1,
      openHumanSeats: 1,
    });
  });

  it('excludes a full lobby', async () => {
    // Scenario: Full lobby is excluded.
    const store = new InMemoryMatchStore({ quiet: true });
    let seats = occupySeat(defaultSeats('1v1'), 'alpha-1', HOST);
    seats = occupySeat(seats, 'bravo-1', GUEST);
    await store.createMatch(
      makeMeta({
        matchId: 'm-full',
        status: 'lobby',
        layout: '1v1',
        seats,
        roomCode: 'FULL01',
      }),
    );
    expect(await getJoinableLobbies(store)).toHaveLength(0);
  });

  it('excludes a launched (active) match', async () => {
    // Scenario: Launched match is excluded.
    const store = new InMemoryMatchStore({ quiet: true });
    const seats = occupySeat(defaultSeats('1v1'), 'alpha-1', HOST);
    await store.createMatch(
      makeMeta({
        matchId: 'm-active',
        status: 'active',
        layout: '1v1',
        seats,
      }),
    );
    expect(await getJoinableLobbies(store)).toHaveLength(0);
  });

  it('a spectator seat does not make a full lobby joinable', async () => {
    const store = new InMemoryMatchStore({ quiet: true });
    let seats = occupySeat(defaultSeats('1v1'), 'alpha-1', HOST);
    seats = occupySeat(seats, 'bravo-1', GUEST);
    seats = addSpectatorSeat(seats, {
      playerId: 'pid_w',
      displayName: 'W',
    });
    await store.createMatch(
      makeMeta({
        matchId: 'm-fullspec',
        status: 'lobby',
        layout: '1v1',
        seats,
        roomCode: 'SPEC01',
      }),
    );
    expect(await getJoinableLobbies(store)).toHaveLength(0);
  });

  it('orders newest lobby first', async () => {
    const store = new InMemoryMatchStore({ quiet: true });
    const seats = occupySeat(defaultSeats('1v1'), 'alpha-1', HOST);
    await store.createMatch(
      makeMeta({
        matchId: 'm-old',
        status: 'lobby',
        layout: '1v1',
        seats,
        roomCode: 'OLD001',
        createdAt: '2026-05-01T00:00:00.000Z',
      }),
    );
    await store.createMatch(
      makeMeta({
        matchId: 'm-new',
        status: 'lobby',
        layout: '1v1',
        seats,
        roomCode: 'NEW001',
        createdAt: '2026-05-10T00:00:00.000Z',
      }),
    );
    const lobbies = await getJoinableLobbies(store);
    expect(lobbies.map((l) => l.matchId)).toEqual(['m-new', 'm-old']);
  });
});

describe('getSpectatableMatches', () => {
  it('returns only active matches', async () => {
    const store = new InMemoryMatchStore({ quiet: true });
    const seats = occupySeat(defaultSeats('1v1'), 'alpha-1', HOST);
    await store.createMatch(
      makeMeta({
        matchId: 'm-lobby',
        status: 'lobby',
        layout: '1v1',
        seats,
        roomCode: 'LOB001',
      }),
    );
    await store.createMatch(
      makeMeta({
        matchId: 'm-live',
        status: 'active',
        layout: '2v2',
        seats: defaultSeats('2v2'),
        fogOfWar: true,
      }),
    );
    const spectatable = await getSpectatableMatches(store);
    expect(spectatable).toHaveLength(1);
    expect(spectatable[0]).toMatchObject({
      matchId: 'm-live',
      layout: '2v2',
      fogOfWar: true,
    });
  });
});
