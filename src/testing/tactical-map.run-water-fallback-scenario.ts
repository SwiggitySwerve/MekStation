import type { MapMovementPointLegendState } from '@/components/gameplay/HexMapDisplay/HexMapDisplay.types';
import type {
  IHexGrid,
  IHexTerrain,
  IMovementCapability,
  IMovementRangeHex,
  IUnitGameState,
  IUnitToken,
} from '@/types/gameplay';
import type { ICommittedMovementValidationInput } from '@/utils/gameplay/movement/commitValidation';

import {
  buildMovementPlan,
  mergeRunMovementRangeHexes,
} from '@/components/gameplay/pages/gameSession/GameSessionPage.movementPlanning';
import { Facing, GameSide, MovementType, TerrainType } from '@/types/gameplay';
import { deriveMovementRangeHexForDestination } from '@/utils/gameplay/movement/reachable';

import {
  createTacticalMapTerrainGrid,
  createTacticalMapUnitState,
  facingForTacticalMapProjection,
  overrideTacticalMapTokens,
  requireTacticalMapMovementProjection,
} from './tactical-map.fixture-helpers';
import {
  tacticalMapHexTerrain,
  tacticalMapTokens,
} from './tactical-map.fixtures';

const tacticalMapRunWaterFallbackOrigin = { q: 0, r: 0 } as const;
const tacticalMapRunWaterFallbackDestination = { q: 2, r: 0 } as const;

const tacticalMapRunWaterFallbackUnit: IUnitGameState =
  createTacticalMapUnitState({
    id: 'attacker',
    side: GameSide.Player,
    position: tacticalMapRunWaterFallbackOrigin,
    facing: Facing.Southeast,
  });

const tacticalMapRunWaterFallbackCapability: IMovementCapability = {
  walkMP: 5,
  runMP: 6,
  jumpMP: 0,
  movementHeatProfile: 'mek',
};

function tacticalMapRunWaterFallbackGrid(): IHexGrid {
  return createTacticalMapTerrainGrid(tacticalMapRunWaterFallbackHexTerrain);
}

function isRunWaterFallbackTerrainOverride(terrain: IHexTerrain): boolean {
  const { q, r } = terrain.coordinate;
  return (
    (q === tacticalMapRunWaterFallbackOrigin.q &&
      r === tacticalMapRunWaterFallbackOrigin.r) ||
    (q === 1 && r === 0) ||
    (q === tacticalMapRunWaterFallbackDestination.q &&
      r === tacticalMapRunWaterFallbackDestination.r)
  );
}

export const tacticalMapRunWaterFallbackHexTerrain: readonly IHexTerrain[] = [
  ...tacticalMapHexTerrain.filter(
    (terrain) => !isRunWaterFallbackTerrainOverride(terrain),
  ),
  {
    coordinate: tacticalMapRunWaterFallbackOrigin,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: { q: 1, r: 0 },
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: tacticalMapRunWaterFallbackDestination,
    elevation: 0,
    features: [{ type: TerrainType.Water, level: 2 }],
  },
];

export const tacticalMapRunWaterFallbackSelectedHex =
  tacticalMapRunWaterFallbackOrigin;

export const tacticalMapRunWaterFallbackTokens: readonly IUnitToken[] =
  overrideTacticalMapTokens(tacticalMapTokens, {
    attacker: { position: tacticalMapRunWaterFallbackOrigin },
    occluded: {
      position: { q: 3, r: -1 },
      isActiveTarget: false,
    },
  });

const tacticalMapRunWaterFallbackRunProjection =
  requireTacticalMapMovementProjection(
    deriveMovementRangeHexForDestination(
      tacticalMapRunWaterFallbackUnit,
      MovementType.Run,
      tacticalMapRunWaterFallbackGrid(),
      tacticalMapRunWaterFallbackCapability,
      tacticalMapRunWaterFallbackDestination,
    ),
  );

const tacticalMapRunWaterFallbackWalkProjection =
  requireTacticalMapMovementProjection(
    deriveMovementRangeHexForDestination(
      tacticalMapRunWaterFallbackUnit,
      MovementType.Walk,
      tacticalMapRunWaterFallbackGrid(),
      tacticalMapRunWaterFallbackCapability,
      tacticalMapRunWaterFallbackDestination,
    ),
  );

export const tacticalMapRunWaterFallbackMovementRange: readonly IMovementRangeHex[] =
  mergeRunMovementRangeHexes(
    [tacticalMapRunWaterFallbackRunProjection],
    [tacticalMapRunWaterFallbackWalkProjection],
  );

export const tacticalMapRunWaterFallbackMpLegend: MapMovementPointLegendState =
  {
    active: 'run',
    walkMP: tacticalMapRunWaterFallbackCapability.walkMP,
    runMP: tacticalMapRunWaterFallbackCapability.runMP,
    jumpAvailable: false,
  };

export function tacticalMapRunWaterFallbackCommitInput(): ICommittedMovementValidationInput {
  const projected = tacticalMapRunWaterFallbackMovementRange[0];
  const plan = projected
    ? buildMovementPlan({
        hex: tacticalMapRunWaterFallbackDestination,
        selectedUnitState: tacticalMapRunWaterFallbackUnit,
        movementRangeLookup: new Map([
          [
            `${tacticalMapRunWaterFallbackDestination.q},${tacticalMapRunWaterFallbackDestination.r}`,
            projected,
          ],
        ]),
        movementType: MovementType.Run,
      })
    : null;

  if (!plan) {
    throw new Error('Expected run-water fallback movement plan');
  }

  return {
    grid: tacticalMapRunWaterFallbackGrid(),
    unit: tacticalMapRunWaterFallbackUnit,
    to: plan.destination,
    facing: facingForTacticalMapProjection(
      projected,
      tacticalMapRunWaterFallbackUnit.facing,
    ),
    movementType: plan.movementType,
    capability: tacticalMapRunWaterFallbackCapability,
    path: plan.path,
  };
}
