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

const tacticalMapMovementUnit: IUnitGameState = {
  id: 'attacker',
  side: GameSide.Player,
  position: { q: -1, r: 0 },
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

const tacticalMapBipedOptionUnit: IUnitGameState = {
  ...tacticalMapMovementUnit,
  position: tacticalMapBipedOptionOrigin,
};

export const tacticalMapBipedOptionSelectedHex = tacticalMapBipedOptionOrigin;

export const tacticalMapBipedOptionTokens: readonly IUnitToken[] =
  tacticalMapTokens.map((token) => {
    if (token.unitId === 'attacker') {
      return {
        ...token,
        position: tacticalMapBipedOptionOrigin,
      };
    }
    if (token.unitId === 'occluded') {
      return {
        ...token,
        position: { q: 2, r: -1 },
      };
    }
    return token;
  });

export const tacticalMapJumpElevationMpLegend: MapMovementPointLegendState = {
  ...tacticalMapMpLegend,
  active: 'jump',
  movementMode: 'jump',
};

export const tacticalMapVtolTokens: readonly IUnitToken[] =
  tacticalMapTokens.map((token) =>
    token.unitId === 'attacker'
      ? {
          ...token,
          name: 'Karnov UR Transport',
          designation: 'KAR',
          unitType: TokenUnitType.Vehicle,
          vehicleMotionType: VehicleMotionType.VTOL,
          altitude: 3,
        }
      : token,
  );

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
  const grid = createHexGrid({ radius: 3 });
  const hexes = new Map(grid.hexes);

  for (const terrain of hexTerrain) {
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

function requireMovementProjection(
  projection: IMovementRangeHex | null,
): readonly IMovementRangeHex[] {
  if (!projection) {
    throw new Error('Expected tactical-map movement projection');
  }
  return [projection];
}

function requireSingleMovementProjection(
  projection: IMovementRangeHex | null,
): IMovementRangeHex {
  const [required] = requireMovementProjection(projection);
  return required;
}

export const tacticalMapBipedOptionMovementRange: readonly IMovementRangeHex[] =
  [
    requireSingleMovementProjection(
      deriveMovementRangeHexForDestination(
        tacticalMapBipedOptionUnit,
        MovementType.Walk,
        tacticalMapMovementGrid(),
        tacticalMapBipedCapability,
        tacticalMapBipedOptionDestination,
      ),
    ),
    requireSingleMovementProjection(
      deriveMovementRangeHexForDestination(
        tacticalMapBipedOptionUnit,
        MovementType.Run,
        tacticalMapMovementGrid(),
        tacticalMapBipedCapability,
        tacticalMapBipedOptionDestination,
      ),
    ),
    requireSingleMovementProjection(
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
    facing: Facing.Northeast,
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
    facing: Facing.Northeast,
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
    facing: Facing.Northeast,
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
  tacticalMapTokens.map((token) => {
    if (token.unitId === 'attacker') {
      return {
        ...token,
        name: 'River Monitor',
        designation: 'NAV',
        position: tacticalMapRuntimeHeightOrigin,
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
    facing: Facing.Northeast,
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
