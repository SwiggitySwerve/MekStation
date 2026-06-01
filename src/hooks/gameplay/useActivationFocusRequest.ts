/**
 * useActivationFocusRequest
 *
 * Emits a focus request when the active unit changes so that camera
 * consumers (minimap, camera controls) can pan to the newly-active unit.
 *
 * Design (per add-tactical-turn-order-and-phase-rail design.md):
 * - This adapter is intentionally decoupled from the camera. It emits a
 *   typed `IFocusRequest` value; the camera consumer decides whether and
 *   how to act on it (e.g. honouring the `autoCenterOnActivation` setting).
 * - In replay mode the focus follows the replay cursor unit rather than
 *   the live activeUnit. The shell's `inspectedUnit` carries the cursor
 *   unit in replay, so we read that when shellMode === 'replay'.
 * - Returns `null` when there is no active unit or no position data.
 *
 * @spec openspec/changes/add-tactical-turn-order-and-phase-rail/specs/game-session-management/spec.md
 *   "Activation Focus Requests" ADDED requirement
 */

import { useRef } from 'react';

import { useTacticalShell } from '@/components/gameplay/TacticalCommandShell';
import { useGameplayStore } from '@/stores/useGameplayStore';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * A request for the camera to focus on a specific unit at an axial hex
 * coordinate. The consumer (camera / minimap) is free to ignore, animate,
 * or immediately snap — this adapter imposes no camera behaviour.
 */
export interface IFocusRequest {
  /** The unit the focus request is centred on. */
  readonly unitId: string;
  /**
   * Axial coordinate string in "q,r" form, e.g. "2,-1".
   * Null when unit position is unknown (edge case: unit not yet placed).
   */
  readonly axialCoord: string | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the latest focus request when the active unit changes, or null
 * when there is nothing to focus on.
 *
 * The returned value is stable between renders (same object reference) until
 * the active unit actually changes, so consumers can use it as a dependency
 * in their own effects without over-firing.
 *
 * TODO(wave-8): filter rail by viewerPlayerId for opponent fog
 */
export function useActivationFocusRequest(): IFocusRequest | null {
  const session = useGameplayStore((s) => s.session);
  const { state: shellState } = useTacticalShell();
  const { shellMode, activeUnit, inspectedUnit } = shellState;

  // In replay mode the focus follows the cursor unit (inspectedUnit),
  // not the engine's activeUnit.
  const targetUnitId =
    shellMode === 'replay' ? (inspectedUnit ?? activeUnit) : activeUnit;

  // Stable ref holds the last emitted request so we only create a new
  // object when the target unit actually changes.
  const lastRequestRef = useRef<IFocusRequest | null>(null);
  const lastUnitIdRef = useRef<string | null>(null);

  // Derive current focus request from unit position in session state.
  if (!session || !targetUnitId) {
    // Nothing to focus on — clear the last request only if unit cleared.
    if (lastUnitIdRef.current !== null) {
      lastUnitIdRef.current = null;
      lastRequestRef.current = null;
    }
    return null;
  }

  const unitState = session.currentState.units[targetUnitId];

  if (targetUnitId !== lastUnitIdRef.current) {
    // Active unit changed — emit a new focus request.
    lastUnitIdRef.current = targetUnitId;

    const axialCoord = unitState?.position
      ? `${unitState.position.q},${unitState.position.r}`
      : null;

    lastRequestRef.current = { unitId: targetUnitId, axialCoord };
  }

  return lastRequestRef.current;
}
