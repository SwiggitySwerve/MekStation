import { render, screen } from '@testing-library/react';
import React from 'react';

import type { MatchLogSummary } from '@/services/matchLog/MatchLogService';

const mockRouterPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    pathname: '/gameplay/games',
    query: {},
    events: { on: jest.fn(), off: jest.fn() },
  }),
}));

jest.mock('@/lib/p2p', () => ({
  normalizeRoomCode: (value: string) => value.trim().toUpperCase(),
  useSyncRoomSelector: (
    selector: (state: {
      createRoom: jest.Mock<Promise<string>, []>;
      joinRoom: jest.Mock<Promise<void>, [string]>;
    }) => unknown,
  ) =>
    selector({
      createRoom: jest.fn(async () => 'ROOM01'),
      joinRoom: jest.fn<Promise<void>, [string]>(async () => undefined),
    }),
}));

const mockListMatchLogs = jest.fn<readonly MatchLogSummary[], [number?]>();
jest.mock('@/services/matchLog/MatchLogService', () => ({
  listMatchLogs: (limit?: number) => mockListMatchLogs(limit),
}));

import GamesListPage, { getServerSideProps } from '@/pages/gameplay/games';

describe('GamesListPage real match history', () => {
  beforeEach(() => {
    mockRouterPush.mockReset();
    mockListMatchLogs.mockReset();
  });

  it('sources the list from match-log summaries instead of demo data', async () => {
    const summary: MatchLogSummary = {
      id: 'match-real-1',
      version: 1,
      winner: 'player',
      reason: 'Enemy force destroyed',
      turnCount: 4,
      createdAt: Date.parse('2026-06-21T12:00:00.000Z'),
    };
    mockListMatchLogs.mockReturnValue([summary]);

    expect(typeof getServerSideProps).toBe('function');
    const result = await getServerSideProps({} as never);

    expect(mockListMatchLogs).toHaveBeenCalledWith(50);
    expect(result).toEqual({
      props: {
        games: [
          expect.objectContaining({
            id: 'match-real-1',
            name: 'Match match-real-1',
            status: 'completed',
            turn: 4,
          }),
        ],
      },
    });

    render(
      React.createElement(
        GamesListPage as React.ComponentType<{
          games: readonly {
            id: string;
            name: string;
            status: 'active' | 'completed' | 'abandoned';
            turn: number;
            playerForce: string;
            opponentForce: string;
            createdAt: string;
            updatedAt: string;
          }[];
        }>,
        {
          games: [
            {
              id: 'match-real-1',
              name: 'Match match-real-1',
              status: 'completed',
              turn: 4,
              playerForce: 'Winner: player',
              opponentForce: 'Enemy force destroyed',
              createdAt: new Date(summary.createdAt).toISOString(),
              updatedAt: new Date(summary.createdAt).toISOString(),
            },
          ],
        },
      ),
    );

    expect(screen.getByTestId('game-card-match-real-1')).toBeInTheDocument();
    expect(screen.queryByTestId('game-card-demo')).not.toBeInTheDocument();
  });

  it('renders a real empty state when no match logs exist', () => {
    render(
      React.createElement(
        GamesListPage as React.ComponentType<{ games: readonly [] }>,
        { games: [] },
      ),
    );

    expect(screen.getByTestId('games-empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('game-card-demo')).not.toBeInTheDocument();
  });
});
