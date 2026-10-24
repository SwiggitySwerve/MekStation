/** LSC-1S: separate seat credentials; atomic replay, generation CAS and outcome. */

import type Database from 'better-sqlite3';

import type { IEncryptedData } from '@/types/vault';

import { getSQLiteService } from '@/services/persistence';

export const LOCAL_SEAT_IDS = ['local-seat-1', 'local-seat-2'] as const;
export type LocalSeatId = (typeof LOCAL_SEAT_IDS)[number];

export interface ILocalSeatCredentialRow {
  readonly seatId: LocalSeatId;
  readonly label: string;
  readonly publicKey: string;
  readonly encryptedPrivateKey: IEncryptedData;
  readonly generation: number;
  readonly revokedAt: string | null;
  readonly failedAttempts: number;
  readonly lockedUntilMs: number;
}

interface ILocalSeatWriteBase {
  readonly operationId: string;
  readonly fingerprint: string;
  readonly seatId: LocalSeatId;
  readonly expectedGeneration: number;
  readonly nowIso: string;
}

export interface ILocalSeatProvisionWrite extends ILocalSeatWriteBase {
  readonly label: string;
  readonly publicKey: string;
  readonly encryptedPrivateKey: IEncryptedData;
}

export type LocalSeatWriteResult =
  | { readonly kind: 'applied'; readonly generation: number }
  | { readonly kind: 'replayed'; readonly generation: number }
  | { readonly kind: 'operation-mismatch' }
  | { readonly kind: 'not-revocable'; readonly currentGeneration: number }
  | {
      readonly kind: 'generation-conflict';
      readonly currentGeneration: number;
    };

export interface ILocalSeatLockoutPolicy {
  readonly maxFailures: number;
  readonly lockoutMs: number;
}

interface ISeatRow {
  seat_id: LocalSeatId;
  label: string;
  public_key: string;
  encrypted_private_key: string;
  generation: number;
  revoked_at: string | null;
  failed_attempts: number;
  locked_until_ms: number;
}

interface IOperationRow {
  kind: string;
  seat_id: string;
  fingerprint: string;
  result_generation: number;
}

function toRow(row: ISeatRow): ILocalSeatCredentialRow {
  return {
    seatId: row.seat_id,
    label: row.label,
    publicKey: row.public_key,
    encryptedPrivateKey: JSON.parse(
      row.encrypted_private_key,
    ) as IEncryptedData,
    generation: row.generation,
    revokedAt: row.revoked_at,
    failedAttempts: row.failed_attempts,
    lockedUntilMs: row.locked_until_ms,
  };
}

export class LocalSeatCredentialRepository {
  constructor(
    private readonly database: () => Database.Database = () => {
      const service = getSQLiteService();
      service.initialize();
      return service.getDatabase();
    },
  ) {}

  readonly get = (seatId: LocalSeatId): ILocalSeatCredentialRow | null => {
    const row = this.database()
      .prepare('SELECT * FROM local_seat_credentials WHERE seat_id = ?')
      .get(seatId) as ISeatRow | undefined;
    return row ? toRow(row) : null;
  };

  readonly provision = (
    write: ILocalSeatProvisionWrite,
  ): LocalSeatWriteResult =>
    this.write(
      write,
      'provision',
      (db, generation) =>
        db
          .prepare(
            `INSERT INTO local_seat_credentials
           (seat_id, label, public_key, encrypted_private_key, generation,
            revoked_at, failed_attempts, locked_until_ms, updated_at)
         VALUES (@seatId, @label, @publicKey, @key, @generation, NULL, 0, 0, @now)
         ON CONFLICT(seat_id) DO UPDATE SET
           label = excluded.label, public_key = excluded.public_key,
           encrypted_private_key = excluded.encrypted_private_key,
           generation = excluded.generation, revoked_at = NULL,
           failed_attempts = 0, locked_until_ms = 0,
           updated_at = excluded.updated_at
         WHERE local_seat_credentials.generation = @expected`,
          )
          .run({
            seatId: write.seatId,
            label: write.label,
            publicKey: write.publicKey,
            key: JSON.stringify(write.encryptedPrivateKey),
            generation,
            expected: write.expectedGeneration,
            now: write.nowIso,
          }).changes,
    );

  readonly revoke = (write: ILocalSeatWriteBase): LocalSeatWriteResult =>
    this.write(
      write,
      'revoke',
      (db, generation) =>
        db
          .prepare(
            `UPDATE local_seat_credentials
           SET generation = ?, revoked_at = ?, updated_at = ?
         WHERE seat_id = ? AND generation = ? AND revoked_at IS NULL`,
          )
          .run(
            generation,
            write.nowIso,
            write.nowIso,
            write.seatId,
            write.expectedGeneration,
          ).changes,
    );

  /** Only success/re-provision clears the count; expiry's next failure re-locks.
   * nowMs uses the caller's deadline clock; rollback must not shorten a lock. */
  readonly recordFailure = (
    seatId: LocalSeatId,
    generation: number,
    nowMs: number,
    policy: ILocalSeatLockoutPolicy,
  ): void => {
    this.database()
      .prepare(
        `UPDATE local_seat_credentials
           SET failed_attempts = failed_attempts + 1,
               locked_until_ms = CASE WHEN failed_attempts + 1 >= ?
                 THEN MAX(locked_until_ms, ?) ELSE locked_until_ms END
         WHERE seat_id = ? AND generation = ?`,
      )
      .run(policy.maxFailures, nowMs + policy.lockoutMs, seatId, generation);
  };

  readonly clearFailures = (seatId: LocalSeatId, generation: number): void => {
    this.database()
      .prepare(
        `UPDATE local_seat_credentials SET failed_attempts = 0, locked_until_ms = 0
         WHERE seat_id = ? AND generation = ?`,
      )
      .run(seatId, generation);
  };

  private write(
    write: ILocalSeatWriteBase,
    kind: 'provision' | 'revoke',
    apply: (db: Database.Database, generation: number) => number,
  ): LocalSeatWriteResult {
    const db = this.database();
    const run = db.transaction((): LocalSeatWriteResult => {
      const prior = db
        .prepare(
          'SELECT kind, seat_id, fingerprint, result_generation FROM local_seat_credential_operations WHERE operation_id = ?',
        )
        .get(write.operationId) as IOperationRow | undefined;
      if (prior) {
        return prior.kind === kind &&
          prior.seat_id === write.seatId &&
          prior.fingerprint === write.fingerprint
          ? { kind: 'replayed', generation: prior.result_generation }
          : { kind: 'operation-mismatch' };
      }
      const current = this.get(write.seatId);
      const currentGeneration = current?.generation ?? 0;
      if (currentGeneration !== write.expectedGeneration) {
        return { kind: 'generation-conflict', currentGeneration };
      }
      if (kind === 'revoke' && current?.revokedAt !== null) {
        return { kind: 'not-revocable', currentGeneration };
      }
      const generation = currentGeneration + 1;
      if (apply(db, generation) !== 1) {
        return { kind: 'generation-conflict', currentGeneration };
      }
      db.prepare(
        `INSERT INTO local_seat_credential_operations
         (operation_id, seat_id, kind, fingerprint, result_generation, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        write.operationId,
        write.seatId,
        kind,
        write.fingerprint,
        generation,
        write.nowIso,
      );
      return { kind: 'applied', generation };
    });
    return run.immediate();
  }
}
