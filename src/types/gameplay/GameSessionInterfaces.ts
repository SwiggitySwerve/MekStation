/**
 * Game Session Interfaces
 * Compatibility barrel for the game session type modules.
 *
 * @spec openspec/changes/add-game-session-core/specs/game-session-core/spec.md
 */

export * from './GameSessionCoreTypes';
export * from './GameSessionUnitTypes';
export * from './GameSessionLifecycleEvents';
export * from './GameSessionMovementEvents';
export * from './GameSessionAttackEvents';
export * from './GameSessionGroundObjectEvents';
export * from './GameSessionObjectiveEvents';
export * from './GameSessionStatusEvents';
export * from './GameSessionStateTypes';

import type { GameSide } from './GameSessionCoreTypes';
import type { IGameSession } from './GameSessionStateTypes';
import type { IGameEvent } from './GameSessionStatusEvents';

export function isGameEvent(obj: unknown): obj is IGameEvent {
  if (typeof obj !== 'object' || obj === null) return false;
  const event = obj as IGameEvent;
  return (
    typeof event.id === 'string' &&
    typeof event.gameId === 'string' &&
    typeof event.sequence === 'number' &&
    typeof event.timestamp === 'string' &&
    typeof event.type === 'string' &&
    typeof event.turn === 'number' &&
    typeof event.phase === 'string' &&
    typeof event.payload === 'object'
  );
}

/**
 * Type guard for IGameSession.
 */
export function isGameSession(obj: unknown): obj is IGameSession {
  if (typeof obj !== 'object' || obj === null) return false;
  const session = obj as IGameSession;
  return (
    typeof session.id === 'string' &&
    typeof session.createdAt === 'string' &&
    typeof session.config === 'object' &&
    Array.isArray(session.units) &&
    Array.isArray(session.events) &&
    typeof session.currentState === 'object'
  );
}

// =============================================================================
// Side Ownership (Networked 1v1)
// =============================================================================

/**
 * Per `add-p2p-game-session-sync` § 6.3: returns true when the local
 * peer is allowed to issue commands (move, fire, lock) for the given
 * game side. Used by the combat UI to gate control affordances:
 * disable any control that would modify a unit whose side is owned by
 * the remote peer.
 *
 * Behaviour:
 *   - Local single-player / hot-seat session (`sideOwners` absent):
 *     local peer controls every side — return `true`.
 *   - Networked session: side is owned by `localPeerId` iff
 *     `sideOwners[side] === localPeerId`. Unknown peer returns `false`
 *     (e.g. spectator or stale awareness state).
 */
export function canLocalPeerControlSide(
  session: Pick<IGameSession, 'sideOwners'>,
  localPeerId: string | null | undefined,
  side: GameSide,
): boolean {
  if (!session.sideOwners) return true;
  if (!localPeerId) return false;
  return session.sideOwners[side] === localPeerId;
}

/**
 * Convenience wrapper for unit-level UI gating: looks up the unit's
 * side and forwards to `canLocalPeerControlSide`. Returns `false` when
 * the unit is unknown — fail-closed so the UI never lets a stale
 * reference modify someone else's mech.
 */
export function canLocalPeerControlUnit(
  session: Pick<IGameSession, 'units' | 'sideOwners'>,
  localPeerId: string | null | undefined,
  unitId: string,
): boolean {
  const unit = session.units.find((entry) => entry.id === unitId);
  if (!unit) return false;
  return canLocalPeerControlSide(session, localPeerId, unit.side);
}
