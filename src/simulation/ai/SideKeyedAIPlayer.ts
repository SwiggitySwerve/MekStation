/**
 * SideKeyedAIPlayer — per-side AI dispatch wrapper.
 *
 * Phase 5 additive extension: wraps two `IAIPlayer` instances and routes
 * decisions to the correct player based on the unit's side. The dispatch
 * key is the `unitId` prefix ("player-" vs "opponent-") because the current
 * `IAIUnitState` interface does not carry an explicit side field.
 *
 * This wrapper is additive — it does NOT modify `SimulationRunner`,
 * `BotPlayer`, or any Phase 1-4 file.
 *
 * Usage (Phase 5 CLI runner):
 *
 *   const factory: AIPlayerFactory = (random, _behavior) =>
 *     new SideKeyedAIPlayer(
 *       variantA(random, getBehaviorVariant(config.sideA.aiVariant)),
 *       variantB(random, getBehaviorVariant(config.sideB.aiVariant)),
 *     );
 *
 * @design D12 sketch — side-keyed factory; Phase 5 additive, preserves Phase 3
 * single-factory backward compat.
 */

import type {
  IGameSession,
  IHexGrid,
  IMovementCapability,
} from '@/types/gameplay';

import type {
  IAttackEvent,
  IMovementEvent,
  IPhysicalAttackEvent,
  IRetreatEvent,
  IAIPlayer,
} from './IAIPlayer';
import type { IAIUnitState } from './types';

/**
 * Dispatch incoming unit decisions to playerA (for "player-*" units) or
 * playerB (for "opponent-*" units). The prefix check mirrors the ID format
 * written by `createSideUnits` in SimulationRunnerState.ts.
 *
 * For any unitId that does not start with "player-" or "opponent-", decisions
 * fall back to `playerA` so behavior is defined even in unexpected states.
 */
export class SideKeyedAIPlayer implements IAIPlayer {
  constructor(
    /** AI player for the player ("player-*") side */
    private readonly playerA: IAIPlayer,
    /** AI player for the opponent ("opponent-*") side */
    private readonly playerB: IAIPlayer,
  ) {}

  /**
   * Route retreat evaluation to the correct side-specific AI player.
   */
  evaluateRetreat(
    unit: IAIUnitState,
    session: IGameSession,
  ): IRetreatEvent | null {
    return this.pick(unit).evaluateRetreat(unit, session);
  }

  /**
   * Route movement decision to the correct side-specific AI player.
   */
  playMovementPhase(
    unit: IAIUnitState,
    grid: IHexGrid,
    capability: IMovementCapability,
    allUnits?: readonly IAIUnitState[],
  ): IMovementEvent | null {
    return this.pick(unit).playMovementPhase(unit, grid, capability, allUnits);
  }

  /**
   * Route attack decision to the correct side-specific AI player.
   */
  playAttackPhase(
    attacker: IAIUnitState,
    allUnits: readonly IAIUnitState[],
  ): IAttackEvent | null {
    return this.pick(attacker).playAttackPhase(attacker, allUnits);
  }

  /**
   * Route physical-attack decision to the correct side-specific AI player.
   */
  playPhysicalAttackPhase(
    attacker: IAIUnitState,
    targets: readonly IAIUnitState[],
    options?: { attackerTonnage?: number; pilotingSkill?: number },
  ): IPhysicalAttackEvent | null {
    return this.pick(attacker).playPhysicalAttackPhase(
      attacker,
      targets,
      options,
    );
  }

  /**
   * Select the AI player for this unit based on its unitId prefix.
   * "player-*" → playerA, "opponent-*" → playerB, anything else → playerA
   * as a defined fallback.
   */
  private pick(unit: IAIUnitState): IAIPlayer {
    return unit.unitId.startsWith('opponent-') ? this.playerB : this.playerA;
  }
}
