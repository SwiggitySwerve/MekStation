import type Database from 'better-sqlite3';

/**
 * Lift the journal's root-branch pin (umbrella task 16.2 prerequisite).
 *
 * Three journal tables pinned `branch_id` to the literal `'root'`:
 * `event_journal_batches`, `event_journal_events` and
 * `event_journal_stream_heads`. Everything ABOVE the journal - immutable
 * branch records, the prior-head resolver, candidate build and
 * verification, the impact manifest, atomic activation - shipped with the
 * branches leaf and cannot be used for a replacement branch, because the
 * stream it would operate on holds exactly one branch BY SCHEMA.
 *
 * This migration replaces that pin with a RULE. After it, the schema
 * admits any non-empty branch id; what refuses an arbitrary one is the
 * effective-head guard above (`EventHistoryExpectedHead`), so only the
 * branches-leaf activation path can move which id a stream accepts. The
 * schema stops being the gate; it stops being a wall that also blocks the
 * legitimate path.
 *
 * WHY THIS IS NOT THE CANONICAL 12-STEP, so nobody rediscovers it:
 * `SQLiteService.runMigration` wraps every migration in
 * `db.transaction(...)`, and SQLite's `PRAGMA foreign_keys = OFF` IS A
 * NO-OP INSIDE A TRANSACTION. Step 1 of the documented table-rebuild
 * procedure therefore does nothing here. Three mechanisms were probed
 * against real better-sqlite3 before this was written:
 *
 *   1. `PRAGMA foreign_keys = OFF` inside the transaction - no-op; the
 *      pragma reads back `1` immediately afterwards.
 *   2. `defer_foreign_keys = ON` + `legacy_alter_table = ON` with a
 *      parent-only rebuild - every statement succeeds and the deferred
 *      check FAILS AT COMMIT: renaming a replacement table into place
 *      does not re-satisfy a child row whose parent was dropped.
 *   3. `PRAGMA writable_schema` surgery - refused outright
 *      ("table sqlite_master may not be modified") inside the
 *      transaction.
 *
 * What does work, and what this migration does: `defer_foreign_keys = ON`
 * (which DOES take effect inside a transaction) plus PARKING the
 * referencing rows - move them to temp tables, delete them, rebuild, then
 * reinstate them - all inside the runner's single transaction. The
 * parking is invisible outside it: either the whole migration commits or
 * none of it does, which is why keeping the runner's transaction was
 * worth more than SQLite's preferred sequence.
 *
 * Two fidelity properties, both by construction rather than by retyping:
 *
 * - **The widened DDL is derived from the stored DDL.** The new table
 *   text is `sqlite_master`'s own `sql` with exactly the CHECK clause
 *   swapped, so every column, foreign key, unique constraint and other
 *   CHECK survives byte-identically. A hand-retyped table body is how a
 *   constraint quietly disappears in a rebuild.
 * - **Triggers and indexes are recreated from their stored text.** They
 *   are captured from `sqlite_master` before the rebuild drops them and
 *   re-executed verbatim, so their BODIES are identical and not merely
 *   their names.
 */

const OLD_CHECK = "CHECK (branch_id = 'root')";
const NEW_CHECK = 'CHECK (length(trim(branch_id)) > 0)';

/** The three tables carrying the pin, parents before children. */
const PINNED_TABLES = [
  'event_journal_batches',
  'event_journal_events',
  'event_journal_stream_heads',
] as const;

/**
 * Rows that must be parked before a rebuild: everything whose foreign key
 * points at a table being dropped, child-first.
 */
const PARKED_TABLES = [
  'event_journal_entity_refs',
  'event_journal_causations',
  'event_journal_events',
] as const;

/** Triggers that would abort the parking deletes. */
const BLOCKING_TRIGGERS = [
  'event_journal_entity_refs_no_delete',
  'event_journal_causations_no_delete',
  'event_journal_events_no_delete',
] as const;

interface ISchemaObject {
  readonly name: string;
  readonly sql: string;
}

/** Every trigger and index the journal owns, with its exact stored text. */
function captureJournalObjects(db: Database.Database): ISchemaObject[] {
  return db
    .prepare(
      `SELECT name, sql FROM sqlite_master
       WHERE type IN ('trigger', 'index')
         AND sql IS NOT NULL
         AND tbl_name LIKE 'event_journal_%'
       ORDER BY name`,
    )
    .all() as ISchemaObject[];
}

