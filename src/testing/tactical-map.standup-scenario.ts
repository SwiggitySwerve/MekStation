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

const tacticalMapStandUpOrigin = { q: 0, r: 0 } as const;
const tacticalMapStandUpStep = { q: 1, r: 0 } as const;
const tacticalMapStandUpDestination = { q: 2, r: 0 } as const;

const tacticalMapStandUpUnit: IUnitGameState = createTacticalMapUnitState({
  id: 'attacker',
  side: GameSide.Player,
  position: tacticalMapStandUpOrigin,
  facing: Facing.Southeast,
  piloting: 5,
  prone: true,
});

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
  return createTacticalMapTerrainGrid(tacticalMapStandUpHexTerrain, {
    missingHexLabel: 'tactical-map stand-up fixture',
  });
}

export const tacticalMapStandUpSelectedHex = tacticalMapStandUpOrigin;

export const tacticalMapStandUpTokens: readonly IUnitToken[] =
  overrideTacticalMapTokens(tacticalMapTokens, {
    attacker: {
      name: 'Prone Shadow Hawk SHD-2H',
      designation: 'PRN',
      position: tacticalMapStandUpOrigin,
    },
    occluded: {
      position: { q: -3, r: 3 },
      isActiveTarget: false,
    },
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
  requireTacticalMapMovementProjection(
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
    requireTacticalMapMovementProjection(
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
    facing: facingForTacticalMapProjection(
      tacticalMapStandUpMovementRange[0],
      tacticalMapStandUpUnit.facing,
    ),
    movementType: MovementType.Walk,
    capability: tacticalMapStandUpCapability,
    path: [
      tacticalMapStandUpOrigin,
      tacticalMapStandUpStep,
      tacticalMapStandUpDestination,
    ],
  };
}
