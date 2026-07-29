import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const mockRouterPush = jest.fn();
const mockMaterializeCampaignMissionEncounter = jest.fn();
const mockRosterCreateMission = jest.fn();
const mockPersistCampaign = jest.fn();
const mockLoadPersistedCampaign = jest.fn();
const mockResetPersistence = jest.fn();
let mockReadinessCanLaunch = false;
let mockSelectedRosterUnits: readonly {
  readonly unitId: string;
  readonly unitName: string;
  readonly unitRef: string;
  readonly pilotId: string;
  readonly readiness: 'Ready';
}[] = [];
let mockRouteCampaignId = 'campaign-alpha';
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    pathname: '/gameplay/campaigns/[id]',
    query: { id: mockRouteCampaignId },
    events: { on: jest.fn(), off: jest.fn() },
  }),
}));

jest.mock(
  '@/lib/campaign/encounter/materializeCampaignMissionEncounter',
  () => ({
    materializeCampaignMissionEncounter: (...args: unknown[]) =>
      mockMaterializeCampaignMissionEncounter(...args),
  }),
);
jest.mock('@/lib/campaign/readiness/missionReadinessProjection', () => ({
  buildMissionReadinessProjection: () => ({
    canLaunch: mockReadinessCanLaunch,
    selectedUnits: mockSelectedRosterUnits,
    unresolvedBlockers: mockReadinessCanLaunch
      ? []
      : [{ message: 'No ready roster unit' }],
  }),
  selectedRosterUnitsForLaunch: () => mockSelectedRosterUnits,
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
jest.mock('@/stores/campaign/useCampaignPersistenceStore', () => {
  const persistenceState = {
    errorMessage: null,
    loadCampaign: (...args: unknown[]) => mockLoadPersistedCampaign(...args),
    reset: (...args: unknown[]) => mockResetPersistence(...args),
    saveCampaign: (...args: unknown[]) => mockPersistCampaign(...args),
    saveState: 'idle' as const,
  };
  return {
    useCampaignPersistenceStore: Object.assign(
      (selector: (state: typeof persistenceState) => unknown) =>
        selector(persistenceState),
      { getState: () => persistenceState },
    ),
  };
});

const mockRosterState = {
  pilots: [],
  missionCount: 0,
  createMission: mockRosterCreateMission,
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
    mockMaterializeCampaignMissionEncounter.mockReset();
    mockRosterCreateMission.mockReset();
    mockPersistCampaign.mockReset().mockResolvedValue({
      status: 'saved',
      retriedConflict: false,
    });
    mockLoadPersistedCampaign.mockReset().mockResolvedValue(true);
    mockResetPersistence.mockReset();
    mockReadinessCanLaunch = false;
    mockSelectedRosterUnits = [];
    act(() => {
      mockCampaignStore.getState().createCampaign('Alpha Lance', 'mercenary');
    });
    mockRouteCampaignId =
      mockCampaignStore.getState().campaign?.id ?? 'campaign-alpha';
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

  it('materializes a playable encounter before routing a generated campaign mission', async () => {
    // Given: one ready roster unit and a materializer result that identifies
    // the fully configured encounter.
    mockReadinessCanLaunch = true;
    mockSelectedRosterUnits = [
      {
        unitId: 'unit-alpha',
        unitName: 'Locust LCT-1V',
        unitRef: 'locust-lct-1v',
        pilotId: 'pilot-alpha',
        readiness: 'Ready',
      },
    ];
    mockMaterializeCampaignMissionEncounter.mockResolvedValue({
      encounterId: 'encounter-ready',
      reused: false,
      missionScenarioIds: ['encounter-ready'],
    });
    mockRosterCreateMission.mockImplementation(
      (
        _name: string,
        _unitIds: readonly string[],
        _encounterId: string,
        missionId: string,
      ) => missionId,
    );
    render(<CampaignDashboardPage />);

    // When: the player generates a mission from the campaign dashboard.
    await userEvent.click(
      screen.getByRole('button', { name: 'Generate Mission' }),
    );

    // Then: the generated mission uses the materialized encounter and keeps
    // one shared mission id across campaign, roster, and navigation state.
    await waitFor(() => {
      expect(mockMaterializeCampaignMissionEncounter).toHaveBeenCalledTimes(1);
    });
    const materializeInput =
      mockMaterializeCampaignMissionEncounter.mock.calls[0]?.[0];
    expect(
      materializeInput?.campaign.missions.get(materializeInput.missionId),
    ).toMatchObject({
      name: 'Mission 1',
      scenarioIds: [],
    });
    expect(mockRosterCreateMission).toHaveBeenCalledWith(
      'Mission 1',
      ['unit-alpha'],
      'encounter-ready',
      materializeInput?.missionId,
    );
    expect(mockRouterPush).toHaveBeenCalledWith(
      `/gameplay/encounters/encounter-ready?campaignId=${mockRouteCampaignId}&missionId=${materializeInput?.missionId}`,
    );
    expect(mockPersistCampaign).toHaveBeenCalledTimes(1);
    expect(mockPersistCampaign.mock.invocationCallOrder[0]).toBeLessThan(
      mockRouterPush.mock.invocationCallOrder[0],
    );
    expect(
      mockCampaignStore
        .getState()
        .campaign?.missions.get(materializeInput?.missionId)?.scenarioIds,
    ).toContain('encounter-ready');
  });

  it('keeps the dashboard in place when the generated mission checkpoint fails', async () => {
    mockReadinessCanLaunch = true;
    mockSelectedRosterUnits = [
      {
        unitId: 'unit-alpha',
        unitName: 'Locust LCT-1V',
        unitRef: 'locust-lct-1v',
        pilotId: 'pilot-alpha',
        readiness: 'Ready',
      },
    ];
    mockMaterializeCampaignMissionEncounter.mockResolvedValue({
      encounterId: 'encounter-unsaved',
      reused: false,
      missionScenarioIds: ['encounter-unsaved'],
    });
    mockPersistCampaign.mockResolvedValue({
      status: 'error',
      errorMessage: 'disk unavailable',
      retriedConflict: false,
    });

    render(<CampaignDashboardPage />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Generate Mission' }),
    );

    expect(
      await screen.findByTestId('generate-mission-error'),
    ).toHaveTextContent('disk unavailable');
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
