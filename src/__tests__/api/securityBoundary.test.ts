import type { NextApiRequest, NextApiResponse } from 'next';
import type { KeyObject } from 'node:crypto';

import { createMocks } from 'node-mocks-http';
import { generateKeyPairSync, sign } from 'node:crypto';

import type { IMatchMeta } from '@/lib/multiplayer/server/IMatchStore';
import type {
  IPlayerToken,
  IPlayerTokenScope,
} from '@/types/multiplayer/Player';

const mockAuthenticateRequest = jest.fn();
const mockCreateMatch = jest.fn();
const mockListMatches = jest.fn();
const mockCloseMatch = jest.fn();
const mockGetMatchByRoomCode = jest.fn();
const mockGetOrCreatePlayer = jest.fn();
const mockGetActive = jest.fn();
const mockUnlockIdentity = jest.fn();
const mockFromBase64 = jest.fn();
const mockSignData = jest.fn();

jest.mock('@/lib/multiplayer/server/auth', () => {
  const actual = jest.requireActual('@/lib/multiplayer/server/auth');
  return {
    ...actual,
    authenticateRequest: (...args: readonly unknown[]) =>
      mockAuthenticateRequest(...args),
  };
});

jest.mock('@/lib/multiplayer/server/getDefaultMatchStore', () => ({
  getDefaultMatchStore: () => ({
    closeMatch: mockCloseMatch,
    createMatch: mockCreateMatch,
    getMatchByRoomCode: (...args: readonly unknown[]) =>
      mockGetMatchByRoomCode(...args),
    listMatches: mockListMatches,
  }),
}));

jest.mock('@/lib/multiplayer/server/InMemoryPlayerStore', () => ({
  getDefaultPlayerStore: () => ({
    getOrCreatePlayer: mockGetOrCreatePlayer,
  }),
}));

jest.mock('@/services/vault/IdentityRepository', () => ({
  getIdentityRepository: () => ({
    getActive: mockGetActive,
  }),
}));

jest.mock('@/services/vault/IdentityService', () => ({
  fromBase64: (...args: readonly unknown[]) => mockFromBase64(...args),
  signData: (...args: readonly unknown[]) => mockSignData(...args),
  unlockIdentity: (...args: readonly unknown[]) => mockUnlockIdentity(...args),
}));

import { canonicalTokenPayload } from '@/lib/multiplayer/server/auth';
import { InMemoryMatchStore } from '@/lib/multiplayer/server/InMemoryMatchStore';
import { occupySeat } from '@/lib/multiplayer/server/lobby/lobbyStateMachine';
import { derivePlayerId } from '@/lib/multiplayer/server/playerIdFromPublicKey';
import tokenHandler from '@/pages/api/multiplayer/auth/token';
import inviteHandler from '@/pages/api/multiplayer/invites/[roomCode]';
import matchesHandler from '@/pages/api/multiplayer/matches';
import unlockHandler from '@/pages/api/vault/identity/unlock';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import { encodeTokenForWire } from '@/types/multiplayer/Player';

const storedIdentity = {
  id: 'identity-1',
  displayName: 'Host',
  publicKey: 'public-key',
  friendCode: 'ABCD-EFGH-JKLM-NPQR',
  encryptedPrivateKey: {
    ciphertext: 'encrypted',
    iv: 'iv',
    salt: 'salt',
    algorithm: 'AES-GCM-256',
  },
  createdAt: '2026-01-01T00:00:00.000Z',
};

const unlockedIdentity = {
  ...storedIdentity,
  privateKey: 'private-key',
};

function apiRequest(
  body: unknown,
  headers: Record<string, string> = {},
): {
  req: NextApiRequest;
  res: NextApiResponse;
} {
  return createMocks<NextApiRequest, NextApiResponse>({
    method: 'POST',
    headers: {
      host: 'mekstation.test',
      ...headers,
    },
    body: body as never,
  });
}

function forwardedFor(id: number): Record<string, string> {
  return { 'x-forwarded-for': `203.0.113.${id}` };
}

