/**
 * K13 PR3: on the dashboard page the header's Advance Day, Advance Week and
 * Advance Month follow the campaign store's in-flight flag: enabled when
 * idle (each click reaches the page's handler once), disabled while an
 * advance is in flight, enabled again when it settles.
 *
 * Mocks follow CampaignDashboardPage.reactivity.test.tsx; the pieces that
 * matter here (the header, the campaign store, the flag hook) are real. The
 * mission-readiness projector is real too, not mocked: the page reads several
 * fields of its result (K6 added `units`), and a hand-written mock of that
 * shape drifted the first time the page changed.
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const mockHandlers = {
  handleAdvanceDay: jest.fn(),
  handleAdvanceWeek: jest.fn(),
  handleAdvanceMonth: jest.fn(),
};
let mockRouteCampaignId = 'campaign-alpha';
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/gameplay/campaigns/[id]',
    query: { id: mockRouteCampaignId },
    events: { on: jest.fn(), off: jest.fn() },
  }),
}));
jest.mock('@/components/ui', () => ({
  PageLayout: ({
    title,
    headerContent,
    children,
  }: {
    title: string;
    headerContent?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <main>
      <h1>{title}</h1>
      {headerContent}
      {children}
    </main>
  ),
  Card: ({ children }: { children?: React.ReactNode }) => (
    <section>{children}</section>
  ),
  Button: ({
    children,
    onClick,
    disabled,
    'data-testid': testId,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    'data-testid'?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} data-testid={testId}>
      {children}
    </button>
  ),
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
  Badge: ({ children }: { children?: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));
jest.mock('@/components/campaign/CampaignNavigation', () => ({
  CampaignNavigation: () => <nav />,
}));
jest.mock('@/components/campaign/coop', () => ({
  CampaignCoopRouteSurfaceConnected: () => null,
}));
jest.mock('@/components/campaign/dashboard/CampaignDashboard', () => ({
  CampaignDashboard: () => <div />,
}));
jest.mock('@/components/campaign/DayReportPanel', () => ({
  DayReportPanel: () => <div />,
}));
jest.mock(
  '@/components/gameplay/pages/campaigns/dashboard/CampaignSaveStatusCard',
  () => ({ CampaignSaveStatusCard: () => <div /> }),
);
jest.mock(
  '@/components/gameplay/pages/campaigns/dashboard/DailyBattleAuditFeed',
  () => ({ DailyBattleAuditFeed: () => <div /> }),
);
jest.mock(
  '@/components/gameplay/pages/campaigns/dashboard/PendingOutcomesBanner',
  () => ({ PendingOutcomesBanner: () => <div /> }),
);
jest.mock(
  '@/components/gameplay/pages/campaigns/dashboard/CampaignDashboardPage.cards',
  () => ({
    CampaignInformationCard: () => <div />,
    CampaignMissionHistoryCard: () => <div />,
    CampaignQuickActionsCard: () => <div />,
  }),
);
jest.mock(
  '@/components/gameplay/pages/campaigns/dashboard/CampaignDashboardPage.hooks',
  () => ({
    useClientReady: () => true,
    useCampaignLaunchHead: () => null,
    usePendingOutcomes: () => [],
    useDailyBattleAudit: () => [],
    useOutcomeApplyErrors: () => ({}),
    useCampaignDayReports: () => ({
      dayReports: [],
      setDayReports: jest.fn(),
      ...mockHandlers,
    }),
  }),
);
jest.mock('@/stores/campaign/campaignPersistenceWiring', () => ({
  installCampaignPersistenceWiring: jest.fn(),
}));
jest.mock('@/stores/campaign/useCampaignPersistenceStore', () => {
  const persistenceState = {
    campaignId: null as string | null,
    errorMessage: null,
    loadCampaign: jest.fn().mockResolvedValue(true),
    reset: jest.fn(),
    initializeCreatedCampaign: jest.fn(),
    saveCampaign: jest.fn(),
    saveState: 'idle' as const,
    launchConflict: null,
    reportLaunchConflict: jest.fn(),
    clearLaunchConflict: () => undefined,
  };
  return {
    hasUnsettledCampaignPersistence: () => false,
    useCampaignPersistenceStore: Object.assign(
      (selector: (state: typeof persistenceState) => unknown) =>
        selector(persistenceState),
      { getState: () => persistenceState, setState: jest.fn() },
    ),
  };
});
const mockRosterState = {
  units: [],
  pilots: [],
  missionCount: 0,
  createMission: jest.fn(),
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
jest.mock('@/stores/campaign/useCampaignStore', () => ({
  ...jest.requireActual('@/stores/campaign/useCampaignStore'),
  useCampaignStore: () => mockCampaignStore,
}));

import { createCampaignStore } from '@/stores/campaign/useCampaignStore';

import CampaignDashboardPage from '../CampaignDashboardPage';

const HEADER_BUTTONS = [
  ['advance-day-btn', 'handleAdvanceDay'],
  ['advance-week-btn', 'handleAdvanceWeek'],
  ['advance-month-btn', 'handleAdvanceMonth'],
] as const;

describe('CampaignDashboardPage advance buttons', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    Object.values(mockHandlers).forEach((handler) => handler.mockReset());
    mockCampaignStore = createCampaignStore();
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    })) as unknown as typeof fetch;
    act(() => {
      mockCampaignStore.getState().createCampaign('Alpha Lance', 'mercenary');
    });
    mockRouteCampaignId =
      mockCampaignStore.getState().campaign?.id ?? 'campaign-alpha';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it.each(HEADER_BUTTONS)(
    '(B9) idle: %s reaches the page handler once per click',
    async (testId, handler) => {
      render(<CampaignDashboardPage />);

      await userEvent.click(screen.getByTestId(testId));

      expect(mockHandlers[handler]).toHaveBeenCalledTimes(1);
    },
  );

  it('(B10) all three buttons are disabled while an advance is in flight and come back when it settles', async () => {
    render(<CampaignDashboardPage />);
    for (const [testId] of HEADER_BUTTONS) {
      expect(screen.getByTestId(testId)).toBeEnabled();
    }

    act(() => mockCampaignStore.setState({ dayAdvanceInFlight: true }));
    await waitFor(() =>
      expect(screen.getByTestId('advance-day-btn')).toBeDisabled(),
    );
    for (const [testId] of HEADER_BUTTONS) {
      expect(screen.getByTestId(testId)).toBeDisabled();
      await userEvent.click(screen.getByTestId(testId));
    }
    expect(mockHandlers.handleAdvanceDay).not.toHaveBeenCalled();
    expect(mockHandlers.handleAdvanceWeek).not.toHaveBeenCalled();
    expect(mockHandlers.handleAdvanceMonth).not.toHaveBeenCalled();

    act(() => mockCampaignStore.setState({ dayAdvanceInFlight: false }));
    await waitFor(() =>
      expect(screen.getByTestId('advance-month-btn')).toBeEnabled(),
    );
    for (const [testId] of HEADER_BUTTONS) {
      expect(screen.getByTestId(testId)).toBeEnabled();
    }
  });
});
