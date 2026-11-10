/**
 * A spectator watching across a server restart resumes without a page reload.
 *
 * The REAL page, session hook and client run over a mock socket. A restart
 * releases the spectator's seat at boot, so the reconnecting socket is refused
 * with `AUTH_REJECTED` and the client closes for good. The page then registers
 * again, once, and the hook rebinds. A refused registration (a completed match,
 * 409) is an error, and nothing loops.
 */

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import type { IClientWebSocket } from '@/lib/multiplayer/client';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import SpectatePage from '@/pages/multiplayer/spectate/[matchId]';

class MockSocket implements IClientWebSocket {
  sent: string[] = [];
  readyState = 1;
  onopen: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onclose: ((ev: unknown) => void) | null = null;
  send(data: string): void {
    this.sent.push(data);
  }
  close(): void {
    this.readyState = 3;
  }
  emit(message: IServerMessage): void {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

const mockSockets: MockSocket[] = [];

jest.mock('next/router', () => ({
  useRouter: () => ({ query: { matchId: 'match-1' } }),
}));

jest.mock('@/pages-modules/multiplayer/multiplayerPage.helpers', () => ({
  mintToken: jest.fn(async () => ({
    wireToken: 'wire-token',
    token: { playerId: 'pid_watch' },
    displayName: 'Watcher',
  })),
  buildWsUrl: () => 'ws://test.local/api/multiplayer/socket?matchId=match-1',
}));

jest.mock('@/components/multiplayer/NetworkedGameSurface', () => ({
  NetworkedGameSurface: (props: {
    status: string;
    closedInfo?: { code?: string } | null;
  }) => (
    <div
      data-testid="surface"
      data-status={props.status}
      data-closed={props.closedInfo?.code ?? ''}
    />
  ),
}));

// The real hook and client, over a mock socket, with auto-reconnect off so a
// refusal is terminal exactly as the server's Close frame makes it.
jest.mock('@/hooks/useMultiplayerSession', () => {
  const actual = jest.requireActual('@/hooks/useMultiplayerSession');
  return {
    ...actual,
    useMultiplayerSession: (
      url: string | null,
      matchId: string | null,
      auth: unknown,
    ) =>
      actual.useMultiplayerSession(url, matchId, auth, {
        reconnect: false,
        socketFactory: () => {
          const socket = new MockSocket();
          mockSockets.push(socket);
          return socket;
        },
      }),
  };
});

const ts = '2026-11-09T00:00:00.000Z';

const refusal = (): IServerMessage[] => [
  {
    kind: 'Error',
    matchId: 'match-1',
    ts,
    code: 'AUTH_REJECTED',
    reason: 'admission refused: NOT_A_MEMBER',
  } as IServerMessage,
  {
    kind: 'Close',
    matchId: 'match-1',
    ts,
    code: 'AUTH_REJECTED',
    reason: 'not an active member of this match',
  } as IServerMessage,
];

/** What the server sends a joining viewer with nothing to replay. */
function replayDrained(socket: MockSocket): void {
  socket.emit({
    kind: 'ReplayStart',
    matchId: 'match-1',
    ts,
    fromSeq: 0,
    totalEvents: 0,
  } as IServerMessage);
  socket.emit({
    kind: 'ReplayChunk',
    matchId: 'match-1',
    ts,
    events: [],
    deliverySequences: [],
  });
  socket.emit({ kind: 'ReplayEnd', matchId: 'match-1', ts, toSeq: 0 });
}

const registrations = (fetchMock: jest.Mock): number =>
  fetchMock.mock.calls.filter(([url]) =>
    String(url).endsWith('/matches/match-1/spectate'),
  ).length;

describe('the spectate page after the server drops the spectator seat', () => {
  let fetchMock: jest.Mock;
  let spectateReplies: Array<{ status: number; body: unknown }>;

  beforeEach(() => {
    mockSockets.length = 0;
    spectateReplies = [];
    fetchMock = jest.fn(async () => {
      const reply = spectateReplies.shift() ?? {
        status: 201,
        body: { slotId: 'spectator-1' },
      };
      return {
        ok: reply.status < 400,
        status: reply.status,
        json: async () => reply.body,
      };
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  /** Unlock, register, connect and drain the first replay. */
  async function watch(): Promise<void> {
    render(<SpectatePage />);
    fireEvent.change(screen.getByPlaceholderText('Vault password'), {
      target: { value: 'vault-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Watch match' }));
    await waitFor(() => expect(mockSockets).toHaveLength(1));
    act(() => mockSockets[0].onopen?.({}));
    act(() => replayDrained(mockSockets[0]));
    await waitFor(() =>
      expect(screen.getByTestId('surface')).toHaveAttribute(
        'data-status',
        'ready',
      ),
    );
  }

  const refuseAdmission = (socket: MockSocket) =>
    act(() => refusal().forEach((message) => socket.emit(message)));

  it('shows Reload and stops rendering the loading surface on reload-required', async () => {
    await watch();
    act(() => mockSockets[0].emit({ kind: 'Error', matchId: 'match-1', ts, code: 'PROTOCOL_VIOLATION', reason: 'reload-required: Reload this tab to join this match.' }));
    expect(await screen.findByRole('button', { name: 'Reload' })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('Reload this tab');
    expect(screen.queryByTestId('surface')).not.toBeInTheDocument();
    expect(registrations(fetchMock)).toBe(1);
  });

  it('registers again once and resumes: rebinds, rejoins and drains the replay', async () => {
    await watch();
    expect(registrations(fetchMock)).toBe(1);

    // The server restarted and released the seat: the reconnect is refused.
    refuseAdmission(mockSockets[0]);

    await waitFor(() => expect(registrations(fetchMock)).toBe(2));
    await waitFor(() => expect(mockSockets).toHaveLength(2));
    act(() => mockSockets[1].onopen?.({}));
    const join = JSON.parse(mockSockets[1].sent[0]) as {
      kind: string;
      matchId: string;
    };
    expect(join).toMatchObject({ kind: 'SessionJoin', matchId: 'match-1' });
    act(() => replayDrained(mockSockets[1]));
    await waitFor(() =>
      expect(screen.getByTestId('surface')).toHaveAttribute(
        'data-status',
        'ready',
      ),
    );
    expect(screen.getByTestId('surface')).toHaveAttribute('data-closed', '');
  });

  it('does not loop: a second refusal before a successful bind registers nothing more', async () => {
    await watch();
    refuseAdmission(mockSockets[0]);
    await waitFor(() => expect(mockSockets).toHaveLength(2));
    act(() => mockSockets[1].onopen?.({}));

    // The rebind is refused as well: the seat is genuinely gone.
    refuseAdmission(mockSockets[1]);

    await waitFor(() =>
      expect(screen.getByTestId('surface')).toHaveAttribute(
        'data-closed',
        'AUTH_REJECTED',
      ),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(registrations(fetchMock)).toBe(2);
    expect(mockSockets).toHaveLength(2);
  });

  it('a successful bind refills the budget for a later restart', async () => {
    await watch();
    refuseAdmission(mockSockets[0]);
    await waitFor(() => expect(mockSockets).toHaveLength(2));
    act(() => mockSockets[1].onopen?.({}));
    act(() => replayDrained(mockSockets[1]));
    await waitFor(() =>
      expect(screen.getByTestId('surface')).toHaveAttribute(
        'data-status',
        'ready',
      ),
    );

    refuseAdmission(mockSockets[1]);

    await waitFor(() => expect(registrations(fetchMock)).toBe(3));
    await waitFor(() => expect(mockSockets).toHaveLength(3));
  });

  it('shows a refused re-registration (a completed match, 409) as an error, with no further socket', async () => {
    await watch();
    spectateReplies.push({
      status: 409,
      body: { error: 'Match is not spectatable (status: completed)' },
    });

    refuseAdmission(mockSockets[0]);

    expect(
      await screen.findByText('Match is not spectatable (status: completed)'),
    ).toBeInTheDocument();
    expect(screen.getByText('Cannot spectate')).toBeInTheDocument();
    expect(registrations(fetchMock)).toBe(2);
    expect(mockSockets).toHaveLength(1);
  });

  it('re-registers only for an admission refusal, not for any other close', async () => {
    await watch();

    act(() =>
      mockSockets[0].emit({
        kind: 'Close',
        matchId: 'match-1',
        ts,
        code: 'UNKNOWN_MATCH',
        reason: 'Match has been closed',
      } as IServerMessage),
    );

    await waitFor(() =>
      expect(screen.getByTestId('surface')).toHaveAttribute(
        'data-closed',
        'UNKNOWN_MATCH',
      ),
    );
    expect(registrations(fetchMock)).toBe(1);
    expect(mockSockets).toHaveLength(1);
  });
});
