/**
 * The D10 command -> append pipeline for one campaign batch, extracted
 * from `CampaignMatchHost` (umbrella 8.4 follow-on; finding #40).
 *
 * WHY IT MOVED. Enforcing the host's single-writer property added a lock
 * and six door acquisitions to `CampaignMatchHost`, which pushed the file
 * past its line budget. This block is the natural thing to lift: it is
 * one coherent operation with a beginning and an end, it already had its
 * own contract, and it has a sibling precedent in
 * `CampaignMatchHostOutcomeInbox`, which lifted the outcome-inbox commit
 * the same way. Nothing about the ordering changed in the move.
 *
 * THE ORDERING IS THE POINT, and none of it survives rearranging:
 *
 * 1. Stamp one contiguous sequence run from the current head.
 * 2. Derive the expected post-state on a SCRATCH projection, so the live
 *    state is untouched until the batch is durably committed.
 * 3. Append the batch and that digest atomically.
 * 4. Re-apply the COMMITTED batch to the live projection and compare
 *    digests - verify-after-apply. Inequality means the projection can no
 *    longer be trusted, so nothing is published, the projection is
 *    rebuilt from the journal, and the committed batch is left alone.
 * 5. Only then fan out to subscribers.
 *
 * The host reaches this only while holding its write lock; the caller's
 * `commitEvents` asserts that before delegating here.
 */

import type { ICampaignEventStore } from '@/lib/campaign/sync/ICampaignEventStore';
import type {
  CampaignIntentResult,
  ICampaignAuthoritativeState,
  ICampaignEvent,
  ICampaignHeadRef,
} from '@/types/campaign/CampaignSync';

import { applyCampaignEvent } from '@/lib/campaign/sync/applyCampaignEvent';
import { freezeCampaignEvent } from '@/lib/campaign/sync/campaignEventScope';
import { CampaignProjectionDivergenceError } from '@/lib/campaign/sync/ICampaignEventStore';
import { computeCampaignStateDigest } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { ROOT_EVENT_BRANCH_ID } from '@/lib/events/journal/EventJournalContract';
import { campaignStaleHeadRefusal } from '@/types/campaign/CampaignSync';

import type { ICampaignIntentCommandIdentity } from './campaignIntentIdentity';
import type { UnsequencedCampaignEvent } from './CampaignMatchHostIntent';

import { CampaignIntentIdentityConflictError } from './campaignIntentIdentity';

/**
 * The host state this commit reads and moves, passed explicitly.
 *
 * Explicit rather than a handle to the host itself: the pipeline touches
 * exactly these five things, and naming them is what stops a later edit
 * from quietly reaching for a sixth.
 */
/**
 * What one commit did. A lost race is a RESULT, not an exception: the
 * throw it replaces escaped the host's doors and reached the socket
 * dispatch catch, which closed a connection over something recoverable.
 */
export type CampaignCommitOutcome =
  | { readonly kind: 'committed'; readonly events: readonly ICampaignEvent[] }
  | { readonly kind: 'lost-race'; readonly head: ICampaignHeadRef };

/**
 * One commit outcome as one door's answer.
 *
 * Folded because all four committing doors said exactly this, and four
 * copies is four chances for one of them to drop the head.
 */
export function resultOfCommit(
  outcome: CampaignCommitOutcome,
): CampaignIntentResult {
  return outcome.kind === 'lost-race'
    ? campaignStaleHeadRefusal(outcome.head)
    : { ok: true, events: outcome.events };
}

export interface ICampaignBatchCommitHost {
  readonly campaignId: string;
  /** The sequence the next event should carry. */
  readonly nextSequence: () => Promise<number>;
  readonly readState: () => ICampaignAuthoritativeState;
  readonly writeState: (state: ICampaignAuthoritativeState) => void;
  /** Replay the durable log after a divergence. */
  readonly rebuildState: () => Promise<ICampaignAuthoritativeState>;
  /** Record that a divergence happened; diagnostic, never cleared. */
  readonly markDivergence: () => void;
  /** Fan one committed event out to every subscriber. */
  readonly publish: (event: ICampaignEvent) => void;
}

/**
 * The non-batch fallback: stamp, append, apply and publish one event at
 * a time, for a store with no `appendCommandBatch`.
 *
 * Lifted out of `CampaignMatchHost` for the reason the batch pipeline
 * above was: the reconcile batch door (finding #78) needed room, and
 * this loop is a coherent block whose contract was already named.
 * Nothing about the ordering changed in the move - the append still
 * happens BEFORE the projection moves, so a sequence collision rejects
 * with the host's state untouched rather than half-applied.
 */
