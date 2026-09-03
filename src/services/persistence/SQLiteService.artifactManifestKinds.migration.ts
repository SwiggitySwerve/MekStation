/**
 * Widen the artifact-manifest kind CHECK (umbrella 16.4-a).
 *
 * Migration 25 stored four combat kinds. Campaign rewind now has real
 * identities to seal — scenario drafts, encounters, salvage rolls,
 * contracts, and unprojected time-cascade refs — and SQLite cannot
 * ALTER a CHECK in place. This rebuilds the entries table from its
 * stored DDL (copy, drop, rename) so existing combat rows stay and
 * unknown kinds stay refused.
 *
 * Version 30 is contiguous after 29: the ledger suite pins the head
 * by exact number, so a hole would fail COUNT(*) = MAX(version).
 */

import type Database from 'better-sqlite3';

const TABLE = 'event_history_artifact_manifest_entries';

const OLD_KIND_IN =
  "artifact_kind IN ('replay', 'export', 'checkpoint', 'projection')";

/**
 * Closed kind set an activation may invalidate. Combat four stay;
 * the five campaign kinds are the identities that already exist.
 */
export const EVENT_HISTORY_ARTIFACT_KINDS = [
  'replay',
  'export',
  'checkpoint',
  'projection',
  'scenario',
  'encounter',
  'salvage',
  'contract',
  'external-effect',
] as const;

export type EventHistoryArtifactKindName =
  (typeof EVENT_HISTORY_ARTIFACT_KINDS)[number];

/**
 * LAW-40 pin: a kind added to the union without a pin member is a
 * compile error, so the CHECK list and the TypeScript set cannot drift
 * by forgetting one.
 */
export const EVENT_HISTORY_ARTIFACT_KIND_PIN: Record<
  EventHistoryArtifactKindName,
  true
> = {
  replay: true,
  export: true,
  checkpoint: true,
  projection: true,
  scenario: true,
  encounter: true,
  salvage: true,
  contract: true,
  'external-effect': true,
};

const NEW_KIND_IN = `artifact_kind IN (${EVENT_HISTORY_ARTIFACT_KINDS.map(
  (kind) => `'${kind}'`,
).join(', ')})`;

interface ISchemaObject {
  readonly name: string;
  readonly sql: string;
}

function captureEntryObjects(db: Database.Database): ISchemaObject[] {
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

function tableSql(db: Database.Database, table: string): string {
  const row = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(table) as { sql: string } | undefined;
  if (row === undefined) throw new Error(`Missing table ${table}`);
  return row.sql;
}

function columnsOf(db: Database.Database, table: string): string[] {
  const rows = db.pragma(`table_info(${table})`) as { name: string }[];
  return rows.map((row) => row.name);
}

export const EVENT_HISTORY_ARTIFACT_MANIFEST_KINDS_MIGRATION = {
  version: 30,
  name: 'event_history_artifact_manifest_campaign_kinds',
  up: (db: Database.Database): void => {
    // Re-apply after a lost record must not rebuild twice.
    const original = tableSql(db, TABLE);
    if (!original.includes(OLD_KIND_IN)) return;

    const objects = captureEntryObjects(db);
    const staging = `${TABLE}__kinds30`;
    const widened = original
      .replace(`CREATE TABLE IF NOT EXISTS ${TABLE}`, `CREATE TABLE ${staging}`)
      .replace(`CREATE TABLE ${TABLE}`, `CREATE TABLE ${staging}`)
      .replace(OLD_KIND_IN, NEW_KIND_IN);
    if (widened.includes(OLD_KIND_IN) || !widened.includes(NEW_KIND_IN)) {
      throw new Error(`${TABLE} CHECK rewrite did not apply cleanly`);
    }

    const columns = columnsOf(db, TABLE).join(', ');
    db.exec(widened);
    db.exec(
      `INSERT INTO ${staging} (${columns}) SELECT ${columns} FROM ${TABLE}`,
    );
    db.exec(`DROP TABLE ${TABLE}`);
    db.exec(`ALTER TABLE ${staging} RENAME TO ${TABLE}`);

    const surviving = new Set(
      captureEntryObjects(db).map((object) => object.name),
    );
    for (const object of objects) {
      if (surviving.has(object.name)) continue;
      db.exec(object.sql);
    }
  },
};
