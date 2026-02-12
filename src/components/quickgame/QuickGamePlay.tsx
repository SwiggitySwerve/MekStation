/**
 * Quick Game Play Component
 * Launches auto-resolved battle via GameEngine and displays progress.
 * Transitions to Results step when battle completes.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

import { useEffect, useRef } from 'react';

import { Card } from '@/components/ui';
import { useQuickGameStore } from '@/stores/useQuickGameStore';
import { GameStatus } from '@/types/gameplay';

// =============================================================================
// Unit Card Component
// =============================================================================

interface UnitCardProps {
  unit: {
    instanceId: string;
    name: string;
    chassis: string;
    variant: string;
    bv: number;
    tonnage: number;
    gunnery: number;
    piloting: number;
    pilotName?: string;
    heat: number;
    isDestroyed: boolean;
    isWithdrawn: boolean;
  };
  isPlayer: boolean;
}

function UnitCard({ unit, isPlayer }: UnitCardProps): React.ReactElement {
  return (
    <div
      className={`rounded-lg border p-3 ${
        unit.isDestroyed
          ? 'border-red-700/50 bg-red-900/30 opacity-60'
          : unit.isWithdrawn
            ? 'border-amber-700/50 bg-amber-900/30 opacity-60'
            : isPlayer
              ? 'border-cyan-700/50 bg-cyan-900/20'
              : 'border-red-700/50 bg-red-900/20'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p
            className={`text-sm font-medium ${unit.isDestroyed ? 'line-through' : ''}`}
          >
            {unit.name}
          </p>
          <p className="text-xs text-gray-500">
            {unit.pilotName && `${unit.pilotName} - `}
            {unit.gunnery}/{unit.piloting}
          </p>
        </div>
        <div className="text-right text-xs text-gray-400">
          <p>{unit.tonnage}t</p>
          <p>{unit.bv} BV</p>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        {unit.heat > 0 && (
          <span className="rounded bg-orange-900/50 px-1.5 py-0.5 text-xs text-orange-300">
            Heat: {unit.heat}
          </span>
        )}
        {unit.isDestroyed && (
          <span className="rounded bg-red-900/50 px-1.5 py-0.5 text-xs text-red-300">
            Destroyed
          </span>
        )}
        {unit.isWithdrawn && (
          <span className="rounded bg-amber-900/50 px-1.5 py-0.5 text-xs text-amber-300">
            Withdrawn
          </span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Play Component
// =============================================================================

export function QuickGamePlay(): React.ReactElement {
  const { game, isLoading, error, startBattle } = useQuickGameStore();
  const battleStarted = useRef(false);

  useEffect(() => {
    if (
      game &&
      game.status === GameStatus.Active &&
      !isLoading &&
      !battleStarted.current
    ) {
      battleStarted.current = true;
      startBattle();
    }
  }, [game, isLoading, startBattle]);

  if (!game) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-400">No game in progress</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <Card className="mx-4 max-w-md border-red-700/50">
          <div className="p-6 text-center">
            <svg
              className="mx-auto mb-4 h-12 w-12 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <h3 className="mb-2 text-lg font-medium text-red-300">
              Battle Error
            </h3>
            <p className="text-sm text-gray-400">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading || game.status === GameStatus.Active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="mx-4 max-w-lg text-center">
          <div className="mb-8">
            <div className="relative mx-auto h-16 w-16">
              <div className="absolute inset-0 animate-ping rounded-full border-2 border-cyan-400/30" />
              <div className="absolute inset-2 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              <div className="absolute inset-4 rounded-full bg-cyan-400/10" />
            </div>
          </div>

          <h2 className="mb-2 text-xl font-bold text-white">
            Resolving Battle...
          </h2>
          <p className="mb-8 text-sm text-gray-400">
            The GameEngine is auto-resolving combat between forces
          </p>

          <Card className="border-cyan-500/30 bg-gradient-to-r from-cyan-900/20 to-purple-900/20">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white">
                    {game.scenario?.template.name}
                  </h3>
                  <p className="mt-1 text-xs text-gray-400">
                    {game.scenario?.mapPreset.name} -{' '}
                    {game.scenario?.mapPreset.biome}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Forces</p>
                  <p className="text-white">
                    <span className="text-cyan-400">
                      {game.playerForce.units.length}
                    </span>
                    {' vs '}
                    <span className="text-red-400">
                      {game.opponentForce?.units.length ?? 0}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Card>
              <div className="border-b border-gray-700 p-3">
                <h3 className="text-sm font-medium text-cyan-400">
                  Your Force
                </h3>
              </div>
              <div className="space-y-2 p-3">
                {game.playerForce.units.map((unit) => (
                  <UnitCard key={unit.instanceId} unit={unit} isPlayer />
                ))}
              </div>
            </Card>

            <Card>
              <div className="border-b border-gray-700 p-3">
                <h3 className="text-sm font-medium text-red-400">
                  Enemy Force
                </h3>
              </div>
              <div className="space-y-2 p-3">
                {game.opponentForce?.units.map((unit) => (
                  <UnitCard
                    key={unit.instanceId}
                    unit={unit}
                    isPlayer={false}
                  />
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <Card className="p-8 text-center">
        <p className="text-gray-400">Battle complete. Loading results...</p>
      </Card>
    </div>
  );
}
