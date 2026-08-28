/**
 * Checkpoint compatibility core (replay-safety PR 14, per design D6).
 *
 * A checkpoint is a DISPOSABLE VERIFIED CACHE, never authority. Its
 * immutable metadata binds the complete identity of the prefix it
 * accelerates: stream, fixed root branch, revision, the
 * schema-pipeline fingerprint (target-schema + upcaster identities
 * actually required by the prefix, from `fingerprintReplayPipeline`),
 * the projector ID/version pair (a SEPARATE identity - PR 13), the
 * source-tail digest, and the state digest. Because the fingerprint
 * hashes schema/upcaster identities on its own axis, a target-schema
 * or upcaster change invalidates a prior checkpoint EVEN WHEN the
 * projector version is unchanged.
 *
 * Everything here is pure evaluation: verdicts in, verdicts out. An
 * incompatible or corrupt checkpoint yields a typed verdict naming
 * every mismatched binding and NO state of any kind - the caller's
 * only moves are an earlier compatible base or full replay, which
 * remains the authoritative reference path.
 *
 * Not wired to production replay/recovery; storage lands in PR 15A/B
 * and recovery integration in PR 19A/B.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import { sha256 } from 'js-sha256';

import { canonicalizeJsonV1 } from '../journal/EventJournalCanonicalizer';

export type ReplayCheckpointErrorCode =
  | 'duplicate-checkpoint'
  | 'invalid-checkpoint-metadata'
  | 'state-digest-mismatch';

export class ReplayCheckpointError extends Error {
  public readonly name = 'ReplayCheckpointError';
  public constructor(
    public readonly code: ReplayCheckpointErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/** The full identity a checkpoint binds. */
export interface IReplayCheckpointMetadata {
  readonly streamId: string;
  readonly branchId: string;
  readonly revision: number;
  readonly schemaPipelineFingerprint: string;
  readonly projectorId: string;
  readonly projectorVersion: number;
  readonly sourceTailDigest: string;
  readonly stateDigest: string;
}

const requireIdentity = (value: string, field: string): void => {
  if (value.trim().length === 0)
    throw new ReplayCheckpointError(
      'invalid-checkpoint-metadata',
      `${field} must not be empty`,
    );
};

/** Validates and freezes checkpoint metadata. */
export function createReplayCheckpointMetadata(
  metadata: IReplayCheckpointMetadata,
): IReplayCheckpointMetadata {
  requireIdentity(metadata.streamId, 'streamId');
  requireIdentity(metadata.branchId, 'branchId');
  requireIdentity(
    metadata.schemaPipelineFingerprint,
    'schemaPipelineFingerprint',
  );
  requireIdentity(metadata.projectorId, 'projectorId');
  requireIdentity(metadata.sourceTailDigest, 'sourceTailDigest');
  requireIdentity(metadata.stateDigest, 'stateDigest');
  if (!Number.isSafeInteger(metadata.revision) || metadata.revision < 0)
    throw new ReplayCheckpointError(
      'invalid-checkpoint-metadata',
      'revision must be a non-negative safe integer',
    );
  if (
    !Number.isSafeInteger(metadata.projectorVersion) ||
    metadata.projectorVersion < 1
  )
    throw new ReplayCheckpointError(
      'invalid-checkpoint-metadata',
      'projectorVersion must be a positive safe integer',
    );
  return Object.freeze({ ...metadata });
}

/**
 * The identity the CURRENT pipeline expects a compatible checkpoint to
 * bind. Digest expectations are optional at the metadata-comparison
 * stage (storage integrity verifies them against actual bytes in
 * PR 15A/B); when provided they are compared exactly.
 */
export interface IReplayCheckpointExpectation {
  readonly streamId: string;
  readonly branchId: string;
  readonly schemaPipelineFingerprint: string;
  readonly projectorId: string;
  readonly projectorVersion: number;
  readonly sourceTailDigest?: string;
  readonly stateDigest?: string;
}

export type ReplayCheckpointVerdict =
  | {
      readonly compatible: true;
      /**
       * True only when BOTH digest expectations were supplied and
       * matched. Identity-only compatibility (absent digest
       * expectations) is NOT digest verification - storage integrity
       * (PR 15A/B) and recovery (PR 19A/B) must refuse to treat a
       * `digestsVerified: false` verdict as a verified cache.
       */
      readonly digestsVerified: boolean;
    }
  | {
      readonly compatible: false;
      readonly mismatches: readonly string[];
    };

