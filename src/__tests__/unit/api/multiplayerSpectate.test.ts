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

import {
  _resetDefaultMatchStore,
  getDefaultMatchStore,
} from '@/lib/multiplayer/server/getDefaultMatchStore';
import handler from '@/pages/api/multiplayer/matches/[id]/spectate';
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
});
