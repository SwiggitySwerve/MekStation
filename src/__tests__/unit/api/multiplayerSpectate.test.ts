/**
 * `POST /api/multiplayer/matches/:id/spectate` endpoint tests — M3.
 *
 * Covers spectator registration: an authenticated request on an active
 * match appends a spectator seat; a lobby/completed match is rejected;
 * an unauthenticated request is `401`.
 *
 * @spec openspec/changes/add-matchmaking-and-spectator/specs/multiplayer-server/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { IPlayerRef } from '@/types/multiplayer/Player';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import {
  _resetDefaultMatchStore,
  getDefaultMatchStore,
} from '@/lib/multiplayer/server/getDefaultMatchStore';
import { getDefaultPlayerStore } from '@/lib/multiplayer/server/InMemoryPlayerStore';
import {
  addSpectatorSeat,
  MAX_SPECTATORS_PER_MATCH,
} from '@/lib/multiplayer/server/lobby/spectatorSeats';
import { ServerMatchHost } from '@/lib/multiplayer/server/ServerMatchHost';
import handler from '@/pages/api/multiplayer/matches/[id]/spectate';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { defaultSeats } from '@/types/multiplayer/Lobby';

const authMock = jest.fn();
jest.mock('@/lib/multiplayer/server/auth', () => ({
  authenticateRequest: (...args: unknown[]) => authMock(...args),
}));

const HOST: IPlayerRef = { playerId: 'pid_host', displayName: 'Host' };

interface MockResponse {
  statusCode: number;
  body: unknown;
  headers: Record<string, string | readonly string[]>;
}

function mockReqRes(opts: { method?: string; id?: string }) {
  const result: MockResponse = { statusCode: 0, body: undefined, headers: {} };
  const req = {
    method: opts.method ?? 'POST',
    headers: { host: 'test.local' },
    query: { id: opts.id ?? 'm1' },
  } as unknown as NextApiRequest;
  const res = {
    status(code: number) {
      result.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      result.body = payload;
      return this;
    },
    setHeader(name: string, value: string | readonly string[]) {
      result.headers[name] = value;
      return this;
    },
  } as unknown as NextApiResponse;
  return { req, res, result };
}

async function seedMatch(
  matchId: string,
  status: 'lobby' | 'active' | 'completed',
): Promise<void> {
  const store = getDefaultMatchStore();
  const now = new Date().toISOString();
  await store.createMatch({
    matchId,
    hostPlayerId: HOST.playerId,
    playerIds: [HOST.playerId],
    sideAssignments: [{ playerId: HOST.playerId, side: 'player' }],
    status,
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 8, turnLimit: 20, fogOfWar: false },
    layout: '1v1',
    seats: defaultSeats('1v1'),
  });
}

describe('POST /api/multiplayer/matches/:id/spectate', () => {
  it('admits a new spectator at the cap after a middle viewer detaches with a unique slot', async () => {
    await seedMatch('capacity-reuse', 'active');
    const store = getDefaultMatchStore();
    const meta = await store.getMatchMeta('capacity-reuse');
    let seats = [...(meta.seats ?? [])];
    for (let index = 0; index < MAX_SPECTATORS_PER_MATCH; index++) {
      seats = addSpectatorSeat(seats, {
        playerId: `watch-${index}`,
        displayName: `Watch ${index}`,
      });
    }
    await store.updateMatchMeta(meta.matchId, { seats });
    const host = ServerMatchHost.create(meta.matchId, store, {
      mapRadius: 8,
      turnLimit: 20,
      random: new SeededRandom(42),
      grid: createMinimalGrid(8),
      playerUnits: [],
      opponentUnits: [],
      gameUnits: [],
    });
    await Promise.resolve();
    await Promise.resolve();
    authMock.mockResolvedValue({
      ok: true,
      playerId: 'new-watcher',
      publicKey: 'pk',
      token: {},
    });
    const full = mockReqRes({ id: meta.matchId });
    await handler(full.req, full.res);
    expect(full.result.statusCode).toBe(409);
    const socket = { send(_data: string) {}, close() {}, readyState: 1 };
    expect(await host.admitSocket(socket, 'watch-4')).not.toBeNull();
    host.detachSocket(socket);
    await host.handleIntent({
      kind: 'Intent',
      matchId: meta.matchId,
      playerId: HOST.playerId,
      ts: meta.createdAt,
      intent: { kind: 'SetReady', slotId: 'missing', ready: true },
    });
    const next = mockReqRes({ id: meta.matchId });
    await handler(next.req, next.res);
    expect(next.result.statusCode).toBe(201);
    expect(next.result.body).toMatchObject({ slotId: 'spectator-5' });
    const after = (await store.getMatchMeta(meta.matchId)).seats ?? [];
    expect(new Set(after.map((seat) => seat.slotId)).size).toBe(after.length);
    await host.closeMatch();
  });

  it('refuses a match completed through gameplay without adding a spectator', async () => {
    await seedMatch('finished-game', 'active');
    const store = getDefaultMatchStore();
    const host = ServerMatchHost.create('finished-game', store, {
      mapRadius: 8,
      turnLimit: 20,
      random: new SeededRandom(42),
      grid: createMinimalGrid(8),
      playerUnits: [],
      opponentUnits: [],
      gameUnits: [],
    });
    await Promise.resolve();
    await Promise.resolve();
    await host.handleIntent({
      kind: 'Intent',
      matchId: 'finished-game',
      ts: new Date().toISOString(),
      playerId: HOST.playerId,
      intent: { kind: 'ForfeitMatch' },
    });
    const before = await store.getMatchMeta('finished-game');
    authMock.mockResolvedValue({
      ok: true,
      playerId: 'pid_watcher',
      publicKey: 'pk',
      token: {},
    });
    const { req, res, result } = mockReqRes({ id: 'finished-game' });
    await handler(req, res);
    expect(result.statusCode).toBe(409);
    expect((await store.getMatchMeta('finished-game')).seats).toEqual(
      before.seats,
    );
  });

  beforeEach(() => {
    _resetDefaultMatchStore();
    authMock.mockReset();
  });

  it('appends a spectator seat for an active match', async () => {
    authMock.mockResolvedValue({
      ok: true,
      playerId: 'pid_watcher',
      publicKey: 'pk',
      token: {},
    });
    await seedMatch('m1', 'active');
    const { req, res, result } = mockReqRes({ id: 'm1' });
    await handler(req, res);
    expect(result.statusCode).toBe(201);
    const body = result.body as { slotId: string; wsUrl: string };
    expect(body.slotId).toMatch(/^spectator-\d+$/);
    expect(body.wsUrl).toContain('matchId=m1');

    const meta = await getDefaultMatchStore().getMatchMeta('m1');
    const spectator = (meta.seats ?? []).find((s) => s.kind === 'spectator');
    expect(spectator?.occupant?.playerId).toBe('pid_watcher');
  });

  it('rejects spectating a lobby match with 409', async () => {
    authMock.mockResolvedValue({
      ok: true,
      playerId: 'pid_watcher',
      publicKey: 'pk',
      token: {},
    });
    await seedMatch('m-lobby', 'lobby');
    const { req, res, result } = mockReqRes({ id: 'm-lobby' });
    await handler(req, res);
    expect(result.statusCode).toBe(409);
  });

  it('rejects an unauthenticated request with 401', async () => {
    authMock.mockResolvedValue({ ok: false, reason: 'malformed' });
    await seedMatch('m1', 'active');
    const { req, res, result } = mockReqRes({ id: 'm1' });
    await handler(req, res);
    expect(result.statusCode).toBe(401);
  });

  it('404s an unknown match', async () => {
    authMock.mockResolvedValue({
      ok: true,
      playerId: 'pid_watcher',
      publicKey: 'pk',
      token: {},
    });
    const { req, res, result } = mockReqRes({ id: 'nope' });
    await handler(req, res);
    expect(result.statusCode).toBe(404);
  });

  describe('registration racing another seat write (M-H2 compare-and-swap)', () => {
    /** Holds the first registration inside its profile bootstrap. */
    function gateFirstBootstrap() {
      const players = getDefaultPlayerStore();
      const original = players.getOrCreatePlayer.bind(players);
      let release = () => {};
      let entered = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const reached = new Promise<void>((resolve) => {
        entered = resolve;
      });
      jest
        .spyOn(players, 'getOrCreatePlayer')
        .mockImplementationOnce(async (input) => {
          entered();
          await gate;
          return original(input);
        });
      return { reached, release };
    }

    const watcher = (playerId: string) => ({
      ok: true,
      playerId,
      publicKey: 'pk',
      token: {},
    });

    afterEach(() => jest.restoreAllMocks());

    it('keeps both spectators when two registrations overlap', async () => {
      await seedMatch('overlap', 'active');
      authMock
        .mockResolvedValueOnce(watcher('watch-a'))
        .mockResolvedValueOnce(watcher('watch-b'));
      const { reached, release } = gateFirstBootstrap();
      const first = mockReqRes({ id: 'overlap' });
      const pending = handler(first.req, first.res);
      await reached;

      const second = mockReqRes({ id: 'overlap' });
      await handler(second.req, second.res);
      release();
      await pending;

      expect(first.result.statusCode).toBe(201);
      expect(second.result.statusCode).toBe(201);
      const seats =
        (await getDefaultMatchStore().getMatchMeta('overlap')).seats ?? [];
      expect(
        seats
          .filter((seat) => seat.kind === 'spectator')
          .map((seat) => seat.occupant?.playerId)
          .sort(),
      ).toEqual(['watch-a', 'watch-b']);
      expect(new Set(seats.map((seat) => seat.slotId)).size).toBe(seats.length);
    });

    it('refuses a registration whose match completes before the seat is written', async () => {
      await seedMatch('ends-midway', 'active');
      authMock.mockResolvedValueOnce(watcher('watch-a'));
      const { reached, release } = gateFirstBootstrap();
      const first = mockReqRes({ id: 'ends-midway' });
      const pending = handler(first.req, first.res);
      await reached;

      await getDefaultMatchStore().closeMatch('ends-midway');
      release();
      await pending;

      expect(first.result.statusCode).toBe(409);
      const meta = await getDefaultMatchStore().getMatchMeta('ends-midway');
      expect(meta.status).toBe('completed');
      expect(meta.seats?.some((seat) => seat.kind === 'spectator')).toBe(false);
    });
  });
});
