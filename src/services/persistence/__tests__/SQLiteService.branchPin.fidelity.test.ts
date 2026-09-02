/**
 * Migration 26 fidelity and atomicity (Seam B1).
 *
 * `SQLiteService.branchPin.migration.test` proves what the migrated schema
 * DOES. This proves what the migration did not disturb on the way, which
 * needs something the service cannot give: a database stopped at version
 * 25, so before and after are both observable. The ledger is therefore
 * replayed directly here, exactly as `runMigration` replays it.
 *
 * Pins: every journal trigger and index comes back with a BYTE-IDENTICAL
 * body (names alone are the exhaustive catalogs' job); the parked tables'
 * contents digest the same before and after, so the park-and-reinstate
 * moved rows without changing one; a dangling reference makes the
 * migration REFUSE inside its own transaction; and that refusal rolls the
 * whole thing back to a byte-identical version-25 tree - the proof that
 * keeping the runner's transaction was what made the parking safe.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/event-store/spec.md
 */

import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { sha256Sync } from '@/utils/events/hashUtils';

import { JOURNAL_BRANCH_PIN_MIGRATION } from '../SQLiteService.branchPin.migration';
import { MIGRATIONS } from '../SQLiteService.migrations';

const NOW = '2026-09-02T00:00:00.000Z';
const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);

/** The tables whose rows the migration parks and reinstates. */
const PARKED = [
  'event_journal_entity_refs',
  'event_journal_causations',
  'event_journal_events',
] as const;

/** Build a database stopped at version 25, the way the runner would. */
function openAtVersion25(file: string): Database.Database {
  const db = new Database(file);
  db.pragma('foreign_keys = ON');
  for (const migration of MIGRATIONS) {
    if (migration.version > 25) continue;
    const apply = db.transaction((): void => {
      if (typeof migration.up === 'string') db.exec(migration.up);
      else migration.up(db);
      db.prepare(
        `INSERT INTO migrations (version, name, applied_at) VALUES (?, ?, ?)`,
      ).run(migration.version, migration.name, NOW);
    });
    apply();
  }
  return db;
}

/** One committed command with an entity ref and a causation hanging off it. */
function seedJournal(db: Database.Database): void {
  db.prepare(
    `INSERT INTO event_journal_batches (
       command_id, command_digest, canonicalizer_version, stream_type,
       stream_id, branch_id, event_count, first_stream_revision,
       last_stream_revision, first_commit_position, last_commit_position,
       recorded_at)
     VALUES ('cmd-1', ?, 1, 'campaign', 'campaign-fid', 'root', 1, 1, 1, 1, 1, ?)`,
  ).run(DIGEST_A, NOW);
  db.prepare(
    `INSERT INTO event_journal_events (
       event_id, command_id, stream_type, stream_id, branch_id,
       stream_revision, commit_position, command_index, event_type,
       event_version, correlation_id, actor_kind, actor_id, authority_type,
       authority_id, occurred_at, recorded_at, canonicalizer_version,
       previous_stream_event_digest, event_digest, payload_json)
     VALUES ('evt-1', 'cmd-1', 'campaign', 'campaign-fid', 'root', 1, 1, 0,
       'probe_event', 1, 'corr-1', 'system', 'fid', 'campaign',
       'campaign-fid', ?, ?, 1, NULL, ?, '{"v":1}')`,
  ).run(NOW, NOW, DIGEST_B);
  db.prepare(
    `INSERT INTO event_journal_stream_heads
       (stream_type, stream_id, branch_id, stream_revision, event_digest)
     VALUES ('campaign', 'campaign-fid', 'root', 1, ?)`,
  ).run(DIGEST_B);
  const refColumns = (
    db.pragma('table_info(event_journal_entity_refs)') as { name: string }[]
  ).map((row) => row.name);
  // Column sets differ by leaf; fill only what the table declares.
  const refValues: Record<string, unknown> = {
    event_id: 'evt-1',
    commit_position: 1,
    entity_type: 'unit',
    entity_id: 'unit-1',
    role: 'subject',
  };
  db.prepare(
    `INSERT INTO event_journal_entity_refs (${refColumns.join(', ')})
     VALUES (${refColumns.map((c) => `@${c}`).join(', ')})`,
  ).run(Object.fromEntries(refColumns.map((c) => [c, refValues[c] ?? null])));
}

/** Canonical dump of one table, hashed - order-stable and content-exact. */
function digestTable(db: Database.Database, table: string): string {
  const rows = db.prepare(`SELECT * FROM ${table}`).all() as object[];
  const canonical = rows
    .map((row) =>
      JSON.stringify(
        Object.fromEntries(
          Object.entries(row).sort(([left], [right]) =>
            left < right ? -1 : 1,
          ),
        ),
      ),
    )
    .sort();
  return sha256Sync(JSON.stringify(canonical));
}

