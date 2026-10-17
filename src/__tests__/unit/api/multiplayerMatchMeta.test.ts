/**
 * B9: full match metadata is private to players and the host. Exercise the
 * real bearer verifier and durable seat shape, including the lobby-invitee
 * and spectator cases that must not unlock bootstrap/campaign secrets.
 *
 * @spec openspec/specs/player-identity/spec.md
 * @spec openspec/specs/multiplayer-server/spec.md
 */
import type { NextApiRequest, NextApiResponse } from 'next';

import { generateKeyPairSync, sign } from 'node:crypto';

import type {
  IMatchMeta,
  MatchStatus,
} from '@/lib/multiplayer/server/IMatchStore';
import type { IPlayerToken } from '@/types/multiplayer/Player';

import { canonicalTokenPayload } from '@/lib/multiplayer/server/auth';
import {
  _resetDefaultMatchStore,
  getDefaultMatchStore,
} from '@/lib/multiplayer/server/getDefaultMatchStore';
import { occupySeat } from '@/lib/multiplayer/server/lobby/lobbyStateMachine';
import { addSpectatorSeat } from '@/lib/multiplayer/server/lobby/spectatorSeats';
import { derivePlayerId } from '@/lib/multiplayer/server/playerIdFromPublicKey';
import inviteHandler from '@/pages/api/multiplayer/invites/[roomCode]';
import lobbiesHandler from '@/pages/api/multiplayer/lobbies';
import handler from '@/pages/api/multiplayer/matches/[id]';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import { encodeTokenForWire } from '@/types/multiplayer/Player';

jest.mock('@/lib/multiplayer/server/MatchHostRegistry', () => ({
  bootstrapMultiplayerServer: jest.fn().mockResolvedValue(undefined),
}));

const MATCH_ID = 'private-match';

function identity() {
  const keys = generateKeyPairSync('ed25519');
  const publicKey = keys.publicKey.export({ format: 'jwk' });
  const raw = Buffer.from(publicKey.x!, 'base64url');
  const playerId = derivePlayerId(raw);
  const payload = {
    playerId,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  };
  const token: IPlayerToken = {
    ...payload,
    publicKey: raw.toString('base64'),
    signature: sign(
      null,
      Buffer.from(canonicalTokenPayload(payload)),
      keys.privateKey,
    ).toString('base64'),
  };
  return {
    playerId,
    ref: { playerId, displayName: playerId },
    wire: encodeTokenForWire(token),
  };
}

const host = identity();
const player = identity();
const outsider = identity();

function request(
  wire?: string,
  query: Record<string, string> = { id: MATCH_ID },
) {
  const result = { statusCode: 0, body: undefined as unknown };
  const req = {
    method: 'GET',
    headers: wire ? { authorization: `Bearer ${wire}` } : {},
    query,
  } as unknown as NextApiRequest;
  const res = {
    status(code: number) {
      result.statusCode = code;
      return this;
    },
    json(body: unknown) {
      result.body = body;
      return this;
    },
  } as unknown as NextApiResponse;
  return { req, res, result };
}

async function seed(
  status: MatchStatus = 'active',
  patch: Partial<IMatchMeta> = {},
) {
  const meta: IMatchMeta = {
    matchId: MATCH_ID,
    hostPlayerId: host.playerId,
    playerIds: [host.playerId, player.playerId],
    sideAssignments: [
      { playerId: host.playerId, side: 'player' },
      { playerId: player.playerId, side: 'opponent' },
    ],
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    config: { mapRadius: 8, turnLimit: 20, fogOfWar: true },
    layout: '1v1',
    roomCode: 'ABCD23',
    seats: occupySeat(
      occupySeat(defaultSeats('1v1'), 'alpha-1', host.ref),
      'bravo-1',
      player.ref,
    ),
    unitBootstrap: [
      {
        unitId: 'hidden-opfor',
        unitRef: 'atlas-as7-d',
        side: 'opponent',
        pilotRef: 'SECRET-PILOT',
        gunnery: 2,
        piloting: 3,
        startHex: { q: 4, r: -2 },
      },
    ],
    coopCampaign: {
      campaignId: 'SECRET-CAMPAIGN',
      state: {
        ...createEmptyCampaignState('SECRET-CAMPAIGN'),
        balance: 987654321,
      },
    },
    ...patch,
  };
  await getDefaultMatchStore().createMatch(meta);
  return meta;
}

function expectDenied(result: { statusCode: number; body: unknown }) {
  expect(result.statusCode).toBe(404);
  expect(result.body).toEqual({ error: `Match not found: ${MATCH_ID}` });
  expect(JSON.stringify(result.body)).not.toMatch(
    /unitBootstrap|coopCampaign|SECRET|987654321/,
  );
}

