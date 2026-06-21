import type {
  MapMovementKind,
  MapMovementPointLegendState,
} from '@/components/gameplay/HexMapDisplay/HexMapDisplay.types';
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
  MovementType,
  TerrainType,
  TokenUnitType,
  VehicleMotionType,
} from '@/types/gameplay';
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
  tacticalMapMpLegend,
  tacticalMapTokens,
} from './tactical-map.fixtures';

const tacticalMapBipedCapability: IMovementCapability = {
  walkMP: 4,
  runMP: 6,
  jumpMP: 3,
  movementHeatProfile: 'mek',
};

const tacticalMapJumpElevationDestination = { q: 0, r: 1 } as const;
const tacticalMapBipedOptionOrigin = { q: 0, r: 0 } as const;
const tacticalMapBipedOptionDestination = { q: 0, r: 1 } as const;

const tacticalMapMovementUnit: IUnitGameState = createTacticalMapUnitState({
  id: 'attacker',
  side: GameSide.Player,
  position: { q: -1, r: 0 },
  facing: Facing.Southeast,
});

const tacticalMapBipedOptionUnit: IUnitGameState = {
  ...tacticalMapMovementUnit,
  position: tacticalMapBipedOptionOrigin,
  facing: Facing.South,
};

export const tacticalMapBipedOptionSelectedHex = tacticalMapBipedOptionOrigin;

export const tacticalMapBipedOptionTokens: readonly IUnitToken[] =
  overrideTacticalMapTokens(tacticalMapTokens, {
    attacker: { position: tacticalMapBipedOptionOrigin },
    occluded: { position: { q: 2, r: -1 } },
  });

export const tacticalMapJumpElevationMpLegend: MapMovementPointLegendState = {
  ...tacticalMapMpLegend,
  active: 'jump',
  movementMode: 'jump',
};

export const tacticalMapVtolTokens: readonly IUnitToken[] =
  overrideTacticalMapTokens(tacticalMapTokens, {
    attacker: {
      name: 'Karnov UR Transport',
      designation: 'KAR',
      unitType: TokenUnitType.Vehicle,
      vehicleMotionType: VehicleMotionType.VTOL,
      altitude: 3,
    },
  });

const tacticalMapVtolCapability: IMovementCapability = {
  walkMP: 4,
  runMP: 6,
  jumpMP: 0,
  movementMode: 'vtol',
};

const tacticalMapVtolElevationDestination = { q: 1, r: 0 } as const;
const tacticalMapRuntimeHeightOrigin = { q: 0, r: 0 } as const;
const tacticalMapRuntimeHeightBridgeDestination = { q: 1, r: 0 } as const;

function tacticalMapMovementGrid(
  hexTerrain: readonly IHexTerrain[] = tacticalMapHexTerrain,
): IHexGrid {
  return createTacticalMapTerrainGrid(hexTerrain);
}

function requireMovementProjection(
  projection: IMovementRangeHex | null,
): readonly IMovementRangeHex[] {
  return [requireTacticalMapMovementProjection(projection, 'tactical-map')];
}

function requireMovementRangeHex(
  projection: IMovementRangeHex | null,
): IMovementRangeHex {
  const [required] = requireMovementProjection(projection);
  return required;
}

export const tacticalMapBipedOptionMovementRange: readonly IMovementRangeHex[] =
  [
    requireMovementRangeHex(
      deriveMovementRangeHexForDestination(
        tacticalMapBipedOptionUnit,
        MovementType.Walk,
        tacticalMapMovementGrid(),
        tacticalMapBipedCapability,
        tacticalMapBipedOptionDestination,
      ),
    ),
    requireMovementRangeHex(
      deriveMovementRangeHexForDestination(
        tacticalMapBipedOptionUnit,
        MovementType.Run,
        tacticalMapMovementGrid(),
        tacticalMapBipedCapability,
        tacticalMapBipedOptionDestination,
      ),
    ),
    requireMovementRangeHex(
      deriveMovementRangeHexForDestination(
        tacticalMapBipedOptionUnit,
        MovementType.Jump,
        tacticalMapMovementGrid(),
        tacticalMapBipedCapability,
        tacticalMapBipedOptionDestination,
      ),
    ),
  ];

export function tacticalMapBipedOptionCommitInputs(): readonly ICommittedMovementValidationInput[] {
  return tacticalMapBipedOptionMovementRange.map((projection) => ({
    grid: tacticalMapMovementGrid(),
    unit: tacticalMapBipedOptionUnit,
    to: tacticalMapBipedOptionDestination,
    facing: facingForTacticalMapProjection(
      projection,
      tacticalMapBipedOptionUnit.facing,
    ),
    movementType: projection.movementType,
    capability: tacticalMapBipedCapability,
    path: projection.path,
  }));
}

export const tacticalMapBipedOptionMpLegend: MapMovementPointLegendState = {
  active: 'run',
  walkMP: tacticalMapBipedCapability.walkMP,
  runMP: tacticalMapBipedCapability.runMP,
  jumpMP: tacticalMapBipedCapability.jumpMP,
  jumpAvailable: true,
};

export const tacticalMapLegendSelectionSelectedHex =
  tacticalMapBipedOptionSelectedHex;
export const tacticalMapLegendSelectionTokens = tacticalMapBipedOptionTokens;

export const tacticalMapLegendSelectionMovementRangeByMode: Readonly<
  Record<MapMovementKind, readonly IMovementRangeHex[]>
> = {
  walk: [tacticalMapBipedOptionMovementRange[0]],
  run: [tacticalMapBipedOptionMovementRange[1]],
  jump: [tacticalMapBipedOptionMovementRange[2]],
};

