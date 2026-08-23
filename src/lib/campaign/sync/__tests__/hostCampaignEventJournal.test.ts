/**
 * Host-log journal adapter pages CampaignMatchHost events as a campaign
 * stream and refuses append (task 3.5).
 */

import { freezeCampaignEvent } from '@/lib/campaign/sync/campaignEventScope';
import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';
import { CAMPAIGN_STREAM_TYPE } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { ROOT_EVENT_BRANCH_ID } from '@/lib/events/journal/EventJournalContract';

import { createHostCampaignEventJournal } from '../hostCampaignEventJournal';

const CAMPAIGN_ID = 'campaign-host-journal';
const TS = '2026-08-22T16:30:00.000Z';

describe('createHostCampaignEventJournal', () => {
  it('pages host-log events as stored campaign stream rows', async () => {
    const store = new InMemoryCampaignEventStore();
    await store.appendEvent(
      CAMPAIGN_ID,
      freezeCampaignEvent({
        type: 'CampaignDayAdvanced',
        sequence: 0,
        campaignId: CAMPAIGN_ID,
        ts: TS,
        authorPlayerId: 'pid_host',
        scope: 'campaign',
        payload: { newDay: 2 },
      }),
    );
    const journal = createHostCampaignEventJournal(CAMPAIGN_ID, function () {
      return store.getEvents(CAMPAIGN_ID, 0);
    });
    const page = await journal.readStream({
      streamType: CAMPAIGN_STREAM_TYPE,
      streamId: CAMPAIGN_ID,
      branchId: ROOT_EVENT_BRANCH_ID,
      afterRevision: 0,
      limit: 50,
    });
    expect(page).toHaveLength(1);
    expect(page[0]?.payload.campaignEvent.type).toBe('CampaignDayAdvanced');
    expect(page[0]?.streamRevision).toBe(1);
    expect(page[0]?.eventDigest.length).toBeGreaterThan(0);
  });

  it('refuses append so the adapter cannot become a second source writer', async () => {
    const journal = createHostCampaignEventJournal(
      CAMPAIGN_ID,
      async function () {
        return [];
      },
    );
    await expect(
      journal.append({
        streamType: CAMPAIGN_STREAM_TYPE,
        streamId: CAMPAIGN_ID,
        expectedBranchId: ROOT_EVENT_BRANCH_ID,
        expectedRevision: 0,
        commandId: 'cmd-1',
        principal: {
          actorKind: 'system',
          actorId: 'test',
          authorityType: 'test',
          authorityId: CAMPAIGN_ID,
        },
        events: [],
      }),
    ).rejects.toThrow(/read-only|refuses append|projection source/);
  });

  it('ignores a foreign stream id', async () => {
    const journal = createHostCampaignEventJournal(
      CAMPAIGN_ID,
      async function () {
        return [
          freezeCampaignEvent({
            type: 'CampaignDayAdvanced',
            sequence: 0,
            campaignId: CAMPAIGN_ID,
            ts: TS,
            authorPlayerId: 'pid_host',
            scope: 'campaign',
            payload: { newDay: 1 },
          }),
        ];
      },
    );
    const page = await journal.readStream({
      streamType: CAMPAIGN_STREAM_TYPE,
      streamId: 'other-campaign',
      branchId: ROOT_EVENT_BRANCH_ID,
      afterRevision: 0,
      limit: 50,
    });
    expect(page).toEqual([]);
  });
});
