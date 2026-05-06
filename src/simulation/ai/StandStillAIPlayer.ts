/**
 * StandStillAIPlayer — no-op IAIPlayer stub for injection tests.
 *
 * Per `add-encounter-swarm-harness` task 3.8: returns null from every
 * movement / retreat / physical method so units never move, and returns
 * null from the attack method so no shots are fired. This lets injection
 * tests verify that the SimulationRunner correctly uses the injected
 * factory without invoking any real AI logic.
 */

import type {
  IGameSession,
  IHexGrid,
  IMovementCapability,
} from '@/types/gameplay';

import type {
  IAttackEvent,
  IAIPlayer,
  IAIUnitState,
  IMovementEvent,
  IPhysicalAttackEvent,
  IRetreatEvent,
} from './IAIPlayer';

/**
 * Stub AI player that makes no decisions. Every method returns null,
 * causing the simulation runner to skip movement, attacks, and physical
 * attacks for all units. Used in `ai-injection.test.ts` to confirm:
 *   1. The factory injection path is exercised.
 *   2. Units remain at their spawn positions after N turns.
 *   3. No damage events are emitted.
 */
export class StandStillAIPlayer implements IAIPlayer {
  /**
   * Never retreat — always return null.
   */
  evaluateRetreat(
    _unit: IAIUnitState,
    _session: IGameSession,
  ): IRetreatEvent | null {
    return null;
  }

  /**
   * Never move — always return null so the runner leaves the unit in place.
   */
  playMovementPhase(
    _unit: IAIUnitState,
    _grid: IHexGrid,
    _capability: IMovementCapability,
    _allUnits?: readonly IAIUnitState[],
  ): IMovementEvent | null {
    return null;
  }

  /**
   * Never attack — always return null so no ranged combat happens.
   */
  playAttackPhase(
    _attacker: IAIUnitState,
    _allUnits: readonly IAIUnitState[],
  ): IAttackEvent | null {
    return null;
  }

  /**
   * Never physical-attack — always return null.
   */
  playPhysicalAttackPhase(
    _attacker: IAIUnitState,
    _targets: readonly IAIUnitState[],
    _options?: { attackerTonnage?: number; pilotingSkill?: number },
  ): IPhysicalAttackEvent | null {
    return null;
  }
}
