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
  TokenUnitType,
  VehicleMotionType,
} from '@/types/gameplay';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { deriveMovementRangeHexForDestination } from '@/utils/gameplay/movement/reachable';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

import {
  tacticalMapHexTerrain,
  tacticalMapTokens,
} from './tactical-map.fixtures';

const tacticalMapHoverWaterOrigin = { q: 0, r: 0 } as const;
const tacticalMapHoverWaterDestination = { q: 1, r: 0 } as const;

const tacticalMapHoverWaterUnit: IUnitGameState = {
  id: 'attacker',
  side: GameSide.Player,
  position: tacticalMapHoverWaterOrigin,
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

const tacticalMapHoverWaterCapability: IMovementCapability = {
  walkMP: 3,
  runMP: 5,
  jumpMP: 0,
  movementMode: 'hover',
};

function isHoverWaterTerrainOverride(terrain: IHexTerrain): boolean {
  const { q, r } = terrain.coordinate;
  return (
    (q === tacticalMapHoverWaterOrigin.q &&
      r === tacticalMapHoverWaterOrigin.r) ||
    (q === tacticalMapHoverWaterDestination.q &&
      r === tacticalMapHoverWaterDestination.r)
  );
}

export const tacticalMapHoverWaterHexTerrain: readonly IHexTerrain[] = [
  ...tacticalMapHexTerrain.filter(
    (terrain) => !isHoverWaterTerrainOverride(terrain),
  ),
  {
    coordinate: tacticalMapHoverWaterOrigin,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: tacticalMapHoverWaterDestination,
    elevation: 0,
    features: [
      { type: TerrainType.Water, level: 2 },
      { type: TerrainType.Smoke, level: 1 },
    ],
  },
];

function tacticalMapHoverWaterGrid(): IHexGrid {
  const grid = createHexGrid({ radius: 3 });
  const hexes = new Map(grid.hexes);

  for (const terrain of tacticalMapHoverWaterHexTerrain) {
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
    throw new Error('Expected hover water movement projection');
  }
  return projection;
}

export const tacticalMapHoverWaterSelectedHex = tacticalMapHoverWaterOrigin;

export const tacticalMapHoverWaterTokens: readonly IUnitToken[] =
  tacticalMapTokens.map((token) => {
    if (token.unitId === 'attacker') {
      return {
        ...token,
        name: 'Savannah Master Hovercraft',
        designation: 'SM1',
        position: tacticalMapHoverWaterOrigin,
        unitType: TokenUnitType.Vehicle,
        vehicleMotionType: VehicleMotionType.Hover,
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

export const tacticalMapHoverWaterMovementRange: readonly IMovementRangeHex[] =
  [
    requireSingleMovementProjection(
      deriveMovementRangeHexForDestination(
        tacticalMapHoverWaterUnit,
        MovementType.Walk,
        tacticalMapHoverWaterGrid(),
        tacticalMapHoverWaterCapability,
        tacticalMapHoverWaterDestination,
      ),
    ),
  ];

export const tacticalMapHoverWaterMpLegend: MapMovementPointLegendState = {
  active: 'walk',
  movementMode: 'hover',
  walkMP: tacticalMapHoverWaterCapability.walkMP,
  runMP: tacticalMapHoverWaterCapability.runMP,
  jumpAvailable: false,
};

export function tacticalMapHoverWaterCommitInput(): ICommittedMovementValidationInput {
  return {
    grid: tacticalMapHoverWaterGrid(),
    unit: tacticalMapHoverWaterUnit,
    to: tacticalMapHoverWaterDestination,
    facing: Facing.Northeast,
    movementType: MovementType.Walk,
    capability: tacticalMapHoverWaterCapability,
    path: [tacticalMapHoverWaterOrigin, tacticalMapHoverWaterDestination],
  };
}
