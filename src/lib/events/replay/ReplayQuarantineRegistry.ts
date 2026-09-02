/**
 * Per-authority-scope replay quarantine (replay-safety PR 17, per
 * design D7).
 *
 * Unsupported history quarantines EXACTLY ONE authority scope: the
 * registry records a typed reason (unsupported type/version, invalid
 * payload, failed upcast, missing provenance, broken fixed-root
 * continuity, canonicalizer mismatch, digest mismatch) with evidence,
 * and from that moment the scope refuses commands and publication with
 * a typed blocked result while every OTHER scope keeps operating - a
 * healthy control scope is part of every corruption test.
 *
 * `guardedProject` is the enforcement shape: a quarantined scope gets
 * a `blocked` result BEFORE any work; an UNSUPPORTED-HISTORY failure
 * (upcast or provenance - both typed `UnsupportedReplayHistoryError`)
 * quarantines the scope and returns `blocked` with the classified
 * reason - the caller receives NO partial state either way, and
 * Zustand surfaces may render the typed blocked state but cannot
 * bypass it. Programmer-bug throws (e.g. a missing projector decision
 * or a TypeError inside an apply handler) deliberately PROPAGATE
 * instead of quarantining: laundering a code defect into "unsupported
 * history" would make release-and-replay a false recovery. Session
 * integration (PR 18/19A) must fail closed on those throws too.
 *
 * Release is explicit and records the recovery action taken, so the
 * registry doubles as the D7 session record of quarantine reason +
 * recovery action.
 *
 * BRANCH-ERA DEFERRAL (task 17.3) - SPENT. The condition this header
 * named has been met: `add-authoritative-history-branches` landed its
 * immutable branch records, activation CAS and correction leases, so
 * lineage validation is no longer deferred. Umbrella task 15.4 adds
 * the recovery-time corruption classes to the vocabulary below -
 * `sequence-gap`, `broken-lineage`, `duplicate-receipt` and
 * `missing-digest` - detected by `AuthorityQuarantine` and quarantined
 * through this same registry, per session, with no second registry and
 * no durable table. `broken-root-continuity` keeps its existing
 * meaning for the fixed-root identity checks.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import type { ReplayProjector } from './ReplayProjectorRegistry';
import type { ReplaySchemaRegistry } from './ReplaySchemaRegistry';

import { assertReplayInputProvenance } from './ReplayInputProvenanceManifest';
import { UnsupportedReplayHistoryError } from './ReplaySchemaRegistry';

export type ReplayQuarantineReason =
  | 'broken-lineage'
  | 'broken-root-continuity'
  | 'duplicate-receipt'
  | 'missing-digest'
  | 'sequence-gap'
  | 'canonicalizer-mismatch'
  | 'digest-mismatch'
  | 'invalid-payload'
  | 'missing-provenance'
  | 'unsupported-event-type'
  | 'unsupported-schema-version'
  | 'upcast-failed';

/** One authority scope - the unit of isolation. */
export interface IReplayAuthorityScope {
  readonly authorityType: string;
  readonly authorityId: string;
}

export interface IReplayQuarantineRecord {
  readonly scope: IReplayAuthorityScope;
  readonly reason: ReplayQuarantineReason;
  readonly evidence: readonly string[];
  readonly message: string;
}

export interface IReplayQuarantineRelease {
  readonly scope: IReplayAuthorityScope;
  readonly recoveryAction: string;
}

export class ReplayScopeQuarantinedError extends Error {
  public readonly name = 'ReplayScopeQuarantinedError';
  public constructor(public readonly record: IReplayQuarantineRecord) {
    super(
      `Authority scope ${record.scope.authorityType}/${record.scope.authorityId} is quarantined: ${record.reason}`,
    );
  }
}

/**
 * Maps a typed replay failure to its quarantine reason. Only failures
 * replay itself classifies arrive here; storage/recovery callers pass
 * their reason explicitly (their error types carry coarser codes).
 */
const FAILURE_CLASSIFICATION = {
  'invalid-payload': 'invalid-payload',
  'missing-required-input': 'missing-provenance',
  'missing-transition': 'unsupported-schema-version',
  'unknown-event-type': 'unsupported-event-type',
  'unsupported-schema-version': 'unsupported-schema-version',
  'upcast-failed': 'upcast-failed',
} as const satisfies Record<
  UnsupportedReplayHistoryError['code'],
  ReplayQuarantineReason
