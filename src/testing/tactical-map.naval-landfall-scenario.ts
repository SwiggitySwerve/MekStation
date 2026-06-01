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

const tacticalMapNavalLandfallOrigin = { q: 0, r: 0 } as const;
const tacticalMapNavalLandfallDestination = { q: 1, r: 0 } as const;

const tacticalMapNavalLandfallUnit: IUnitGameState = {
  id: 'attacker',
  side: GameSide.Player,
  position: tacticalMapNavalLandfallOrigin,
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
  const grid = createHexGrid({ radius: 3 });
  const hexes = new Map(grid.hexes);

  for (const terrain of tacticalMapNavalLandfallHexTerrain) {
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
    throw new Error('Expected naval landfall movement projection');
  }
  return projection;
}

export const tacticalMapNavalLandfallSelectedHex =
  tacticalMapNavalLandfallOrigin;

export const tacticalMapNavalLandfallTokens: readonly IUnitToken[] =
  tacticalMapTokens.map((token) => {
    if (token.unitId === 'attacker') {
      return {
        ...token,
        name: 'River Monitor',
        designation: 'RVM',
        position: tacticalMapNavalLandfallOrigin,
        unitType: TokenUnitType.Vehicle,
        vehicleMotionType: VehicleMotionType.Naval,
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

export const tacticalMapNavalLandfallMovementRange: readonly IMovementRangeHex[] =
  [
    requireSingleMovementProjection(
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
