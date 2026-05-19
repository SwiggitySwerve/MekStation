/**
 * Tests for the campaign event log (CO1, task 2.4).
 *
 * Covers: append ordering, ascending gap-free sequence,
 * sequence-collision rejection (transactional all-or-nothing), and
 * replay reconstructing identical campaign state.
 *
 * @spec openspec/changes/add-shared-campaign-state/specs/coop-campaign-sync/spec.md
 */

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import {
  applyCampaignEvent,
  replayCampaignEvents,
} from '@/lib/campaign/sync/applyCampaignEvent';
import { CampaignEventLog } from '@/lib/campaign/sync/campaignEventLog';
import { CampaignEventSequenceCollisionError } from '@/lib/campaign/sync/ICampaignEventStore';
import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

const CAMPAIGN_ID = 'campaign-log';

function dayEvent(sequence: number, newDay: number): ICampaignEvent {
  return {
    type: 'CampaignDayAdvanced',
    sequence,
    campaignId: CAMPAIGN_ID,
    ts: '3025-01-01T00:00:00.000Z',
    authorPlayerId: 'host',
    payload: { newDay },
  };
}

describe('CampaignEventLog — append + read', () => {
  it('assigns ascending gap-free sequences via nextSequence', async () => {
    const store = new InMemoryCampaignEventStore();
    const log = new CampaignEventLog(CAMPAIGN_ID, store);

    expect(await log.nextSequence()).toBe(0);
    await log.append(dayEvent(0, 1));
    expect(await log.nextSequence()).toBe(1);
    await log.append(dayEvent(1, 2));
    expect(await log.nextSequence()).toBe(2);
  });

  it('preserves ascending sequence order on read', async () => {
    const store = new InMemoryCampaignEventStore();
    const log = new CampaignEventLog(CAMPAIGN_ID, store);
    // Append 20 events.
    for (let i = 0; i < 20; i++) {
      await log.append(dayEvent(i, i + 1));
    }
    const events = await log.getCampaignEvents(0);
    expect(events).toHaveLength(20);
    for (let i = 0; i < events.length; i++) {
      expect(events[i].sequence).toBe(i);
    }
    // No gaps — each sequence is exactly one greater than the prior.
    for (let i = 1; i < events.length; i++) {
      expect(events[i].sequence - events[i - 1].sequence).toBe(1);
    }
  });

  it('getCampaignEvents(fromSeq) returns only the tail', async () => {
    const store = new InMemoryCampaignEventStore();
    const log = new CampaignEventLog(CAMPAIGN_ID, store);
    for (let i = 0; i < 10; i++) {
      await log.append(dayEvent(i, i + 1));
    }
    const tail = await log.getCampaignEvents(7);
    expect(tail.map((e) => e.sequence)).toEqual([7, 8, 9]);
  });
});

describe('CampaignEventLog — transactional append', () => {
  it('rejects a same-sequence append and leaves the log untouched', async () => {
    const store = new InMemoryCampaignEventStore();
    const log = new CampaignEventLog(CAMPAIGN_ID, store);
    await log.append(dayEvent(0, 1));

    await expect(log.append(dayEvent(0, 99))).rejects.toBeInstanceOf(
      CampaignEventSequenceCollisionError,
    );
    // The collision mutated nothing — the original event is intact.
    const events = await log.getCampaignEvents(0);
    expect(events).toHaveLength(1);
    expect(events[0].payload).toEqual({ newDay: 1 });
  });

  it('exactly one of two concurrent same-sequence appends succeeds', async () => {
    const store = new InMemoryCampaignEventStore();
    const log = new CampaignEventLog(CAMPAIGN_ID, store);

    const results = await Promise.allSettled([
      log.append(dayEvent(0, 1)),
      log.append(dayEvent(0, 2)),
    ]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      CampaignEventSequenceCollisionError,
    );
  });
});

describe('CampaignEventLog — replay reconstruction', () => {
  it('reconstructs identical campaign state by replaying the log', async () => {
    const store = new InMemoryCampaignEventStore();
    const log = new CampaignEventLog(CAMPAIGN_ID, store);

    const events: ICampaignEvent[] = [
      {
        type: 'CampaignSnapshotPublished',
        sequence: 0,
        campaignId: CAMPAIGN_ID,
        ts: '3025-01-01T00:00:00.000Z',
        authorPlayerId: 'host',
        payload: { state: createEmptyCampaignState(CAMPAIGN_ID) },
      },
      {
        type: 'FundsChanged',
        sequence: 1,
        campaignId: CAMPAIGN_ID,
        ts: '3025-01-01T00:00:00.000Z',
        authorPlayerId: 'host',
        payload: {
          delta: 500_000,
          reason: 'Contract advance',
          balance: 500_000,
        },
      },
      dayEvent(2, 1),
      {
        type: 'PilotHired',
        sequence: 3,
        campaignId: CAMPAIGN_ID,
        ts: '3025-01-01T00:00:00.000Z',
        authorPlayerId: 'host',
        payload: {
          pilot: { pilotId: 'p1', name: 'Pilot One' },
          cost: 50_000,
        },
      },
    ];
    for (const event of events) {
      await log.append(event);
    }

    // Replay through the log facade.
    const reconstructed = await log.reconstructState();

    // Independently fold the same events to compute the expected state.
    let expected = createEmptyCampaignState(CAMPAIGN_ID);
    for (const event of events) {
      expected = applyCampaignEvent(expected, event);
    }

    expect(reconstructed).toEqual(expected);
    expect(reconstructed.balance).toBe(500_000);
    expect(reconstructed.day).toBe(1);
    expect(reconstructed.pilots.p1).toEqual({
      pilotId: 'p1',
      name: 'Pilot One',
    });
  });

  it('replayCampaignEvents on an empty log yields the empty state', () => {
    const state = replayCampaignEvents(CAMPAIGN_ID, []);
    expect(state).toEqual(createEmptyCampaignState(CAMPAIGN_ID));
  });
});
