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
import { coordToKey } from '@/utils/gameplay/hexMath';
import { deriveMovementRangeHexForDestination } from '@/utils/gameplay/movement/reachable';

import {
  createTacticalMapMechToken,
  createTacticalMapPlayerMechToken,
  createTacticalMapTerrainGrid,
  createTacticalMapUnitState,
  requireTacticalMapMovementProjection,
} from './tactical-map.fixture-helpers';
import { tacticalMapHexTerrain } from './tactical-map.fixtures';

const tacticalMapOccupiedDestinationOrigin = { q: 0, r: 0 } as const;
const tacticalMapOccupiedDestinationHex = { q: 1, r: 0 } as const;

const tacticalMapOccupiedDestinationUnit: IUnitGameState =
  createTacticalMapUnitState({
    id: 'attacker',
    side: GameSide.Player,
    position: tacticalMapOccupiedDestinationOrigin,
    facing: Facing.Northeast,
  });

const tacticalMapOccupiedDestinationCapability: IMovementCapability = {
  walkMP: 4,
  runMP: 6,
  jumpMP: 3,
  movementHeatProfile: 'mek',
};

function isOccupiedDestinationTerrainOverride(terrain: IHexTerrain): boolean {
  const { q, r } = terrain.coordinate;
  return (
    (q === tacticalMapOccupiedDestinationOrigin.q &&
      r === tacticalMapOccupiedDestinationOrigin.r) ||
    (q === tacticalMapOccupiedDestinationHex.q &&
      r === tacticalMapOccupiedDestinationHex.r)
  );
}

export const tacticalMapOccupiedDestinationHexTerrain: readonly IHexTerrain[] =
  [
    ...tacticalMapHexTerrain.filter(
      (terrain) => !isOccupiedDestinationTerrainOverride(terrain),
    ),
    {
      coordinate: tacticalMapOccupiedDestinationOrigin,
      elevation: 0,
      features: [{ type: TerrainType.Clear, level: 0 }],
    },
    {
      coordinate: tacticalMapOccupiedDestinationHex,
      elevation: 0,
      features: [{ type: TerrainType.Clear, level: 0 }],
    },
  ];

function tacticalMapOccupiedDestinationGrid(): IHexGrid {
  const grid = createTacticalMapTerrainGrid(
    tacticalMapOccupiedDestinationHexTerrain,
  );
  const hexes = new Map(grid.hexes);

  const originKey = coordToKey(tacticalMapOccupiedDestinationOrigin);
  const originHex = hexes.get(originKey);
  if (!originHex) {
    throw new Error(`Missing tactical-map fixture hex ${originKey}`);
  }
  hexes.set(originKey, { ...originHex, occupantId: 'attacker' });

  const destinationKey = coordToKey(tacticalMapOccupiedDestinationHex);
  const destinationHex = hexes.get(destinationKey);
  if (!destinationHex) {
    throw new Error(`Missing tactical-map fixture hex ${destinationKey}`);
  }
  hexes.set(destinationKey, { ...destinationHex, occupantId: 'blocker' });

  return { ...grid, hexes };
}

function requireOccupiedDestinationMovementProjection(
  projection: IMovementRangeHex | null,
): IMovementRangeHex {
  return requireTacticalMapMovementProjection(
    projection,
    'occupied destination',
  );
}

export const tacticalMapOccupiedDestinationSelectedHex =
  tacticalMapOccupiedDestinationOrigin;

export const tacticalMapOccupiedDestinationTokens: readonly IUnitToken[] = [
  createTacticalMapPlayerMechToken({
    unitId: 'attacker',
    name: 'Shadow Hawk SHD-2H',
    designation: 'SHD',
    position: tacticalMapOccupiedDestinationOrigin,
  }),
  createTacticalMapMechToken({
    unitId: 'blocker',
    name: 'Blocking Hunchback',
    designation: 'BLK',
    position: tacticalMapOccupiedDestinationHex,
    isValidTarget: false,
  }),
];

export const tacticalMapOccupiedDestinationMovementRange: readonly IMovementRangeHex[] =
  [
    requireOccupiedDestinationMovementProjection(
      deriveMovementRangeHexForDestination(
        tacticalMapOccupiedDestinationUnit,
        MovementType.Walk,
        tacticalMapOccupiedDestinationGrid(),
        tacticalMapOccupiedDestinationCapability,
        tacticalMapOccupiedDestinationHex,
      ),
    ),
  ];

export const tacticalMapOccupiedDestinationJumpMovementRange: readonly IMovementRangeHex[] =
  [
    requireOccupiedDestinationMovementProjection(
      deriveMovementRangeHexForDestination(
        tacticalMapOccupiedDestinationUnit,
        MovementType.Jump,
        tacticalMapOccupiedDestinationGrid(),
        tacticalMapOccupiedDestinationCapability,
        tacticalMapOccupiedDestinationHex,
      ),
    ),
  ];

export const tacticalMapOccupiedDestinationMpLegend: MapMovementPointLegendState =
  {
    active: 'walk',
    movementMode: 'walk',
    walkMP: tacticalMapOccupiedDestinationCapability.walkMP,
    runMP: tacticalMapOccupiedDestinationCapability.runMP,
    jumpMP: tacticalMapOccupiedDestinationCapability.jumpMP,
    jumpAvailable: true,
  };

export function tacticalMapOccupiedDestinationCommitInput(): ICommittedMovementValidationInput {
  return {
    grid: tacticalMapOccupiedDestinationGrid(),
    unit: tacticalMapOccupiedDestinationUnit,
    to: tacticalMapOccupiedDestinationHex,
    facing: Facing.Northeast,
    movementType: MovementType.Walk,
    capability: tacticalMapOccupiedDestinationCapability,
    path: [
      tacticalMapOccupiedDestinationOrigin,
      tacticalMapOccupiedDestinationHex,
    ],
  };
}

export function tacticalMapOccupiedDestinationJumpCommitInput(): ICommittedMovementValidationInput {
  return {
    grid: tacticalMapOccupiedDestinationGrid(),
    unit: tacticalMapOccupiedDestinationUnit,
    to: tacticalMapOccupiedDestinationHex,
    facing: Facing.Northeast,
    movementType: MovementType.Jump,
    capability: tacticalMapOccupiedDestinationCapability,
    path: [
      tacticalMapOccupiedDestinationOrigin,
      tacticalMapOccupiedDestinationHex,
    ],
  };
}
