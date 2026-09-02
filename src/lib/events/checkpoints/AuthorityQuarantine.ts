/**
 * Per-session corruption detection and quarantine (umbrella task 15.4).
 *
 * Recovery has to validate authority-sequence continuity, branch lineage,
 * receipt uniqueness and required digests BEFORE admitting commands or
 * publication. This module is those four checks and the binding that
 * turns a failure into a quarantined SESSION - one scope key, never a
 * global flag, so a corrupt match cannot take a healthy one down with it.
 *
 * The checks are ordered by how early in the history they can be
 * observed, and the FIRST failure is reported: a log with a hole in it
 * will usually also fail lineage a moment later, and naming the hole is
 * the diagnosis while naming the consequence is not.
 *
 * **Digests and lineage are conditional on the authority carrying them.**
 * Combat match events have no digest column; campaign journal events do.
 * So the rule is: if NO event carries a digest, those two checks do not
 * apply and are skipped; if ANY event does, then every event must, and
 * the chain must link. That is what makes one detector correct for both
 * authorities without a per-authority flag - and it is the reason a
 * digest-free authority is not reported as digest-corrupt.
 *
 * **Quarantine is derived, never stored.** There is no table and no
 * migration. The authority data is corrupt on disk; every recovery sweep
 * re-reads it and re-derives the same verdict, so the registry cannot go
 * stale and cannot disagree with the journal - which a durable row could,
 * in both directions. The operator cost is real and worth stating: there
 * is no way to ask "what is quarantined" without a sweep having run. The
 * sweep is boot, and `recoverActiveMatches` returns the verdicts.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/event-store/spec.md
 */

import type {
  IReplayAuthorityScope,
  IReplayQuarantineRecord,
  ReplayQuarantineReason,
  ReplayQuarantineRegistry,
} from '../replay/ReplayQuarantineRegistry';
import type {
  AuthorityRecoveryBlockedReason,
  AuthorityRecoveryVerdict,
} from './AuthorityRecoveryPort';

/** The integrity facts one event contributes, as its authority carries them. */
export interface IAuthorityEventIntegrity {
  readonly revision: number;
  /** Command/receipt identity, or null when this authority has none. */
  readonly receiptId: string | null;
  /** The digest this event chains from; null at the start of history. */
  readonly previousDigest: string | null;
  /** This event's own digest, or null when this authority carries none. */
  readonly digest: string | null;
}

export type AuthorityCorruptionReason =
  | 'sequence-gap'
  | 'broken-lineage'
  | 'duplicate-receipt'
  | 'missing-digest';

export interface IAuthorityCorruption {
  readonly reason: AuthorityCorruptionReason;
  readonly evidence: readonly string[];
}

const frozen = (
  reason: AuthorityCorruptionReason,
  evidence: readonly string[],
): IAuthorityCorruption =>
  Object.freeze({ reason, evidence: Object.freeze([...evidence]) });

/** Contiguity: every revision is its predecessor's successor. */
function findSequenceGap(
  events: readonly IAuthorityEventIntegrity[],
): IAuthorityCorruption | null {
  for (let index = 1; index < events.length; index += 1) {
    const expected = events[index - 1].revision + 1;
    if (events[index].revision === expected) continue;
    return frozen('sequence-gap', [
      `revision ${expected} expected, found ${events[index].revision}`,
    ]);
  }
  return null;
}

/**
 * Digest presence and linkage, but only for an authority that carries
 * digests at all - see the header. A partially-digested history is
 * corrupt precisely because it cannot be told apart from a tampered one.
 */
function findDigestCorruption(
  events: readonly IAuthorityEventIntegrity[],
): IAuthorityCorruption | null {
  if (!events.some((event) => event.digest !== null)) return null;
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (event.digest === null) {
      return frozen('missing-digest', [
        `revision ${event.revision} carries no digest in a digested history`,
      ]);
    }
    const expected =
      index === 0 ? event.previousDigest : events[index - 1].digest;
    if (event.previousDigest !== expected) {
      return frozen('broken-lineage', [
        `revision ${event.revision} chains from ${event.previousDigest ?? 'nothing'}, not ${expected ?? 'nothing'}`,
      ]);
    }
  }
  return null;
}

/** Receipt uniqueness: one command identity commits at most once. */
function findDuplicateReceipt(
  events: readonly IAuthorityEventIntegrity[],
): IAuthorityCorruption | null {
  const seen = new Map<string, number>();
  for (const event of events) {
    if (event.receiptId === null) continue;
    const first = seen.get(event.receiptId);
    if (first !== undefined) {
      return frozen('duplicate-receipt', [
        `${event.receiptId} appears at revisions ${first} and ${event.revision}`,
      ]);
    }
    seen.set(event.receiptId, event.revision);
  }
  return null;
}

/**
 * The four checks, first failure wins.
 *
 * Sequence first because a hole explains most of what follows it; lineage
 * and digest next because they are the same pass over the chain; receipts
 * last because a duplicate is a whole-history property rather than a
 * position in it.
 */
export function detectAuthorityCorruption(
  events: readonly IAuthorityEventIntegrity[],
): IAuthorityCorruption | null {
  return (
    findSequenceGap(events) ??
    findDigestCorruption(events) ??
    findDuplicateReceipt(events)
  );
}

/**
 * The corruption classes, as the quarantine registry names them.
 *
 * Declared to satisfy the registry's own vocabulary so the two cannot
 * drift: a class listed here that the registry does not know is a compile
 * error rather than a quarantine with an unknown reason.
 */
const QUARANTINABLE = [
  'sequence-gap',
  'broken-lineage',
  'duplicate-receipt',
  'missing-digest',
] as const satisfies readonly ReplayQuarantineReason[];

/** True when a blocked verdict is a statement about corrupt DATA. */
function isCorruptionReason(
  reason: AuthorityRecoveryBlockedReason,
): reason is AuthorityCorruptionReason {
  return (QUARANTINABLE as readonly string[]).includes(reason);
}

/**
 * Quarantine the session a blocked verdict came from, when the block was
 * CORRUPTION rather than an ordinary refusal.
 *
 * An empty history or a reducer that threw are real refusals, but they
 * are not statements about the authority data being wrong, and marking a
 * session corrupt for them would make release-and-retry a lie. Returns
 * null when there is nothing to quarantine, so a caller cannot mistake
 * "recovered" for "quarantined and recovered anyway".
 */
export function quarantineAuthorityCorruption<TState>(
  registry: ReplayQuarantineRegistry,
  scope: IReplayAuthorityScope,
  verdict: AuthorityRecoveryVerdict<TState>,
): IReplayQuarantineRecord | null {
  if (verdict.kind !== 'blocked') return null;
  if (!isCorruptionReason(verdict.reason)) return null;
  return registry.quarantine({
    scope,
    reason: verdict.reason,
    evidence: verdict.evidence,
    message: `Authority ${scope.authorityType}/${scope.authorityId} failed recovery validation: ${verdict.reason}`,
  });
}
