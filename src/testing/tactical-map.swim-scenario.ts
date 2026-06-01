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

const tacticalMapSwimOrigin = { q: 0, r: 0 } as const;
const tacticalMapSwimDestination = { q: 1, r: 0 } as const;

const tacticalMapSwimUnit: IUnitGameState = {
  id: 'attacker',
  side: GameSide.Player,
  position: tacticalMapSwimOrigin,
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

const tacticalMapSwimCapability: IMovementCapability = {
  walkMP: 1,
  runMP: 1,
  jumpMP: 0,
  movementMode: 'biped_swim',
};

function isSwimTerrainOverride(terrain: IHexTerrain): boolean {
  const { q, r } = terrain.coordinate;
  return (
    (q === tacticalMapSwimOrigin.q && r === tacticalMapSwimOrigin.r) ||
    (q === tacticalMapSwimDestination.q && r === tacticalMapSwimDestination.r)
  );
}

export const tacticalMapSwimHexTerrain: readonly IHexTerrain[] = [
  ...tacticalMapHexTerrain.filter((terrain) => !isSwimTerrainOverride(terrain)),
  {
    coordinate: tacticalMapSwimOrigin,
    elevation: 0,
    features: [{ type: TerrainType.Water, level: 2 }],
  },
  {
    coordinate: tacticalMapSwimDestination,
    elevation: 3,
    features: [{ type: TerrainType.Water, level: 2 }],
  },
];

function tacticalMapSwimGrid(): IHexGrid {
  const grid = createHexGrid({ radius: 3 });
  const hexes = new Map(grid.hexes);

  for (const terrain of tacticalMapSwimHexTerrain) {
    const key = coordToKey(terrain.coordinate);
    const hex = hexes.get(key);
    if (!hex) throw new Error(`Missing tactical-map swim fixture hex ${key}`);
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
    throw new Error('Expected tactical-map swim movement projection');
  }
  return projection;
}

export const tacticalMapSwimSelectedHex = tacticalMapSwimOrigin;

export const tacticalMapSwimTokens: readonly IUnitToken[] =
  tacticalMapTokens.map((token) => {
    if (token.unitId === 'attacker') {
      return {
        ...token,
        name: 'Shadow Hawk SHD-2H Swim Mode',
        designation: 'SWM',
        position: tacticalMapSwimOrigin,
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

export const tacticalMapSwimMovementRange: readonly IMovementRangeHex[] = [
  requireSingleMovementProjection(
    deriveMovementRangeHexForDestination(
      tacticalMapSwimUnit,
      MovementType.Walk,
      tacticalMapSwimGrid(),
      tacticalMapSwimCapability,
      tacticalMapSwimDestination,
    ),
  ),
];

export const tacticalMapSwimMpLegend: MapMovementPointLegendState = {
  active: 'walk',
  movementMode: 'biped_swim',
  walkMP: tacticalMapSwimCapability.walkMP,
  runMP: tacticalMapSwimCapability.runMP,
  jumpAvailable: false,
};

export function tacticalMapSwimCommitInput(): ICommittedMovementValidationInput {
  return {
    grid: tacticalMapSwimGrid(),
    unit: tacticalMapSwimUnit,
    to: tacticalMapSwimDestination,
    facing: Facing.Northeast,
    movementType: MovementType.Walk,
    capability: tacticalMapSwimCapability,
    path: [tacticalMapSwimOrigin, tacticalMapSwimDestination],
  };
}
