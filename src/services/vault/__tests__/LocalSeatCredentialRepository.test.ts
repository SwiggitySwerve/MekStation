/**
 * LSC-1S: local seat repository against the real migrated schema (LSC-1DB
 * migration 33): operation-id replay and refusal, generation CAS,
 * revocation, durable failure count and lock (CF-LSC0-8, CF-LSC0-16),
 * and secret-free operation records (CF-LSC0-6). Never touches
 * vault_identities. The module is looked up at run time so RED fails on
 * assertions, not module resolution (F6).
 */

import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

type SeatId = 'local-seat-1' | 'local-seat-2';
interface IWrite {
  operationId: string;
  fingerprint: string;
  seatId: SeatId;
  expectedGeneration: number;
  nowIso: string;
}
interface IProvision extends IWrite {
  label: string;
  publicKey: string;
  encryptedPrivateKey: {
    ciphertext: string;
    iv: string;
    salt: string;
    algorithm: string;
  };
}
interface IRepo {
  get(seatId: SeatId): Record<string, unknown> | null;
  provision(write: IProvision): Record<string, unknown>;
  revoke(write: IWrite): Record<string, unknown>;
  recordFailure(
    seatId: SeatId,
    generation: number,
    nowMs: number,
    policy: { maxFailures: number; lockoutMs: number },
  ): void;
  clearFailures(seatId: SeatId, generation: number): void;
}

function loadRepository(): new (database?: () => Database.Database) => IRepo {
  let mod: {
    LocalSeatCredentialRepository?: new (
      database?: () => Database.Database,
    ) => IRepo;
  } = {};
  try {
    mod = jest.requireActual('@/services/vault/LocalSeatCredentialRepository');
  } catch {
    // Absent before GREEN; the assertion below reports it.
  }
  expect(typeof mod.LocalSeatCredentialRepository).toBe('function');
  return mod.LocalSeatCredentialRepository as new (
    database?: () => Database.Database,
  ) => IRepo;
}

const POLICY = { maxFailures: 5, lockoutMs: 60_000 };
const fp = (n: number): string => n.toString(16).padStart(64, '0');

function provisionWrite(overrides: Partial<IProvision> = {}): IProvision {
  return {
    operationId: 'op-provision-1',
    fingerprint: fp(1),
    seatId: 'local-seat-1',
    expectedGeneration: 0,
    nowIso: '2026-10-18T00:00:00.000Z',
    label: 'Player 1',
    publicKey: 'cHVibGlj',
    encryptedPrivateKey: {
      ciphertext: 'Yw==',
      iv: 'aQ==',
      salt: 'cw==',
      algorithm: 'AES-GCM-256',
    },
    ...overrides,
  };
}

const revokeWrite = (overrides: Partial<IWrite> = {}): IWrite => ({
  operationId: 'op-revoke-1',
  fingerprint: fp(9),
  seatId: 'local-seat-1',
  expectedGeneration: 1,
  nowIso: '2026-10-18T00:01:00.000Z',
  ...overrides,
});

