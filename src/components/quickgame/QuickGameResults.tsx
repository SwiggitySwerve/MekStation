/**
 * Quick Game Results Component
 * Displays game results with replay and play again options.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

import { useRouter } from 'next/router';
import { useQuickGameStore } from '@/stores/useQuickGameStore';
import { Button, Card } from '@/components/ui';

// =============================================================================
// Result Banner Component
// =============================================================================

interface ResultBannerProps {
  winner: 'player' | 'opponent' | 'draw';
  reason: string | null;
}

function ResultBanner({ winner, reason }: ResultBannerProps): React.ReactElement {
  const config = {
    player: {
      title: 'Victory!',
      color: 'from-emerald-600 to-emerald-800',
      textColor: 'text-emerald-100',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
      ),
    },
    opponent: {
      title: 'Defeat',
      color: 'from-red-600 to-red-800',
      textColor: 'text-red-100',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    draw: {
      title: 'Draw',
      color: 'from-amber-600 to-amber-800',
      textColor: 'text-amber-100',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  };

  const { title, color, textColor, icon } = config[winner];

  return (
    <div className={`bg-gradient-to-r ${color} rounded-xl p-8 text-center`}>
      <div className={`${textColor} mb-4 flex justify-center`}>{icon}</div>
      <h2 className={`text-3xl font-bold ${textColor} mb-2`}>{title}</h2>
      {reason && (
        <p className={`${textColor} opacity-80 capitalize`}>
          {reason.replace(/_/g, ' ')}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Battle Summary Component
// =============================================================================

function BattleSummary(): React.ReactElement {
  const { game } = useQuickGameStore();

  if (!game) return <></>;

  const playerUnitsDestroyed = game.playerForce.units.filter((u) => u.isDestroyed).length;
  const playerUnitsWithdrawn = game.playerForce.units.filter((u) => u.isWithdrawn).length;
  const opponentUnitsDestroyed = game.opponentForce?.units.filter((u) => u.isDestroyed).length ?? 0;

  const startTime = new Date(game.startedAt);
  const endTime = game.endedAt ? new Date(game.endedAt) : new Date();
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationMinutes = Math.floor(durationMs / 60000);

  return (
    <Card>
      <div className="p-4 border-b border-gray-700">
        <h3 className="font-medium text-white">Battle Summary</h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Your Losses</p>
            <p className="text-white">
              {playerUnitsDestroyed} destroyed
              {playerUnitsWithdrawn > 0 && `, ${playerUnitsWithdrawn} withdrawn`}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Enemy Losses</p>
            <p className="text-white">{opponentUnitsDestroyed} destroyed</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Turns Played</p>
            <p className="text-white">{game.turn}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Duration</p>
            <p className="text-white">{durationMinutes} minutes</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// Main Results Component
// =============================================================================

export function QuickGameResults(): React.ReactElement {
  const router = useRouter();
  const { game, playAgain, clearGame } = useQuickGameStore();

  if (!game) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-gray-400">No game results to display.</p>
          <Button
            variant="primary"
            onClick={() => router.push('/gameplay/quick')}
            className="mt-4"
          >
            Start New Game
          </Button>
        </Card>
      </div>
    );
  }

  const handlePlayAgainSameUnits = () => {
    playAgain(false);
  };

  const handlePlayAgainNewUnits = () => {
    playAgain(true);
  };

  const handleExit = () => {
    clearGame();
    router.push('/gameplay/games');
  };

  return (
    <div className="max-w-2xl mx-auto p-4 py-8">
      {/* Result banner */}
      <div className="mb-6">
        <ResultBanner winner={game.winner ?? 'draw'} reason={game.victoryReason} />
      </div>

      {/* Battle summary */}
      <div className="mb-6">
        <BattleSummary />
      </div>

      {/* Scenario info */}
      <Card className="mb-6 bg-gray-800/50">
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Scenario</h3>
          <p className="text-white">{game.scenario?.template.name}</p>
          <p className="text-xs text-gray-500 mt-1">
            {game.scenario?.mapPreset.name} - {game.scenario?.mapPreset.biome}
          </p>
        </div>
      </Card>

      {/* Event timeline link */}
      {game.events.length > 0 && (
        <Card className="mb-6">
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">Battle Timeline</p>
              <p className="text-xs text-gray-500">{game.events.length} events recorded</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                // In a full implementation, this would link to a replay view
                console.log('View timeline');
              }}
            >
              View Timeline
            </Button>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <Button
          variant="primary"
          className="w-full"
          onClick={handlePlayAgainSameUnits}
          data-testid="play-again-same-btn"
        >
          Play Again (Same Units)
        </Button>

        <Button
          variant="secondary"
          className="w-full"
          onClick={handlePlayAgainNewUnits}
          data-testid="play-again-new-btn"
        >
          Play Again (New Force)
        </Button>

        <Button
          variant="secondary"
          className="w-full"
          onClick={handleExit}
          data-testid="exit-btn"
        >
          Exit to Games
        </Button>
      </div>

      {/* Note about session */}
      <p className="text-center text-xs text-gray-500 mt-6">
        This was a quick game session. No data is persisted.
      </p>
    </div>
  );
}
