/**
 * Branch checkpoint cache - the production writer and reader
 * (umbrella task 15.1, satisfying `Checkpoints and Compaction Are
 * Cache-Only`).
 *
 * The checkpoint CONTRACT has been on main since replay-safety: the
 * compatibility kernel decides whether a cached prefix may be trusted,
 * the equivalence harness folds a verified base plus its tail, and the
 * SQLite repository stores and re-verifies rows. What has never existed
 * is a production PRODUCER, and without one the contract can only ever
 * be exercised by checkpoints a test handed it. This module is that
 * producer, plus the reader that feeds the shipped kernels.
 *
 * Three laws, each of them structural rather than conventional:
 *
 * - **Immutable, keyed by branch + authority head + reducer version +
 *   digest.** The checkpoint id is DERIVED from that key, so the same
 *   key is the same primary key: a second write cannot land beside the
 *   first, and the storage trigger already forbids updating one. When a
 *   slot is occupied, re-recording the IDENTICAL claim is reported as
 *   `already-recorded` (proven through the digest law, not by trusting
 *   the row), and a DIFFERENT claim is refused with the repository's own
 *   typed `duplicate-checkpoint` - never overwritten. A new key (a
 *   bumped projector version, a new schema pipeline, a different branch)
 *   writes a NEW row and the superseded one stays where it is, which is
 *   what lets the artifact manifest list it later.
 * - **Cache-only.** Nothing here writes outside `replay_checkpoints`.
 *   Deleting every row costs replay work and nothing else: `recover`
 *   falls back to the reference path and returns the same state and the
 *   same canonical digest, differing only in how many revisions it
 *   folded.
 * - **The reader never hands out state.** `offer` returns an OFFER - the
 *   stored metadata, the stored bytes, and the expectation the CURRENT
 *   pipeline holds - which only `recoverState` (or, on the activation
 *   path, `verifyCandidatePath`, whose offer type this is) may turn into
 *   state. The source-tail expectation is read from LIVE history and
 *   never defaulted from the row's own claim, which would forge the
 *   `digestsVerified` flag the whole contract rests on.
 *
 * One consequence of composing `recoverState` on the ACCELERATED path
 * deserves naming: that kernel's fallback replays every event it was
 * handed, and the accelerated path deliberately reads only the tail. So
 * a fallback there would fold a partial history. This module therefore
 * refuses to return it - a base that verified and then failed is a typed
 * `accelerated-recovery-rejected`, never a state.
 *
 * NOT claimed: a checkpoint on a non-root branch. `replay_checkpoints`
 * still pins `branch_id = 'root'` (migration 10), mirroring the journal's
 * own root pin, so no branch whose events cannot exist can be cached.
 * The key, the writer and the reader are all branch-generic; lifting both
 * pins belongs with branch activation.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/event-store/spec.md
 */

import type Database from 'better-sqlite3';

import { sha256Sync } from '@/utils/events/hashUtils';

import type { IEventHistoryStreamRef } from '../journal/EventHistoryBranchContract';
import type { ICandidateCheckpointOffer } from '../journal/EventHistoryCandidateVerification';
import type { IReplayCheckpointExpectation } from '../replay/ReplayCheckpointCompatibility';
import type { IReplayEquivalenceEvent } from '../replay/ReplayEquivalenceHarness';
import type { ReplayProjector } from '../replay/ReplayProjectorRegistry';
import type { ReplaySchemaRegistry } from '../replay/ReplaySchemaRegistry';

import { canonicalizeJsonV1 } from '../journal/EventJournalCanonicalizer';
import { SQLiteReplayCheckpointRepository } from '../journal/SQLiteReplayCheckpointRepository';
import {
  ReplayCheckpointError,
  digestReplayCheckpointState,
} from '../replay/ReplayCheckpointCompatibility';
import {
  recoverState,
  runFullReplay,
} from '../replay/ReplayEquivalenceHarness';

