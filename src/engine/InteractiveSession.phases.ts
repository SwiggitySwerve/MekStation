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

import type {
  IHexCoordinate,
  IHexGrid,
} from '@/types/gameplay/HexGridInterfaces';
import type { D6Roller, DiceRoller } from '@/utils/gameplay/diceTypes';

import { resolveEdge } from '@/simulation/ai/RetreatAI';
import {
  GamePhase,
  LockState,
  type IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  resolveSwarmFireForAttachedSquads,
  type IResolveSwarmFireOptions,
} from '@/utils/gameplay/battlearmor/swarmFireResolver';
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
import {
  applyForcedWithdrawalCheck,
  applyMoralePass,
  applyWithdrawalEdgeExits,
} from '@/utils/gameplay/morale';

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
  /** Encounter grid for source-backed physical displacement validation. */
  readonly grid?: () => IHexGrid | undefined;
  /** Water-depth provider for the Heat-phase cooling bonus. */
  readonly waterDepthAt: (position: IHexCoordinate) => number;
  /** Terrain heat provider for fire and other environmental heat sources. */
  readonly environmentHeatEffectAt: (position: IHexCoordinate) => number;
  /** Win-condition predicate — gates the End-phase advance. */
  readonly isGameOver: () => boolean;
  /**
   * PR-L2 §3: per-turn swarm-fire trigger.  When present, the End-phase
   * advance iterates every BA squad currently attached via its older
   * `IBattleArmorCombatState.swarmingUnitId` pointer, computes per-tick
   * swarm damage via `calculateSwarmDamage`, and appends one `SwarmDamage`
   * event per attached squad with non-zero damage.  When `undefined`
   * (legacy callers, tests that do not exercise swarm fire), the End-phase
   * skips the trigger entirely — no event-stream pollution.
   *
   * `getSquadDef` returns swarm-eligible weapons + flags for the squad;
   * `getHostLocationLabel` (optional) picks the location label for the
   * emitted event.
   *
   * @spec openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md
   */
  readonly swarmFireOptions?: IResolveSwarmFireOptions;
}

/**
 * Per `add-combat-morale-and-withdrawal`: run the in-battle morale pass
 * and the withdrawal-processing chain at the end of a phase. Order
 * matters:
 *
 *   1. `applyMoralePass` folds new combat events into `MoraleShifted`
 *      events so `battleMorale` is current before the next step reads
 *      it.
 *   2. `applyForcedWithdrawalCheck` withdraws eligible units when the
 *      scenario rule is on (no-op otherwise).
 *   3. `applyWithdrawalEdgeExits` emits `UnitRetreated` for any unit
 *      (player-withdrawing or bot-retreating) that has reached its
 *      target edge.
 *
 * The forced-withdrawal edge resolver heads each unit toward its
 * nearest map edge via the existing `RetreatAI.resolveEdge` 'nearest'
 * logic — the same edge resolution the bot uses (design D6).
 */
function runMoraleAndWithdrawalPass(session: IGameSession): IGameSession {
  let next = applyMoralePass(session);
  next = applyForcedWithdrawalCheck(next, (unitId) => {
    const unit = next.currentState.units[unitId];
    if (!unit) return null;
    return resolveEdge(
      { retreatEdge: 'nearest' } as Parameters<typeof resolveEdge>[0],
      unit.position,
      next.config.mapRadius,
    );
  });
  next = applyWithdrawalEdgeExits(next);
  return next;
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
    // Per `add-combat-morale-and-withdrawal`: a withdrawing unit that
    // moved onto its target edge exits here via `UnitRetreated`.
    session = runMoraleAndWithdrawalPass(session);
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
    // Per `add-combat-morale-and-withdrawal`: weapon-phase destruction
    // / vital crits feed the morale pass, which may break a side and
    // trip the Forced Withdrawal check.
    session = runMoraleAndWithdrawalPass(session);
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
      context.grid?.(),
    );
    // Per `wire-piloting-skill-rolls` § 5: physical-attack damage can
    // also breach the 20+ threshold. Queue any new damage PSRs before
    // the phase flips so they resolve in the End phase.
    session = checkAndQueueDamagePSRs(session);
    session = runMoraleAndWithdrawalPass(session);
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
      getEnvironmentHeatEffect: (_unitId, position) =>
        context.environmentHeatEffectAt(position),
    });
    session = runMoraleAndWithdrawalPass(session);
    session = advancePhase(session);
  } else if (phase === GamePhase.End) {
    // Per `wire-piloting-skill-rolls` § 7: drain the PSR queue for
    // every unit. Failures invoke `applyFall` (→ `UnitFell` +
    // `PilotHit`) and clear the remaining queue on that unit.
    session = resolvePendingPSRs(session, context.diceRollerForResolvers());
    // PR-L2 §3: BA swarm-fire-while-attached.  Every BA squad currently
    // attached to a host mek fires its swarm-eligible weapons once at
    // the host.  No-op when the context did not supply
    // `swarmFireOptions` (legacy callers + non-BA tests).  Runs BEFORE
    // the morale pass so the swarm-damage event is in the log when
    // morale evaluates the turn's combat outcomes.
    if (context.swarmFireOptions) {
      session = resolveSwarmFireForAttachedSquads(
        session,
        context.swarmFireOptions,
      );
    }
    // Per `add-combat-morale-and-withdrawal`: the End-phase morale +
    // forced-withdrawal pass runs before the game-over guard so a
    // forced withdrawal that empties the board is reflected in the
    // victory check this same advance.
    session = runMoraleAndWithdrawalPass(session);
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
