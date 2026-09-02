import type { ICampaignActivityEntry } from '@/lib/campaign/activity/campaignActivityProjection';
import type { IActivityLogEntry } from '@/types/campaign/ActivityLog';

import {
  campaignActivityFeedNotice,
  displayRowsFromCampaignActivityFeed,
  SHARED_ACTIVITY_LOG_EMPTY_MESSAGE,
  toCampaignActivityDisplayRow,
  toCampaignActivityDisplayRows,
} from '../campaignActivityDisplay';

const FIRST: ICampaignActivityEntry = {
  ordinal: 0,
  occurredAt: '3025-01-02T00:00:00.000Z',
  campaignDay: 5,
  category: 'finances',
  message: 'Spent 1,000 C-bills on Refit.',
  actorPlayerId: 'participant-1',
};

const SECOND: ICampaignActivityEntry = {
  ordinal: 12,
  occurredAt: '3025-01-03T00:00:00.000Z',
  campaignDay: 2,
  category: 'personnel',
  message: 'Hired Rook',
  actorPlayerId: 'participant-2',
};

const LOCAL: IActivityLogEntry = {
  id: 'fifo-1',
  timestamp: '3025-01-01T00:00:00.000Z',
  campaignDay: 1,
  message: 'Local-only spend',
  category: 'battle',
  payload: {
    missionId: 'm-1',
    missionName: 'Local Only',
    result: 'victory',
  },
};

describe('toCampaignActivityDisplayRow', () => {
  it('maps ordinal to id and copies day, category, and message', () => {
    expect(toCampaignActivityDisplayRow(FIRST)).toEqual({
      id: '0',
      campaignDay: 5,
      category: 'finances',
      message: 'Spent 1,000 C-bills on Refit.',
    });
    expect(toCampaignActivityDisplayRow(SECOND).id).toBe('12');
  });
});

describe('toCampaignActivityDisplayRows', () => {
  it('preserves caller order and does not sort by campaign day', () => {
    expect(
      toCampaignActivityDisplayRows([FIRST, SECOND]).map((row) => row.id),
    ).toEqual(['0', '12']);
    expect(
      toCampaignActivityDisplayRows([SECOND, FIRST]).map(
        (row) => row.campaignDay,
      ),
    ).toEqual([2, 5]);
  });
});

describe('displayRowsFromCampaignActivityFeed', () => {
  it('maps ready authoritative entries and yields nothing for forbidden', () => {
    expect(
      displayRowsFromCampaignActivityFeed({
        source: 'authoritative',
        status: 'ready',
        entries: [FIRST, SECOND],
        viewerSeat: 'player',
      }),
    ).toEqual(toCampaignActivityDisplayRows([FIRST, SECOND]));
    expect(
      displayRowsFromCampaignActivityFeed({
        source: 'authoritative',
        status: 'forbidden',
        entries: [FIRST],
        viewerSeat: null,
        message: 'not a participant in this session',
      }),
    ).toEqual([]);
  });

  it('maps local FIFO rows by their existing id', () => {
    expect(
      displayRowsFromCampaignActivityFeed({
        source: 'local',
        entries: [LOCAL],
        sourceLabel: "This browser's campaign log (not shared)",
      }),
    ).toEqual([
      {
        id: 'fifo-1',
        campaignDay: 1,
        category: 'battle',
        message: 'Local-only spend',
      },
    ]);
  });
});

describe('campaignActivityFeedNotice', () => {
  it('keeps a 403 as the server message rather than empty-ready', () => {
    expect(
      campaignActivityFeedNotice({
        source: 'authoritative',
        status: 'forbidden',
        entries: [],
        viewerSeat: null,
        message: 'not a participant in this session',
      }),
    ).toEqual({
      testid: 'activity-log-forbidden',
      message: 'not a participant in this session',
    });
    expect(
      campaignActivityFeedNotice({
        source: 'authoritative',
        status: 'ready',
        entries: [],
        viewerSeat: 'gm',
      })?.message,
    ).toBe(SHARED_ACTIVITY_LOG_EMPTY_MESSAGE);
  });
});
