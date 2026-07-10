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

jest.mock('@/stores/campaign/useCampaignStore', () => ({
  useCampaignStore: () => ({
    getState: () => ({
      createCampaign: jest.fn(),
      getCampaign: jest.fn(),
      createGuestMirrorCampaign: jest.fn(),
    }),
  }),
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
