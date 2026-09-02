/**
 * Candidate path verification (add-authoritative-history-branches task 2.3;
 * design D2).
 *
 * Before a candidate may activate, its history has to be shown to be
 * REPRODUCIBLE and PROJECTABLE. This module answers both, and closes the
 * check PR 1 named and deferred: the resolver verifies event identity,
 * revision contiguity, digest linkage and event schema version, and states
 * that projector compatibility "belongs to the checkpoint contract and
 * lands with candidate verification". This is that landing.
 *
 * - **Deterministic replay.** The path is materialised TWICE and the two
 *   answers compared. A reader whose second answer differs is not a slow
 *   reader; it is one that cannot be replayed from, and a candidate built
 *   on it would activate history nobody can reproduce. The comparison is
 *   over what the resolver actually verifies - identities, revisions and
 *   digests - hashed into one path digest so the check is a value, not an
 *   eyeball.
 * - **Projector compatibility.** Composed through the replay-safety
 *   harness's `recoverState` rather than a second copy of the rule. That
 *   kernel already refuses identity-only compatibility, refuses a gapped
 *   tail, and - the property that makes it safe to compose - never
 *   materialises state from a rejected cache: on any mismatch it returns
 *   the FULL REPLAY result plus the named rejection evidence. So a refused
 *   checkpoint is not a failed verification; it is a verification that
 *   took the reference path, and this module reports which path it took.
 *
 * One rule this module adds on top: an offer that does not carry BOTH
 * digest expectations is refused outright rather than passed down. The
 * checkpoint contract is explicit that identity-only compatibility is not
 * verification, so accepting such an offer and reporting `used` would be a
 * silent downgrade - and quietly falling back would hide that the caller
 * asked for something unsafe. The type already requires both; this is the
 * runtime half, for callers that arrive without one.
 *
 * NOT claimed: verification of live production checkpoints. Nothing on
 * main produces them - `SQLiteReplayCheckpointRepository` has no
 * production consumer, and `ReplayEquivalenceHarness` states that "nothing
 * in production imports this module". This verifies checkpoints HANDED to
 * it, against the shipped contract; wiring a checkpoint producer is not
 * this change's work.
 *
 * @spec openspec/changes/add-authoritative-history-branches/specs/event-store/spec.md
 */

import type {
  IReplayCheckpointExpectation,
  IReplayCheckpointMetadata,
} from '@/lib/events/replay/ReplayCheckpointCompatibility';
import type { IReplayEquivalenceEvent } from '@/lib/events/replay/ReplayEquivalenceHarness';
import type { ReplayProjector } from '@/lib/events/replay/ReplayProjectorRegistry';
import type { ReplaySchemaRegistry } from '@/lib/events/replay/ReplaySchemaRegistry';

import { digestReplayCheckpointState } from '@/lib/events/replay/ReplayCheckpointCompatibility';
import {
  recoverState,
  runFullReplay,
} from '@/lib/events/replay/ReplayEquivalenceHarness';
import { sha256Sync } from '@/utils/events/hashUtils';

import type {
  IBranchEventView,
  IBranchSegmentReader,
  IResolvedBranchPath,
} from './EventHistoryBranchResolver';

import { EventHistoryBranchError } from './EventHistoryBranchContract';
import { materializeBranchPath } from './EventHistoryBranchResolver';
import { canonicalizeJsonV1 } from './EventJournalCanonicalizer';

/**
 * A branch event a projector can actually consume.
 *
 * The resolver's narrow view carries no `eventType` and no `payload`,
 * because it never needed them to verify a chain. A projector dispatches
 * on the one and folds the other, which is why the reader is generic.
 */
export interface IProjectableBranchEvent extends IBranchEventView {
  readonly eventType: string;
  readonly payload: unknown;
}

/** What became of the checkpoint a caller offered. */
export type CandidateCheckpointDisposition =
  | { readonly kind: 'absent' }
  | { readonly kind: 'used' }
  | { readonly kind: 'refused'; readonly reasons: readonly string[] };

/** A checkpoint offered as a starting point, with what to check it against. */
export interface ICandidateCheckpointOffer {
  readonly metadata: IReplayCheckpointMetadata;
  readonly stateJson: string;
  /** Both digests are required: identity-only is not verification. */
  readonly expected: IReplayCheckpointExpectation & {
    readonly sourceTailDigest: string;
    readonly stateDigest: string;
  };
}

export interface ICandidateVerificationOptions<TState> {
  readonly registry: ReplaySchemaRegistry;
  readonly projector: ReplayProjector<TState>;
  readonly checkpoint?: ICandidateCheckpointOffer;
}

