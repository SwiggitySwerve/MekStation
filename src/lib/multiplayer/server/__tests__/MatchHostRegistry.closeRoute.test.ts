/**
 * U21b (FN-u22a-close-route-reaches-live-host): DELETE
 * /api/multiplayer/matches/[id] reaches a live host through the shared
 * registry slot and closes it, disconnecting its sockets.
 *
 * The host is started in one module graph (the socket runtime's tsx
 * graph in server.js) and the route handler is loaded in another (Next's
 * API graph); jest.isolateModules stands in for each graph, as
 * MatchHostRegistry.globalSlot.test.ts does.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { defaultSeats } from '@/types/multiplayer/Lobby';

import type { IMatchSocket } from '../ServerMatchSocketTypes';

import {
  _resetDefaultMatchStore,
  getDefaultMatchStore,
} from '../getDefaultMatchStore';

const authMock = jest.fn();
jest.mock('@/lib/multiplayer/server/auth', () => ({
  authenticateRequest: (...args: unknown[]) => authMock(...args),
}));

type RegistryModule = typeof import('../MatchHostRegistry');
type RouteModule = typeof import('@/pages/api/multiplayer/matches/[id]');

const MATCH_ID = 'close-route-match';
const HOST_PLAYER_ID = 'pid_host';

/** Loads MatchHostRegistry in a fresh module graph and returns its exports. */
function loadRegistryModuleInNewGraph(): RegistryModule {
  let loaded: RegistryModule | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('../MatchHostRegistry') as RegistryModule;
  });
  if (!loaded) {
    throw new Error('isolated MatchHostRegistry load returned nothing');
  }
  return loaded;
}

/**
 * Loads the pages route in a fresh module graph, so it imports its own
 * copy of MatchHostRegistry, and returns its default handler.
 */
function loadCloseRouteInNewGraph(): RouteModule['default'] {
  let loaded: RouteModule | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('@/pages/api/multiplayer/matches/[id]') as RouteModule;
  });
  if (!loaded) {
    throw new Error('isolated close route load returned nothing');
  }
  return loaded.default;
}

/**
 * A socket double that records every frame the host sends (parsed) and
 * whether close() was called; readyState reads 3 (CLOSED) after close.
 */
function makeRecordingSocket(): IMatchSocket & {
  readonly frames: { readonly kind: string; readonly reason?: string }[];
  readonly closed: boolean;
} {
  const frames: { kind: string; reason?: string }[] = [];
  let closed = false;
  return {
    send(data: string) {
      frames.push(JSON.parse(data) as { kind: string; reason?: string });
    },
    close() {
      closed = true;
    },
    get readyState() {
      return closed ? 3 : 1;
    },
    frames,
    get closed() {
      return closed;
    },
  };
}

/**
 * Calls the route handler with a DELETE for MATCH_ID and returns the
 * status code and JSON body it wrote.
 */
async function deleteMatch(
  handler: RouteModule['default'],
): Promise<{ statusCode: number; body: unknown }> {
  const result = { statusCode: 0, body: undefined as unknown };
  const req = {
    method: 'DELETE',
    headers: { host: 'test.local' },
    query: { id: MATCH_ID },
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
    setHeader() {
      return this;
    },
  } as unknown as NextApiResponse;
  await handler(req, res);
  return result;
}

describe('DELETE /api/multiplayer/matches/[id] against a live host', () => {
  let liveHost: { closeMatch: () => Promise<void> } | null = null;

  beforeEach(async () => {
    _resetDefaultMatchStore();
    authMock.mockReset();
    const now = new Date().toISOString();
    await getDefaultMatchStore().createMatch({
      matchId: MATCH_ID,
      hostPlayerId: HOST_PLAYER_ID,
      playerIds: [HOST_PLAYER_ID],
      sideAssignments: [{ playerId: HOST_PLAYER_ID, side: 'player' }],
      status: 'lobby',
      createdAt: now,
      updatedAt: now,
      config: { mapRadius: 4, turnLimit: 5 },
      layout: '1v1',
      seats: defaultSeats('1v1'),
    });
  });

  afterEach(async () => {
    // Closes the host directly too, so a run where the route missed it
    // leaves no heartbeat timer behind.
    await liveHost?.closeMatch();
    liveHost = null;
    loadRegistryModuleInNewGraph()._resetMatchHostRegistry();
    _resetDefaultMatchStore();
  });

  it('closes the host the socket graph started and disconnects its sockets', async () => {
    const socketGraph = loadRegistryModuleInNewGraph();
    const host = await socketGraph.getMatchHostRegistry().getOrCreate(MATCH_ID);
    if (!host) throw new Error('expected a live host');
    liveHost = host;
    const socket = makeRecordingSocket();
    host.attachSocket(socket, HOST_PLAYER_ID);
    authMock.mockResolvedValue({
      ok: true,
      playerId: HOST_PLAYER_ID,
      publicKey: 'pk',
      token: {},
    });

    const result = await deleteMatch(loadCloseRouteInNewGraph());

    expect(result).toEqual({ statusCode: 200, body: { ok: true } });
    expect(host.isClosed()).toBe(true);
    expect(socket.closed).toBe(true);
    expect(socket.frames).toContainEqual(
      expect.objectContaining({ kind: 'Close', reason: 'Match closed' }),
    );
    expect(socketGraph.getMatchHostRegistry().get(MATCH_ID)).toBeNull();
  });
});
