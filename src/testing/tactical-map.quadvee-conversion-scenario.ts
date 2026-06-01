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
} from '@/types/gameplay';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { deriveMovementRangeHexForDestination } from '@/utils/gameplay/movement/reachable';
import { resolveRuntimeMovementCapability } from '@/utils/gameplay/movement/runtimeCapability';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

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

const tacticalMapQuadveeMekUnit: IUnitGameState = {
  id: 'attacker',
  side: GameSide.Player,
  position: tacticalMapQuadveeConversionOrigin,
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
  conversionMode: 'mek',
};

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
  const grid = createHexGrid({ radius: 3 });
  const hexes = new Map(grid.hexes);

  for (const terrain of tacticalMapQuadveeConversionHexTerrain) {
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
    throw new Error('Expected QuadVee conversion movement projection');
  }
  return projection;
}

function quadveeConversionTokens(
  designation: string,
  name: string,
): readonly IUnitToken[] {
  return [
    {
      unitId: 'attacker',
      name,
      designation,
      position: tacticalMapQuadveeConversionOrigin,
      facing: Facing.Northeast,
      side: GameSide.Player,
      isDestroyed: false,
      isSelected: true,
      isValidTarget: false,
      unitType: TokenUnitType.Mech,
    },
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
    requireSingleMovementProjection(
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
    requireSingleMovementProjection(
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
    facing: Facing.Northeast,
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
    facing: Facing.Northeast,
    movementType: MovementType.Walk,
    capability: tacticalMapQuadveeCapability,
    path: [
      tacticalMapQuadveeConversionOrigin,
      tacticalMapQuadveeConversionClimb,
    ],
  };
}
