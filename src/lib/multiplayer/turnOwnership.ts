/**
 * Turn-Ownership Gate — derive whether the local player may act.
 *
 * Per `complete-multiplayer-game-surface` D4: the networked game surface
 * enables intent-producing controls ONLY when the local player's side
 * is the active side for a phase that accepts that side's intents. At
 * all other times the surface renders a passive "waiting for opponent"
 * indicator.
 *
 * The gate is **advisory UX** — the server independently rejects a
 * smuggled or out-of-phase intent regardless of what this module
 * returns (D4 / Risks "A player acts during the opponent's turn"). It
 * exists so a player is not handed dead controls during the opponent's
 * turn, not as a security boundary.
 *
 * Side derivation:
 *   - The local player's side comes from the lobby seat assignment —
 *     the seat the local `playerId` occupies. The networked 1v1 maps
 *     the first lobby side (`Alpha`) to `GameSide.Player` and the
 *     second (`Bravo`) to `GameSide.Opponent`, matching the order the
 *     server bootstraps `playerUnits` / `opponentUnits`.
 *   - The active side comes from the mirror's `IGameState`: in the
 *     alternating Movement / WeaponAttack / PhysicalAttack phases the
 *     1v1 engine activates one unit per side in turn, so the side that
 *     may act is `firstMover` when `activationIndex` is even and the
 *     opposite side when it is odd.
 *
 * @spec openspec/changes/complete-multiplayer-game-surface/specs/multiplayer-game-surface/spec.md
 */

import type { IMatchSeat } from '@/types/multiplayer/Lobby';

import {
  GamePhase,
  GameSide,
  GameStatus,
  type IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';

// =============================================================================
// Local side
// =============================================================================

/**
 * The phases that accept a side's intents. Initiative is server-rolled,
 * Heat is server-resolved, and the End phase only runs cleanup — none
 * collect a player declaration, so intent controls stay disabled in
 * them even for the active side. A player may still `endPhase` /
 * `concede` from any phase; those are gated separately by the surface.
 */
const INTENT_PHASES: ReadonlySet<GamePhase> = new Set([
  GamePhase.Movement,
  GamePhase.WeaponAttack,
  GamePhase.PhysicalAttack,
]);

/**
 * Resolve the `GameSide` the local player controls from the lobby seat
 * array. Returns `null` when the player occupies no seat (spectator, or
 * the seats snapshot has not arrived yet) — the surface treats a `null`
 * side as "no controls" so a smuggled intent is impossible from the UI.
 *
 * The mapping is positional: the side that sorts first by `slotId`
 * (`alpha-1` < `bravo-1`) is `GameSide.Player`, the next is
 * `GameSide.Opponent`. This matches the server's bootstrap order where
 * the Alpha seat's units become `playerUnits`.
 */
export function localSideFromSeats(
  seats: readonly IMatchSeat[],
  playerId: string | null | undefined,
): GameSide | null {
  if (!playerId) return null;
  const ownSeat = seats.find((seat) => seat.occupant?.playerId === playerId);
  if (!ownSeat) return null;
  const sideNames = Array.from(new Set(seats.map((seat) => seat.side))).sort(
    (left, right) => left.localeCompare(right),
  );
  const index = sideNames.indexOf(ownSeat.side);
  if (index < 0) return null;
  return index === 0 ? GameSide.Player : GameSide.Opponent;
}

// =============================================================================
// Active side
// =============================================================================

/**
 * The side that may act in the mirror's current phase, or `null` when
 * no side acts (a server-only phase such as Initiative / Heat / End, a
 * pre-`GameStarted` mirror, or a completed match).
 *
 * Derived purely from the mirror's `IGameState` — never from local
 * engine resolution (D2 / D3).
 */
export function activeSideFromSession(
  session: IGameSession | null,
): GameSide | null {
  if (!session) return null;
  const state = session.currentState;
  if (state.status !== GameStatus.Active) return null;
  if (!INTENT_PHASES.has(state.phase)) return null;
  const firstMover = state.firstMover ?? GameSide.Player;
  const otherSide =
    firstMover === GameSide.Player ? GameSide.Opponent : GameSide.Player;
  // Even activation index → the first mover acts; odd → the other side.
  return state.activationIndex % 2 === 0 ? firstMover : otherSide;
}

// =============================================================================
// Gate
// =============================================================================

/**
 * The resolved turn-ownership state the surface renders against.
 */
export interface ITurnOwnership {
  /** The side the local player controls, or `null` if seatless. */
  readonly localSide: GameSide | null;
  /** The side that may act right now, or `null` in a server-only phase. */
  readonly activeSide: GameSide | null;
  /**
   * `true` when the local side is the active side AND the current phase
   * accepts that side's intents — i.e. the surface enables movement /
   * attack / physical controls.
   */
  readonly canAct: boolean;
  /**
   * `true` when the match is live but it is the opponent's turn (or a
   * server-only phase) — the surface shows the passive "waiting for
   * opponent" indicator.
   */
  readonly waitingForOpponent: boolean;
}

/**
 * Compute the turn-ownership gate from the mirror session + the local
 * player's seat side. The single source the `NetworkedGameSurface`
 * reads to decide control enablement and the waiting indicator.
 */
export function deriveTurnOwnership(
  session: IGameSession | null,
  localSide: GameSide | null,
): ITurnOwnership {
  const activeSide = activeSideFromSession(session);
  const isLive = session?.currentState.status === GameStatus.Active;
  const canAct =
    localSide !== null && activeSide !== null && localSide === activeSide;
  return {
    localSide,
    activeSide,
    canAct,
    waitingForOpponent: isLive === true && !canAct,
  };
}
