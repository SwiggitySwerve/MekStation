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
} from '@/types/gameplay';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { deriveMovementRangeHexForDestination } from '@/utils/gameplay/movement/reachable';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

import {
  tacticalMapHexTerrain,
  tacticalMapTokens,
} from './tactical-map.fixtures';

const tacticalMapStandUpOrigin = { q: 0, r: 0 } as const;
const tacticalMapStandUpStep = { q: 1, r: 0 } as const;
const tacticalMapStandUpDestination = { q: 2, r: 0 } as const;

const tacticalMapStandUpUnit: IUnitGameState = {
  id: 'attacker',
  side: GameSide.Player,
  position: tacticalMapStandUpOrigin,
  facing: Facing.Northeast,
  heat: 0,
  movementThisTurn: MovementType.Stationary,
  hexesMovedThisTurn: 0,
  piloting: 5,
  prone: true,
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

const tacticalMapImpossibleStandUpUnit: IUnitGameState = {
  ...tacticalMapStandUpUnit,
  destroyedLocations: ['left_leg', 'left_arm', 'right_arm'],
};

const tacticalMapStandUpCapability: IMovementCapability = {
  walkMP: 4,
  runMP: 6,
  jumpMP: 3,
};

function isStandUpTerrainOverride(terrain: IHexTerrain): boolean {
  const { q, r } = terrain.coordinate;
  return (
    (q === tacticalMapStandUpOrigin.q && r === tacticalMapStandUpOrigin.r) ||
    (q === tacticalMapStandUpStep.q && r === tacticalMapStandUpStep.r) ||
    (q === tacticalMapStandUpDestination.q &&
      r === tacticalMapStandUpDestination.r)
  );
}

export const tacticalMapStandUpHexTerrain: readonly IHexTerrain[] = [
  ...tacticalMapHexTerrain.filter(
    (terrain) => !isStandUpTerrainOverride(terrain),
  ),
  {
    coordinate: tacticalMapStandUpOrigin,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: tacticalMapStandUpStep,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: tacticalMapStandUpDestination,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
];

function tacticalMapStandUpGrid(): IHexGrid {
  const grid = createHexGrid({ radius: 3 });
  const hexes = new Map(grid.hexes);

  for (const terrain of tacticalMapStandUpHexTerrain) {
    const key = coordToKey(terrain.coordinate);
    const hex = hexes.get(key);
    if (!hex) {
      throw new Error(`Missing tactical-map stand-up fixture hex ${key}`);
    }
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
    throw new Error('Expected tactical-map stand-up movement projection');
  }
  return projection;
}

export const tacticalMapStandUpSelectedHex = tacticalMapStandUpOrigin;

export const tacticalMapStandUpTokens: readonly IUnitToken[] =
  tacticalMapTokens.map((token) => {
    if (token.unitId === 'attacker') {
      return {
        ...token,
        name: 'Prone Shadow Hawk SHD-2H',
        designation: 'PRN',
        position: tacticalMapStandUpOrigin,
      };
    }
    if (token.unitId === 'occluded') {
      return {
        ...token,
        position: { q: -3, r: 3 },
        isActiveTarget: false,
      };
    }
    return token;
  });

export const tacticalMapImpossibleStandUpTokens: readonly IUnitToken[] =
  tacticalMapStandUpTokens.map((token) =>
    token.unitId === 'attacker'
      ? {
          ...token,
          name: 'Crippled Shadow Hawk SHD-2H',
          designation: 'IMP',
        }
      : token,
  );

export const tacticalMapStandUpMovementRange: readonly IMovementRangeHex[] = [
  requireSingleMovementProjection(
    deriveMovementRangeHexForDestination(
      tacticalMapStandUpUnit,
      MovementType.Walk,
      tacticalMapStandUpGrid(),
      tacticalMapStandUpCapability,
      tacticalMapStandUpDestination,
    ),
  ),
];

export const tacticalMapImpossibleStandUpMovementRange: readonly IMovementRangeHex[] =
  [
    requireSingleMovementProjection(
      deriveMovementRangeHexForDestination(
        tacticalMapImpossibleStandUpUnit,
        MovementType.Walk,
        tacticalMapStandUpGrid(),
        tacticalMapStandUpCapability,
        tacticalMapStandUpStep,
      ),
    ),
  ];

export const tacticalMapStandUpMpLegend: MapMovementPointLegendState = {
  active: 'walk',
  walkMP: tacticalMapStandUpCapability.walkMP,
  runMP: tacticalMapStandUpCapability.runMP,
  jumpAvailable: true,
  jumpMP: tacticalMapStandUpCapability.jumpMP,
};

export function tacticalMapStandUpCommitInput(): ICommittedMovementValidationInput {
  return {
    grid: tacticalMapStandUpGrid(),
    unit: tacticalMapStandUpUnit,
    to: tacticalMapStandUpDestination,
    facing: Facing.Northeast,
    movementType: MovementType.Walk,
    capability: tacticalMapStandUpCapability,
    path: [
      tacticalMapStandUpOrigin,
      tacticalMapStandUpStep,
      tacticalMapStandUpDestination,
    ],
  };
}
