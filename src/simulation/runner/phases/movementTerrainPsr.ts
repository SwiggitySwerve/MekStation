import {
  GamePhase,
  type IGameEvent,
  type IGameState,
  type IHexCoordinate,
  type IHexGrid,
  type IPendingPSR,
  MovementType,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { createPSRTriggeredEvent } from '@/utils/gameplay/gameEvents/statusChecks';
import { coordToKey } from '@/utils/gameplay/hexMath';
import {
  createEnteringWaterPSR,
  createExitingWaterPSR,
  createIcePSR,
  createRubblePSR,
  createRunningRoughTerrainPSR,
  createSkiddingPSR,
} from '@/utils/gameplay/pilotingSkillRolls';

import { queuePendingPSR } from './physicalAttackPsr';

type TerrainBearingMovementStep = {
  readonly kind: string;
  readonly index: number;
  readonly at?: IHexCoordinate;
  readonly from?: IHexCoordinate;
  readonly to?: IHexCoordinate;
  readonly terrainEntered?: string;
};

export function queueMovementTerrainPSRs(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  grid: IHexGrid;
  unitId: string;
  movementType: MovementType;
  steps: readonly TerrainBearingMovementStep[];
}): IGameState {
  const { events, gameId, grid, movementType, steps, unitId } = options;
  let currentState = options.currentState;

  for (const step of steps) {
    if (
      step.kind !== 'forward' &&
      step.kind !== 'jump' &&
      step.kind !== 'turn'
    ) {
      continue;
    }

    const psrs = terrainPSRsForStep({
      grid,
      movementType,
      step,
      steps,
      unitId,
    });

    for (const psr of psrs) {
      currentState = queuePendingPSR(currentState, unitId, psr);
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
          currentState.units[unitId]?.piloting,
          psr.reasonCode,
        ),
      );
    }
  }

  return currentState;
}

function terrainPSRsForStep(options: {
  readonly grid: IHexGrid;
  readonly movementType: MovementType;
  readonly step: TerrainBearingMovementStep;
  readonly steps: readonly TerrainBearingMovementStep[];
  readonly unitId: string;
}): readonly IPendingPSR[] {
  const { grid, movementType, step, steps, unitId } = options;
  const enteredTerrain = terrainTypeFromTag(
    step.terrainEntered ?? terrainAt(grid, step.to),
  );
  const fromTerrain = terrainTypeFromTag(terrainAt(grid, step.from));
  const psrs: IPendingPSR[] = [];

  if (
    fromTerrain === TerrainType.Water &&
    enteredTerrain !== TerrainType.Water
  ) {
    psrs.push(createExitingWaterPSR(unitId, step.index));
  }

  if (
    enteredTerrain === TerrainType.Water &&
    fromTerrain !== TerrainType.Water
  ) {
    psrs.push(createEnteringWaterPSR(unitId, step.index));
  }

  if (enteredTerrain === TerrainType.Rubble) {
    psrs.push(createRubblePSR(unitId, step.index));
  }

  if (
    enteredTerrain === TerrainType.Rough &&
    movementType === MovementType.Run
  ) {
    psrs.push(createRunningRoughTerrainPSR(unitId, step.index));
  }

  if (enteredTerrain === TerrainType.Ice) {
    psrs.push(createIcePSR(unitId, step.index));
  }

  if (
    step.kind === 'turn' &&
    movementType === MovementType.Run &&
    isSkidTerrain(terrainTypeFromTag(terrainAt(grid, step.at)))
  ) {
    psrs.push(
      createSkiddingPSR(
        unitId,
        step.index,
        calculateMovementBeforeSkidModifier(
          countHexesMovedBeforeStep(steps, step.index),
        ),
      ),
    );
  }

  return psrs;
}

function countHexesMovedBeforeStep(
  steps: readonly TerrainBearingMovementStep[],
  stepIndex: number,
): number {
  return steps.filter(
    (candidate) =>
      candidate.index < stepIndex &&
      (candidate.kind === 'forward' || candidate.kind === 'jump'),
  ).length;
}

function calculateMovementBeforeSkidModifier(distance: number): number {
  let modifier: number;

  if (distance > 24) {
    modifier = 6;
  } else if (distance > 17) {
    modifier = 5;
  } else if (distance > 10) {
    modifier = 4;
  } else if (distance > 7) {
    modifier = 2;
  } else if (distance > 4) {
    modifier = 1;
  } else if (distance > 2) {
    modifier = 0;
  } else {
    modifier = -1;
  }

  return modifier;
}

function terrainAt(
  grid: IHexGrid,
  coord: IHexCoordinate | undefined,
): string | undefined {
  if (!coord) return undefined;
  return grid.hexes.get(coordToKey(coord))?.terrain;
}

function terrainTypeFromTag(tag: string | undefined): TerrainType | null {
  if (!tag) return null;
  return Object.values(TerrainType).includes(tag as TerrainType)
    ? (tag as TerrainType)
    : null;
}

function isSkidTerrain(terrain: TerrainType | null): boolean {
  return terrain === TerrainType.Pavement || terrain === TerrainType.Ice;
}
