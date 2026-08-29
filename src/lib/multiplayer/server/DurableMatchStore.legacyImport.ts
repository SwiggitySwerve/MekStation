/**
 * SQLite bulk path for legacy match-event import (task 1.3 event-import
 * half).
 *
 * Lives beside `DurableMatchStore` rather than inside it: the store is
 * already past the file-size guardrail, and this path is a one-time
 * adoption write, not the live command append.
 *
 * One transaction covers every event INSERT, the per-event source
 * identity, the global event-id row, and the completion marker. The
 * marker is what a later read treats as "import is done"; without it a
 * crash mid-copy cannot look complete, and with the transaction a
 * crash cannot leave events without a marker.
 */

import type Database from 'better-sqlite3';

import {
  IMPORTED_LEGACY_SOURCE_KIND,
  type IImportedLegacyEvent,
  type ILegacyEventImportStore,
  type ILegacyImportMarker,
} from './importLegacyMatchEvents';

const nonempty = (column: string): string => `length(trim(${column})) > 0`;

export const LEGACY_IMPORT_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS mp_legacy_event_imports (
    match_id        TEXT NOT NULL PRIMARY KEY
                      CHECK (${nonempty('match_id')}),
    first_revision  INTEGER NOT NULL CHECK (first_revision >= 0),
    last_revision   INTEGER NOT NULL CHECK (last_revision >= 0),
    event_count     INTEGER NOT NULL CHECK (event_count >= 1),
    source_label    TEXT NOT NULL
                      CHECK (source_label = '${IMPORTED_LEGACY_SOURCE_KIND}'),
    imported_at     TEXT NOT NULL CHECK (${nonempty('imported_at')}),
    FOREIGN KEY (match_id) REFERENCES mp_matches(match_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS mp_imported_legacy_events (
    event_id              TEXT NOT NULL PRIMARY KEY
                            CHECK (${nonempty('event_id')}),
    match_id              TEXT NOT NULL,
    sequence              INTEGER NOT NULL,
    source_kind           TEXT NOT NULL
                            CHECK (source_kind = '${IMPORTED_LEGACY_SOURCE_KIND}'),
    format_id             TEXT NOT NULL CHECK (${nonempty('format_id')}),
    format_version        INTEGER NOT NULL CHECK (format_version >= 1),
    binding               TEXT NOT NULL CHECK (binding = 'object-backed'),
    evidence_digest       TEXT NOT NULL CHECK (length(evidence_digest) = 64),
    evidence_byte_length  INTEGER NOT NULL CHECK (evidence_byte_length >= 0),
    UNIQUE (match_id, sequence),
    FOREIGN KEY (match_id, sequence)
      REFERENCES mp_match_events(match_id, sequence) ON DELETE CASCADE
  );
`;

interface IMarkerRow {
  readonly match_id: string;
  readonly first_revision: number;
  readonly last_revision: number;
  readonly event_count: number;
  readonly source_label: string;
  readonly imported_at: string;
}

interface ISourceRow {
  readonly event_id: string;
  readonly match_id: string;
  readonly sequence: number;
  readonly source_kind: string;
  readonly format_id: string;
  readonly format_version: number;
  readonly binding: string;
  readonly evidence_digest: string;
  readonly evidence_byte_length: number;
}

export interface IImportedEventSourceRow {
  readonly matchId: string;
  readonly sequence: number;
  readonly eventId: string;
  readonly sourceKind: typeof IMPORTED_LEGACY_SOURCE_KIND;
  readonly formatId: string;
  readonly formatVersion: number;
  readonly binding: 'object-backed';
  readonly evidenceDigest: string;
  readonly evidenceByteLength: number;
}

function markerFrom(row: IMarkerRow): ILegacyImportMarker {
  return {
    matchId: row.match_id,
    firstRevision: row.first_revision,
    lastRevision: row.last_revision,
    eventCount: row.event_count,
    sourceLabel: IMPORTED_LEGACY_SOURCE_KIND,
    importedAt: row.imported_at,
  };
}

export function readDurableLegacyImportMarker(
  db: Database.Database,
  matchId: string,
): ILegacyImportMarker | null {
  const row = db
    .prepare(`SELECT * FROM mp_legacy_event_imports WHERE match_id = ?`)
    .get(matchId) as IMarkerRow | undefined;
  return row === undefined ? null : markerFrom(row);
}

export function readDurableImportedEventSources(
  db: Database.Database,
  matchId: string,
): readonly IImportedEventSourceRow[] {
  const rows = db
    .prepare(
      `SELECT * FROM mp_imported_legacy_events
       WHERE match_id = ? ORDER BY sequence ASC`,
    )
    .all(matchId) as ISourceRow[];
  return rows.map((row) => ({
    matchId: row.match_id,
    sequence: row.sequence,
    eventId: row.event_id,
    sourceKind: IMPORTED_LEGACY_SOURCE_KIND,
    formatId: row.format_id,
    formatVersion: row.format_version,
    binding: 'object-backed' as const,
    evidenceDigest: row.evidence_digest,
    evidenceByteLength: row.evidence_byte_length,
  }));
}

export function createDurableLegacyImportStore(
  db: Database.Database,
): ILegacyEventImportStore {
  const insertEvent = db.prepare(
    `INSERT INTO mp_match_events (match_id, sequence, event_json)
     VALUES (?, ?, ?)`,
  );
  const insertSource = db.prepare(
    `INSERT INTO mp_imported_legacy_events (
       event_id, match_id, sequence, source_kind, format_id, format_version,
       binding, evidence_digest, evidence_byte_length
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertMarkerRow = db.prepare(
    `INSERT INTO mp_legacy_event_imports (
       match_id, first_revision, last_revision, event_count,
       source_label, imported_at
     ) VALUES (?, ?, ?, ?, ?, ?)`,
  );

  return {
    readMarker: (matchId) => readDurableLegacyImportMarker(db, matchId),
    runImport: (work) => {
      db.transaction(work)();
    },
    insertImportedEvent: (matchId, row: IImportedLegacyEvent) => {
      const eventJson = JSON.stringify(row.event);
      insertEvent.run(matchId, row.event.sequence, eventJson);
      insertSource.run(
        row.event.id,
        matchId,
        row.event.sequence,
        row.source.kind,
        row.source.formatId,
        row.source.formatVersion,
        row.source.binding,
        row.source.evidenceDigest,
        row.source.evidenceByteLength,
      );
    },
    insertMarker: (marker) => {
      insertMarkerRow.run(
        marker.matchId,
        marker.firstRevision,
        marker.lastRevision,
        marker.eventCount,
        marker.sourceLabel,
        marker.importedAt,
      );
    },
  };
}