describe('API security boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticateRequest.mockResolvedValue({
      ok: true,
      playerId: 'pid_host',
      publicKey: 'host-public-key',
      token: {
        playerId: 'pid_host',
        issuedAt: '2026-01-01T00:00:00.000Z',
        expiresAt: '2026-01-01T01:00:00.000Z',
        publicKey: 'host-public-key',
        signature: 'signature',
      },
    });
    mockCreateMatch.mockResolvedValue('match-1');
    mockListMatches.mockResolvedValue([]);
    mockCloseMatch.mockResolvedValue(undefined);
    mockGetMatchByRoomCode.mockResolvedValue(null);
    mockGetOrCreatePlayer.mockResolvedValue({ playerId: 'pid_host' });
    mockGetActive.mockResolvedValue(storedIdentity);
    mockUnlockIdentity.mockResolvedValue(unlockedIdentity);
    mockFromBase64.mockReturnValue(new Uint8Array(32).fill(7));
    mockSignData.mockResolvedValue(new Uint8Array([1, 2, 3, 4]));
  });

  it('rejects malformed token bodies before repository or KDF work', async () => {
    const { req, res } = apiRequest(
      { password: 'x'.repeat(2048), displayName: 'Host' },
      forwardedFor(10),
    );

    await tokenHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(mockGetActive).not.toHaveBeenCalled();
    expect(mockUnlockIdentity).not.toHaveBeenCalled();
  });

  it('rate-limits token KDF work and returns Retry-After', async () => {
    let lastRes: NextApiResponse | null = null;
    for (let i = 0; i < 6; i += 1) {
      const { req, res } = apiRequest(
        { password: 'correct-password', displayName: 'Host' },
        forwardedFor(11),
      );
      await tokenHandler(req, res);
      lastRes = res;
    }

    expect(lastRes?.statusCode).toBe(429);
    expect(lastRes?.getHeader('Retry-After')).toBeDefined();
    expect(mockUnlockIdentity).toHaveBeenCalledTimes(5);
  });

  it('rejects malformed unlock bodies before repository or KDF work', async () => {
    const { req, res } = apiRequest(null, forwardedFor(20));

    await unlockHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(mockGetActive).not.toHaveBeenCalled();
    expect(mockUnlockIdentity).not.toHaveBeenCalled();
  });

  it('rate-limits identity unlock KDF work and returns Retry-After', async () => {
    let lastRes: NextApiResponse | null = null;
    for (let i = 0; i < 6; i += 1) {
      const { req, res } = apiRequest(
        { password: 'correct-password' },
        forwardedFor(21),
      );
      await unlockHandler(req, res);
      lastRes = res;
    }

    expect(lastRes?.statusCode).toBe(429);
    expect(lastRes?.getHeader('Retry-After')).toBeDefined();
    expect(mockUnlockIdentity).toHaveBeenCalledTimes(5);
  });

  it('rejects malformed match bodies before auth crypto or store work', async () => {
    const { req, res } = apiRequest(
      {
        config: { mapRadius: Number.POSITIVE_INFINITY, turnLimit: 20 },
        displayName: 'Host',
        layout: '1v1',
      },
      forwardedFor(30),
    );

    await matchesHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(mockAuthenticateRequest).not.toHaveBeenCalled();
    expect(mockGetOrCreatePlayer).not.toHaveBeenCalled();
    expect(mockCreateMatch).not.toHaveBeenCalled();
  });

  it('rate-limits match creation before store mutation', async () => {
    let lastRes: NextApiResponse | null = null;
    for (let i = 0; i < 6; i += 1) {
      const { req, res } = apiRequest(
        {
          config: { mapRadius: 8, turnLimit: 20 },
          displayName: 'Host',
          layout: '1v1',
        },
        forwardedFor(31),
      );
      await matchesHandler(req, res);
      lastRes = res;
    }

    expect(lastRes?.statusCode).toBe(429);
    expect(lastRes?.getHeader('Retry-After')).toBeDefined();
    expect(mockCreateMatch).toHaveBeenCalledTimes(5);
  });

  it('rejects per-host match creation over the lobby capacity cap', async () => {
    const now = new Date().toISOString();
    mockListMatches.mockResolvedValue(
      Array.from({ length: 5 }, (_, index) => ({
        matchId: `match-${index}`,
        hostPlayerId: 'pid_host',
        playerIds: ['pid_host'],
        sideAssignments: [{ playerId: 'pid_host', side: 'player' }],
        status: 'lobby',
        createdAt: now,
        updatedAt: now,
        config: { mapRadius: 8, turnLimit: 20 },
        roomCode: `ABC23${index}`,
      })),
    );

    const { req, res } = apiRequest(
      {
        config: { mapRadius: 8, turnLimit: 20 },
        displayName: 'Host',
        layout: '1v1',
      },
      forwardedFor(32),
    );

    await matchesHandler(req, res);

    expect(res.statusCode).toBe(429);
    expect(
      (
        (res as unknown as { _getJSONData: () => unknown })._getJSONData() as {
          code?: string;
        }
      ).code,
    ).toBe('MATCH_CAPACITY_EXCEEDED');
    expect(mockCreateMatch).not.toHaveBeenCalled();
  });

  it('reaps expired lobby matches before enforcing per-host capacity', async () => {
    const nowMs = Date.now();
    const fresh = new Date(nowMs - 5 * 60 * 1000).toISOString();
    const expired = new Date(nowMs - 25 * 60 * 60 * 1000).toISOString();
    mockListMatches.mockResolvedValue([
      {
        matchId: 'expired-lobby',
        hostPlayerId: 'pid_host',
        playerIds: ['pid_host'],
        sideAssignments: [{ playerId: 'pid_host', side: 'player' }],
        status: 'lobby',
        createdAt: expired,
        updatedAt: expired,
        config: { mapRadius: 8, turnLimit: 20 },
        roomCode: 'OLD234',
      },
      {
        matchId: 'fresh-lobby',
        hostPlayerId: 'pid_host',
        playerIds: ['pid_host'],
        sideAssignments: [{ playerId: 'pid_host', side: 'player' }],
        status: 'lobby',
        createdAt: fresh,
        updatedAt: fresh,
        config: { mapRadius: 8, turnLimit: 20 },
        roomCode: 'NEW234',
      },
    ]);

    const { req, res } = apiRequest(
      {
        config: { mapRadius: 8, turnLimit: 20 },
        displayName: 'Host',
        layout: '1v1',
      },
      forwardedFor(33),
    );

    await matchesHandler(req, res);

    expect(res.statusCode).toBe(201);
    expect(mockCloseMatch).toHaveBeenCalledWith('expired-lobby');
    expect(mockCreateMatch).toHaveBeenCalledTimes(1);
  });

  it('adds security headers on hardened route responses', async () => {
    const { req, res } = apiRequest(
      { password: 'correct-password' },
      forwardedFor(40),
    );

    await unlockHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.getHeader('X-Content-Type-Options')).toBe('nosniff');
    expect(res.getHeader('X-Frame-Options')).toBe('DENY');
    expect(res.getHeader('Referrer-Policy')).toBe('no-referrer');
  });

  describe('campaign identity invite resolution (G2-BOOT-1)', () => {
    const MATCH_ID = 'match-lobby-7';
    const CAMPAIGN_ID = 'campaign-distinct-42';
    const ROOM_CODE = 'ABCD23';
    const PLAIN_CODE = 'WXYZ23';
    const SECRET = /SECRET|987654321|unitBootstrap|coopCampaign|seats|state/;
    const keys = generateKeyPairSync('ed25519');
    const raw = Buffer.from(
      keys.publicKey.export({ format: 'jwk' }).x!,
      'base64url',
    );
    const playerId = derivePlayerId(raw);
    let store: InMemoryMatchStore;
    let seeded: IMatchMeta;

    function bearer(
      patch: {
        scope?: IPlayerTokenScope;
        expiresAt?: string;
        playerId?: string;
        signWith?: KeyObject;
      } = {},
    ): string {
      const payload = {
        playerId: patch.playerId ?? playerId,
        issuedAt: new Date(Date.now() - 120_000).toISOString(),
        expiresAt:
          patch.expiresAt ?? new Date(Date.now() + 3_600_000).toISOString(),
        ...(patch.scope ? { scope: patch.scope } : {}),
      };
      const token: IPlayerToken = {
        ...payload,
        publicKey: raw.toString('base64'),
        signature: sign(
          null,
          Buffer.from(canonicalTokenPayload(payload)),
          patch.signWith ?? keys.privateKey,
        ).toString('base64'),
      };
      return encodeTokenForWire(token);
    }

    function meta(patch: Partial<IMatchMeta> = {}): IMatchMeta {
      const now = new Date().toISOString();
      return {
        matchId: MATCH_ID,
        hostPlayerId: 'pid_SECRET_HOST',
        playerIds: ['pid_SECRET_HOST'],
        sideAssignments: [{ playerId: 'pid_SECRET_HOST', side: 'player' }],
        status: 'lobby',
        createdAt: now,
        updatedAt: now,
        config: { mapRadius: 8, turnLimit: 20 },
        layout: '1v1',
        roomCode: ROOM_CODE,
        seats: occupySeat(defaultSeats('1v1'), 'alpha-1', {
          playerId: 'pid_SECRET_HOST',
          displayName: 'SECRET-HOST',
        }),
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
          campaignId: CAMPAIGN_ID,
          state: {
            ...createEmptyCampaignState(CAMPAIGN_ID),
            balance: 987654321,
          },
        },
        ...patch,
      };
    }

    async function run(
      query: Record<string, string | string[]>,
      authorization?: string,
    ) {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { roomCode: ROOM_CODE, ...query },
        headers: authorization === undefined ? {} : { authorization },
      });
      await inviteHandler(req, res);
      const text = (res as unknown as { _getData: () => string })._getData();
      return {
        status: res.statusCode,
        body: JSON.parse(text) as Record<string, unknown>,
        text,
        cache: res.getHeader('Cache-Control'),
      };
    }

    function expectNoIdentity(
      result: Awaited<ReturnType<typeof run>>,
      status: number,
    ): void {
      expect(result.status).toBe(status);
      expect(result.cache).toBe('private, no-store');
      expect(Object.keys(result.body)).toEqual(['error']);
      expect(result.text).not.toContain(CAMPAIGN_ID);
      expect(result.text).not.toContain(MATCH_ID);
      expect(result.text).not.toMatch(SECRET);
    }

    beforeEach(async () => {
      store = new InMemoryMatchStore({ quiet: true });
      seeded = meta();
      await store.createMatch(seeded);
      await store.createMatch(
        meta({
          matchId: 'match-plain',
          roomCode: PLAIN_CODE,
          coopCampaign: undefined,
        }),
      );
      // Swap the hoisted delegates to the real verifier and a real store;
      // the outer beforeEach reinstalls the defaults for every other case.
      mockGetMatchByRoomCode.mockImplementation(store.getMatchByRoomCode);
      mockAuthenticateRequest.mockImplementation(
        jest.requireActual('@/lib/multiplayer/server/auth').authenticateRequest,
      );
    });

    afterEach(async () => {
      // HTTP changes no seat, membership or durable row.
      expect(await store.getMatchMeta(MATCH_ID)).toEqual(seeded);
      expect(mockCreateMatch).not.toHaveBeenCalled();
      expect(mockCloseMatch).not.toHaveBeenCalled();
    });

    it('returns only the allowlisted identity to an unseated vault identity holding the live code', async () => {
      const result = await run({ campaignIdentity: '1' }, `Bearer ${bearer()}`);
      expect(result.status).toBe(200);
      expect(result.cache).toBe('private, no-store');
      expect(result.body).toEqual({
        matchId: MATCH_ID,
        status: 'lobby',
        layout: '1v1',
        campaignId: CAMPAIGN_ID,
      });
      expect(result.text).not.toMatch(SECRET);
      expect(mockAuthenticateRequest).toHaveBeenCalledWith(
        expect.anything(),
        undefined,
        { kind: 'campaign-session', id: MATCH_ID },
      );
    });

    it('accepts a token scoped to this campaign session', async () => {
      const wire = bearer({
        scope: { kind: 'campaign-session', id: MATCH_ID },
      });
      const result = await run({ campaignIdentity: '1' }, `Bearer ${wire}`);
      expect(result.status).toBe(200);
      expect(result.body.campaignId).toBe(CAMPAIGN_ID);
    });

    it.each<[string, IPlayerTokenScope]>([
      [
        'another campaign session',
        { kind: 'campaign-session', id: 'match-other' },
      ],
      ['the match channel', { kind: 'match', id: MATCH_ID }],
    ])('refuses a token scoped to %s', async (_label, scope) => {
      const result = await run(
        { campaignIdentity: '1' },
        `Bearer ${bearer({ scope })}`,
      );
      expectNoIdentity(result, 401);
    });

    it.each<[string, () => string | undefined]>([
      ['no Authorization header', () => undefined],
      ['an empty bearer', () => 'Bearer   '],
      ['a non-bearer scheme', () => `Basic ${bearer()}`],
    ])(
      'refuses %s before any lookup or verification',
      async (_label, header) => {
        const result = await run({ campaignIdentity: '1' }, header());
        expectNoIdentity(result, 401);
        expect(mockGetMatchByRoomCode).not.toHaveBeenCalled();
        expect(mockAuthenticateRequest).not.toHaveBeenCalled();
      },
    );

    it.each<[string, () => string]>([
      [
        'an expired token',
        () => bearer({ expiresAt: new Date(Date.now() - 1_000).toISOString() }),
      ],
      [
        'a signature from another key',
        () => bearer({ signWith: generateKeyPairSync('ed25519').privateKey }),
      ],
      ['a retargeted playerId', () => bearer({ playerId: 'pid_someone_else' })],
      ['an undecodable token', () => 'not-a-token'],
    ])('refuses %s without disclosing identity', async (_label, wire) => {
      const result = await run({ campaignIdentity: '1' }, `Bearer ${wire()}`);
      expectNoIdentity(result, 401);
    });

    it('refuses query-token authentication with or without a header', async () => {
      const wire = bearer();
      expectNoIdentity(await run({ campaignIdentity: '1', token: wire }), 400);
      expectNoIdentity(
        await run({ campaignIdentity: '1', token: wire }, `Bearer ${wire}`),
        400,
      );
    });

    it.each<[string, string | string[]]>([
      ['0', '0'],
      ['true', 'true'],
      ['empty', ''],
      ['repeated', ['1', '1']],
    ])(
      'rejects a malformed mode (%s) instead of downgrading to a summary',
      async (_label, mode) => {
        const result = await run(
          { campaignIdentity: mode },
          `Bearer ${bearer()}`,
        );
        expectNoIdentity(result, 400);
      },
    );

    it.each<[string, string]>([
      ['an unknown code', 'QQQQ23'],
      ['a live match without co-op identity', PLAIN_CODE],
    ])('answers %s with the not-found class', async (_label, roomCode) => {
      const result = await run(
        { roomCode, campaignIdentity: '1' },
        `Bearer ${bearer()}`,
      );
      expect(result.body).toEqual({
        error: 'Invite code not found or expired',
      });
      expectNoIdentity(result, 404);
    });

    it('decides authentication before revealing whether a live code is co-op', async () => {
      const result = await run(
        { roomCode: PLAIN_CODE, campaignIdentity: '1' },
        'Bearer not-a-token',
      );
      expectNoIdentity(result, 401);
    });

    it('keeps the anonymous summary exact and unauthenticated', async () => {
      const result = await run({}, `Bearer ${bearer()}`);
      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        matchId: MATCH_ID,
        status: 'lobby',
        layout: '1v1',
      });
      expect(result.cache).toBeUndefined();
      expect(result.text).not.toContain(CAMPAIGN_ID);
      expect(mockAuthenticateRequest).not.toHaveBeenCalled();
    });
  });

  it('restores the default delegates after the identity cases', async () => {
    await expect(mockGetMatchByRoomCode('ABCD23')).resolves.toBeNull();
    await expect(mockAuthenticateRequest()).resolves.toMatchObject({
      ok: true,
      playerId: 'pid_host',
    });
  });
});