/** The stored DDL for one table. */
function tableSql(db: Database.Database, table: string): string {
  const row = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(table) as { sql: string } | undefined;
  if (row === undefined) throw new Error(`Missing table ${table}`);
  return row.sql;
}

/** This table's column names, in declared order. */
function columnsOf(db: Database.Database, table: string): string[] {
  const rows = db.pragma(`table_info(${table})`) as { name: string }[];
  return rows.map((row) => row.name);
}

/**
 * Rebuild one pinned table with the widened CHECK.
 *
 * The replacement's DDL is the original's, with the table name and the
 * CHECK clause swapped - nothing else is authored here, so nothing else
 * can drift.
 */
function rebuildPinnedTable(db: Database.Database, table: string): void {
  const original = tableSql(db, table);
  if (!original.includes(OLD_CHECK)) {
    throw new Error(`${table} does not carry the root pin; refusing to guess`);
  }
  const staging = `${table}__branch26`;
  const widened = original
    .replace(`CREATE TABLE ${table}`, `CREATE TABLE ${staging}`)
    .replace(OLD_CHECK, NEW_CHECK);
  if (widened.includes(OLD_CHECK) || !widened.includes(NEW_CHECK)) {
    throw new Error(`${table} CHECK rewrite did not apply cleanly`);
  }
  const columns = columnsOf(db, table).join(', ');
  db.exec(widened);
  db.exec(
    `INSERT INTO ${staging} (${columns}) SELECT ${columns} FROM ${table}`,
  );
  db.exec(`DROP TABLE ${table}`);
  db.exec(`ALTER TABLE ${staging} RENAME TO ${table}`);
}

export const JOURNAL_BRANCH_PIN_MIGRATION = {
  version: 26,
  name: 'event_journal_branch_pin_lift',
  up: (db: Database.Database): void => {
    // Idempotent: a re-run after a lost migrations record must not fail.
    if (!tableSql(db, PINNED_TABLES[0]).includes(OLD_CHECK)) return;

    // Effective inside a transaction, unlike `foreign_keys` - see header.
    db.exec('PRAGMA defer_foreign_keys = ON');

    const objects = captureJournalObjects(db);

    // 1. Drop the guards that would abort the parking deletes. They are
    //    recreated from their captured text below, so the catalog is
    //    unchanged by the time anything else can observe it.
    for (const trigger of BLOCKING_TRIGGERS) {
      db.exec(`DROP TRIGGER IF EXISTS ${trigger}`);
    }

    // 2. Park every referencing row, child-first, and empty the tables.
    const parkedColumns = new Map<string, string>();
    for (const table of PARKED_TABLES) {
      const columns = columnsOf(db, table).join(', ');
      parkedColumns.set(table, columns);
      db.exec(
        `CREATE TEMP TABLE park_${table} AS SELECT ${columns} FROM ${table}`,
      );
      db.exec(`DELETE FROM ${table}`);
    }

    // 3. Rebuild the pinned tables. `event_journal_events` is empty at
    //    this point (parked above), so its own rebuild copies nothing and
    //    its rows come back in step 4 with the rest.
    for (const table of PINNED_TABLES) {
      rebuildPinnedTable(db, table);
    }

    // 4. Reinstate the parked rows, parents before children.
    for (const table of [...PARKED_TABLES].reverse()) {
      const columns = parkedColumns.get(table) as string;
      db.exec(
        `INSERT INTO ${table} (${columns}) SELECT ${columns} FROM park_${table}`,
      );
      db.exec(`DROP TABLE park_${table}`);
    }

    // 5. Recreate every trigger and index the rebuild dropped, from the
    //    text it was created with. Bodies identical, not just names.
    const surviving = new Set(
      captureJournalObjects(db).map((object) => object.name),
    );
    for (const object of objects) {
      if (surviving.has(object.name)) continue;
      db.exec(object.sql);
    }

    // 6. Nothing may dangle. Asserted INSIDE the transaction, so a
    //    violation rolls the whole migration back rather than committing
    //    a journal whose references no longer resolve.
    const violations = db.pragma('foreign_key_check') as unknown[];
    if (violations.length > 0) {
      throw new Error(
        `Branch pin lift left ${violations.length} dangling reference(s); rolling back`,
      );
    }
  },
};
