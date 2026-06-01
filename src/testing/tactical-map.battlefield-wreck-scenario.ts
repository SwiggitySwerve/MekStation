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

import { Facing, GameSide, LockState, MovementType } from '@/types/gameplay';
import {
  applyBattlefieldWreckTerrainToGrid,
  TAC_OPS_BATTLE_WRECK_OPTIONAL_RULE_KEY,
} from '@/utils/gameplay/battlefieldWreckTerrain';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { deriveMovementRangeHexForDestination } from '@/utils/gameplay/movement/reachable';
import { terrainFeaturesFromString } from '@/utils/gameplay/terrainEncoding';

import { tacticalMapTokens } from './tactical-map.fixtures';

const battlefieldWreckOrigin = { q: 0, r: 0 } as const;
export const tacticalMapBattlefieldWreckDestination = { q: 1, r: 0 } as const;

const battlefieldWreckCapability: IMovementCapability = {
  walkMP: 4,
  runMP: 6,
  jumpMP: 0,
  movementHeatProfile: 'mek',
};

const battlefieldWreckUnit: IUnitGameState = {
  id: 'attacker',
  side: GameSide.Player,
  position: battlefieldWreckOrigin,
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

export const tacticalMapBattlefieldWreckSelectedHex = battlefieldWreckOrigin;

export const tacticalMapBattlefieldWreckTokens: readonly IUnitToken[] =
  tacticalMapTokens.map((token) => {
    if (token.unitId === 'attacker') {
      return {
        ...token,
        position: battlefieldWreckOrigin,
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

function tacticalMapBattlefieldWreckGrid(): IHexGrid {
  const grid = createHexGrid({ radius: 3 });
  const result = applyBattlefieldWreckTerrainToGrid(
    grid,
    {
      unitId: 'destroyed-heavy-wreck',
      position: tacticalMapBattlefieldWreckDestination,
      weightTons: 50,
    },
    [TAC_OPS_BATTLE_WRECK_OPTIONAL_RULE_KEY],
  );

  if (!result.changed) {
    throw new Error(`Expected battlefield wreck terrain, got ${result.reason}`);
  }

  return grid;
}

const battlefieldWreckGrid = tacticalMapBattlefieldWreckGrid();
const battlefieldWreckHexKey = coordToKey(
  tacticalMapBattlefieldWreckDestination,
);
const battlefieldWreckHex = battlefieldWreckGrid.hexes.get(
  battlefieldWreckHexKey,
);

if (!battlefieldWreckHex) {
  throw new Error(`Missing battlefield wreck hex ${battlefieldWreckHexKey}`);
}

export const tacticalMapBattlefieldWreckHexTerrain: readonly IHexTerrain[] = [
  {
    coordinate: tacticalMapBattlefieldWreckDestination,
    elevation: battlefieldWreckHex.elevation,
    features: terrainFeaturesFromString(battlefieldWreckHex.terrain),
  },
];

function requireBattlefieldWreckProjection(
  projection: IMovementRangeHex | null,
): readonly IMovementRangeHex[] {
  if (!projection) {
    throw new Error('Expected battlefield wreck movement projection');
  }
  return [projection];
}

export const tacticalMapBattlefieldWreckMovementRange: readonly IMovementRangeHex[] =
  requireBattlefieldWreckProjection(
    deriveMovementRangeHexForDestination(
      battlefieldWreckUnit,
      MovementType.Walk,
      battlefieldWreckGrid,
      battlefieldWreckCapability,
      tacticalMapBattlefieldWreckDestination,
    ),
  );

export function tacticalMapBattlefieldWreckCommitInput(): ICommittedMovementValidationInput {
  return {
    grid: battlefieldWreckGrid,
    unit: battlefieldWreckUnit,
    to: tacticalMapBattlefieldWreckDestination,
    facing: Facing.Northeast,
    movementType: MovementType.Walk,
    capability: battlefieldWreckCapability,
    path: tacticalMapBattlefieldWreckMovementRange[0]?.path,
    optionalRules: [TAC_OPS_BATTLE_WRECK_OPTIONAL_RULE_KEY],
  };
}

export const tacticalMapBattlefieldWreckMpLegend: MapMovementPointLegendState =
  {
    active: 'walk',
    movementMode: 'walk',
    walkMP: battlefieldWreckCapability.walkMP,
    runMP: battlefieldWreckCapability.runMP,
    jumpMP: battlefieldWreckCapability.jumpMP,
    jumpAvailable: false,
  };
