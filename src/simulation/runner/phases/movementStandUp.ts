import type { D6Roller } from '@/utils/gameplay/hitLocation';

import { GamePhase, IGameEvent, IGameState } from '@/types/gameplay';
import {
  createPSRResolvedEvent,
  createPSRTriggeredEvent,
  createUnitStoodEvent,
} from '@/utils/gameplay/gameEvents/statusChecks';
import {
  createStandingUpPSR,
  resolvePSR,
} from '@/utils/gameplay/pilotingSkillRolls';

import {
  DEFAULT_COMPONENT_DAMAGE,
  DEFAULT_PILOTING,
} from '../SimulationRunnerConstants';

export function resolveRunnerStandUpAttempt(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  d6Roller: D6Roller;
}): IGameState {
  const { currentState, d6Roller, events, gameId, unitId } = options;
  const unit = currentState.units[unitId];
  if (!unit?.prone || unit.destroyed) return currentState;

  const psr = createStandingUpPSR(unitId);
  const phase = currentState.phase ?? GamePhase.Movement;
  events.push(
    createPSRTriggeredEvent(
      gameId,
      events.length,
      currentState.turn,
      phase,
      unitId,
      psr.reason,
      psr.additionalModifier,
      psr.triggerSource,
      unit.piloting ?? DEFAULT_PILOTING,
      psr.reasonCode,
    ),
  );

  const result = resolvePSR(
    unit.piloting ?? DEFAULT_PILOTING,
    psr,
    unit.componentDamage ?? DEFAULT_COMPONENT_DAMAGE,
    unit.pilotWounds,
    d6Roller,
    unit.unitQuirks ?? [],
    unit.abilities ?? [],
    unit.isQuad ?? false,
    unit.unitType,
  );
  const modifiers = result.modifiers.reduce(
    (total, modifier) => total + modifier.value,
    0,
  );
  events.push(
    createPSRResolvedEvent(
      gameId,
      events.length,
      currentState.turn,
      phase,
      unitId,
      result.targetNumber,
      result.roll,
      modifiers,
      result.passed,
      psr.reason,
      psr.reasonCode,
    ),
  );

  if (result.passed) {
    events.push(
      createUnitStoodEvent(
        gameId,
        events.length,
        currentState.turn,
        phase,
        unitId,
        result.roll,
        result.targetNumber,
      ),
    );
  }

  return {
    ...currentState,
    units: {
      ...currentState.units,
      [unitId]: {
        ...unit,
        prone: result.passed ? false : unit.prone,
        pendingPSRs: [],
      },
    },
  };
}