/**
 * Pure field-by-field compatibility evaluation. ANY mismatch names the
 * binding(s) that failed; no state accompanies an incompatible
 * verdict, so an incompatible cache cannot leak publishable state.
 */
export function evaluateReplayCheckpointCompatibility(
  checkpoint: IReplayCheckpointMetadata,
  expected: IReplayCheckpointExpectation,
): ReplayCheckpointVerdict {
  const mismatches: string[] = [];
  if (checkpoint.streamId !== expected.streamId) mismatches.push('streamId');
  if (checkpoint.branchId !== expected.branchId) mismatches.push('branchId');
  if (
    checkpoint.schemaPipelineFingerprint !== expected.schemaPipelineFingerprint
  )
    mismatches.push('schemaPipelineFingerprint');
  if (checkpoint.projectorId !== expected.projectorId)
    mismatches.push('projectorId');
  if (checkpoint.projectorVersion !== expected.projectorVersion)
    mismatches.push('projectorVersion');
  if (
    expected.sourceTailDigest !== undefined &&
    checkpoint.sourceTailDigest !== expected.sourceTailDigest
  )
    mismatches.push('sourceTailDigest');
  if (
    expected.stateDigest !== undefined &&
    checkpoint.stateDigest !== expected.stateDigest
  )
    mismatches.push('stateDigest');
  if (mismatches.length > 0)
    return Object.freeze({
      compatible: false,
      mismatches: Object.freeze(mismatches),
    });
  return Object.freeze({
    compatible: true,
    digestsVerified:
      expected.sourceTailDigest !== undefined &&
      expected.stateDigest !== undefined,
  });
}

export type ReplayTailVerdict =
  | { readonly contiguous: true }
  | {
      readonly contiguous: false;
      readonly expectedRevision: number;
      readonly foundRevision: number | null;
    };

/**
 * A recovery tail must start at the checkpoint revision + 1 and ascend
 * without gaps. An empty tail is contiguous (the checkpoint already
 * covers the requested history).
 */
export function evaluateReplayTailContinuity(
  checkpointRevision: number,
  tailRevisions: readonly number[],
): ReplayTailVerdict {
  let expected = checkpointRevision + 1;
  for (const revision of tailRevisions) {
    if (revision !== expected)
      return Object.freeze({
        contiguous: false,
        expectedRevision: expected,
        foundRevision: revision,
      });
    expected += 1;
  }
  return Object.freeze({ contiguous: true });
}

export type ReplayRecoveryBaseDecision =
  | {
      readonly kind: 'checkpoint';
      readonly checkpoint: IReplayCheckpointMetadata;
      /** Carried from the verdict - see ReplayCheckpointVerdict. */
      readonly digestsVerified: boolean;
    }
  | { readonly kind: 'full-replay' };

/**
 * Picks the newest compatible checkpoint as a recovery base, or falls
 * back to full replay when none qualifies. Incompatible checkpoints
 * are discarded from consideration entirely - they never surface in
 * the decision, so no publishable state can originate from one.
 */
export function selectReplayRecoveryBase(
  checkpoints: readonly IReplayCheckpointMetadata[],
  expected: IReplayCheckpointExpectation,
  throughRevision?: number,
): ReplayRecoveryBaseDecision {
  let best: IReplayCheckpointMetadata | null = null;
  let bestDigestsVerified = false;
  for (const checkpoint of checkpoints) {
    // A checkpoint past the requested head cannot base that recovery.
    if (throughRevision !== undefined && checkpoint.revision > throughRevision)
      continue;
    const verdict = evaluateReplayCheckpointCompatibility(checkpoint, expected);
    if (!verdict.compatible) continue;
    if (best === null || checkpoint.revision > best.revision) {
      best = checkpoint;
      bestDigestsVerified = verdict.digestsVerified;
    }
  }
  if (best === null) return Object.freeze({ kind: 'full-replay' });
  return Object.freeze({
    kind: 'checkpoint',
    checkpoint: best,
    digestsVerified: bestDigestsVerified,
  });
}

/**
 * Canonical state digest: canonicalized JSON bytes hashed with sha256,
 * so logically-equal states digest identically regardless of key
 * insertion order.
 */
export function digestReplayCheckpointState(state: unknown): string {
  return sha256(new TextEncoder().encode(canonicalizeJsonV1(state)));
}
