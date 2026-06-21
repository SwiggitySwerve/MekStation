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

const tacticalMapSwimOrigin = { q: 0, r: 0 } as const;
const tacticalMapSwimDestination = { q: 1, r: 0 } as const;

const tacticalMapSwimUnit: IUnitGameState = createTacticalMapUnitState({
  id: 'attacker',
  side: GameSide.Player,
  position: tacticalMapSwimOrigin,
  facing: Facing.Southeast,
});

const tacticalMapSwimCapability: IMovementCapability = {
  walkMP: 1,
  runMP: 1,
  jumpMP: 0,
  movementMode: 'biped_swim',
};

function isSwimTerrainOverride(terrain: IHexTerrain): boolean {
  const { q, r } = terrain.coordinate;
  return (
    (q === tacticalMapSwimOrigin.q && r === tacticalMapSwimOrigin.r) ||
    (q === tacticalMapSwimDestination.q && r === tacticalMapSwimDestination.r)
  );
}

export const tacticalMapSwimHexTerrain: readonly IHexTerrain[] = [
  ...tacticalMapHexTerrain.filter((terrain) => !isSwimTerrainOverride(terrain)),
  {
    coordinate: tacticalMapSwimOrigin,
    elevation: 0,
    features: [{ type: TerrainType.Water, level: 2 }],
  },
  {
    coordinate: tacticalMapSwimDestination,
    elevation: 3,
    features: [{ type: TerrainType.Water, level: 2 }],
  },
];

function tacticalMapSwimGrid(): IHexGrid {
  return createTacticalMapTerrainGrid(tacticalMapSwimHexTerrain, {
    missingHexLabel: 'tactical-map swim fixture',
  });
}

export const tacticalMapSwimSelectedHex = tacticalMapSwimOrigin;

export const tacticalMapSwimTokens: readonly IUnitToken[] =
  overrideTacticalMapTokens(tacticalMapTokens, {
    attacker: {
      name: 'Shadow Hawk SHD-2H Swim Mode',
      designation: 'SWM',
      position: tacticalMapSwimOrigin,
    },
    occluded: {
      position: { q: 3, r: -1 },
      isActiveTarget: false,
    },
  });

export const tacticalMapSwimMovementRange: readonly IMovementRangeHex[] = [
  requireTacticalMapMovementProjection(
    deriveMovementRangeHexForDestination(
      tacticalMapSwimUnit,
      MovementType.Walk,
      tacticalMapSwimGrid(),
      tacticalMapSwimCapability,
      tacticalMapSwimDestination,
    ),
  ),
];

export const tacticalMapSwimMpLegend: MapMovementPointLegendState = {
  active: 'walk',
  movementMode: 'biped_swim',
  walkMP: tacticalMapSwimCapability.walkMP,
  runMP: tacticalMapSwimCapability.runMP,
  jumpAvailable: false,
};

export function tacticalMapSwimCommitInput(): ICommittedMovementValidationInput {
  return {
    grid: tacticalMapSwimGrid(),
    unit: tacticalMapSwimUnit,
    to: tacticalMapSwimDestination,
    facing: facingForTacticalMapProjection(
      tacticalMapSwimMovementRange[0],
      tacticalMapSwimUnit.facing,
    ),
    movementType: MovementType.Walk,
    capability: tacticalMapSwimCapability,
    path: [tacticalMapSwimOrigin, tacticalMapSwimDestination],
  };
}
