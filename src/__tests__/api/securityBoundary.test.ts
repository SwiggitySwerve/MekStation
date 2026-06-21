import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks } from 'node-mocks-http';

const mockAuthenticateRequest = jest.fn();
const mockCreateMatch = jest.fn();
const mockListMatches = jest.fn();
const mockCloseMatch = jest.fn();
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

import tokenHandler from '@/pages/api/multiplayer/auth/token';
import matchesHandler from '@/pages/api/multiplayer/matches';
import unlockHandler from '@/pages/api/vault/identity/unlock';

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
});
