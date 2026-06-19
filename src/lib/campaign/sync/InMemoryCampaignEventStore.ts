/**
 * Shared Campaign State — in-memory campaign event log (CO1).
 *
 * The dev/test `ICampaignEventStore` implementation, backed by a
 * `Map<campaignId, ICampaignLog>`. The campaign-tier analogue of
 * `InMemoryMatchStore`. A production implementation persists the log
 * alongside the campaign save (through `add-campaign-persistence`'s
 * store); this in-memory store is what CO1 ships and what every CO1
 * test runs against.
 *
 * Why a class even though state is just a Map: lets multiple instances
 * coexist in tests so cross-test bleed is structurally impossible.
 *
 * @spec openspec/changes/add-shared-campaign-state/specs/coop-campaign-sync/spec.md
 * @spec openspec/changes/add-shared-campaign-state/design.md (D2)
 */

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import {
  CampaignEventSequenceCollisionError,
  type ICampaignEventStore,
} from './ICampaignEventStore';

/** Per-campaign log record. */
interface ICampaignLogRecord {
  /** Events, kept sorted ascending by `sequence`. */
  readonly events: ICampaignEvent[];
  /**
   * Set of sequences already stored — an O(1) duplicate check so a
   * long campaign log never pays an O(n) scan per append.
   */
  readonly sequences: Set<number>;
}

/**
 * In-memory campaign event store. Transactional all-or-nothing append
 * semantics are preserved even though state is a synchronous Map: the
 * sequence-collision check runs BEFORE any mutation, so a rejected
 * append leaves the log untouched.
 */
export class InMemoryCampaignEventStore implements ICampaignEventStore {
  private readonly logs = new Map<string, ICampaignLogRecord>();

  appendEvent = async (
    campaignId: string,
    event: ICampaignEvent,
  ): Promise<void> => {
    const record = this.getOrCreate(campaignId);
    // Sequence-collision check FIRST — a collision rejects and mutates
    // nothing (the transactional all-or-nothing guarantee).
    if (record.sequences.has(event.sequence)) {
      throw new CampaignEventSequenceCollisionError(campaignId, event.sequence);
    }
    record.events.push(event);
    record.sequences.add(event.sequence);
    // Keep the log sorted so `getEvents` is a cheap slice/filter. A
    // host always appends ascending, so this sort is near-free, but it
    // makes an out-of-order append (a test, a recovery splice) correct.
    record.events.sort((left, right) => left.sequence - right.sequence);
  };

  getEvents = async (
    campaignId: string,
    fromSeq = 0,
  ): Promise<readonly ICampaignEvent[]> => {
    const record = this.logs.get(campaignId);
    if (!record) return [];
    if (fromSeq <= 0) {
      return record.events.slice();
    }
    return record.events.filter((event) => event.sequence >= fromSeq);
  };

  highestSequence = async (campaignId: string): Promise<number> => {
    const record = this.logs.get(campaignId);
    if (!record || record.events.length === 0) return -1;
    return record.events[record.events.length - 1].sequence;
  };

  /** Number of campaign logs currently tracked. Test/observability. */
  size = (): number => {
    return this.logs.size;
  };

  /** Drop every log. Used by tests for isolation. */
  reset = (): void => {
    this.logs.clear();
  };

  private getOrCreate(campaignId: string): ICampaignLogRecord {
    let record = this.logs.get(campaignId);
    if (!record) {
      record = { events: [], sequences: new Set() };
      this.logs.set(campaignId, record);
    }
    return record;
  }
}
