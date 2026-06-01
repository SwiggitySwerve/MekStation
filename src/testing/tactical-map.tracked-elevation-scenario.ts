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

const tacticalMapTrackedElevationOrigin = { q: 0, r: 0 } as const;
const tacticalMapTrackedElevationDestination = { q: 1, r: 0 } as const;

const tacticalMapTrackedElevationUnit: IUnitGameState = {
  id: 'attacker',
  side: GameSide.Player,
  position: tacticalMapTrackedElevationOrigin,
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

const tacticalMapTrackedElevationCapability: IMovementCapability = {
  walkMP: 5,
  runMP: 8,
  jumpMP: 0,
  movementMode: 'tracked',
};

function isTrackedElevationTerrainOverride(terrain: IHexTerrain): boolean {
  const { q, r } = terrain.coordinate;
  return (
    (q === tacticalMapTrackedElevationOrigin.q &&
      r === tacticalMapTrackedElevationOrigin.r) ||
    (q === tacticalMapTrackedElevationDestination.q &&
      r === tacticalMapTrackedElevationDestination.r)
  );
}

export const tacticalMapTrackedElevationHexTerrain: readonly IHexTerrain[] = [
  ...tacticalMapHexTerrain.filter(
    (terrain) => !isTrackedElevationTerrainOverride(terrain),
  ),
  {
    coordinate: tacticalMapTrackedElevationOrigin,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: tacticalMapTrackedElevationDestination,
    elevation: 2,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
];

function tacticalMapTrackedElevationGrid(): IHexGrid {
  const grid = createHexGrid({ radius: 3 });
  const hexes = new Map(grid.hexes);

  for (const terrain of tacticalMapTrackedElevationHexTerrain) {
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
    throw new Error('Expected tracked elevation movement projection');
  }
  return projection;
}

export const tacticalMapTrackedElevationSelectedHex =
  tacticalMapTrackedElevationOrigin;

export const tacticalMapTrackedElevationTokens: readonly IUnitToken[] =
  tacticalMapTokens.map((token) => {
    if (token.unitId === 'attacker') {
      return {
        ...token,
        name: 'Scorpion Light Tank',
        designation: 'SCN',
        position: tacticalMapTrackedElevationOrigin,
        unitType: TokenUnitType.Vehicle,
        vehicleMotionType: VehicleMotionType.Tracked,
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

export const tacticalMapTrackedElevationMovementRange: readonly IMovementRangeHex[] =
  [
    requireSingleMovementProjection(
      deriveMovementRangeHexForDestination(
        tacticalMapTrackedElevationUnit,
        MovementType.Walk,
        tacticalMapTrackedElevationGrid(),
        tacticalMapTrackedElevationCapability,
        tacticalMapTrackedElevationDestination,
      ),
    ),
  ];

export const tacticalMapTrackedElevationMpLegend: MapMovementPointLegendState =
  {
    active: 'walk',
    movementMode: 'tracked',
    walkMP: tacticalMapTrackedElevationCapability.walkMP,
    runMP: tacticalMapTrackedElevationCapability.runMP,
    jumpAvailable: false,
  };

export function tacticalMapTrackedElevationCommitInput(): ICommittedMovementValidationInput {
  return {
    grid: tacticalMapTrackedElevationGrid(),
    unit: tacticalMapTrackedElevationUnit,
    to: tacticalMapTrackedElevationDestination,
    facing: Facing.Northeast,
    movementType: MovementType.Walk,
    capability: tacticalMapTrackedElevationCapability,
    path: [
      tacticalMapTrackedElevationOrigin,
      tacticalMapTrackedElevationDestination,
    ],
  };
}
