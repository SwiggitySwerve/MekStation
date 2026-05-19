/**
 * MatchBrowser component tests — M3 (task 3).
 *
 * Covers the Match Browser requirement scenarios: lists joinable
 * lobbies with layout/host/occupancy, one-click join navigates to
 * `/multiplayer/lobby/[roomCode]`, reflects lobby lifecycle changes on
 * refresh, and shows an empty state (not an error) when no lobbies.
 *
 * @spec openspec/changes/add-matchmaking-and-spectator/specs/multiplayer-matchmaking/spec.md
 */

import '@testing-library/jest-dom';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import type { IJoinableLobby } from '@/lib/multiplayer/server/joinableLobbies';

import { MatchBrowser } from '../MatchBrowser';

function lobby(overrides: Partial<IJoinableLobby> = {}): IJoinableLobby {
  return {
    matchId: 'm1',
    roomCode: 'ABC123',
    layout: '1v1',
    hostDisplayName: 'Host One',
    occupancy: {
      humanSeats: 2,
      occupiedHumanSeats: 1,
      openHumanSeats: 1,
      aiSeats: 0,
      spectatorSeats: 0,
    },
    fogOfWar: false,
    createdAt: '2026-05-10T00:00:00.000Z',
    ...overrides,
  };
}

/** A fetch stub that returns the given lobby list as the JSON body. */
function fetchReturning(
  lobbies: readonly IJoinableLobby[],
): jest.Mock<Promise<Response>> {
  return jest.fn(async () =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: async () => Promise.resolve({ lobbies }),
    } as Response),
  );
}

describe('MatchBrowser', () => {
  it('shows the unlock prompt when no token is supplied', () => {
    render(<MatchBrowser wireToken={null} onJoinLobby={jest.fn()} />);
    expect(screen.getByTestId('match-browser')).toBeInTheDocument();
    expect(screen.queryByTestId('match-browser-list')).not.toBeInTheDocument();
  });

  it('lists joinable lobbies with layout, host, and occupancy', async () => {
    // Scenario: Browser lists joinable lobbies.
    const fetchImpl = fetchReturning([
      lobby({ matchId: 'm1', roomCode: 'ROOM01', hostDisplayName: 'Alice' }),
      lobby({ matchId: 'm2', roomCode: 'ROOM02', hostDisplayName: 'Bob' }),
    ]);
    render(
      <MatchBrowser
        wireToken="tok"
        onJoinLobby={jest.fn()}
        fetchImpl={fetchImpl as unknown as typeof fetch}
        refreshMs={0}
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('match-browser-list')).toBeInTheDocument(),
    );
    const rows = screen.getAllByTestId('match-browser-row');
    expect(rows).toHaveLength(2);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('one-click join navigates to the lobby room code', async () => {
    // Scenario: One-click join navigates into the lobby.
    const onJoinLobby = jest.fn();
    const fetchImpl = fetchReturning([lobby({ roomCode: 'JOINME' })]);
    render(
      <MatchBrowser
        wireToken="tok"
        onJoinLobby={onJoinLobby}
        fetchImpl={fetchImpl as unknown as typeof fetch}
        refreshMs={0}
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('match-browser-join')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('match-browser-join'));
    expect(onJoinLobby).toHaveBeenCalledWith('JOINME');
  });

  it('shows an empty state — not an error — when no lobbies', async () => {
    // Scenario: Empty browser state.
    const fetchImpl = fetchReturning([]);
    render(
      <MatchBrowser
        wireToken="tok"
        onJoinLobby={jest.fn()}
        fetchImpl={fetchImpl as unknown as typeof fetch}
        refreshMs={0}
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('match-browser-empty')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('match-browser-error')).not.toBeInTheDocument();
  });

  it('reflects lobby lifecycle changes on explicit refresh', async () => {
    // Scenario: Browser reflects lobby lifecycle changes — a lobby that
    // fills up or launches drops off the list after a refresh.
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () =>
          Promise.resolve({ lobbies: [lobby({ roomCode: 'GONE01' })] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => Promise.resolve({ lobbies: [] }),
      });
    render(
      <MatchBrowser
        wireToken="tok"
        onJoinLobby={jest.fn()}
        fetchImpl={fetchImpl as unknown as typeof fetch}
        refreshMs={0}
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('match-browser-list')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('match-browser-refresh'));
    await waitFor(() =>
      expect(screen.getByTestId('match-browser-empty')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('match-browser-row')).not.toBeInTheDocument();
  });

  it('surfaces a fetch failure as an error state', async () => {
    const fetchImpl = jest.fn(async () =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: async () => Promise.resolve({ error: 'boom' }),
      } as Response),
    );
    render(
      <MatchBrowser
        wireToken="tok"
        onJoinLobby={jest.fn()}
        fetchImpl={fetchImpl as unknown as typeof fetch}
        refreshMs={0}
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('match-browser-error')).toBeInTheDocument(),
    );
  });

  it('auto-refreshes on the interval', async () => {
    jest.useFakeTimers();
    try {
      const fetchImpl = fetchReturning([lobby()]);
      render(
        <MatchBrowser
          wireToken="tok"
          onJoinLobby={jest.fn()}
          fetchImpl={fetchImpl as unknown as typeof fetch}
          refreshMs={1000}
        />,
      );
      // initial fetch
      await act(async () => {
        await Promise.resolve();
      });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });
});
