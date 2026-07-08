/**
 * TacticalTurnRail prop types.
 *
 * Separated from the component so tests and stories can import them without
 * pulling in React, which keeps the type surface clean.
 *
 * @spec openspec/changes/add-tactical-turn-order-and-phase-rail/specs/tactical-map-interface/spec.md
 *   "Tactical Turn Order Rail" ADDED requirement
 *   "Phase Progression Controls" ADDED requirement
 */

import type { IPhaseQueueProjection, IPhaseBlocker } from '@/hooks/gameplay';
import type {
  GamePhase,
  GameSide,
} from '@/types/gameplay/GameSessionCoreTypes';
import type { IUnitGameState } from '@/types/gameplay/GameSessionStateTypes';
import type { IGameUnit } from '@/types/gameplay/GameSessionUnitTypes';
import type { ShellMode } from '@/types/gameplay/TacticalShellInterfaces';

export type { IPhaseQueueProjection, IPhaseBlocker };

/**
 * Classification of a unit's current activation status within the rail.
 *
 * Drives the visual treatment (color, icon, opacity) of a rail token.
 */
export type UnitRailStatus =
  | 'active' // it is this unit's turn RIGHT NOW
  | 'upcoming' // waiting to act in this phase
  | 'completed' // has acted this phase (lockState Resolved)
  | 'skipped' // shutdown/prone — acts last or is auto-resolved
  | 'destroyed' // unit is dead
  | 'withdrawn'; // retreated or withdrawing

/**
 * Per-unit data the rail renders.
 */
export interface IRailUnit {
  readonly id: string;
  readonly name: string;
  readonly unitRef: string;
  readonly side: GameSide;
  readonly status: UnitRailStatus;
  /** True when this is the currently-active unit (same as status === 'active'
   *  but explicit for clarity in template expressions). */
  readonly isActive: boolean;
}

export interface PhaseAdvanceControlProps {
  readonly label: string;
  readonly disabled: boolean;
  readonly disabledReason?: string;
  readonly blockerReasons: readonly string[];
  readonly onAdvance: () => void;
}

/**
 * Props for `TacticalTurnRail`.
 */
export interface TacticalTurnRailProps {
  /** Projection of the current phase's activation queue. */
  readonly projection: IPhaseQueueProjection;
  /** All game units (for name / unitRef lookup). */
  readonly gameUnits: readonly IGameUnit[];
  /** Current per-unit states (for status derivation). */
  readonly unitStates: Record<string, IUnitGameState>;
  /** Current shell rendering mode. */
  readonly shellMode: ShellMode;
  /** Current turn number (displayed in the header). */
  readonly turn: number;
  /** Current phase (displayed in the header). */
  readonly phase: GamePhase;
  /** Currently selected unit id (drives map highlight — NOT activeUnit). */
  readonly selectedUnitId: string | null;
  /**
   * Called when the player clicks a rail token.
   * Per Wave 7.0 Gate 4: MUST call `setSelectedUnit` only — NEVER
   * `setActiveUnit`.  The caller is responsible for wiring this to the
   * correct store action.
   */
  readonly onUnitSelect: (unitId: string) => void;
  /** Optional drawer toggle for narrow viewports (mobile `record-sheet-drawer`). */
  readonly drawer?: {
    readonly isDrawerOpen: boolean;
    readonly onToggleDrawer: () => void;
  };
  readonly phaseAdvanceControl?: PhaseAdvanceControlProps;
  readonly className?: string;
}
