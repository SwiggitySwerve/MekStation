/**
 * LSC-1: /api/multiplayer/auth/local-seats request wiring - methods,
 * same-host/same-origin refusal before KDF, strict bodies, security
 * headers, error taxonomy and the operator/guest flow end to end against
 * the real service, real SQLite and the production token verifier.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks, type RequestMethod } from 'node-mocks-http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { verifyPlayerToken } from '@/lib/multiplayer/server/auth';
function loadHandler(): (
  req: NextApiRequest,
  res: NextApiResponse,
) => Promise<void> {
  let mod: {
    default?: (req: NextApiRequest, res: NextApiResponse) => Promise<void>;
  } = {};
  try {
    mod = jest.requireActual('@/pages/api/multiplayer/auth/local-seats');
  } catch {}
  expect(typeof mod.default).toBe('function');
  return mod.default!;
}
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  IdentityRepository,
  resetIdentityRepository,
} from '@/services/vault/IdentityRepository';
import { createIdentity } from '@/services/vault/IdentityService';
import {
  LocalSeatCredentialService,
  resetLocalSeatCredentialService,
} from '@/services/vault/LocalSeatCredentialService';
import { decodeTokenFromWire } from '@/types/multiplayer/Player';

const LOOPBACK = { host: '127.0.0.1:3001' };
const OPERATOR = 'primary-vault-pass';

async function call(
  method: RequestMethod,
  body?: unknown,
  headers: Record<string, string> = LOOPBACK,
): Promise<{
  status: number;
  json: Record<string, unknown>;
  res: NextApiResponse;
}> {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method,
    headers,
    body: body as never,
  });
  await loadHandler()(req, res);
  const raw = (res as unknown as { _getData(): string })._getData();
  return {
    status: res.statusCode,
    json: (typeof raw === 'string' && raw ? JSON.parse(raw) : raw) as Record<
      string,
      unknown
    >,
    res,
  };
}

function provisionBody(overrides: Record<string, unknown> = {}) {
  return {
    action: 'provision',
    operatorPassword: OPERATOR,
    seatId: 'local-seat-1',
    password: 'seat-one-pass',
    label: 'Player 1',
    expectedGeneration: 0,
    operationId: 'op-provision-seat-1',
    ...overrides,
  };
}

describe('/api/multiplayer/auth/local-seats', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'local-seat-api-'));
    resetSQLiteService();
    resetIdentityRepository();
    resetLocalSeatCredentialService();
    getSQLiteService({ path: path.join(dir, 'api.db') }).initialize();
  });

  afterEach(async () => {
    resetLocalSeatCredentialService();
    resetIdentityRepository();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  async function seedPrimary(): Promise<string> {
    const identity = await createIdentity('GM', OPERATOR);
    await new IdentityRepository().save(identity);
    return identity.id;
  }

  it('R2-03: never accepts credentials from a query string', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      headers: LOOPBACK,
      query: { action: 'mint', seatId: 'local-seat-1', password: 'url-secret' },
    });
    await loadHandler()(req, res);
    expect(res.statusCode).toBe(400);
    expect(
      JSON.stringify((res as unknown as { _getData(): unknown })._getData()),
    ).not.toContain('url-secret');
  });

  it('CF-LSC1S-1: separate requests on both seats share the operator window', async () => {
    await seedPrimary();
    for (let i = 0; i < 5; i++) {
      const result = await call(
        'POST',
        provisionBody({
          seatId: i % 2 ? 'local-seat-2' : 'local-seat-1',
          operatorPassword: 'wrong-operator',
          operationId: 'guess-' + i,
        }),
      );
      expect(result.status).toBe(401);
    }
    expect((await call('POST', provisionBody())).status).toBe(429);
  });

  it.each(['127.0.0.1:3001', 'localhost:3001', '[::1]:3001'])(
    'R2-02: admits the literal loopback host %s',
    async (host) => {
      expect(
        (
          await call('GET', undefined, {
            host,
            origin: 'http://' + host,
            'sec-fetch-site': 'same-origin',
          })
        ).status,
      ).toBe(200);
    },
  );

  it('allows only GET and POST', async () => {
    const { status, res } = await call('DELETE');
    expect(status).toBe(405);
    expect(res.getHeader('Allow')).toEqual(['GET', 'POST']);
  });

  it.each([
    ['a non-loopback host', { host: 'evil.example:3001' }],
    [
      'a rebinding host with matching origin',
      { host: 'evil.example:3001', origin: 'http://evil.example:3001' },
    ],
    ['a cross-site origin', { ...LOOPBACK, origin: 'http://evil.example' }],
    ['a cross-site fetch', { ...LOOPBACK, 'sec-fetch-site': 'cross-site' }],
    [
      'a same-site fetch (R2-09)',
      { ...LOOPBACK, 'sec-fetch-site': 'same-site' },
    ],
    [
      'a resolving DNS alias (R2-02)',
      { host: '127.0.0.1.nip.io:3001', origin: 'http://127.0.0.1.nip.io:3001' },
    ],
    ['a missing host', {}],
  ])(
    'refuses %s before any KDF or credential interpretation',
    async (_label, headers) => {
      const { status, json } = await call(
        'POST',
        { action: 'mint' },
        headers as Record<string, string>,
      );
      expect(status).toBe(403);
      expect(json).toEqual({ error: 'Local seats are same-host only' });
    },
  );

  it('accepts same-origin loopback requests and sets no-store security headers', async () => {
    const { status, json, res } = await call('GET', undefined, {
      host: 'localhost:3001',
      origin: 'http://localhost:3001',
      'sec-fetch-site': 'same-origin',
    });
    expect(status).toBe(200);
    expect(res.getHeader('Cache-Control')).toBe('no-store');
    expect(res.getHeader('X-Content-Type-Options')).toBe('nosniff');
    expect((json.seats as unknown[]).length).toBe(2);
  });

  it.each([
    [
      'an unknown action',
      { action: 'claim', seatId: 'local-seat-1', password: 'x' },
    ],
    [
      'an unknown seat id',
      { action: 'mint', seatId: 'local-seat-3', password: 'x' },
    ],
    [
      'an extra field',
      { action: 'mint', seatId: 'local-seat-1', password: 'x', role: 'gm' },
    ],
    [
      'an oversized password',
      { action: 'mint', seatId: 'local-seat-1', password: 'x'.repeat(2048) },
    ],
    ['a short seat password', provisionBody({ password: 'short' })],
    ['a missing operation id', provisionBody({ operationId: undefined })],
    ['a blank operation id', provisionBody({ operationId: ' ' })],
    ['a blank label', provisionBody({ label: ' ' })],
    ['a fractional generation', provisionBody({ expectedGeneration: 1.5 })],
    [
      'an unsafe generation',
      provisionBody({ expectedGeneration: Number.MAX_SAFE_INTEGER + 1 }),
    ],
    [
      'an empty mint password',
      { action: 'mint', seatId: 'local-seat-1', password: '' },
    ],
  ])('rejects %s with a detail-free 400', async (_label, body) => {
    const { status, json } = await call('POST', body);
    expect(status).toBe(400);
    expect(json).toEqual({ error: 'Malformed local seat request' });
  });

  it('requires a primary vault identity and its password for operator writes', async () => {
    const missing = await call('POST', provisionBody());
    expect(missing.status).toBe(409);
    expect(missing.json.code).toBe('OPERATOR_IDENTITY_REQUIRED');

    await seedPrimary();
    const denied = await call(
      'POST',
      provisionBody({ operatorPassword: 'wrong' }),
    );
    expect(denied.status).toBe(401);
    expect(denied.json.code).toBe('OPERATOR_DENIED');
  });

  it('provisions, mints a verifiable ordinary token and never returns secret material', async () => {
    const primaryId = await seedPrimary();
    const provisioned = await call('POST', provisionBody());
    expect(provisioned.status).toBe(200);
    expect(provisioned.json.replayed).toBe(false);

    const listed = await call('GET');
    const serialized = JSON.stringify(listed.json);
    expect(serialized).not.toMatch(
      /ciphertext|encrypted|privateKey|seat-one-pass/,
    );
    expect(listed.json.seats).toEqual([
      expect.objectContaining({
        seatId: 'local-seat-1',
        status: 'active',
        label: 'Player 1',
        generation: 1,
      }),
      expect.objectContaining({
        seatId: 'local-seat-2',
        status: 'unprovisioned',
      }),
    ]);

    const minted = await call('POST', {
      action: 'mint',
      seatId: 'local-seat-1',
      password: 'seat-one-pass',
    });
    expect(minted.status).toBe(200);
    expect(minted.res.getHeader('Cache-Control')).toBe('no-store');
    const token = decodeTokenFromWire(String(minted.json.token));
    await expect(verifyPlayerToken(token)).resolves.toMatchObject({
      ok: true,
      playerId: minted.json.playerId,
    });
    expect(minted.json).toMatchObject({
      seatId: 'local-seat-1',
      displayName: 'Player 1',
    });
    expect((listed.json.seats as Array<{ playerId: string }>)[0].playerId).toBe(
      minted.json.playerId,
    );
    expect((await new IdentityRepository().getActive())?.id).toBe(primaryId);
  });

  it('maps wrong seat passwords to 401 and lockout to 429 with Retry-After', async () => {
    await seedPrimary();
    await call('POST', provisionBody());
    for (let i = 0; i < 5; i += 1) {
      const wrong = await call('POST', {
        action: 'mint',
        seatId: 'local-seat-1',
        password: `guess-${i}`,
      });
      expect(wrong.status).toBe(401);
      expect(wrong.json).toEqual({
        error: 'Invalid local seat credentials',
        code: 'LOCAL_SEAT_DENIED',
      });
    }
    const locked = await call('POST', {
      action: 'mint',
      seatId: 'local-seat-1',
      password: 'seat-one-pass',
    });
    expect(locked.status).toBe(429);
    expect(Number(locked.res.getHeader('Retry-After'))).toBeGreaterThan(0);
  });

  it('maps unexpected failures to a generic 500 without internals', async () => {
    const spy = jest
      .spyOn(LocalSeatCredentialService.prototype, 'listSeats')
      .mockImplementation(() => {
        throw new Error('SQLITE_CORRUPT at C:/secret/path.db');
      });
    try {
      const failed = await call('GET');
      expect(failed.status).toBe(500);
      expect(failed.json).toEqual({ error: 'Local seat request failed' });
    } finally {
      spy.mockRestore();
    }
  });

  it('reports generation conflicts and replays idempotent retries', async () => {
    await seedPrimary();
    expect((await call('POST', provisionBody())).status).toBe(200);
    const retry = await call('POST', provisionBody());
    expect(retry.status).toBe(200);
    expect(retry.json.replayed).toBe(true);

    const conflict = await call(
      'POST',
      provisionBody({ operationId: 'op-provision-again' }),
    );
    expect(conflict.status).toBe(409);
    expect(conflict.json).toMatchObject({
      code: 'GENERATION_CONFLICT',
      currentGeneration: 1,
    });

    const revoke = await call('POST', {
      action: 'revoke',
      operatorPassword: OPERATOR,
      seatId: 'local-seat-1',
      expectedGeneration: 1,
      operationId: 'op-provision-seat-1',
    });
    expect(revoke.status).toBe(409);
    expect(revoke.json.code).toBe('OPERATION_MISMATCH');
  });

  it('O08 reports a distinct sanitized NOT_REVOCABLE refusal and keeps the conflict codes for stale requests', async () => {
    await seedPrimary();
    expect((await call('POST', provisionBody())).status).toBe(200);
    const revokeBody = (overrides: Record<string, unknown> = {}) => ({
      action: 'revoke',
      operatorPassword: OPERATOR,
      seatId: 'local-seat-1',
      expectedGeneration: 1,
      operationId: 'op-revoke-1',
      ...overrides,
    });
    expect((await call('POST', revokeBody())).status).toBe(200);
    const again = await call(
      'POST',
      revokeBody({ expectedGeneration: 2, operationId: 'op-revoke-2' }),
    );
    expect(again.status).toBe(409);
    expect(again.json).toEqual({
      error: 'Local seat request refused',
      code: 'NOT_REVOCABLE',
    });
    expect(again.res.getHeader('Cache-Control')).toBe('no-store');
    expect(JSON.stringify(again.json)).not.toContain(OPERATOR);
    const absent = await call(
      'POST',
      revokeBody({
        seatId: 'local-seat-2',
        expectedGeneration: 0,
        operationId: 'op-revoke-3',
      }),
    );
    expect(absent.status).toBe(409);
    expect(absent.json.code).toBe('NOT_REVOCABLE');
    const stale = await call(
      'POST',
      revokeBody({ expectedGeneration: 1, operationId: 'op-revoke-4' }),
    );
    expect(stale.status).toBe(409);
    expect(stale.json).toMatchObject({
      code: 'GENERATION_CONFLICT',
      currentGeneration: 2,
    });
  });
  it('R2-13/CF-LSC1S-1: forwards only validated credentials to the singleton', async () => {
    const prototype = LocalSeatCredentialService.prototype as unknown as {
      mint(input: unknown): Promise<unknown>;
    };
    const spy = jest.spyOn(prototype, 'mint').mockResolvedValue({
      token: 'wire',
      playerId: 'pid',
      expiresAt: 'later',
      seatId: 'local-seat-1',
      displayName: 'P1',
      publicKey: 'pk',
    });
    try {
      expect(
        (
          await call(
            'POST',
            {
              action: 'mint',
              seatId: 'local-seat-1',
              password: 'seat-password',
            },
            {
              ...LOOPBACK,
              'x-forwarded-for': '203.0.113.1',
              authorization: 'Bearer ignored',
            },
          )
        ).status,
      ).toBe(200);
      expect(spy).toHaveBeenCalledWith({
        seatId: 'local-seat-1',
        password: 'seat-password',
      });
    } finally {
      spy.mockRestore();
    }
  });
});