>;

export function classifyReplayFailure(
  error: UnsupportedReplayHistoryError,
): ReplayQuarantineReason {
  return FAILURE_CLASSIFICATION[error.code];
}

// JSON-array encoding: unambiguous for ANY authorityType/authorityId
// content (user-influenced ids cannot craft a colliding key).
const scopeKey = (scope: IReplayAuthorityScope): string =>
  JSON.stringify([scope.authorityType, scope.authorityId]);

/** In-memory per-scope quarantine ledger. */
export class ReplayQuarantineRegistry {
  private readonly records = new Map<string, IReplayQuarantineRecord>();
  private readonly releases: IReplayQuarantineRelease[] = [];

  public quarantine(record: IReplayQuarantineRecord): IReplayQuarantineRecord {
    const key = scopeKey(record.scope);
    const existing = this.records.get(key);
    // First quarantine wins: the original evidence is the diagnosis.
    if (existing) return existing;
    const frozen = Object.freeze({
      scope: Object.freeze({ ...record.scope }),
      reason: record.reason,
      evidence: Object.freeze([...record.evidence]),
      message: record.message,
    });
    this.records.set(key, frozen);
    return frozen;
  }

  public recordFor(
    scope: IReplayAuthorityScope,
  ): IReplayQuarantineRecord | undefined {
    return this.records.get(scopeKey(scope));
  }

  public isQuarantined(scope: IReplayAuthorityScope): boolean {
    return this.records.has(scopeKey(scope));
  }

  /**
   * The command/publication gate: a quarantined scope fails typed; a
   * healthy scope passes untouched. Isolation is per scope key - no
   * global flag exists to trip.
   */
  public assertScopeOperational(scope: IReplayAuthorityScope): void {
    const record = this.records.get(scopeKey(scope));
    if (record) throw new ReplayScopeQuarantinedError(record);
  }

  /** Explicit release recording the recovery action taken. */
  public release(scope: IReplayAuthorityScope, recoveryAction: string): void {
    const key = scopeKey(scope);
    if (!this.records.has(key)) return;
    this.records.delete(key);
    this.releases.push(
      Object.freeze({ scope: Object.freeze({ ...scope }), recoveryAction }),
    );
  }

  public releaseHistory(): readonly IReplayQuarantineRelease[] {
    return Object.freeze([...this.releases]);
  }
}

export type GuardedProjectionResult<TState> =
  | { readonly kind: 'applied'; readonly state: TState }
  | { readonly kind: 'blocked'; readonly record: IReplayQuarantineRecord };

/**
 * Projects one event under quarantine enforcement. A quarantined scope
 * is blocked BEFORE any work; a replay failure quarantines the scope
 * and blocks - the caller never receives partial state, and the input
 * state is never mutated (registry/projector purity is pinned by their
 * own contracts).
 */
export function guardedProject<TState>(
  quarantine: ReplayQuarantineRegistry,
  registry: ReplaySchemaRegistry,
  projector: ReplayProjector<TState>,
  scope: IReplayAuthorityScope,
  state: TState,
  event: {
    readonly eventType: string;
    readonly schemaVersion: number;
    readonly payload: unknown;
  },
): GuardedProjectionResult<TState> {
  const existing = quarantine.recordFor(scope);
  if (existing) return Object.freeze({ kind: 'blocked', record: existing });
  try {
    const current = registry.upcast(
      event.eventType,
      event.schemaVersion,
      event.payload,
    );
    // Provenance enforcement rides the same gate: a supported payload
    // missing a declared resolved input quarantines as
    // missing-provenance instead of projecting from a repaired guess.
    assertReplayInputProvenance(current.eventType, current.payload);
    return Object.freeze({
      kind: 'applied',
      state: projector.project(state, current),
    });
  } catch (error) {
    if (error instanceof UnsupportedReplayHistoryError) {
      const record = quarantine.quarantine({
        scope,
        reason: classifyReplayFailure(error),
        evidence: [event.eventType, `v${event.schemaVersion}`],
        message: error.message,
      });
      return Object.freeze({ kind: 'blocked', record });
    }
    throw error;
  }
}
