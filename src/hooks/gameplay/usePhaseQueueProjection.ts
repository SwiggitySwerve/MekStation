/**
 * usePhaseQueueProjection
 *
 * Projects the current game session's activation queue into a stable,
 * typed surface that the TacticalTurnRail (and any other consumer)
 * can render without reaching into raw session state.
 *
 * Design decisions (per add-tactical-turn-order-and-phase-rail design.md):
 * - The rail is a PROJECTION of session state, NOT an initiative engine.
 *   All ordering logic stays in the game engine; this hook only reads it.
 * - `initiativeOrder` is derived from `session.units` ordered by their
 *   side vs the `firstMover`, then by insertion order (the engine owns
 *   canonical order, this projection just re-reads it).
 * - Blockers are units whose `lockState` is NOT Resolved and who are not
 *   destroyed/retreated/withdrawn — i.e., they still owe an action.
 * - Returns a stable empty projection when `session` is null so consumers
 *   don't need null-checks on every render.
 *
 * @spec openspec/changes/add-tactical-turn-order-and-phase-rail/specs/game-session-management/spec.md
 *   "Tactical Phase Queue Projection" ADDED requirement
 */

import { useMemo } from 'react';

import type { UnitId } from '@/types/gameplay/TacticalShellInterfaces';

import { getPhaseMissingActionLabel } from '@/components/gameplay/EventLogDisplay.helpers';
import { useGameplayStore } from '@/stores/useGameplayStore';
import {
  GamePhase,
  GameSide,
  LockState,
} from '@/types/gameplay/GameSessionCoreTypes';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * A unit that has not yet completed its required action for the current
 * phase. The `missingAction` string is human-readable and phase-scoped
 * (e.g. "movement", "weapon fire").
 */
export interface IPhaseBlocker {
  readonly unitId: UnitId;
  readonly side: GameSide;
  readonly phase: GamePhase;
  readonly missingAction: string;
}

/**
 * Snapshot of the current activation queue.
 *
 * Per the spec's "Tactical Phase Queue Projection" requirement:
 *  - `initiativeOrder`: full list of unit IDs in the order they activate
 *    this phase (first-mover side first, then opposing side).
 *  - `unresolvedUnits`: subset of `initiativeOrder` that still owe an
 *    action (lockState !== Resolved and unit is still in play).
 *  - `blockers`: same as unresolvedUnits but with richer context so the
 *    Phase Progression Controls can surface the reason the phase cannot
 *    advance.
 */
export interface IPhaseQueueProjection {
  readonly round: number;
  readonly phase: GamePhase;
  readonly activeSide: GameSide;
  /** Unit whose turn it currently is (first in unresolvedUnits, or null). */
  readonly activeUnitId: UnitId | null;
  /** All units in activation order for this phase. */
  readonly initiativeOrder: readonly UnitId[];
  /** Units that still owe an action. */
  readonly unresolvedUnits: readonly UnitId[];
  /** Rich blocker list for Phase Progression Controls. */
  readonly blockers: readonly IPhaseBlocker[];
}

// ---------------------------------------------------------------------------
// Phase → missing action label
// ---------------------------------------------------------------------------

/** Human-readable "missing action" label per phase. */
// ---------------------------------------------------------------------------
// Phases that require per-unit actions (alternating-activation phases)
// ---------------------------------------------------------------------------

const ALTERNATING_PHASES = new Set<GamePhase>([
  GamePhase.Movement,
  GamePhase.WeaponAttack,
  GamePhase.PhysicalAttack,
]);

// ---------------------------------------------------------------------------
// Empty fallback (returned when no session is loaded)
// ---------------------------------------------------------------------------

const EMPTY_PROJECTION: IPhaseQueueProjection = {
  round: 0,
  phase: GamePhase.Initiative,
  activeSide: GameSide.Player,
  activeUnitId: null,
  initiativeOrder: [],
  unresolvedUnits: [],
  blockers: [],
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns a typed projection of the current game phase's activation queue.
 *
 * Selector memoised inside `useMemo` so component re-renders only on
 * structural changes to session state (phase, turn, unit lock states).
 *
 * Wave 8 visibility note: opponent-fog filtering will gate rail projection by
 * viewerPlayerId once multi-viewer visibility lands.
 */
export function usePhaseQueueProjection(): IPhaseQueueProjection {
  const session = useGameplayStore((s) => s.session);

  return useMemo(() => {
    if (!session) return EMPTY_PROJECTION;

    const { currentState, units: gameUnits } = session;
    const {
      phase,
      turn,
      firstMover,
      activationIndex,
      units: unitStates,
    } = currentState;

    // Active side: use firstMover if set; fall back to Player.
    const activeSide: GameSide = firstMover ?? GameSide.Player;
    const opposingSide: GameSide =
      activeSide === GameSide.Player ? GameSide.Opponent : GameSide.Player;

    // Build unit lists grouped by side (first-mover side goes first per
    // BattleTech's alternating-activation rule). Within each side we
    // preserve the canonical insertion order from `session.units`.
    const firstMoverUnits = gameUnits.filter((u) => u.side === activeSide);
    const opposingUnits = gameUnits.filter((u) => u.side === opposingSide);

    // For alternating phases the activation order is strictly interleaved:
    // F[0], O[0], F[1], O[1], … (BattleTech standard). For non-alternating
    // phases (Initiative, Heat, End) the full list is still meaningful
    // for display purposes but no unit "acts" individually.
    let initiativeOrder: UnitId[];
    if (ALTERNATING_PHASES.has(phase)) {
      const maxLen = Math.max(firstMoverUnits.length, opposingUnits.length);
      initiativeOrder = [];
      for (let i = 0; i < maxLen; i++) {
        if (i < firstMoverUnits.length)
          initiativeOrder.push(firstMoverUnits[i].id);
        if (i < opposingUnits.length) initiativeOrder.push(opposingUnits[i].id);
      }
    } else {
      // Non-alternating: show all units, first-mover side first.
      initiativeOrder = [...firstMoverUnits, ...opposingUnits].map((u) => u.id);
    }

    // Unresolved units: in play (not destroyed/retreated/withdrawn) AND
    // lockState is not Resolved.
    const missingAction = getPhaseMissingActionLabel(phase);

    const unresolvedUnits: UnitId[] = [];
    const blockers: IPhaseBlocker[] = [];

    for (const unitId of initiativeOrder) {
      const state = unitStates[unitId];
      if (!state) continue;

      // Skip units that are no longer in play.
      if (state.destroyed || state.hasRetreated || state.isWithdrawing)
        continue;

      // Only alternating phases have per-unit lock requirements.
      if (!ALTERNATING_PHASES.has(phase)) continue;

      if (state.lockState !== LockState.Resolved) {
        unresolvedUnits.push(unitId);
        blockers.push({
          unitId,
          side: state.side,
          phase,
          missingAction,
        });
      }
    }

    // Active unit: the unit at `activationIndex` in the interleaved order.
    // If activationIndex is out of range (phase complete) fall back to
    // the first unresolved unit, then null.
    let activeUnitId: UnitId | null = null;
    if (initiativeOrder.length > 0) {
      if (activationIndex < initiativeOrder.length) {
        activeUnitId = initiativeOrder[activationIndex] ?? null;
      } else if (unresolvedUnits.length > 0) {
        activeUnitId = unresolvedUnits[0];
      }
    }

    return {
      round: turn,
      phase,
      activeSide,
      activeUnitId,
      initiativeOrder,
      unresolvedUnits,
      blockers,
    };
  }, [session]);
}
