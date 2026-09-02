/**
 * UI cutover for campaign activity (task 8.3 part B).
 *
 * The hook is mocked because it already has its own suite. These tests
 * pin what the dashboard card and log table paint from a feed answer —
 * especially that a FIFO leftover in the store cannot reappear once
 * the feed has spoken.
 */

import { act, render, screen } from '@testing-library/react';
import React from 'react';

import type { ICampaignActivityEntry } from '@/lib/campaign/activity/campaignActivityProjection';
import type { CampaignActivityFeedState } from '@/lib/campaign/hooks/useCampaignActivityFeed';
import type { IActivityLogEntry } from '@/types/campaign/ActivityLog';
import type { ICampaign } from '@/types/campaign/Campaign';

import { CampaignDashboard } from '@/components/campaign/dashboard/CampaignDashboard';
import {
  CAMPAIGN_ACTIVITY_NEEDS_IDENTITY_MESSAGE,
  LOCAL_CAMPAIGN_ACTIVITY_SOURCE_LABEL,
} from '@/lib/campaign/hooks/useCampaignActivityFeed';
import CampaignActivityLogPage from '@/pages/gameplay/campaigns/[id]/log';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { createCampaign } from '@/types/campaign/Campaign';

const CAMPAIGN_ID = 'campaign-activity-cutover';
const FIFO_MESSAGE = 'Local-only FIFO spend';
const SERVER_MESSAGE = 'Spent 4,000 C-bills on the raid.';
const GUEST_PUBLIC = 'Hired Rook for 12,000 C-bills';
const GUEST_PRIVATE_LOOKING =
  'Removed participant player-2 — Repeatedly stalled the turn timer';
const FORBIDDEN_MESSAGE = 'not a participant in this session';

const FIFO_ONLY: IActivityLogEntry = {
  id: 'fifo-only-1',
  timestamp: '3025-01-01T00:00:00.000Z',
  campaignDay: 1,
  message: FIFO_MESSAGE,
  category: 'battle',
  payload: {
    missionId: 'local-only',
    missionName: 'Local Only',
    result: 'victory',
  },
};

const SERVER_ENTRY: ICampaignActivityEntry = {
  ordinal: 0,
  occurredAt: '3025-01-02T00:00:00.000Z',
  campaignDay: 4,
  category: 'battle',
  message: SERVER_MESSAGE,
  actorPlayerId: 'participant-seated',
};

const GUEST_ENTRIES: readonly ICampaignActivityEntry[] = [
  {
    ordinal: 0,
    occurredAt: '3025-01-03T00:00:00.000Z',
    campaignDay: 3,
    category: 'battle',
    message: GUEST_PUBLIC,
    actorPlayerId: 'participant-guest',
  },
  {
    ordinal: 1,
    occurredAt: '3025-01-04T00:00:00.000Z',
    campaignDay: 3,
    category: 'battle',
    message: GUEST_PRIVATE_LOOKING,
    actorPlayerId: 'gm-1',
  },
];

const SHELL_CAMPAIGN = {
  id: CAMPAIGN_ID,
  name: 'Feed Cutover Co.',
} as ICampaign;

const mockUseCampaignActivityFeed = jest.fn();

jest.mock('@/lib/campaign/hooks/useCampaignActivityFeed', () => {
  const actual = jest.requireActual<
    typeof import('@/lib/campaign/hooks/useCampaignActivityFeed')
  >('@/lib/campaign/hooks/useCampaignActivityFeed');
  return {
    ...actual,
    useCampaignActivityFeed: (campaignId: string) =>
      mockUseCampaignActivityFeed(campaignId),
  };
});

jest.mock('@/components/campaign/CampaignNavigation', () => ({
  CampaignNavigation: () => <nav data-testid="campaign-nav" />,
}));

