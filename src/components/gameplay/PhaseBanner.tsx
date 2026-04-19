/**
 * Phase Banner Component
 * Displays the current game phase and turn information.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import React from "react";

import { GamePhase, GameSide } from "@/types/gameplay";

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
      return "Initiative";
    case GamePhase.Movement:
      return "Movement Phase";
    case GamePhase.WeaponAttack:
      return "Weapon Attack Phase";
    case GamePhase.PhysicalAttack:
      return "Physical Attack Phase";
    case GamePhase.Heat:
      return "Heat Phase";
    case GamePhase.End:
      return "End Phase";
    default:
      return "Unknown Phase";
  }
}

/**
 * Get phase color for styling.
 */
function getPhaseColor(phase: GamePhase): string {
  switch (phase) {
    case GamePhase.Initiative:
      return "bg-blue-600";
    case GamePhase.Movement:
      return "bg-green-600";
    case GamePhase.WeaponAttack:
      return "bg-red-600";
    case GamePhase.PhysicalAttack:
      return "bg-orange-600";
    case GamePhase.Heat:
      return "bg-yellow-600";
    case GamePhase.End:
      return "bg-gray-600";
    default:
      return "bg-gray-500";
  }
}

// =============================================================================
// Component
// =============================================================================

/**
 * Per `add-interactive-combat-core-ui` § 10.3: active-side token
 * colors. We surface the same blue/red palette the hex map uses for
 * unit tokens (blue-500 = Player, red-500 = Opponent) as a
 * background accent next to the turn indicator, so the banner shows
 * BOTH the current phase (existing full-width colored background)
 * AND whose side is acting without color conflicts.
 */
function getActiveSideClasses(side: GameSide): {
  readonly dot: string;
  readonly text: string;
  readonly label: string;
} {
  if (side === GameSide.Player) {
    return {
      dot: "bg-blue-500",
      text: "text-blue-100",
      label: "Player",
    };
  }
  return {
    dot: "bg-red-500",
    text: "text-red-100",
    label: "Opponent",
  };
}

/**
 * Per `add-interactive-combat-core-ui` § 1.3: on screens narrower than
 * `lg:` (1024px) the record-sheet pane collapses into a drawer. The
 * banner hosts the toggle so the drawer control is always in the
 * persistent HUD. Optional — omitting the handler hides the button
 * and preserves the legacy banner shape for callers (PhaseBanner
 * tests, e2e) that don't opt in.
 */
export interface PhaseBannerDrawerToggle {
  readonly isDrawerOpen: boolean;
  readonly onToggleDrawer: () => void;
}

/**
 * Phase banner showing current game state.
 */
export function PhaseBanner({
  phase,
  turn,
  activeSide,
  isPlayerTurn,
  statusText,
  className = "",
  drawer,
}: PhaseBannerProps & {
  readonly drawer?: PhaseBannerDrawerToggle;
}): React.ReactElement {
  const phaseColor = getPhaseColor(phase);
  const turnText = isPlayerTurn ? "Your Turn" : "Opponent's Turn";
  const sideClasses = getActiveSideClasses(activeSide);

  return (
    <div
      className={`${phaseColor} flex items-center justify-between px-4 py-2 text-white ${className}`}
      role="banner"
      aria-live="polite"
      data-testid="phase-banner"
    >
      <div className="flex items-center gap-4">
        <span className="text-lg font-bold" data-testid="phase-name">
          {getPhaseDisplayName(phase)}
        </span>
        <span className="text-sm opacity-90">-</span>
        <span className="text-sm font-medium" data-testid="turn-indicator">
          {turnText}
        </span>
        <span
          className="flex items-center gap-1 rounded-full bg-black/25 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
          data-testid="active-side-indicator"
          data-side={activeSide === GameSide.Player ? "player" : "opponent"}
          aria-label={`Active side: ${sideClasses.label}`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${sideClasses.dot}`}
            aria-hidden="true"
          />
          <span className={sideClasses.text}>{sideClasses.label}</span>
        </span>
        {statusText && (
          <>
            <span className="text-sm opacity-90">-</span>
            <span className="text-sm">{statusText}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm opacity-75">Turn</span>
        <span
          className="rounded bg-black/20 px-3 py-1 text-xl font-bold"
          data-testid="turn-number"
        >
          {turn}
        </span>
        {drawer && (
          <button
            type="button"
            onClick={drawer.onToggleDrawer}
            className="ml-2 rounded bg-black/25 px-3 py-1 text-xs font-semibold uppercase tracking-wide hover:bg-black/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white lg:hidden"
            data-testid="record-sheet-drawer-toggle"
            aria-expanded={drawer.isDrawerOpen}
            aria-controls="record-sheet-drawer"
          >
            {drawer.isDrawerOpen ? "Close Sheet" : "Record Sheet"}
          </button>
        )}
      </div>
    </div>
  );
}

export default PhaseBanner;