/** Every journal trigger and index, name AND exact stored body. */
function schemaObjects(db: Database.Database): Record<string, string> {
  const rows = db
    .prepare(
      `SELECT name, sql FROM sqlite_master
       WHERE type IN ('trigger', 'index') AND sql IS NOT NULL
         AND tbl_name LIKE 'event_journal_%'
       ORDER BY name`,
    )
    .all() as { name: string; sql: string }[];
  return Object.fromEntries(rows.map((row) => [row.name, row.sql]));
}

/** The whole version-25 journal, as bytes-in-rows. */
function journalSnapshot(db: Database.Database): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (const table of [
    'event_journal_batches',
    'event_journal_events',
    'event_journal_stream_heads',
    ...PARKED,
    'event_journal_store_state',
  ]) {
    snapshot[table] = digestTable(db, table);
  }
  return snapshot;
}

/** Apply migration 26 exactly as the runner does: one transaction. */
function applyMigration26(db: Database.Database): void {
  const apply = db.transaction((): void => {
    (JOURNAL_BRANCH_PIN_MIGRATION.up as (d: Database.Database) => void)(db);
    db.prepare(
      `INSERT INTO migrations (version, name, applied_at) VALUES (?, ?, ?)`,
    ).run(
      JOURNAL_BRANCH_PIN_MIGRATION.version,
      JOURNAL_BRANCH_PIN_MIGRATION.name,
      NOW,
    );
  });
  apply();
}

describe('migration 26 fidelity and atomicity', () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'branch-pin-fidelity-'));
    file = path.join(dir, 'journal.db');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('every trigger and index comes back with a byte-identical body', () => {
    const db = openAtVersion25(file);
    seedJournal(db);
    const before = schemaObjects(db);
    expect(Object.keys(before).length).toBeGreaterThan(10);

    applyMigration26(db);

    // Not just the same names - the same SQL text. A rebuild that retypes
    // a trigger body is how a guard quietly changes meaning.
    expect(schemaObjects(db)).toStrictEqual(before);
    db.close();
  });

  it('the parked tables digest the same before and after', () => {
    const db = openAtVersion25(file);
    seedJournal(db);
    const before = Object.fromEntries(
      PARKED.map((table) => [table, digestTable(db, table)]),
    );

    applyMigration26(db);

    expect(
      Object.fromEntries(PARKED.map((t) => [t, digestTable(db, t)])),
    ).toStrictEqual(before);
    db.close();
  });

  it('refuses inside its own transaction when a reference would dangle', () => {
    const db = openAtVersion25(file);
    seedJournal(db);
    // Fake a dangling child. Foreign keys are off only for this insert,
    // outside any transaction, so the row exists exactly as a corrupted
    // database would present it.
    db.pragma('foreign_keys = OFF');
    db.prepare(
      // The FK is on (event_id, commit_position) - `causation_event_id`
      // carries none - so the dangling half must be the PARENT reference.
      `INSERT INTO event_journal_causations (event_id, commit_position, causation_event_id)
       VALUES ('evt-missing', 99, 'evt-1')`,
    ).run();
    db.pragma('foreign_keys = ON');

    expect(() => applyMigration26(db)).toThrow(/dangling reference/);
    db.close();
  });

  it('a refusal rolls back to a byte-identical version-25 tree', () => {
    const db = openAtVersion25(file);
    seedJournal(db);
    const schemaBefore = schemaObjects(db);
    const dataBefore = journalSnapshot(db);
    const ledgerBefore = db
      .prepare('SELECT MAX(version) AS version FROM migrations')
      .get() as { version: number };

    db.pragma('foreign_keys = OFF');
    db.prepare(
      // The FK is on (event_id, commit_position) - `causation_event_id`
      // carries none - so the dangling half must be the PARENT reference.
      `INSERT INTO event_journal_causations (event_id, commit_position, causation_event_id)
       VALUES ('evt-missing', 99, 'evt-1')`,
    ).run();
    db.pragma('foreign_keys = ON');
    const dataWithDangler = journalSnapshot(db);

    expect(() => applyMigration26(db)).toThrow();

    // The destructive half - dropped triggers, emptied tables, dropped
    // parent tables - is entirely undone.
    expect(schemaObjects(db)).toStrictEqual(schemaBefore);
    expect(journalSnapshot(db)).toStrictEqual(dataWithDangler);
    expect(
      db.prepare('SELECT MAX(version) AS version FROM migrations').get(),
    ).toStrictEqual(ledgerBefore);
    // And the pin is still there, because 26 never committed.
    const eventsSql = (
      db
        .prepare(
          `SELECT sql FROM sqlite_master WHERE name = 'event_journal_events'`,
        )
        .get() as { sql: string }
    ).sql;
    expect(eventsSql).toContain("CHECK (branch_id = 'root')");
    expect(dataBefore.event_journal_batches).toBe(
      dataWithDangler.event_journal_batches,
    );
    db.close();
  });
});
