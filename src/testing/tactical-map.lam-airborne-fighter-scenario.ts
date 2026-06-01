import type { MapMovementPointLegendState } from '@/components/gameplay/HexMapDisplay/HexMapDisplay.types';
import type {
  IHexGrid,
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
  TokenUnitType,
} from '@/types/gameplay';
import { createAerospaceCombatState } from '@/utils/gameplay/aerospace/state';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { deriveMovementRangeHexForDestination } from '@/utils/gameplay/movement/reachable';
import { resolveRuntimeMovementCapability } from '@/utils/gameplay/movement/runtimeCapability';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

import {
  tacticalMapLamConversionSelectedHex,
  tacticalMapLamFighterConversionHexTerrain,
} from './tactical-map.lam-conversion-scenario';

const tacticalMapLamAirborneFighterDestination = { q: 1, r: 0 } as const;

const tacticalMapLamAirborneFighterCapability: IMovementCapability = {
  walkMP: 4,
  runMP: 6,
  jumpMP: 2,
  movementMode: 'walk',
  movementHeatProfile: 'mek',
  unitHeight: 1,
  unitHeightProfile: { kind: 'lam', standingHeight: 1 },
};

const tacticalMapLamAirborneFighterUnit: IUnitGameState = {
  id: 'attacker',
  side: GameSide.Player,
  position: tacticalMapLamConversionSelectedHex,
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
  conversionMode: 'fighter',
  combatState: {
    kind: 'aero',
    state: createAerospaceCombatState({
      maxSI: 3,
      armorByArc: { nose: 1, leftWing: 1, rightWing: 1, aft: 1 },
      heatSinks: 10,
      fuelPoints: 20,
      safeThrust: 2,
      maxThrust: 3,
      altitude: 1,
      currentVelocity: 2,
      nextVelocity: 2,
      airborneState: 'airborne',
    }),
  },
};

const tacticalMapLamAirborneAirMekUnit: IUnitGameState = {
  ...tacticalMapLamAirborneFighterUnit,
  conversionMode: 'airmek',
  combatState: {
    kind: 'aero',
    state: createAerospaceCombatState({
      maxSI: 3,
      armorByArc: { nose: 1, leftWing: 1, rightWing: 1, aft: 1 },
      heatSinks: 10,
      fuelPoints: 20,
      safeThrust: 2,
      maxThrust: 3,
      altitude: 1,
      currentVelocity: 2,
      nextVelocity: 2,
      airborneState: 'airborne',
    }),
  },
};

function tacticalMapLamAirborneFighterGrid(): IHexGrid {
  const grid = createHexGrid({ radius: 3 });
  const hexes = new Map(grid.hexes);

  for (const terrain of tacticalMapLamFighterConversionHexTerrain) {
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

function requireSingleMovementProjection(
  projection: IMovementRangeHex | null,
): IMovementRangeHex {
  if (!projection) {
    throw new Error('Expected airborne LAM Fighter movement projection');
  }
  return projection;
}

const tacticalMapLamAirborneFighterResolvedCapability =
  resolveRuntimeMovementCapability(
    tacticalMapLamAirborneFighterUnit,
    tacticalMapLamAirborneFighterCapability,
  ) ?? tacticalMapLamAirborneFighterCapability;
const tacticalMapLamAirborneAirMekResolvedCapability =
  resolveRuntimeMovementCapability(
    tacticalMapLamAirborneAirMekUnit,
    tacticalMapLamAirborneFighterCapability,
  ) ?? tacticalMapLamAirborneFighterCapability;

export const tacticalMapLamAirborneFighterTokens: readonly IUnitToken[] = [
  {
    unitId: 'attacker',
    name: 'LAM Airborne Fighter Mode',
    designation: 'LAF',
    position: tacticalMapLamConversionSelectedHex,
    facing: Facing.Northeast,
    side: GameSide.Player,
    isDestroyed: false,
    isSelected: true,
    isValidTarget: false,
    unitType: TokenUnitType.Mech,
  },
];

export const tacticalMapLamAirborneAirMekTokens: readonly IUnitToken[] = [
  {
    unitId: 'attacker',
    name: 'LAM Airborne AirMek Mode',
    designation: 'LAA',
    position: tacticalMapLamConversionSelectedHex,
    facing: Facing.Northeast,
    side: GameSide.Player,
    isDestroyed: false,
    isSelected: true,
    isValidTarget: false,
    unitType: TokenUnitType.Mech,
  },
];

export const tacticalMapLamAirborneFighterMovementRange: readonly IMovementRangeHex[] =
  [
    requireSingleMovementProjection(
      deriveMovementRangeHexForDestination(
        tacticalMapLamAirborneFighterUnit,
        MovementType.Walk,
        tacticalMapLamAirborneFighterGrid(),
        tacticalMapLamAirborneFighterCapability,
        tacticalMapLamAirborneFighterDestination,
      ),
    ),
  ];

export const tacticalMapLamAirborneAirMekMovementRange: readonly IMovementRangeHex[] =
  [
    requireSingleMovementProjection(
      deriveMovementRangeHexForDestination(
        tacticalMapLamAirborneAirMekUnit,
        MovementType.Walk,
        tacticalMapLamAirborneFighterGrid(),
        tacticalMapLamAirborneFighterCapability,
        tacticalMapLamAirborneFighterDestination,
      ),
    ),
  ];

export const tacticalMapLamAirborneFighterMpLegend: MapMovementPointLegendState =
  {
    active: 'walk',
    movementMode: tacticalMapLamAirborneFighterResolvedCapability.movementMode,
    walkMP: tacticalMapLamAirborneFighterResolvedCapability.walkMP,
    runMP: tacticalMapLamAirborneFighterResolvedCapability.runMP,
    jumpMP: tacticalMapLamAirborneFighterResolvedCapability.jumpMP,
    jumpAvailable: tacticalMapLamAirborneFighterResolvedCapability.jumpMP > 0,
  };

export const tacticalMapLamAirborneAirMekMpLegend: MapMovementPointLegendState =
  {
    active: 'walk',
    movementMode: tacticalMapLamAirborneAirMekResolvedCapability.movementMode,
    walkMP: tacticalMapLamAirborneAirMekResolvedCapability.walkMP,
    runMP: tacticalMapLamAirborneAirMekResolvedCapability.runMP,
    jumpMP: tacticalMapLamAirborneAirMekResolvedCapability.jumpMP,
    jumpAvailable: tacticalMapLamAirborneAirMekResolvedCapability.jumpMP > 0,
  };

export function tacticalMapLamAirborneFighterCommitInput(): ICommittedMovementValidationInput {
  return {
    grid: tacticalMapLamAirborneFighterGrid(),
    unit: tacticalMapLamAirborneFighterUnit,
    to: tacticalMapLamAirborneFighterDestination,
    facing: Facing.Northeast,
    movementType: MovementType.Walk,
    capability: tacticalMapLamAirborneFighterCapability,
    path: [
      tacticalMapLamConversionSelectedHex,
      tacticalMapLamAirborneFighterDestination,
    ],
  };
}

export function tacticalMapLamAirborneAirMekCommitInput(): ICommittedMovementValidationInput {
  return {
    grid: tacticalMapLamAirborneFighterGrid(),
    unit: tacticalMapLamAirborneAirMekUnit,
    to: tacticalMapLamAirborneFighterDestination,
    facing: Facing.Northeast,
    movementType: MovementType.Walk,
    capability: tacticalMapLamAirborneFighterCapability,
    path: [
      tacticalMapLamConversionSelectedHex,
      tacticalMapLamAirborneFighterDestination,
    ],
  };
}
