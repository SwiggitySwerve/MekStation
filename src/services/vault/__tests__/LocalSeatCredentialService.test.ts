/**
 * LSC-1S: operator provisioning service with real crypto and the real
 * migrated schema. Covers the bound policy numbers (CF-LSC0-15), the
 * route-wide operator window before key derivation, duplicate delivery
 * that is still throttled and authenticated (CF-LSC0-17), operation-id
 * refusal and generation CAS, revoke-keeps / re-provision-clears the
 * lock (CF-LSC0-8), secret-free errors and logs (CF-LSC0-6) and the real
 * primary-vault check that never switches the active row. The module is
 * looked up at run time so RED fails on assertions (F6).
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IEncryptedData } from '@/types/vault';

import { verifyPlayerToken } from '@/lib/multiplayer/server/auth';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { IdentityRepository } from '@/services/vault/IdentityRepository';
import { createIdentity } from '@/services/vault/IdentityService';
import * as identityCrypto from '@/services/vault/IdentityService';
import { decodeTokenFromWire } from '@/types/multiplayer/Player';
import { logger } from '@/utils/logger';

jest.mock('@/services/vault/IdentityService', () => {
  const actual = jest.requireActual('@/services/vault/IdentityService');
  return {
    ...actual,
    generateKeyPair: jest.fn(actual.generateKeyPair),
    encryptWithPassword: jest.fn(actual.encryptWithPassword),
    decryptWithPassword: jest.fn(actual.decryptWithPassword),
    signData: jest.fn(actual.signData),
  };
});

// Prospective LSC-1 runtime RED. No product admission or PR until LSC-1S closes.
interface IPreparedMintResult {
  token: string;
  playerId: string;
  expiresAt: string;
}
interface IPreparedMintService extends IService {
  mint(input: {
    seatId: SeatId;
    password: string;
    ttlMs?: number;
  }): Promise<IPreparedMintResult>;
}

describe('LSC-1 prospective runtime survivors', () => {
  let dir: string;
  let clock: number;
  let subject: IPreparedMintService;
  const PASSWORD = 'seat-one-pass';
  const PASSWORD2 = 'seat-two-pass';

  beforeEach(async () => {
    const actual = jest.requireActual<typeof identityCrypto>(
      '@/services/vault/IdentityService',
    );
    jest
      .mocked(identityCrypto.generateKeyPair)
      .mockReset()
      .mockImplementation(actual.generateKeyPair);
    jest
      .mocked(identityCrypto.encryptWithPassword)
      .mockReset()
      .mockImplementation(actual.encryptWithPassword);
    jest
      .mocked(identityCrypto.decryptWithPassword)
      .mockReset()
      .mockImplementation(actual.decryptWithPassword);
    jest
      .mocked(identityCrypto.signData)
      .mockReset()
      .mockImplementation(actual.signData);
    dir = await mkdtemp(path.join(tmpdir(), 'lsc-1-runtime-red-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'seats.db') }).initialize();
    clock = T0;
    subject = new (service().LocalSeatCredentialService)({
      now: () => clock,
      verifyOperatorPassword: async () => 'ok',
    }) as IPreparedMintService;
    for (const seatId of ['local-seat-1', 'local-seat-2'] as const) {
      await subject.provision({
        operatorPassword: OPERATOR,
        seatId,
        password: seatId === 'local-seat-1' ? PASSWORD : PASSWORD2,
        label: seatId,
        expectedGeneration: 0,
        operationId: `prep-${seatId}`,
      });
    }
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function mint(
    seatId: SeatId = 'local-seat-1',
    password = PASSWORD,
    ttlMs?: number,
  ) {
    expect(typeof subject.mint).toBe('function');
    return subject.mint({ seatId, password, ttlMs });
  }

  it('R2-01/R2-04: ten route-wide attempts precede KDF, including wrong guesses on both seats', async () => {
    expect(typeof subject.mint).toBe('function');
    jest.mocked(identityCrypto.decryptWithPassword).mockClear();
    for (let i = 0; i < 10; i++)
      await expect(
        mint(i % 2 ? 'local-seat-2' : 'local-seat-1', 'bad-password'),
      ).rejects.toMatchObject({ code: 'invalid-credentials' });
    const calls = jest.mocked(identityCrypto.decryptWithPassword).mock.calls
      .length;
    await expect(mint()).rejects.toMatchObject({ code: 'throttled' });
    expect(identityCrypto.decryptWithPassword).toHaveBeenCalledTimes(calls);
  });

  it('R2-12: a locked seat consumes the mint window but performs no KDF', async () => {
    expect(typeof subject.mint).toBe('function');
    for (let i = 0; i < 5; i++)
      await expect(mint('local-seat-1', 'wrong')).rejects.toMatchObject({
        code: 'invalid-credentials',
      });
    jest.mocked(identityCrypto.decryptWithPassword).mockClear();
    for (let i = 0; i < 5; i++)
      await expect(mint()).rejects.toMatchObject({ code: 'throttled' });
    await expect(mint('local-seat-2', PASSWORD2)).rejects.toMatchObject({
      code: 'throttled',
    });
    expect(identityCrypto.decryptWithPassword).not.toHaveBeenCalled();
  });

  it('R2-12: the mint lock survives a SQLite reopen and a new service', async () => {
    for (let i = 0; i < 5; i++) {
      await expect(mint('local-seat-1', 'wrong')).rejects.toMatchObject({
        code: 'invalid-credentials',
      });
    }
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'seats.db') }).initialize();
    subject = new (service().LocalSeatCredentialService)({
      now: () => clock,
      verifyOperatorPassword: async () => 'ok',
    }) as IPreparedMintService;
    jest.mocked(identityCrypto.decryptWithPassword).mockClear();
    await expect(mint()).rejects.toMatchObject({ code: 'throttled' });
    expect(identityCrypto.decryptWithPassword).not.toHaveBeenCalled();
    clock += 60_000;
    await expect(mint()).resolves.toHaveProperty('token');
  });

  it('a successful mint clears the durable failure count and lock', async () => {
    const repo = new (repository().LocalSeatCredentialRepository)();
    for (let i = 0; i < 4; i++) {
      await expect(mint('local-seat-1', 'wrong')).rejects.toMatchObject({
        code: 'invalid-credentials',
      });
    }
    expect(repo.get('local-seat-1')?.failedAttempts).toBe(4);
    await expect(mint()).resolves.toHaveProperty('token');
    expect(repo.get('local-seat-1')).toMatchObject({
      failedAttempts: 0,
      lockedUntilMs: 0,
    });
    for (let i = 0; i < 4; i++) {
      await expect(mint('local-seat-1', 'wrong')).rejects.toMatchObject({
        code: 'invalid-credentials',
      });
    }
    await expect(mint()).resolves.toHaveProperty('token');
    expect(repo.get('local-seat-1')).toMatchObject({
      failedAttempts: 0,
      lockedUntilMs: 0,
    });
  });

  it('R2-01/R2-04: ten successful mints across both seats exhaust the shared window until expiry', async () => {
    for (let i = 0; i < 10; i++) {
      await expect(
        mint(
          i % 2 ? 'local-seat-2' : 'local-seat-1',
          i % 2 ? PASSWORD2 : PASSWORD,
        ),
      ).resolves.toHaveProperty('token');
    }
    const count = jest.mocked(identityCrypto.decryptWithPassword).mock.calls
      .length;
    await expect(mint()).rejects.toMatchObject({ code: 'throttled' });
    expect(identityCrypto.decryptWithPassword).toHaveBeenCalledTimes(count);
    clock += 60_000;
    await expect(mint()).resolves.toHaveProperty('token');
  });

  it.each(['decrypt', 'sign'] as const)(
    'R2-11: revoke during %s returns no token and clears the request key',
    async (phase) => {
      expect(typeof subject.mint).toBe('function');
      let enter!: () => void;
      let release!: () => void;
      const entered = new Promise<void>((resolve) => {
        enter = resolve;
      });
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const actual = jest.requireActual<typeof identityCrypto>(
        '@/services/vault/IdentityService',
      );
      let privateKey: Uint8Array | undefined;
      if (phase === 'decrypt')
        jest
          .mocked(identityCrypto.decryptWithPassword)
          .mockImplementationOnce(async (...args) => {
            privateKey = await actual.decryptWithPassword(...args);
            enter();
            await gate;
            return privateKey;
          });
      else
        jest
          .mocked(identityCrypto.signData)
          .mockImplementationOnce(async (...args) => {
            const signature = await actual.signData(...args);
            enter();
            await gate;
            return signature;
          });
      const pending = mint();
      await entered;
      await subject.revoke({
        operatorPassword: OPERATOR,
        seatId: 'local-seat-1',
        expectedGeneration: 1,
        operationId: `revoke-${phase}`,
      });
      release();
      await expect(pending).rejects.toMatchObject({
        code: 'invalid-credentials',
      });
      if (privateKey) expect([...privateKey].every((v) => v === 0)).toBe(true);
    },
  );

  it('CF-LSC1S-3: a second in-flight mint is refused before its KDF', async () => {
    expect(typeof subject.mint).toBe('function');
    let enter!: () => void;
    let release!: () => void;
    const entered = new Promise<void>((resolve) => {
      enter = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const actual = jest.requireActual<typeof identityCrypto>(
      '@/services/vault/IdentityService',
    );
    jest
      .mocked(identityCrypto.decryptWithPassword)
      .mockImplementationOnce(async (...args) => {
        enter();
        await gate;
        return actual.decryptWithPassword(...args);
      });
    const pending = mint('local-seat-1', 'wrong');
    const settled = expect(pending).rejects.toMatchObject({
      code: 'invalid-credentials',
    });
    await entered;
    await expect(mint()).rejects.toMatchObject({ code: 'throttled' });
    expect(identityCrypto.decryptWithPassword).toHaveBeenCalledTimes(1);
    release();
    await settled;
    expect(
      new (repository().LocalSeatCredentialRepository)().get('local-seat-1')
        ?.failedAttempts,
    ).toBe(1);
  });

  it('R2-07/R2-08: revoked seats refuse mint; re-provision replaces the password and keeps only ciphertext', async () => {
    expect(typeof subject.mint).toBe('function');
    await subject.revoke({
      operatorPassword: OPERATOR,
      seatId: 'local-seat-1',
      expectedGeneration: 1,
      operationId: 'revoke',
    });
    await expect(mint()).rejects.toMatchObject({ code: 'invalid-credentials' });
    await subject.provision({
      operatorPassword: OPERATOR,
      seatId: 'local-seat-1',
      password: 'replacement-pass',
      label: 'replacement',
      expectedGeneration: 2,
      operationId: 'replace',
    });
    await expect(mint()).rejects.toMatchObject({ code: 'invalid-credentials' });
    await expect(
      mint('local-seat-1', 'replacement-pass'),
    ).resolves.toHaveProperty('token');
    const rows = JSON.stringify(
      getSQLiteService()
        .getDatabase()
        .prepare('SELECT * FROM local_seat_credentials')
        .all(),
    );
    expect(rows).not.toContain('replacement-pass');
  });

  it('R2-14: mint uses the seat password and leaves the primary identity unchanged', async () => {
    expect(typeof subject.mint).toBe('function');
    const identities = new IdentityRepository();
    const primary = await createIdentity('GM', OPERATOR);
    await identities.save(primary);
    await expect(mint('local-seat-1', OPERATOR)).rejects.toMatchObject({
      code: 'invalid-credentials',
    });
    await expect(mint()).resolves.toHaveProperty('token');
    expect((await identities.getActive())?.id).toBe(primary.id);
  });

  it('CF-LSC0-14: explicit short TTL expires while renewal keeps the seat player id', async () => {
    expect(typeof subject.mint).toBe('function');
    const first = await mint('local-seat-1', PASSWORD, 1000);
    expect(Date.parse(first.expiresAt)).toBe(clock + 1000);
    clock += 1001;
    const renewed = await mint();
    expect(renewed.playerId).toBe(first.playerId);
    expect(Date.parse(renewed.expiresAt)).toBe(clock + 3_600_000);
  });

  it('R2-05: authenticated replay skips keygen and preserves the original password', async () => {
    jest.mocked(identityCrypto.generateKeyPair).mockClear();
    const retry = await subject.provision({
      operatorPassword: OPERATOR,
      seatId: 'local-seat-1',
      password: 'changed-password',
      label: 'local-seat-1',
      expectedGeneration: 0,
      operationId: 'prep-local-seat-1',
    });
    expect(retry).toMatchObject({ replayed: true, generation: 1 });
    expect(identityCrypto.generateKeyPair).not.toHaveBeenCalled();
    await expect(mint()).resolves.toHaveProperty('token');
    await expect(
      mint('local-seat-1', 'changed-password'),
    ).rejects.toMatchObject({ code: 'invalid-credentials' });
  });

  it('R2-06/R2-10: ordinary tokens verify with scope parity and reject a substituted player', async () => {
    const first = decodeTokenFromWire((await mint()).token)!;
    const second = decodeTokenFromWire(
      (await mint('local-seat-2', PASSWORD2)).token,
    )!;
    expect(first.scope).toBeUndefined();
    expect(first.playerId).not.toBe(second.playerId);
    await expect(
      verifyPlayerToken(first, clock, { kind: 'match', id: 'match-a' }),
    ).resolves.toMatchObject({ ok: true, playerId: first.playerId });
    await expect(
      verifyPlayerToken({ ...first, playerId: second.playerId }, clock),
    ).resolves.toEqual({ ok: false, reason: 'pid-mismatch' });
    await subject.revoke({
      operatorPassword: OPERATOR,
      seatId: 'local-seat-1',
      expectedGeneration: 1,
      operationId: 'keep-issued-expiry',
    });
    await expect(mint()).rejects.toMatchObject({ code: 'invalid-credentials' });
    await expect(verifyPlayerToken(first, clock)).resolves.toMatchObject({
      ok: true,
    });
    await expect(
      verifyPlayerToken(first, Date.parse(first.expiresAt)),
    ).resolves.toEqual({ ok: false, reason: 'expired' });
  });

  it.each([false, true])(
    'R2-08: erases the exact decrypted buffer on sign failure=%s without secret diagnostics',
    async (fail) => {
      const actual = jest.requireActual<typeof identityCrypto>(
        '@/services/vault/IdentityService',
      );
      let key!: Uint8Array;
      jest
        .mocked(identityCrypto.decryptWithPassword)
        .mockImplementationOnce(
          async (...args) => (key = await actual.decryptWithPassword(...args)),
        );
      const spies = [
        jest.spyOn(console, 'error').mockImplementation(() => undefined),
        jest.spyOn(logger, 'error').mockImplementation(() => undefined),
      ];
      if (fail)
        jest
          .mocked(identityCrypto.signData)
          .mockRejectedValueOnce(new Error(PASSWORD));
      if (fail) {
        const error = await mint().catch((caught: unknown) => caught);
        expect(error).toMatchObject({ message: 'internal-error' });
        expect(JSON.stringify(error) + String(error)).not.toContain(PASSWORD);
      } else await expect(mint()).resolves.toHaveProperty('token');
      expect(key.every((v) => v === 0)).toBe(true);
      expect(JSON.stringify(spies.flatMap((s) => s.mock.calls))).not.toContain(
        PASSWORD,
      );
    },
  );
});

type SeatId = 'local-seat-1' | 'local-seat-2';
type Verdict = 'ok' | 'denied' | 'missing';
interface IOutcome {
  replayed: boolean;
  generation: number;
  seats: Array<{
    seatId: SeatId;
    status: string;
    label: string | null;
    playerId: string | null;
    generation: number;
    lockedUntil: string | null;
  }>;
}
interface IService {
  listSeats(): IOutcome['seats'];
  provision(input: {
    operatorPassword: string;
    seatId: SeatId;
    password: string;
    label: string;
    expectedGeneration: number;
    operationId: string;
  }): Promise<IOutcome>;
  revoke(input: {
    operatorPassword: string;
    seatId: SeatId;
    expectedGeneration: number;
    operationId: string;
  }): Promise<IOutcome>;
}
interface IModule {
  LOCAL_SEAT_POLICY: Record<string, number>;
  LocalSeatCredentialService: new (deps?: {
    verifyOperatorPassword?: (p: string) => Promise<Verdict>;
    now?: () => number;
  }) => IService;
}
interface IRepoModule {
  LocalSeatCredentialRepository: new () => {
    get(seatId: SeatId): {
      publicKey: string;
      encryptedPrivateKey: IEncryptedData;
      failedAttempts: number;
      lockedUntilMs: number;
      generation: number;
    } | null;
    recordFailure(
      seatId: SeatId,
      generation: number,
      nowMs: number,
      policy: { maxFailures: number; lockoutMs: number },
    ): void;
  };
}

function load<T>(id: string, key: string): T {
  let mod: Record<string, unknown> = {};
  try {
    mod = jest.requireActual(id);
  } catch {
    // Absent before GREEN; the assertion below reports it.
  }
  expect(mod[key]).toBeDefined();
  return mod as T;
}
const service = () =>
  load<IModule>(
    '@/services/vault/LocalSeatCredentialService',
    'LocalSeatCredentialService',
  );
const repository = () =>
  load<IRepoModule>(
    '@/services/vault/LocalSeatCredentialRepository',
    'LocalSeatCredentialRepository',
  );

const OPERATOR = 'operator-password-xyz';
const SEAT_PASSWORD = 'seat-one-pass-abc';
const T0 = Date.parse('2026-10-18T12:00:00.000Z');

describe('LocalSeatCredentialService operator writes (LSC-1S)', () => {
  let dir: string;
  let nowMs: number;
  let operator: jest.Mock<Promise<Verdict>, [string]>;
  let svc: IService;

  async function code(
    promise: Promise<unknown>,
  ): Promise<{ code?: string; detail?: Record<string, number> }> {
    const error = await promise.then(
      () => null,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(Error);
    return error as { code?: string; detail?: Record<string, number> };
  }

  const provision = (
    seatId: SeatId,
    expectedGeneration = 0,
    operationId = `op-${seatId}-${expectedGeneration}`,
    operatorPassword = OPERATOR,
    password = SEAT_PASSWORD,
  ) =>
    svc.provision({
      operatorPassword,
      seatId,
      password,
      label: seatId === 'local-seat-1' ? 'Player 1' : 'Player 2',
      expectedGeneration,
      operationId,
    });

  beforeEach(async () => {
    const actual = jest.requireActual<typeof identityCrypto>(
      '@/services/vault/IdentityService',
    );
    jest
      .mocked(identityCrypto.generateKeyPair)
      .mockReset()
      .mockImplementation(actual.generateKeyPair);
    jest
      .mocked(identityCrypto.encryptWithPassword)
      .mockReset()
      .mockImplementation(actual.encryptWithPassword);
    jest
      .mocked(identityCrypto.decryptWithPassword)
      .mockReset()
      .mockImplementation(actual.decryptWithPassword);
    dir = await mkdtemp(path.join(tmpdir(), 'local-seat-service-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'seats.db') }).initialize();
    nowMs = T0;
    operator = jest.fn(async (password: string) =>
      password === OPERATOR ? 'ok' : 'denied',
    );
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function make(): IService {
    const { LocalSeatCredentialService } = service();
    svc = new LocalSeatCredentialService({
      verifyOperatorPassword: operator,
      now: () => nowMs,
    });
    return svc;
  }

  it('binds the Root-recommended policy numbers (CF-LSC0-15)', () => {
    expect(service().LOCAL_SEAT_POLICY).toEqual({
      attemptWindowMs: 60_000,
      maxMintAttemptsPerWindow: 10,
      maxOperatorAttemptsPerWindow: 5,
      maxFailures: 5,
      lockoutMs: 60_000,
      defaultTtlMs: 3_600_000,
      maxTtlMs: 3_600_000,
    });
  });

  it('lists both seats as unprovisioned public metadata', () => {
    expect(make().listSeats()).toEqual([
      {
        seatId: 'local-seat-1',
        status: 'unprovisioned',
        label: null,
        playerId: null,
        generation: 0,
        lockedUntil: null,
      },
      {
        seatId: 'local-seat-2',
        status: 'unprovisioned',
        label: null,
        playerId: null,
        generation: 0,
        lockedUntil: null,
      },
    ]);
  });

  it('requires the operator password and refuses without a primary identity, changing nothing', async () => {
    make();
    expect(
      (await code(provision('local-seat-1', 0, 'op-a', 'wrong'))).code,
    ).toBe('operator-denied');
    operator.mockResolvedValueOnce('missing');
    expect((await code(provision('local-seat-1', 0, 'op-b'))).code).toBe(
      'operator-unavailable',
    );
    expect(svc.listSeats()[0].status).toBe('unprovisioned');
  });

  it('applies a route-wide 5-per-60s operator window before any key derivation', async () => {
    make();
    for (let i = 0; i < 5; i += 1) {
      expect(
        (
          await code(
            svc.revoke({
              operatorPassword: 'guess',
              seatId: i % 2 ? 'local-seat-2' : 'local-seat-1',
              expectedGeneration: 1,
              operationId: `op-g${i}`,
            }),
          )
        ).code,
      ).toBe('operator-denied');
    }
    const throttled = await code(provision('local-seat-1', 0, 'op-right'));
    expect(throttled.code).toBe('throttled');
    expect(throttled.detail?.retryAfterMs).toBe(60_000);
    expect(operator).toHaveBeenCalledTimes(5);
    nowMs += 60_000;
    await expect(
      provision('local-seat-1', 0, 'op-right'),
    ).resolves.toMatchObject({ replayed: false });
  });

  it('anchors the window at the first attempt and keeps it closed across clock rollback', async () => {
    nowMs = 10_000;
    make();
    for (let i = 0; i < 5; i++)
      await code(provision('local-seat-1', 0, `denied-${i}`, 'wrong'));
    nowMs = 60_000;
    expect((await code(provision('local-seat-1'))).detail?.retryAfterMs).toBe(
      10_000,
    );
    nowMs = 5_000;
    expect((await code(provision('local-seat-1'))).detail?.retryAfterMs).toBe(
      65_000,
    );
    expect(operator).toHaveBeenCalledTimes(5);
    nowMs = 70_000;
    await expect(provision('local-seat-1')).resolves.toMatchObject({
      replayed: false,
    });
  });

  it('treats every non-null revocation as revoked and preserves future lock deadlines on clock rollback', async () => {
    make();
    await provision('local-seat-1');
    const db = getSQLiteService().getDatabase();
    // Legacy/corrupt blank values are still revoked; current schema forbids new ones.
    db.pragma('ignore_check_constraints = ON');
    db.prepare(
      "UPDATE local_seat_credentials SET revoked_at = '', locked_until_ms = ?",
    ).run(T0 + 60_000);
    db.pragma('ignore_check_constraints = OFF');
    nowMs = T0 - 60_000;
    expect(svc.listSeats()[0]).toMatchObject({
      status: 'revoked',
      lockedUntil: new Date(T0 + 60_000).toISOString(),
    });
  });

  it('sanitizes unexpected verification and encryption failures without logging secrets', async () => {
    const spies = [
      jest.spyOn(console, 'error').mockImplementation(() => undefined),
      jest.spyOn(logger, 'error').mockImplementation(() => undefined),
    ];
    make();
    operator.mockRejectedValueOnce(new Error(OPERATOR));
    const denied = await code(provision('local-seat-1'));
    expect(denied).toMatchObject({ code: 'internal-error' });
    expect(String(denied)).not.toContain(OPERATOR);
    const encrypted = jest
      .mocked(identityCrypto.encryptWithPassword)
      .mockRejectedValueOnce(new Error(SEAT_PASSWORD));
    const failure = await code(provision('local-seat-1'));
    expect(failure).toMatchObject({ code: 'internal-error' });
    expect(String(failure)).not.toContain(SEAT_PASSWORD);
    expect(JSON.stringify(spies.flatMap((s) => s.mock.calls))).not.toMatch(
      /operator-password-xyz|seat-one-pass-abc/,
    );
    encrypted.mockRestore();
    expect(svc.listSeats()[0].status).toBe('unprovisioned');
  });

  it('erases generated private-key bytes on both encryption success and failure', async () => {
    make();
    const buffers: Uint8Array[] = [];
    const generate = jest.requireActual<typeof identityCrypto>(
      '@/services/vault/IdentityService',
    ).generateKeyPair;
    jest.mocked(identityCrypto.generateKeyPair).mockImplementation(async () => {
      const pair = await generate();
      buffers.push(pair.privateKey);
      return pair;
    });
    await provision('local-seat-1');
    expect(buffers[0].every((v) => v === 0)).toBe(true);
    jest
      .mocked(identityCrypto.encryptWithPassword)
      .mockRejectedValueOnce(new Error('private-key-failure'));
    await code(provision('local-seat-2'));
    expect(buffers[1].every((v) => v === 0)).toBe(true);
  });

  it('records one winner when two operator requests race for the same generation', async () => {
    make();
    const outcomes = await Promise.allSettled([
      provision('local-seat-1', 0, 'race-a'),
      provision('local-seat-1', 0, 'race-b'),
    ]);
    expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.find((r) => r.status === 'rejected')).toMatchObject({
      reason: { code: 'generation-conflict' },
    });
    expect(
      getSQLiteService()
        .getDatabase()
        .prepare(
          'SELECT result_generation FROM local_seat_credential_operations',
        )
        .all(),
    ).toEqual([{ result_generation: 1 }]);
    expect(svc.listSeats()[0].generation).toBe(1);
  });

  it('discards the decrypted operator key without changing its active identity', async () => {
    const identities = new IdentityRepository();
    const primary = await createIdentity('GM', OPERATOR);
    await identities.save(primary);
    const key = new Uint8Array([10, 20, 30]);
    jest.mocked(identityCrypto.decryptWithPassword).mockResolvedValueOnce(key);
    const real = new (service().LocalSeatCredentialService)({
      now: () => nowMs,
    });
    await real.provision({
      operatorPassword: OPERATOR,
      seatId: 'local-seat-1',
      password: SEAT_PASSWORD,
      label: 'P1',
      expectedGeneration: 0,
      operationId: 'key-lifetime',
    });
    expect([...key]).toEqual([0, 0, 0]);
    expect((await identities.getActive())?.id).toBe(primary.id);
  });

  it('still throttles and authenticates a duplicate delivery and replays the original outcome (CF-LSC0-17)', async () => {
    make();
    const first = await provision('local-seat-1', 0, 'op-dup');
    const key = new (repository().LocalSeatCredentialRepository)().get(
      'local-seat-1',
    )?.publicKey;
    expect(
      (await code(provision('local-seat-1', 0, 'op-dup', 'wrong'))).code,
    ).toBe('operator-denied');
    await svc.revoke({
      operatorPassword: OPERATOR,
      seatId: 'local-seat-1',
      expectedGeneration: 1,
      operationId: 'op-between-deliveries',
    });
    const retry = await provision(
      'local-seat-1',
      0,
      'op-dup',
      OPERATOR,
      'a-different-seat-pass',
    );
    expect(retry).toMatchObject({ replayed: true, generation: 1 });
    expect(first.generation).toBe(1);
    expect(retry.seats[0]).toMatchObject({ generation: 2, status: 'revoked' });
    expect(
      new (repository().LocalSeatCredentialRepository)().get('local-seat-1')
        ?.publicKey,
    ).toBe(key);
    expect(operator).toHaveBeenCalledTimes(4);
    // Replays still consume the window: call 5 replays, 6 is throttled.
    expect((await provision('local-seat-1', 0, 'op-dup')).replayed).toBe(true);
    expect((await code(provision('local-seat-1', 0, 'op-dup'))).code).toBe(
      'throttled',
    );
  });

  it('stores the seat key only as ciphertext under the seat password', async () => {
    make();
    await provision('local-seat-1');
    const row = new (repository().LocalSeatCredentialRepository)().get(
      'local-seat-1',
    );
    expect(row).not.toBeNull();
    if (!row) throw new Error('Missing provisioned seat');
    const key = await identityCrypto.decryptWithPassword(
      row.encryptedPrivateKey,
      SEAT_PASSWORD,
    );
    try {
      expect(key.byteLength).toBeGreaterThan(0);
      expect(row.encryptedPrivateKey.ciphertext).not.toBe(
        identityCrypto.toBase64(key),
      );
      await expect(
        identityCrypto.decryptWithPassword(row.encryptedPrivateKey, 'wrong'),
      ).rejects.toThrow();
    } finally {
      key.fill(0);
    }
  });

  it('refuses a reused operation id with different parameters and a stale generation', async () => {
    make();
    await provision('local-seat-1', 0, 'op-x');
    expect((await code(provision('local-seat-2', 0, 'op-x'))).code).toBe(
      'operation-mismatch',
    );
    expect(
      (
        await code(
          svc.provision({
            operatorPassword: OPERATOR,
            seatId: 'local-seat-1',
            password: SEAT_PASSWORD,
            label: 'Other',
            expectedGeneration: 0,
            operationId: 'op-x',
          }),
        )
      ).code,
    ).toBe('operation-mismatch');
    expect(svc.listSeats()[0]).toMatchObject({
      label: 'Player 1',
      generation: 1,
    });
    const stale = await code(provision('local-seat-1', 0, 'op-y'));
    expect(stale).toMatchObject({
      code: 'generation-conflict',
      detail: { currentGeneration: 1 },
    });
    expect(svc.listSeats()[1].status).toBe('unprovisioned');
  });

  it('O06 reports not-revocable without detail, keeps the generation-conflict detail and never blocks a provision', async () => {
    make();
    const revokeAt = (
      operationId: string,
      expectedGeneration: number,
      seatId: SeatId = 'local-seat-1',
    ) =>
      svc.revoke({
        operatorPassword: OPERATOR,
        seatId,
        expectedGeneration,
        operationId,
      });
    const absent = await code(revokeAt('op-absent', 0));
    expect(absent.code).toBe('not-revocable');
    expect(absent.detail).toEqual({});
    await provision('local-seat-1');
    await revokeAt('op-revoke-ok', 1);
    const twice = await code(revokeAt('op-revoke-twice', 2));
    expect(twice.code).toBe('not-revocable');
    expect(twice.detail).toEqual({});
    expect(await code(revokeAt('op-revoke-stale', 1))).toMatchObject({
      code: 'generation-conflict',
      detail: { currentGeneration: 2 },
    });
    nowMs += 60_000;
    await expect(
      provision('local-seat-1', 2, 'op-reprovision'),
    ).resolves.toMatchObject({ generation: 3 });
    expect(svc.listSeats()[0]).toMatchObject({
      status: 'active',
      generation: 3,
    });
  });

  it('O07 verifies the operator and consumes the window before a not-revocable result, recording nothing', async () => {
    make();
    const revokeAbsent = (operatorPassword: string, operationId: string) =>
      svc.revoke({
        operatorPassword,
        seatId: 'local-seat-2',
        expectedGeneration: 0,
        operationId,
      });
    expect((await code(revokeAbsent('wrong', 'op-nr-wrong'))).code).toBe(
      'operator-denied',
    );
    for (let i = 0; i < 4; i += 1) {
      expect((await code(revokeAbsent(OPERATOR, `op-nr-${i}`))).code).toBe(
        'not-revocable',
      );
    }
    expect(operator).toHaveBeenCalledTimes(5);
    expect((await code(revokeAbsent(OPERATOR, 'op-nr-late'))).code).toBe(
      'throttled',
    );
    expect(operator).toHaveBeenCalledTimes(5);
    expect(
      getSQLiteService()
        .getDatabase()
        .prepare('SELECT COUNT(*) AS n FROM local_seat_credential_operations')
        .get(),
    ).toEqual({ n: 0 });
  });
  it('revoke keeps the lock; re-provision clears it and rotates the player identity (CF-LSC0-8)', async () => {
    make();
    const before = (await provision('local-seat-1')).seats[0];
    const repo = new (repository().LocalSeatCredentialRepository)();
    for (let i = 0; i < 5; i += 1)
      repo.recordFailure('local-seat-1', 1, nowMs, {
        maxFailures: 5,
        lockoutMs: 60_000,
      });
    expect(svc.listSeats()[0].lockedUntil).not.toBeNull();

    const revoked = await svc.revoke({
      operatorPassword: OPERATOR,
      seatId: 'local-seat-1',
      expectedGeneration: 1,
      operationId: 'op-revoke',
    });
    expect(revoked.seats[0]).toMatchObject({
      status: 'revoked',
      generation: 2,
    });
    expect(repo.get('local-seat-1')).toMatchObject({
      failedAttempts: 5,
      lockedUntilMs: nowMs + 60_000,
    });

    const after = (await provision('local-seat-1', 2, 'op-again')).seats[0];
    expect(after).toMatchObject({
      status: 'active',
      generation: 3,
      lockedUntil: null,
    });
    expect(repo.get('local-seat-1')).toMatchObject({
      failedAttempts: 0,
      lockedUntilMs: 0,
    });
    expect(after.playerId).not.toBe(before.playerId);
  });

  it('keeps passwords out of errors, outcomes and logs (CF-LSC0-6)', async () => {
    const spies = [
      ...(['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
        jest.spyOn(console, m).mockImplementation(() => undefined),
      ),
      ...(['info', 'warn', 'error', 'debug'] as const).map((m) =>
        jest.spyOn(logger, m).mockImplementation(() => undefined),
      ),
    ];
    make();
    const seen: unknown[] = [];
    seen.push(
      await code(provision('local-seat-1', 0, 'op-1', 'wrong-operator-secret')),
    );
    seen.push(await provision('local-seat-1', 0, 'op-2'));
    seen.push(await code(provision('local-seat-2', 0, 'op-2')));
    seen.push(await code(provision('local-seat-1', 0, 'op-3')));
    for (const value of seen) {
      const error = value as { message?: string; detail?: unknown };
      const text =
        JSON.stringify(value) +
        String(error.message ?? '') +
        JSON.stringify(error.detail ?? null);
      expect(text).not.toContain(SEAT_PASSWORD);
      expect(text).not.toContain(OPERATOR);
      expect(text).not.toContain('wrong-operator-secret');
    }
    const logged = JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
    expect(logged).not.toContain(SEAT_PASSWORD);
    expect(logged).not.toContain(OPERATOR);
  });

  it('verifies the real primary vault password without switching the active row', async () => {
    const identities = new IdentityRepository();
    const primary = await createIdentity('GM', 'primary-vault-pass');
    await identities.save(primary);
    const { LocalSeatCredentialService } = service();
    const real = new LocalSeatCredentialService({ now: () => nowMs });

    expect(
      (
        await code(
          real.provision({
            operatorPassword: 'wrong',
            seatId: 'local-seat-1',
            password: SEAT_PASSWORD,
            label: 'P1',
            expectedGeneration: 0,
            operationId: 'op-r1',
          }),
        )
      ).code,
    ).toBe('operator-denied');
    const done = await real.provision({
      operatorPassword: 'primary-vault-pass',
      seatId: 'local-seat-1',
      password: SEAT_PASSWORD,
      label: 'P1',
      expectedGeneration: 0,
      operationId: 'op-r2',
    });
    expect(done.seats[0].status).toBe('active');
    expect((await identities.getActive())?.id).toBe(primary.id);
    expect(await identities.getAll()).toHaveLength(1);
    expect(
      new (repository().LocalSeatCredentialRepository)().get('local-seat-1')
        ?.publicKey,
    ).not.toBe(primary.publicKey);
  });
});
