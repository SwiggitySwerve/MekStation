/**
 * Interactive Session — phase-transition collaborator.
 *
 * Extracted from `InteractiveSession` so the class stays a thin
 * state-machine coordinator. This module owns the per-`GamePhase`
 * branch logic that `advancePhase()` runs: rolling initiative, locking
 * stragglers, resolving attacks / heat / physical attacks, queuing and
 * draining piloting-skill rolls, and the End-phase game-over guard.
 *
 * Behaviour is preserved exactly — the End-phase `isGameOver` guard
 * (do not advance past End once the game is over) and every resolver
 * call order are identical to the pre-extraction class body.
 */

import type { IHexCoordinate } from '@/types/gameplay/HexGridInterfaces';
import type { D6Roller, DiceRoller } from '@/utils/gameplay/diceTypes';

import {
  GamePhase,
  LockState,
  type IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  advancePhase,
  checkAndQueueDamagePSRs,
  lockAttack,
  lockMovement,
  resolveAllAttacks,
  resolveAllPhysicalAttacks,
  resolveHeatPhase,
  resolvePendingPSRs,
  rollInitiative,
  type IPhysicalAttackContext,
} from '@/utils/gameplay/gameSession';

/**
 * Collaborator context the coordinator threads into the phase-advance
 * driver. Mirrors the `InteractiveSession.ai` context shape: the class
 * exposes its private state through getter/setter + provider callbacks
 * so this module never reaches into the class internals directly.
 */
export interface IInteractiveSessionPhaseContext {
  /** Current session snapshot — read fresh at the start of the call. */
  readonly getSession: () => IGameSession;
  /** Writes a new session snapshot back onto the coordinator. */
  readonly setSession: (session: IGameSession) => void;
  /** Resolver-shaped `D6Roller`; `undefined` falls back to engine default. */
  readonly d6RollerForResolvers: () => D6Roller | undefined;
  /** 2d6 `DiceRoller`; `undefined` falls back to engine default. */
  readonly diceRollerForResolvers: () => DiceRoller | undefined;
  /** Per-unit physical-attack context (tonnage / piloting / hexes moved). */
  readonly physicalContextByUnit: () => Map<string, IPhysicalAttackContext>;
  /** Water-depth provider for the Heat-phase cooling bonus. */
  readonly waterDepthAt: (position: IHexCoordinate) => number;
  /** Win-condition predicate — gates the End-phase advance. */
  readonly isGameOver: () => boolean;
}

/**
 * Lock every unit still in `Free`/`Declared` so the phase rolls over
 * with a fully-locked board. Shared by the Movement and WeaponAttack
 * branches, which differ only in the lock function they apply.
 */
function lockStragglers(
  session: IGameSession,
  lock: (session: IGameSession, unitId: string) => IGameSession,
): IGameSession {
  let next = session;
  for (const unitId of Object.keys(next.currentState.units)) {
    const u = next.currentState.units[unitId];
    if (
      u.lockState !== LockState.Locked &&
      u.lockState !== LockState.Resolved
    ) {
      next = lock(next, unitId);
    }
  }
  return next;
}

/**
 * Run the phase-transition branch for the session's current `GamePhase`
 * and write the resulting session back onto the coordinator. This is the
 * verbatim body of `InteractiveSession.advancePhase()` minus the trailing
 * `tryFinalizeAndPublish()` call, which the coordinator still owns so the
 * outcome-publication idempotency guard stays in one place.
 */
export function advanceInteractiveSessionPhase(
  context: IInteractiveSessionPhaseContext,
): void {
  let session = context.getSession();
  const { phase } = session.currentState;

  if (phase === GamePhase.Initiative) {
    session = rollInitiative(
      session,
      undefined,
      context.d6RollerForResolvers(),
    );
    session = advancePhase(session);
  } else if (phase === GamePhase.Movement) {
    // Lock any units that haven't been locked yet
    session = lockStragglers(session, lockMovement);
    session = advancePhase(session);
  } else if (phase === GamePhase.WeaponAttack) {
    // Lock any units that haven't been locked yet
    session = lockStragglers(session, lockAttack);
    session = resolveAllAttacks(session, context.diceRollerForResolvers());
    // Per `wire-piloting-skill-rolls` § 2: after weapon damage has
    // accumulated via the reducer, scan every unit and enqueue a
    // `TwentyPlusPhaseDamage` PSR on any that crossed 20 damage.
    // Resolution deliberately waits for the End phase.
    session = checkAndQueueDamagePSRs(session);
    session = advancePhase(session);
  } else if (phase === GamePhase.PhysicalAttack) {
    // Per `wire-bot-ai-helpers-and-capstone`: resolve any
    // PhysicalAttackDeclared events for the current turn before
    // advancing — without this, declarations made by `runAITurn`
    // would silently expire when the phase rolls over.
    session = resolveAllPhysicalAttacks(
      session,
      context.physicalContextByUnit(),
      context.diceRollerForResolvers(),
    );
    // Per `wire-piloting-skill-rolls` § 5: physical-attack damage can
    // also breach the 20+ threshold. Queue any new damage PSRs before
    // the phase flips so they resolve in the End phase.
    session = checkAndQueueDamagePSRs(session);
    session = advancePhase(session);
  } else if (phase === GamePhase.Heat) {
    // Per `wire-heat-generation-and-effects` task 5 (water cooling):
    // `resolveHeatPhase` accepts an optional `getWaterDepth`
    // provider. `IHex.terrain` is a plain `string` here (no
    // structured depth), so we parse the `water:N` convention (used
    // by future water-tagged hexes) and return 0 for any terrain
    // that doesn't match. Existing grids use `'clear'` → bonus 0.
    session = resolveHeatPhase(session, context.diceRollerForResolvers(), {
      getWaterDepth: (_unitId, position) => context.waterDepthAt(position),
    });
    session = advancePhase(session);
  } else if (phase === GamePhase.End) {
    // Per `wire-piloting-skill-rolls` § 7: drain the PSR queue for
    // every unit. Failures invoke `applyFall` (→ `UnitFell` +
    // `PilotHit`) and clear the remaining queue on that unit.
    session = resolvePendingPSRs(session, context.diceRollerForResolvers());
    // The End-phase advance is gated on `isGameOver`, which inspects
    // the coordinator's live session. The PSR drain above can itself
    // trip the win condition, so the post-drain session MUST be
    // committed before the guard runs — matching the pre-extraction
    // behaviour where `this.session` was reassigned in place.
    context.setSession(session);
    if (!context.isGameOver()) {
      session = advancePhase(session);
    }
  }

  context.setSession(session);
}
