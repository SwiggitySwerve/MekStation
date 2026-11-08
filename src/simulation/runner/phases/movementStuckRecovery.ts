import type { D6Roller } from '@/utils/gameplay/hitLocation';

import {
  GamePhase,
  type IGameEvent,
  type IGameState,
  type IHexGrid,
} from '@/types/gameplay';
import {
  createPSRResolvedEvent,
  createPSRTriggeredEvent,
} from '@/utils/gameplay/gameEvents/statusChecks';
import {
  createStuckRecoveryPSR,
  rollStuckRecoveryPSR,
  stuckUnitIdsForRecovery,
} from '@/utils/gameplay/movement/stuckRecovery';
import { clearStuck } from '@/utils/gameplay/movement/stuckState';

import {
  DEFAULT_COMPONENT_DAMAGE,
  DEFAULT_PILOTING,
} from '../SimulationRunnerConstants';

/**
 * Runner adapter for the shared movement-start recovery roll
 * (`utils/gameplay/movement/stuckRecovery`): every stuck unit that can act
 * rolls before anyone moves. Success clears stuck and jump eligibility;
 * failure leaves the unit stuck with no fall and no pilot damage.
 */
export function runStuckRecoveryRolls(options: {
  readonly currentState: IGameState;
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly grid: IHexGrid;
  readonly d6Roller: D6Roller;
}): IGameState {
  let currentState = options.currentState;
  for (const unitId of stuckUnitIdsForRecovery(currentState.units)) {
    currentState = rollStuckRecovery({ ...options, currentState, unitId });
  }
  return currentState;
}

function rollStuckRecovery(options: {
  readonly currentState: IGameState;
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly grid: IHexGrid;
  readonly d6Roller: D6Roller;
  readonly unitId: string;
}): IGameState {
  const { currentState, d6Roller, events, gameId, grid, unitId } = options;
  const unit = currentState.units[unitId];
  const piloting = unit.piloting ?? DEFAULT_PILOTING;
  const psr = createStuckRecoveryPSR(grid, unitId, unit);

  events.push(
    createPSRTriggeredEvent(
      gameId,
      events.length,
      currentState.turn,
      GamePhase.Movement,
      unitId,
      psr.reason,
      psr.additionalModifier,
      psr.triggerSource,
      piloting,
      psr.reasonCode,
    ),
  );

  const result = rollStuckRecoveryPSR({
    unit,
    psr,
    piloting,
    componentDamage: unit.componentDamage ?? DEFAULT_COMPONENT_DAMAGE,
    d6Roller,
  });
  events.push(
    createPSRResolvedEvent(
      gameId,
      events.length,
      currentState.turn,
      GamePhase.Movement,
      unitId,
      result.targetNumber,
      result.roll,
      result.modifiers.reduce((total, modifier) => total + modifier.value, 0),
      result.passed,
      psr.reason,
      psr.reasonCode,
    ),
  );

  if (!result.passed) return currentState;
  return {
    ...currentState,
    units: { ...currentState.units, [unitId]: clearStuck(unit) },
  };
}
