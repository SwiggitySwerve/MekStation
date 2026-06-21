import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const mockRouterPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    pathname: '/gameplay/campaigns/[id]',
    query: { id: 'campaign-alpha' },
    events: { on: jest.fn(), off: jest.fn() },
  }),
}));

jest.mock('@/components/ui', () => ({
  PageLayout: ({
    title,
    subtitle,
    children,
  }: {
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
  }) => (
    <main>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {children}
    </main>
  ),
  Card: ({ children }: { children?: React.ReactNode }) => (
    <section>{children}</section>
  ),
  Button: ({
    children,
    onClick,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
  Badge: ({ children }: { children?: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

jest.mock('@/components/campaign/CampaignNavigation', () => ({
  CampaignNavigation: () => <nav data-testid="campaign-navigation" />,
}));
jest.mock('@/components/campaign/coop', () => ({
  CampaignCoopRouteSurfaceConnected: () => null,
}));
jest.mock('@/components/campaign/dashboard/CampaignDashboard', () => ({
  CampaignDashboard: () => <div data-testid="campaign-command-dashboard" />,
}));
jest.mock('@/components/campaign/DayReportPanel', () => ({
  DayReportPanel: () => <div data-testid="day-report-panel" />,
}));
jest.mock(
  '@/components/gameplay/pages/campaigns/dashboard/CampaignSaveStatusCard',
  () => ({ CampaignSaveStatusCard: () => <div data-testid="save-status" /> }),
);
jest.mock(
  '@/components/gameplay/pages/campaigns/dashboard/DailyBattleAuditFeed',
  () => ({ DailyBattleAuditFeed: () => <div data-testid="daily-audit" /> }),
);
jest.mock(
  '@/components/gameplay/pages/campaigns/dashboard/PendingOutcomesBanner',
  () => ({
    PendingOutcomesBanner: () => <div data-testid="pending-outcomes" />,
  }),
);
jest.mock(
  '@/components/gameplay/pages/campaigns/dashboard/CampaignDashboardPage.cards',
  () => ({
    CampaignInformationCard: () => <div data-testid="info-card" />,
    CampaignMissionHistoryCard: () => <div data-testid="mission-card" />,
    CampaignQuickActionsCard: () => <div data-testid="actions-card" />,
  }),
);
jest.mock(
  '@/components/gameplay/pages/campaigns/dashboard/CampaignDashboardPage.hooks',
  () => ({
    useClientReady: () => true,
    usePendingOutcomes: () => [],
    useDailyBattleAudit: () => [],
    useOutcomeApplyErrors: () => ({}),
    useCampaignDayReports: () => ({
      dayReports: [],
      setDayReports: jest.fn(),
      handleAdvanceDay: jest.fn(),
      handleAdvanceWeek: jest.fn(),
      handleAdvanceMonth: jest.fn(),
    }),
  }),
);
jest.mock('@/stores/campaign/campaignPersistenceWiring', () => ({
  installCampaignPersistenceWiring: jest.fn(),
}));

const mockRosterState = {
  pilots: [],
  missionCount: 0,
  getUnitsWithReadiness: () => [],
  getMissionHistory: () => [],
  getDeployableUnits: () => [],
};
jest.mock('@/stores/campaign/useCampaignRosterStore', () => ({
  useCampaignRosterStore: Object.assign(
    (selector: (state: typeof mockRosterState) => unknown) =>
      selector(mockRosterState),
    { getState: () => mockRosterState },
  ),
}));

let mockCampaignStore: ReturnType<
  typeof import('@/stores/campaign/useCampaignStore').createCampaignStore
>;
jest.mock('@/stores/campaign/useCampaignStore', () => {
  const actual = jest.requireActual('@/stores/campaign/useCampaignStore');
  return {
    ...actual,
    useCampaignStore: () => mockCampaignStore,
  };
});

import { createCampaignStore } from '@/stores/campaign/useCampaignStore';

import CampaignDashboardPage from '../CampaignDashboardPage';

describe('CampaignDashboardPage reactivity', () => {
  beforeEach(() => {
    mockCampaignStore = createCampaignStore();
    mockRouterPush.mockReset();
    act(() => {
      mockCampaignStore.getState().createCampaign('Alpha Lance', 'mercenary');
    });
  });

  it('re-renders when the active campaign changes in the store', async () => {
    render(<CampaignDashboardPage />);

    expect(
      screen.getByRole('heading', { name: 'Alpha Lance' }),
    ).toBeInTheDocument();

    act(() => {
      mockCampaignStore.getState().updateCampaign({ name: 'Bravo Lance' });
    });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Bravo Lance' }),
      ).toBeInTheDocument();
    });
  });
});
