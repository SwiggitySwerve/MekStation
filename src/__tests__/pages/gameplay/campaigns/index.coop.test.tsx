/**
 * Co-op entry points on the campaign list page (`wire-coop-campaign-route`
 * Section 1).
 *
 * Pins the host-create + guest-join flows added in tasks 1.1 / 1.2:
 *   - "Create Co-op Campaign" does not mint a dead local-only room code
 *     while the live co-op transport is unavailable.
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
 * @spec openspec/specs/coop-campaign-sync/spec.md
 */

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import React from 'react';

import {
  CampaignPreset,
  PRESET_STARTING_FUNDS,
} from '@/types/campaign/CampaignPreset';

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

const mockOpenCoopRuntimeSession = jest.fn<Promise<null>, [unknown, unknown?]>(
  async () => null,
);
jest.mock('@/lib/campaign/coop/coopRuntimeSession', () => ({
  openCoopRuntimeSession: (campaign: unknown, options?: unknown) =>
    mockOpenCoopRuntimeSession(campaign, options),
}));

const mockTransportClose = jest.fn();
const mockConnectCampaignSyncTransport = jest.fn((_options: unknown) => ({
  matchId: 'match-XYZ',
  playerId: 'pid_host',
  role: 'guest',
  sendProposal: jest.fn(),
  sendDecision: jest.fn(),
  sendHostIntent: jest.fn(),
  sendParticipation: jest.fn(),
  onFrame: (handler: (message: unknown) => void) => {
    Promise.resolve().then(() => {
      handler({
        kind: 'CampaignSnapshot',
        matchId: 'match-XYZ',
        ts: '2026-06-21T00:00:00.000Z',
        event: {
          type: 'CampaignSnapshotPublished',
          sequence: -1,
          campaignId: 'campaign-host-snapshot',
          ts: '2026-06-21T00:00:00.000Z',
          authorPlayerId: 'pid_host_owner',
          payload: {
            state: {
              campaignId: 'campaign-host-snapshot',
              day: 7,
              balance: 750_000,
              rosterUnits: {
                unitA: {
                  unitId: 'unitA',
                  designation: 'Wolverine WVR-6R',
                  status: 'operational',
                },
              },
              pilots: {},
              contracts: {},
              factionStanding: {},
              salvagePool: 0,
            },
          },
        },
      });
    });
    return () => undefined;
  },
  onError: () => () => undefined,
  close: mockTransportClose,
  lastSeq: () => 0,
}));
jest.mock('@/lib/campaign/coop/campaignSyncTransport', () => {
  return {
    connectCampaignSyncTransport: (options: unknown) =>
      mockConnectCampaignSyncTransport(options),
    campaignSnapshotFromMessage: (message: {
      kind?: string;
      event?: { type?: string };
    }) =>
      message.kind === 'CampaignSnapshot' &&
      message.event?.type === 'CampaignSnapshotPublished'
        ? message.event
        : null,
  };
});

