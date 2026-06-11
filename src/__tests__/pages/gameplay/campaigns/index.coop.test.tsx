/**
 * Co-op entry points on the campaign list page (`wire-coop-campaign-route`
 * Section 1).
 *
 * Pins the host-create + guest-join flows added in tasks 1.1 / 1.2:
 *   - "Create Co-op Campaign" mints a host-mode campaign with a fresh
 *     6-char room code stamped on `coopSession` and navigates to the
 *     dashboard.
 *   - "Join Co-op Campaign" opens the room-code modal; submitting a
 *     valid code resolves it via `/api/multiplayer/invites/:roomCode`
 *     and mints a guest mirror campaign with `coopSession.mode = 'guest'`
 *     and the host's matchId.
 *   - "New Campaign" (single-player) navigates to /gameplay/campaigns/create
 *     without touching `coopSession` — single-player path is preserved.
 *
 * Lives under `src/__tests__/pages/` (not `src/pages/__tests__/`) so the
 * Next.js TypeScript route validator doesn't treat the spec as a broken
 * route.
 *
 * @spec openspec/changes/wire-coop-campaign-route/specs/coop-campaign-sync/spec.md
 */

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import React from 'react';

// =============================================================================
// Mocks — router, room code generator, persistence storage
// =============================================================================

const mockRouterPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    query: {},
    pathname: '/gameplay/campaigns',
  }),
}));

// Deterministic room code so the test can assert what `coopSession.roomCode`
// gets stamped with. `generateRoomCode` is otherwise a real call into
// `crypto.getRandomValues` — fine in unit tests but unstable for assertion.
jest.mock('@/lib/p2p/roomCodes', () => {
  const actual = jest.requireActual('@/lib/p2p/roomCodes');
  return {
    ...actual,
    generateRoomCode: jest.fn(() => 'ABC234'),
  };
});

// Stub roster store — list page reads `pilots.length` for the card; we never
// render a card in any test here (no campaign), so the stub is minimal.
jest.mock('@/stores/campaign/useCampaignRosterStore', () => ({
  useCampaignRosterStore: Object.assign(
    (selector: (s: unknown) => unknown) => selector({ pilots: [] }),
    {
      getState: () => ({ pilots: [] }),
    },
  ),
}));

// Mock the campaign store directly so the test never touches the
// production persistence layer (clientSafeStorage / localStorage).
const mockCreateCampaign = jest.fn(() => 'campaign-host-1');
const mockCreateGuestMirrorCampaign = jest.fn(() => 'campaign-guest-1');
const mockGetCampaign = jest.fn(() => null);

// The page subscribes reactively via zustand's `useStore(store, selector)`
// (e2e triage RC4 production fix), so the mocked handle must satisfy the
// full `StoreApi` contract zustand v5 feeds to `useSyncExternalStore`:
// `subscribe` + `getState` + `getInitialState` — not just `getState`.
// One stable state object keeps snapshot identity stable across renders,
// mirroring a real vanilla store.
const mockCampaignStoreState = {
  campaign: null,
  getCampaign: mockGetCampaign,
  createCampaign: mockCreateCampaign,
  createGuestMirrorCampaign: mockCreateGuestMirrorCampaign,
};
const mockCampaignStoreApi = {
  getState: () => mockCampaignStoreState,
  getInitialState: () => mockCampaignStoreState,
  subscribe: () => () => undefined,
};

jest.mock('@/stores/campaign/useCampaignStore', () => ({
  useCampaignStore: () => mockCampaignStoreApi,
}));

// Import the page AFTER the mocks so they take effect.
import CampaignsListPage from '@/pages/gameplay/campaigns/index';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Mount the page and flip past the SSR-hydration loading state. The page
 * sets `isClient = true` in an effect, so we need an `act` flush before
 * the real header content appears.
 */
async function mountAndHydrate(): Promise<void> {
  await act(async () => {
    render(<CampaignsListPage />);
  });
  await waitFor(() => {
    expect(screen.getByTestId('create-coop-campaign-btn')).toBeInTheDocument();
  });
}

// =============================================================================
// Tests
// =============================================================================

