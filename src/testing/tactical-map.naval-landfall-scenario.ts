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

const tacticalMapNavalLandfallOrigin = { q: 0, r: 0 } as const;
const tacticalMapNavalLandfallDestination = { q: 1, r: 0 } as const;

const tacticalMapNavalLandfallUnit: IUnitGameState = createTacticalMapUnitState(
  {
    id: 'attacker',
    side: GameSide.Player,
    position: tacticalMapNavalLandfallOrigin,
    facing: Facing.Northeast,
  },
);

const tacticalMapNavalLandfallCapability: IMovementCapability = {
  walkMP: 3,
  runMP: 5,
  jumpMP: 0,
  movementMode: 'naval',
};

function isNavalLandfallTerrainOverride(terrain: IHexTerrain): boolean {
  const { q, r } = terrain.coordinate;
  return (
    (q === tacticalMapNavalLandfallOrigin.q &&
      r === tacticalMapNavalLandfallOrigin.r) ||
    (q === tacticalMapNavalLandfallDestination.q &&
      r === tacticalMapNavalLandfallDestination.r)
  );
}

export const tacticalMapNavalLandfallHexTerrain: readonly IHexTerrain[] = [
  ...tacticalMapHexTerrain.filter(
    (terrain) => !isNavalLandfallTerrainOverride(terrain),
  ),
  {
    coordinate: tacticalMapNavalLandfallOrigin,
    elevation: 0,
    features: [{ type: TerrainType.Water, level: 1 }],
  },
  {
    coordinate: tacticalMapNavalLandfallDestination,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
];

function tacticalMapNavalLandfallGrid(): IHexGrid {
  return createTacticalMapTerrainGrid(tacticalMapNavalLandfallHexTerrain);
}

export const tacticalMapNavalLandfallSelectedHex =
  tacticalMapNavalLandfallOrigin;

export const tacticalMapNavalLandfallTokens: readonly IUnitToken[] =
  overrideTacticalMapTokens(tacticalMapTokens, {
    attacker: {
      name: 'River Monitor',
      designation: 'RVM',
      position: tacticalMapNavalLandfallOrigin,
      unitType: TokenUnitType.Vehicle,
      vehicleMotionType: VehicleMotionType.Naval,
    },
    occluded: {
      position: { q: 3, r: -1 },
      isActiveTarget: false,
    },
  });

export const tacticalMapNavalLandfallMovementRange: readonly IMovementRangeHex[] =
  [
    requireTacticalMapMovementProjection(
      deriveMovementRangeHexForDestination(
        tacticalMapNavalLandfallUnit,
        MovementType.Walk,
        tacticalMapNavalLandfallGrid(),
        tacticalMapNavalLandfallCapability,
        tacticalMapNavalLandfallDestination,
      ),
    ),
  ];

export const tacticalMapNavalLandfallMpLegend: MapMovementPointLegendState = {
  active: 'walk',
  movementMode: 'naval',
  walkMP: tacticalMapNavalLandfallCapability.walkMP,
  runMP: tacticalMapNavalLandfallCapability.runMP,
  jumpAvailable: false,
};

export function tacticalMapNavalLandfallCommitInput(): ICommittedMovementValidationInput {
  return {
    grid: tacticalMapNavalLandfallGrid(),
    unit: tacticalMapNavalLandfallUnit,
    to: tacticalMapNavalLandfallDestination,
    facing: Facing.Northeast,
    movementType: MovementType.Walk,
    capability: tacticalMapNavalLandfallCapability,
    path: [tacticalMapNavalLandfallOrigin, tacticalMapNavalLandfallDestination],
  };
}