jest.mock('@/pages-modules/gameplay/campaigns/campaignPageShell', () => ({
  useCampaignPageShell: () => ({
    campaign: SHELL_CAMPAIGN,
    breadcrumbs: [],
    isClient: true,
    isLoadingCampaign: false,
    routeCampaignId: CAMPAIGN_ID,
    id: CAMPAIGN_ID,
    query: { id: CAMPAIGN_ID },
    store: {},
  }),
  renderPendingCampaignPage: () => null,
  getLoadedCampaign: () => SHELL_CAMPAIGN,
}));

function readyFeed(
  entries: readonly ICampaignActivityEntry[],
  viewerSeat: 'gm' | 'player' = 'gm',
): CampaignActivityFeedState {
  return {
    source: 'authoritative',
    status: 'ready',
    entries,
    viewerSeat,
  };
}

function seedCampaignWithFifo(): void {
  act(() => {
    useCampaignStore().setState({
      campaign: {
        ...createCampaign('Feed Cutover Co.', 'mercenary'),
        id: CAMPAIGN_ID,
      },
      activityLog: [FIFO_ONLY],
    });
  });
}

function dashboardRowMessages(): string[] {
  return screen
    .queryAllByTestId(/activity-log-entry-/)
    .map((node) => node.textContent ?? '');
}

function logRowMessages(): string[] {
  return screen
    .queryAllByTestId(/activity-log-row-/)
    .map((node) => node.textContent ?? '');
}

