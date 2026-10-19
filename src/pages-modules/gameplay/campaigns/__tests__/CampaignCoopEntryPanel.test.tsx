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

jest.mock('@/types/multiplayer/Player', () => ({
  ...jest.requireActual('@/types/multiplayer/Player'),
  decodeTokenFromWire: jest.fn(() => ({
    playerId: 'pid_host',
    issuedAt: '2026-07-10T00:00:00.000Z',
    expiresAt: '2026-07-10T01:00:00.000Z',
    publicKey: 'public-key',
    signature: 'signature',
  })),
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
      status: 401,
      json: async () => ({ error: 'Vault identity is unavailable' }),
    } as Response);

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
      status: 401,
      json: async () => ({ error: 'Vault identity is unavailable' }),
    } as Response);

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
          json: async () => ({
            token: 'wire-token',
            playerId: 'pid_host',
            displayName: 'Host',
          }),
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
          json: async () => ({
            token: 'wire-token',
            playerId: 'pid_host',
            displayName: 'Host',
          }),
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
          json: async () => ({
            token: 'wire-token',
            playerId: 'pid_host',
            displayName: 'Host',
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
          json: async () => ({
            token: 'wire-token',
            playerId: 'pid_host',
            displayName: 'Guest',
          }),
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
