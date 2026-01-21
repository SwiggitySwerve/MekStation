/**
 * Phase Banner Component
 * Displays the current game phase and turn information.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import React from 'react';
import { GamePhase, GameSide } from '@/types/gameplay';

// =============================================================================
// Types
// =============================================================================

export interface PhaseBannerProps {
  /** Current game phase */
  phase: GamePhase;
  /** Current turn number */
  turn: number;
  /** Which side's turn it is */
  activeSide: GameSide;
  /** Is it the player's turn to act? */
  isPlayerTurn: boolean;
  /** Optional additional status text */
  statusText?: string;
  /** Optional className for styling */
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get display name for a phase.
 */
function getPhaseDisplayName(phase: GamePhase): string {
  switch (phase) {
    case GamePhase.Initiative:
      return 'Initiative';
    case GamePhase.Movement:
      return 'Movement Phase';
    case GamePhase.WeaponAttack:
      return 'Weapon Attack Phase';
    case GamePhase.PhysicalAttack:
      return 'Physical Attack Phase';
    case GamePhase.Heat:
      return 'Heat Phase';
    case GamePhase.End:
      return 'End Phase';
    default:
      return 'Unknown Phase';
  }
}

/**
 * Get phase color for styling.
 */
function getPhaseColor(phase: GamePhase): string {
  switch (phase) {
    case GamePhase.Initiative:
      return 'bg-blue-600';
    case GamePhase.Movement:
      return 'bg-green-600';
    case GamePhase.WeaponAttack:
      return 'bg-red-600';
    case GamePhase.PhysicalAttack:
      return 'bg-orange-600';
    case GamePhase.Heat:
      return 'bg-yellow-600';
    case GamePhase.End:
      return 'bg-gray-600';
    default:
      return 'bg-gray-500';
  }
}

// =============================================================================
// Component
// =============================================================================

/**
 * Phase banner showing current game state.
 */
export function PhaseBanner({
  phase,
  turn,
  activeSide: _activeSide,
  isPlayerTurn,
  statusText,
  className = '',
}: PhaseBannerProps): React.ReactElement {
  const phaseColor = getPhaseColor(phase);
  const turnText = isPlayerTurn ? 'Your Turn' : "Opponent's Turn";

  return (
    <div
      className={`${phaseColor} text-white px-4 py-2 flex items-center justify-between ${className}`}
      role="banner"
      aria-live="polite"
      data-testid="phase-banner"
    >
      <div className="flex items-center gap-4">
        <span className="font-bold text-lg" data-testid="phase-name">{getPhaseDisplayName(phase)}</span>
        <span className="text-sm opacity-90">-</span>
        <span className="text-sm font-medium" data-testid="turn-indicator">{turnText}</span>
        {statusText && (
          <>
            <span className="text-sm opacity-90">-</span>
            <span className="text-sm">{statusText}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm opacity-75">Turn</span>
        <span className="font-bold text-xl bg-black/20 px-3 py-1 rounded" data-testid="turn-number">{turn}</span>
      </div>
    </div>
  );
}

export default PhaseBanner;
