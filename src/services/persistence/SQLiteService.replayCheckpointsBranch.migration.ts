import type Database from 'better-sqlite3';

/**
 * Lift the checkpoint cache's root-branch pin (umbrella task 16.2, Seam
 * C1b).
 *
 * Migration 10 wrote `CHECK (branch_id = 'root')` on `replay_checkpoints`
 * deliberately: it mirrored the journal's own root pin, so a checkpoint
 * could never cache a branch whose events could not exist. Migration 26
 * removed the journal's side of that mirror. Leaving this one standing
 * does not keep the pair honest, it breaks the pair: a stream that has
 * been rewound answers from a branch the cache may not name, so
 * checkpointing SILENTLY STOPS for exactly the streams a rebuild made
 * expensive to replay.
 *
 * The widened rule is migration 26's, character for character - a
 * non-empty branch id - so the two tables agree about what a branch id
 * is. The pin narrows rather than vanishes: a blank id is still refused
 * by the schema, and which branch a stream actually answers from stays
 * the effective-head guard's decision, never the cache's.
 *
 * The version is 27 and not a reserved higher number: the ledger's
 * own suite asserts `COUNT(*) = MAX(version)`, so migration versions
 * are CONTIGUOUS by test, and a hole left for planned work would
 * fail it the moment this lands. Numbering follows landing order.
 *
 * WHY THIS IS SHORTER THAN MIGRATION 26, so nobody assumes the ceremony
 * was skipped. That migration parked rows, deferred foreign keys, and
 * asserted `foreign_key_check` because the tables it rebuilt had FOREIGN
 * KEY CHILDREN. This table has none - measured: nothing anywhere
 * REFERENCES `replay_checkpoints`, and migration 10's own header records
 * the same fact from the other side ("no foreign keys into ... any
 * event_journal_* table"). With no child rows to strand there is nothing
 * to park, `defer_foreign_keys` has nothing to defer, and a
 * `foreign_key_check` here would assert over a table no key touches. A
 * vacuous check that always passes is worse than no check: it reads like
 * a guarantee.
 *
 * What IS kept from migration 26, because it is what makes a rebuild
 * faithful rather than a retype:
 *
 * - **The widened DDL is derived from the stored DDL.** The replacement
 *   is `sqlite_master`'s own `sql` with exactly the table name and the
 *   CHECK clause swapped, so every column, the UNIQUE identity tuple, and
 *   the other eight CHECKs survive byte-identically.
 * - **The trigger is recreated from its stored text.** `replay_checkpoints`
 *   carries the `_no_update` write-once guard; `DROP TABLE` takes it with
 *   the table, and it comes back from the text it was created with, so
 *   its BODY is identical and not merely its name. Unlike migration 26 it
 *   is not dropped first - it fires `BEFORE UPDATE`, and a rebuild
 *   inserts and drops, so it never blocks the copy.
 *
 * The UNIQUE constraint's implicit index is deliberately NOT captured:
 * SQLite stores it with `sql IS NULL` because it belongs to the table
 * definition, and the derived DDL recreates it. Capturing it would mean
 * trying to re-execute a null.
 */

const OLD_CHECK = "CHECK (branch_id = 'root')";
const NEW_CHECK = 'CHECK (length(trim(branch_id)) > 0)';

const TABLE = 'replay_checkpoints';

interface ISchemaObject {
  readonly name: string;
  readonly sql: string;
}

/** Every trigger and index this table owns, with its exact stored text. */
function captureCheckpointObjects(db: Database.Database): ISchemaObject[] {
  return db
    .prepare(
      `SELECT name, sql FROM sqlite_master
       WHERE type IN ('trigger', 'index')
         AND sql IS NOT NULL
         AND tbl_name = ?
       ORDER BY name`,
    )
    .all(TABLE) as ISchemaObject[];
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

export const REPLAY_CHECKPOINTS_BRANCH_MIGRATION = {
  version: 27,
  name: 'replay_checkpoints_branch_pin_lift',
  up: (db: Database.Database): void => {
    // Idempotent: a re-run after a lost migrations record must not fail.
    const original = tableSql(db, TABLE);
    if (!original.includes(OLD_CHECK)) return;

    const objects = captureCheckpointObjects(db);

    const staging = `${TABLE}__branch27`;
    const widened = original
      .replace(`CREATE TABLE ${TABLE}`, `CREATE TABLE ${staging}`)
      .replace(OLD_CHECK, NEW_CHECK);
    // The rewrite is asserted rather than assumed: a `String.replace` that
    // matched nothing returns the subject unchanged, which would rebuild
    // the table with the pin still on it and report success.
    if (widened.includes(OLD_CHECK) || !widened.includes(NEW_CHECK)) {
      throw new Error(`${TABLE} CHECK rewrite did not apply cleanly`);
    }

    const columns = columnsOf(db, TABLE).join(', ');
    db.exec(widened);
    db.exec(
      `INSERT INTO ${staging} (${columns}) SELECT ${columns} FROM ${TABLE}`,
    );
    db.exec(`DROP TABLE ${TABLE}`);
    db.exec(`ALTER TABLE ${staging} RENAME TO ${TABLE}`);

    // Recreate whatever the rebuild dropped, from the text it was created
    // with. Bodies identical, not just names.
    const surviving = new Set(
      captureCheckpointObjects(db).map((object) => object.name),
    );
    for (const object of objects) {
      if (surviving.has(object.name)) continue;
      db.exec(object.sql);
    }
  },
};
