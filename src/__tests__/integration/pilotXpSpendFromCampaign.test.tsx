/**
 * Pilot XP Spend From Campaign — integration tests.
 *
 * Renders the campaign personnel page with seeded `useCampaignRosterStore`
 * + `usePilotStore` + `useCampaignStore`, then exercises the side-panel
 * flows end-to-end against a mocked fetch. Assertions target the rendered
 * DOM (per the spec: "the rendered DOM in the Progression tab SHALL
 * display the new gunnery value… NOT just the store state").
 *
 * Mocks fetch with a route-aware handler so each click triggers the same
 * POST + refresh-GET pair the production code does in the browser.
 *
 * @spec openspec/changes/add-pilot-xp-spend-from-campaign/specs/campaign-ui/spec.md
 */

import '@testing-library/jest-dom';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from '@testing-library/react';
import React from 'react';

import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { ForcePosition, ForceStatus, ForceType } from '@/types/force';
import { PilotStatus, PilotType, type IPilot } from '@/types/pilot';

// =============================================================================
// next/router mock — page reads `id` from useRouter().query.id
// =============================================================================

jest.mock('next/router', () => ({
  useRouter: () => ({
    query: { id: 'campaign-test-1' },
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

// next/link — simple anchor passthrough.
jest.mock(
  'next/link',
  () =>
    function MockLink(props: { href: string; children: React.ReactNode }) {
      return <a href={props.href}>{props.children}</a>;
    },
);

// CampaignNavigation pulls in additional store wiring not relevant here.
jest.mock('@/components/campaign/CampaignNavigation', () => ({
  CampaignNavigation: () => <nav data-testid="campaign-nav-stub" />,
}));

// PilotProgressionPanel mounts PilotAbilitiesPanel inline, which calls
// useToast — provide a no-op stub so we don't need a ToastProvider tree.
jest.mock('@/components/shared/Toast', () => {
  const actual = jest.requireActual('@/components/shared/Toast');
  return {
    ...actual,
    useToast: () => ({ showToast: jest.fn() }),
  };
});

// useCampaignStore is a singleton-factory wrapper around a vanilla
// Zustand store with persist middleware that demands a fully-realized
// ICampaign (Date objects, Money, nested Maps, etc.). The page only
// reads `getState().getCampaign()` for breadcrumbs + the not-found
// guard, so a minimal stub is sufficient for this integration test.
const mockCampaign = { id: 'campaign-test-1', name: 'Test Campaign' };
jest.mock('@/stores/campaign/useCampaignStore', () => ({
  useCampaignStore: () => ({
    getState: () => ({
      campaign: mockCampaign,
      getCampaign: () => mockCampaign,
    }),
    subscribe: () => () => {},
  }),
}));

// =============================================================================
// Imports after mocks so the components bind the mocked surfaces.
// =============================================================================

import PersonnelPage from '@/pages/gameplay/campaigns/[id]/personnel';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { useForceStore } from '@/stores/useForceStore';
import { usePilotStore } from '@/stores/usePilotStore';

// =============================================================================
// Fixture helpers
// =============================================================================

function makeVaultPilot(overrides?: Partial<IPilot>): IPilot {
  const now = new Date().toISOString();
  return {
    id: 'pilot-vault-1',
    name: 'Phoenix Hawk Pilot',
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery: 4, piloting: 5 },
    wounds: 0,
    abilities: [],
    career: {
      missionsCompleted: 0,
      victories: 0,
      defeats: 0,
      draws: 0,
      totalKills: 0,
      killRecords: [],
      missionHistory: [],
      // 250 XP affords a gunnery 4 → 3 upgrade (cost 200 per
      // GUNNERY_IMPROVEMENT_COSTS) and leaves 50 XP after.
      xp: 250,
      totalXpEarned: 250,
      rank: 'MechWarrior',
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// =============================================================================
// Fetch mock — route-aware handler
// =============================================================================

interface FetchHandlerArgs {
  url: string;
  method: string;
  body?: string;
}

let fetchHandler: (args: FetchHandlerArgs) => unknown = () => ({});

beforeAll(() => {
  global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = (init?.method ?? 'GET').toUpperCase();
    const body = typeof init?.body === 'string' ? init.body : undefined;
    const result = fetchHandler({ url, method, body });
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(result),
    } as Response);
  }) as typeof fetch;
});

// =============================================================================
// Per-test reset
// =============================================================================

beforeEach(() => {
  // Reset Zustand state on each store directly (works for both vanilla
  // and persisted stores in jsdom).
  usePilotStore.setState({
    pilots: [makeVaultPilot()],
    selectedPilotId: null,
    isLoading: false,
    error: null,
  });

  useCampaignRosterStore.setState({
    campaignId: 'campaign-test-1',
    units: [],
    pilots: [
      {
        pilotId: 'pilot-vault-1',
        pilotName: 'Phoenix Hawk Pilot',
        status: CampaignPilotStatus.Active,
        wounds: 0,
        xp: 250,
        campaignXpEarned: 0,
        campaignKills: 0,
        campaignMissions: 0,
        recoveryTime: 0,
        // Hard-cutover policy (PR2 cluster J): hireDate required.
        hireDate: new Date('2025-01-01T00:00:00Z'),
        primaryRole: CampaignPersonnelRole.PILOT,
        rankIndex: 0,
      },
    ],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  });

  useForceStore.setState({
    forces: [],
    selectedForceId: null,
    isLoading: false,
    error: null,
    searchQuery: '',
    validations: new Map(),
  });

  // Default fetch handler — returns the seeded vault pilot. Tests that
  // need a different post-improve refresh override this.
  fetchHandler = ({ url }) => {
    if (url === '/api/pilots') return { pilots: [makeVaultPilot()] };
    if (url === '/api/forces') return { forces: [] };
    return { success: true };
  };
});

// =============================================================================
// Tests
// =============================================================================

describe('Pilot XP spend from campaign — integration', () => {
  it('renders the seeded campaign roster from useCampaignRosterStore', () => {
    render(<PersonnelPage />);

    expect(screen.getByTestId('pilot-row-pilot-vault-1')).toBeInTheDocument();
    expect(screen.getByText('Phoenix Hawk Pilot')).toBeInTheDocument();
    // Side panel does not render until interaction.
    expect(
      screen.queryByTestId('personnel-side-panel'),
    ).not.toBeInTheDocument();
  });

  it('opens the side panel on row click and mounts Progression for the vault-joined pilot', () => {
    render(<PersonnelPage />);

    fireEvent.click(screen.getByTestId('pilot-row-pilot-vault-1'));

    expect(screen.getByTestId('personnel-side-panel')).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Progression' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Abilities' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Assignment' })).toBeInTheDocument();
    // The Progression tab body shows the vault pilot's available XP.
    expect(screen.getByText('250')).toBeInTheDocument();
  });

  it('Improve Gunnery: rendered DOM updates after the API + refresh succeed', async () => {
    // Sequence the fetch handler to return success on improve-gunnery, then
    // a refreshed pilots list with gunnery 3 + 50 XP.
    fetchHandler = ({ url, method }) => {
      if (
        url === '/api/pilots/pilot-vault-1/improve-gunnery' &&
        method === 'POST'
      ) {
        return { success: true };
      }
      if (url === '/api/pilots' && method === 'GET') {
        return {
          pilots: [
            makeVaultPilot({
              skills: { gunnery: 3, piloting: 5 },
              career: {
                missionsCompleted: 0,
                victories: 0,
                defeats: 0,
                draws: 0,
                totalKills: 0,
                killRecords: [],
                missionHistory: [],
                xp: 50,
                totalXpEarned: 250,
                rank: 'MechWarrior',
              },
            }),
          ],
        };
      }
      return { success: true };
    };

    render(<PersonnelPage />);

    // Open the side panel.
    fireEvent.click(screen.getByTestId('pilot-row-pilot-vault-1'));

    // Pre-condition: gunnery 4 visible. The `4/5` badge is the most
    // surgical anchor since the bare "4" appears in multiple places.
    expect(screen.getByText('4/5')).toBeInTheDocument();
    expect(screen.getByText('250')).toBeInTheDocument();

    // Click the Gunnery row's Upgrade button. Multiple "Upgrade" buttons
    // exist (Gunnery + Piloting); the first is Gunnery.
    const upgradeButtons = screen.getAllByRole('button', { name: /Upgrade/i });
    expect(upgradeButtons.length).toBeGreaterThanOrEqual(1);
    await act(async () => {
      fireEvent.click(upgradeButtons[0]);
    });

    // After the POST + loadPilots refresh, the Progression tab's badge
    // updates to the new gunnery (3) and the XP card shows 50.
    await waitFor(() => {
      expect(screen.getByText('3/5')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
    });
  });

  it('Assignment tab: opens the no-Force empty state when no forces exist', async () => {
    // Default fetchHandler returns empty forces.
    render(<PersonnelPage />);

    fireEvent.click(screen.getByTestId('pilot-row-pilot-vault-1'));
    fireEvent.click(screen.getByRole('tab', { name: 'Assignment' }));

    await waitFor(() => {
      expect(
        screen.getByText('No active force in this campaign.'),
      ).toBeInTheDocument();
    });
    const cta = screen.getByRole('link', { name: /Create one in Forces/i });
    expect(cta).toHaveAttribute(
      'href',
      '/gameplay/campaigns/campaign-test-1/forces',
    );
  });

  it('Assignment tab: rendered DOM shows new assignment after assignPilot succeeds', async () => {
    // Seed forces with one empty slot already populated with a unit, so
    // the player can assign their pilot to it.
    const initialForce = {
      id: 'force-1',
      name: 'Alpha Lance',
      forceType: ForceType.Lance,
      status: ForceStatus.Active,
      childIds: [],
      assignments: [
        {
          id: 'assign-1',
          pilotId: null,
          unitId: 'unit-atlas',
          position: ForcePosition.Lead,
          slot: 1,
        },
      ],
      stats: {
        totalBV: 0,
        totalTonnage: 0,
        assignedPilots: 0,
        assignedUnits: 0,
        emptySlots: 1,
        averageSkill: null,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const refreshedForce = {
      ...initialForce,
      assignments: [
        { ...initialForce.assignments[0], pilotId: 'pilot-vault-1' },
      ],
    };
    useForceStore.setState({
      forces: [initialForce],
      selectedForceId: null,
      isLoading: false,
      error: null,
      searchQuery: '',
      validations: new Map(),
    });

    // Sequence: PUT /api/forces/assignments/assign-1/pilot → success,
    // then GET /api/forces returns the refreshed force.
    fetchHandler = ({ url, method }) => {
      if (
        url === '/api/forces/assignments/assign-1/pilot' &&
        method === 'PUT'
      ) {
        return { success: true };
      }
      if (url === '/api/forces' && method === 'GET') {
        return { forces: [refreshedForce] };
      }
      if (url === '/api/pilots' && method === 'GET') {
        return { pilots: [makeVaultPilot()] };
      }
      return { success: true };
    };

    render(<PersonnelPage />);

    fireEvent.click(screen.getByTestId('pilot-row-pilot-vault-1'));
    fireEvent.click(screen.getByRole('tab', { name: 'Assignment' }));

    // Pre-condition: the empty slot is listed.
    expect(screen.getByTestId('assign-button-assign-1')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId('assign-button-assign-1'));
    });

    // After the PUT + loadForces refresh, the panel re-renders with
    // "Currently assigned" + the unit label.
    await waitFor(() => {
      expect(screen.getByTestId('current-assignment-unit')).toHaveTextContent(
        'Alpha Lance · unit-atlas (lead #1)',
      );
    });
  });
});
