import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback } from 'react';

import type { IUnitGameState } from '@/types/gameplay/GameSessionInterfaces';

import { Button } from '@/components/ui';
import {
  useCampaignRosterStore,
  type IUnitDamageState,
} from '@/stores/campaign/useCampaignRosterStore';
import { GameSide } from '@/types/gameplay';

export function GameLoading(): React.ReactElement {
  return (
    <div
      className="bg-surface-deep flex h-screen items-center justify-center"
      data-testid="game-loading"
    >
      <div className="text-center">
        <div className="border-accent mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" />
        <p className="text-text-theme-secondary">Loading game session...</p>
      </div>
    </div>
  );
}

interface CompletedGameProps {
  gameId: string;
  winner: GameSide | 'draw';
  reason: string;
  campaignId?: string;
  missionId?: string;
  unitStates?: Record<string, IUnitGameState>;
}

function getWinnerText(winner: GameSide | 'draw'): string {
  if (winner === 'draw') return 'Draw';
  return winner === GameSide.Player ? 'Victory' : 'Defeat';
}

function getWinnerColor(winner: GameSide | 'draw'): string {
  if (winner === 'draw') return 'text-amber-400';
  return winner === GameSide.Player ? 'text-emerald-400' : 'text-red-400';
}

function getMissionResult(
  winner: GameSide | 'draw',
): 'victory' | 'defeat' | 'draw' {
  if (winner === GameSide.Player) return 'victory';
  return winner === GameSide.Opponent ? 'defeat' : 'draw';
}

function calculateLocationDamage(
  values: Record<string, number | undefined>,
): Record<string, number> {
  const damage: Record<string, number> = {};
  for (const [location, maxValue] of Object.entries(values)) {
    const currentValue = values[location] ?? 0;
    const difference = (maxValue ?? 0) - currentValue;
    if (difference > 0) {
      damage[location] = difference;
    }
  }
  return damage;
}

function buildDamageStates(
  unitStates: Record<string, IUnitGameState> | undefined,
  rosterUnits: readonly { unitId: string }[],
): IUnitDamageState[] {
  if (!unitStates) return [];

  const gameUnits = Object.values(unitStates);
  return rosterUnits.flatMap((unit) => {
    const gameUnit = gameUnits.find(
      (unitState) =>
        unitState.side === GameSide.Player && unitState.id === unit.unitId,
    );
    if (!gameUnit) return [];

    return [
      {
        unitId: unit.unitId,
        armorDamage: calculateLocationDamage(gameUnit.armor),
        structureDamage: calculateLocationDamage(gameUnit.structure),
        destroyedComponents: [...gameUnit.destroyedLocations],
        destroyed: gameUnit.destroyed,
      },
    ];
  });
}

export function CompletedGame({
  gameId,
  winner,
  reason,
  campaignId,
  missionId,
  unitStates,
}: CompletedGameProps): React.ReactElement {
  const router = useRouter();
  const rosterStore = useCampaignRosterStore;

  const winnerText = getWinnerText(winner);
  const winnerColor = getWinnerColor(winner);

  const handleReturnToCampaign = useCallback(() => {
    if (!campaignId || !missionId) {
      return;
    }

    const damageStates = buildDamageStates(
      unitStates,
      rosterStore.getState().units,
    );

    rosterStore
      .getState()
      .completeMission(
        missionId,
        getMissionResult(winner),
        damageStates,
        gameId,
      );

    void router.push(`/gameplay/campaigns/${campaignId}`);
  }, [campaignId, missionId, winner, unitStates, rosterStore, gameId, router]);

  return (
    <div
      className="bg-surface-deep flex h-screen items-center justify-center"
      data-testid="game-completed"
    >
      <div className="max-w-lg text-center">
        <div className={`mb-4 text-6xl font-bold ${winnerColor}`}>
          {winnerText}
        </div>
        <p className="text-text-theme-secondary mb-8 text-lg capitalize">
          {reason.replace('_', ' ')}
        </p>

        <div className="flex flex-col items-center gap-4">
          {campaignId && missionId && (
            <Button
              variant="primary"
              size="lg"
              onClick={handleReturnToCampaign}
              data-testid="return-to-campaign-btn"
            >
              Return to Campaign
            </Button>
          )}

          <div className="flex items-center justify-center gap-4">
            <Link href={`/gameplay/games/${gameId}/replay`}>
              <Button
                variant={campaignId ? 'secondary' : 'primary'}
                size="lg"
                data-testid="replay-game-btn"
              >
                Replay Game
              </Button>
            </Link>
            <Link href="/gameplay/games">
              <Button
                variant="secondary"
                size="lg"
                data-testid="back-to-games-btn"
              >
                Back to Games
              </Button>
            </Link>
          </div>
        </div>

        <div className="border-border-theme mt-8 border-t pt-8">
          <Link
            href={`/audit/timeline?gameId=${gameId}`}
            className="flex items-center justify-center gap-2 text-sm text-cyan-400 transition-colors hover:text-cyan-300"
          >
            View Full Event Timeline
          </Link>
        </div>
      </div>
    </div>
  );
}

interface GameErrorProps {
  message: string;
  onRetry: () => void;
}

export function GameError({
  message,
  onRetry,
}: GameErrorProps): React.ReactElement {
  return (
    <div
      className="bg-surface-deep flex h-screen items-center justify-center"
      data-testid="game-error"
    >
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-900/20">
          <svg
            className="h-8 w-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-text-theme-primary mb-2 text-xl font-bold">
          Failed to Load Game
        </h2>
        <p className="text-text-theme-secondary mb-4">{message}</p>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="primary"
            onClick={onRetry}
            data-testid="game-retry-btn"
          >
            Try Again
          </Button>
          <Link href="/gameplay/games">
            <Button variant="secondary" data-testid="back-to-games-btn">
              Back to Games
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
