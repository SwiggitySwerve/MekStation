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

const tacticalMapLamConversionOrigin = { q: 0, r: 0 } as const;
const tacticalMapLamConversionStepOne = { q: 1, r: 0 } as const;
const tacticalMapLamConversionStepTwo = { q: 2, r: 0 } as const;
const tacticalMapLamConversionClimb = { q: 3, r: 0 } as const;
const tacticalMapLamFighterConversionClimb = { q: 1, r: 0 } as const;
const tacticalMapLamAirMekLongCruiseDestination = { q: 6, r: 0 } as const;

const tacticalMapLamConversionPath = [
  tacticalMapLamConversionOrigin,
  tacticalMapLamConversionStepOne,
  tacticalMapLamConversionStepTwo,
  tacticalMapLamConversionClimb,
] as const;

const tacticalMapLamAirMekLongCruisePath = [
  tacticalMapLamConversionOrigin,
  tacticalMapLamConversionStepOne,
  tacticalMapLamConversionStepTwo,
  tacticalMapLamConversionClimb,
  { q: 4, r: 0 },
  { q: 5, r: 0 },
  tacticalMapLamAirMekLongCruiseDestination,
] as const;

const tacticalMapLamCapability: IMovementCapability = {
  walkMP: 4,
  runMP: 6,
  jumpMP: 2,
  movementMode: 'walk',
  movementHeatProfile: 'mek',
  unitHeight: 1,
  unitHeightProfile: { kind: 'lam', standingHeight: 1 },
};

const tacticalMapLamMekUnit: IUnitGameState = createTacticalMapUnitState({
  id: 'attacker',
  side: GameSide.Player,
  position: tacticalMapLamConversionOrigin,
  facing: Facing.Southeast,
  conversionMode: 'mek',
});

const tacticalMapLamAirMekUnit: IUnitGameState = {
  ...tacticalMapLamMekUnit,
  conversionMode: 'airmek',
};

const tacticalMapLamFighterUnit: IUnitGameState = {
  ...tacticalMapLamMekUnit,
  conversionMode: 'fighter',
};

function isLamConversionTerrainOverride(terrain: IHexTerrain): boolean {
  return tacticalMapLamConversionPath.some(
    (coord) =>
      coord.q === terrain.coordinate.q && coord.r === terrain.coordinate.r,
  );
}