describe('LocalSeatCredentialRepository (LSC-1S)', () => {
  let dir: string;
  let repository: IRepo;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'local-seat-repo-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'seats.db') }).initialize();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function repo(): IRepo {
    repository ??= new (loadRepository())();
    return repository;
  }

  beforeEach(() => {
    repository = undefined as unknown as IRepo;
  });

  it('provisions generation 1 and reads back public and encrypted material only', () => {
    expect(repo().provision(provisionWrite())).toEqual({
      kind: 'applied',
      generation: 1,
    });
    expect(repo().get('local-seat-1')).toMatchObject({
      seatId: 'local-seat-1',
      label: 'Player 1',
      generation: 1,
      revokedAt: null,
      failedAttempts: 0,
      lockedUntilMs: 0,
      encryptedPrivateKey: { ciphertext: 'Yw==', iv: 'aQ==', salt: 'cw==' },
    });
    expect(repo().get('local-seat-2')).toBeNull();
  });

  it('replays an identical operation and refuses a reused id for a different request', () => {
    repo().provision(provisionWrite());
    expect(repo().provision(provisionWrite())).toEqual({
      kind: 'replayed',
      generation: 1,
    });
    expect(repo().provision(provisionWrite({ fingerprint: fp(2) }))).toEqual({
      kind: 'operation-mismatch',
    });
    expect(
      repo().provision(provisionWrite({ seatId: 'local-seat-2' })),
    ).toEqual({ kind: 'operation-mismatch' });
    expect(
      repo().revoke(
        revokeWrite({ operationId: 'op-provision-1', fingerprint: fp(1) }),
      ),
    ).toEqual({ kind: 'operation-mismatch' });
    expect(repo().get('local-seat-1')?.generation).toBe(1);
    expect(repo().get('local-seat-2')).toBeNull();
  });

  it('fences competing writers on the expected generation', () => {
    repo().provision(provisionWrite());
    expect(
      repo().provision(
        provisionWrite({ operationId: 'op-2', fingerprint: fp(3) }),
      ),
    ).toEqual({
      kind: 'generation-conflict',
      currentGeneration: 1,
    });
    expect(
      repo().provision(
        provisionWrite({
          operationId: 'op-3',
          fingerprint: fp(4),
          expectedGeneration: 1,
          publicKey: 'cm90YXRlZA==',
        }),
      ),
    ).toEqual({ kind: 'applied', generation: 2 });
    expect(repo().get('local-seat-1')?.publicKey).toBe('cm90YXRlZA==');
  });

  it('refuses a nonzero expected generation for an empty seat', () => {
    expect(repo().provision(provisionWrite({ expectedGeneration: 2 }))).toEqual(
      { kind: 'generation-conflict', currentGeneration: 0 },
    );
    expect(repo().get('local-seat-1')).toBeNull();
    expect(
      getSQLiteService()
        .getDatabase()
        .prepare('SELECT COUNT(*) AS n FROM local_seat_credential_operations')
        .get(),
    ).toEqual({ n: 0 });
  });

  it('never shortens a durable lock when the wall clock moves backward', () => {
    repo().provision(provisionWrite());
    for (let i = 0; i < 5; i++)
      repo().recordFailure('local-seat-1', 1, 10_000, POLICY);
    repo().recordFailure('local-seat-1', 1, 1_000, POLICY);
    expect(repo().get('local-seat-1')).toMatchObject({
      failedAttempts: 6,
      lockedUntilMs: 70_000,
    });
  });

  it('records only the winning operation across two connections (CF-LSC1DB-2)', () => {
    const second = new Database(path.join(dir, 'seats.db'));
    try {
      const other = new (loadRepository())(() => second);
      repo().provision(provisionWrite());
      const before = other.get('local-seat-1');
      expect(other.provision(provisionWrite({ operationId: 'loser' }))).toEqual(
        { kind: 'generation-conflict', currentGeneration: 1 },
      );
      expect(other.get('local-seat-1')).toEqual(before);
      expect(
        second
          .prepare(
            'SELECT operation_id, result_generation FROM local_seat_credential_operations',
          )
          .all(),
      ).toEqual([{ operation_id: 'op-provision-1', result_generation: 1 }]);
    } finally {
      second.close();
    }
  });

  it.each(['provision', 'revoke'] as const)(
    'requires exactly one changed row for %s CAS (CF-LSC1DB-1)',
    (kind) => {
      repo().provision(provisionWrite());
      const before = repo().get('local-seat-1');
      const db = getSQLiteService().getDatabase();
      const prepare = db.prepare.bind(db);
      jest.spyOn(db, 'prepare').mockImplementation((sql: string) => {
        const statement = prepare(sql);
        if (
          sql.includes(
            kind === 'provision' ? 'ON CONFLICT(seat_id)' : 'SET generation =',
          )
        ) {
          jest
            .spyOn(statement, 'run')
            .mockReturnValue({ changes: 0, lastInsertRowid: 0 });
        }
        return statement;
      });
      const result =
        kind === 'provision'
          ? repo().provision(
              provisionWrite({
                operationId: 'cas-loser',
                expectedGeneration: 1,
              }),
            )
          : repo().revoke(revokeWrite());
      expect(result).toEqual({
        kind: 'generation-conflict',
        currentGeneration: 1,
      });
      expect(repo().get('local-seat-1')).toEqual(before);
      expect(
        db
          .prepare('SELECT COUNT(*) AS n FROM local_seat_credential_operations')
          .get(),
      ).toEqual({ n: 1 });
    },
  );

  it('rolls back the credential write if recording the operation fails', () => {
    repo().provision(provisionWrite());
    const before = repo().get('local-seat-1');
    const db = getSQLiteService().getDatabase();
    db.exec(
      "CREATE TRIGGER refuse_operation BEFORE INSERT ON local_seat_credential_operations BEGIN SELECT RAISE(ABORT, 'operation failed'); END",
    );
    expect(() =>
      repo().provision(
        provisionWrite({ operationId: 'rollback', expectedGeneration: 1 }),
      ),
    ).toThrow();
    expect(repo().get('local-seat-1')).toEqual(before);
    expect(
      db
        .prepare('SELECT COUNT(*) AS n FROM local_seat_credential_operations')
        .get(),
    ).toEqual({ n: 1 });
  });

  it('revokes once, then reports not-revocable for a second revoke and an unprovisioned revoke', () => {
    repo().provision(provisionWrite());
    expect(repo().revoke(revokeWrite())).toEqual({
      kind: 'applied',
      generation: 2,
    });
    expect(repo().get('local-seat-1')?.revokedAt).toBe(
      '2026-10-18T00:01:00.000Z',
    );
    expect(
      repo().revoke(
        revokeWrite({ operationId: 'op-revoke-2', expectedGeneration: 2 }),
      ),
    ).toEqual({
      kind: 'not-revocable',
      currentGeneration: 2,
    });
    expect(
      repo().revoke(
        revokeWrite({
          operationId: 'op-revoke-3',
          seatId: 'local-seat-2',
          expectedGeneration: 0,
        }),
      ),
    ).toEqual({
      kind: 'not-revocable',
      currentGeneration: 0,
    });
  });

  it('locks after 5 failures, keeps the lock through a revoke and clears it on re-provision (CF-LSC0-8)', () => {
    repo().provision(provisionWrite());
    for (let i = 1; i <= 4; i += 1)
      repo().recordFailure('local-seat-1', 1, i * 1000, POLICY);
    expect(repo().get('local-seat-1')).toMatchObject({
      failedAttempts: 4,
      lockedUntilMs: 0,
    });
    repo().recordFailure('local-seat-1', 1, 5000, POLICY);
    expect(repo().get('local-seat-1')).toMatchObject({
      failedAttempts: 5,
      lockedUntilMs: 65_000,
    });

    repo().revoke(revokeWrite());
    expect(repo().get('local-seat-1')).toMatchObject({
      generation: 2,
      failedAttempts: 5,
      lockedUntilMs: 65_000,
    });

    repo().provision(
      provisionWrite({
        operationId: 'op-reprovision',
        fingerprint: fp(5),
        expectedGeneration: 2,
      }),
    );
    expect(repo().get('local-seat-1')).toMatchObject({
      generation: 3,
      revokedAt: null,
      failedAttempts: 0,
      lockedUntilMs: 0,
    });
  });

  it('re-locks on the first failure after a lock expires, and only a success clears the count (CF-LSC0-16)', () => {
    repo().provision(provisionWrite());
    for (let i = 1; i <= 5; i += 1)
      repo().recordFailure('local-seat-1', 1, i, POLICY);
    expect(repo().get('local-seat-1')?.lockedUntilMs).toBe(
      5 + POLICY.lockoutMs,
    );
    // The lock has expired; the count is still 5, so one more failure re-locks.
    repo().recordFailure('local-seat-1', 1, 200_000, POLICY);
    expect(repo().get('local-seat-1')).toMatchObject({
      failedAttempts: 6,
      lockedUntilMs: 260_000,
    });
    repo().clearFailures('local-seat-1', 1);
    expect(repo().get('local-seat-1')).toMatchObject({
      failedAttempts: 0,
      lockedUntilMs: 0,
    });
  });

  it('ignores failures and clears fenced by a stale generation, and keeps the lock across a restart', () => {
    repo().provision(provisionWrite());
    for (let i = 1; i <= 5; i += 1)
      repo().recordFailure('local-seat-1', 1, 1000, POLICY);
    repo().recordFailure('local-seat-1', 0, 2000, POLICY);
    repo().clearFailures('local-seat-1', 0);
    expect(repo().get('local-seat-1')).toMatchObject({
      failedAttempts: 5,
      lockedUntilMs: 61_000,
    });

    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'seats.db') }).initialize();
    expect(new (loadRepository())().get('local-seat-1')).toMatchObject({
      failedAttempts: 5,
      lockedUntilMs: 61_000,
    });
  });

  it('keeps operation records and seat rows free of secrets and never creates vault_identities (CF-LSC0-6)', () => {
    repo().provision(provisionWrite());
    repo().revoke(revokeWrite());
    const db = getSQLiteService().getDatabase();
    const dump = JSON.stringify([
      db.prepare('SELECT * FROM local_seat_credential_operations').all(),
      db.prepare('SELECT * FROM local_seat_credentials').all(),
    ]);
    expect(dump).not.toMatch(/password|secret/i);
    for (const row of db
      .prepare('SELECT fingerprint FROM local_seat_credential_operations')
      .all() as Array<{ fingerprint: string }>) {
      expect(row.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE name = 'vault_identities'",
        )
        .get(),
    ).toBeUndefined();
  });
  describe('LSC-2O distinct not-revocable result', () => {
    const operationCount = () =>
      getSQLiteService()
        .getDatabase()
        .prepare('SELECT COUNT(*) AS n FROM local_seat_credential_operations')
        .get();

    it('O01 refuses a fresh revoke of an absent seat at the matching generation without writing', () => {
      expect(repo().revoke(revokeWrite({ expectedGeneration: 0 }))).toEqual({
        kind: 'not-revocable',
        currentGeneration: 0,
      });
      expect(repo().get('local-seat-1')).toBeNull();
      expect(operationCount()).toEqual({ n: 0 });
    });

    it('O02 refuses a fresh revoke of an already-revoked seat at the matching generation without writing', () => {
      repo().provision(provisionWrite());
      repo().revoke(revokeWrite());
      const before = repo().get('local-seat-1');
      expect(
        repo().revoke(
          revokeWrite({
            operationId: 'op-revoke-again',
            fingerprint: fp(10),
            expectedGeneration: 2,
          }),
        ),
      ).toEqual({ kind: 'not-revocable', currentGeneration: 2 });
      expect(repo().get('local-seat-1')).toEqual(before);
      expect(operationCount()).toEqual({ n: 2 });
    });

    it('O03 keeps generation-conflict for a stale generation on absent, active and revoked seats', () => {
      expect(repo().revoke(revokeWrite({ expectedGeneration: 3 }))).toEqual({
        kind: 'generation-conflict',
        currentGeneration: 0,
      });
      repo().provision(provisionWrite());
      expect(
        repo().revoke(
          revokeWrite({
            operationId: 'op-stale-active',
            expectedGeneration: 0,
          }),
        ),
      ).toEqual({ kind: 'generation-conflict', currentGeneration: 1 });
      repo().revoke(revokeWrite());
      expect(
        repo().revoke(
          revokeWrite({
            operationId: 'op-stale-revoked',
            expectedGeneration: 1,
          }),
        ),
      ).toEqual({ kind: 'generation-conflict', currentGeneration: 2 });
      expect(operationCount()).toEqual({ n: 2 });
    });

    it('O04 looks up the operation id first, so a replayed revoke keeps its original generation', () => {
      repo().provision(provisionWrite());
      expect(repo().revoke(revokeWrite())).toEqual({
        kind: 'applied',
        generation: 2,
      });
      expect(repo().revoke(revokeWrite())).toEqual({
        kind: 'replayed',
        generation: 2,
      });
      repo().provision(
        provisionWrite({
          operationId: 'op-reprovision',
          fingerprint: fp(5),
          expectedGeneration: 2,
        }),
      );
      expect(repo().revoke(revokeWrite())).toEqual({
        kind: 'replayed',
        generation: 2,
      });
      expect(repo().get('local-seat-1')).toMatchObject({
        generation: 3,
        revokedAt: null,
      });
    });

    it('O05 still refuses an operation id reused with a different kind, seat or fingerprint', () => {
      repo().provision(provisionWrite());
      repo().revoke(revokeWrite());
      expect(repo().revoke(revokeWrite({ fingerprint: fp(11) }))).toEqual({
        kind: 'operation-mismatch',
      });
      expect(
        repo().revoke(
          revokeWrite({ seatId: 'local-seat-2', expectedGeneration: 0 }),
        ),
      ).toEqual({ kind: 'operation-mismatch' });
      expect(
        repo().provision(
          provisionWrite({
            operationId: 'op-revoke-1',
            fingerprint: fp(9),
            expectedGeneration: 2,
          }),
        ),
      ).toEqual({ kind: 'operation-mismatch' });
      expect(repo().get('local-seat-1')?.generation).toBe(2);
    });
  });
});
