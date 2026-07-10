import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import type { IForce } from '@/types/force';
import type { IUnitIndexEntry } from '@/types/unit/UnitIndex';

const mockInitialize = jest.fn();
const mockGetAllUnits = jest.fn();
const mockGetCanonicalUnitIndex = jest.fn();

const force = {
  id: 'force-1',
  name: 'Alpha Lance',
  forceType: 'Lance',
  assignments: [
    {
      id: 'assignment-1',
      unitId: 'custom-1',
      pilotId: null,
      position: 'lead',
      slot: 1,
    },
  ],
} as unknown as IForce;

const forceState = {
  loadForces: jest.fn().mockResolvedValue(undefined),
  getForce: jest.fn(() => force),
  updateForce: jest.fn(),
  deleteForce: jest.fn(),
  validateForce: jest.fn().mockResolvedValue(null),
  assignPilot: jest.fn(),
  assignUnit: jest.fn(),
  clearAssignment: jest.fn(),
  swapAssignments: jest.fn(),
  isLoading: false,
  error: null,
  clearError: jest.fn(),
};

const pilotState = {
  loadPilots: jest.fn().mockResolvedValue(undefined),
  pilots: [],
};

jest.mock('next/router', () => ({
  useRouter: () => ({ query: { id: 'force-1' }, push: jest.fn() }),
}));

jest.mock('@/components/shared/Toast', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock('@/components/ui', () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <main data-testid="force-detail-page">{children}</main>
  ),
  PageError: ({ title }: { title: string }) => <div>{title}</div>,
}));

jest.mock('@/components/force', () => ({
  ForceBuilder: ({ units }: { units: Map<string, { name: string }> }) => (
    <div data-testid="assigned-unit-names">
      {Array.from(units.values())
        .map((unit) => unit.name)
        .join(',')}
    </div>
  ),
  PilotSelector: () => null,
  UnitSelector: ({ units }: { units: Array<{ name: string }> }) => (
    <div data-testid="available-unit-names">
      {units.map((unit) => unit.name).join(',')}
    </div>
  ),
}));

jest.mock(
  '@/components/gameplay/pages/forces/detail/ForceDetailPage.sections',
  () => ({
    ForceErrorBanner: () => null,
    ForceHeaderActions: () => null,
    ForceLoadingState: () => <div data-testid="force-loading-state" />,
    ForcePilotsLinkBar: () => null,
  }),
);

jest.mock(
  '@/components/gameplay/pages/forces/detail/ForceDetailPage.modals',
  () => ({
    DeleteConfirmModal: () => null,
    EditNameModal: () => null,
  }),
);

jest.mock('@/services/units/UnitSearchService', () => ({
  unitSearchService: {
    initialize: () => mockInitialize(),
    getAllUnits: () => mockGetAllUnits(),
  },
}));

jest.mock('@/services/units/CanonicalUnitService', () => ({
  getCanonicalUnitService: () => ({
    getIndex: mockGetCanonicalUnitIndex,
  }),
}));

jest.mock('@/stores/useForceStore', () => ({
  useForceSelector: (selector: (state: typeof forceState) => unknown) =>
    selector(forceState),
}));

jest.mock('@/stores/usePilotStore', () => ({
  usePilotSelector: (selector: (state: typeof pilotState) => unknown) =>
    selector(pilotState),
}));

import ForceDetailPage from '../ForceDetailPage';

const customUnit = {
  id: 'custom-1',
  name: 'Custom Catapult C-1',
  chassis: 'Custom Catapult',
  variant: 'C-1',
  tonnage: 65,
  bv: 1_200,
} as IUnitIndexEntry;

const canonicalUnit = {
  id: 'atlas-as7-d',
  name: 'Atlas AS7-D',
  chassis: 'Atlas',
  variant: 'AS7-D',
  tonnage: 100,
  bv: 1_900,
} as IUnitIndexEntry;

describe('ForceDetailPage custom-unit lookup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitialize.mockResolvedValue(undefined);
    mockGetAllUnits.mockReturnValue([customUnit]);
    mockGetCanonicalUnitIndex.mockResolvedValue([canonicalUnit]);
  });

  it('uses merged units for assigned names and the available-unit picker', async () => {
    render(<ForceDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('assigned-unit-names')).toHaveTextContent(
        'Custom Catapult C-1',
      );
    });
    expect(screen.getByTestId('available-unit-names')).toHaveTextContent(
      'Custom Catapult C-1',
    );
  });

  it('falls back to the canonical index when merged initialization rejects', async () => {
    mockInitialize.mockRejectedValue(new Error('custom-unit API unavailable'));

    render(<ForceDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('force-detail-page')).toBeInTheDocument();
    });
    expect(screen.getByTestId('assigned-unit-names')).toHaveTextContent(
      'Atlas AS7-D',
    );
    expect(screen.queryByTestId('force-loading-state')).not.toBeInTheDocument();
  });
});
