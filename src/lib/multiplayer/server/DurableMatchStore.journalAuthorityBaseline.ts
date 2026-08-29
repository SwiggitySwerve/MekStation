/**
 * Write-once journal-authority baseline (task 4.2; design D4).
 *
 * Lives beside `mp_journal_authority_started` on the match DB. There is
 * no UPDATE path; a second insert fails on the primary key.
 */

import type Database from 'better-sqlite3';

import type { IMatchJournalAuthorityBaseline } from './matchJournalAuthority';

export const JOURNAL_AUTHORITY_BASELINE_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS mp_journal_authority_baseline (
    match_id              TEXT NOT NULL PRIMARY KEY,
    stream_type           TEXT NOT NULL CHECK (stream_type = 'match'),
    stream_id             TEXT NOT NULL,
    branch_id             TEXT NOT NULL,
    revision              INTEGER NOT NULL,
    digest                TEXT NOT NULL,
    effective_generation  INTEGER NOT NULL CHECK (effective_generation >= 1),
    FOREIGN KEY (match_id) REFERENCES mp_matches(match_id) ON DELETE CASCADE
  );
`;

interface IJournalAuthorityBaselineRow {
  readonly match_id: string;
  readonly stream_type: 'match';
  readonly stream_id: string;
  readonly branch_id: string;
  readonly revision: number;
  readonly digest: string;
  readonly effective_generation: number;
}

function baselineFrom(
  row: IJournalAuthorityBaselineRow,
): IMatchJournalAuthorityBaseline {
  return {
    streamType: row.stream_type,
    streamId: row.stream_id,
    branchId: row.branch_id,
    revision: row.revision,
    digest: row.digest,
    effectiveGeneration: row.effective_generation,
  };
}

export function readJournalAuthorityBaseline(
  db: Database.Database,
  matchId: string,
): IMatchJournalAuthorityBaseline | null {
  const row = db
    .prepare(`SELECT * FROM mp_journal_authority_baseline WHERE match_id = ?`)
    .get(matchId) as IJournalAuthorityBaselineRow | undefined;
  return row === undefined ? null : baselineFrom(row);
}

export function insertJournalAuthorityBaselineRow(
  db: Database.Database,
  baseline: IMatchJournalAuthorityBaseline,
): void {
  const already = db
    .prepare(`SELECT 1 FROM mp_journal_authority_baseline WHERE match_id = ?`)
    .get(baseline.streamId);
  if (already) {
    throw new Error('journal-authority-baseline already exists');
  }
  db.prepare(
    `INSERT INTO mp_journal_authority_baseline
       (match_id, stream_type, stream_id, branch_id, revision, digest,
        effective_generation)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    baseline.streamId,
    baseline.streamType,
    baseline.streamId,
    baseline.branchId,
    baseline.revision,
    baseline.digest,
    baseline.effectiveGeneration,
  );
}
