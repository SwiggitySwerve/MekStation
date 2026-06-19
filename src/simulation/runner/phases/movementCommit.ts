import {
  Facing,
  GameEventType,
  GamePhase,
  type IEnvironmentalConditions,
  type IGameEvent,
  type IGameState,
  type IHexGrid,
  type IMovementCapability,
} from '@/types/gameplay';
import {
  buildMovementEventPath,
  decomposeMovementSteps,
  maxMovementCostForCapability,
  movementAnimationModeForType,
} from '@/utils/gameplay/movement/eventPath';

import type { IMovementEvent } from '../../ai/AIPlayerEvents';

import { applyMovementEvent } from '../SimulationRunnerState';
import { queueMovementControlPSRs } from './movementControlPsr';
import { queueMovementDamagePSRs } from './movementDamagePsr';
import { queueMovementEnhancementPSRs } from './movementEnhancementPsr';
import { applyMovementMinefieldEffects } from './movementMines';
import { queueMovementTerrainPSRs } from './movementTerrainPsr';
import { createGameEvent } from './utils';

export function commitValidatedMovement(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  grid: IHexGrid;
  unitId: string;
  unit: IGameState['units'][string];
  payload: IMovementEvent['payload'];
  validationCapability: IMovementCapability;
  mpCost: number;
  heatGenerated: number;
  environmentalConditions?: IEnvironmentalConditions;
  optionalRules?: readonly string[];
  d6Roller: () => number;
}): IGameState {
  const {
    currentState,
    events,
    gameId,
    grid,
    unitId,
    unit,
    payload,
    validationCapability,
    mpCost,
    heatGenerated,
    environmentalConditions,
    optionalRules,
    d6Roller,
  } = options;
  const committedPayload = {
    ...payload,
    mpUsed: mpCost,
    heatGenerated,
  };
  const path = buildMovementEventPath({
    grid,
    from: unit.position,
    to: committedPayload.to,
    movementType: committedPayload.movementType,
    maxCost: Math.min(
      mpCost,
      maxMovementCostForCapability(
        validationCapability,
        committedPayload.movementType,
      ),
    ),
    movementContext: {
      environmentalConditions,
      pilotAbilities: unit.abilities,
    },
  });
  const decomposition = decomposeMovementSteps({
    from: unit.position,
    to: committedPayload.to,
    fromFacing: unit.facing as Facing,
    toFacing: committedPayload.facing as Facing,
    movementType: committedPayload.movementType,
    mpUsed: committedPayload.mpUsed,
    path,
    grid,
    movementCapability: validationCapability,
  });
  const mode = movementAnimationModeForType(committedPayload.movementType);

  let nextState = queueMovementEnhancementPSRs({
    currentState,
    events,
    gameId,
    unitId,
    movementType: committedPayload.movementType,
    activeMASC: unit.activeMASC,
    activeSupercharger: unit.activeSupercharger,
    mascTurnsUsed: unit.mascTurnsUsed,
    superchargerTurnsUsed: unit.superchargerTurnsUsed,
    optionalRules,
  });

  nextState = applyMovementEvent(nextState, unitId, {
    ...committedPayload,
    hexesMoved: decomposition.hexesMoved,
    steps: decomposition.steps,
  });

  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.MovementDeclared,
      nextState.turn,
      GamePhase.Movement,
      {
        unitId,
        from: unit.position,
        to: committedPayload.to,
        facing: committedPayload.facing as Facing,
        movementType: committedPayload.movementType,
        ...(mode ? { mode } : {}),
        path,
        mpUsed: committedPayload.mpUsed,
        heatGenerated: committedPayload.heatGenerated,
        hexesMoved: decomposition.hexesMoved,
        straightHexes: decomposition.straightHexes,
        turningMpCost: decomposition.turningMpCost,
        netDisplacement: decomposition.netDisplacement,
        steps: decomposition.steps,
      },
      unitId,
    ),
  );

  nextState = queueMovementDamagePSRs({
    currentState: nextState,
    events,
    gameId,
    unitId,
    movementType: committedPayload.movementType,
    steps: decomposition.steps,
  });
  nextState = queueMovementControlPSRs({
    currentState: nextState,
    events,
    gameId,
    unitId,
    movementType: committedPayload.movementType,
    steps: decomposition.steps,
  });
  nextState = applyMovementMinefieldEffects({
    currentState: nextState,
    events,
    gameId,
    grid,
    unitId,
    steps: decomposition.steps,
    d6Roller,
  });
  return queueMovementTerrainPSRs({
    currentState: nextState,
    events,
    gameId,
    grid,
    unitId,
    movementType: committedPayload.movementType,
    steps: decomposition.steps,
  });
}