describe('CampaignsListPage — co-op entry points', () => {
  beforeEach(() => {
    mockRouterPush.mockReset();
    mockCreateCampaign.mockReset().mockReturnValue('campaign-host-1');
    mockCreateGuestMirrorCampaign
      .mockReset()
      .mockReturnValue('campaign-guest-1');
    mockGetCampaign.mockReset().mockReturnValue(null);
  });

  // ===========================================================================
  // Task 1.1 — host-mode create
  // ===========================================================================

  it('Create Co-op Campaign mints a host-mode campaign and routes to its dashboard', async () => {
    await mountAndHydrate();

    fireEvent.click(screen.getByTestId('create-coop-campaign-btn'));

    expect(mockCreateCampaign).toHaveBeenCalledTimes(1);
    const call = mockCreateCampaign.mock.calls[0] as unknown[];
    const [name, factionId, options, coopOpts] = call;
    expect(name).toBe('Co-op Campaign ABC234');
    expect(factionId).toBe('mercenary');
    expect(options).toBeUndefined();
    expect(coopOpts).toEqual({
      coopSession: { mode: 'host', roomCode: 'ABC234' },
    });

    expect(mockRouterPush).toHaveBeenCalledWith(
      '/gameplay/campaigns/campaign-host-1',
    );
    // Guest mirror MUST NOT be touched on the host-create path.
    expect(mockCreateGuestMirrorCampaign).not.toHaveBeenCalled();
  });

  // ===========================================================================
  // Task 1.2 — guest-side room-code join flow
  // ===========================================================================

  it('Join Co-op Campaign opens a room-code modal', async () => {
    await mountAndHydrate();
    expect(screen.queryByTestId('join-coop-dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('join-coop-campaign-btn'));

    expect(screen.getByTestId('join-coop-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('join-coop-room-code-input')).toBeInTheDocument();
    expect(screen.getByTestId('join-coop-submit-btn')).toBeInTheDocument();
  });

  it('Join modal rejects a malformed room code without calling the invite endpoint', async () => {
    await mountAndHydrate();
    const fetchSpy = jest.fn();
    (globalThis as { fetch: unknown }).fetch = fetchSpy;

    fireEvent.click(screen.getByTestId('join-coop-campaign-btn'));
    fireEvent.change(screen.getByTestId('join-coop-room-code-input'), {
      target: { value: 'xx' }, // too short
    });
    fireEvent.click(screen.getByTestId('join-coop-submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('join-coop-error')).toBeInTheDocument();
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockCreateGuestMirrorCampaign).not.toHaveBeenCalled();
  });

  it('Join modal resolves the room code via /api/multiplayer/invites and mints a guest mirror campaign', async () => {
    await mountAndHydrate();

    const fetchSpy = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ matchId: 'match-XYZ', status: 'lobby' }),
    });
    (globalThis as { fetch: unknown }).fetch = fetchSpy;

    fireEvent.click(screen.getByTestId('join-coop-campaign-btn'));
    fireEvent.change(screen.getByTestId('join-coop-room-code-input'), {
      target: { value: 'PQR789' },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('join-coop-submit-btn'));
    });

    expect(fetchSpy).toHaveBeenCalledWith('/api/multiplayer/invites/PQR789');
    expect(mockCreateGuestMirrorCampaign).toHaveBeenCalledTimes(1);
    const guestCall = mockCreateGuestMirrorCampaign.mock.calls[0] as unknown[];
    const [hostMatchId, snapshot] = guestCall;
    expect(hostMatchId).toBe('match-XYZ');
    expect(snapshot).toMatchObject({
      campaignName: 'Co-op Campaign PQR789',
      factionId: 'mercenary',
      roomCode: 'PQR789',
    });

    expect(mockRouterPush).toHaveBeenCalledWith(
      '/gameplay/campaigns/campaign-guest-1',
    );
    // Host-create path MUST NOT be touched on the guest-join path.
    expect(mockCreateCampaign).not.toHaveBeenCalled();
  });

  it('Join modal surfaces a 404 from the invite endpoint without minting a guest campaign', async () => {
    await mountAndHydrate();

    const fetchSpy = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'not found' }),
    });
    (globalThis as { fetch: unknown }).fetch = fetchSpy;

    fireEvent.click(screen.getByTestId('join-coop-campaign-btn'));
    fireEvent.change(screen.getByTestId('join-coop-room-code-input'), {
      target: { value: 'ZZZZZZ' },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('join-coop-submit-btn'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('join-coop-error')).toBeInTheDocument();
    });
    expect(mockCreateGuestMirrorCampaign).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  // ===========================================================================
  // Task 1.5 — single-player path is untouched
  // ===========================================================================

  it('New Campaign button navigates to /gameplay/campaigns/create without stamping coopSession', async () => {
    await mountAndHydrate();

    fireEvent.click(screen.getByTestId('create-campaign-btn'));

    expect(mockRouterPush).toHaveBeenCalledWith('/gameplay/campaigns/create');
    expect(mockCreateCampaign).not.toHaveBeenCalled();
    expect(mockCreateGuestMirrorCampaign).not.toHaveBeenCalled();
  });
});
