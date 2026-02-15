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
      className="flex h-screen items-center justify-center bg-gray-900"
      data-testid="game-loading"
    >
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="text-gray-400">Loading game session...</p>
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

  const winnerText =
    winner === 'draw'
      ? 'Draw'
      : winner === GameSide.Player
        ? 'Victory'
        : 'Defeat';

  const winnerColor =
    winner === 'draw'
      ? 'text-amber-400'
      : winner === GameSide.Player
        ? 'text-emerald-400'
        : 'text-red-400';

  const handleReturnToCampaign = useCallback(() => {
    if (!campaignId || !missionId) {
      return;
    }

    const resultValue =
      winner === GameSide.Player
        ? 'victory'
        : winner === GameSide.Opponent
          ? 'defeat'
          : 'draw';

    const damageStates: IUnitDamageState[] = [];
    if (unitStates) {
      const rosterUnits = rosterStore.getState().units;
      for (const unit of rosterUnits) {
        const gameUnit = Object.values(unitStates).find(
          (unitState) =>
            unitState.side === GameSide.Player && unitState.id === unit.unitId,
        );

        if (gameUnit) {
          const armorDamage: Record<string, number> = {};
          for (const [location, maxValue] of Object.entries(gameUnit.armor)) {
            const currentValue = gameUnit.armor[location] ?? 0;
            const difference = (maxValue ?? 0) - currentValue;
            if (difference > 0) {
              armorDamage[location] = difference;
            }
          }

          const structureDamage: Record<string, number> = {};
          for (const [location, value] of Object.entries(gameUnit.structure)) {
            const maxStructure = gameUnit.structure[location] ?? 0;
            const difference = maxStructure - (value ?? 0);
            if (difference > 0) {
              structureDamage[location] = difference;
            }
          }

          damageStates.push({
            unitId: unit.unitId,
            armorDamage,
            structureDamage,
            destroyedComponents: [...gameUnit.destroyedLocations],
            destroyed: gameUnit.destroyed,
          });
        }
      }
    }

    rosterStore
      .getState()
      .completeMission(
        missionId,
        resultValue as 'victory' | 'defeat' | 'draw',
        damageStates,
        gameId,
      );

    void router.push(`/gameplay/campaigns/${campaignId}`);
  }, [campaignId, missionId, winner, unitStates, rosterStore, gameId, router]);

  return (
    <div
      className="flex h-screen items-center justify-center bg-gray-900"
      data-testid="game-completed"
    >
      <div className="max-w-lg text-center">
        <div className={`mb-4 text-6xl font-bold ${winnerColor}`}>
          {winnerText}
        </div>
        <p className="mb-8 text-lg text-gray-400 capitalize">
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

        <div className="mt-8 border-t border-gray-700 pt-8">
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
      className="flex h-screen items-center justify-center bg-gray-900"
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
        <h2 className="mb-2 text-xl font-bold text-white">
          Failed to Load Game
        </h2>
        <p className="mb-4 text-gray-400">{message}</p>
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
