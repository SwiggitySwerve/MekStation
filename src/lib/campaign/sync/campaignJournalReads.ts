/**
 * Paginated campaign-stream reads over the shared event journal.
 *
 * Extracted from `JournalCampaignEventStore` as the store's READ half:
 * the store file keeps the write/commit paths it owns, and these two
 * walks - full event materialization and the highest-sequence probe -
 * live beside each other because they share the same pagination shape
 * (afterRevision is exclusive; sequence N lives at revision N + 1).
 */

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import {
  EVENT_JOURNAL_MAX_PAGE_SIZE,
  ROOT_EVENT_BRANCH_ID,
  type IEventJournal,
} from '@/lib/events/journal/EventJournalContract';

import {
  CAMPAIGN_STREAM_TYPE,
  envelopeOf,
  type ICampaignJournalEnvelope,
} from './JournalCampaignEventStore';

/** Every campaign event with sequence >= fromSeq, in order. */
export async function readCampaignJournalEvents(
  journal: IEventJournal<ICampaignJournalEnvelope>,
  campaignId: string,
  fromSeq = 0,
): Promise<readonly ICampaignEvent[]> {
  const events: ICampaignEvent[] = [];
  let afterRevision = Math.max(0, fromSeq);
  for (;;) {
    const page = await journal.readStream({
      streamType: CAMPAIGN_STREAM_TYPE,
      streamId: campaignId,
      branchId: ROOT_EVENT_BRANCH_ID,
      afterRevision,
      limit: EVENT_JOURNAL_MAX_PAGE_SIZE,
    });
    for (const stored of page) events.push(envelopeOf(stored));
    if (page.length < EVENT_JOURNAL_MAX_PAGE_SIZE) return events;
    afterRevision = page[page.length - 1].streamRevision;
  }
}

/** The highest committed sequence, or -1 for an empty stream. */
export async function readCampaignJournalHighestSequence(
  journal: IEventJournal<ICampaignJournalEnvelope>,
  campaignId: string,
): Promise<number> {
  let highest = -1;
  let afterRevision = 0;
  for (;;) {
    const page = await journal.readStream({
      streamType: CAMPAIGN_STREAM_TYPE,
      streamId: campaignId,
      branchId: ROOT_EVENT_BRANCH_ID,
      afterRevision,
      limit: EVENT_JOURNAL_MAX_PAGE_SIZE,
    });
    if (page.length > 0) {
      highest = envelopeOf(page[page.length - 1]).sequence;
      afterRevision = page[page.length - 1].streamRevision;
    }
    if (page.length < EVENT_JOURNAL_MAX_PAGE_SIZE) return highest;
  }
}
