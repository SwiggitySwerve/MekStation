/**
 * Encounter List Page Tests
 *
 * Pin the PR3 UI surfaces from `repair-broken-encounter-drafts`:
 *  - Yellow "Player force missing" / "Opponent force missing" pills
 *    render when the row's stored forceId no longer resolves (ie. the
 *    rawForceIds map says a forceId was stored but `playerForce` /
 *    `opponentForce` came back null at hydration).
 *  - Empty-state shows BOTH "Create First Encounter" AND "Seed sample
 *    encounters" buttons when no filter is active. Filtered empty
 *    states (search query / status filter) hide the seed button so
 *    the user doesn't accidentally double-seed when narrowing.
 *  - Click on the seed button POSTs to /api/encounters/seed-samples,
 *    then re-renders with the new encounter cards.
 *
 * Tests live under src/__tests__/pages/gameplay/encounters/ rather
 * than co-located under src/pages/ so Next.js's TypeScript route
 * validator doesn't treat them as broken API routes.
 *
 * @spec openspec/changes/repair-broken-encounter-drafts/specs/game-session-management/spec.md
 *       (Requirement: Encounter List Surfaces Broken-Reference State,
 *        Requirement: Empty-State Seed Samples)
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import {
  EncounterStatus,
  ScenarioTemplateType,
  TerrainPreset,
  VictoryConditionType,
  type IEncounter,
} from '@/types/encounter';

// =============================================================================
// Mocks
// =============================================================================

// Stub `useRouter` so the page renders without a Next.js router stack.
const mockRouterPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    query: {},
    pathname: '/gameplay/encounters',
  }),
}));

// =============================================================================
// Test Data
// =============================================================================

function makeEncounter(overrides: Partial<IEncounter> = {}): IEncounter {
  return {
    id: 'enc-1',
    name: 'Test Encounter',
    status: EncounterStatus.Draft,
    template: ScenarioTemplateType.Custom,
    playerForce: undefined,
    opponentForce: undefined,
    opForConfig: undefined,
    mapConfig: {
      radius: 6,
      terrain: TerrainPreset.Clear,
      playerDeploymentZone: 'south',
      opponentDeploymentZone: 'north',
    },
    victoryConditions: [{ type: VictoryConditionType.DestroyAll }],
    optionalRules: [],
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}

// =============================================================================
// Fetch Mock
// =============================================================================

interface ListPayload {
  encounters: IEncounter[];
  count: number;
  rawForceIds: Record<
    string,
    { playerForceId: string | null; opponentForceId: string | null }
  >;
}

function setupFetchMock(initialPayload: ListPayload): {
  fetchMock: jest.Mock;
  setNextPayload: (next: ListPayload) => void;
} {
  let currentPayload: ListPayload = initialPayload;
  // Each fetch resolves with whatever currentPayload is at call time.
  // setNextPayload mutates the shared reference so the next fetch
  // (typically the post-seed refresh) sees the updated list.
  const fetchMock = jest.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/encounters' && (!init || init.method === undefined)) {
        return {
          ok: true,
          status: 200,
          json: async () => currentPayload,
        } as Response;
      }
      if (url === '/api/encounters/seed-samples' && init?.method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            ids: ['enc-d', 'enc-s', 'enc-b', 'enc-c'],
          }),
        } as Response;
      }
      throw new Error(`Unmocked fetch: ${init?.method ?? 'GET'} ${url}`);
    },
  );
  global.fetch = fetchMock as unknown as typeof fetch;

  return {
    fetchMock,
    setNextPayload: (next) => {
      currentPayload = next;
    },
  };
}

// =============================================================================
// Imports (after mocks)
// =============================================================================

import EncountersListPage from '@/pages/gameplay/encounters/index';
import { useEncounterStore } from '@/stores/useEncounterStore';

// =============================================================================
// Render helper — flushes the mount-effect before returning.
// =============================================================================

async function renderPage(): Promise<ReturnType<typeof render>> {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(<EncountersListPage />);
  });
  return result!;
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  // Reset Zustand store between tests so cached encounters / filters
  // from one test don't bleed into the next.
  useEncounterStore.setState({
    encounters: [],
    rawForceIds: {},
    selectedEncounterId: null,
    isLoading: false,
    error: null,
    statusFilter: 'all',
    searchQuery: '',
    validations: new Map(),
  });
});

// =============================================================================
// Tests
// =============================================================================

describe('EncountersListPage — broken pills', () => {
  it('renders yellow "Player force missing" pill when rawForceIds says a forceId was stored but hydration came back null', async () => {
    setupFetchMock({
      encounters: [
        makeEncounter({
          id: 'enc-broken-player',
          name: 'Broken Player Encounter',
          // Hydration boundary set this to null because the resolver
          // returned null for the stored forceId.
          playerForce: null,
        }),
      ],
      count: 1,
      rawForceIds: {
        'enc-broken-player': {
          playerForceId: 'force-deleted-123',
          opponentForceId: null,
        },
      },
    });

    await renderPage();

    await waitFor(() => {
      expect(
        screen.getByTestId('encounter-card-enc-broken-player'),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByTestId('encounter-card-player-missing'),
    ).toHaveTextContent('Player force missing');
    // The encounter has no opponent force at all, so we should NOT
    // render an opponent-missing pill — that's the empty case.
    expect(
      screen.queryByTestId('encounter-card-opponent-missing'),
    ).not.toBeInTheDocument();
  });

  it('renders yellow "Opponent force missing" pill on the opponent side', async () => {
    setupFetchMock({
      encounters: [
        makeEncounter({
          id: 'enc-broken-opponent',
          opponentForce: null,
        }),
      ],
      count: 1,
      rawForceIds: {
        'enc-broken-opponent': {
          playerForceId: null,
          opponentForceId: 'force-deleted-456',
        },
      },
    });

    await renderPage();

    await waitFor(() => {
      expect(
        screen.getByTestId('encounter-card-enc-broken-opponent'),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByTestId('encounter-card-opponent-missing'),
    ).toHaveTextContent('Opponent force missing');
  });

  it('does NOT render the missing pill when the slot is empty (never set)', async () => {
    setupFetchMock({
      encounters: [
        makeEncounter({
          id: 'enc-empty',
          playerForce: undefined,
          opponentForce: undefined,
        }),
      ],
      count: 1,
      rawForceIds: {
        'enc-empty': { playerForceId: null, opponentForceId: null },
      },
    });

    await renderPage();

    await waitFor(() => {
      expect(
        screen.getByTestId('encounter-card-enc-empty'),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByTestId('encounter-card-player-missing'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('encounter-card-opponent-missing'),
    ).not.toBeInTheDocument();
    // The "No Player Force" silent-empty pill should still render in
    // place of the missing-pill — the predicate is broken-not-empty.
    expect(screen.getByText('No Player Force')).toBeInTheDocument();
    expect(screen.getByText('No Opponent')).toBeInTheDocument();
  });
});

describe('EncountersListPage — empty-state seed button', () => {
  it('shows the seed button when filteredEncounters is empty AND no filter is active', async () => {
    setupFetchMock({ encounters: [], count: 0, rawForceIds: {} });
    await renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('encounters-empty-state')).toBeInTheDocument();
    });
    expect(screen.getByTestId('seed-samples-btn')).toBeInTheDocument();
    expect(screen.getByText('Create First Encounter')).toBeInTheDocument();
  });

  it('hides the seed button when a search query produces an empty result', async () => {
    setupFetchMock({
      encounters: [makeEncounter({ id: 'enc-1', name: 'Some Encounter' })],
      count: 1,
      rawForceIds: { 'enc-1': { playerForceId: null, opponentForceId: null } },
    });
    await renderPage();

    // Apply a search query that won't match anything.
    await act(async () => {
      useEncounterStore.setState({ searchQuery: 'xyzNoMatch' });
    });

    await waitFor(() => {
      expect(screen.getByTestId('encounters-empty-state')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('seed-samples-btn')).not.toBeInTheDocument();
  });

  it('hides the seed button when a status filter produces an empty result', async () => {
    setupFetchMock({ encounters: [], count: 0, rawForceIds: {} });
    await renderPage();
    await act(async () => {
      useEncounterStore.setState({ statusFilter: EncounterStatus.Ready });
    });

    await waitFor(() => {
      expect(screen.getByTestId('encounters-empty-state')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('seed-samples-btn')).not.toBeInTheDocument();
  });

  it('clicking the seed button POSTs to /api/encounters/seed-samples and refreshes the list', async () => {
    const { fetchMock, setNextPayload } = setupFetchMock({
      encounters: [],
      count: 0,
      rawForceIds: {},
    });
    await renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('seed-samples-btn')).toBeInTheDocument();
    });

    // Prime the post-seed refresh response — once seed succeeds the
    // store calls loadEncounters() again, which fetches /api/encounters
    // and should now see 4 cards.
    setNextPayload({
      encounters: [
        makeEncounter({ id: 'enc-d', name: 'Sample Duel - 2026-05-08' }),
        makeEncounter({ id: 'enc-s', name: 'Sample Skirmish - 2026-05-08' }),
        makeEncounter({ id: 'enc-b', name: 'Sample Battle - 2026-05-08' }),
        makeEncounter({ id: 'enc-c', name: 'Sample Custom - 2026-05-08' }),
      ],
      count: 4,
      rawForceIds: {},
    });

    const user = userEvent.setup();
    await user.click(screen.getByTestId('seed-samples-btn'));

    // The POST should fire with method:POST, then a follow-up GET.
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/encounters/seed-samples',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    // After refresh, all 4 cards should be on screen.
    await waitFor(() => {
      expect(screen.getByTestId('encounter-card-enc-d')).toBeInTheDocument();
      expect(screen.getByTestId('encounter-card-enc-s')).toBeInTheDocument();
      expect(screen.getByTestId('encounter-card-enc-b')).toBeInTheDocument();
      expect(screen.getByTestId('encounter-card-enc-c')).toBeInTheDocument();
    });
  });
});
