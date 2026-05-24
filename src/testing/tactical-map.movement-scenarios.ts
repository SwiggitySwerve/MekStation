import type { MapMovementPointLegendState } from '@/components/gameplay/HexMapDisplay/HexMapDisplay.types';
import type {
  IHexGrid,
  IMovementCapability,
  IMovementRangeHex,
  IUnitGameState,
  IUnitToken,
} from '@/types/gameplay';

import {
  Facing,
  GameSide,
  LockState,
  MovementType,
  TokenUnitType,
  VehicleMotionType,
} from '@/types/gameplay';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { deriveMovementRangeHexForDestination } from '@/utils/gameplay/movement/reachable';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

import {
  tacticalMapHexTerrain,
  tacticalMapMovementRange,
  tacticalMapMpLegend,
  tacticalMapTokens,
} from './tactical-map.fixtures';

export const tacticalMapJumpElevationMovementRange: readonly IMovementRangeHex[] =
  tacticalMapMovementRange.filter(
    (movement) =>
      movement.hex.q === 0 &&
      movement.hex.r === 1 &&
      movement.movementType === MovementType.Jump &&
      movement.reachable,
  );

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
        }
      : token,
  );

const tacticalMapVtolCapability: IMovementCapability = {
  walkMP: 4,
  runMP: 6,
  jumpMP: 0,
  movementMode: 'vtol',
};

const tacticalMapVtolUnit: IUnitGameState = {
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

function tacticalMapVtolGrid(): IHexGrid {
  const grid = createHexGrid({ radius: 3 });
  const hexes = new Map(grid.hexes);

  for (const terrain of tacticalMapHexTerrain) {
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
    throw new Error('Expected VTOL tactical-map movement projection');
  }
  return [projection];
}

export const tacticalMapVtolElevationMovementRange: readonly IMovementRangeHex[] =
  requireMovementProjection(
    deriveMovementRangeHexForDestination(
      tacticalMapVtolUnit,
      MovementType.Run,
      tacticalMapVtolGrid(),
      tacticalMapVtolCapability,
      { q: 1, r: 0 },
    ),
  );

export const tacticalMapVtolElevationMpLegend: MapMovementPointLegendState = {
  active: 'run',
  movementMode: 'vtol',
  walkMP: 4,
  runMP: 6,
  jumpAvailable: false,
};
