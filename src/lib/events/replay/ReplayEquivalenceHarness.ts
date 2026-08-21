/**
 * Full-replay vs checkpoint-plus-tail equivalence harness (replay-safety
 * PR 16, per design D6's "full replay remains the reference
 * implementation in contract tests").
 *
 * Pure composition of the merged kernels: the schema registry upcasts
 * every stored event, the projector folds it with explicit decisions,
 * and the result carries a canonical state digest. `recoverState`
 * evaluates a candidate checkpoint with the PR-14 compatibility kernel
 * (digest expectations REQUIRED - identity-only compatibility never
 * counts as verification) plus tail continuity, and on ANY mismatch
 * returns the FULL-REPLAY result with no state derived from the
 * incompatible cache - rebuilding is the fallback, publication of an
 * incompatible cache state is structurally impossible because the
 * harness never materializes one.
 *
 * Checkpoint use stays disabled by default: nothing in production
 * imports this module (library integration is PR 18+, and even there
 * recovery is opt-in).
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import type { ReplayProjector } from './ReplayProjectorRegistry';
import type { ReplaySchemaRegistry } from './ReplaySchemaRegistry';

import {
  digestReplayCheckpointState,
  evaluateReplayCheckpointCompatibility,
  evaluateReplayTailContinuity,
  type IReplayCheckpointExpectation,
  type IReplayCheckpointMetadata,
} from './ReplayCheckpointCompatibility';

/** One stored event as replay consumes it. */
export interface IReplayEquivalenceEvent {
  readonly revision: number;
  readonly eventType: string;
  readonly schemaVersion: number;
  readonly payload: unknown;
}

export interface IReplayProjectionResult<TState> {
  readonly state: TState;
  readonly stateDigest: string;
  readonly appliedRevisions: number;
}

/**
 * The authoritative reference path: upcast + project EVERY event from
 * the projector's initial state.
 */
export function runFullReplay<TState>(
  registry: ReplaySchemaRegistry,
  projector: ReplayProjector<TState>,
  events: readonly IReplayEquivalenceEvent[],
): IReplayProjectionResult<TState> {
  let state = projector.initialState();
  for (const event of events) {
    const current = registry.upcast(
      event.eventType,
      event.schemaVersion,
      event.payload,
    );
    state = projector.project(state, current);
  }
  return Object.freeze({
    state,
    stateDigest: digestReplayCheckpointState(state),
    appliedRevisions: events.length,
  });
}

export type ReplayRecoveryOutcome<TState> =
  | {
      readonly path: 'checkpoint-plus-tail';
      readonly result: IReplayProjectionResult<TState>;
    }
  | {
      readonly path: 'full-replay';
      readonly result: IReplayProjectionResult<TState>;
      readonly rejectedCheckpoint: readonly string[];
    };

/**
 * Recovery with a candidate checkpoint: compatibility (all bindings,
 * digests REQUIRED) and tail continuity must BOTH hold before the
 * cached state is even parsed; otherwise the full event history is
 * replayed and the rejection evidence is reported. Either path ends in
 * the same states or the test suite fails - that is the equivalence
 * contract.
 */
export function recoverState<TState>(
  registry: ReplaySchemaRegistry,
  projector: ReplayProjector<TState>,
  allEvents: readonly IReplayEquivalenceEvent[],
  candidate: {
    readonly metadata: IReplayCheckpointMetadata;
    readonly stateJson: string;
  },
  expected: IReplayCheckpointExpectation & {
    readonly sourceTailDigest: string;
    readonly stateDigest: string;
  },
): ReplayRecoveryOutcome<TState> {
  const verdict = evaluateReplayCheckpointCompatibility(
    candidate.metadata,
    expected,
  );
  const tail = allEvents.filter(
    (event) => event.revision > candidate.metadata.revision,
  );
  const continuity = evaluateReplayTailContinuity(
    candidate.metadata.revision,
    tail.map((event) => event.revision),
  );
  if (
    !verdict.compatible ||
    !verdict.digestsVerified ||
    !continuity.contiguous
  ) {
    const rejected: string[] = [];
    if (!verdict.compatible) rejected.push(...verdict.mismatches);
    if (verdict.compatible && !verdict.digestsVerified)
      rejected.push('digests-unverified');
    if (!continuity.contiguous) rejected.push('tail-discontinuity');
    return Object.freeze({
      path: 'full-replay',
      result: runFullReplay(registry, projector, allEvents),
      rejectedCheckpoint: Object.freeze(rejected),
    });
  }

  let state = JSON.parse(candidate.stateJson) as TState;
  for (const event of tail) {
    const current = registry.upcast(
      event.eventType,
      event.schemaVersion,
      event.payload,
    );
    state = projector.project(state, current);
  }
  return Object.freeze({
    path: 'checkpoint-plus-tail',
    result: Object.freeze({
      state,
      stateDigest: digestReplayCheckpointState(state),
      appliedRevisions: tail.length,
    }),
  });
}
