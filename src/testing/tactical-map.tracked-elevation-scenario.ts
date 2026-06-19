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
  MovementType,
  TerrainType,
  TokenUnitType,
  VehicleMotionType,
} from '@/types/gameplay';
import { deriveMovementRangeHexForDestination } from '@/utils/gameplay/movement/reachable';

import {
  createTacticalMapTerrainGrid,
  createTacticalMapUnitState,
  overrideTacticalMapTokens,
  requireTacticalMapMovementProjection,
} from './tactical-map.fixture-helpers';
import {
  tacticalMapHexTerrain,
  tacticalMapTokens,
} from './tactical-map.fixtures';

const tacticalMapTrackedElevationOrigin = { q: 0, r: 0 } as const;
const tacticalMapTrackedElevationDestination = { q: 1, r: 0 } as const;

const tacticalMapTrackedElevationUnit: IUnitGameState =
  createTacticalMapUnitState({
    id: 'attacker',
    side: GameSide.Player,
    position: tacticalMapTrackedElevationOrigin,
    facing: Facing.Northeast,
  });

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
  return createTacticalMapTerrainGrid(tacticalMapTrackedElevationHexTerrain);
}

export const tacticalMapTrackedElevationSelectedHex =
  tacticalMapTrackedElevationOrigin;

export const tacticalMapTrackedElevationTokens: readonly IUnitToken[] =
  overrideTacticalMapTokens(tacticalMapTokens, {
    attacker: {
      name: 'Scorpion Light Tank',
      designation: 'SCN',
      position: tacticalMapTrackedElevationOrigin,
      unitType: TokenUnitType.Vehicle,
      vehicleMotionType: VehicleMotionType.Tracked,
    },
    occluded: {
      position: { q: 3, r: -1 },
      isActiveTarget: false,
    },
  });

export const tacticalMapTrackedElevationMovementRange: readonly IMovementRangeHex[] =
  [
    requireTacticalMapMovementProjection(
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
