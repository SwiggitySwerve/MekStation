/**
 * Source half of the coordinated outcome-correction saga (seam 17.2-a).
 *
 * 17.1-a admits and writes nothing. This module records the source
 * authority's durable facts, then seals the invalidation manifest on
 * the journal. The match store and the journal are two SQLite files
 * with two connections: each step is separately durable. There is no
 * cross-store transaction. A crash between them is visible as a saga
 * row still in `source-recorded`.
 *
 * `target-pending` is written by 17.2-b after the campaign replacement
 * receipt lands. `completed` stays reserved for 17.3. This file still
 * does not write those states.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-combat-loop/spec.md
 */

import type Database from 'better-sqlite3';

import type { IAffectedArtifact } from '@/lib/events/journal/EventHistoryArtifactManifest';
import type { IEventHistoryStreamRef } from '@/lib/events/journal/EventHistoryBranchContract';

import { SQLiteEventHistoryArtifactManifestStore } from '@/lib/events/journal/EventHistoryArtifactManifest';

import type { CoordinatedOutcomeCorrectionResult } from './CoordinatedOutcomeCorrection';

import { throwForE2EFault } from '../DurableMatchStore';
import { supersedeMatchStoreFrom } from '../DurableMatchStore.supersede';
import {
  classifyOutboxReplacement,
  readCombatOutcomeSlot,
  writeReplacementOutboxSlot,
} from './CoordinatedOutcomeCorrectionOutbox';
import { matchStreamRef } from './GmCombatRewindPreview';

export { readRecordedOutcomeJson } from './CoordinatedOutcomeCorrectionOutbox';

export const COORDINATED_CORRECTION_SAGA_TABLE =
  'mp_coordinated_correction_saga' as const;

export const COORDINATED_CORRECTION_SAGA_STATES = [
  'source-recorded',
  'manifest-sealed',
  'target-pending',
  'completed',
  'blocked',
] as const;

export type CoordinatedCorrectionSagaState =
  (typeof COORDINATED_CORRECTION_SAGA_STATES)[number];

export type IAcceptedCoordinatedOutcomeCorrection = Extract<
  CoordinatedOutcomeCorrectionResult,
  { readonly kind: 'accepted-pending-saga' }
>;

export interface ICoordinatedCorrectionSagaKey {
  readonly matchId: string;
  readonly outcomeId: string;
  readonly outcomeVersion: number;
}

export interface ICoordinatedCorrectionSaga {
  readonly matchId: string;
  readonly outcomeId: string;
  readonly outcomeVersion: number;
  readonly targetRevision: number;
  readonly state: CoordinatedCorrectionSagaState;
  readonly blockedReason: string | null;
  readonly sourceRecordedAt: string;
  readonly manifestSealedAt: string | null;
  readonly targetRecordedAt: string | null;
  readonly updatedAt: string;
  /**
   * Campaign-stream candidate minted by 17.2-b. Null until the target
   * half persists it. The id is random, so it must live on the saga
   * row before any journal write or a retry would mint a second branch.
   */
  readonly candidateBranchId: string | null;
}

export interface IRecordCoordinatedCorrectionSourceInput {
  readonly at: string;
  /** Exact `outcome_json` bytes. Same version + other bytes, or a newer slot, is immutable. */
  readonly outcomeJson: string;
}

export type RecordCoordinatedCorrectionSourceResult =
  | { readonly kind: 'recorded'; readonly saga: ICoordinatedCorrectionSaga }
  | {
      readonly kind: 'refused';
      readonly reason: 'replacement-immutable';
      readonly detail: string;
    };

export interface ICoordinatedCorrectionManifestStores {
  /** Journal connection, or a store already bound to it. */
  readonly journal: Database.Database | SQLiteEventHistoryArtifactManifestStore;
  /** Match-store connection that holds the saga row. Not the journal. */
  readonly matchDb: Database.Database;
}

