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
});