export function tacticalMapLegendSelectionMpLegend(
  active: MapMovementKind,
): MapMovementPointLegendState {
  return {
    ...tacticalMapBipedOptionMpLegend,
    active,
  };
}

export const tacticalMapJumpElevationMovementRange: readonly IMovementRangeHex[] =
  requireMovementProjection(
    deriveMovementRangeHexForDestination(
      tacticalMapMovementUnit,
      MovementType.Jump,
      tacticalMapMovementGrid(),
      tacticalMapBipedCapability,
      tacticalMapJumpElevationDestination,
    ),
  );

export function tacticalMapJumpElevationCommitInput(): ICommittedMovementValidationInput {
  return {
    grid: tacticalMapMovementGrid(),
    unit: tacticalMapMovementUnit,
    to: tacticalMapJumpElevationDestination,
    facing: facingForTacticalMapProjection(
      tacticalMapJumpElevationMovementRange[0],
      tacticalMapMovementUnit.facing,
    ),
    movementType: MovementType.Jump,
    capability: tacticalMapBipedCapability,
    path: tacticalMapJumpElevationMovementRange[0]?.path,
  };
}

export const tacticalMapVtolElevationMovementRange: readonly IMovementRangeHex[] =
  requireMovementProjection(
    deriveMovementRangeHexForDestination(
      tacticalMapMovementUnit,
      MovementType.Run,
      tacticalMapMovementGrid(),
      tacticalMapVtolCapability,
      tacticalMapVtolElevationDestination,
    ),
  );

export function tacticalMapVtolElevationCommitInput(): ICommittedMovementValidationInput {
  return {
    grid: tacticalMapMovementGrid(),
    unit: tacticalMapMovementUnit,
    to: tacticalMapVtolElevationDestination,
    facing: facingForTacticalMapProjection(
      tacticalMapVtolElevationMovementRange[0],
      tacticalMapMovementUnit.facing,
    ),
    movementType: MovementType.Run,
    capability: tacticalMapVtolCapability,
    path: tacticalMapVtolElevationMovementRange[0]?.path,
  };
}

export const tacticalMapVtolElevationMpLegend: MapMovementPointLegendState = {
  active: 'run',
  movementMode: 'vtol',
  walkMP: 4,
  runMP: 6,
  jumpAvailable: false,
};

function isRuntimeHeightTerrainOverride(terrain: IHexTerrain): boolean {
  const { q, r } = terrain.coordinate;
  return (
    (q === tacticalMapRuntimeHeightOrigin.q &&
      r === tacticalMapRuntimeHeightOrigin.r) ||
    (q === tacticalMapRuntimeHeightBridgeDestination.q &&
      r === tacticalMapRuntimeHeightBridgeDestination.r)
  );
}

export const tacticalMapRuntimeHeightBridgeHexTerrain: readonly IHexTerrain[] =
  [
    ...tacticalMapHexTerrain.filter(
      (terrain) => !isRuntimeHeightTerrainOverride(terrain),
    ),
    {
      coordinate: tacticalMapRuntimeHeightOrigin,
      elevation: 0,
      features: [{ type: TerrainType.Water, level: 1 }],
    },
    {
      coordinate: tacticalMapRuntimeHeightBridgeDestination,
      elevation: 0,
      features: [
        { type: TerrainType.Water, level: 1 },
        { type: TerrainType.Bridge, level: 1 },
      ],
    },
  ];

export const tacticalMapRuntimeHeightSelectedHex =
  tacticalMapRuntimeHeightOrigin;

export const tacticalMapRuntimeHeightTokens: readonly IUnitToken[] =
  overrideTacticalMapTokens(tacticalMapTokens, {
    attacker: {
      name: 'River Monitor',
      designation: 'NAV',
      position: tacticalMapRuntimeHeightOrigin,
      unitType: TokenUnitType.Vehicle,
      vehicleMotionType: VehicleMotionType.Naval,
    },
    occluded: {
      position: { q: 3, r: -1 },
      isActiveTarget: false,
    },
  });

const tacticalMapRuntimeHeightUnit: IUnitGameState = {
  ...tacticalMapMovementUnit,
  position: tacticalMapRuntimeHeightOrigin,
  unitHeight: 1,
};

const tacticalMapRuntimeHeightCapability: IMovementCapability = {
  walkMP: 3,
  runMP: 5,
  jumpMP: 0,
  movementMode: 'naval',
};

export const tacticalMapRuntimeHeightMovementRange: readonly IMovementRangeHex[] =
  requireMovementProjection(
    deriveMovementRangeHexForDestination(
      tacticalMapRuntimeHeightUnit,
      MovementType.Walk,
      tacticalMapMovementGrid(tacticalMapRuntimeHeightBridgeHexTerrain),
      tacticalMapRuntimeHeightCapability,
      tacticalMapRuntimeHeightBridgeDestination,
    ),
  );

export function tacticalMapRuntimeHeightCommitInput(): ICommittedMovementValidationInput {
  return {
    grid: tacticalMapMovementGrid(tacticalMapRuntimeHeightBridgeHexTerrain),
    unit: tacticalMapRuntimeHeightUnit,
    to: tacticalMapRuntimeHeightBridgeDestination,
    facing: facingForTacticalMapProjection(
      tacticalMapRuntimeHeightMovementRange[0],
      tacticalMapRuntimeHeightUnit.facing,
    ),
    movementType: MovementType.Walk,
    capability: tacticalMapRuntimeHeightCapability,
    path: tacticalMapRuntimeHeightMovementRange[0]?.path,
  };
}

export const tacticalMapRuntimeHeightMpLegend: MapMovementPointLegendState = {
  active: 'walk',
  movementMode: 'naval',
  walkMP: 3,
  runMP: 5,
  jumpAvailable: false,
};
