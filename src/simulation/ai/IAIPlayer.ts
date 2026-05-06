/**
 * IAIPlayer — pluggable AI interface for the simulation runner.
 *
 * Per `add-encounter-swarm-harness` design D3: the interface is method-shaped
 * (four decision methods) rather than strategy-composition shaped. Future AI
 * implementations (e.g. LLM-driven) reason at the player level — full game
 * session in, single decision out. Sub-strategy composition would over-fit a
 * shape we cannot predict.
 *
 * Internal `AttackAI` / `MoveAI` / `RetreatAI` types intentionally do NOT
 * leak through this surface. All inputs/outputs are typed via public shared
 * interfaces.
 */

import type {
  IGameSession,
  IHexGrid,
  IMovementCapability,
} from '@/types/gameplay';

import type { SeededRandom } from '../core/SeededRandom';
import type {
  IAttackEvent,
  IMovementEvent,
  IPhysicalAttackEvent,
  IRetreatEvent,
} from './BotPlayer';
import type { IAIUnitState, IBotBehavior } from './types';

export type { IAIUnitState, IBotBehavior };
export type {
  IAttackEvent,
  IMovementEvent,
  IPhysicalAttackEvent,
  IRetreatEvent,
};

/**
 * The four-method decision surface every AI player must implement.
 * `BotPlayer` is the production implementation; `StandStillAIPlayer` is the
 * test stub. Phase 7 will add an LLM-driven implementation.
 */
export interface IAIPlayer {
  /**
   * Evaluate whether `unit` should begin retreating. Called once per unit
   * per turn before movement. Returns a `RetreatTriggered` event (which the
   * caller appends to the session so subsequent phases see `isRetreating`),
   * or `null` if no retreat is warranted.
   */
  evaluateRetreat(
    unit: IAIUnitState,
    session: IGameSession,
  ): IRetreatEvent | null;

  /**
   * Choose a movement destination for `unit`. Returns a `MovementDeclared`
   * event the caller applies to simulation state, or `null` to stand still.
   */
  playMovementPhase(
    unit: IAIUnitState,
    grid: IHexGrid,
    capability: IMovementCapability,
    allUnits?: readonly IAIUnitState[],
  ): IMovementEvent | null;

  /**
   * Choose a ranged-attack target and weapon set for `attacker`.
   * Returns an `AttackDeclared` event the caller routes through the combat
   * resolver, or `null` if no attack is declared.
   */
  playAttackPhase(
    attacker: IAIUnitState,
    allUnits: readonly IAIUnitState[],
  ): IAttackEvent | null;

  /**
   * Choose a physical-attack target for `attacker` (punch / kick / charge).
   * Returns a `PhysicalAttackDeclared` event or `null`.
   */
  playPhysicalAttackPhase(
    attacker: IAIUnitState,
    targets: readonly IAIUnitState[],
    options?: {
      attackerTonnage?: number;
      pilotingSkill?: number;
    },
  ): IPhysicalAttackEvent | null;
}

/**
 * Factory signature used by `SimulationRunner` to create one `IAIPlayer`
 * per run. Receives the per-run `SeededRandom` and the selected behavior
 * preset so the factory can thread both into the concrete implementation.
 */
export type AIPlayerFactory = (
  random: SeededRandom,
  behavior: IBotBehavior,
) => IAIPlayer;