describe('GET match metadata privacy', () => {
  beforeEach(() => _resetDefaultMatchStore());
  afterEach(() => _resetDefaultMatchStore());

  describe.each<MatchStatus>(['lobby', 'active', 'completed'])(
    '%s match',
    (status) => {
      it('returns the full metadata to a seated player', async () => {
        const meta = await seed(status);
        const { req, res, result } = request(player.wire);
        await handler(req, res);
        expect(result.statusCode).toBe(200);
        expect(result.body).toEqual({ meta });
      });

      it('hides bootstrap and campaign state from an authenticated outsider', async () => {
        await seed(status);
        const { req, res, result } = request(outsider.wire);
        await handler(req, res);
        expectDenied(result);
      });
    },
  );

  it('returns full metadata to the GM/host without a playing seat', async () => {
    const meta = await seed('active', {
      seats: addSpectatorSeat(
        occupySeat(defaultSeats('1v1'), 'alpha-1', player.ref),
        host.ref,
      ),
    });
    const { req, res, result } = request(host.wire);
    await handler(req, res);
    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ meta });
  });

  it('does not treat an open-lobby invitee as a player', async () => {
    await seed('lobby', {
      seats: occupySeat(defaultSeats('1v1'), 'alpha-1', host.ref),
    });
    const { req, res, result } = request(outsider.wire);
    await handler(req, res);
    expectDenied(result);
  });

  it('uses current seats rather than a stale playerIds roster', async () => {
    await seed('active', {
      seats: occupySeat(defaultSeats('1v1'), 'alpha-1', host.ref),
    });
    const { req, res, result } = request(player.wire);
    await handler(req, res);
    expectDenied(result);
  });

  it.each(['spectator', 'ai'] as const)(
    'does not grant full metadata to a %s occupant',
    async (kind) => {
      await seed('active', {
        seats: defaultSeats('1v1').map((seat) => ({
          ...seat,
          kind,
          occupant: outsider.ref,
        })),
      });
      const { req, res, result } = request(outsider.wire);
      await handler(req, res);
      expectDenied(result);
    },
  );

  it('uses the verified bearer identity despite client-named principal claims', async () => {
    await seed();
    const { req, res, result } = request(outsider.wire, {
      id: MATCH_ID,
      playerId: host.playerId,
      role: 'gm',
    });
    req.body = { playerId: host.playerId, role: 'gm' };
    req.headers['x-player-id'] = host.playerId;
    await handler(req, res);
    expectDenied(result);
  });

  it('preserves pre-seat membership from the stored player roster', async () => {
    const meta = await seed('active', { seats: undefined });
    const { req, res, result } = request(player.wire);
    await handler(req, res);
    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ meta });
  });

  it('does not grant outsiders pre-seat roster access', async () => {
    await seed('active', { seats: undefined });
    const { req, res, result } = request(outsider.wire);
    await handler(req, res);
    expectDenied(result);
  });

  it.each([undefined, 'invalid'])(
    'refuses a missing or invalid bearer (%s)',
    async (wire) => {
      await seed();
      const { req, res, result } = request(wire);
      await handler(req, res);
      expect(result.statusCode).toBe(401);
      expect(result.body).toEqual({ error: 'Unauthorized: malformed' });
    },
  );

  it('makes an unknown match indistinguishable from a forbidden one', async () => {
    const { req, res, result } = request(outsider.wire);
    await handler(req, res);
    expectDenied(result);
  });

  it('keeps public discovery and room-code resolution available without full metadata', async () => {
    await seed('lobby', {
      seats: occupySeat(defaultSeats('1v1'), 'alpha-1', host.ref),
    });
    const listing = request(outsider.wire, {});
    await lobbiesHandler(listing.req, listing.res);
    expect(listing.result.statusCode).toBe(200);
    expect(listing.result.body).toMatchObject({
      lobbies: [{ matchId: MATCH_ID, roomCode: 'ABCD23' }],
    });
    const invite = request(undefined, { roomCode: 'ABCD23' });
    await inviteHandler(invite.req, invite.res);
    expect(invite.result.statusCode).toBe(200);
    expect(invite.result.body).toEqual({
      matchId: MATCH_ID,
      status: 'lobby',
      layout: '1v1',
    });
    expect(
      JSON.stringify([listing.result.body, invite.result.body]),
    ).not.toMatch(/unitBootstrap|coopCampaign|SECRET|987654321/);
  });
});
