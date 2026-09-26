/**
 * JournalCampaignEventStore remembers the last stream head it read PER
 * CAMPAIGN (roadmap unit U89): two campaigns read through one store
 * instance keep independent heads, so appending to one never moves the
 * other's highest sequence (a head shared across campaign ids would give
 * the second campaign the first one's sequence, and the progression gate
 * would then wait for a revision that campaign never reaches).
 */

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { InMemoryEventJournal } from '@/lib/events/journal/InMemoryEventJournal';

import {
  JournalCampaignEventStore,
  type ICampaignJournalEnvelope,
} from '../JournalCampaignEventStore';

const NOW = '3025-01-03T00:00:00.000Z';

/** A CampaignDayAdvanced event of `campaignId` at `sequence`. */
function dayAdvanced(campaignId: string, sequence: number): ICampaignEvent {
  return {
    sequence,
    campaignId,
    ts: NOW,
    authorPlayerId: 'pid-host',
    type: 'CampaignDayAdvanced',
    scope: 'campaign',
    payload: { newDay: sequence + 1 },
  };
}

/** Appends `campaignId`'s events `from` through `to` (inclusive). */
async function append(
  store: JournalCampaignEventStore,
  campaignId: string,
  from: number,
  to: number,
): Promise<void> {
  for (let sequence = from; sequence <= to; sequence += 1) {
    await store.appendEvent(campaignId, dayAdvanced(campaignId, sequence));
  }
}

describe('JournalCampaignEventStore remembered heads', () => {
  it('keeps an independent head per campaign read through one store instance', async () => {
    const store = new JournalCampaignEventStore(
      new InMemoryEventJournal<ICampaignJournalEnvelope>(() => NOW),
    );

    await append(store, 'campaign-a', 0, 2);
    expect(await store.highestSequence('campaign-a')).toBe(2);

    await append(store, 'campaign-b', 0, 1);
    expect(await store.highestSequence('campaign-b')).toBe(1);

    await append(store, 'campaign-a', 3, 4);
    expect(await store.highestSequence('campaign-a')).toBe(4);
    expect(await store.highestSequence('campaign-b')).toBe(1);
  });
});