export async function commitCampaignEventsInSequence(
  host: ICampaignBatchCommitHost,
  append: (event: ICampaignEvent) => Promise<void>,
  events: readonly UnsequencedCampaignEvent[],
): Promise<CampaignCommitOutcome> {
  const committed: ICampaignEvent[] = [];
  for (const unsequenced of events) {
    // Awaited per event so two events in one call get consecutive numbers.
    const sequence = await host.nextSequence();
    // The spread of one unsequenced union member plus `sequence` is
    // exactly the corresponding `ICampaignEvent` variant; TS cannot
    // correlate the spread across the union, so the assertion makes the
    // (sound) intent explicit at this single chokepoint.
    const event = freezeCampaignEvent({
      ...unsequenced,
      sequence,
    } as ICampaignEvent);
    await append(event);
    // Advance through the SHARED reducer - the same function the guest
    // mirror uses, so host and guest can never drift.
    host.writeState(applyCampaignEvent(host.readState(), event));
    host.publish(event);
    committed.push(event);
  }
  return { kind: 'committed', events: committed };
}

/**
 * Commit one command's whole event batch atomically, verify the applied
 * projection, and publish only on success.
 */
export async function commitCampaignEventBatch(
  host: ICampaignBatchCommitHost,
  events: readonly UnsequencedCampaignEvent[],
  appendCommandBatch: NonNullable<ICampaignEventStore['appendCommandBatch']>,
  identity?: ICampaignIntentCommandIdentity,
): Promise<CampaignCommitOutcome> {
  const base = await host.nextSequence();
  const sequenced = events.map((unsequenced, index) =>
    freezeCampaignEvent({
      ...unsequenced,
      sequence: base + index,
    } as ICampaignEvent),
  );
  // Scratch projection - the live state is untouched until the batch is
  // durably committed.
  let expected = host.readState();
  for (const event of sequenced) {
    expected = applyCampaignEvent(expected, event);
  }
  const expectedDigest = computeCampaignStateDigest(expected);
  const result = await appendCommandBatch(host.campaignId, {
    // A supplied client identity is namespaced by campaign so its derived
    // journal event ids cannot collide in the journal's global id space.
    // The sequence fallback is for server events or legacy callers without
    // an intent id; it never dedupes by design because no retry identity was
    // offered.
    commandId: identity?.commandId ?? `campaign-cmd:${host.campaignId}:${base}`,
    intentFingerprint: identity?.intentFingerprint,
    events: sequenced,
    expectedPostStateDigest: expectedDigest,
  });
  if (result.kind === 'duplicate-command') {
    return { kind: 'committed', events: result.receipt.events };
  }
  if (result.kind === 'command-identity-conflict') {
    throw new CampaignIntentIdentityConflictError(result.commandId);
  }
  if (result.kind !== 'committed') {
    // With the write lock held this host cannot race ITSELF, so reaching
    // here means another writer moved the head - a second host instance,
    // or the HTTP command route. That is not fatal and not the client's
    // fault, so it is answered rather than thrown: the throw used to
    // escape `applyHostIntent` and close the GM's socket.
    //
    // The revision comes from the FAILED append, never from the read
    // above: something committed in between, so the replayed number is
    // already history. For a campaign stream the next sequence and the
    // revision are the same value (sequence N lives at revision N + 1),
    // so this needs the right source, not a conversion.
    return {
      kind: 'lost-race',
      head: {
        branchId: ROOT_EVENT_BRANCH_ID,
        // Re-read, not carried. `base` is the pre-race number and is
        // already history; and the store contract's conflict arm is
        // structural, carrying no sequence of its own, so asking the
        // stream again is the only answer that holds on every adapter.
        revision: await host.nextSequence(),
      },
    };
  }
  // Verify-after-apply: re-apply the COMMITTED batch to the live
  // projection and compare digests. Inequality means the projection can
  // no longer be trusted (nondeterministic reducer, concurrent
  // mutation): publish no success, rebuild from the journal, keep the
  // committed batch untouched.
  let applied = host.readState();
  for (const event of sequenced) {
    applied = applyCampaignEvent(applied, event);
  }
  const appliedDigest = computeCampaignStateDigest(applied);
  if (appliedDigest !== expectedDigest) {
    host.markDivergence();
    host.writeState(await host.rebuildState());
    throw new CampaignProjectionDivergenceError(
      host.campaignId,
      expectedDigest,
      appliedDigest,
    );
  }
  host.writeState(applied);
  for (const event of sequenced) {
    host.publish(event);
  }
  return { kind: 'committed', events: sequenced };
}
