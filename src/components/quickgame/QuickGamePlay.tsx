/**
 * Quick Game Play Component
 * Displays the active game state and allows basic game control.
 * This is a simplified version - full game interface integration is TODO.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

import { useState } from 'react';

import { Button, Card } from '@/components/ui';
import { useQuickGameStore } from '@/stores/useQuickGameStore';
import { GamePhase } from '@/types/gameplay';

import { QuickGameTimeline } from './QuickGameTimeline';

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
  onDestroy?: () => void;
}

function UnitCard({
  unit,
  isPlayer,
  onDestroy,
}: UnitCardProps): React.ReactElement {
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

      {/* Status indicators */}
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

      {/* Quick action - for demo purposes */}
      {!unit.isDestroyed && !unit.isWithdrawn && onDestroy && (
        <button
          onClick={onDestroy}
          className="mt-2 text-xs text-red-400 underline hover:text-red-300"
        >
          Mark Destroyed (Demo)
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Phase Display Component
// =============================================================================

interface PhaseDisplayProps {
  phase: GamePhase;
  turn: number;
}

function PhaseDisplay({ phase, turn }: PhaseDisplayProps): React.ReactElement {
  const phaseLabels: Record<GamePhase, string> = {
    [GamePhase.Initiative]: 'Initiative',
    [GamePhase.Movement]: 'Movement',
    [GamePhase.WeaponAttack]: 'Weapon Attack',
    [GamePhase.PhysicalAttack]: 'Physical Attack',
    [GamePhase.Heat]: 'Heat',
    [GamePhase.End]: 'End Phase',
  };

  return (
    <div className="flex items-center gap-4 border-b border-gray-700 bg-gray-800 px-4 py-2">
      <div className="flex items-center gap-2">
        <span className="text-xs tracking-wide text-gray-500 uppercase">
          Turn
        </span>
        <span className="text-lg font-bold text-cyan-400">{turn}</span>
      </div>
      <div className="h-6 w-px bg-gray-700" />
      <div className="flex items-center gap-2">
        <span className="text-xs tracking-wide text-gray-500 uppercase">
          Phase
        </span>
        <span className="text-sm font-medium text-white">
          {phaseLabels[phase]}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Main Play Component
// =============================================================================

export function QuickGamePlay(): React.ReactElement {
  const { game, endGame } = useQuickGameStore();
  const [showEndModal, setShowEndModal] = useState(false);

  if (!game) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-400">No game in progress</p>
      </div>
    );
  }

  // Count active units
  const playerAlive = game.playerForce.units.filter(
    (u) => !u.isDestroyed && !u.isWithdrawn,
  ).length;
  const opponentAlive =
    game.opponentForce?.units.filter((u) => !u.isDestroyed && !u.isWithdrawn)
      .length ?? 0;

  const handleEndGame = (winner: 'player' | 'opponent' | 'draw') => {
    const reasons = {
      player: 'Player victory',
      opponent: 'Enemy victory',
      draw: 'Draw',
    };
    endGame(winner, reasons[winner]);
    setShowEndModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Phase indicator */}
      <PhaseDisplay phase={game.phase} turn={game.turn} />

      {/* Main content */}
      <div className="p-4">
        {/* Info banner */}
        <Card className="mb-4 border-cyan-500/30 bg-gradient-to-r from-cyan-900/20 to-purple-900/20">
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
                <p className="text-sm text-gray-400">Active Units</p>
                <p className="text-white">
                  <span className="text-cyan-400">{playerAlive}</span>
                  {' vs '}
                  <span className="text-red-400">{opponentAlive}</span>
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Notice about simplified interface */}
        <Card className="mb-4 border-amber-700/50 bg-amber-900/20">
          <div className="flex items-start gap-3 p-4">
            <svg
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-300">
                Simplified Game Interface
              </p>
              <p className="mt-1 text-xs text-amber-200/70">
                This is a demo interface. The full hex map and combat resolution
                system will be integrated in a future update. For now, you can
                manually mark units as destroyed and end the game.
              </p>
            </div>
          </div>
        </Card>

        {/* Forces grid */}
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          {/* Player Force */}
          <Card>
            <div className="border-b border-gray-700 p-3">
              <h3 className="font-medium text-cyan-400">Your Force</h3>
              <p className="text-xs text-gray-500">
                {playerAlive} of {game.playerForce.units.length} active
              </p>
            </div>
            <div className="space-y-2 p-3">
              {game.playerForce.units.map((unit) => (
                <UnitCard key={unit.instanceId} unit={unit} isPlayer />
              ))}
            </div>
          </Card>

          {/* Opponent Force */}
          <Card>
            <div className="border-b border-gray-700 p-3">
              <h3 className="font-medium text-red-400">Enemy Force</h3>
              <p className="text-xs text-gray-500">
                {opponentAlive} of {game.opponentForce?.units.length ?? 0}{' '}
                active
              </p>
            </div>
            <div className="space-y-2 p-3">
              {game.opponentForce?.units.map((unit) => (
                <UnitCard key={unit.instanceId} unit={unit} isPlayer={false} />
              ))}
            </div>
          </Card>
        </div>

        {/* Game control */}
        <Card>
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-white">Game Control</p>
              <p className="text-xs text-gray-500">End the game manually</p>
            </div>
            <Button variant="secondary" onClick={() => setShowEndModal(true)}>
              End Game
            </Button>
          </div>
        </Card>

        {/* Session timeline */}
        {game.events.length > 0 && (
          <div className="mt-4">
            <QuickGameTimeline />
          </div>
        )}
      </div>

      {/* End game modal */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <Card className="mx-4 w-full max-w-sm">
            <div className="border-b border-gray-700 p-4">
              <h3 className="font-medium text-white">End Game</h3>
            </div>
            <div className="space-y-3 p-4">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => handleEndGame('player')}
              >
                Victory (Player Wins)
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => handleEndGame('opponent')}
              >
                Defeat (Enemy Wins)
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => handleEndGame('draw')}
              >
                Draw
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setShowEndModal(false)}
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
