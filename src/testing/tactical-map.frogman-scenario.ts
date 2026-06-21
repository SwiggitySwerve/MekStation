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

import {
  createTacticalMapTerrainGrid,
  createTacticalMapUnitState,
  facingForTacticalMapProjection,
  overrideTacticalMapTokens,
  requireTacticalMapMovementProjection,
} from './tactical-map.fixture-helpers';
import {
  tacticalMapHexTerrain,
  tacticalMapTokens,
} from './tactical-map.fixtures';

const tacticalMapFrogmanOrigin = { q: 0, r: 0 } as const;
const tacticalMapFrogmanDestination = { q: 1, r: 0 } as const;

const tacticalMapFrogmanUnit: IUnitGameState = createTacticalMapUnitState({
  id: 'attacker',
  side: GameSide.Player,
  position: tacticalMapFrogmanOrigin,
  facing: Facing.Southeast,
});

const tacticalMapFrogmanCapability: IMovementCapability = {
  walkMP: 3,
  runMP: 5,
  jumpMP: 0,
  movementMode: 'walk',
  waterCapability: { frogmanSpecialist: true },
};

function isFrogmanTerrainOverride(terrain: IHexTerrain): boolean {
  const { q, r } = terrain.coordinate;
  return (
    (q === tacticalMapFrogmanOrigin.q && r === tacticalMapFrogmanOrigin.r) ||
    (q === tacticalMapFrogmanDestination.q &&
      r === tacticalMapFrogmanDestination.r)
  );
}

export const tacticalMapFrogmanHexTerrain: readonly IHexTerrain[] = [
  ...tacticalMapHexTerrain.filter(
    (terrain) => !isFrogmanTerrainOverride(terrain),
  ),
  {
    coordinate: tacticalMapFrogmanOrigin,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: tacticalMapFrogmanDestination,
    elevation: 0,
    features: [{ type: TerrainType.Water, level: 2 }],
  },
];

function tacticalMapFrogmanGrid(): IHexGrid {
  return createTacticalMapTerrainGrid(tacticalMapFrogmanHexTerrain, {
    missingHexLabel: 'tactical-map Frogman fixture',
  });
}

export const tacticalMapFrogmanSelectedHex = tacticalMapFrogmanOrigin;

export const tacticalMapFrogmanTokens: readonly IUnitToken[] =
  overrideTacticalMapTokens(tacticalMapTokens, {
    attacker: {
      name: 'Shadow Hawk Frogman Specialist',
      designation: 'FGM',
      position: tacticalMapFrogmanOrigin,
    },
    occluded: {
      position: { q: 3, r: -1 },
      isActiveTarget: false,
    },
  });

export const tacticalMapFrogmanMovementRange: readonly IMovementRangeHex[] = [
  requireTacticalMapMovementProjection(
    deriveMovementRangeHexForDestination(
      tacticalMapFrogmanUnit,
      MovementType.Walk,
      tacticalMapFrogmanGrid(),
      tacticalMapFrogmanCapability,
      tacticalMapFrogmanDestination,
    ),
    'tactical-map Frogman',
  ),
];

export const tacticalMapFrogmanMpLegend: MapMovementPointLegendState = {
  active: 'walk',
  walkMP: tacticalMapFrogmanCapability.walkMP,
  runMP: tacticalMapFrogmanCapability.runMP,
  jumpAvailable: false,
};

export function tacticalMapFrogmanCommitInput(): ICommittedMovementValidationInput {
  return {
    grid: tacticalMapFrogmanGrid(),
    unit: tacticalMapFrogmanUnit,
    to: tacticalMapFrogmanDestination,
    facing: facingForTacticalMapProjection(
      tacticalMapFrogmanMovementRange[0],
      tacticalMapFrogmanUnit.facing,
    ),
    movementType: MovementType.Walk,
    capability: tacticalMapFrogmanCapability,
    path: [tacticalMapFrogmanOrigin, tacticalMapFrogmanDestination],
  };
}