export type ISealCoordinatedCorrectionAccepted =
  IAcceptedCoordinatedOutcomeCorrection & {
    readonly candidateBranchId: string;
    readonly stream?: IEventHistoryStreamRef;
  };

export type SealCoordinatedCorrectionManifestResult =
  | { readonly kind: 'sealed'; readonly saga: ICoordinatedCorrectionSaga }
  | {
      readonly kind: 'refused';
      readonly reason: 'source-not-recorded' | 'saga-blocked';
      readonly detail: string;
    };

const SAGA_COLUMNS = `match_id AS matchId, outcome_id AS outcomeId,
  outcome_version AS outcomeVersion, target_revision AS targetRevision,
  state, blocked_reason AS blockedReason, source_recorded_at AS sourceRecordedAt,
  manifest_sealed_at AS manifestSealedAt, target_recorded_at AS targetRecordedAt,
  updated_at AS updatedAt, candidate_branch_id AS candidateBranchId`;

/**
 * CREATE IF NOT EXISTS only. A second open is a no-op, same as
 * `migrateMatchStoreSupersession`. Lives on the MATCH STORE file.
 */
export function migrateCoordinatedCorrectionSaga(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${COORDINATED_CORRECTION_SAGA_TABLE} (
      match_id            TEXT NOT NULL,
      outcome_id          TEXT NOT NULL,
      outcome_version     INTEGER NOT NULL,
      target_revision     INTEGER NOT NULL,
      state               TEXT NOT NULL CHECK (
        state IN (
          'source-recorded',
          'manifest-sealed',
          'target-pending',
          'completed',
          'blocked'
        )
      ),
      blocked_reason      TEXT,
      source_recorded_at  TEXT NOT NULL,
      manifest_sealed_at  TEXT,
      target_recorded_at  TEXT,
      updated_at          TEXT NOT NULL,
      candidate_branch_id TEXT,
      PRIMARY KEY (match_id, outcome_id, outcome_version),
      FOREIGN KEY (match_id) REFERENCES mp_matches(match_id) ON DELETE CASCADE
    );
  `);
  ensureCandidateBranchColumn(db);
}

/**
 * CREATE TABLE IF NOT EXISTS does not add columns to an existing row.
 * Guard the ALTER with table_info so a match store that already ran
 * 17.2-a still receives the 17.2-b candidate id without a rebuild.
 */
function ensureCandidateBranchColumn(db: Database.Database): void {
  const cols = db.pragma(
    `table_info(${COORDINATED_CORRECTION_SAGA_TABLE})`,
  ) as Array<{ name: string }>;
  if (cols.some((col) => col.name === 'candidate_branch_id')) return;
  db.exec(
    `ALTER TABLE ${COORDINATED_CORRECTION_SAGA_TABLE}
       ADD COLUMN candidate_branch_id TEXT`,
  );
}

/**
 * revision = sequence + 1, so the first discarded store sequence
 * equals the kept through-revision (`ServerMatchHostRewindRebuild`).
 */
export function firstSupersededMatchSequence(targetRevision: number): number {
  return targetRevision;
}

export function sagaKeyOf(
  accepted: ICoordinatedCorrectionSagaKey,
): ICoordinatedCorrectionSagaKey {
  return {
    matchId: accepted.matchId,
    outcomeId: accepted.outcomeId,
    outcomeVersion: accepted.outcomeVersion,
  };
}

function readSagaRow(
  db: Database.Database,
  key: ICoordinatedCorrectionSagaKey,
): ICoordinatedCorrectionSaga | null {
  const row = db
    .prepare(
      `SELECT ${SAGA_COLUMNS} FROM ${COORDINATED_CORRECTION_SAGA_TABLE}
        WHERE match_id = ? AND outcome_id = ? AND outcome_version = ?`,
    )
    .get(key.matchId, key.outcomeId, key.outcomeVersion) as
    | ICoordinatedCorrectionSaga
    | undefined;
  return row === undefined ? null : row;
}

function refuseImmutable(
  key: ICoordinatedCorrectionSagaKey,
): RecordCoordinatedCorrectionSourceResult {
  return Object.freeze({
    kind: 'refused',
    reason: 'replacement-immutable',
    detail: `Replacement outcome '${key.outcomeId}' v${String(key.outcomeVersion)} is already recorded with a different payload`,
  });
}

/**
 * One match-store transaction: saga row, tail supersession, replacement
 * of the match's single outbox slot. A second call with the same version
 * key is a no-op — never a second supersession. Same-version different
 * bytes, or a newer slot, refuse typed; the occupant is immutable.
 */
export function recordCoordinatedCorrectionSource(
  matchDb: Database.Database,
  accepted: IAcceptedCoordinatedOutcomeCorrection,
  input: IRecordCoordinatedCorrectionSourceInput,
): RecordCoordinatedCorrectionSourceResult {
  migrateCoordinatedCorrectionSaga(matchDb);
  const key = sagaKeyOf(accepted);
  const fromSequence = firstSupersededMatchSequence(accepted.targetRevision);

  const result = matchDb.transaction(
    (): RecordCoordinatedCorrectionSourceResult => {
      const slot = readCombatOutcomeSlot(matchDb, accepted.matchId);
      const replacement = classifyOutboxReplacement(
        slot,
        accepted.outcomeVersion,
        input.outcomeJson,
      );
      if (replacement === 'refuse') {
        return refuseImmutable(key);
      }

      const existing = readSagaRow(matchDb, key);
      if (existing !== null) {
        return Object.freeze({ kind: 'recorded', saga: existing });
      }

      matchDb
        .prepare(
          `INSERT INTO ${COORDINATED_CORRECTION_SAGA_TABLE} (
           match_id, outcome_id, outcome_version, target_revision, state,
           blocked_reason, source_recorded_at, manifest_sealed_at,
           target_recorded_at, updated_at, candidate_branch_id
         ) VALUES (?, ?, ?, ?, 'source-recorded', NULL, ?, NULL, NULL, ?, NULL)`,
        )
        .run(
          accepted.matchId,
          accepted.outcomeId,
          accepted.outcomeVersion,
          accepted.targetRevision,
          input.at,
          input.at,
        );

      supersedeMatchStoreFrom(
        matchDb,
        accepted.matchId,
        fromSequence,
        input.at,
      );

      if (replacement === 'write') {
        writeReplacementOutboxSlot(matchDb, accepted, input, slot);
      }

      const saga = readSagaRow(matchDb, key);
      if (saga === null) {
        throw new Error('coordinated-correction saga row missing after insert');
      }
      return Object.freeze({ kind: 'recorded', saga });
    },
  )();
  // Crash window: this match-store transaction is committed; the
  // journal seal has not started. A retry sees `source-recorded` and
  // skips this step. Unit form throws; e2e form of this kind would exit.
  throwForE2EFault('correction-exit-after-source', accepted.matchId);
  return result;
}

function resolveManifestStore(
  journal: ICoordinatedCorrectionManifestStores['journal'],
): SQLiteEventHistoryArtifactManifestStore {
  if (journal instanceof SQLiteEventHistoryArtifactManifestStore) {
    return journal;
  }
  return new SQLiteEventHistoryArtifactManifestStore(journal);
}

/**
 * Journal step, then a separate match-store update. Not one transaction
 * across files: if this process dies after the seal, a retry sees the
 * existing manifest and advances the saga.
 */
export function sealCoordinatedCorrectionManifest(
  journalDbOrStores: ICoordinatedCorrectionManifestStores,
  accepted: ISealCoordinatedCorrectionAccepted,
  artifacts: readonly IAffectedArtifact[],
  at: string,
): SealCoordinatedCorrectionManifestResult {
  migrateCoordinatedCorrectionSaga(journalDbOrStores.matchDb);
  const key = sagaKeyOf(accepted);
  const saga = readSagaRow(journalDbOrStores.matchDb, key);
  if (saga === null) {
    return Object.freeze({
      kind: 'refused',
      reason: 'source-not-recorded',
      detail: `No source-recorded saga for '${key.outcomeId}' v${String(key.outcomeVersion)}`,
    });
  }
  // Load-bearing: blocked must not seal the journal or advance state.
  if (saga.state === 'blocked') {
    return Object.freeze({
      kind: 'refused',
      reason: 'saga-blocked',
      detail: saga.blockedReason ?? 'This coordinated correction is blocked',
    });
  }

  const stream = accepted.stream ?? matchStreamRef(accepted.matchId);
  const manifests = resolveManifestStore(journalDbOrStores.journal);
  if (
    manifests.readArtifactManifest(stream, accepted.candidateBranchId) === null
  ) {
    manifests.sealArtifactManifest(
      stream,
      accepted.candidateBranchId,
      artifacts,
      at,
    );
  }

  if (saga.state === 'source-recorded') {
    journalDbOrStores.matchDb
      .prepare(
        `UPDATE ${COORDINATED_CORRECTION_SAGA_TABLE}
            SET state = 'manifest-sealed',
                manifest_sealed_at = ?,
                updated_at = ?
          WHERE match_id = ? AND outcome_id = ? AND outcome_version = ?
            AND state = 'source-recorded'`,
      )
      .run(at, at, key.matchId, key.outcomeId, key.outcomeVersion);
  }

  const next = readSagaRow(journalDbOrStores.matchDb, key);
  if (next === null) {
    throw new Error('coordinated-correction saga row missing after seal');
  }
  return Object.freeze({ kind: 'sealed', saga: next });
}

export function readCoordinatedCorrectionSaga(
  matchDb: Database.Database,
  key: ICoordinatedCorrectionSagaKey,
): ICoordinatedCorrectionSaga | null {
  migrateCoordinatedCorrectionSaga(matchDb);
  return readSagaRow(matchDb, key);
}

/**
 * Inbox receipts carry `outcome_id` and not `match_id`, so the N+1 gate
 * indexes the match-store saga by outcome id. Latest version wins when
 * more than one correction exists for the same outcome.
 *
 * Does not migrate: a match store that predates this table has no saga,
 * and a launch gate must not create schema as a side effect of reading.
 */
export function readCoordinatedCorrectionSagaByOutcomeId(
  matchDb: Database.Database,
  outcomeId: string,
): ICoordinatedCorrectionSaga | null {
  try {
    const row = matchDb
      .prepare(
        `SELECT ${SAGA_COLUMNS} FROM ${COORDINATED_CORRECTION_SAGA_TABLE}
          WHERE outcome_id = ?
          ORDER BY outcome_version DESC, updated_at DESC
          LIMIT 1`,
      )
      .get(outcomeId) as ICoordinatedCorrectionSaga | undefined;
    return row === undefined ? null : row;
  } catch {
    return null;
  }
}

export function blockCoordinatedCorrection(
  matchDb: Database.Database,
  key: ICoordinatedCorrectionSagaKey,
  reason: string,
): ICoordinatedCorrectionSaga | null {
  migrateCoordinatedCorrectionSaga(matchDb);
  const existing = readSagaRow(matchDb, key);
  if (existing === null) return null;
  const at = existing.updatedAt;
  matchDb
    .prepare(
      `UPDATE ${COORDINATED_CORRECTION_SAGA_TABLE}
          SET state = 'blocked',
              blocked_reason = ?,
              updated_at = ?
        WHERE match_id = ? AND outcome_id = ? AND outcome_version = ?`,
    )
    .run(reason, at, key.matchId, key.outcomeId, key.outcomeVersion);
  return readSagaRow(matchDb, key);
}
