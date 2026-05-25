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

const tacticalMapFrogmanOrigin = { q: 0, r: 0 } as const;
const tacticalMapFrogmanDestination = { q: 1, r: 0 } as const;

const tacticalMapFrogmanUnit: IUnitGameState = {
  id: 'attacker',
  side: GameSide.Player,
  position: tacticalMapFrogmanOrigin,
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

const tacticalMapFrogmanCapability: IMovementCapability = {
  walkMP: 3,
  runMP: 5,
  jumpMP: 0,
  movementMode: 'walk',
  waterCapability: { frogmanSpecialist: true },
};

function isFrogmanTerrainOverride(terrain: IHexTerrain): boolean {
  const { q, r } = terrain.coordinate;
  return (
    (q === tacticalMapFrogmanOrigin.q && r === tacticalMapFrogmanOrigin.r) ||
    (q === tacticalMapFrogmanDestination.q &&
      r === tacticalMapFrogmanDestination.r)
  );
}

export const tacticalMapFrogmanHexTerrain: readonly IHexTerrain[] = [
  ...tacticalMapHexTerrain.filter(
    (terrain) => !isFrogmanTerrainOverride(terrain),
  ),
  {
    coordinate: tacticalMapFrogmanOrigin,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: tacticalMapFrogmanDestination,
    elevation: 0,
    features: [{ type: TerrainType.Water, level: 2 }],
  },
];

function tacticalMapFrogmanGrid(): IHexGrid {
  const grid = createHexGrid({ radius: 3 });
  const hexes = new Map(grid.hexes);

  for (const terrain of tacticalMapFrogmanHexTerrain) {
    const key = coordToKey(terrain.coordinate);
    const hex = hexes.get(key);
    if (!hex)
      throw new Error(`Missing tactical-map Frogman fixture hex ${key}`);
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
    throw new Error('Expected tactical-map Frogman movement projection');
  }
  return projection;
}

export const tacticalMapFrogmanSelectedHex = tacticalMapFrogmanOrigin;

export const tacticalMapFrogmanTokens: readonly IUnitToken[] =
  tacticalMapTokens.map((token) => {
    if (token.unitId === 'attacker') {
      return {
        ...token,
        name: 'Shadow Hawk Frogman Specialist',
        designation: 'FGM',
        position: tacticalMapFrogmanOrigin,
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

export const tacticalMapFrogmanMovementRange: readonly IMovementRangeHex[] = [
  requireSingleMovementProjection(
    deriveMovementRangeHexForDestination(
      tacticalMapFrogmanUnit,
      MovementType.Walk,
      tacticalMapFrogmanGrid(),
      tacticalMapFrogmanCapability,
      tacticalMapFrogmanDestination,
    ),
  ),
];

export const tacticalMapFrogmanMpLegend: MapMovementPointLegendState = {
  active: 'walk',
  walkMP: tacticalMapFrogmanCapability.walkMP,
  runMP: tacticalMapFrogmanCapability.runMP,
  jumpAvailable: false,
};

export function tacticalMapFrogmanCommitInput(): ICommittedMovementValidationInput {
  return {
    grid: tacticalMapFrogmanGrid(),
    unit: tacticalMapFrogmanUnit,
    to: tacticalMapFrogmanDestination,
    facing: Facing.Northeast,
    movementType: MovementType.Walk,
    capability: tacticalMapFrogmanCapability,
    path: [tacticalMapFrogmanOrigin, tacticalMapFrogmanDestination],
  };
}
