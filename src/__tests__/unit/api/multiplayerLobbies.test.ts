/**
 * `GET /api/multiplayer/lobbies` endpoint tests — M3.
 *
 * Covers the Joinable-Lobby Endpoint requirement: an authenticated
 * request returns the joinable-lobby projection; an unauthenticated
 * request is rejected `401`.
 *
 * @spec openspec/changes/add-matchmaking-and-spectator/specs/multiplayer-matchmaking/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { IPlayerRef } from '@/types/multiplayer/Player';

import {
  _resetDefaultMatchStore,
  getDefaultMatchStore,
} from '@/lib/multiplayer/server/getDefaultMatchStore';
import { occupySeat } from '@/lib/multiplayer/server/lobby/lobbyStateMachine';
import handler from '@/pages/api/multiplayer/lobbies';
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

function mockReqRes(opts: { method?: string; query?: Record<string, string> }) {
  const result: MockResponse = { statusCode: 0, body: undefined, headers: {} };
  const req = {
    method: opts.method ?? 'GET',
    headers: {},
    query: opts.query ?? {},
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

async function seedLobby(matchId: string, roomCode: string): Promise<void> {
  const store = getDefaultMatchStore();
  const now = new Date().toISOString();
  await store.createMatch({
    matchId,
    hostPlayerId: HOST.playerId,
    playerIds: [HOST.playerId],
    sideAssignments: [{ playerId: HOST.playerId, side: 'player' }],
    status: 'lobby',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 8, turnLimit: 20, fogOfWar: false },
    layout: '1v1',
    seats: occupySeat(defaultSeats('1v1'), 'alpha-1', HOST),
    roomCode,
  });
}

describe('GET /api/multiplayer/lobbies', () => {
  beforeEach(() => {
    _resetDefaultMatchStore();
    authMock.mockReset();
  });

  it('returns the joinable-lobby projection for an authenticated request', async () => {
    // Scenario: Authenticated request returns lobbies.
    authMock.mockResolvedValue({
      ok: true,
      playerId: 'pid_viewer',
      publicKey: 'pk',
      token: {},
    });
    await seedLobby('m1', 'CODE01');
    const { req, res, result } = mockReqRes({});
    await handler(req, res);
    expect(result.statusCode).toBe(200);
    const body = result.body as { lobbies: Array<{ roomCode: string }> };
    expect(body.lobbies).toHaveLength(1);
    expect(body.lobbies[0].roomCode).toBe('CODE01');
  });

  it('rejects an unauthenticated request with 401', async () => {
    // Scenario: Unauthenticated request rejected.
    authMock.mockResolvedValue({ ok: false, reason: 'malformed' });
    const { req, res, result } = mockReqRes({});
    await handler(req, res);
    expect(result.statusCode).toBe(401);
  });

  it('includes spectatable matches when requested', async () => {
    authMock.mockResolvedValue({
      ok: true,
      playerId: 'pid_viewer',
      publicKey: 'pk',
      token: {},
    });
    const store = getDefaultMatchStore();
    const now = new Date().toISOString();
    await store.createMatch({
      matchId: 'm-live',
      hostPlayerId: HOST.playerId,
      playerIds: [HOST.playerId],
      sideAssignments: [{ playerId: HOST.playerId, side: 'player' }],
      status: 'active',
      createdAt: now,
      updatedAt: now,
      config: { mapRadius: 8, turnLimit: 20, fogOfWar: false },
      layout: '1v1',
      seats: defaultSeats('1v1'),
    });
    const { req, res, result } = mockReqRes({
      query: { include: 'spectatable' },
    });
    await handler(req, res);
    expect(result.statusCode).toBe(200);
    const body = result.body as {
      spectatable: Array<{ matchId: string }>;
    };
    expect(body.spectatable).toHaveLength(1);
    expect(body.spectatable[0].matchId).toBe('m-live');
  });

  it('405s a non-GET method', async () => {
    const { req, res, result } = mockReqRes({ method: 'POST' });
    await handler(req, res);
    expect(result.statusCode).toBe(405);
  });
});
