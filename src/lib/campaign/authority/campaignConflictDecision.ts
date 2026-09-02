/**
 * The command-based campaign conflict decision (umbrella task 8.4).
 *
 * `Campaign Conflict Resolution Is Command-Based`: "Disjoint commands
 * SHALL revalidate and serialize; same-field stale commands SHALL
 * reject. The system SHALL NOT retry an unchanged stale whole-campaign
 * envelope as an overwrite." This module owns the verdict; the pipeline
 * owns the replay that produces its inputs, and the store owns the
 * append that a refusal never reaches.
 *
 * NOTHING IS APPENDED ON A REFUSAL, and the way that is guaranteed
 * rather than intended is that this module is pure and holds no store.
 * There is no write path to reach.
 *
 * THE DECLARED FIELD-SET IS A CHECKABLE CLAIM, NEVER AN INPUT. The
 * server derives what a command touches by replaying the command against
 * its own base; the client's declaration is compared against that and a
 * mismatch is refused. A declaration that could steer the verdict would
 * let a client describe its overwrite as disjoint and have it
 * serialized - which is the whole failure this requirement exists to
 * end, wearing a more respectable shape than the 409 retry it replaces.
 *
 * THE TAXONOMY IS BORROWED, NOT MINTED. `ExpectedHeadRefusalCode` and
 * `EXPECTED_HEAD_RESYNC_ACTION` come verbatim from the branch-aware
 * head validator, so a client that already understands a stale head
 * understands this refusal too. Exactly one action is added:
 * `rebase-onto-active-head`, for the case where the client's command is
 * not in conflict but its DERIVATION is out of step - re-deriving
 * against the active head is the fix, and telling such a client to
 * resync would throw away a command that was never in conflict.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/coop-campaign-sync/spec.md
 */

import {
  EXPECTED_HEAD_RESYNC_ACTION,
  type ExpectedHeadRefusalCode,
} from '@/lib/events/journal/EventHistoryExpectedHead';

import { campaignFieldOverlap } from './campaignCommandFieldSet';

/** Re-derive against the active head and resubmit; the command still stands. */
export const CAMPAIGN_CONFLICT_REBASE_ACTION =
  'rebase-onto-active-head' as const;

/** What a refused client should do next. */
export type CampaignConflictRecoveryAction =
  | typeof EXPECTED_HEAD_RESYNC_ACTION
  | typeof CAMPAIGN_CONFLICT_REBASE_ACTION;

/** Why the command was refused. Closed, and each member is actionable. */
export type CampaignConflictRefusalReason =
  /** Intervening facts changed a field this command intends to mutate. */
  | 'same-field-stale'
  /** A stale command that never said what it changes. */
  | 'undeclared-field-set'
  /** It said, and the server derived something else. */
  | 'declared-field-set-mismatch'
  /** The base revision named is not one this stream ever had. */
  | 'base-revision-unknown';

/** The head the authority actually holds. */
export interface ICampaignConflictHead {
  readonly branchId: string;
  readonly revision: number;
}

/** What the caller was able to establish about the command's base. */
export type CampaignConflictBase =
  /** The client is writing against the current head. */
  | { readonly kind: 'at-head' }
  /** The client named a revision ahead of, or absent from, the stream. */
  | { readonly kind: 'revision-unknown' }
  /** The base replayed; these are the sets derived from it. */
  | {
      readonly kind: 'reconstructed';
      /** What this command does to its own base - server-derived. */
      readonly touchedFields: readonly string[];
      /** What committed between that base and the head. */
      readonly interveningFields: readonly string[];
      /** The client's claim, or null when it made none. */
      readonly declaredFields: readonly string[] | null;
    };

export type CampaignConflictDecision =
  /** Proceed unchanged; the command is not stale. */
  | { readonly kind: 'current' }
  /** Stale but disjoint: re-derive against the head and serialize. */
  | {
      readonly kind: 'revalidate';
      readonly interveningFields: readonly string[];
    }
  | {
      readonly kind: 'refused';
      readonly code: ExpectedHeadRefusalCode;
      readonly reason: CampaignConflictRefusalReason;
      readonly head: ICampaignConflictHead;
      readonly recoveryAction: CampaignConflictRecoveryAction;
      /** The colliding paths; empty unless the reason is a collision. */
      readonly conflictingFields: readonly string[];
    };

/**
 * Set equality over field paths.
 *
 * A set rather than a sequence because the two sides are produced by
 * different code on different machines: the server sorts its diff, and a
 * client is free to list what it changed in whatever order it noticed.
 * Refusing on order would refuse honest commands.
 */
function sameFieldSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  if (leftSet.size !== rightSet.size) return false;
  return left.every((path) => rightSet.has(path));
}

/**
 * Decide what happens to one command against one head.
 *
 * Every refusal carries the same three things - the current branch and
 * revision, and what to do next - because a client that is told only
 * "conflict" can do nothing but guess, and the guess it makes is the
 * blind retry this requirement exists to remove.
 *
 * The code is `STALE_REVISION` on every arm today: campaign commands
 * commit to the pinned genesis branch, so a client cannot be on a
 * superseded branch or a stale generation. `STALE_BRANCH` and
 * `STALE_GENERATION` become reachable when the journal's root-branch pin
 * is lifted, which is why the borrowed code type is carried whole rather
 * than narrowed to the one member reachable now.
 */
export function decideCampaignConflict(
  head: ICampaignConflictHead,
  base: CampaignConflictBase,
): CampaignConflictDecision {
  const refuse = (
    reason: CampaignConflictRefusalReason,
    recoveryAction: CampaignConflictRecoveryAction,
    conflictingFields: readonly string[] = [],
  ): CampaignConflictDecision =>
    Object.freeze({
      kind: 'refused' as const,
      code: 'STALE_REVISION' as ExpectedHeadRefusalCode,
      reason,
      head,
      recoveryAction,
      conflictingFields: Object.freeze(conflictingFields),
    });

  if (base.kind === 'at-head') {
    return Object.freeze({ kind: 'current' as const });
  }
  if (base.kind === 'revision-unknown') {
    return refuse('base-revision-unknown', EXPECTED_HEAD_RESYNC_ACTION);
  }

  // The declaration is checked FIRST. A command whose author does not
  // know what it changes gets no substantive verdict: the mismatch is
  // the more fundamental defect, and answering "same-field" to a command
  // we cannot describe would be answering a question we cannot ask.
  if (base.declaredFields === null) {
    return refuse('undeclared-field-set', CAMPAIGN_CONFLICT_REBASE_ACTION);
  }
  if (!sameFieldSet(base.declaredFields, base.touchedFields)) {
    return refuse(
      'declared-field-set-mismatch',
      CAMPAIGN_CONFLICT_REBASE_ACTION,
    );
  }

  const conflicting = campaignFieldOverlap(
    base.touchedFields,
    base.interveningFields,
  );
  if (conflicting.length > 0) {
    return refuse('same-field-stale', EXPECTED_HEAD_RESYNC_ACTION, conflicting);
  }
  return Object.freeze({
    kind: 'revalidate' as const,
    interveningFields: base.interveningFields,
  });
}
