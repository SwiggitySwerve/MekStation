import type { ILOSDamageableCoverProvider } from '@/utils/gameplay/lineOfSight';

import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  IGameEvent,
  IGameState,
  IHexGrid,
  IUnitGameState,
  LockState,
  MovementType,
  TerrainType,
} from '@/types/gameplay';
import { buildDefaultCriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

import type { IWeapon } from '../../../ai/types';

import { DEFAULT_COMPONENT_DAMAGE } from '../../SimulationRunnerConstants';

function scriptedRoller(queue: readonly number[]): () => number {
  let i = 0;
  return () => queue[i++] ?? 1;
}

function makeWeapon(): IWeapon {
  return {
    id: 'weapon-1',
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

export function makeDamageableCoverGrid(options: {
  readonly constructionFactor: number;
  readonly fuelTank?: boolean;
}): IHexGrid {
  const coord = { q: 0, r: 1 };
  const terrain = terrainStringFromFeatures([
    {
      type: TerrainType.Building,
      level: 1,
      constructionFactor: options.constructionFactor,
      ...(options.fuelTank
        ? { fuelTankId: 'fuel-tank-a', fuelTankElevation: 1 }
        : { buildingId: 'building-a' }),
    },
  ]);

  return {
    config: { radius: 2 },
    hexes: new Map([
      [
        coordToKey(coord),
        {
          coord,
          occupantId: null,
          terrain,
          elevation: 0,
        },
      ],
    ]),
  };
}

export function makeDamageableCoverProvider(
  fuelTank = false,
): ILOSDamageableCoverProvider {
  return {
    coord: { q: 0, r: 1 },
    kind: fuelTank ? 'fuel-tank' : 'building',
    side: 'target',
    terrain: TerrainType.Building,
    height: 1,
    totalElevation: 1,
    constructionFactor: fuelTank ? 4 : 12,
    buildingClass: 'soft',
    ...(fuelTank
      ? { fuelTankId: 'fuel-tank-a' }
      : { buildingId: 'building-a' }),
  };
}

function makeUnit(id: string, side: GameSide): IUnitGameState {
  return {
    id,
    side,
    position: side === GameSide.Player ? { q: 0, r: 0 } : { q: 1, r: 0 },
    facing: side === GameSide.Player ? Facing.South : Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      center_torso: 47,
      center_torso_rear: 14,
      left_torso: 32,
      left_torso_rear: 10,
      right_torso: 32,
      right_torso_rear: 10,
      left_arm: 34,
      right_arm: 34,
      left_leg: 41,
      right_leg: 41,
    },
    structure: {
      head: 3,
      center_torso: 31,
      left_torso: 21,
      right_torso: 21,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    componentDamage: DEFAULT_COMPONENT_DAMAGE,
    prone: false,
    shutdown: false,
    pendingPSRs: [],
    damageThisPhase: 0,
    weaponsFiredThisTurn: [],
    gunnery: 4,
    piloting: 5,
  };
}

function makeState(): IGameState {
  return {
    gameId: 'pc-test',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    activationIndex: 0,
    units: {
      attacker: makeUnit('attacker', GameSide.Player),
      target: makeUnit('target', GameSide.Opponent),
    },
    turnEvents: [],
  };
}

export function resolveArgs(
  events: IGameEvent[],
  partialCover: boolean,
  rollQueue: readonly number[],
  options: {
    hullDown?: boolean;
    targetQuirks?: readonly string[];
    targetAbilities?: readonly string[];
    targetEdgePointsRemaining?: number;
    attackRoll?: number;
    toHitNumber?: number;
    projectileCount?: number;
    targetArmor?: Readonly<Record<string, number>>;
  } = {},
) {
  const currentState = makeState();
  const target = currentState.units.target;

  return {
    currentState: {
      ...currentState,
      units: {
        ...currentState.units,
        target: {
          ...target,
          ...(options.targetArmor
            ? { armor: { ...target.armor, ...options.targetArmor } }
            : {}),
          ...(options.targetQuirks ? { unitQuirks: options.targetQuirks } : {}),
          ...(options.targetAbilities
            ? { abilities: options.targetAbilities }
            : {}),
          ...(options.targetEdgePointsRemaining !== undefined
            ? { edgePointsRemaining: options.targetEdgePointsRemaining }
            : {}),
        },
      },
    },
    events,
    gameId: 'pc-test',
    unitId: 'attacker',
    targetId: 'target',
    weaponId: 'weapon-1',
    weapon: makeWeapon(),
    attackRoll: options.attackRoll ?? 8,
    toHitNumber: options.toHitNumber ?? 6,
    firingArc: 'front' as const,
    partialCover,
    ...(options.projectileCount !== undefined
      ? { projectileCount: options.projectileCount }
      : {}),
    ...(options.hullDown !== undefined ? { hullDown: options.hullDown } : {}),
    d6Roller: scriptedRoller(rollQueue),
    getOrSeedManifest: () => buildDefaultCriticalSlotManifest(),
  };
}
