import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import React from 'react';

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

jest.mock('@/stores/campaign/useCampaignStore', () => ({
  useCampaignStore: () => ({
    getState: () => ({
      createCampaign: mockCreateCampaign,
      getCampaign: mockGetCampaign,
      updateCampaign: mockUpdateCampaign,
      createGuestMirrorCampaign: jest.fn(),
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

jest.mock('@/lib/campaign/coop/campaignSyncTransport', () => ({
  campaignSnapshotFromMessage: jest.fn(),
  connectCampaignSyncTransport: jest.fn(),
}));

jest.mock('@/types/multiplayer/Player', () => ({
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
