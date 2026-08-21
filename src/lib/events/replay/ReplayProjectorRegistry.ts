/**
 * Replay projector registry with explicit no-state-change decisions
 * (replay-safety PR 13, per design D4).
 *
 * A projector carries an IMMUTABLE identity (`projectorId` +
 * `projectorVersion`) that is a SEPARATE identity from every event
 * schema version and from the application release: bumping a schema's
 * target version or shipping a release never changes a projector's
 * identity, and a projection-logic change bumps `projectorVersion`
 * without touching any schema registration. The kernel never reads
 * schema versions - checkpoint compatibility (PR 14) binds the two
 * identities side by side, not merged.
 *
 * Every supported event type must carry an EXPLICIT decision: an
 * `apply` handler, or a NAMED no-state-change decision with a reason.
 * A missing decision at projection time is a typed failure
 * (`missing-projector-decision`) - the pre-existing implicit
 * missing-handler success is not reproduced in this pipeline. A
 * no-state-change decision returns the SAME state reference, proving
 * no partial projection occurred; apply handlers are pure
 * state-in/state-out with no side-effect surface (the replay
 * dependency-boundary test sweeps this module like every other replay
 * runtime module).
 *
 * Production projector bindings (real reducers for the canonical 88)
 * are NOT claimed here - they land with the library-integration and
 * recovery PRs. This kernel enforces the mechanics those bindings must
 * satisfy, including `assertReplayProjectorCompleteness` against the
 * supported discriminant set.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import type { ICurrentReplayPayload } from './ReplaySchemaRegistry';

export type ReplayProjectionErrorCode =
  | 'duplicate-projector-decision'
  | 'incomplete-projector'
  | 'invalid-projector-registration'
  | 'missing-projector-decision';

export class ReplayProjectionError extends Error {
  public readonly name = 'ReplayProjectionError';
  public constructor(
    public readonly code: ReplayProjectionErrorCode,
    public readonly projectorId: string,
    message: string,
    eventTypes: readonly string[] = [],
  ) {
    super(message);
    this.eventTypes = Object.freeze([...eventTypes]);
  }
  public readonly eventTypes: readonly string[];
}

/** An explicit apply handler for one event type. */
export interface IReplayProjectorApplyDecision<TState> {
  readonly kind: 'apply';
  readonly apply: (state: TState, event: ICurrentReplayPayload) => TState;
}

/**
 * A named, deliberate decision that this event type does not change
 * this projector's state. The reason is part of the registration so
 * the decision is reviewable - an absent handler is NEVER read as an
 * implicit no-op.
 */
export interface IReplayProjectorNoStateChangeDecision {
  readonly kind: 'no-state-change';
  readonly reason: string;
}

export type ReplayProjectorDecision<TState> =
  | IReplayProjectorApplyDecision<TState>
  | IReplayProjectorNoStateChangeDecision;

export interface IReplayProjectorEventDecision<TState> {
  readonly eventType: string;
  readonly decision: ReplayProjectorDecision<TState>;
}

export interface IReplayProjectorDefinition<TState> {
  readonly projectorId: string;
  readonly projectorVersion: number;
  readonly initialState: () => TState;
  readonly decisions: readonly IReplayProjectorEventDecision<TState>[];
}

/** A validated, indexed projector ready for projection. */
export class ReplayProjector<TState> {
  public readonly projectorId: string;
  public readonly projectorVersion: number;
  private readonly initial: () => TState;
  private readonly decisions: ReadonlyMap<
    string,
    ReplayProjectorDecision<TState>
  >;

  public constructor(definition: IReplayProjectorDefinition<TState>) {
    if (definition.projectorId.trim().length === 0)
      throw new ReplayProjectionError(
        'invalid-projector-registration',
        definition.projectorId,
        'projectorId must not be empty',
      );
    if (
      !Number.isSafeInteger(definition.projectorVersion) ||
      definition.projectorVersion < 1
    )
      throw new ReplayProjectionError(
        'invalid-projector-registration',
        definition.projectorId,
        'projectorVersion must be a positive safe integer',
      );
    const indexed = new Map<string, ReplayProjectorDecision<TState>>();
    for (const entry of definition.decisions) {
      if (entry.eventType.trim().length === 0)
        throw new ReplayProjectionError(
          'invalid-projector-registration',
          definition.projectorId,
          'decision eventType must not be empty',
          [entry.eventType],
        );
      if (
        entry.decision.kind === 'no-state-change' &&
        entry.decision.reason.trim().length === 0
      )
        throw new ReplayProjectionError(
          'invalid-projector-registration',
          definition.projectorId,
          `no-state-change decision for ${entry.eventType} must carry a reason`,
          [entry.eventType],
        );
      if (indexed.has(entry.eventType))
        throw new ReplayProjectionError(
          'duplicate-projector-decision',
          definition.projectorId,
          `Duplicate projector decision for ${entry.eventType}`,
          Object.freeze([entry.eventType]),
        );
      // Copy-then-freeze like the schema kernel's indexing, so a caller
      // retaining the definition array cannot undo the construction
      // checks or swap a decision after validation.
      indexed.set(entry.eventType, Object.freeze({ ...entry.decision }));
    }
    this.projectorId = definition.projectorId;
    this.projectorVersion = definition.projectorVersion;
    this.initial = definition.initialState;
    this.decisions = indexed;
  }

  public initialState(): TState {
    return this.initial();
  }

  public decisionFor(
    eventType: string,
  ): ReplayProjectorDecision<TState> | undefined {
    return this.decisions.get(eventType);
  }

  public decidedEventTypes(): readonly string[] {
    return Object.freeze(Array.from(this.decisions.keys()));
  }

  /**
   * Projects one event. A missing decision fails typed BEFORE any state
   * derivation, so no partial projection or side effect can be
   * returned; a no-state-change decision returns the same state
   * reference it was given.
   */
  public project(state: TState, event: ICurrentReplayPayload): TState {
    const decision = this.decisions.get(event.eventType);
    if (!decision)
      throw new ReplayProjectionError(
        'missing-projector-decision',
        this.projectorId,
        `Projector ${this.projectorId} has no decision for ${event.eventType}`,
        Object.freeze([event.eventType]),
      );
    if (decision.kind === 'no-state-change') return state;
    return decision.apply(state, event);
  }
}

/**
 * Refuses a projector that does not carry an explicit decision for
 * every supported event type. The failure names EVERY missing
 * discriminant so completeness is evidence, not a sample.
 */
export function assertReplayProjectorCompleteness<TState>(
  projector: ReplayProjector<TState>,
  supportedEventTypes: readonly string[],
): void {
  const decided = new Set(projector.decidedEventTypes());
  const missing = supportedEventTypes.filter(
    (eventType) => !decided.has(eventType),
  );
  if (missing.length > 0)
    throw new ReplayProjectionError(
      'incomplete-projector',
      projector.projectorId,
      `Projector ${projector.projectorId} is missing decisions for ${missing.length} supported event type(s)`,
      Object.freeze([...missing]),
    );
}
