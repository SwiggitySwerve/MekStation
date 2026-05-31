import type {
  IHexGrid,
  IMovementCapability,
  IMovementRangeHex,
  IUnitGameState,
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

const bridgeOrigin = { q: 0, r: 0 } as const;
const bridgeDestination = { q: 1, r: 0 } as const;

export function tacticalMapInfantryMountStateGrid(): IHexGrid {
  const grid = createHexGrid({ radius: 2 });
  const hexes = new Map(grid.hexes);

  for (const [coord, terrain] of [
    [bridgeOrigin, [{ type: TerrainType.Water, level: 1 }]],
    [
      bridgeDestination,
      [
        { type: TerrainType.Water, level: 1 },
        { type: TerrainType.Bridge, level: 1 },
      ],
    ],
  ] as const) {
    const key = coordToKey(coord);
    const hex = hexes.get(key);
    if (!hex) throw new Error(`Missing infantry mount fixture hex ${key}`);
    hexes.set(key, {
      ...hex,
      terrain: terrainStringFromFeatures(terrain),
      elevation: 0,
    });
  }

  return { ...grid, hexes };
}

const baseUnit: IUnitGameState = {
  id: 'attacker',
  side: GameSide.Player,
  position: bridgeOrigin,
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

const capability: IMovementCapability = {
  walkMP: 3,
  runMP: 5,
  jumpMP: 0,
  movementMode: 'naval',
  unitHeight: 1,
  unitHeightProfile: { kind: 'infantry_mount', mountedHeight: 1 },
};

const mountedUnit: IUnitGameState = {
  ...baseUnit,
  infantryMounted: true,
};

const dismountedUnit: IUnitGameState = {
  ...baseUnit,
  infantryMounted: false,
  unitHeight: 1,
};

function requireProjection(
  projection: IMovementRangeHex | null,
): IMovementRangeHex {
  if (!projection) throw new Error('Expected infantry mount projection');
  return projection;
}

export const tacticalMapInfantryMountStateMovementRange: readonly [
  IMovementRangeHex,
  IMovementRangeHex,
] = [
  requireProjection(
    deriveMovementRangeHexForDestination(
      mountedUnit,
      MovementType.Walk,
      tacticalMapInfantryMountStateGrid(),
      capability,
      bridgeDestination,
    ),
  ),
  requireProjection(
    deriveMovementRangeHexForDestination(
      dismountedUnit,
      MovementType.Walk,
      tacticalMapInfantryMountStateGrid(),
      capability,
      bridgeDestination,
    ),
  ),
];

export function tacticalMapInfantryMountStateCommitInputs(): readonly [
  ICommittedMovementValidationInput,
  ICommittedMovementValidationInput,
] {
  return [
    {
      grid: tacticalMapInfantryMountStateGrid(),
      unit: mountedUnit,
      to: bridgeDestination,
      facing: Facing.Northeast,
      movementType: MovementType.Walk,
      capability,
      path: tacticalMapInfantryMountStateMovementRange[0].path,
    },
    {
      grid: tacticalMapInfantryMountStateGrid(),
      unit: dismountedUnit,
      to: bridgeDestination,
      facing: Facing.Northeast,
      movementType: MovementType.Walk,
      capability,
      path: tacticalMapInfantryMountStateMovementRange[1].path,
    },
  ];
}

export function tacticalMapInfantryMountStateUnit(
  mounted: boolean,
): IUnitGameState {
  return mounted ? mountedUnit : dismountedUnit;
}

export function tacticalMapInfantryMountStateCapability(): IMovementCapability {
  return capability;
}

export const tacticalMapInfantryMountStateDestination = bridgeDestination;
