/**
 * Characterization tests for Pilot Detail page — captures current behavior
 * of identity, skills, career stats, wounds, awards, progression, and career
 * history sections before decomposition into smaller components.
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

import { usePilotStore } from '@/stores/usePilotStore';
import { IPilot, PilotStatus, PilotType } from '@/types/pilot';

// =============================================================================
// Test Data
// =============================================================================

const mockActivePilot: IPilot = {
  id: 'pilot-001',
  name: 'Sarah Kerensky',
  callsign: 'Phoenix',
  affiliation: 'Clan Wolf',
  type: PilotType.Persistent,
  status: PilotStatus.Active,
  skills: { gunnery: 3, piloting: 4 },
  wounds: 0,
  abilities: [{ abilityId: 'marksman', acquiredDate: '2025-01-01T00:00:00Z' }],
  career: {
    missionsCompleted: 25,
    victories: 18,
    defeats: 5,
    draws: 2,
    totalKills: 42,
    killRecords: [],
    missionHistory: [],
    xp: 150,
    totalXpEarned: 500,
    rank: 'Star Captain',
  },
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-06-01T00:00:00Z',
};

const mockInjuredPilot: IPilot = {
  ...mockActivePilot,
  id: 'pilot-002',
  name: 'Victor Steiner-Davion',
  callsign: 'Hammer',
  status: PilotStatus.Injured,
  wounds: 3,
  skills: { gunnery: 5, piloting: 6 },
};

const mockStatblockPilot: IPilot = {
  id: 'pilot-003',
  name: 'Generic MechWarrior',
  type: PilotType.Statblock,
  status: PilotStatus.Active,
  skills: { gunnery: 4, piloting: 5 },
  wounds: 0,
  abilities: [],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const mockRetiredPilot: IPilot = {
  ...mockActivePilot,
  id: 'pilot-004',
  name: 'Natasha Kerensky',
  callsign: 'Black Widow',
  status: PilotStatus.Retired,
};

// =============================================================================
// Mocks
// =============================================================================

// Override jest.setup.js router mock — we need query params
const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockQuery: Record<string, string> = { id: 'pilot-001' };

jest.mock('next/router', () => ({
  useRouter: () => ({
    route: '/gameplay/pilots/[id]',
    pathname: '/gameplay/pilots/[id]',
    query: mockQuery,
    asPath: `/gameplay/pilots/${mockQuery.id}`,
    push: mockPush,
    replace: mockReplace,
    back: jest.fn(),
  }),
}));

jest.mock('next/head', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

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

// Mock Toast
const mockShowToast = jest.fn();
jest.mock('@/components/shared/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

// Mock complex child components with simple stubs
jest.mock('@/components/audit/timeline', () => ({
  EventTimeline: ({
    events,
  }: {
    events: unknown[];
    onEventClick?: () => void;
  }) => (
    <div data-testid="event-timeline">Timeline: {events.length} events</div>
  ),
  TimelineFilters: () => (
    <div data-testid="timeline-filters">TimelineFilters</div>
  ),
}));

jest.mock('@/components/award', () => ({
  AwardGrid: ({ pilotId }: { pilotId: string }) => (
    <div data-testid="award-grid">Awards for {pilotId}</div>
  ),
}));

jest.mock('@/components/common/SkeletonLoader', () => ({
  SkeletonText: ({ width }: { width?: string; className?: string }) => (
    <div data-testid="skeleton-text" className={width} />
  ),
  SkeletonFormSection: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div data-testid="skeleton-section">
      <span>{title}</span>
      {children}
    </div>
  ),
}));

const MockPilotProgressionPanel = ({
  pilot,
}: {
  pilot: IPilot;
  onUpdate?: () => void;
}) => (
  <div data-testid="pilot-progression-panel">Progression for {pilot.name}</div>
);

jest.mock('@/components/pilots/PilotProgressionPanel', () => ({
  PilotProgressionPanel: (props: { pilot: IPilot; onUpdate?: () => void }) =>
    MockPilotProgressionPanel(props),
}));

jest.mock('@/components/pilots', () => {
  const actual = jest.requireActual('@/components/pilots');
  return {
    ...actual,
    PilotProgressionPanel: (props: { pilot: IPilot; onUpdate?: () => void }) =>
      MockPilotProgressionPanel(props),
  };
});

// Mock pilot timeline hook
const mockUsePilotTimeline = {
  allEvents: [],
  isLoading: false,
  error: null,
  filters: {},
  pagination: { total: 0, hasMore: false },
  setFilters: jest.fn(),
  loadMore: jest.fn(),
  refresh: jest.fn(),
};
jest.mock('@/hooks/audit', () => ({
  usePilotTimeline: () => mockUsePilotTimeline,
}));

// Import AFTER mocks
import PilotDetailPage from '@/pages/gameplay/pilots/[id]';

// =============================================================================
// Helpers
// =============================================================================

function renderPage() {
  return render(<PilotDetailPage />);
}

// =============================================================================
// Tests
// =============================================================================

beforeEach(() => {
  mockQuery = { id: 'pilot-001' };
  mockPush.mockClear();
  mockReplace.mockClear();
  mockShowToast.mockClear();

  // Set store to loaded state with active pilot by default
  // Also mock loadPilots to resolve immediately and set isInitialized
  const loadPilotsMock = jest.fn().mockResolvedValue(undefined);
  usePilotStore.setState({
    pilots: [
      mockActivePilot,
      mockInjuredPilot,
      mockStatblockPilot,
      mockRetiredPilot,
    ],
    isLoading: false,
    error: null,
    selectedPilotId: null,
    showActiveOnly: false,
    searchQuery: '',
  });
  usePilotStore.setState({ loadPilots: loadPilotsMock } as unknown as Partial<
    ReturnType<typeof usePilotStore.getState>
  >);

  // Reset timeline mock
  mockUsePilotTimeline.allEvents = [];
  mockUsePilotTimeline.isLoading = false;
  mockUsePilotTimeline.error = null;
  mockUsePilotTimeline.pagination = { total: 0, hasMore: false };
});

describe('Pilot Detail Page', () => {
  describe('Basic Rendering', () => {
    it('renders the page without crashing', async () => {
      await act(async () => {
        renderPage();
      });
      expect(
        screen.getAllByText('Sarah Kerensky').length,
      ).toBeGreaterThanOrEqual(1);
    });

    it('renders loading skeleton before initialization', () => {
      // Set store to loading state
      usePilotStore.setState({
        pilots: [],
        isLoading: true,
        error: null,
      });
      // Make loadPilots never resolve to keep in loading state
      usePilotStore.setState({
        loadPilots: jest.fn().mockReturnValue(new Promise(() => {})),
      } as unknown as Partial<ReturnType<typeof usePilotStore.getState>>);

      render(<PilotDetailPage />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getAllByTestId('skeleton-section').length).toBeGreaterThan(
        0,
      );
    });

    it('renders error state when pilot is not found', async () => {
      mockQuery = { id: 'nonexistent' };

      await act(async () => {
        renderPage();
      });

      expect(screen.getByText('Pilot Not Found')).toBeInTheDocument();
    });
  });

  describe('Pilot Identity Section', () => {
    it('displays pilot name prominently', async () => {
      await act(async () => {
        renderPage();
      });

      // The name appears in the identity card
      const nameElements = screen.getAllByText('Sarah Kerensky');
      expect(nameElements.length).toBeGreaterThanOrEqual(1);
    });

    it('displays pilot callsign when present', async () => {
      await act(async () => {
        renderPage();
      });

      expect(screen.getAllByText(/"Phoenix"/).length).toBeGreaterThanOrEqual(1);
    });

    it('displays pilot affiliation when present', async () => {
      await act(async () => {
        renderPage();
      });

      expect(screen.getByText('Clan Wolf')).toBeInTheDocument();
    });

    it('displays pilot status badge', async () => {
      await act(async () => {
        renderPage();
      });

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('displays pilot type badge as Persistent', async () => {
      await act(async () => {
        renderPage();
      });

      expect(screen.getByText('Persistent')).toBeInTheDocument();
    });

    it('displays Statblock badge for statblock pilots', async () => {
      mockQuery = { id: 'pilot-003' };

      await act(async () => {
        renderPage();
      });

      expect(screen.getByText('Statblock')).toBeInTheDocument();
    });
  });

  describe('Combat Skills Section', () => {
    it('displays gunnery skill value', async () => {
      await act(async () => {
        renderPage();
      });

      // Gunnery 3 should be displayed
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Gunnery')).toBeInTheDocument();
    });

    it('displays piloting skill value', async () => {
      await act(async () => {
        renderPage();
      });

      // Piloting 4 should be displayed
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('Piloting')).toBeInTheDocument();
    });

    it('displays pilot rating', async () => {
      await act(async () => {
        renderPage();
      });

      expect(screen.getByText('Pilot Rating:')).toBeInTheDocument();
    });

    it('displays skill label badges', async () => {
      await act(async () => {
        renderPage();
      });

      // Combat Skills heading should be present
      expect(screen.getByText('Combat Skills')).toBeInTheDocument();
    });
  });

  describe('Wounds Section', () => {
    it('does not display wounds card when pilot has 0 wounds', async () => {
      await act(async () => {
        renderPage();
      });

      // No wounds text should appear for active unwounded pilot
      expect(screen.queryByText(/wounds/i)).not.toBeInTheDocument();
    });

    it('displays wounds card when pilot has wounds', async () => {
      mockQuery = { id: 'pilot-002' };

      await act(async () => {
        renderPage();
      });

      expect(screen.getByText('Wounds')).toBeInTheDocument();
      expect(screen.getByText('3/6 wounds')).toBeInTheDocument();
    });

    it('displays wound skill penalty', async () => {
      mockQuery = { id: 'pilot-002' };

      await act(async () => {
        renderPage();
      });

      expect(
        screen.getByText('Skill penalty: +3 to all skill checks'),
      ).toBeInTheDocument();
    });
  });

  describe('Career Statistics Section', () => {
    it('displays career statistics for persistent pilots', async () => {
      await act(async () => {
        renderPage();
      });

      expect(screen.getByText('Career Statistics')).toBeInTheDocument();
      expect(screen.getByText('Missions')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('displays victories count', async () => {
      await act(async () => {
        renderPage();
      });

      expect(screen.getByText('Victories')).toBeInTheDocument();
      expect(screen.getByText('18')).toBeInTheDocument();
    });

    it('displays defeats count', async () => {
      await act(async () => {
        renderPage();
      });

      expect(screen.getByText('Defeats')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('displays draws count', async () => {
      await act(async () => {
        renderPage();
      });

      expect(screen.getByText('Draws')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('displays win rate', async () => {
      await act(async () => {
        renderPage();
      });

      expect(screen.getByText('Win Rate')).toBeInTheDocument();
      // 18/25 = 72%
      expect(screen.getByText('72%')).toBeInTheDocument();
    });

    it('displays total kills', async () => {
      await act(async () => {
        renderPage();
      });

      expect(screen.getByText('Total Kills')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  describe('Awards Section', () => {
    it('displays award grid for persistent pilots', async () => {
      await act(async () => {
        renderPage();
      });

      expect(screen.getByTestId('award-grid')).toBeInTheDocument();
      expect(screen.getByText('Awards for pilot-001')).toBeInTheDocument();
    });

    it('does not display award grid for statblock pilots', async () => {
      mockQuery = { id: 'pilot-003' };

      await act(async () => {
        renderPage();
      });

      expect(screen.queryByTestId('award-grid')).not.toBeInTheDocument();
    });
  });

  describe('Progression Panel', () => {
    it('displays progression panel for active persistent pilots', async () => {
      await act(async () => {
        renderPage();
      });

      expect(screen.getByTestId('pilot-progression-panel')).toBeInTheDocument();
      expect(
        screen.getByText('Progression for Sarah Kerensky'),
      ).toBeInTheDocument();
    });

    it('displays progression panel for injured persistent pilots', async () => {
      mockQuery = { id: 'pilot-002' };

      await act(async () => {
        renderPage();
      });

      expect(screen.getByTestId('pilot-progression-panel')).toBeInTheDocument();
    });

    it('shows unavailable message for statblock pilots', async () => {
      mockQuery = { id: 'pilot-003' };

      await act(async () => {
        renderPage();
      });

      expect(screen.getByText('Progression Unavailable')).toBeInTheDocument();
      expect(
        screen.getByText(/Statblock pilots do not track progression/),
      ).toBeInTheDocument();
    });

    it('shows unavailable message for retired persistent pilots', async () => {
      mockQuery = { id: 'pilot-004' };

      await act(async () => {
        renderPage();
      });

      expect(screen.getByText('Progression Unavailable')).toBeInTheDocument();
      expect(
        screen.getByText(/retired and cannot advance/),
      ).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('renders Overview and Career History tabs', async () => {
      await act(async () => {
        renderPage();
      });

      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Career History')).toBeInTheDocument();
    });

    it('defaults to overview tab', async () => {
      await act(async () => {
        renderPage();
      });

      // Overview tab should be active — identity card visible
      expect(screen.getByText('Combat Skills')).toBeInTheDocument();
    });

    it('switches to career history tab when clicked', async () => {
      await act(async () => {
        renderPage();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Career History'));
      });

      // Career tab content should appear
      expect(screen.getByTestId('timeline-filters')).toBeInTheDocument();
    });

    it('updates URL when switching tabs', async () => {
      await act(async () => {
        renderPage();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Career History'));
      });

      expect(mockReplace).toHaveBeenCalledWith(
        '/gameplay/pilots/pilot-001?tab=career',
        undefined,
        { shallow: true },
      );
    });

    it('switches back to overview tab', async () => {
      await act(async () => {
        renderPage();
      });

      // Go to career tab
      await act(async () => {
        fireEvent.click(screen.getByText('Career History'));
      });

      // Go back to overview
      await act(async () => {
        fireEvent.click(screen.getByText('Overview'));
      });

      expect(screen.getByText('Combat Skills')).toBeInTheDocument();
      expect(mockReplace).toHaveBeenLastCalledWith(
        '/gameplay/pilots/pilot-001',
        undefined,
        { shallow: true },
      );
    });
  });

  describe('Career History Tab', () => {
    it('shows empty state when no events', async () => {
      await act(async () => {
        renderPage();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Career History'));
      });

      expect(screen.getByText('No Events Yet')).toBeInTheDocument();
      expect(screen.getByText(/no recorded events/)).toBeInTheDocument();
    });

    it('shows event count', async () => {
      mockUsePilotTimeline.pagination = { total: 5, hasMore: false };

      await act(async () => {
        renderPage();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Career History'));
      });

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('events')).toBeInTheDocument();
    });

    it('shows pilot name in career header', async () => {
      await act(async () => {
        renderPage();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Career History'));
      });

      expect(
        screen.getByText('Event timeline for Sarah Kerensky'),
      ).toBeInTheDocument();
    });
  });

  describe('Header Actions', () => {
    it('renders Edit button', async () => {
      await act(async () => {
        renderPage();
      });

      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('renders Delete button', async () => {
      await act(async () => {
        renderPage();
      });

      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('opens delete confirmation modal on delete click', async () => {
      await act(async () => {
        renderPage();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Delete'));
      });

      expect(screen.getByText('Delete Pilot?')).toBeInTheDocument();
      expect(screen.getByText(/permanently delete/)).toBeInTheDocument();
    });

    it('opens edit identity modal on edit click', async () => {
      await act(async () => {
        renderPage();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Edit'));
      });

      expect(screen.getByText('Edit Pilot Identity')).toBeInTheDocument();
    });
  });

  describe('Delete Confirmation Modal', () => {
    it('shows pilot name in delete confirmation', async () => {
      await act(async () => {
        renderPage();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Delete'));
      });

      const nameInModal = screen.getAllByText('Sarah Kerensky');
      expect(nameInModal.length).toBeGreaterThanOrEqual(4);
    });

    it('closes modal on cancel', async () => {
      await act(async () => {
        renderPage();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Delete'));
      });

      expect(screen.getByText('Delete Pilot?')).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByText('Cancel'));
      });

      expect(screen.queryByText('Delete Pilot?')).not.toBeInTheDocument();
    });

    it('calls deletePilot and navigates on confirm', async () => {
      const mockDeletePilot = jest.fn().mockResolvedValue(true);
      usePilotStore.setState({
        deletePilot: mockDeletePilot,
      } as unknown as Partial<ReturnType<typeof usePilotStore.getState>>);

      await act(async () => {
        renderPage();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Delete'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Delete Pilot'));
      });

      expect(mockDeletePilot).toHaveBeenCalledWith('pilot-001');
      expect(mockPush).toHaveBeenCalledWith('/gameplay/pilots');
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Pilot deleted successfully',
          variant: 'success',
        }),
      );
    });
  });

  describe('Edit Identity Modal', () => {
    it('pre-fills form with current pilot data', async () => {
      await act(async () => {
        renderPage();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Edit'));
      });

      expect(screen.getByDisplayValue('Sarah Kerensky')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Phoenix')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Clan Wolf')).toBeInTheDocument();
    });

    it('closes modal on cancel', async () => {
      await act(async () => {
        renderPage();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Edit'));
      });

      expect(screen.getByText('Edit Pilot Identity')).toBeInTheDocument();

      // There are two Cancel buttons (delete modal has one too but it's hidden)
      // Find the visible one
      const cancelButtons = screen.getAllByText('Cancel');
      await act(async () => {
        fireEvent.click(cancelButtons[cancelButtons.length - 1]);
      });

      expect(screen.queryByText('Edit Pilot Identity')).not.toBeInTheDocument();
    });

    it('calls updatePilot on save', async () => {
      const mockUpdatePilot = jest.fn().mockResolvedValue(true);
      usePilotStore.setState({
        updatePilot: mockUpdatePilot,
      } as unknown as Partial<ReturnType<typeof usePilotStore.getState>>);

      await act(async () => {
        renderPage();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Edit'));
      });

      // Change the name
      const nameInput = screen.getByDisplayValue('Sarah Kerensky');
      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'Sarah K.' } });
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Save Changes'));
      });

      expect(mockUpdatePilot).toHaveBeenCalledWith('pilot-001', {
        name: 'Sarah K.',
        callsign: 'Phoenix',
        affiliation: 'Clan Wolf',
      });
    });
  });

  describe('Breadcrumbs', () => {
    it('renders breadcrumb trail', async () => {
      await act(async () => {
        renderPage();
      });

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Gameplay')).toBeInTheDocument();
      expect(screen.getByText('Pilots')).toBeInTheDocument();
    });
  });

  describe('Status Variants', () => {
    it('shows Injured status badge', async () => {
      mockQuery = { id: 'pilot-002' };

      await act(async () => {
        renderPage();
      });

      expect(screen.getByText('Injured')).toBeInTheDocument();
    });

    it('shows Retired status badge', async () => {
      mockQuery = { id: 'pilot-004' };

      await act(async () => {
        renderPage();
      });

      expect(screen.getByText('Retired')).toBeInTheDocument();
    });
  });
});
