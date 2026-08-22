/**
 * SQLite replay checkpoint repository (replay-safety PR 15B).
 *
 * Borrowed-handle adapter (same idiom as the SQLite event journal)
 * over the PR-15A `replay_checkpoints` table. Checkpoints stay
 * DISPOSABLE CACHES:
 *
 * - `record` verifies the state bytes hash to the claimed
 *   `stateDigest` BEFORE writing (typed `state-digest-mismatch`
 *   otherwise), then performs a single plain INSERT - never
 *   INSERT OR REPLACE (the 15A integrity review pinned that REPLACE
 *   is delete-then-insert and must not masquerade as update). A slot
 *   collision is a typed `duplicate-checkpoint`; re-recording is an
 *   explicit `discard` followed by a fresh `record`.
 * - `selectRecoveryBase` reads candidate rows newest-revision-first
 *   for the expected pipeline identity and admits only fully written,
 *   digest-true, compatible rows. Digest verification is HONEST on
 *   both axes: the state digest is proven against the stored bytes,
 *   and the source-tail digest is compared against a CALLER-SUPPLIED
 *   expectation (required by the signature) computed from the journal
 *   tail - it is never defaulted from the row's own claim, which
 *   would self-satisfy the comparison and forge the PR-14
 *   `digestsVerified` flag. Corrupt or incompatible rows are
 *   skipped and reported by id - never returned, never repaired, and
 *   NOT auto-deleted (discard is the caller's explicit move). When
 *   nothing qualifies the decision is `full-replay`.
 * - Reads and selection are SELECT-only: journal authority rows, the
 *   store high-water, and the full-replay fallback are untouched (the
 *   contract test snapshots and proves it).
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import type Database from 'better-sqlite3';

import { isSqliteUniqueConstraintError } from '@/services/persistence/sqliteConstraintErrors';

import type {
  IReplayCheckpointExpectation,
  IReplayCheckpointMetadata,
} from '../replay/ReplayCheckpointCompatibility';

import {
  ReplayCheckpointError,
  createReplayCheckpointMetadata,
  digestReplayCheckpointState,
  evaluateReplayCheckpointCompatibility,
} from '../replay/ReplayCheckpointCompatibility';

export interface IRecordedReplayCheckpoint {
  readonly checkpointId: string;
  readonly metadata: IReplayCheckpointMetadata;
  readonly stateJson: string;
}

export type ReplayCheckpointRecoveryBase =
  | {
      readonly kind: 'checkpoint';
      readonly checkpoint: IRecordedReplayCheckpoint;
      readonly skippedCheckpointIds: readonly string[];
    }
  | {
      readonly kind: 'full-replay';
      readonly skippedCheckpointIds: readonly string[];
    };

interface ICheckpointRow {
  readonly checkpoint_id: string;
  readonly stream_id: string;
  readonly branch_id: string;
  readonly revision: number;
  readonly schema_pipeline_fingerprint: string;
  readonly projector_id: string;
  readonly projector_version: number;
  readonly source_tail_digest: string;
  readonly state_digest: string;
  readonly state_json: string;
}

const ROW_COLUMNS =
  'checkpoint_id, stream_id, branch_id, revision, schema_pipeline_fingerprint, projector_id, projector_version, source_tail_digest, state_digest, state_json';

export class SQLiteReplayCheckpointRepository {
  public constructor(private readonly db: Database.Database) {}

  /**
   * Records one checkpoint. The state bytes must hash to the claimed
   * digest before anything is written; the insert itself is a single
   * atomic statement, so a torn write can never leave a half-admitted
   * record.
   */
  public record(
    checkpointId: string,
    metadata: IReplayCheckpointMetadata,
    stateJson: string,
    recordedAt: string,
  ): void {
    if (checkpointId.trim().length === 0)
      throw new ReplayCheckpointError(
        'invalid-checkpoint-metadata',
        'checkpointId must not be empty',
      );
    const validated = createReplayCheckpointMetadata(metadata);
    let parsedState: unknown;
    try {
      parsedState = JSON.parse(stateJson);
    } catch {
      throw new ReplayCheckpointError(
        'invalid-checkpoint-metadata',
        `Checkpoint ${checkpointId} state bytes are not valid JSON`,
      );
    }
    const actualDigest = digestReplayCheckpointState(parsedState);
    if (actualDigest !== validated.stateDigest)
      throw new ReplayCheckpointError(
        'state-digest-mismatch',
        `Checkpoint ${checkpointId} state bytes hash to ${actualDigest}, not the claimed ${validated.stateDigest}`,
      );
    try {
      this.db
        .prepare(
          `INSERT INTO replay_checkpoints (
            checkpoint_id, stream_id, branch_id, revision,
            schema_pipeline_fingerprint, projector_id, projector_version,
            source_tail_digest, state_digest, state_json, recorded_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          checkpointId,
          validated.streamId,
          validated.branchId,
          validated.revision,
          validated.schemaPipelineFingerprint,
          validated.projectorId,
          validated.projectorVersion,
          validated.sourceTailDigest,
          validated.stateDigest,
          stateJson,
          recordedAt,
        );
    } catch (error) {
      if (isSqliteUniqueConstraintError(error))
        throw new ReplayCheckpointError(
          'duplicate-checkpoint',
          `A checkpoint already occupies this identity slot; discard it before re-recording`,
        );
      throw error;
    }
  }

  /** Explicit disposal of one cache row. Never touches the journal. */
  public discard(checkpointId: string): void {
    this.db
      .prepare(`DELETE FROM replay_checkpoints WHERE checkpoint_id = ?`)
      .run(checkpointId);
  }

  /**
   * Selects the newest fully-written, digest-true, compatible
   * checkpoint at or below `throughRevision`, or full replay. Corrupt
   * and incompatible rows are skipped (reported by id) - a corrupt
   * cache can only cost acceleration, never correctness.
   */
  public selectRecoveryBase(
    expected: IReplayCheckpointExpectation & {
      readonly sourceTailDigest: string;
    },
    throughRevision?: number,
  ): ReplayCheckpointRecoveryBase {
    const revisionClause =
      throughRevision === undefined ? '' : ' AND revision <= ?';
    const parameters: unknown[] = [
      expected.streamId,
      expected.branchId,
      expected.projectorId,
      expected.projectorVersion,
      expected.schemaPipelineFingerprint,
    ];
    if (throughRevision !== undefined) parameters.push(throughRevision);
    const rows = this.db
      .prepare(
        `SELECT ${ROW_COLUMNS} FROM replay_checkpoints
         WHERE stream_id = ? AND branch_id = ? AND projector_id = ?
           AND projector_version = ? AND schema_pipeline_fingerprint = ?${revisionClause}
         ORDER BY revision DESC`,
      )
      .all(...parameters) as ICheckpointRow[];

    const skipped: string[] = [];
    for (const row of rows) {
      const recorded = this.hydrate(row);
      if (recorded === null) {
        skipped.push(row.checkpoint_id);
        continue;
      }
      // State digest: proven against the stored bytes in hydrate().
      // Source-tail digest: the caller's journal-derived expectation -
      // NEVER the row's own claim.
      const verdict = evaluateReplayCheckpointCompatibility(recorded.metadata, {
        ...expected,
        stateDigest: recorded.metadata.stateDigest,
      });
      if (!verdict.compatible || !verdict.digestsVerified) {
        skipped.push(row.checkpoint_id);
        continue;
      }
      return Object.freeze({
        kind: 'checkpoint',
        checkpoint: recorded,
        skippedCheckpointIds: Object.freeze(skipped),
      });
    }
    return Object.freeze({
      kind: 'full-replay',
      skippedCheckpointIds: Object.freeze(skipped),
    });
  }

  /**
   * Rehydrates one row, returning null when the stored bytes do not
   * hash to the stored digest (corrupt / torn record) or the metadata
   * no longer validates.
   */
  private hydrate(row: ICheckpointRow): IRecordedReplayCheckpoint | null {
    // One guard around the WHOLE body: JSON.parse, the canonicalizing
    // digest (which throws on non-JCS values like lone surrogates), and
    // metadata validation all classify the row as corrupt on failure -
    // a corrupt cache row may only cost acceleration, never abort
    // selection.
    try {
      const parsedState: unknown = JSON.parse(row.state_json);
      if (digestReplayCheckpointState(parsedState) !== row.state_digest)
        return null;
      return Object.freeze({
        checkpointId: row.checkpoint_id,
        metadata: createReplayCheckpointMetadata({
          streamId: row.stream_id,
          branchId: row.branch_id,
          revision: row.revision,
          schemaPipelineFingerprint: row.schema_pipeline_fingerprint,
          projectorId: row.projector_id,
          projectorVersion: row.projector_version,
          sourceTailDigest: row.source_tail_digest,
          stateDigest: row.state_digest,
        }),
        stateJson: row.state_json,
      });
    } catch {
      return null;
    }
  }
}