describe('campaign activity feed UI cutover', () => {
  beforeEach(() => {
    mockUseCampaignActivityFeed.mockReset();
    mockUseCampaignActivityFeed.mockReturnValue(readyFeed([]));
  });

  afterEach(() => {
    resetCampaignStore();
    clientSafeStorage.removeItem('campaign-store');
  });

  it('a seated participant sees authoritative entries and a FIFO-only store message is absent', () => {
    seedCampaignWithFifo();
    mockUseCampaignActivityFeed.mockReturnValue(readyFeed([SERVER_ENTRY]));
    render(<CampaignDashboard />);
    expect(screen.getByTestId('activity-log-entry-0')).toHaveTextContent(
      SERVER_MESSAGE,
    );
    expect(screen.queryByText(FIFO_MESSAGE)).not.toBeInTheDocument();
  });

  it('a guest sees exactly the feed rows with no client-side role filter', () => {
    seedCampaignWithFifo();
    mockUseCampaignActivityFeed.mockReturnValue(
      readyFeed(GUEST_ENTRIES, 'player'),
    );
    render(<CampaignDashboard />);
    const rendered = dashboardRowMessages();
    expect(rendered).toHaveLength(GUEST_ENTRIES.length);
    GUEST_ENTRIES.forEach((entry, index) => {
      expect(
        screen.getByTestId(`activity-log-entry-${entry.ordinal}`),
      ).toHaveTextContent(entry.message);
      expect(rendered[index]).toContain(entry.message);
    });
    expect(screen.queryByText(FIFO_MESSAGE)).not.toBeInTheDocument();
  });

  it('the log page renders the same rows as the dashboard for the same feed state', () => {
    seedCampaignWithFifo();
    const sharedGuest = GUEST_ENTRIES[0];
    if (sharedGuest === undefined) {
      throw new Error('guest fixture missing public row');
    }
    mockUseCampaignActivityFeed.mockReturnValue(
      readyFeed([SERVER_ENTRY, sharedGuest]),
    );
    const dashboard = render(<CampaignDashboard />);
    const fromDashboard = dashboardRowMessages();
    dashboard.unmount();
    render(<CampaignActivityLogPage />);
    const fromLog = logRowMessages();
    expect(fromDashboard).toHaveLength(2);
    expect(fromLog).toHaveLength(2);
    expect(fromDashboard.map((text) => text.includes(SERVER_MESSAGE))).toEqual([
      true,
      false,
    ]);
    expect(fromLog.map((text) => text.includes(SERVER_MESSAGE))).toEqual([
      true,
      false,
    ]);
    expect(fromDashboard[0]).toContain(SERVER_MESSAGE);
    expect(fromLog[0]).toContain(SERVER_MESSAGE);
    expect(fromDashboard[1]).toContain(GUEST_PUBLIC);
    expect(fromLog[1]).toContain(GUEST_PUBLIC);
    expect(screen.queryByText(FIFO_MESSAGE)).not.toBeInTheDocument();
  });

  it('a 403 renders the server message and no FIFO rows', () => {
    seedCampaignWithFifo();
    mockUseCampaignActivityFeed.mockReturnValue({
      source: 'authoritative',
      status: 'forbidden',
      entries: [],
      viewerSeat: null,
      message: FORBIDDEN_MESSAGE,
    });
    const dashboard = render(<CampaignDashboard />);
    expect(screen.getByTestId('activity-log-forbidden')).toHaveTextContent(
      FORBIDDEN_MESSAGE,
    );
    expect(screen.queryByText(FIFO_MESSAGE)).not.toBeInTheDocument();
    expect(
      screen.queryByText('The shared log has nothing yet.'),
    ).not.toBeInTheDocument();
    dashboard.unmount();
    render(<CampaignActivityLogPage />);
    expect(screen.getByTestId('activity-log-forbidden')).toHaveTextContent(
      FORBIDDEN_MESSAGE,
    );
    expect(
      screen.queryByTestId('activity-log-row-fifo-only-1'),
    ).not.toBeInTheDocument();
  });

  it('solo renders the FIFO rows under the honest source label', () => {
    seedCampaignWithFifo();
    mockUseCampaignActivityFeed.mockReturnValue({
      source: 'local',
      entries: [FIFO_ONLY],
      sourceLabel: LOCAL_CAMPAIGN_ACTIVITY_SOURCE_LABEL,
    });
    render(<CampaignDashboard />);
    expect(screen.getByTestId('activity-log-source-label')).toHaveTextContent(
      LOCAL_CAMPAIGN_ACTIVITY_SOURCE_LABEL,
    );
    expect(
      screen.getByTestId('activity-log-entry-fifo-only-1'),
    ).toHaveTextContent(FIFO_MESSAGE);
  });

  it('the log page renders the honest solo source label when the feed is local', () => {
    seedCampaignWithFifo();
    mockUseCampaignActivityFeed.mockReturnValue({
      source: 'local',
      entries: [FIFO_ONLY],
      sourceLabel: LOCAL_CAMPAIGN_ACTIVITY_SOURCE_LABEL,
    });
    render(<CampaignActivityLogPage />);
    expect(screen.getByTestId('activity-log-source-label')).toHaveTextContent(
      LOCAL_CAMPAIGN_ACTIVITY_SOURCE_LABEL,
    );
    expect(
      screen.getByText(LOCAL_CAMPAIGN_ACTIVITY_SOURCE_LABEL),
    ).toBeVisible();
  });

  it('the log page renders no source label when the feed is authoritative', () => {
    mockUseCampaignActivityFeed.mockReturnValue(readyFeed([SERVER_ENTRY]));
    render(<CampaignActivityLogPage />);
    expect(
      screen.queryByTestId('activity-log-source-label'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(LOCAL_CAMPAIGN_ACTIVITY_SOURCE_LABEL),
    ).not.toBeInTheDocument();
  });

  it('coop without identity renders the rejoin copy and no FIFO rows', () => {
    seedCampaignWithFifo();
    mockUseCampaignActivityFeed.mockReturnValue({
      source: 'needs-identity',
      message: CAMPAIGN_ACTIVITY_NEEDS_IDENTITY_MESSAGE,
    });
    render(<CampaignDashboard />);
    expect(screen.getByTestId('activity-log-needs-identity')).toHaveTextContent(
      CAMPAIGN_ACTIVITY_NEEDS_IDENTITY_MESSAGE,
    );
    expect(screen.queryByText(FIFO_MESSAGE)).not.toBeInTheDocument();
  });
});
