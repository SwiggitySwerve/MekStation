/**
 * The one GamePhase order table.
 *
 * Every driver that needs "which phase comes next" derives the edge from
 * here: `advancePhase` (and so the interactive session, `runToCompletion`
 * and the multiplayer server), the GM advance-phase preview, and the
 * command-dock phase list.
 *
 * Phase strings are persisted in `event_json`, journals and the replay
 * schema. Never rename a `GamePhase` value. The reducer
 * (`applyPhaseChanged`) deliberately stays permissive about `toPhase` so old
 * journals and replay packs keep loading; this guard applies to writers.
 */

import { GamePhase } from '@/types/gameplay';

/** Phases in turn order. Initiative opens a turn, End closes it. */
export const GAME_PHASE_ORDER = [
  GamePhase.Initiative,
  GamePhase.Movement,
  GamePhase.WeaponAttack,
  GamePhase.PhysicalAttack,
  GamePhase.Heat,
  GamePhase.End,
] as const satisfies readonly GamePhase[];

/** `Record<GamePhase, …>` makes a missing or extra phase a compile error. */
const NEXT_PHASE: Readonly<Record<GamePhase, GamePhase>> = {
  [GamePhase.Initiative]: GamePhase.Movement,
  [GamePhase.Movement]: GamePhase.WeaponAttack,
  [GamePhase.WeaponAttack]: GamePhase.PhysicalAttack,
  [GamePhase.PhysicalAttack]: GamePhase.Heat,
  [GamePhase.Heat]: GamePhase.End,
  [GamePhase.End]: GamePhase.Initiative,
};

/**
 * The phase after `phase`. A value outside the enum (corrupt or hand-edited
 * state) restarts at Initiative, as the old hard-coded array did.
 */
export function nextPhase(phase: GamePhase): GamePhase {
  return NEXT_PHASE[phase] ?? GamePhase.Initiative;
}

/** True only for the single edge the table allows out of `from`. */
export function isLegalPhaseTransition(
  from: GamePhase,
  to: GamePhase,
): boolean {
  return NEXT_PHASE[from] === to;
}

/** A transition into Initiative from any other phase opens the next turn. */
export function isTurnBoundary(from: GamePhase, to: GamePhase): boolean {
  return to === GamePhase.Initiative && from !== GamePhase.Initiative;
}
