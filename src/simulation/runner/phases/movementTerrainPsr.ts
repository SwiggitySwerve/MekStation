import {
  GamePhase,
  PSRTrigger,
  type IGameEvent,
  type IGameState,
  type IHexCoordinate,
  type IHexGrid,
  type IPendingPSR,
  MovementType,
} from '@/types/gameplay';
import {
  TerrainType,
  type ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';
import {
  createPSRTriggeredEvent,
  createUnitStuckEvent,
} from '@/utils/gameplay/gameEvents/statusChecks';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { parseTerrainFeatures } from '@/utils/gameplay/lineOfSight';
import {
  createEnteringWaterPSR,
  createBuildingCollapsePSR,
  createExitingWaterPSR,
  createIcePSR,
  createRubblePSR,
  createRunningRoughTerrainPSR,
  createSkiddingPSR,
  createSwampBogDownPSR,
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

function isRunBasedMovement(movementType: MovementType): boolean {
  return (
    movementType === MovementType.Run ||
    movementType === MovementType.Evade ||
    movementType === MovementType.Sprint
  );
}

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
  const unit = currentState.units[unitId];

  for (const step of steps) {
    if (
      step.kind !== 'forward' &&
      step.kind !== 'jump' &&
      step.kind !== 'turn'
    ) {
      continue;
    }

    if (
      unit &&
      !currentState.units[unitId]?.isStuck &&
      isJumpIntoSwampBogDown({
        grid,
        movementType,
        step,
        unitType: unit.unitType,
      })
    ) {
      currentState = {
        ...currentState,
        units: {
          ...currentState.units,
          [unitId]: {
            ...currentState.units[unitId],
            isStuck: true,
          },
        },
      };
      events.push(
        createUnitStuckEvent(
          gameId,
          events.length,
          currentState.turn,
          GamePhase.Movement,
          unitId,
          'Jumped into bog-down terrain',
          PSRTrigger.SwampBogDown,
        ),
      );
      continue;
    }

    const psrs = terrainPSRsForStep({
      grid,
      movementType,
      step,
      steps,
      unitId,
      unitTonnage: unit?.tonnage,
      unitType: unit?.unitType,
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
          psr.fixedTargetNumber,
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
  readonly unitTonnage?: number;
  readonly unitType?: string;
}): readonly IPendingPSR[] {
  const { grid, movementType, step, steps, unitId, unitTonnage, unitType } =
    options;
  const enteredFeatures = terrainFeaturesFromTag(
    step.terrainEntered ?? terrainAt(grid, step.to),
  );
  const fromFeatures = terrainFeaturesFromTag(terrainAt(grid, step.from));
  const psrs: IPendingPSR[] = [];

  if (
    hasTerrainFeature(fromFeatures, TerrainType.Water) &&
    !hasTerrainFeature(enteredFeatures, TerrainType.Water)
  ) {
    psrs.push(createExitingWaterPSR(unitId, step.index));
  }

  if (
    hasTerrainFeature(enteredFeatures, TerrainType.Water) &&
    !hasTerrainFeature(fromFeatures, TerrainType.Water)
  ) {
    psrs.push(
      createEnteringWaterPSR(unitId, step.index, {
        waterDepth: waterDepthFromFeatures(enteredFeatures),
      }),
    );
  }

  if (hasTerrainFeature(enteredFeatures, TerrainType.Rubble)) {
    psrs.push(createRubblePSR(unitId, step.index));
  }

  if (
    hasTerrainFeature(enteredFeatures, TerrainType.Rough) &&
    isRunBasedMovement(movementType)
  ) {
    psrs.push(createRunningRoughTerrainPSR(unitId, step.index));
  }

  if (hasTerrainFeature(enteredFeatures, TerrainType.Ice)) {
    psrs.push(createIcePSR(unitId, step.index));
  }

  if (
    step.kind !== 'turn' &&
    movementType !== MovementType.Jump &&
    isBattleMechLikeUnitType(unitType) &&
    hasTerrainFeature(enteredFeatures, TerrainType.Swamp) &&
    !hasTerrainFeature(fromFeatures, TerrainType.Swamp) &&
    !hasTerrainFeature(enteredFeatures, TerrainType.Pavement)
  ) {
    psrs.push(
      createSwampBogDownPSR(unitId, step.index, {
        swampDepth: terrainLevelFromFeatures(
          enteredFeatures,
          TerrainType.Swamp,
        ),
      }),
    );
  }

  const hasOverloadedBuilding = hasOverloadedBuildingFeature(
    enteredFeatures,
    unitTonnage,
  );
  if (
    step.kind !== 'turn' &&
    isBattleMechLikeUnitType(unitType) &&
    hasOverloadedBuilding
  ) {
    psrs.push(createBuildingCollapsePSR(unitId, step.index));
  }

  if (
    step.kind === 'turn' &&
    isRunBasedMovement(movementType) &&
    isSkidTerrain(terrainFeaturesFromTag(terrainAt(grid, step.at)))
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

function isJumpIntoSwampBogDown(options: {
  readonly grid: IHexGrid;
  readonly movementType: MovementType;
  readonly step: TerrainBearingMovementStep;
  readonly unitType?: string;
}): boolean {
  const { grid, movementType, step, unitType } = options;
  if (movementType !== MovementType.Jump || step.kind !== 'jump') return false;
  if (!isBattleMechLikeUnitType(unitType)) return false;

  const enteredFeatures = terrainFeaturesFromTag(
    step.terrainEntered ?? terrainAt(grid, step.to),
  );
  const fromFeatures = terrainFeaturesFromTag(terrainAt(grid, step.from));
  return (
    hasTerrainFeature(enteredFeatures, TerrainType.Swamp) &&
    !hasTerrainFeature(fromFeatures, TerrainType.Swamp) &&
    !hasTerrainFeature(enteredFeatures, TerrainType.Pavement)
  );
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

function terrainFeaturesFromTag(
  tag: string | undefined,
): readonly ITerrainFeature[] {
  if (!tag) return [];
  return parseTerrainFeatures(tag);
}

function hasTerrainFeature(
  terrainFeatures: readonly ITerrainFeature[],
  terrainType: TerrainType,
): boolean {
  return terrainFeatures.some(
    (feature) => feature.type === terrainType && feature.level > 0,
  );
}

function waterDepthFromFeatures(
  terrainFeatures: readonly ITerrainFeature[],
): number | undefined {
  const water = terrainFeatures.find(
    (feature) => feature.type === TerrainType.Water,
  );
  if (!water) return undefined;
  return Math.max(1, water.level);
}

function terrainLevelFromFeatures(
  terrainFeatures: readonly ITerrainFeature[],
  terrainType: TerrainType,
): number | undefined {
  const feature = terrainFeatures.find((entry) => entry.type === terrainType);
  if (!feature) return undefined;
  return Math.max(1, feature.level);
}

function hasOverloadedBuildingFeature(
  terrainFeatures: readonly ITerrainFeature[],
  unitTonnage: number | undefined,
): boolean {
  if (unitTonnage === undefined || !Number.isFinite(unitTonnage)) return false;

  const building = terrainFeatures.find(
    (feature) =>
      feature.type === TerrainType.Building &&
      feature.level > 0 &&
      feature.constructionFactor !== undefined &&
      Number.isFinite(feature.constructionFactor),
  );
  if (!building || building.constructionFactor === undefined) return false;

  return unitTonnage > building.constructionFactor;
}

function isBattleMechLikeUnitType(unitType: string | undefined): boolean {
  if (unitType === undefined) return true;
  const canonical = unitType.toLowerCase().replace(/[^a-z0-9]/g, '');
  return (
    canonical === 'battlemech' ||
    canonical === 'omnimech' ||
    canonical === 'industrialmech'
  );
}

function isSkidTerrain(terrainFeatures: readonly ITerrainFeature[]): boolean {
  return (
    hasTerrainFeature(terrainFeatures, TerrainType.Pavement) ||
    hasTerrainFeature(terrainFeatures, TerrainType.Ice)
  );
}
