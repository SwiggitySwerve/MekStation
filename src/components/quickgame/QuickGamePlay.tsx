/**
 * Quick Game Play Component
 * Displays the active game state and allows basic game control.
 * This is a simplified version - full game interface integration is TODO.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

import { useState } from 'react';
import { useQuickGameStore } from '@/stores/useQuickGameStore';
import { Button, Card } from '@/components/ui';
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

function UnitCard({ unit, isPlayer, onDestroy }: UnitCardProps): React.ReactElement {
  return (
    <div
      className={`p-3 rounded-lg border ${
        unit.isDestroyed
          ? 'bg-red-900/30 border-red-700/50 opacity-60'
          : unit.isWithdrawn
          ? 'bg-amber-900/30 border-amber-700/50 opacity-60'
          : isPlayer
          ? 'bg-cyan-900/20 border-cyan-700/50'
          : 'bg-red-900/20 border-red-700/50'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={`font-medium text-sm ${unit.isDestroyed ? 'line-through' : ''}`}>
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
      <div className="flex items-center gap-2 mt-2">
        {unit.heat > 0 && (
          <span className="text-xs px-1.5 py-0.5 bg-orange-900/50 text-orange-300 rounded">
            Heat: {unit.heat}
          </span>
        )}
        {unit.isDestroyed && (
          <span className="text-xs px-1.5 py-0.5 bg-red-900/50 text-red-300 rounded">
            Destroyed
          </span>
        )}
        {unit.isWithdrawn && (
          <span className="text-xs px-1.5 py-0.5 bg-amber-900/50 text-amber-300 rounded">
            Withdrawn
          </span>
        )}
      </div>

      {/* Quick action - for demo purposes */}
      {!unit.isDestroyed && !unit.isWithdrawn && onDestroy && (
        <button
          onClick={onDestroy}
          className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
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
    <div className="flex items-center gap-4 px-4 py-2 bg-gray-800 border-b border-gray-700">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 uppercase tracking-wide">Turn</span>
        <span className="text-lg font-bold text-cyan-400">{turn}</span>
      </div>
      <div className="h-6 w-px bg-gray-700" />
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 uppercase tracking-wide">Phase</span>
        <span className="text-sm font-medium text-white">{phaseLabels[phase]}</span>
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
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">No game in progress</p>
      </div>
    );
  }

  // Count active units
  const playerAlive = game.playerForce.units.filter((u) => !u.isDestroyed && !u.isWithdrawn).length;
  const opponentAlive =
    game.opponentForce?.units.filter((u) => !u.isDestroyed && !u.isWithdrawn).length ?? 0;

  // Check for victory conditions
  const checkVictory = () => {
    if (playerAlive === 0 && opponentAlive > 0) {
      endGame('opponent', 'All player units destroyed');
    } else if (opponentAlive === 0 && playerAlive > 0) {
      endGame('player', 'All enemy units destroyed');
    } else if (playerAlive === 0 && opponentAlive === 0) {
      endGame('draw', 'Mutual destruction');
    }
  };

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
        <Card className="mb-4 bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border-cyan-500/30">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-white">{game.scenario?.template.name}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {game.scenario?.mapPreset.name} - {game.scenario?.mapPreset.biome}
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
        <Card className="mb-4 bg-amber-900/20 border-amber-700/50">
          <div className="p-4 flex items-start gap-3">
            <svg
              className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"
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
              <p className="text-amber-300 text-sm font-medium">Simplified Game Interface</p>
              <p className="text-amber-200/70 text-xs mt-1">
                This is a demo interface. The full hex map and combat resolution system will be
                integrated in a future update. For now, you can manually mark units as destroyed
                and end the game.
              </p>
            </div>
          </div>
        </Card>

        {/* Forces grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {/* Player Force */}
          <Card>
            <div className="p-3 border-b border-gray-700">
              <h3 className="font-medium text-cyan-400">Your Force</h3>
              <p className="text-xs text-gray-500">
                {playerAlive} of {game.playerForce.units.length} active
              </p>
            </div>
            <div className="p-3 space-y-2">
              {game.playerForce.units.map((unit) => (
                <UnitCard key={unit.instanceId} unit={unit} isPlayer />
              ))}
            </div>
          </Card>

          {/* Opponent Force */}
          <Card>
            <div className="p-3 border-b border-gray-700">
              <h3 className="font-medium text-red-400">Enemy Force</h3>
              <p className="text-xs text-gray-500">
                {opponentAlive} of {game.opponentForce?.units.length ?? 0} active
              </p>
            </div>
            <div className="p-3 space-y-2">
              {game.opponentForce?.units.map((unit) => (
                <UnitCard key={unit.instanceId} unit={unit} isPlayer={false} />
              ))}
            </div>
          </Card>
        </div>

        {/* Game control */}
        <Card>
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Game Control</p>
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <Card className="max-w-sm w-full mx-4">
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-medium text-white">End Game</h3>
            </div>
            <div className="p-4 space-y-3">
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
