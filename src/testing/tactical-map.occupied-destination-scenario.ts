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
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

import { tacticalMapHexTerrain } from './tactical-map.fixtures';

const tacticalMapOccupiedDestinationOrigin = { q: 0, r: 0 } as const;
const tacticalMapOccupiedDestinationHex = { q: 1, r: 0 } as const;

const tacticalMapOccupiedDestinationUnit: IUnitGameState = {
  id: 'attacker',
  side: GameSide.Player,
  position: tacticalMapOccupiedDestinationOrigin,
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
  const grid = createHexGrid({ radius: 3 });
  const hexes = new Map(grid.hexes);

  for (const terrain of tacticalMapOccupiedDestinationHexTerrain) {
    const key = coordToKey(terrain.coordinate);
    const hex = hexes.get(key);
    if (!hex) throw new Error(`Missing tactical-map fixture hex ${key}`);
    hexes.set(key, {
      ...hex,
      terrain: terrainStringFromFeatures(terrain.features),
      elevation: terrain.elevation,
    });
  }

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

function requireSingleMovementProjection(
  projection: IMovementRangeHex | null,
): IMovementRangeHex {
  if (!projection) {
    throw new Error('Expected occupied destination movement projection');
  }
  return projection;
}

export const tacticalMapOccupiedDestinationSelectedHex =
  tacticalMapOccupiedDestinationOrigin;

export const tacticalMapOccupiedDestinationTokens: readonly IUnitToken[] = [
  {
    unitId: 'attacker',
    name: 'Shadow Hawk SHD-2H',
    designation: 'SHD',
    position: tacticalMapOccupiedDestinationOrigin,
    facing: Facing.Northeast,
    side: GameSide.Player,
    isDestroyed: false,
    isSelected: true,
    isValidTarget: false,
    unitType: TokenUnitType.Mech,
  },
  {
    unitId: 'blocker',
    name: 'Blocking Hunchback',
    designation: 'BLK',
    position: tacticalMapOccupiedDestinationHex,
    facing: Facing.Southwest,
    side: GameSide.Opponent,
    isDestroyed: false,
    isSelected: false,
    isValidTarget: false,
    unitType: TokenUnitType.Mech,
  },
];

export const tacticalMapOccupiedDestinationMovementRange: readonly IMovementRangeHex[] =
  [
    requireSingleMovementProjection(
      deriveMovementRangeHexForDestination(
        tacticalMapOccupiedDestinationUnit,
        MovementType.Walk,
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
