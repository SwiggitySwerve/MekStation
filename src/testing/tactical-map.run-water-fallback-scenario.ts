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
import {
  Facing,
  GameSide,
  LockState,
  MovementType,
  TerrainType,
} from '@/types/gameplay';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { deriveMovementRangeHexForDestination } from '@/utils/gameplay/movement/reachable';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

import {
  tacticalMapHexTerrain,
  tacticalMapTokens,
} from './tactical-map.fixtures';

const tacticalMapRunWaterFallbackOrigin = { q: 0, r: 0 } as const;
const tacticalMapRunWaterFallbackDestination = { q: 2, r: 0 } as const;

const tacticalMapRunWaterFallbackUnit: IUnitGameState = {
  id: 'attacker',
  side: GameSide.Player,
  position: tacticalMapRunWaterFallbackOrigin,
  facing: Facing.Northeast,
  heat: 0,
  movementThisTurn: MovementType.Stationary,
  hexesMovedThisTurn: 0,
  armor: {},
  structure: {},
  destroyedLocations: [],
  destroyedEquipment: [],
  ammo: {},
  pilotWounds: 0,
  pilotConscious: true,
  destroyed: false,
  lockState: LockState.Pending,
};

const tacticalMapRunWaterFallbackCapability: IMovementCapability = {
  walkMP: 5,
  runMP: 6,
  jumpMP: 0,
  movementHeatProfile: 'mek',
};

function tacticalMapRunWaterFallbackGrid(): IHexGrid {
  const grid = createHexGrid({ radius: 3 });
  const hexes = new Map(grid.hexes);

  for (const terrain of tacticalMapRunWaterFallbackHexTerrain) {
    const key = coordToKey(terrain.coordinate);
    const hex = hexes.get(key);
    if (!hex) throw new Error(`Missing tactical-map fixture hex ${key}`);
    hexes.set(key, {
      ...hex,
      terrain: terrainStringFromFeatures(terrain.features),
      elevation: terrain.elevation,
    });
  }

  return { ...grid, hexes };
}

function requireSingleMovementProjection(
  projection: IMovementRangeHex | null,
): IMovementRangeHex {
  if (!projection) {
    throw new Error('Expected tactical-map movement projection');
  }
  return projection;
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
  tacticalMapTokens.map((token) => {
    if (token.unitId === 'attacker') {
      return {
        ...token,
        position: tacticalMapRunWaterFallbackOrigin,
      };
    }
    if (token.unitId === 'occluded') {
      return {
        ...token,
        position: { q: 3, r: -1 },
        isActiveTarget: false,
      };
    }
    return token;
  });

const tacticalMapRunWaterFallbackRunProjection =
  requireSingleMovementProjection(
    deriveMovementRangeHexForDestination(
      tacticalMapRunWaterFallbackUnit,
      MovementType.Run,
      tacticalMapRunWaterFallbackGrid(),
      tacticalMapRunWaterFallbackCapability,
      tacticalMapRunWaterFallbackDestination,
    ),
  );

const tacticalMapRunWaterFallbackWalkProjection =
  requireSingleMovementProjection(
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
    facing: plan.facing,
    movementType: plan.movementType,
    capability: tacticalMapRunWaterFallbackCapability,
    path: plan.path,
  };
}
