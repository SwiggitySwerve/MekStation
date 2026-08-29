/**
 * Pure rollback reader selection from immutable cutover facts (task 4.3).
 *
 * This module deliberately performs no store reads and never mutates facts.
 * Recovery supplies the recorded and freshly refolded heads; selection only
 * chooses the truthful reader or a fail-closed blocked state.
 */

export interface IMatchRollbackReaderHead {
  readonly streamType: string;
  readonly streamId: string;
  readonly branchId: string;
  readonly revision: number;
  readonly digest: string;
  readonly effectiveGeneration: number;
}

export interface IMatchRollbackReaderFacts {
  readonly baseline: IMatchRollbackReaderHead | null;
  readonly started: object | null;
  /** Durable active head identity, derived from committed journal facts. */
  readonly recordedHead: IMatchRollbackReaderHead | null;
  /** The current reader's replay/fold result for the same committed rows. */
  readonly refoldedHead: IMatchRollbackReaderHead | null;
  /** Highest effective generation this reader and its installed upcasters read. */
  readonly supportedEffectiveGeneration: number;
}

export const MATCH_ROLLBACK_PRESERVED_FACTS = [
  'rows',
  'receipts',
  'head',
  'effective-generation',
  'recovery-state',
] as const;

export type MatchRollbackBlockedReason =
  | 'baseline-head-mismatch'
  | 'missing-journal-head'
  | 'digest-mismatch'
  | 'journal-head-mismatch'
  | 'unsupported-effective-generation'
  | 'recovery-fact-read-failed'
  | 'recovery-selection-missing';

export type MatchRollbackReaderDecision =
  | { readonly kind: 'legacy-compatible' }
  | {
      readonly kind: 'journal-compatible';
      readonly head: IMatchRollbackReaderHead;
    }
  | {
      readonly kind: 'blocked';
      readonly reason: MatchRollbackBlockedReason;
      readonly preserved: typeof MATCH_ROLLBACK_PRESERVED_FACTS;
    };

function headsEqual(
  left: IMatchRollbackReaderHead,
  right: IMatchRollbackReaderHead,
): boolean {
  return (
    left.streamType === right.streamType &&
    left.streamId === right.streamId &&
    left.branchId === right.branchId &&
    left.revision === right.revision &&
    left.digest === right.digest &&
    left.effectiveGeneration === right.effectiveGeneration
  );
}

function blocked(
  reason: MatchRollbackBlockedReason,
): MatchRollbackReaderDecision {
  return {
    kind: 'blocked',
    reason,
    preserved: MATCH_ROLLBACK_PRESERVED_FACTS,
  };
}

/**
 * Selects a rollback reader solely from durable facts and a completed refold.
 * A started fact is a one-way boundary: it can never choose legacy again.
 */
export function selectMatchRollbackReader(
  facts: IMatchRollbackReaderFacts,
): MatchRollbackReaderDecision {
  if (facts.started == null) {
    if (facts.baseline == null) return { kind: 'legacy-compatible' };
    if (
      facts.recordedHead != null &&
      headsEqual(facts.baseline, facts.recordedHead)
    ) {
      return { kind: 'legacy-compatible' };
    }
    return blocked('baseline-head-mismatch');
  }

  if (facts.recordedHead == null || facts.refoldedHead == null) {
    return blocked('missing-journal-head');
  }
  if (
    facts.recordedHead.effectiveGeneration > facts.supportedEffectiveGeneration
  ) {
    return blocked('unsupported-effective-generation');
  }
  if (facts.recordedHead.digest !== facts.refoldedHead.digest) {
    return blocked('digest-mismatch');
  }
  if (!headsEqual(facts.recordedHead, facts.refoldedHead)) {
    return blocked('journal-head-mismatch');
  }
  return { kind: 'journal-compatible', head: facts.recordedHead };
}
