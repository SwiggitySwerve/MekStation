/**
 * Shared Campaign State — campaign event log persistence contract (CO1).
 *
 * `ICampaignEventStore` is the campaign-tier analogue of the combat
 * `IMatchStore`: an ordered, gap-free, typed, transactionally-appended
 * event log. Per design D2 the campaign event log is a SEPARATE log
 * from the per-match combat event log; the two are linked by id, never
 * merged.
 *
 * The contract is deliberately small and async so a production
 * implementation can persist the log alongside the campaign save
 * (through `add-campaign-persistence`'s store) without leaking
 * persistence details into callers. CO1 ships an in-memory
 * implementation; wiring it to the durable campaign store is mechanical
 * and additive.
 *
 * Key invariants (mirror of `IMatchStore`):
 *   - `appendEvent` is transactional all-or-nothing — a sequence
 *     collision MUST reject with `CampaignEventSequenceCollisionError`
 *     and leave the log untouched.
 *   - `getEvents(campaignId, fromSeq?)` returns events with
 *     `sequence >= fromSeq`, ascending, with no gaps.
 *
 * @spec openspec/changes/add-shared-campaign-state/specs/coop-campaign-sync/spec.md
 * @spec openspec/changes/add-shared-campaign-state/design.md (D2)
 */

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

/**
 * Thrown when an `appendEvent` call uses a `sequence` number that
 * already exists for the campaign. The campaign-tier analogue of
 * `MatchStoreSequenceCollisionError`. A hard error — the host treats it
 * as a server bug (two concurrent writers to the same campaign).
 */
export class CampaignEventSequenceCollisionError extends Error {
  constructor(
    public readonly campaignId: string,
    public readonly sequence: number,
  ) {
    super(
      `Campaign event sequence collision: campaign ${campaignId} already has an event at sequence ${sequence}`,
    );
    this.name = 'CampaignEventSequenceCollisionError';
  }
}

/**
 * The persistence boundary for the campaign event log.
 *
 * All methods are async so a future durable implementation can use a
 * network / SQLite backend without changing call sites. The in-memory
 * implementation satisfies the contract via `Promise.resolve`.
 */
export interface ICampaignEventStore {
  /**
   * Append a single campaign event. Sequence collisions MUST reject
   * with `CampaignEventSequenceCollisionError`. Implementations are
   * responsible for transactional all-or-nothing behaviour — exactly
   * one of two same-sequence appends succeeds.
   */
  appendEvent(campaignId: string, event: ICampaignEvent): Promise<void>;

  /**
   * Return all events for `campaignId` with `sequence >= fromSeq`
   * (default 0), in ascending sequence order with no gaps. An unknown
   * campaign returns an empty list (the log simply has not been written
   * to yet) — there is no "campaign not found" error here because the
   * log is created lazily on first append.
   */
  getEvents(
    campaignId: string,
    fromSeq?: number,
  ): Promise<readonly ICampaignEvent[]>;

  /**
   * The highest sequence number stored for `campaignId`, or `-1` when
   * the log is empty. Used by the host to assign the next sequence and
   * by a resync to decide between a tail stream and a fresh snapshot.
   */
  highestSequence(campaignId: string): Promise<number>;
}
