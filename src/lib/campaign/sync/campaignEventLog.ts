/**
 * Shared Campaign State — campaign event log facade (CO1).
 *
 * `CampaignEventLog` wraps an `ICampaignEventStore` with the higher-level
 * operations the `CampaignMatchHost` and the sync session need:
 *
 *   - `append` — append one event, enforcing ascending gap-free
 *     sequence assignment.
 *   - `nextSequence` — the sequence the host should stamp on the next
 *     event it commits.
 *   - `getCampaignEvents` — ordered read from a sequence (task 2.2).
 *   - `reconstructState` — replay the whole log into campaign state
 *     (task 2.3), delegating to the shared `replayCampaignEvents`
 *     reducer.
 *
 * The facade is intentionally thin — the transactional guarantee and
 * the gap-free read both live in the underlying store. The facade adds
 * the host-facing ergonomics (sequence assignment, replay) so the host
 * never re-implements them.
 *
 * @spec openspec/changes/add-shared-campaign-state/specs/coop-campaign-sync/spec.md
 * @spec openspec/changes/add-shared-campaign-state/tasks.md (tasks 2.1-2.3)
 */

import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

import type { ICampaignEventStore } from './ICampaignEventStore';

import { replayCampaignEvents } from './applyCampaignEvent';

export class CampaignEventLog {
  constructor(
    private readonly campaignId: string,
    private readonly store: ICampaignEventStore,
  ) {}

  /**
   * The sequence number the host should stamp on the next event it
   * commits. The first event of a fresh campaign is sequence 0; every
   * subsequent event is `highestSequence + 1`, so the log is always
   * ascending and gap-free.
   */
  async nextSequence(): Promise<number> {
    const highest = await this.store.highestSequence(this.campaignId);
    return highest + 1;
  }

  /**
   * Append one committed event. The caller (the `CampaignMatchHost`) is
   * responsible for stamping the event's `sequence` from `nextSequence`
   * — `append` does not renumber, so a sequence collision (two writers
   * racing) surfaces as `CampaignEventSequenceCollisionError` exactly
   * as the spec scenario "Concurrent append is transactional" requires.
   */
  async append(event: ICampaignEvent): Promise<void> {
    await this.store.appendEvent(this.campaignId, event);
  }

  /**
   * Read the campaign event log from `fromSeq` (default 0), ordered
   * ascending by `sequence`. The campaign-tier analogue of
   * `IMatchStore.getEvents`. Spec scenario "Event log preserves order
   * on read" — the underlying store guarantees the ordering and the
   * gap-free property.
   */
  async getCampaignEvents(fromSeq = 0): Promise<readonly ICampaignEvent[]> {
    return this.store.getEvents(this.campaignId, fromSeq);
  }

  /**
   * Reconstruct campaign state by replaying the entire log from
   * sequence 0. Spec scenario "Replaying the log reconstructs campaign
   * state" — the result equals the host's authoritative state.
   */
  async reconstructState(): Promise<ICampaignAuthoritativeState> {
    const events = await this.store.getEvents(this.campaignId, 0);
    return replayCampaignEvents(this.campaignId, events);
  }
}

/**
 * Module-level convenience wrapper around an `ICampaignEventStore`,
 * mirroring the `IMatchStore.getEvents` free-function shape. Exposed so
 * the sync-session resync path can read a tail without holding a
 * `CampaignEventLog` instance.
 */
export async function getCampaignEvents(
  store: ICampaignEventStore,
  campaignId: string,
  fromSeq = 0,
): Promise<readonly ICampaignEvent[]> {
  return store.getEvents(campaignId, fromSeq);
}
