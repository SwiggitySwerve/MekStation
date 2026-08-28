/**
 * Read-only SQLite evidence reader (harden-gm-two-player-campaign-sessions
 * 20.3).
 *
 * Durable claims in this program are proven by reading rows out of the
 * databases the run actually wrote — receipts, batches, outbox,
 * participants, cursors, branches. The plan forbids doing that through
 * `DurableMatchStore`, and the reason is not tidiness:
 *
 * - **The production store CREATES its file and runs migrations.**
 *   Pointed at a database the run never produced, it would manufacture
 *   an empty one and report "0 rows" — evidence of absence conjured from
 *   nothing, which is exactly the shape of a false pass. Opening with
 *   `fileMustExist` turns that into a thrown error.
 * - **A writable handle can change what it is observing.** Evidence
 *   gathering must leave the subject byte-identical, or the artifact no
 *   longer describes the run it claims to describe. `readonly` makes
 *   that a database-level guarantee rather than a convention.
 *
 * So this module opens its own connection and deliberately imports
 * NOTHING from the production persistence layer.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md (20.3)
 */

import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import fs from 'node:fs';

/** Raised instead of silently creating or mutating a database. */
export class EvidenceReaderError extends Error {
  public constructor(
    public readonly code:
      | 'EVIDENCE_DB_MISSING'
      | 'EVIDENCE_DB_UNREADABLE'
      | 'EVIDENCE_WRITE_REFUSED',
    detail: string,
  ) {
    super(`${code} ${detail}`);
    this.name = 'EvidenceReaderError';
  }
}

export interface ISqliteEvidenceReader {
  /** Rows for a SELECT. Anything else is refused. */
  readonly select: <T = Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
  ) => readonly T[];
  /** Row count for one table. */
  readonly count: (table: string) => number;
  /** Ordered table names — the schema surface, for before/after equality. */
  readonly tables: () => readonly string[];
  /** SHA-256 of the file on disk, for proving the read changed nothing. */
  readonly fileHash: () => string;
  readonly close: () => void;
}

/** Only these open a read. Everything else is a write in disguise. */
const READ_ONLY_STATEMENT = /^\s*(select|pragma|explain|with)\b/i;

/**
 * Opens a database for evidence reading.
 *
 * `fileMustExist` is the load-bearing option: without it, a typo in a
 * path silently produces an empty database and every "no rows" assertion
 * against it passes for the wrong reason.
 */
export function openSqliteEvidenceReader(
  databasePath: string,
): ISqliteEvidenceReader {
  if (!fs.existsSync(databasePath)) {
    // Checked before opening as well as via `fileMustExist`, so the
    // error names the path rather than surfacing a driver message.
    throw new EvidenceReaderError('EVIDENCE_DB_MISSING', databasePath);
  }

  let db: Database.Database;
  try {
    db = new Database(databasePath, { readonly: true, fileMustExist: true });
  } catch (error) {
    throw new EvidenceReaderError(
      'EVIDENCE_DB_UNREADABLE',
      `${databasePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const assertReadOnlyStatement = (sql: string): void => {
    if (!READ_ONLY_STATEMENT.test(sql)) {
      // The connection would refuse a write anyway; refusing it HERE
      // names the offending statement instead of surfacing a generic
      // "attempt to write a readonly database".
      throw new EvidenceReaderError('EVIDENCE_WRITE_REFUSED', sql.trim());
    }
  };

  return {
    select: <T = Record<string, unknown>>(
      sql: string,
      params: readonly unknown[] = [],
    ): readonly T[] => {
      assertReadOnlyStatement(sql);
      return db.prepare(sql).all(...params) as T[];
    },
    count: (table: string): number => {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) {
        // Table names cannot be bound as parameters, so the only safe
        // interpolation is one that cannot carry SQL at all.
        throw new EvidenceReaderError('EVIDENCE_WRITE_REFUSED', table);
      }
      const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as {
        n: number;
      };
      return row.n;
    },
    tables: (): readonly string[] =>
      (
        db
          .prepare(
            `SELECT name FROM sqlite_master
             WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
             ORDER BY name`,
          )
          .all() as { name: string }[]
      ).map((row) => row.name),
    fileHash: (): string =>
      createHash('sha256').update(fs.readFileSync(databasePath)).digest('hex'),
    close: (): void => {
      db.close();
    },
  };
}
