import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import React from 'react';

import type {
  ICampaignSyncTransport,
  ICampaignSyncWebSocket,
  IConnectCampaignSyncOptions,
} from '@/lib/campaign/coop/campaignSyncTransport';

import {
  _resetCampaignSyncTransportsForTest,
  connectCampaignSyncTransport,
  getActiveCampaignSyncTransport,
} from '@/lib/campaign/coop/campaignSyncTransport';
import { useCampaignMirrorStore } from '@/lib/p2p/campaignMirrorStore';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import { CampaignCoopEntryPanel } from '../CampaignCoopEntryPanel';

const mockRouterPush = jest.fn();
const mockFetch = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

jest.mock('@/components/ui', () => ({
  Button: ({
    children,
    variant: _variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button {...props}>{children}</button>
  ),
}));

const mockCreateCampaign = jest.fn(() => 'campaign-host');
const mockGetCampaign = jest.fn<unknown, []>(() => null);
const mockUpdateCampaign = jest.fn();
const mockCreateGuestMirrorCampaign = jest.fn(() => 'guest-campaign-1');

jest.mock('@/stores/campaign/useCampaignStore', () => ({
  useCampaignStore: () => ({
    getState: () => ({
      createCampaign: mockCreateCampaign,
      getCampaign: mockGetCampaign,
      updateCampaign: mockUpdateCampaign,
      createGuestMirrorCampaign: mockCreateGuestMirrorCampaign,
    }),
  }),
}));

const mockSaveCampaign = jest.fn(async () => ({
  status: 'saved' as const,
  record: {} as never,
  retriedConflict: false,
}));

jest.mock('@/stores/campaign/useCampaignPersistenceStore', () => ({
  useCampaignPersistenceStore: {
    getState: () => ({ saveCampaign: mockSaveCampaign }),
  },
}));

jest.mock('@/lib/campaign/coop/campaignAuthoritativeState', () => ({
  buildCampaignAuthoritativeState: jest.fn(() => ({})),
}));

jest.mock('@/stores/campaign/useCampaignRosterStore', () => ({
  useCampaignRosterStore: {
    getState: () => ({ units: [] }),
  },
}));

interface IEntrySocket extends ICampaignSyncWebSocket {
  inject(message: unknown): void;
}
const mockEntrySockets: IEntrySocket[] = [];
function mockEntrySocket(): IEntrySocket {
  const socket: IEntrySocket = {
    readyState: 1,
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    send: () => undefined,
    close() {
      socket.readyState = 3;
      socket.onclose?.({});
    },
    inject(message: unknown) {
      socket.onmessage?.({ data: JSON.stringify(message) });
    },
  };
  mockEntrySockets.push(socket);
  return socket;
}

// The real transport, registry and seat follower over in-file sockets: only
// the direct guest creator is wrapped, to record its options.
const mockConnectGuest = jest.fn();
jest.mock('@/lib/campaign/coop/campaignSyncTransport', () => {
  const actual = jest.requireActual(
    '@/lib/campaign/coop/campaignSyncTransport',
  );
  return {
    ...actual,
    connectCampaignSyncTransport: (options: IConnectCampaignSyncOptions) => {
      mockConnectGuest(options);
      return actual.connectCampaignSyncTransport({
        ...options,
        socketFactory: options.socketFactory ?? (() => mockEntrySocket()),
      });
    },
  };
});

// A live token: the shared mint adapter refuses expired or disagreeing tokens.
const mockLiveToken = {
  playerId: 'pid_host',
  issuedAt: new Date(Date.now() - 1_000).toISOString(),
  expiresAt: new Date(Date.now() + 50 * 60_000).toISOString(),
  publicKey: 'public-key',
  signature: 'signature',
};
function mintBody(displayName: string) {
  return {
    token: 'wire-token',
    playerId: mockLiveToken.playerId,
    displayName,
    expiresAt: mockLiveToken.expiresAt,
  };
}

jest.mock('@/types/multiplayer/Player', () => ({
  ...jest.requireActual('@/types/multiplayer/Player'),
  decodeTokenFromWire: jest.fn(() => mockLiveToken),
}));

describe('CampaignCoopEntryPanel onboarding affordances', () => {
  beforeEach(() => {
    mockRouterPush.mockReset();
    mockFetch.mockReset();
    mockCreateCampaign.mockClear();
    mockGetCampaign.mockReset().mockReturnValue(null);
    mockUpdateCampaign.mockClear();
    mockSaveCampaign.mockClear().mockResolvedValue({
      status: 'saved' as const,
      record: {} as never,
      retriedConflict: false,
    });
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  it('opens the mounted operator controls without changing initial create/join requests', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        seats: [
          {
            seatId: 'local-seat-1',
            status: 'unprovisioned',
            generation: 0,
            label: null,
            playerId: null,
            lockedUntil: null,
          },
          {
            seatId: 'local-seat-2',
            status: 'unprovisioned',
            generation: 0,
            label: null,
            playerId: null,
            lockedUntil: null,
          },
        ],
      }),
    });
    render(<CampaignCoopEntryPanel />);
    expect(mockFetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Manage local seats' }));
    expect(
      await screen.findByRole('group', { name: 'Local seat credentials' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/multiplayer/auth/local-seats',
      {
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin',
      },
    );
  });

  it('discloses the one-click co-op defaults near the create control', () => {
    render(<CampaignCoopEntryPanel />);

    expect(screen.getByTestId('create-coop-campaign-btn')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Mercenary faction, Standard preset, and an empty roster/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/campaign dashboard after creation/i),
    ).toBeInTheDocument();
  });

  it('links to vault settings after a create token-mint failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      headers: { get: () => null },
      json: async () => ({ error: 'Vault identity is unavailable' }),
    } as unknown as Response);

    render(<CampaignCoopEntryPanel />);
    fireEvent.change(screen.getByTestId('create-coop-password-input'), {
      target: { value: 'vault-password' },
    });
    fireEvent.click(screen.getByTestId('create-coop-campaign-btn'));

    const errorNotice = await screen.findByTestId('create-coop-unavailable');
    expect(
      within(errorNotice).getByRole('link', {
        name: 'Set up your vault identity in Settings',
      }),
    ).toHaveAttribute('href', '/settings#vault');
  });

  it('links to vault settings after a join token-mint failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      headers: { get: () => null },
      json: async () => ({ error: 'Vault identity is unavailable' }),
    } as unknown as Response);

    render(<CampaignCoopEntryPanel />);
    fireEvent.click(screen.getByTestId('join-coop-campaign-btn'));
    fireEvent.change(screen.getByTestId('join-coop-room-code-input'), {
      target: { value: 'ABCDEF' },
    });
    fireEvent.change(screen.getByTestId('join-coop-password-input'), {
      target: { value: 'vault-password' },
    });
    fireEvent.click(screen.getByTestId('join-coop-submit-btn'));

    const errorNotice = await screen.findByTestId('join-coop-error');
    expect(
      within(errorNotice).getByRole('link', {
        name: 'Set up your vault identity in Settings',
      }),
    ).toHaveAttribute('href', '/settings#vault');
  });

  it('keeps the join error generic when invite lookup fails after minting', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url === '/api/multiplayer/auth/token') {
        return {
          ok: true,
          status: 200,
          json: async () => mintBody('Host'),
        } as Response;
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({}),
      } as Response;
    });

    render(<CampaignCoopEntryPanel />);
    fireEvent.click(screen.getByTestId('join-coop-campaign-btn'));
    fireEvent.change(screen.getByTestId('join-coop-room-code-input'), {
      target: { value: 'ABCDEF' },
    });
    fireEvent.change(screen.getByTestId('join-coop-password-input'), {
      target: { value: 'vault-password' },
    });
    fireEvent.click(screen.getByTestId('join-coop-submit-btn'));

    const errorNotice = await screen.findByTestId('join-coop-error');
    expect(errorNotice).toHaveTextContent(
      'No active co-op campaign with room code ABCDEF',
    );
    expect(
      within(errorNotice).queryByRole('link', {
        name: 'Set up your vault identity in Settings',
      }),
    ).not.toBeInTheDocument();
  });

  it('persists the host campaign to the server before registering the match', async () => {
    // Per campaign-authority "Creation lands in the server store
    // immediately": the campaign save must be accepted before the match
    // POST references it and before the lobby acknowledges creation.
    mockGetCampaign.mockReturnValue({ id: 'campaign-host' });
    mockFetch.mockImplementation(async (url: string) => {
      if (url === '/api/multiplayer/auth/token') {
        return {
          ok: true,
          status: 200,
          json: async () => mintBody('Host'),
        } as Response;
      }
      if (url === '/api/multiplayer/matches') {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            matchId: 'match-1',
            roomCode: 'ROOMAA',
            meta: { roomCode: 'ROOMAA' },
          }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });

    render(<CampaignCoopEntryPanel />);
    fireEvent.change(screen.getByTestId('create-coop-password-input'), {
      target: { value: 'vault-password' },
    });
    fireEvent.click(screen.getByTestId('create-coop-campaign-btn'));

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith(
        '/gameplay/campaigns/campaign-host',
      );
    });
    expect(mockSaveCampaign).toHaveBeenCalledTimes(1);
    const matchesCall = mockFetch.mock.calls.find(
      ([url]) => url === '/api/multiplayer/matches',
    );
    expect(matchesCall).toBeDefined();
    const saveOrder = mockSaveCampaign.mock.invocationCallOrder[0];
    const matchesOrder =
      mockFetch.mock.invocationCallOrder[
        mockFetch.mock.calls.findIndex(
          ([url]) => url === '/api/multiplayer/matches',
        )
      ];
    expect(saveOrder).toBeLessThan(matchesOrder);
  });

  it('fails creation closed when the server save is not accepted', async () => {
    mockGetCampaign.mockReturnValue({ id: 'campaign-host' });
    mockSaveCampaign.mockResolvedValue({
      status: 'error' as const,
      errorMessage: 'server responded 500',
      retriedConflict: false,
    } as never);
    mockFetch.mockImplementation(async (url: string) => {
      if (url === '/api/multiplayer/auth/token') {
        return {
          ok: true,
          status: 200,
          json: async () => mintBody('Host'),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });

    render(<CampaignCoopEntryPanel />);
    fireEvent.change(screen.getByTestId('create-coop-password-input'), {
      target: { value: 'vault-password' },
    });
    fireEvent.click(screen.getByTestId('create-coop-campaign-btn'));

    const errorNotice = await screen.findByTestId('create-coop-unavailable');
    expect(errorNotice).toHaveTextContent('server responded 500');
    expect(
      mockFetch.mock.calls.some(([url]) => url === '/api/multiplayer/matches'),
    ).toBe(false);
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('keeps an empty create password error generic', async () => {
    render(<CampaignCoopEntryPanel />);
    fireEvent.click(screen.getByTestId('create-coop-campaign-btn'));

    const errorNotice = await screen.findByTestId('create-coop-unavailable');
    expect(errorNotice).toHaveTextContent(
      'Enter your vault password to host co-op.',
    );
    expect(
      within(errorNotice).queryByRole('link', {
        name: 'Set up your vault identity in Settings',
      }),
    ).not.toBeInTheDocument();
  });
});

describe('CampaignCoopEntryPanel guest creator binding (P2CG1G2, G2-BOOT-1)', () => {
  const MATCH = 'match-3';
  const CAMPAIGN = 'campaign-7';
  const TS = '2026-10-18T00:00:00.000Z';
  const IDENTITY_URL = '/api/multiplayer/invites/ABCDEF?campaignIdentity=1';

  function respond(identity: { status: number; body: unknown }) {
    mockFetch.mockImplementation(async (url: string) => {
      if (url === '/api/multiplayer/auth/token') {
        return {
          ok: true,
          status: 200,
          json: async () => mintBody('Guest'),
        } as Response;
      }
      if (url.startsWith('/api/multiplayer/invites/ABCDEF')) {
        return {
          ok: identity.status === 200,
          status: identity.status,
          json: async () => identity.body,
        } as Response;
      }
      return { ok: false, status: 500, json: async () => ({}) } as Response;
    });
  }

  function snapshot(campaignId = CAMPAIGN, stateCampaignId = campaignId) {
    return {
      kind: 'CampaignSnapshot',
      matchId: MATCH,
      ts: TS,
      event: {
        type: 'CampaignSnapshotPublished',
        campaignId,
        sequence: -1,
        ts: TS,
        authorPlayerId: 'pid_gm',
        scope: 'campaign',
        payload: {
          matchId: MATCH,
          revision: 0,
          state: createEmptyCampaignState(stateCampaignId),
        },
      },
    };
  }

  /** The guest seat the panel joins with (playerId from the minted token). */
  function connectSeat(campaignId = CAMPAIGN): {
    transport: ICampaignSyncTransport;
    socket: IEntrySocket;
  } {
    const socket = mockEntrySocket();
    const transport = connectCampaignSyncTransport({
      expectedCampaignId: campaignId,
      matchId: MATCH,
      role: 'guest',
      playerId: 'pid_host',
      wireToken: 'wire-token',
      socketFactory: () => socket,
    });
    return { transport, socket };
  }

  async function submitJoin() {
    const view = render(<CampaignCoopEntryPanel />);
    fireEvent.click(screen.getByTestId('join-coop-campaign-btn'));
    fireEvent.change(screen.getByTestId('join-coop-room-code-input'), {
      target: { value: 'ABCDEF' },
    });
    fireEvent.change(screen.getByTestId('join-coop-password-input'), {
      target: { value: 'vault-password' },
    });
    fireEvent.click(screen.getByTestId('join-coop-submit-btn'));
    return view;
  }

  /** Waits until the join failed visibly or took the next step. */
  async function joinOutcome(next: () => boolean): Promise<void> {
    await waitFor(() =>
      expect(screen.queryByTestId('join-coop-error') !== null || next()).toBe(
        true,
      ),
    );
  }

  const identity = {
    status: 200,
    body: {
      matchId: MATCH,
      status: 'lobby',
      layout: '1v1',
      campaignId: CAMPAIGN,
    },
  };

  beforeEach(() => {
    mockRouterPush.mockReset();
    mockFetch.mockReset();
    mockConnectGuest.mockReset();
    mockCreateGuestMirrorCampaign.mockClear();
    mockEntrySockets.length = 0;
    useCampaignMirrorStore.getState().reset();
    window.sessionStorage.clear();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.useRealTimers();
    _resetCampaignSyncTransportsForTest();
    useCampaignMirrorStore.getState().reset();
  });

  it('resolves campaign identity with the minted bearer, never match metadata', async () => {
    respond(identity);
    await submitJoin();
    await waitFor(() => expect(mockEntrySockets).toHaveLength(1));

    expect(mockFetch).toHaveBeenCalledWith(IDENTITY_URL, {
      headers: { Authorization: 'Bearer wire-token' },
      cache: 'no-store',
    });
    expect(
      mockFetch.mock.calls.some(([url]) =>
        String(url).startsWith('/api/multiplayer/matches/'),
      ),
    ).toBe(false);
  });

  it('binds the guest creator to the resolved campaign and adopts its snapshot', async () => {
    respond(identity);
    await submitJoin();
    await waitFor(() => expect(mockEntrySockets).toHaveLength(1));

    expect(CAMPAIGN).not.toBe(MATCH);
    expect(mockConnectGuest).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedCampaignId: CAMPAIGN,
        matchId: MATCH,
        role: 'guest',
        roomCode: 'ABCDEF',
      }),
    );
    expect(getActiveCampaignSyncTransport(MATCH)?.campaignId).toBe(CAMPAIGN);

    await act(async () => mockEntrySockets[0].inject(snapshot()));
    await waitFor(() =>
      expect(mockRouterPush).toHaveBeenCalledWith(
        '/gameplay/campaigns/guest-campaign-1',
      ),
    );
    expect(mockCreateGuestMirrorCampaign).toHaveBeenCalledWith(
      MATCH,
      expect.objectContaining({ campaignId: CAMPAIGN }),
    );
  });

  it.each<[string, unknown]>([
    ['a missing campaignId', { matchId: MATCH, status: 'lobby' }],
    [
      'an empty campaignId',
      { matchId: MATCH, status: 'lobby', campaignId: '' },
    ],
    [
      'a non-string campaignId',
      { matchId: MATCH, status: 'lobby', campaignId: 7 },
    ],
    [
      'an unknown status',
      { matchId: MATCH, status: 'bogus', campaignId: CAMPAIGN },
    ],
  ])('opens no socket for an identity with %s', async (_label, body) => {
    respond({ status: 200, body });
    await submitJoin();

    await joinOutcome(() => mockEntrySockets.length > 0);
    expect(mockEntrySockets).toHaveLength(0);
    expect(screen.getByTestId('join-coop-error')).toBeInTheDocument();
    expect(mockCreateGuestMirrorCampaign).not.toHaveBeenCalled();
  });

  it.each<[number, string]>([
    [400, 'Missing or invalid room code'],
    [401, 'Authentication required'],
    [404, 'No active co-op campaign with room code ABCDEF'],
  ])(
    'treats a %s identity refusal as final: no socket and no anonymous fallback (CF-G2A-5)',
    async (status, message) => {
      respond({ status, body: { error: message } });
      await submitJoin();

      await joinOutcome(() => mockEntrySockets.length > 0);
      expect(mockEntrySockets).toHaveLength(0);
      expect(screen.getByTestId('join-coop-error')).toHaveTextContent(message);
      const inviteCalls = mockFetch.mock.calls
        .map(([url]) => String(url))
        .filter((url) => url.startsWith('/api/multiplayer/invites/'));
      expect(inviteCalls).toEqual([IDENTITY_URL]);
      expect(inviteCalls.join(' ')).not.toContain('token=');
    },
  );

  it.each<[string, string, string]>([
    ['event', 'campaign-other', CAMPAIGN],
    ['state', CAMPAIGN, 'campaign-other'],
  ])(
    'adopts nothing from a snapshot whose %s names another campaign',
    async (_label, eventCampaign, stateCampaign) => {
      respond(identity);
      await submitJoin();
      await waitFor(() => expect(mockEntrySockets).toHaveLength(1));

      await act(async () =>
        mockEntrySockets[0].inject(snapshot(eventCampaign, stateCampaign)),
      );
      await joinOutcome(
        () => mockCreateGuestMirrorCampaign.mock.calls.length > 0,
      );
      expect(mockCreateGuestMirrorCampaign).not.toHaveBeenCalled();
      expect(screen.getByTestId('join-coop-error')).toBeInTheDocument();
      expect(useCampaignMirrorStore.getState().peers).toBeNull();
      expect(mockRouterPush).not.toHaveBeenCalled();
    },
  );

  it('completes the join on a bound replacement B with no further render', async () => {
    respond(identity);
    await submitJoin();
    await waitFor(() => expect(mockEntrySockets).toHaveLength(1));

    const replacement = connectSeat();
    await act(async () => replacement.socket.inject(snapshot()));
    await waitFor(() =>
      expect(mockRouterPush).toHaveBeenCalledWith(
        '/gameplay/campaigns/guest-campaign-1',
      ),
    );
    expect(replacement.socket.readyState).toBe(1);
  });

  it('never adopts or closes a foreign replacement', async () => {
    jest.useFakeTimers();
    respond(identity);
    await submitJoin();
    await waitFor(() => expect(mockEntrySockets).toHaveLength(1));

    const foreign = connectSeat('campaign-other');
    await act(async () => {
      foreign.socket.inject(snapshot('campaign-other'));
      jest.advanceTimersByTime(10_000);
    });
    await screen.findByTestId('join-coop-error');
    expect(mockCreateGuestMirrorCampaign).not.toHaveBeenCalled();
    expect(foreign.socket.readyState).toBe(1);
    expect(getActiveCampaignSyncTransport(MATCH)).toBe(foreign.transport);
  });

  it('a stale timeout closes only its own transport, never a bound B', async () => {
    jest.useFakeTimers();
    respond(identity);
    await submitJoin();
    await waitFor(() => expect(mockEntrySockets).toHaveLength(1));

    const replacement = connectSeat();
    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    await screen.findByTestId('join-coop-error');
    expect(mockEntrySockets[0].readyState).toBe(3);
    expect(replacement.socket.readyState).toBe(1);
    expect(getActiveCampaignSyncTransport(MATCH)).toBe(replacement.transport);
  });

  it('adopts nothing when the seat is replaced between its snapshot and adoption', async () => {
    respond(identity);
    await submitJoin();
    await waitFor(() => expect(mockEntrySockets).toHaveLength(1));

    await act(async () => {
      // The snapshot settles the wait; the foreign takeover lands before the
      // awaiting join resumes.
      mockEntrySockets[0].inject(snapshot());
      connectSeat('campaign-other');
    });
    await joinOutcome(
      () => mockCreateGuestMirrorCampaign.mock.calls.length > 0,
    );
    expect(mockCreateGuestMirrorCampaign).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('adopts nothing after the panel unmounts mid-join', async () => {
    respond(identity);
    const view = await submitJoin();
    await waitFor(() => expect(mockEntrySockets).toHaveLength(1));

    view.unmount();
    await act(async () => mockEntrySockets[0].inject(snapshot()));
    await act(async () => {
      for (let tick = 0; tick < 10; tick += 1) await Promise.resolve();
    });
    expect(mockCreateGuestMirrorCampaign).not.toHaveBeenCalled();
    expect(useCampaignMirrorStore.getState().peers).toBeNull();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});

describe('CampaignCoopEntryPanel credential choice (LSC-2)', () => {
  const CHOICE_KEY = 'mekstation.coopCredential.choice';
  const BINDING_KEY = 'mekstation.coopCredential.joined.match-3';
  const TOKEN_URL = '/api/multiplayer/auth/token';
  const SEATS_URL = '/api/multiplayer/auth/local-seats';
  const MATCH = 'match-3';
  const CAMPAIGN = 'campaign-7';
  const baseToken = { ...mockLiveToken };

  function reply(status: number, body: unknown = {}, headers = {}) {
    const lookup = headers as Record<string, string>;
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (name: string) => lookup[name] ?? null },
      json: async () => body,
    } as unknown as Response;
  }

  interface IRoutes {
    token?: () => Promise<Response> | Response;
    seat?: () => Promise<Response> | Response;
    seatList?: () => Promise<Response> | Response;
    seatWrite?: () => Promise<Response> | Response;
  }

  /** Mint on either route succeeds unless overridden; the invite resolves to match-3. */
  function route(overrides: IRoutes = {}) {
    mockFetch.mockImplementation(
      async (url: string, init?: { method?: string }) => {
        if (url === TOKEN_URL) {
          return (overrides.token ?? (() => reply(200, mintBody('Guest'))))();
        }
        if (url === SEATS_URL && init?.method === 'GET') {
          return overrides.seatList?.() ?? reply(404);
        }
        if (url === SEATS_URL && init?.method === 'POST') {
          const body = JSON.parse(String((init as { body?: string }).body));
          if (body.action === 'mint') {
            return (overrides.seat ?? (() => reply(200, mintBody('Guest'))))();
          }
          return overrides.seatWrite?.() ?? reply(404);
        }
        if (url.startsWith('/api/multiplayer/invites/ABCDEF')) {
          return reply(200, {
            matchId: MATCH,
            status: 'lobby',
            layout: '1v1',
            campaignId: CAMPAIGN,
          });
        }
        if (url === '/api/multiplayer/matches') {
          return reply(201, {
            matchId: 'match-1',
            roomCode: 'ROOMAA',
            meta: { roomCode: 'ROOMAA' },
          });
        }
        return reply(404);
      },
    );
  }

  const mintCalls = () =>
    mockFetch.mock.calls.filter(
      ([url, init]) =>
        url === TOKEN_URL ||
        (url === SEATS_URL &&
          JSON.parse(String(init?.body ?? '{}')).action === 'mint'),
    );
  const bodies = () =>
    mockFetch.mock.calls
      .filter(([, init]) => init?.body)
      .map(([, init]) => JSON.parse(String(init.body)));

  function openJoin() {
    fireEvent.click(screen.getByTestId('join-coop-campaign-btn'));
    fireEvent.change(screen.getByTestId('join-coop-room-code-input'), {
      target: { value: 'ABCDEF' },
    });
  }
  const chooser = () =>
    screen.getByRole('combobox', { name: 'This browser profile joins as' });
  // Primary is the default; only a seat choice needs the chooser.
  const choose = (value: string) => {
    if (value !== 'primary') fireEvent.change(chooser(), { target: { value } });
  };
  function submitJoin(secret = 'vault-password') {
    fireEvent.change(screen.getByTestId('join-coop-password-input'), {
      target: { value: secret },
    });
    fireEvent.click(screen.getByTestId('join-coop-submit-btn'));
  }
  function submitCreate(secret = 'vault-password') {
    fireEvent.change(screen.getByTestId('create-coop-password-input'), {
      target: { value: secret },
    });
    fireEvent.click(screen.getByTestId('create-coop-campaign-btn'));
  }
  const storageDump = () =>
    JSON.stringify([{ ...window.localStorage }, { ...window.sessionStorage }]);

  beforeEach(() => {
    mockRouterPush.mockReset();
    mockFetch.mockReset();
    mockConnectGuest.mockReset();
    mockCreateCampaign.mockClear();
    mockGetCampaign.mockReset().mockReturnValue({ id: 'campaign-host' });
    mockUpdateCampaign.mockClear();
    mockCreateGuestMirrorCampaign.mockClear();
    mockSaveCampaign.mockClear().mockResolvedValue({
      status: 'saved' as const,
      record: {} as never,
      retriedConflict: false,
    });
    mockEntrySockets.length = 0;
    useCampaignMirrorStore.getState().reset();
    window.localStorage.clear();
    window.sessionStorage.clear();
    Object.assign(mockLiveToken, baseToken);
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.useRealTimers();
    Object.assign(mockLiveToken, baseToken);
    _resetCampaignSyncTransportsForTest();
    useCampaignMirrorStore.getState().reset();
  });

  it('LS01 mounts the credential chooser in the join panel; opening or changing it mints nothing and stores only the public choice', () => {
    render(<CampaignCoopEntryPanel />);
    expect(
      screen.queryByRole('region', { name: 'Co-op credential choice' }),
    ).toBeNull();
    openJoin();
    expect(
      screen.getByRole('region', { name: 'Co-op credential choice' }),
    ).toBeInTheDocument();
    expect(chooser()).toHaveValue('primary');
    choose('seat2');
    choose('seat1');

    expect(mockFetch).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(CHOICE_KEY)).toBe('seat1');
    expect(window.localStorage.length).toBe(1);
    expect(window.sessionStorage.length).toBe(0);
  });

  it.each<[string, string, unknown]>([
    ['primary', TOKEN_URL, { password: 'join-secret' }],
    [
      'seat1',
      SEATS_URL,
      { action: 'mint', seatId: 'local-seat-1', password: 'join-secret' },
    ],
    [
      'seat2',
      SEATS_URL,
      { action: 'mint', seatId: 'local-seat-2', password: 'join-secret' },
    ],
  ])(
    'LS02 join with %s mints through the matching route and grants no role',
    async (choice, url, expectedBody) => {
      route();
      render(<CampaignCoopEntryPanel />);
      openJoin();
      choose(choice);
      submitJoin('join-secret');
      await waitFor(() => expect(mockEntrySockets).toHaveLength(1));

      expect(mintCalls()).toHaveLength(1);
      expect(mintCalls()[0][0]).toBe(url);
      expect(JSON.parse(String(mintCalls()[0][1].body))).toEqual(expectedBody);
      const postBodies = JSON.stringify(bodies());
      const stored = storageDump();
      for (const text of [postBodies, stored]) {
        expect(text).not.toMatch(/role|seatKind|seat_kind|hostSeatKind/i);
      }
      expect(
        JSON.parse(window.sessionStorage.getItem(BINDING_KEY) ?? 'null'),
      ).toEqual({ matchId: MATCH, choice, playerId: 'pid_host' });
    },
  );

  it('LS03 create-host mints once through the shared adapter, sends the same bearer to the match route and binds choice primary', async () => {
    route();
    render(<CampaignCoopEntryPanel />);
    submitCreate('host-secret');
    await waitFor(() =>
      expect(mockRouterPush).toHaveBeenCalledWith(
        '/gameplay/campaigns/campaign-host',
      ),
    );

    const mints = mintCalls();
    expect(mints).toHaveLength(1);
    expect(mints[0][0]).toBe(TOKEN_URL);
    expect(mints[0][1]).toMatchObject({
      method: 'POST',
      cache: 'no-store',
      credentials: 'same-origin',
    });
    expect(JSON.parse(String(mints[0][1].body))).toEqual({
      password: 'host-secret',
    });
    const [, matchInit] = mockFetch.mock.calls.find(
      ([url]) => url === '/api/multiplayer/matches',
    )!;
    expect(matchInit.headers.Authorization).toBe('Bearer wire-token');
    expect(JSON.parse(matchInit.body).displayName).toBe('Guest');
    expect(
      JSON.parse(
        window.sessionStorage.getItem('mekstation.coopCampaign.token.match-1')!,
      ),
    ).toMatchObject({
      playerId: 'pid_host',
      wireToken: 'wire-token',
      displayName: 'Guest',
    });
    expect(
      JSON.parse(
        window.sessionStorage.getItem(
          'mekstation.coopCredential.joined.match-1',
        )!,
      ),
    ).toEqual({ matchId: 'match-1', choice: 'primary', playerId: 'pid_host' });
  });

  it.each<[string, string, number, string, boolean]>([
    [
      'create',
      'primary',
      404,
      'Create a primary vault identity in Settings first.',
      true,
    ],
    ['create', 'primary', 401, 'Primary vault password was refused.', false],
    [
      'join',
      'primary',
      404,
      'Create a primary vault identity in Settings first.',
      true,
    ],
    ['join', 'primary', 401, 'Primary vault password was refused.', false],
    ['join', 'seat1', 401, 'Local seat credentials were refused.', false],
  ])(
    'LS04 %s with %s and status %s shows the mapped sanitized message (vault link: %s)',
    async (flow, choice, status, expected, link) => {
      route({
        token: () => reply(status, { error: 'SERVER-DETAIL-LEAK' }),
        seat: () => reply(status, { error: 'SERVER-DETAIL-LEAK' }),
      });
      render(<CampaignCoopEntryPanel />);
      let notice: HTMLElement;
      if (flow === 'create') {
        submitCreate();
        notice = await screen.findByTestId('create-coop-unavailable');
      } else {
        openJoin();
        choose(choice);
        submitJoin();
        notice = await screen.findByTestId('join-coop-error');
      }
      expect(notice).toHaveTextContent(expected);
      expect(notice).not.toHaveTextContent('SERVER-DETAIL-LEAK');
      expect(notice).not.toHaveTextContent(/HTTP \d+/);
      const vaultLink = within(notice).queryByRole('link', {
        name: 'Set up your vault identity in Settings',
      });
      expect(vaultLink !== null).toBe(link);
    },
  );

  it.each<[string, string, () => Promise<Response> | Response, string]>([
    ['seat1', '401', () => reply(401), 'Local seat credentials were refused.'],
    [
      'seat1',
      '429',
      () => reply(429, {}, { 'Retry-After': '7' }),
      'Local seat requests are throttled. Retry after 7 seconds.',
    ],
    ['seat2', '503', () => reply(503), 'Local seat request failed.'],
    ['primary', '500', () => reply(500), 'Local seat request failed.'],
    [
      'primary',
      '429',
      () => reply(429, {}, { 'Retry-After': '30' }),
      'Local seat requests are throttled. Retry after 30 seconds.',
    ],
    [
      'seat1',
      'status 0',
      () => Promise.reject(new Error('SECRET-NETWORK-DETAIL')),
      'Local seat request failed.',
    ],
  ])(
    'LS05 %s mint failure %s is distinct and sanitized and is never retried automatically',
    async (choice, _label, failure, expected) => {
      jest.useFakeTimers();
      const respond = () => failure();
      route({ token: respond, seat: respond });
      render(<CampaignCoopEntryPanel />);
      openJoin();
      choose(choice);
      submitJoin();
      const notice = await screen.findByTestId('join-coop-error');
      expect(notice).toHaveTextContent(expected);
      expect(notice).not.toHaveTextContent('SECRET-NETWORK-DETAIL');

      await act(async () => {
        jest.advanceTimersByTime(10 * 60_000);
      });
      expect(mintCalls()).toHaveLength(1);
      submitJoin();
      await waitFor(() => expect(mintCalls()).toHaveLength(2));
      await act(async () => {
        jest.advanceTimersByTime(10 * 60_000);
      });
      expect(mintCalls()).toHaveLength(2);
    },
  );

  it('LS06 keeps create and join passwords in uncontrolled unnamed password inputs cleared before the first await', async () => {
    const pending = (() => {
      let resolve!: (value: Response) => void;
      const promise = new Promise<Response>((yes) => {
        resolve = yes;
      });
      return { promise, resolve };
    })();
    route({ token: () => pending.promise });
    render(<CampaignCoopEntryPanel />);
    openJoin();

    for (const id of [
      'create-coop-password-input',
      'join-coop-password-input',
    ]) {
      const input = screen.getByTestId(id) as HTMLInputElement;
      expect(input).toHaveAttribute('type', 'password');
      expect(input).toHaveAttribute('autocomplete', 'current-password');
      expect(input).not.toHaveAttribute('name');
    }

    const join = screen.getByTestId(
      'join-coop-password-input',
    ) as HTMLInputElement;
    submitJoin('join-secret');
    // Cleared synchronously: the mint is still pending.
    expect(join.value).toBe('');
    expect(mintCalls()).toHaveLength(1);
    await act(async () => {
      pending.resolve(reply(401));
    });
    await screen.findByTestId('join-coop-error');
    expect(join.value).toBe('');
    // A re-render must not bring it back from state.
    fireEvent.change(screen.getByTestId('join-coop-room-code-input'), {
      target: { value: 'ABCDEG' },
    });
    expect(join.value).toBe('');

    const create = screen.getByTestId(
      'create-coop-password-input',
    ) as HTMLInputElement;
    route({ token: () => reply(404) });
    submitCreate('create-secret');
    expect(create.value).toBe('');
    await screen.findByTestId('create-coop-unavailable');
    expect(create.value).toBe('');

    const everything = [
      storageDump(),
      ...mockFetch.mock.calls.map(([url]) => String(url)),
      ...mockRouterPush.mock.calls.map(([href]) => String(href)),
    ].join('\n');
    expect(everything).not.toContain('join-secret');
    expect(everything).not.toContain('create-secret');
  });

  it('LS06 clears the join password before the first await on success', async () => {
    route();
    render(<CampaignCoopEntryPanel />);
    openJoin();
    const join = screen.getByTestId(
      'join-coop-password-input',
    ) as HTMLInputElement;
    submitJoin('join-secret');
    expect(join.value).toBe('');
    await waitFor(() => expect(mockEntrySockets).toHaveLength(1));
    expect(join.value).toBe('');
    expect(storageDump()).not.toContain('join-secret');
  });

  describe('LS07 primary clock behavior (CF-LSC2C-2/L-3 panel side)', () => {
    const ahead = (ms: number) => {
      const issued = Date.now() + ms;
      mockLiveToken.issuedAt = new Date(issued).toISOString();
      mockLiveToken.expiresAt = new Date(issued + 50 * 60_000).toISOString();
    };

    it('accepts a primary token issued 30 s ahead of the browser clock', async () => {
      ahead(30_000);
      route();
      render(<CampaignCoopEntryPanel />);
      openJoin();
      submitJoin();
      await waitFor(() => expect(mockEntrySockets).toHaveLength(1));
      expect(
        mockFetch.mock.calls.some(([url]) =>
          String(url).startsWith('/api/multiplayer/invites/ABCDEF'),
        ),
      ).toBe(true);
      expect(
        window.sessionStorage.getItem('mekstation.coopCampaign.token.match-3'),
      ).not.toBeNull();
    });

    it.each(['seat1', 'seat2'])(
      'refuses the same token through %s with no stored bearer',
      async (choice) => {
        ahead(30_000);
        route();
        render(<CampaignCoopEntryPanel />);
        openJoin();
        choose(choice);
        submitJoin();
        expect(await screen.findByTestId('join-coop-error')).toHaveTextContent(
          'The server returned an invalid or expired sign-in.',
        );
        expect(window.sessionStorage.length).toBe(0);
        expect(mockEntrySockets).toHaveLength(0);
        expect(
          mockFetch.mock.calls.some(([url]) =>
            String(url).includes('/invites/'),
          ),
        ).toBe(false);
      },
    );

    const bad: Array<[string, () => void, (choice: string) => boolean]> = [
      [
        'an expired token',
        () => {
          mockLiveToken.issuedAt = new Date(
            Date.now() - 2 * 60_000,
          ).toISOString();
          mockLiveToken.expiresAt = new Date(Date.now() - 60_000).toISOString();
        },
        () => true,
      ],
      [
        'a token that outlives the lifetime cap',
        () => {
          mockLiveToken.expiresAt = new Date(
            Date.now() + 7 * 3600_000,
          ).toISOString();
        },
        () => true,
      ],
      [
        'a one-hour-plus seat token',
        () => {
          mockLiveToken.expiresAt = new Date(
            Date.now() + 90 * 60_000,
          ).toISOString();
        },
        (choice) => choice !== 'primary',
      ],
    ];
    it.each(
      bad.flatMap(([label, mutate, applies]) =>
        ['primary', 'seat1']
          .filter(applies)
          .map((choice) => [label, choice, mutate] as const),
      ),
    )('refuses %s for %s', async (_label, choice, mutate) => {
      mutate();
      route();
      render(<CampaignCoopEntryPanel />);
      openJoin();
      choose(choice);
      submitJoin();
      expect(await screen.findByTestId('join-coop-error')).toHaveTextContent(
        'The server returned an invalid or expired sign-in.',
      );
      expect(window.sessionStorage.length).toBe(0);
      expect(mockEntrySockets).toHaveLength(0);
    });

    it.each(['primary', 'seat1'])(
      'refuses a body that disagrees with its token for %s',
      async (choice) => {
        route({
          token: () =>
            reply(200, { ...mintBody('Guest'), playerId: 'pid_other' }),
          seat: () =>
            reply(200, {
              ...mintBody('Guest'),
              expiresAt: '2099-01-01T00:00:00.000Z',
            }),
        });
        render(<CampaignCoopEntryPanel />);
        openJoin();
        choose(choice);
        submitJoin();
        expect(await screen.findByTestId('join-coop-error')).toHaveTextContent(
          'The server returned an invalid or expired sign-in.',
        );
        expect(window.sessionStorage.length).toBe(0);
      },
    );
  });

  it('LS08 records the public binding and per-match bearer on join and refuses a different identity for the same match', async () => {
    route();
    const view = render(<CampaignCoopEntryPanel />);
    openJoin();
    choose('seat1');
    submitJoin('join-secret');
    await waitFor(() => expect(mockEntrySockets).toHaveLength(1));

    expect(JSON.parse(window.sessionStorage.getItem(BINDING_KEY)!)).toEqual({
      matchId: MATCH,
      choice: 'seat1',
      playerId: 'pid_host',
    });
    const bearer = JSON.parse(
      window.sessionStorage.getItem('mekstation.coopCampaign.token.match-3')!,
    );
    expect(bearer).toMatchObject({
      matchId: MATCH,
      playerId: 'pid_host',
      wireToken: 'wire-token',
    });
    expect(storageDump()).not.toContain('join-secret');
    expect(storageDump()).not.toMatch(/privateKey|private_key|password/i);

    // Finish the first join so the dialog closes, then try another identity.
    await act(async () => {
      mockEntrySockets[0].inject({
        kind: 'CampaignSnapshot',
        matchId: MATCH,
        ts: '2026-10-18T00:00:00.000Z',
        event: {
          type: 'CampaignSnapshotPublished',
          campaignId: CAMPAIGN,
          sequence: -1,
          ts: '2026-10-18T00:00:00.000Z',
          authorPlayerId: 'pid_gm',
          scope: 'campaign',
          payload: {
            matchId: MATCH,
            revision: 0,
            state: createEmptyCampaignState(CAMPAIGN),
          },
        },
      });
    });
    await waitFor(() => expect(mockRouterPush).toHaveBeenCalled());

    mockLiveToken.playerId = 'pid_other';
    openJoin();
    choose('seat2');
    submitJoin('join-secret');
    expect(await screen.findByTestId('join-coop-error')).toHaveTextContent(
      'This credential now belongs to a different player. Forget this sign-in and reclaim through co-op entry; the GM must admit the new identity.',
    );
    expect(
      JSON.parse(window.sessionStorage.getItem(BINDING_KEY)!).playerId,
    ).toBe('pid_host');
    expect(
      JSON.parse(
        window.sessionStorage.getItem('mekstation.coopCampaign.token.match-3')!,
      ).playerId,
    ).toBe('pid_host');
    expect(mockEntrySockets).toHaveLength(1);
    view.unmount();
  });

  it('LS13 join with an invalid stored choice mints nothing and shows the stored-choice message', async () => {
    window.localStorage.setItem(CHOICE_KEY, 'seat9');
    route();
    render(<CampaignCoopEntryPanel />);
    openJoin();
    submitJoin('join-secret');
    expect(await screen.findByTestId('join-coop-error')).toHaveTextContent(
      'Saved credential choice is invalid. Forget it and choose again.',
    );
    expect(mintCalls()).toHaveLength(0);
    expect(mockEntrySockets).toHaveLength(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('LS08 a second join for the same match with the same identity is not refused', async () => {
    route();
    const view = render(<CampaignCoopEntryPanel />);
    for (const round of [1, 2]) {
      openJoin();
      choose('seat1');
      submitJoin('join-secret');
      await waitFor(() => expect(mockEntrySockets).toHaveLength(round));
      await act(async () => {
        mockEntrySockets[round - 1].inject({
          kind: 'CampaignSnapshot',
          matchId: MATCH,
          ts: '2026-10-18T00:00:00.000Z',
          event: {
            type: 'CampaignSnapshotPublished',
            campaignId: CAMPAIGN,
            sequence: -1,
            ts: '2026-10-18T00:00:00.000Z',
            authorPlayerId: 'pid_gm',
            scope: 'campaign',
            payload: {
              matchId: MATCH,
              revision: 0,
              state: createEmptyCampaignState(CAMPAIGN),
            },
          },
        });
      });
      await waitFor(() => expect(mockRouterPush).toHaveBeenCalledTimes(round));
    }
    expect(screen.queryByTestId('join-coop-error')).toBeNull();
    expect(JSON.parse(window.sessionStorage.getItem(BINDING_KEY)!)).toEqual({
      matchId: MATCH,
      choice: 'seat1',
      playerId: 'pid_host',
    });
    view.unmount();
  });

  it('LS09 keeps the primary host create request, host session and navigation unchanged', async () => {
    route();
    render(<CampaignCoopEntryPanel />);
    submitCreate('host-secret');
    await waitFor(() =>
      expect(mockRouterPush).toHaveBeenCalledWith(
        '/gameplay/campaigns/campaign-host',
      ),
    );
    const [, init] = mockFetch.mock.calls.find(
      ([url]) => url === '/api/multiplayer/matches',
    )!;
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      config: { mapRadius: 8, turnLimit: 20, fogOfWar: false },
      layout: '1v1',
      hostSeatKind: 'spectator',
      displayName: 'Guest',
      coopCampaign: {
        campaignId: 'campaign-host',
        arbitrationMode: 'host-review',
      },
    });
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(mockUpdateCampaign).toHaveBeenCalledWith({
      name: 'Co-op Campaign ROOMAA',
      coopSession: { mode: 'host', roomCode: 'ROOMAA', matchId: 'match-1' },
    });
  });

  it('LS11 refreshes seats after an unknown-outcome write before any second write, through the mounted operator panel', async () => {
    let lists = 0;
    const pendingList = (() => {
      let resolve!: (value: Response) => void;
      const promise = new Promise<Response>((yes) => {
        resolve = yes;
      });
      return { promise, resolve };
    })();
    const seatsBody = (generation: number) => ({
      generation,
      replayed: false,
      seats: [
        {
          seatId: 'local-seat-1',
          status: generation ? 'active' : 'unprovisioned',
          label: generation ? 'Scout' : null,
          playerId: generation ? 'pid_seatone' : null,
          generation,
          lockedUntil: null,
        },
        {
          seatId: 'local-seat-2',
          status: 'unprovisioned',
          label: null,
          playerId: null,
          generation: 0,
          lockedUntil: null,
        },
      ],
    });
    const writes: Array<{ expectedGeneration: number }> = [];
    route({
      seatList: () => {
        lists += 1;
        return lists === 2 ? pendingList.promise : reply(200, seatsBody(0));
      },
      seatWrite: () => reply(503, {}),
    });
    const base = mockFetch.getMockImplementation()!;
    mockFetch.mockImplementation(
      async (url: string, init?: { method?: string; body?: string }) => {
        if (url === SEATS_URL && init?.method === 'POST') {
          const body = JSON.parse(String(init.body));
          if (body.action !== 'mint') {
            writes.push(body);
            return writes.length === 1
              ? reply(503, {})
              : reply(200, seatsBody(4));
          }
        }
        return base(url, init);
      },
    );

    render(<CampaignCoopEntryPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Manage local seats' }));
    await screen.findByRole('group', { name: 'Local seat credentials' });
    const fill = () => {
      fireEvent.change(screen.getByLabelText('Seat label'), {
        target: { value: 'Scout' },
      });
      fireEvent.change(screen.getByLabelText('Primary vault password'), {
        target: { value: 'operator-secret' },
      });
      fireEvent.change(screen.getByLabelText('New seat password'), {
        target: { value: 'seat-secret-1' },
      });
    };
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Provision seat' }));
    await waitFor(() => expect(lists).toBe(2));
    expect(writes).toHaveLength(1);

    const provision = () =>
      screen.getByRole('button', { name: /provision seat/i });
    expect(provision()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Revoke seat' })).toBeDisabled();
    fireEvent.submit(provision().closest('form')!);
    expect(writes).toHaveLength(1);

    await act(async () => {
      pendingList.resolve(reply(200, seatsBody(3)));
    });
    await waitFor(() => expect(provision()).toBeEnabled());
    fill();
    // The refreshed seat is active now: re-provisioning needs its confirmation.
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(provision());
    await waitFor(() => expect(writes).toHaveLength(2));
    expect(writes[1].expectedGeneration).toBe(3);
  });
});
