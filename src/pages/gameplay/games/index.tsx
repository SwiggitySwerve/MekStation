/**
 * Games List Page
 * Browse active and completed game sessions.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import type { GetServerSideProps } from 'next';

import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useState } from 'react';

import type { MatchLogSummary } from '@/services/matchLog/MatchLogService';

import { PageLayout, Card, Button, EmptyState, Badge } from '@/components/ui';
import { normalizeRoomCode, useSyncRoomSelector } from '@/lib/p2p';

// =============================================================================
// Types
// =============================================================================

export interface GameSummary {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'abandoned';
  turn: number;
  playerForce: string;
  opponentForce: string;
  createdAt: string;
  updatedAt: string;
}

interface GamesListPageProps {
  readonly games: readonly GameSummary[];
}

function mapMatchLogToGame(summary: MatchLogSummary): GameSummary {
  const createdAt = new Date(summary.createdAt).toISOString();
  return {
    id: summary.id,
    name: `Match ${summary.id}`,
    status: 'completed',
    turn: summary.turnCount,
    playerForce: summary.winner ? `Winner: ${summary.winner}` : 'No winner',
    opponentForce: summary.reason || 'Battle logged',
    createdAt,
    updatedAt: createdAt,
  };
}

export const getServerSideProps: GetServerSideProps<
  GamesListPageProps
> = async () => {
  const { listMatchLogs } = await import('@/services/matchLog/MatchLogService');
  return {
    props: {
      games: listMatchLogs(50).map(mapMatchLogToGame),
    },
  };
};

// =============================================================================
// Sub-Components
// =============================================================================

interface GameCardProps {
  game: GameSummary;
  onClick: () => void;
}

function GameCard({ game, onClick }: GameCardProps): React.ReactElement {
  const statusVariant = {
    active: 'success',
    completed: 'info',
    abandoned: 'muted',
  } as const;

  return (
    <Card
      className="hover:ring-accent/50 cursor-pointer transition-all hover:ring-2"
      onClick={onClick}
      data-testid={`game-card-${game.id}`}
    >
      <div className="mb-3 flex items-start justify-between">
        <h3 className="text-text-theme-primary text-lg font-bold">
          {game.name}
        </h3>
        <Badge variant={statusVariant[game.status]} size="sm">
          {game.status}
        </Badge>
      </div>
      <div className="text-text-theme-secondary space-y-1 text-sm">
        <p>
          <span className="text-text-theme-primary font-medium">Turn:</span>{' '}
          {game.turn}
        </p>
        <p>
          <span className="text-text-theme-primary font-medium">Player:</span>{' '}
          {game.playerForce}
        </p>
        <p>
          <span className="text-text-theme-primary font-medium">Opponent:</span>{' '}
          {game.opponentForce}
        </p>
      </div>
      <div className="border-border-theme-subtle text-text-theme-muted mt-4 border-t pt-3 text-xs">
        Last played: {new Date(game.updatedAt).toLocaleDateString()}
      </div>
    </Card>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function GamesListPage({
  games,
}: GamesListPageProps): React.ReactElement {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [networkError, setNetworkError] = useState<string | null>(null);
  const createRoom = useSyncRoomSelector((state) => state.createRoom);
  const joinRoom = useSyncRoomSelector((state) => state.joinRoom);

  // Handle game click
  const handleGameClick = useCallback(
    (game: GameSummary) => {
      router.push(`/gameplay/games/${game.id}`);
    },
    [router],
  );

  // Handle new game
  const handleNewGame = useCallback(() => {
    router.push('/gameplay/games/demo');
  }, [router]);

  const handleCreateNetworked = useCallback(async () => {
    setNetworkError(null);
    try {
      const code = await createRoom();
      await router.push(`/gameplay/lobby/${encodeURIComponent(code)}?host=1`);
    } catch (error) {
      setNetworkError(
        error instanceof Error ? error.message : 'Failed to create lobby',
      );
    }
  }, [createRoom, router]);

  const handleJoinNetworked = useCallback(async () => {
    const code = normalizeRoomCode(joinCode);
    if (!code) return;
    setNetworkError(null);
    try {
      await joinRoom(code);
      await router.push(`/gameplay/lobby/${encodeURIComponent(code)}`);
    } catch (error) {
      setNetworkError(
        error instanceof Error ? error.message : 'Failed to join lobby',
      );
    }
  }, [joinCode, joinRoom, router]);

  return (
    <PageLayout
      title="Games"
      subtitle="Active and completed game sessions"
      maxWidth="wide"
      headerContent={
        <Button
          variant="primary"
          onClick={handleNewGame}
          data-testid="new-game-btn"
        >
          New Game (Demo)
        </Button>
      }
    >
      <section className="mb-6 rounded-lg border border-slate-800 bg-slate-950 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Networked 1v1
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Create or join a peer-to-peer lobby.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="success" onClick={handleCreateNetworked}>
              Create Lobby
            </Button>
            <div className="flex gap-2">
              <input
                aria-label="Networked 1v1 room code"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                placeholder="Room code"
                className="min-h-[44px] rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 uppercase"
              />
              <Button
                variant="secondary"
                onClick={handleJoinNetworked}
                disabled={normalizeRoomCode(joinCode).length === 0}
              >
                Join
              </Button>
            </div>
          </div>
        </div>
        {networkError && (
          <p className="mt-3 text-sm text-rose-300" role="alert">
            {networkError}
          </p>
        )}
      </section>

      {/* Games Grid */}
      {games.length === 0 ? (
        <EmptyState
          data-testid="games-empty-state"
          icon={
            <div className="bg-surface-raised/50 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
              <svg
                className="text-text-theme-muted h-8 w-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          }
          title="No games yet"
          message="Start a new game or complete a match to build your history"
          action={
            <Button variant="primary" onClick={handleNewGame}>
              Start Demo Game
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onClick={() => handleGameClick(game)}
            />
          ))}
        </div>
      )}

      {/* Navigation links */}
      <div className="border-border-theme-subtle mt-8 flex gap-6 border-t pt-6">
        <Link
          href="/gameplay/forces"
          className="text-accent hover:text-accent/80 inline-flex items-center gap-2 transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          Manage Forces
        </Link>
        <Link
          href="/gameplay/pilots"
          className="text-accent hover:text-accent/80 inline-flex items-center gap-2 transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Manage Pilots
        </Link>
      </div>
    </PageLayout>
  );
}
