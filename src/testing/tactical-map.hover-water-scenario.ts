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

const tacticalMapHoverWaterOrigin = { q: 0, r: 0 } as const;
const tacticalMapHoverWaterDestination = { q: 1, r: 0 } as const;

const tacticalMapHoverWaterUnit: IUnitGameState = createTacticalMapUnitState({
  id: 'attacker',
  side: GameSide.Player,
  position: tacticalMapHoverWaterOrigin,
  facing: Facing.Northeast,
});

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
  return createTacticalMapTerrainGrid(tacticalMapHoverWaterHexTerrain);
}

export const tacticalMapHoverWaterSelectedHex = tacticalMapHoverWaterOrigin;

export const tacticalMapHoverWaterTokens: readonly IUnitToken[] =
  overrideTacticalMapTokens(tacticalMapTokens, {
    attacker: {
      name: 'Savannah Master Hovercraft',
      designation: 'SM1',
      position: tacticalMapHoverWaterOrigin,
      unitType: TokenUnitType.Vehicle,
      vehicleMotionType: VehicleMotionType.Hover,
    },
    occluded: {
      position: { q: 3, r: -1 },
      isActiveTarget: false,
    },
  });

export const tacticalMapHoverWaterMovementRange: readonly IMovementRangeHex[] =
  [
    requireTacticalMapMovementProjection(
      deriveMovementRangeHexForDestination(
        tacticalMapHoverWaterUnit,
        MovementType.Walk,
        tacticalMapHoverWaterGrid(),
        tacticalMapHoverWaterCapability,
        tacticalMapHoverWaterDestination,
      ),
      'hover water',
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