export interface IVerifiedCandidatePath<TState> {
  readonly events: readonly IProjectableBranchEvent[];
  /** Digest over what the resolver verifies - identity, revision, chain. */
  readonly pathDigest: string;
  readonly state: TState;
  readonly stateDigest: string;
  readonly checkpoint: CandidateCheckpointDisposition;
}

/**
 * Digest a materialised path over exactly the facts the resolver verifies.
 *
 * Not the payloads: two materialisations that agree on every identity,
 * revision and digest ARE the same history, and folding payloads in would
 * make the determinism check fail for reasons the digest chain already
 * covers - or, worse, pass while a chain quietly differed.
 */
export function digestBranchPath(events: readonly IBranchEventView[]): string {
  return sha256Sync(
    canonicalizeJsonV1(
      events.map((event) => ({
        eventId: event.eventId,
        branchId: event.branchId,
        streamRevision: event.streamRevision,
        eventVersion: event.eventVersion,
        previousStreamEventDigest: event.previousStreamEventDigest,
        eventDigest: event.eventDigest,
      })),
    ),
  );
}

/** Refuse an offer that asks for identity-only compatibility. */
function assertDigestExpectations(offer: ICandidateCheckpointOffer): void {
  for (const field of ['sourceTailDigest', 'stateDigest'] as const) {
    const value = offer.expected[field];
    if (typeof value === 'string' && value.trim().length > 0) continue;
    throw new EventHistoryBranchError(
      'branch-integrity',
      `A candidate checkpoint offer must carry '${field}'; identity-only compatibility is not verification`,
    );
  }
}

/** The shape the replay harness folds, taken from a resolved branch event. */
function asReplayEvent(
  event: IProjectableBranchEvent,
): IReplayEquivalenceEvent {
  return {
    revision: event.streamRevision,
    eventType: event.eventType,
    schemaVersion: event.eventVersion,
    payload: event.payload,
  };
}

/**
 * Materialise the candidate path twice, prove the two agree, then fold it.
 *
 * The double read is the determinism proof and it happens FIRST: there is
 * no point projecting a history that cannot be read the same way twice.
 * Every integrity failure the resolver already knows how to name - gap,
 * wrong base, broken chain, bad schema version - surfaces from
 * `materializeBranchPath` as a typed `branch-integrity` refusal, and this
 * adds one more of the same kind for a path that will not reproduce.
 */
export async function verifyCandidatePath<TState>(
  reader: IBranchSegmentReader<IProjectableBranchEvent>,
  path: IResolvedBranchPath,
  options: ICandidateVerificationOptions<TState>,
): Promise<IVerifiedCandidatePath<TState>> {
  if (options.checkpoint !== undefined) {
    assertDigestExpectations(options.checkpoint);
  }
  const first = await materializeBranchPath(reader, path);
  const second = await materializeBranchPath(reader, path);
  const pathDigest = digestBranchPath(first);
  if (pathDigest !== digestBranchPath(second)) {
    throw new EventHistoryBranchError(
      'branch-integrity',
      `Branch '${path.branchId}' at revision ${path.revision} materialised differently twice; a candidate cannot be built on history that will not reproduce`,
    );
  }
  const replayEvents = first.map(asReplayEvent);
  const { state, checkpoint } = projectVerifiedPath(replayEvents, options);
  return Object.freeze({
    events: first,
    pathDigest,
    state,
    stateDigest: digestReplayCheckpointState(state),
    checkpoint,
  });
}

/**
 * Fold the verified events, through the offered checkpoint when it stands
 * up and through full replay when it does not.
 *
 * `recoverState` decides; this only reports which way it went. A rejected
 * checkpoint yields the full-replay result, so the state here is never
 * derived from a cache that failed a binding.
 */
function projectVerifiedPath<TState>(
  events: readonly IReplayEquivalenceEvent[],
  options: ICandidateVerificationOptions<TState>,
): {
  readonly state: TState;
  readonly checkpoint: CandidateCheckpointDisposition;
} {
  if (options.checkpoint === undefined) {
    return {
      state: runFullReplay(options.registry, options.projector, events).state,
      checkpoint: Object.freeze({ kind: 'absent' }),
    };
  }
  const outcome = recoverState(
    options.registry,
    options.projector,
    events,
    {
      metadata: options.checkpoint.metadata,
      stateJson: options.checkpoint.stateJson,
    },
    options.checkpoint.expected,
  );
  if (outcome.path === 'checkpoint-plus-tail') {
    return {
      state: outcome.result.state,
      checkpoint: Object.freeze({ kind: 'used' }),
    };
  }
  return {
    state: outcome.result.state,
    checkpoint: Object.freeze({
      kind: 'refused',
      reasons: outcome.rejectedCheckpoint,
    }),
  };
}
