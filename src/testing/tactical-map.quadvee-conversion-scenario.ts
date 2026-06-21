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

import { Facing, GameSide, MovementType, TerrainType } from '@/types/gameplay';
import { deriveMovementRangeHexForDestination } from '@/utils/gameplay/movement/reachable';
import { resolveRuntimeMovementCapability } from '@/utils/gameplay/movement/runtimeCapability';

import {
  createTacticalMapPlayerMechToken,
  createTacticalMapTerrainGrid,
  createTacticalMapUnitState,
  facingForTacticalMapProjection,
  requireTacticalMapMovementProjection,
} from './tactical-map.fixture-helpers';
import { tacticalMapHexTerrain } from './tactical-map.fixtures';

const tacticalMapQuadveeConversionOrigin = { q: 0, r: 0 } as const;
const tacticalMapQuadveeConversionClimb = { q: 1, r: 0 } as const;

const tacticalMapQuadveeCapability: IMovementCapability = {
  walkMP: 4,
  runMP: 6,
  jumpMP: 3,
  movementMode: 'walk',
  unitHeight: 1,
  unitHeightProfile: { kind: 'quadvee', standingHeight: 1 },
};

const tacticalMapQuadveeMekUnit: IUnitGameState = createTacticalMapUnitState({
  id: 'attacker',
  side: GameSide.Player,
  position: tacticalMapQuadveeConversionOrigin,
  facing: Facing.Southeast,
  conversionMode: 'mek',
});

const tacticalMapQuadveeVehicleUnit: IUnitGameState = {
  ...tacticalMapQuadveeMekUnit,
  conversionMode: 'tracked',
};

function isQuadveeConversionTerrainOverride(terrain: IHexTerrain): boolean {
  const { q, r } = terrain.coordinate;
  return (
    (q === tacticalMapQuadveeConversionOrigin.q &&
      r === tacticalMapQuadveeConversionOrigin.r) ||
    (q === tacticalMapQuadveeConversionClimb.q &&
      r === tacticalMapQuadveeConversionClimb.r)
  );
}

export const tacticalMapQuadveeConversionHexTerrain: readonly IHexTerrain[] = [
  ...tacticalMapHexTerrain.filter(
    (terrain) => !isQuadveeConversionTerrainOverride(terrain),
  ),
  {
    coordinate: tacticalMapQuadveeConversionOrigin,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: tacticalMapQuadveeConversionClimb,
    elevation: 2,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
];

function tacticalMapQuadveeConversionGrid(): IHexGrid {
  return createTacticalMapTerrainGrid(tacticalMapQuadveeConversionHexTerrain);
}

function quadveeConversionTokens(
  designation: string,
  name: string,
): readonly IUnitToken[] {
  return [
    createTacticalMapPlayerMechToken({
      unitId: 'attacker',
      name,
      designation,
      position: tacticalMapQuadveeConversionOrigin,
    }),
  ];
}

export const tacticalMapQuadveeConversionSelectedHex =
  tacticalMapQuadveeConversionOrigin;

export const tacticalMapQuadveeMekTokens = quadveeConversionTokens(
  'QVM',
  'QuadVee Mek Mode',
);
export const tacticalMapQuadveeVehicleTokens = quadveeConversionTokens(
  'QVT',
  'QuadVee Vehicle Mode',
);

export const tacticalMapQuadveeMekMovementRange: readonly IMovementRangeHex[] =
  [
    requireTacticalMapMovementProjection(
      deriveMovementRangeHexForDestination(
        tacticalMapQuadveeMekUnit,
        MovementType.Walk,
        tacticalMapQuadveeConversionGrid(),
        tacticalMapQuadveeCapability,
        tacticalMapQuadveeConversionClimb,
      ),
    ),
  ];

export const tacticalMapQuadveeVehicleMovementRange: readonly IMovementRangeHex[] =
  [
    requireTacticalMapMovementProjection(
      deriveMovementRangeHexForDestination(
        tacticalMapQuadveeVehicleUnit,
        MovementType.Walk,
        tacticalMapQuadveeConversionGrid(),
        tacticalMapQuadveeCapability,
        tacticalMapQuadveeConversionClimb,
      ),
    ),
  ];

const tacticalMapQuadveeMekResolvedCapability =
  resolveRuntimeMovementCapability(
    tacticalMapQuadveeMekUnit,
    tacticalMapQuadveeCapability,
  ) ?? tacticalMapQuadveeCapability;
const tacticalMapQuadveeVehicleResolvedCapability =
  resolveRuntimeMovementCapability(
    tacticalMapQuadveeVehicleUnit,
    tacticalMapQuadveeCapability,
  ) ?? tacticalMapQuadveeCapability;

export const tacticalMapQuadveeMekMpLegend: MapMovementPointLegendState = {
  active: 'walk',
  movementMode: tacticalMapQuadveeMekResolvedCapability.movementMode,
  walkMP: tacticalMapQuadveeMekResolvedCapability.walkMP,
  runMP: tacticalMapQuadveeMekResolvedCapability.runMP,
  jumpMP: tacticalMapQuadveeMekResolvedCapability.jumpMP,
  jumpAvailable: tacticalMapQuadveeMekResolvedCapability.jumpMP > 0,
};

export const tacticalMapQuadveeVehicleMpLegend: MapMovementPointLegendState = {
  active: 'walk',
  movementMode: tacticalMapQuadveeVehicleResolvedCapability.movementMode,
  walkMP: tacticalMapQuadveeVehicleResolvedCapability.walkMP,
  runMP: tacticalMapQuadveeVehicleResolvedCapability.runMP,
  jumpMP: tacticalMapQuadveeVehicleResolvedCapability.jumpMP,
  jumpAvailable: tacticalMapQuadveeVehicleResolvedCapability.jumpMP > 0,
};

export function tacticalMapQuadveeMekCommitInput(): ICommittedMovementValidationInput {
  return {
    grid: tacticalMapQuadveeConversionGrid(),
    unit: tacticalMapQuadveeMekUnit,
    to: tacticalMapQuadveeConversionClimb,
    facing: facingForTacticalMapProjection(
      tacticalMapQuadveeMekMovementRange[0],
      tacticalMapQuadveeMekUnit.facing,
    ),
    movementType: MovementType.Walk,
    capability: tacticalMapQuadveeCapability,
    path: tacticalMapQuadveeMekMovementRange[0]?.path,
  };
}

export function tacticalMapQuadveeVehicleCommitInput(): ICommittedMovementValidationInput {
  return {
    grid: tacticalMapQuadveeConversionGrid(),
    unit: tacticalMapQuadveeVehicleUnit,
    to: tacticalMapQuadveeConversionClimb,
    facing: facingForTacticalMapProjection(
      tacticalMapQuadveeVehicleMovementRange[0],
      tacticalMapQuadveeVehicleUnit.facing,
    ),
    movementType: MovementType.Walk,
    capability: tacticalMapQuadveeCapability,
    path: [
      tacticalMapQuadveeConversionOrigin,
      tacticalMapQuadveeConversionClimb,
    ],
  };
}
