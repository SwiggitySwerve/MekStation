/**
 * Characterization tests for campaigns/[id].tsx (1,078 lines)
 * Captures tab sections and state before decomposition.
 *
 * Sections tested:
 * - Loading skeleton state
 * - Campaign not found state
 * - Tab navigation (overview / audit)
 * - Resources card
 * - Mission Progression + Mission Details panel
 * - Roster display
 * - Mission History
 * - Actions (delete, abandon)
 * - Delete confirmation modal
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

import { CampaignStatus, CampaignMissionStatus } from '@/types/campaign';

// =============================================================================
// Mocks
// =============================================================================

// --- next/link ---
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// --- next/router ---
const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockQuery: Record<string, string> = { id: 'campaign-1' };

jest.mock('next/router', () => ({
  useRouter: () => ({
    route: '/gameplay/campaigns/[id]',
    pathname: '/gameplay/campaigns/[id]',
    query: mockQuery,
    asPath: `/gameplay/campaigns/${mockQuery.id ?? ''}`,
    push: mockPush,
    replace: mockReplace,
    back: jest.fn(),
  }),
}));

// --- Toast ---
const mockShowToast = jest.fn();
jest.mock('@/components/shared/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

// --- Campaign audit timeline hook ---
jest.mock('@/hooks/audit', () => ({
  useCampaignTimeline: () => ({
    allEvents: [],
    isLoading: false,
    error: null,
    filters: {},
    pagination: { total: 0, hasMore: false },
    setFilters: jest.fn(),
    loadMore: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// --- Audit timeline components ---
jest.mock('@/components/audit/timeline', () => ({
  EventTimeline: () => <div data-testid="event-timeline">EventTimeline</div>,
  TimelineFilters: () => (
    <div data-testid="timeline-filters">TimelineFilters</div>
  ),
}));

// --- Campaign sub-components ---
jest.mock('@/components/campaign/MissionTreeView', () => ({
  MissionTreeView: ({
    onMissionClick,
    missions,
  }: {
    onMissionClick?: (m: unknown) => void;
    missions: unknown[];
  }) => (
    <div data-testid="mission-tree-view">
      {missions.map((m: unknown, i: number) => (
        <button
          key={i}
          data-testid={`mission-node-${i}`}
          onClick={() => onMissionClick?.(m)}
        >
          Mission {i}
        </button>
      ))}
    </div>
  ),
}));

jest.mock('@/components/campaign/RosterStateDisplay', () => ({
  RosterStateDisplay: () => (
    <div data-testid="roster-state-display">RosterStateDisplay</div>
  ),
}));

// --- Skeleton loaders ---
jest.mock('@/components/common/SkeletonLoader', () => ({
  SkeletonText: ({
    width,
    className,
  }: {
    width?: string;
    className?: string;
  }) => <div data-testid="skeleton-text" className={`${width} ${className}`} />,
  SkeletonFormSection: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div data-testid="skeleton-form-section">
      <span>{title}</span>
      {children}
    </div>
  ),
}));

// =============================================================================
// Mock campaign store
// =============================================================================

const mockStartMission = jest.fn().mockReturnValue(true);
const mockDeleteCampaign = jest.fn().mockReturnValue(true);
const mockSetCampaignStatus = jest.fn().mockReturnValue(true);
const mockValidateCampaign = jest.fn().mockReturnValue({
  valid: true,
  errors: [],
  warnings: [],
});
const mockClearError = jest.fn();
let mockCampaign: ReturnType<typeof createMockCampaign> | null = null;
let mockValidations = new Map<
  string,
  { valid: boolean; errors: string[]; warnings: string[] }
>();
let mockError: string | null = null;

jest.mock('@/stores/useCampaignStore', () => ({
  useCampaignStore: () => ({
    getCampaign: (id: string) => (id === 'campaign-1' ? mockCampaign : null),
    startMission: mockStartMission,
    deleteCampaign: mockDeleteCampaign,
    setCampaignStatus: mockSetCampaignStatus,
    validateCampaign: mockValidateCampaign,
    validations: mockValidations,
    error: mockError,
    clearError: mockClearError,
  }),
}));

// =============================================================================
// Helpers
// =============================================================================

function createMockMission(
  overrides: Partial<{
    id: string;
    name: string;
    description: string;
    status: CampaignMissionStatus;
    order: number;
    prerequisites: string[];
    branches: unknown[];
    isFinal: boolean;
    optionalObjectives: string[];
    outcome: {
      result: string;
      enemyUnitsDestroyed: number;
      playerUnitsDestroyed: number;
      cBillsReward: number;
      turnsPlayed: number;
      salvage: string[];
      xpAwarded: Record<string, number>;
      enemyBVDestroyed: number;
      playerBVLost: number;
    };
    completedAt: string;
  }> = {},
) {
  return {
    id: 'mission-1',
    name: 'Test Mission',
    description: 'A test mission',
    status: CampaignMissionStatus.Available,
    order: 1,
    prerequisites: [],
    branches: [],
    isFinal: false,
    optionalObjectives: [],
    outcome: undefined,
    completedAt: undefined,
    ...overrides,
  };
}

function createMockCampaign(
  overrides: Partial<{
    id: string;
    name: string;
    description: string;
    status: CampaignStatus;
    missions: ReturnType<typeof createMockMission>[];
    resources: {
      cBills: number;
      supplies: number;
      morale: number;
      salvageParts: number;
    };
    roster: { units: unknown[]; pilots: unknown[] };
    progress: {
      currentMissionId: string | null;
      missionsCompleted: number;
      missionsTotal: number;
      victories: number;
      defeats: number;
      startedAt: string;
      daysElapsed: number;
    };
    difficultyModifier: number;
    createdAt: string;
    updatedAt: string;
  }> = {},
) {
  return {
    id: 'campaign-1',
    name: 'Iron Warriors',
    description: 'A mercenary campaign across the Inner Sphere',
    status: CampaignStatus.Active,
    missions: [createMockMission()],
    resources: {
      cBills: 5000000,
      supplies: 42,
      morale: 75,
      salvageParts: 12,
    },
    roster: {
      units: [
        { unitId: 'u1', unitName: 'Atlas AS7-D', status: 'operational' },
        { unitId: 'u2', unitName: 'Hunchback HBK-4G', status: 'damaged' },
      ],
      pilots: [
        { pilotId: 'p1', pilotName: 'Kerensky', status: 'active' },
        { pilotId: 'p2', pilotName: 'Allard', status: 'active' },
      ],
    },
    progress: {
      currentMissionId: null,
      missionsCompleted: 3,
      missionsTotal: 8,
      victories: 2,
      defeats: 1,
      startedAt: '2025-01-01T00:00:00.000Z',
      daysElapsed: 45,
    },
    difficultyModifier: 1.0,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-02-01T00:00:00.000Z',
    ...overrides,
  };
}

import CampaignDetailPage from '@/pages/gameplay/campaigns/[id]';

function renderPage() {
  return render(<CampaignDetailPage />);
}

// =============================================================================
// Setup / Teardown
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery = { id: 'campaign-1' };
  mockCampaign = createMockCampaign();
  mockValidations = new Map();
  mockError = null;
});

// =============================================================================
// Tests
// =============================================================================

describe('Campaign Detail Page', () => {
  // =========================================================================
  // Basic Rendering
  // =========================================================================
  describe('Basic Rendering', () => {
    it('renders the page without crashing', () => {
      renderPage();
      expect(screen.getByTestId('page-title')).toHaveTextContent(
        'Iron Warriors',
      );
    });

    it('renders the campaign description in the layout', () => {
      renderPage();
      expect(
        screen.getByText('A mercenary campaign across the Inner Sphere'),
      ).toBeInTheDocument();
    });

    it('renders the campaign status badge', () => {
      renderPage();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders breadcrumbs', () => {
      renderPage();
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Campaigns')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Loading State (isClient=false → skeleton)
  // =========================================================================
  describe('Loading State', () => {
    // isClient is set to true in a useEffect, so the skeleton is briefly shown.
    // We can't easily test the pre-hydration state since useEffect runs immediately
    // in the test environment. This is captured by the existence of the SkeletonLoader
    // mock - we know it's imported and used.
    it('shows the page content after hydration (isClient=true)', () => {
      renderPage();
      expect(screen.getByTestId('page-title')).toHaveTextContent(
        'Iron Warriors',
      );
    });
  });

  // =========================================================================
  // Campaign Not Found
  // =========================================================================
  describe('Campaign Not Found', () => {
    it('shows not found message when campaign does not exist', () => {
      mockQuery = { id: 'nonexistent' };
      renderPage();
      expect(screen.getByText('Campaign Not Found')).toBeInTheDocument();
    });

    it('shows return link when campaign is not found', () => {
      mockQuery = { id: 'nonexistent' };
      renderPage();
      expect(screen.getByText('Return to Campaigns')).toBeInTheDocument();
    });

    it('links back to campaigns list', () => {
      mockQuery = { id: 'nonexistent' };
      renderPage();
      const link = screen.getByText('Return to Campaigns');
      expect(link.closest('a')).toHaveAttribute('href', '/gameplay/campaigns');
    });
  });

  // =========================================================================
  // Tab Navigation
  // =========================================================================
  describe('Tab Navigation', () => {
    it('renders Overview and Audit Timeline tabs', () => {
      renderPage();
      expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
      expect(screen.getByTestId('tab-audit')).toBeInTheDocument();
    });

    it('shows overview tab content by default', () => {
      renderPage();
      // Resources card is part of overview
      expect(screen.getByTestId('resources-card')).toBeInTheDocument();
    });

    it('switches to audit tab when clicked', () => {
      renderPage();
      act(() => {
        fireEvent.click(screen.getByTestId('tab-audit'));
      });
      expect(screen.getByText('Campaign Timeline')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-filters')).toBeInTheDocument();
    });

    it('switches back to overview tab', () => {
      renderPage();
      act(() => {
        fireEvent.click(screen.getByTestId('tab-audit'));
      });
      act(() => {
        fireEvent.click(screen.getByTestId('tab-overview'));
      });
      expect(screen.getByTestId('resources-card')).toBeInTheDocument();
    });

    it('updates URL when switching to audit tab', () => {
      renderPage();
      act(() => {
        fireEvent.click(screen.getByTestId('tab-audit'));
      });
      expect(mockReplace).toHaveBeenCalledWith(
        '/gameplay/campaigns/campaign-1?tab=audit',
        undefined,
        { shallow: true },
      );
    });

    it('updates URL when switching back to overview tab', () => {
      renderPage();
      act(() => {
        fireEvent.click(screen.getByTestId('tab-audit'));
      });
      act(() => {
        fireEvent.click(screen.getByTestId('tab-overview'));
      });
      expect(mockReplace).toHaveBeenCalledWith(
        '/gameplay/campaigns/campaign-1',
        undefined,
        { shallow: true },
      );
    });

    it('starts on audit tab when query param is set', () => {
      mockQuery = { id: 'campaign-1', tab: 'audit' };
      renderPage();
      expect(screen.getByText('Campaign Timeline')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Resources Card
  // =========================================================================
  describe('Resources Card', () => {
    it('renders the resources card', () => {
      renderPage();
      expect(screen.getByTestId('resources-card')).toBeInTheDocument();
    });

    it('displays C-Bills formatted in millions', () => {
      renderPage();
      expect(screen.getByTestId('resource-cbills')).toHaveTextContent('5.00M');
    });

    it('displays supplies count', () => {
      renderPage();
      expect(screen.getByTestId('resource-supplies')).toHaveTextContent('42');
    });

    it('displays morale percentage', () => {
      renderPage();
      expect(screen.getByTestId('resource-morale')).toHaveTextContent('75%');
    });

    it('displays salvage parts count', () => {
      renderPage();
      expect(screen.getByTestId('resource-salvage')).toHaveTextContent('12');
    });

    it('shows green morale when >= 50', () => {
      renderPage();
      const moraleEl = screen.getByTestId('resource-morale');
      expect(moraleEl.className).toContain('emerald');
    });

    it('shows red morale when < 50', () => {
      mockCampaign = createMockCampaign({
        resources: {
          cBills: 100000,
          supplies: 10,
          morale: 30,
          salvageParts: 2,
        },
      });
      renderPage();
      const moraleEl = screen.getByTestId('resource-morale');
      expect(moraleEl.className).toContain('red');
    });
  });

  // =========================================================================
  // Mission Progression
  // =========================================================================
  describe('Mission Progression', () => {
    it('renders the Mission Progression section', () => {
      renderPage();
      expect(screen.getByText('Mission Progression')).toBeInTheDocument();
    });

    it('renders the MissionTreeView component', () => {
      renderPage();
      expect(screen.getByTestId('mission-tree-view')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Mission Details Panel
  // =========================================================================
  describe('Mission Details Panel', () => {
    it('renders the mission details panel', () => {
      renderPage();
      expect(screen.getByTestId('mission-details-panel')).toBeInTheDocument();
    });

    it('shows placeholder text when no mission selected', () => {
      renderPage();
      expect(screen.getByText('Select a Mission')).toBeInTheDocument();
      expect(
        screen.getByText('Click on a mission in the tree to view details'),
      ).toBeInTheDocument();
    });

    it('shows mission details when a mission is clicked in tree', () => {
      renderPage();
      act(() => {
        fireEvent.click(screen.getByTestId('mission-node-0'));
      });
      expect(screen.getByTestId('mission-details-name')).toHaveTextContent(
        'Test Mission',
      );
    });

    it('displays mission description when selected', () => {
      renderPage();
      act(() => {
        fireEvent.click(screen.getByTestId('mission-node-0'));
      });
      expect(screen.getByText('A test mission')).toBeInTheDocument();
    });

    it('displays mission status badge when selected', () => {
      renderPage();
      act(() => {
        fireEvent.click(screen.getByTestId('mission-node-0'));
      });
      expect(screen.getByText('AVAILABLE')).toBeInTheDocument();
    });

    it('shows "Start This Mission" button for available missions', () => {
      renderPage();
      act(() => {
        fireEvent.click(screen.getByTestId('mission-node-0'));
      });
      expect(screen.getByText('Start This Mission')).toBeInTheDocument();
    });

    it('shows Final Mission badge when isFinal is true', () => {
      mockCampaign = createMockCampaign({
        missions: [createMockMission({ isFinal: true })],
      });
      renderPage();
      act(() => {
        fireEvent.click(screen.getByTestId('mission-node-0'));
      });
      expect(screen.getByText('Final Mission')).toBeInTheDocument();
    });

    it('shows optional objectives when present', () => {
      mockCampaign = createMockCampaign({
        missions: [
          createMockMission({
            optionalObjectives: ['Capture enemy base', 'Save all allies'],
          }),
        ],
      });
      renderPage();
      act(() => {
        fireEvent.click(screen.getByTestId('mission-node-0'));
      });
      expect(screen.getByText('Optional Objectives')).toBeInTheDocument();
      expect(screen.getByText('Capture enemy base')).toBeInTheDocument();
      expect(screen.getByText('Save all allies')).toBeInTheDocument();
    });

    it('shows outcome details for completed missions', () => {
      mockCampaign = createMockCampaign({
        missions: [
          createMockMission({
            status: CampaignMissionStatus.Victory,
            outcome: {
              result: 'victory',
              enemyUnitsDestroyed: 3,
              playerUnitsDestroyed: 1,
              cBillsReward: 75000,
              turnsPlayed: 12,
              salvage: [],
              xpAwarded: {},
              enemyBVDestroyed: 4500,
              playerBVLost: 1200,
            },
          }),
        ],
      });
      renderPage();
      act(() => {
        fireEvent.click(screen.getByTestId('mission-node-0'));
      });
      expect(screen.getByText('Outcome')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // enemy destroyed
      expect(screen.getByText('75K')).toBeInTheDocument(); // c-bills reward
    });
  });

  // =========================================================================
  // Roster Display
  // =========================================================================
  describe('Roster Display', () => {
    it('renders the RosterStateDisplay component', () => {
      renderPage();
      expect(screen.getByTestId('roster-state-display')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Mission History
  // =========================================================================
  describe('Mission History', () => {
    it('shows empty state when no completed missions', () => {
      renderPage();
      expect(screen.getByText('No completed missions yet')).toBeInTheDocument();
    });

    it('shows completed missions in history', () => {
      mockCampaign = createMockCampaign({
        missions: [
          createMockMission({
            id: 'm1',
            name: 'First Strike',
            status: CampaignMissionStatus.Victory,
            completedAt: '2025-01-15T00:00:00.000Z',
            outcome: {
              result: 'victory',
              enemyUnitsDestroyed: 2,
              playerUnitsDestroyed: 0,
              cBillsReward: 50000,
              turnsPlayed: 8,
              salvage: [],
              xpAwarded: {},
              enemyBVDestroyed: 3000,
              playerBVLost: 0,
            },
          }),
          createMockMission({
            id: 'm2',
            name: 'Recon Failure',
            status: CampaignMissionStatus.Defeat,
            completedAt: '2025-01-20T00:00:00.000Z',
            outcome: {
              result: 'defeat',
              enemyUnitsDestroyed: 0,
              playerUnitsDestroyed: 2,
              cBillsReward: -25000,
              turnsPlayed: 5,
              salvage: [],
              xpAwarded: {},
              enemyBVDestroyed: 0,
              playerBVLost: 3000,
            },
          }),
        ],
      });
      renderPage();
      expect(screen.getByText('Mission History')).toBeInTheDocument();
      expect(screen.getByText('First Strike')).toBeInTheDocument();
      expect(screen.getByText('Recon Failure')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Campaign Actions
  // =========================================================================
  describe('Campaign Actions', () => {
    it('shows Delete and Abandon buttons for active campaigns', () => {
      renderPage();
      expect(screen.getByTestId('delete-campaign-btn')).toBeInTheDocument();
      expect(screen.getByText('Abandon Campaign')).toBeInTheDocument();
    });

    it('hides action buttons for completed campaigns', () => {
      mockCampaign = createMockCampaign({
        status: CampaignStatus.Victory,
      });
      renderPage();
      expect(
        screen.queryByTestId('delete-campaign-btn'),
      ).not.toBeInTheDocument();
      expect(screen.queryByText('Abandon Campaign')).not.toBeInTheDocument();
    });

    it('hides action buttons for defeated campaigns', () => {
      mockCampaign = createMockCampaign({
        status: CampaignStatus.Defeat,
      });
      renderPage();
      expect(
        screen.queryByTestId('delete-campaign-btn'),
      ).not.toBeInTheDocument();
    });

    it('hides action buttons for abandoned campaigns', () => {
      mockCampaign = createMockCampaign({
        status: CampaignStatus.Abandoned,
      });
      renderPage();
      expect(
        screen.queryByTestId('delete-campaign-btn'),
      ).not.toBeInTheDocument();
    });

    it('calls setCampaignStatus with Abandoned when abandon clicked', () => {
      renderPage();
      act(() => {
        fireEvent.click(screen.getByText('Abandon Campaign'));
      });
      expect(mockSetCampaignStatus).toHaveBeenCalledWith(
        'campaign-1',
        CampaignStatus.Abandoned,
      );
    });

    it('shows success toast after abandoning', () => {
      renderPage();
      act(() => {
        fireEvent.click(screen.getByText('Abandon Campaign'));
      });
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'warning' }),
      );
    });
  });

  // =========================================================================
  // Delete Confirmation Modal
  // =========================================================================
  describe('Delete Confirmation Modal', () => {
    it('opens delete confirmation dialog', () => {
      renderPage();
      act(() => {
        fireEvent.click(screen.getByTestId('delete-campaign-btn'));
      });
      expect(screen.getByTestId('delete-confirm-dialog')).toBeInTheDocument();
      expect(screen.getByText('Delete Campaign?')).toBeInTheDocument();
    });

    it('shows campaign name in confirmation message', () => {
      renderPage();
      act(() => {
        fireEvent.click(screen.getByTestId('delete-campaign-btn'));
      });
      expect(screen.getByText(/permanently delete/)).toHaveTextContent(
        'Iron Warriors',
      );
    });

    it('cancels delete when Cancel button clicked', () => {
      renderPage();
      act(() => {
        fireEvent.click(screen.getByTestId('delete-campaign-btn'));
      });
      act(() => {
        fireEvent.click(screen.getByTestId('cancel-delete-btn'));
      });
      expect(
        screen.queryByTestId('delete-confirm-dialog'),
      ).not.toBeInTheDocument();
    });

    it('calls deleteCampaign when confirmed', () => {
      renderPage();
      act(() => {
        fireEvent.click(screen.getByTestId('delete-campaign-btn'));
      });
      act(() => {
        fireEvent.click(screen.getByTestId('confirm-delete-btn'));
      });
      expect(mockDeleteCampaign).toHaveBeenCalledWith('campaign-1');
    });

    it('navigates to campaigns list after successful delete', () => {
      renderPage();
      act(() => {
        fireEvent.click(screen.getByTestId('delete-campaign-btn'));
      });
      act(() => {
        fireEvent.click(screen.getByTestId('confirm-delete-btn'));
      });
      expect(mockPush).toHaveBeenCalledWith('/gameplay/campaigns');
    });

    it('shows success toast after delete', () => {
      renderPage();
      act(() => {
        fireEvent.click(screen.getByTestId('delete-campaign-btn'));
      });
      act(() => {
        fireEvent.click(screen.getByTestId('confirm-delete-btn'));
      });
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'success' }),
      );
    });
  });

  // =========================================================================
  // Start Mission
  // =========================================================================
  describe('Start Mission', () => {
    it('renders Start Next Mission button when available', () => {
      renderPage();
      expect(screen.getByText('Start Next Mission')).toBeInTheDocument();
    });

    it('does not show Start Next Mission when a mission is in progress', () => {
      mockCampaign = createMockCampaign({
        missions: [
          createMockMission({
            id: 'inprog-1',
            status: CampaignMissionStatus.InProgress,
          }),
        ],
      });
      renderPage();
      expect(screen.queryByText('Start Next Mission')).not.toBeInTheDocument();
    });

    it('shows Continue Mission button when mission is in progress', () => {
      mockCampaign = createMockCampaign({
        missions: [
          createMockMission({
            id: 'inprog-1',
            status: CampaignMissionStatus.InProgress,
          }),
        ],
      });
      renderPage();
      expect(screen.getByText('Continue Mission')).toBeInTheDocument();
    });

    it('calls startMission when Start Next Mission clicked', () => {
      renderPage();
      act(() => {
        fireEvent.click(screen.getByText('Start Next Mission'));
      });
      expect(mockStartMission).toHaveBeenCalledWith('campaign-1', 'mission-1');
    });

    it('navigates to encounters after successful mission start', () => {
      renderPage();
      act(() => {
        fireEvent.click(screen.getByText('Start Next Mission'));
      });
      expect(mockPush).toHaveBeenCalledWith('/gameplay/encounters');
    });

    it('shows info toast after starting mission', () => {
      renderPage();
      act(() => {
        fireEvent.click(screen.getByText('Start Next Mission'));
      });
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'info' }),
      );
    });

    it('does not show Start Next Mission for completed campaigns', () => {
      mockCampaign = createMockCampaign({
        status: CampaignStatus.Victory,
      });
      renderPage();
      expect(screen.queryByText('Start Next Mission')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Status Display
  // =========================================================================
  describe('Status Display', () => {
    it.each([
      [CampaignStatus.Setup, 'Setup'],
      [CampaignStatus.Active, 'Active'],
      [CampaignStatus.Victory, 'Victory'],
      [CampaignStatus.Defeat, 'Defeat'],
      [CampaignStatus.Abandoned, 'Abandoned'],
    ])('displays %s status as "%s"', (status, label) => {
      mockCampaign = createMockCampaign({ status });
      renderPage();
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Error Display
  // =========================================================================
  describe('Error Display', () => {
    it('shows error message when store has error', () => {
      mockError = 'Something went wrong';
      renderPage();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('does not show error section when no error', () => {
      renderPage();
      expect(
        screen.queryByText('Something went wrong'),
      ).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Validation Warnings
  // =========================================================================
  describe('Validation Warnings', () => {
    it('shows validation errors when present', () => {
      mockValidations = new Map([
        [
          'campaign-1',
          {
            valid: false,
            errors: ['No units in roster', 'No missions defined'],
            warnings: [],
          },
        ],
      ]);
      renderPage();
      expect(screen.getByText('Configuration Required')).toBeInTheDocument();
      expect(screen.getByText('No units in roster')).toBeInTheDocument();
      expect(screen.getByText('No missions defined')).toBeInTheDocument();
    });

    it('shows validation warnings when present', () => {
      mockValidations = new Map([
        [
          'campaign-1',
          {
            valid: true,
            errors: [],
            warnings: ['Low on supplies'],
          },
        ],
      ]);
      renderPage();
      expect(screen.getByText('Warnings')).toBeInTheDocument();
      expect(screen.getByText('Low on supplies')).toBeInTheDocument();
    });

    it('does not show validation card when valid with no warnings', () => {
      mockValidations = new Map([
        [
          'campaign-1',
          {
            valid: true,
            errors: [],
            warnings: [],
          },
        ],
      ]);
      renderPage();
      expect(
        screen.queryByText('Configuration Required'),
      ).not.toBeInTheDocument();
      expect(screen.queryByText('Warnings')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Audit Tab Content
  // =========================================================================
  describe('Audit Tab Content', () => {
    it('renders campaign timeline header in audit tab', () => {
      renderPage();
      act(() => {
        fireEvent.click(screen.getByTestId('tab-audit'));
      });
      expect(screen.getByText('Campaign Timeline')).toBeInTheDocument();
    });

    it('renders timeline filters in audit tab', () => {
      renderPage();
      act(() => {
        fireEvent.click(screen.getByTestId('tab-audit'));
      });
      expect(screen.getByTestId('timeline-filters')).toBeInTheDocument();
    });

    it('shows event count in audit tab', () => {
      renderPage();
      act(() => {
        fireEvent.click(screen.getByTestId('tab-audit'));
      });
      // 0 events from the mock
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('events')).toBeInTheDocument();
    });

    it('shows empty state when no events', () => {
      renderPage();
      act(() => {
        fireEvent.click(screen.getByTestId('tab-audit'));
      });
      expect(screen.getByText('No Events Yet')).toBeInTheDocument();
    });

    it('shows refresh button', () => {
      renderPage();
      act(() => {
        fireEvent.click(screen.getByTestId('tab-audit'));
      });
      expect(screen.getByLabelText('Refresh timeline')).toBeInTheDocument();
    });

    it('shows campaign name in timeline subtitle', () => {
      renderPage();
      act(() => {
        fireEvent.click(screen.getByTestId('tab-audit'));
      });
      expect(
        screen.getByText('Event history for Iron Warriors'),
      ).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Validates on Load
  // =========================================================================
  describe('Validates on Load', () => {
    it('calls validateCampaign on mount', () => {
      renderPage();
      expect(mockValidateCampaign).toHaveBeenCalledWith('campaign-1');
    });
  });
});
