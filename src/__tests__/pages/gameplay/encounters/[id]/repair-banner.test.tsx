/**
 * EncounterRepairBanner Tests
 *
 * Pin the PR3 detail-page banner contract:
 *  - Banner renders when at least one side has a missing forceId.
 *  - Banner stays hidden when neither side is broken.
 *  - "Clear missing player force" routes through the store's
 *    `clearPlayerForce(id)` action — which under the hood DELETEs
 *    /api/encounters/[id]/player-force.
 *  - "Clear missing opponent force" routes through the existing
 *    `clearOpponentForce(id)` action.
 *
 * These tests target the banner component in isolation rather than
 * the full detail page (which depends on a forces store, pilots
 * store, validation flow, quick-resolve modal, etc). The full-page
 * banner integration is covered by manual smoke + the test below
 * that wires real `useEncounterStore` calls through fetch.
 *
 * @spec openspec/changes/repair-broken-encounter-drafts/specs/game-session-management/spec.md
 *       (Requirement: Encounter Detail Page Repair Banner)
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { EncounterRepairBanner } from '@/components/gameplay/pages/EncounterDetailPage.repairBanner';
import { useEncounterStore } from '@/stores/useEncounterStore';

// =============================================================================
// Fetch Mock Setup
// =============================================================================

let fetchMock: jest.Mock;

function setupFetchMock(): void {
  fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    // The store's clearPlayerForce / clearOpponentForce both DELETE,
    // then call loadEncounters(). Stub all three with success
    // responses so the action chain completes.
    if (init?.method === 'DELETE') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as Response;
    }
    if (url === '/api/encounters' && (!init || init.method === undefined)) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ encounters: [], count: 0, rawForceIds: {} }),
      } as Response;
    }
    throw new Error(`Unmocked fetch: ${init?.method ?? 'GET'} ${url}`);
  });
  global.fetch = fetchMock as unknown as typeof fetch;
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  // Reset store between tests so prior state doesn't leak.
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
  setupFetchMock();
});

// =============================================================================
// Tests
// =============================================================================

describe('EncounterRepairBanner — render', () => {
  it('renders nothing when both missing-id props are null', () => {
    const { container } = render(
      <EncounterRepairBanner
        encounterId="enc-1"
        missingPlayerForceId={null}
        missingOpponentForceId={null}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the banner with player row only when player slot is broken', () => {
    render(
      <EncounterRepairBanner
        encounterId="enc-1"
        missingPlayerForceId="force-deleted-p"
        missingOpponentForceId={null}
      />,
    );

    expect(screen.getByTestId('encounter-repair-banner')).toBeInTheDocument();
    expect(screen.getByTestId('repair-banner-player')).toHaveTextContent(
      'force-deleted-p',
    );
    expect(
      screen.queryByTestId('repair-banner-opponent'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('clear-missing-player-force-btn'),
    ).toBeInTheDocument();
  });

  it('renders both rows when both slots are broken', () => {
    render(
      <EncounterRepairBanner
        encounterId="enc-1"
        missingPlayerForceId="force-deleted-p"
        missingOpponentForceId="force-deleted-o"
      />,
    );

    expect(screen.getByTestId('repair-banner-player')).toBeInTheDocument();
    expect(screen.getByTestId('repair-banner-opponent')).toBeInTheDocument();
    expect(
      screen.getByTestId('clear-missing-player-force-btn'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('clear-missing-opponent-force-btn'),
    ).toBeInTheDocument();
  });
});

describe('EncounterRepairBanner — clear actions wire through to store', () => {
  it('clicking "Clear missing player force" routes through DELETE /api/encounters/[id]/player-force', async () => {
    render(
      <EncounterRepairBanner
        encounterId="enc-broken"
        missingPlayerForceId="force-deleted-p"
        missingOpponentForceId={null}
      />,
    );

    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByTestId('clear-missing-player-force-btn'));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/encounters/enc-broken/player-force',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  it('clicking "Clear missing opponent force" routes through DELETE /api/encounters/[id]/opponent-force', async () => {
    render(
      <EncounterRepairBanner
        encounterId="enc-broken"
        missingPlayerForceId={null}
        missingOpponentForceId="force-deleted-o"
      />,
    );

    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByTestId('clear-missing-opponent-force-btn'));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/encounters/enc-broken/opponent-force',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  it('shows "Clearing..." label while the request is in flight', async () => {
    // Block the fetch so we can observe the in-flight UI state.
    let resolveFetch: () => void = () => {};
    fetchMock = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = () =>
            resolve({
              ok: true,
              status: 200,
              json: async () => ({ success: true }),
            } as Response);
        }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <EncounterRepairBanner
        encounterId="enc-broken"
        missingPlayerForceId="force-deleted-p"
        missingOpponentForceId={null}
      />,
    );

    const user = userEvent.setup();
    // Fire the click but don't await it — the fetch is pending so the
    // promise won't resolve until we explicitly call resolveFetch().
    // We assert on the in-flight UI state, then resolve to drain the
    // microtask queue.
    const clickPromise = user.click(
      screen.getByTestId('clear-missing-player-force-btn'),
    );

    // While the fetch is pending, the button should switch to the
    // "Clearing..." label and become disabled.
    await waitFor(() => {
      const button = screen.getByTestId('clear-missing-player-force-btn');
      expect(button).toHaveTextContent('Clearing...');
      expect(button).toBeDisabled();
    });

    // Resolve the fetch + flush the click — wrapping the resolution in
    // act keeps any post-resolution state transitions inside the act
    // boundary so React doesn't log a warning.
    await act(async () => {
      resolveFetch();
      await clickPromise;
    });
  });
});
