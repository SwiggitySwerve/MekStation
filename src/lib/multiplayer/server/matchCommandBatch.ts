/**
 * Atomic match command batches (adopt-combat-event-journal-authority,
 * PR 1; umbrella section 3 `Atomic Command Event Batches`).
 *
 * The match store appends events one at a time, so a command producing
 * several events has no all-or-nothing boundary. A failure partway
 * through leaves a command half committed, and no reader afterwards can
 * distinguish that from a command that legitimately produced fewer
 * events. This is the contract that gives a command a boundary.
 *
 * Three properties, each of which stops meaning anything if dropped:
 *
 * - **Atomic.** Every event of the command commits, or none does.
 * - **Contiguous.** Revisions have no gaps, so a missing revision is a
 *   detectable fault rather than something readers must tolerate. A
 *   reader cannot tell a skipped revision from one it failed to receive.
 * - **Identified.** A command carries a stable identity, so a retry
 *   after an ambiguous failure is RECOGNISED rather than applied twice.
 *
 * The identity cuts both ways, which is why `integrity-conflict` is a
 * distinct answer from `duplicate-command`: the same id carrying
 * different work is not a retry, and treating it as one would let one
 * player's command be silently attributed to another's.
 *
 * @spec openspec/changes/adopt-combat-event-journal-authority/tasks.md (1.1-1.3)
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md (3)
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

/** One command's worth of events, offered as a single unit. */
export interface IMatchCommandBatch {
  /** Stable identity — the same command retried carries the same id. */
  readonly commandId: string;
  /** Who issued it. Part of the identity fingerprint. */
  readonly actorId: string;
  /** The revision the caller believes the stream is at. */
  readonly expectedRevision: number;
  /** Ordered, contiguous from `expectedRevision`. */
  readonly events: readonly IGameEvent[];
  /**
   * Digest of the state the caller derived for AFTER this batch. Stored
   * with the receipt so a later apply can be checked against what the
   * author intended, rather than confirming itself.
   */
  readonly expectedPostStateDigest?: string | null;
}

/** What the store recorded about a committed command. */
export interface IMatchCommandReceipt {
  readonly commandId: string;
  readonly actorId: string;
  readonly matchId: string;
  /** First event's revision. */
  readonly firstRevision: number;
  /** Last event's revision — the head after this batch. */
  readonly lastRevision: number;
  readonly eventCount: number;
  readonly fingerprint: string;
  readonly expectedPostStateDigest: string | null;
  readonly committedAt: string;
}

export type MatchBatchAppendResult =
  | { readonly kind: 'committed'; readonly receipt: IMatchCommandReceipt }
  | {
      /** Someone else moved the stream. Nothing was written. */
      readonly kind: 'revision-conflict';
      readonly expectedRevision: number;
      readonly actualRevision: number;
    }
  | {
      /** This exact command already committed. NOT an error. */
      readonly kind: 'duplicate-command';
      readonly receipt: IMatchCommandReceipt;
    }
  | {
      /** Same identity, different work. Never a silent overwrite. */
      readonly kind: 'integrity-conflict';
      readonly commandId: string;
    }
  | {
      /** The offered events skip or repeat a revision. */
      readonly kind: 'non-contiguous';
      readonly expectedRevision: number;
      readonly offendingSequence: number;
    }
  | { readonly kind: 'empty-batch' };

/**
 * Fingerprint of what a command actually did.
 *
 * Deliberately covers the actor, the revision span, and every event id
 * and type — the things that make two batches the SAME work. A retry
 * reproduces all of them; a different command reusing the id does not,
 * which is what turns a silent overwrite into a typed refusal.
 */
export function matchCommandFingerprint(batch: IMatchCommandBatch): string {
  const parts = [
    batch.commandId,
    batch.actorId,
    String(batch.expectedRevision),
    ...batch.events.map(
      (event) => `${event.sequence}:${event.id}:${event.type}`,
    ),
  ];
  return parts.join('|');
}

/**
 * Checks the offered events form an unbroken run from `expectedRevision`.
 *
 * Returns the offending sequence rather than a boolean so the caller can
 * say WHICH revision broke the run; "somewhere in this batch" is not
 * something an operator can act on.
 */
export function firstNonContiguousSequence(
  batch: IMatchCommandBatch,
): number | null {
  for (let index = 0; index < batch.events.length; index += 1) {
    const expected = batch.expectedRevision + index;
    const actual = batch.events[index]?.sequence;
    if (actual !== expected) {
      return actual ?? expected;
    }
  }
  return null;
}