export const tacticalMapLamConversionHexTerrain: readonly IHexTerrain[] = [
  ...tacticalMapHexTerrain.filter(
    (terrain) => !isLamConversionTerrainOverride(terrain),
  ),
  {
    coordinate: tacticalMapLamConversionOrigin,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: tacticalMapLamConversionStepOne,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: tacticalMapLamConversionStepTwo,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: tacticalMapLamConversionClimb,
    elevation: 2,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
];

export const tacticalMapLamFighterConversionHexTerrain: readonly IHexTerrain[] =
  [
    ...tacticalMapHexTerrain.filter((terrain) => {
      const { q, r } = terrain.coordinate;
      return (
        !(
          q === tacticalMapLamConversionOrigin.q &&
          r === tacticalMapLamConversionOrigin.r
        ) &&
        !(
          q === tacticalMapLamFighterConversionClimb.q &&
          r === tacticalMapLamFighterConversionClimb.r
        )
      );
    }),
    {
      coordinate: tacticalMapLamConversionOrigin,
      elevation: 0,
      features: [{ type: TerrainType.Clear, level: 0 }],
    },
    {
      coordinate: tacticalMapLamFighterConversionClimb,
      elevation: 2,
      features: [{ type: TerrainType.Clear, level: 0 }],
    },
  ];

export const tacticalMapLamAirMekLongCruiseHexTerrain: readonly IHexTerrain[] =
  [
    ...tacticalMapHexTerrain.filter(
      (terrain) =>
        !tacticalMapLamAirMekLongCruisePath.some(
          (coord) =>
            coord.q === terrain.coordinate.q &&
            coord.r === terrain.coordinate.r,
        ),
    ),
    ...tacticalMapLamAirMekLongCruisePath.map((coordinate) => ({
      coordinate,
      elevation: 0,
      features: [{ type: TerrainType.Clear, level: 0 }],
    })),
  ];

function tacticalMapLamConversionGrid(): IHexGrid {
  return createTacticalMapTerrainGrid(tacticalMapLamConversionHexTerrain);
}

function tacticalMapLamAirMekLongCruiseGrid(): IHexGrid {
  return createTacticalMapTerrainGrid(
    tacticalMapLamAirMekLongCruiseHexTerrain,
    {
      radius: 6,
    },
  );
}

function tacticalMapLamFighterConversionGrid(): IHexGrid {
  return createTacticalMapTerrainGrid(
    tacticalMapLamFighterConversionHexTerrain,
  );
}

function lamConversionTokens(
  designation: string,
  name: string,
): readonly IUnitToken[] {
  return [
    createTacticalMapPlayerMechToken({
      unitId: 'attacker',
      name,
      designation,
      position: tacticalMapLamConversionOrigin,
    }),
  ];
}

const tacticalMapLamMekResolvedCapability =
  resolveRuntimeMovementCapability(
    tacticalMapLamMekUnit,
    tacticalMapLamCapability,
  ) ?? tacticalMapLamCapability;
const tacticalMapLamAirMekResolvedCapability =
  resolveRuntimeMovementCapability(
    tacticalMapLamAirMekUnit,
    tacticalMapLamCapability,
  ) ?? tacticalMapLamCapability;
const tacticalMapLamFighterResolvedCapability =
  resolveRuntimeMovementCapability(
    tacticalMapLamFighterUnit,
    tacticalMapLamCapability,
  ) ?? tacticalMapLamCapability;

export const tacticalMapLamConversionSelectedHex =
  tacticalMapLamConversionOrigin;

export const tacticalMapLamMekTokens = lamConversionTokens(
  'LMM',
  'LAM Mek Mode',
);
export const tacticalMapLamAirMekTokens = lamConversionTokens(
  'LMA',
  'LAM AirMek Mode',
);
export const tacticalMapLamAirMekLongCruiseTokens = lamConversionTokens(
  'LAH',
  'LAM AirMek Long Cruise',
);
export const tacticalMapLamFighterTokens = lamConversionTokens(
  'LMF',
  'LAM Fighter Mode',
);

export const tacticalMapLamMekMovementRange: readonly IMovementRangeHex[] = [
  requireTacticalMapMovementProjection(
    deriveMovementRangeHexForDestination(
      tacticalMapLamMekUnit,
      MovementType.Walk,
      tacticalMapLamConversionGrid(),
      tacticalMapLamCapability,
      tacticalMapLamConversionClimb,
    ),
  ),
];

export const tacticalMapLamAirMekMovementRange: readonly IMovementRangeHex[] = [
  requireTacticalMapMovementProjection(
    deriveMovementRangeHexForDestination(
      tacticalMapLamAirMekUnit,
      MovementType.Walk,
      tacticalMapLamConversionGrid(),
      tacticalMapLamCapability,
      tacticalMapLamConversionClimb,
    ),
  ),
];

export const tacticalMapLamAirMekLongCruiseMovementRange: readonly IMovementRangeHex[] =
  [
    requireTacticalMapMovementProjection(
      deriveMovementRangeHexForDestination(
        tacticalMapLamAirMekUnit,
        MovementType.Walk,
        tacticalMapLamAirMekLongCruiseGrid(),
        tacticalMapLamCapability,
        tacticalMapLamAirMekLongCruiseDestination,
      ),
    ),
  ];

export const tacticalMapLamFighterMovementRange: readonly IMovementRangeHex[] =
  [
    requireTacticalMapMovementProjection(
      deriveMovementRangeHexForDestination(
        tacticalMapLamFighterUnit,
        MovementType.Walk,
        tacticalMapLamFighterConversionGrid(),
        tacticalMapLamCapability,
        tacticalMapLamFighterConversionClimb,
      ),
    ),
  ];

export const tacticalMapLamMekMpLegend: MapMovementPointLegendState = {
  active: 'walk',
  movementMode: tacticalMapLamMekResolvedCapability.movementMode,
  walkMP: tacticalMapLamMekResolvedCapability.walkMP,
  runMP: tacticalMapLamMekResolvedCapability.runMP,
  jumpMP: tacticalMapLamMekResolvedCapability.jumpMP,
  jumpAvailable: tacticalMapLamMekResolvedCapability.jumpMP > 0,
};

export const tacticalMapLamAirMekMpLegend: MapMovementPointLegendState = {
  active: 'walk',
  movementMode: tacticalMapLamAirMekResolvedCapability.movementMode,
  walkMP: tacticalMapLamAirMekResolvedCapability.walkMP,
  runMP: tacticalMapLamAirMekResolvedCapability.runMP,
  jumpMP: tacticalMapLamAirMekResolvedCapability.jumpMP,
  jumpAvailable: tacticalMapLamAirMekResolvedCapability.jumpMP > 0,
};

export const tacticalMapLamFighterMpLegend: MapMovementPointLegendState = {
  active: 'walk',
  movementMode: tacticalMapLamFighterResolvedCapability.movementMode,
  walkMP: tacticalMapLamFighterResolvedCapability.walkMP,
  runMP: tacticalMapLamFighterResolvedCapability.runMP,
  jumpMP: tacticalMapLamFighterResolvedCapability.jumpMP,
  jumpAvailable: tacticalMapLamFighterResolvedCapability.jumpMP > 0,
};

export function tacticalMapLamMekCommitInput(): ICommittedMovementValidationInput {
  return {
    grid: tacticalMapLamConversionGrid(),
    unit: tacticalMapLamMekUnit,
    to: tacticalMapLamConversionClimb,
    facing: facingForTacticalMapProjection(
      tacticalMapLamMekMovementRange[0],
      tacticalMapLamMekUnit.facing,
    ),
    movementType: MovementType.Walk,
    capability: tacticalMapLamCapability,
    path: tacticalMapLamConversionPath,
  };
}

export function tacticalMapLamAirMekCommitInput(): ICommittedMovementValidationInput {
  return {
    grid: tacticalMapLamConversionGrid(),
    unit: tacticalMapLamAirMekUnit,
    to: tacticalMapLamConversionClimb,
    facing: facingForTacticalMapProjection(
      tacticalMapLamAirMekMovementRange[0],
      tacticalMapLamAirMekUnit.facing,
    ),
    movementType: MovementType.Walk,
    capability: tacticalMapLamCapability,
    path: tacticalMapLamConversionPath,
  };
}

export function tacticalMapLamAirMekLongCruiseCommitInput(): ICommittedMovementValidationInput {
  return {
    grid: tacticalMapLamAirMekLongCruiseGrid(),
    unit: tacticalMapLamAirMekUnit,
    to: tacticalMapLamAirMekLongCruiseDestination,
    facing: facingForTacticalMapProjection(
      tacticalMapLamAirMekLongCruiseMovementRange[0],
      tacticalMapLamAirMekUnit.facing,
    ),
    movementType: MovementType.Walk,
    capability: tacticalMapLamCapability,
    path: tacticalMapLamAirMekLongCruisePath,
  };
}

export function tacticalMapLamFighterCommitInput(): ICommittedMovementValidationInput {
  return {
    grid: tacticalMapLamFighterConversionGrid(),
    unit: tacticalMapLamFighterUnit,
    to: tacticalMapLamFighterConversionClimb,
    facing: facingForTacticalMapProjection(
      tacticalMapLamFighterMovementRange[0],
      tacticalMapLamFighterUnit.facing,
    ),
    movementType: MovementType.Walk,
    capability: tacticalMapLamCapability,
    path: [
      tacticalMapLamConversionOrigin,
      tacticalMapLamFighterConversionClimb,
    ],
  };
}