jest.mock('@/types/multiplayer/Player', () => ({
  decodeTokenFromWire: jest.fn(() => ({
    playerId: 'pid_host',
    issuedAt: '2026-06-21T00:00:00.000Z',
    expiresAt: '2026-06-21T01:00:00.000Z',
    publicKey: 'pub',
    signature: 'sig',
  })),
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
const mockUpdateCampaign = jest.fn();
const mockGetCampaign = jest.fn(() => ({
  id: 'campaign-host-1',
  name: 'Co-op Campaign',
  finances: { balance: { amount: 0 } },
  forces: new Map(),
  factionStandings: {},
}));

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
  updateCampaign: mockUpdateCampaign,
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
    mockGetCampaign.mockReset().mockReturnValue({
      id: 'campaign-host-1',
      name: 'Co-op Campaign',
      finances: { balance: { amount: 0 } },
      forces: new Map(),
      factionStandings: {},
    });
    mockUpdateCampaign.mockReset();
    mockOpenCoopRuntimeSession.mockClear();
    mockConnectCampaignSyncTransport.mockClear();
    mockTransportClose.mockClear();
    window.sessionStorage.clear();
  });

  // ===========================================================================
  // Task 1.1 — host-mode create, honest unavailable state
  // ===========================================================================

  it('Create Co-op Campaign registers a match and stamps room code plus match id onto the host campaign', async () => {
    await mountAndHydrate();

    const fetchSpy = jest.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/multiplayer/auth/token') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            token: 'wire-token',
            playerId: 'pid_host',
            displayName: 'Host Player',
          }),
        };
      }
      if (url === '/api/multiplayer/matches') {
        const body = JSON.parse(String(init?.body)) as {
          layout?: string;
          displayName?: string;
          config?: { mapRadius?: number; turnLimit?: number };
          coopCampaign?: { campaignId?: string };
        };
        expect(init?.headers).toMatchObject({
          Authorization: 'Bearer wire-token',
          'Content-Type': 'application/json',
        });
        expect(body).toMatchObject({
          layout: '1v1',
          displayName: 'Host Player',
          config: { mapRadius: 8, turnLimit: 20 },
          coopCampaign: { campaignId: 'campaign-host-1' },
        });
        return {
          ok: true,
          status: 201,
          json: async () => ({
            matchId: 'match-host-1',
            roomCode: 'ABC234',
            meta: { matchId: 'match-host-1', roomCode: 'ABC234' },
          }),
        };
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    (globalThis as { fetch: unknown }).fetch = fetchSpy;

    fireEvent.change(screen.getByTestId('create-coop-password-input'), {
      target: { value: 'vault-password' },
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('create-coop-campaign-btn'));
    });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith(
        '/gameplay/campaigns/campaign-host-1',
      );
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/multiplayer/auth/token',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/multiplayer/matches',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(mockCreateCampaign).toHaveBeenCalledWith(
      'Co-op Campaign',
      'mercenary',
      expect.objectContaining({
        startingFunds: PRESET_STARTING_FUNDS[CampaignPreset.STANDARD],
      }),
    );
    expect(mockUpdateCampaign).toHaveBeenCalledWith({
      name: 'Co-op Campaign ABC234',
      coopSession: {
        mode: 'host',
        roomCode: 'ABC234',
        matchId: 'match-host-1',
      },
    });
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

  it('Join Co-op Campaign dialog closes on Escape', async () => {
    await mountAndHydrate();

    fireEvent.click(screen.getByTestId('join-coop-campaign-btn'));
    expect(screen.getByTestId('join-coop-dialog')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByTestId('join-coop-dialog')).not.toBeInTheDocument();
    });
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

  it('Join modal authenticates, resolves the room code, hydrates a snapshot, and mints a guest mirror campaign', async () => {
    await mountAndHydrate();

    const fetchSpy = jest.fn(async (url: string) => {
      if (url === '/api/multiplayer/auth/token') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            token: 'guest-wire-token',
            playerId: 'pid_guest',
            displayName: 'Guest Player',
          }),
        };
      }
      if (url === '/api/multiplayer/invites/PQR789') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ matchId: 'match-XYZ', status: 'lobby' }),
        };
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    (globalThis as { fetch: unknown }).fetch = fetchSpy;

    fireEvent.click(screen.getByTestId('join-coop-campaign-btn'));
    fireEvent.change(screen.getByTestId('join-coop-room-code-input'), {
      target: { value: 'PQR789' },
    });
    fireEvent.change(screen.getByTestId('join-coop-password-input'), {
      target: { value: 'guest-password' },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('join-coop-submit-btn'));
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/multiplayer/auth/token',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchSpy).toHaveBeenCalledWith('/api/multiplayer/invites/PQR789');
    expect(mockConnectCampaignSyncTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        matchId: 'match-XYZ',
        role: 'guest',
        playerId: 'pid_host',
        wireToken: 'guest-wire-token',
        roomCode: 'PQR789',
      }),
    );
    expect(mockCreateGuestMirrorCampaign).toHaveBeenCalledTimes(1);
    const guestCall = mockCreateGuestMirrorCampaign.mock.calls[0] as unknown[];
    const [hostMatchId, snapshot] = guestCall;
    expect(hostMatchId).toBe('match-XYZ');
    expect(snapshot).toMatchObject({
      campaignId: 'campaign-host-snapshot',
      campaignName: 'Co-op Campaign PQR789',
      factionId: 'mercenary',
      roomCode: 'PQR789',
      authoritativeState: {
        campaignId: 'campaign-host-snapshot',
        balance: 750_000,
      },
    });

    expect(mockRouterPush).toHaveBeenCalledWith(
      '/gameplay/campaigns/campaign-guest-1',
    );
    // Host-create path MUST NOT be touched on the guest-join path.
    expect(mockCreateCampaign).not.toHaveBeenCalled();
  });

  it('Join modal surfaces a 404 from the invite endpoint without minting a guest campaign', async () => {
    await mountAndHydrate();

    const fetchSpy = jest.fn(async (url: string) => {
      if (url === '/api/multiplayer/auth/token') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            token: 'guest-wire-token',
            playerId: 'pid_guest',
            displayName: 'Guest Player',
          }),
        };
      }
      if (url === '/api/multiplayer/invites/ZZZZZZ') {
        return {
          ok: false,
          status: 404,
          json: async () => ({ error: 'not found' }),
        };
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    (globalThis as { fetch: unknown }).fetch = fetchSpy;

    fireEvent.click(screen.getByTestId('join-coop-campaign-btn'));
    fireEvent.change(screen.getByTestId('join-coop-room-code-input'), {
      target: { value: 'ZZZZZZ' },
    });
    fireEvent.change(screen.getByTestId('join-coop-password-input'), {
      target: { value: 'guest-password' },
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