export type BranchCheckpointErrorCode =
  /** The caller asked to cache something that cannot be a checkpoint. */
  | 'invalid-checkpoint-request'
  /** A base verified, then failed inside the harness. No state is returned. */
  | 'accelerated-recovery-rejected';

export class BranchCheckpointError extends Error {
  public readonly name = 'BranchCheckpointError';
  public constructor(
    public readonly code: BranchCheckpointErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Everything a checkpoint is keyed by except the authority head: the
 * stream, the branch, the reducer identity, and the schema pipeline the
 * prefix was upcast through.
 */
export interface IBranchCheckpointPipeline {
  readonly stream: IEventHistoryStreamRef;
  readonly branchId: string;
  readonly projectorId: string;
  readonly projectorVersion: number;
  readonly schemaPipelineFingerprint: string;
}

/** The narrow LIVE-history reads accelerated recovery performs. */
export interface IBranchHistoryReader {
  /**
   * The chained event digest at `revision` on this branch, or null when
   * the branch holds no such revision. Because the journal's event
   * digest hashes its predecessor's, this one value attests the whole
   * prefix - which is why recovery needs a single row, not a re-read of
   * every event before the base.
   */
  chainDigestAt(revision: number): Promise<string | null>;
  /** Events with revision > `fromExclusive`, ascending, through the head. */
  readTail(fromExclusive: number): Promise<readonly IReplayEquivalenceEvent[]>;
}

export type BranchCheckpointRecordOutcome =
  | {
      readonly kind: 'recorded';
      readonly checkpointId: string;
      readonly revision: number;
    }
  | {
      readonly kind: 'already-recorded';
      readonly checkpointId: string;
      readonly revision: number;
    };

export type BranchRecoveryOutcome<TState> =
  | {
      readonly path: 'checkpoint-plus-tail';
      readonly baseRevision: number;
      readonly state: TState;
      readonly stateDigest: string;
      readonly appliedRevisions: number;
    }
  | {
      readonly path: 'full-replay';
      readonly state: TState;
      readonly stateDigest: string;
      readonly appliedRevisions: number;
    };

/**
 * The stream identity a checkpoint row carries.
 *
 * `replay_checkpoints` has one `stream_id` column while the branch world
 * is keyed by (streamType, streamId), so the two fields are encoded as a
 * JSON array - the same unambiguous idiom `ReplayQuarantineRegistry`
 * uses for its scope keys. A match and a campaign that happened to share
 * an id cannot collide, and no schema change is needed to say so.
 */
function checkpointStreamKey(stream: IEventHistoryStreamRef): string {
  return JSON.stringify([stream.streamType, stream.streamId]);
}

/**
 * The checkpoint id, derived from the full key.
 *
 * Deriving rather than minting is what makes immutability enforceable at
 * the primary key: the same (stream, branch, head, reducer, pipeline) can
 * only ever name one row, so "record it again" is a collision the writer
 * has to answer for rather than a silently duplicated cache.
 */
function checkpointIdFor(
  pipeline: IBranchCheckpointPipeline,
  headRevision: number,
): string {
  return `ckpt-${sha256Sync(
    canonicalizeJsonV1([
      checkpointStreamKey(pipeline.stream),
      pipeline.branchId,
      headRevision,
      pipeline.projectorId,
      pipeline.projectorVersion,
      pipeline.schemaPipelineFingerprint,
    ]),
  )}`;
}

/** The identity the CURRENT pipeline expects a cached prefix to bind. */
function expectationFor(
  pipeline: IBranchCheckpointPipeline,
  sourceTailDigest: string,
): IReplayCheckpointExpectation & { readonly sourceTailDigest: string } {
  return {
    streamId: checkpointStreamKey(pipeline.stream),
    branchId: pipeline.branchId,
    projectorId: pipeline.projectorId,
    projectorVersion: pipeline.projectorVersion,
    schemaPipelineFingerprint: pipeline.schemaPipelineFingerprint,
    sourceTailDigest,
  };
}

/** Borrowed-handle cache over `replay_checkpoints`, same idiom as the journal. */
export class BranchCheckpointCache {
  private readonly repository: SQLiteReplayCheckpointRepository;

  public constructor(private readonly db: Database.Database) {
    this.repository = new SQLiteReplayCheckpointRepository(db);
  }

  /**
   * Cache the state a caller has just folded at `headRevision`.
   *
   * `sourceTailDigest` is the chained digest the caller replayed THROUGH,
   * so the row records which history it is a claim about; the state bytes
   * are canonicalized before hashing so two logically equal states cache
   * identically. The repository re-derives the state digest from the
   * bytes before writing, so a caller cannot register a lie.
   */
  public record(
    pipeline: IBranchCheckpointPipeline,
    headRevision: number,
    sourceTailDigest: string,
    state: unknown,
    recordedAt: string,
  ): BranchCheckpointRecordOutcome {
    // Revision 0 caches the projector's initial state - nothing was
    // replayed, so there is nothing to accelerate and no event digest
    // that could attest it.
    if (!Number.isSafeInteger(headRevision) || headRevision < 1) {
      throw new BranchCheckpointError(
        'invalid-checkpoint-request',
        `A checkpoint anchors at an authority head of revision 1 or later, not ${headRevision}`,
      );
    }
    const checkpointId = checkpointIdFor(pipeline, headRevision);
    const stateJson = canonicalizeJsonV1(state);
    const stateDigest = digestReplayCheckpointState(state);
    try {
      this.repository.record(
        checkpointId,
        {
          streamId: checkpointStreamKey(pipeline.stream),
          branchId: pipeline.branchId,
          revision: headRevision,
          schemaPipelineFingerprint: pipeline.schemaPipelineFingerprint,
          projectorId: pipeline.projectorId,
          projectorVersion: pipeline.projectorVersion,
          sourceTailDigest,
          stateDigest,
        },
        stateJson,
        recordedAt,
      );
      return Object.freeze({
        kind: 'recorded',
        checkpointId,
        revision: headRevision,
      });
    } catch (error) {
      if (
        !(error instanceof ReplayCheckpointError) ||
        error.code !== 'duplicate-checkpoint'
      ) {
        throw error;
      }
      // The slot is occupied. Immutability means it is never overwritten;
      // the only remaining question is whether the occupant is the same
      // claim - and the digest law answers it, not the row's word.
      const occupant = this.repository.selectRecoveryBase(
        expectationFor(pipeline, sourceTailDigest),
        headRevision,
      );
      if (
        occupant.kind === 'checkpoint' &&
        occupant.checkpoint.metadata.revision === headRevision &&
        occupant.checkpoint.metadata.stateDigest === stateDigest
      ) {
        return Object.freeze({
          kind: 'already-recorded',
          checkpointId: occupant.checkpoint.checkpointId,
          revision: headRevision,
        });
      }
      throw error;
    }
  }

  /**
   * The newest cached prefix this pipeline may resume from, as an OFFER.
   *
   * No state leaves this method. Candidates are walked newest-first and
   * each is proven against the LIVE chain digest at its own revision, so
   * a row that describes history this branch no longer holds is passed
   * over silently and an EARLIER trusted base is offered instead - which
   * is exactly the "rebuild from an earlier trusted base" the spec asks
   * for. When nothing qualifies the answer is null: replay everything.
   */
  public async offer(
    pipeline: IBranchCheckpointPipeline,
    headRevision: number,
    history: IBranchHistoryReader,
  ): Promise<ICandidateCheckpointOffer | null> {
    for (const revision of this.candidateRevisions(pipeline, headRevision)) {
      const liveDigest = await history.chainDigestAt(revision);
      // No live event at that revision means nothing can attest the row.
      if (liveDigest === null) continue;
      const base = this.repository.selectRecoveryBase(
        expectationFor(pipeline, liveDigest),
        revision,
      );
      if (base.kind !== 'checkpoint') continue;
      if (base.checkpoint.metadata.revision !== revision) continue;
      return Object.freeze({
        metadata: base.checkpoint.metadata,
        stateJson: base.checkpoint.stateJson,
        expected: {
          ...expectationFor(pipeline, liveDigest),
          // Safe to take from the row: the repository proved the stored
          // BYTES hash to it before returning them. The source-tail
          // digest above is the one that must come from live history.
          stateDigest: base.checkpoint.metadata.stateDigest,
        },
      });
    }
    return null;
  }

  /**
   * Rebuild this pipeline's state at `headRevision`, through a cached
   * prefix when one stands up and by full replay when none does.
   *
   * Both paths end at the same state and the same canonical digest; only
   * `appliedRevisions` differs, and that difference IS the whole benefit
   * of a checkpoint.
   */
  public async recover<TState>(
    pipeline: IBranchCheckpointPipeline,
    headRevision: number,
    history: IBranchHistoryReader,
    registry: ReplaySchemaRegistry,
    projector: ReplayProjector<TState>,
  ): Promise<BranchRecoveryOutcome<TState>> {
    const offer = await this.offer(pipeline, headRevision, history);
    if (offer === null) {
      const everything = await history.readTail(0);
      const replayed = runFullReplay(registry, projector, everything);
      return Object.freeze({
        path: 'full-replay',
        state: replayed.state,
        stateDigest: replayed.stateDigest,
        appliedRevisions: replayed.appliedRevisions,
      });
    }
    const tail = await history.readTail(offer.metadata.revision);
    const outcome = recoverState(
      registry,
      projector,
      tail,
      { metadata: offer.metadata, stateJson: offer.stateJson },
      offer.expected,
    );
    // The harness's fallback replays everything it was handed - and this
    // path handed it only the tail. Returning that state would publish a
    // projection of a partial history, so a base that verified and then
    // failed is a refusal, never a result.
    if (outcome.path !== 'checkpoint-plus-tail') {
      throw new BranchCheckpointError(
        'accelerated-recovery-rejected',
        `Checkpoint at revision ${offer.metadata.revision} verified against live history but the harness refused it (${outcome.rejectedCheckpoint.join(', ')}); no state is derived from a partial replay`,
      );
    }
    return Object.freeze({
      path: 'checkpoint-plus-tail',
      baseRevision: offer.metadata.revision,
      state: outcome.result.state,
      stateDigest: outcome.result.stateDigest,
      appliedRevisions: outcome.result.appliedRevisions,
    });
  }

  /**
   * Which revisions hold a row for this key, newest first.
   *
   * Discovery only - it decides WHICH row to prove, never WHETHER it may
   * be trusted. Every admission decision stays in the repository's
   * `selectRecoveryBase`, so there is exactly one implementation of the
   * digest law. The key columns are therefore REDUNDANT here on purpose,
   * and no behavioural test can kill them: dropping one only makes this
   * walk offer the verifier rows it is certain to reject. They stay so
   * the common case costs one query instead of one query per stale row.
   */
  private candidateRevisions(
    pipeline: IBranchCheckpointPipeline,
    throughRevision: number,
  ): readonly number[] {
    const rows = this.db
      .prepare(
        `SELECT revision FROM replay_checkpoints
         WHERE stream_id = ? AND branch_id = ? AND projector_id = ?
           AND projector_version = ? AND schema_pipeline_fingerprint = ?
           AND revision <= ?
         ORDER BY revision DESC`,
      )
      .all(
        checkpointStreamKey(pipeline.stream),
        pipeline.branchId,
        pipeline.projectorId,
        pipeline.projectorVersion,
        pipeline.schemaPipelineFingerprint,
        throughRevision,
      ) as { revision: number }[];
    return rows.map((row) => row.revision);
  }
}
