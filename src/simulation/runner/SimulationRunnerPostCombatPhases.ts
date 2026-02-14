import {
  GameEventType,
  IGameEvent,
  IGameState,
  MovementType,
} from '@/types/gameplay';
import {
  IPSRBatchResult,
  resolveAllPSRs,
} from '@/utils/gameplay/pilotingSkillRolls';

import { SeededRandom } from '../core/SeededRandom';
import {
  BASE_HEAT_SINKS,
  DEFAULT_COMPONENT_DAMAGE,
  DEFAULT_PILOTING,
  ENGINE_HEAT_PER_CRITICAL,
  JUMP_HEAT,
  LETHAL_PILOT_WOUNDS,
  MEDIUM_LASER_HEAT,
  RUN_HEAT,
  WALK_HEAT,
} from './SimulationRunnerConstants';
import { createD6Roller, createGameEvent } from './SimulationRunnerPhaseUtils';

export function runPSRPhase(options: {
  state: IGameState;
  events: IGameEvent[];
  gameId: string;
  random: SeededRandom;
}): IGameState {
  const { events, gameId, random, state } = options;
  let currentState = state;
  const d6Roller = createD6Roller(random);

  for (const unitId of Object.keys(currentState.units)) {
    const unit = currentState.units[unitId];
    if (unit.destroyed) {
      continue;
    }

    const pendingPSRs = unit.pendingPSRs ?? [];
    if (pendingPSRs.length === 0) {
      continue;
    }

    const componentDamage = unit.componentDamage ?? DEFAULT_COMPONENT_DAMAGE;
    const batchResult: IPSRBatchResult = resolveAllPSRs(
      DEFAULT_PILOTING,
      pendingPSRs,
      componentDamage,
      unit.pilotWounds,
      d6Roller,
    );

    for (const psrResult of batchResult.results) {
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.PSRResolved,
          currentState.turn,
          currentState.phase,
          {
            unitId,
            reason: psrResult.psr.reason,
            targetNumber: psrResult.targetNumber,
            roll: psrResult.roll,
            passed: psrResult.passed,
          },
          unitId,
        ),
      );
    }

    if (batchResult.unitFell) {
      const currentUnit = currentState.units[unitId];
      const newPilotWounds = currentUnit.pilotWounds + 1;
      const pilotConscious =
        newPilotWounds < LETHAL_PILOT_WOUNDS && currentUnit.pilotConscious;

      currentState = {
        ...currentState,
        units: {
          ...currentState.units,
          [unitId]: {
            ...currentUnit,
            prone: true,
            pilotWounds: newPilotWounds,
            pilotConscious,
            destroyed: !pilotConscious ? true : currentUnit.destroyed,
            pendingPSRs: [],
          },
        },
      };

      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.UnitFell,
          currentState.turn,
          currentState.phase,
          {
            unitId,
            pilotDamage: 1,
          },
          unitId,
        ),
      );

      if (!pilotConscious && !currentUnit.destroyed) {
        events.push(
          createGameEvent(
            gameId,
            events.length,
            GameEventType.UnitDestroyed,
            currentState.turn,
            currentState.phase,
            {
              unitId,
              cause: 'pilot_death' as const,
            },
          ),
        );
      }
    } else {
      currentState = {
        ...currentState,
        units: {
          ...currentState.units,
          [unitId]: {
            ...currentState.units[unitId],
            pendingPSRs: [],
          },
        },
      };
    }
  }

  return currentState;
}

export function runHeatPhase(state: IGameState): IGameState {
  let currentState = { ...state };

  for (const unitId of Object.keys(currentState.units)) {
    const unit = currentState.units[unitId];
    if (unit.destroyed) {
      continue;
    }

    const weaponsFired = unit.weaponsFiredThisTurn ?? [];
    const weaponHeat = weaponsFired.length * MEDIUM_LASER_HEAT;

    let movementHeat = 0;
    if (unit.movementThisTurn === MovementType.Walk) {
      movementHeat = WALK_HEAT;
    } else if (unit.movementThisTurn === MovementType.Run) {
      movementHeat = RUN_HEAT;
    } else if (unit.movementThisTurn === MovementType.Jump) {
      movementHeat = JUMP_HEAT;
    }

    const componentDamage = unit.componentDamage ?? DEFAULT_COMPONENT_DAMAGE;
    const engineHeat = componentDamage.engineHits * ENGINE_HEAT_PER_CRITICAL;

    const heatSinksLost = componentDamage.heatSinksDestroyed ?? 0;
    const dissipation = Math.max(0, BASE_HEAT_SINKS - heatSinksLost);

    const newHeat = Math.max(
      0,
      unit.heat + weaponHeat + movementHeat + engineHeat - dissipation,
    );

    currentState = {
      ...currentState,
      units: {
        ...currentState.units,
        [unitId]: {
          ...unit,
          heat: newHeat,
        },
      },
    };
  }

  return currentState;
}
