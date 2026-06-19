/**
 * Behavior-class coverage for invalid ranged attacks.
 *
 * These tests lock the no-side-effects contract: invalid declarations emit
 * `AttackInvalid` and stop before to-hit, heat, ammo, damage, or per-turn fire
 * state changes.
 */

import type {
  IAttackDeclaredPayload,
  IAttackInvalidPayload,
} from '@/types/gameplay/GameSessionAttackEvents';
import type { IAmmoSlotState } from '@/types/gameplay/GameSessionInterfaces';

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  type IGameEvent,
  type IGameState,
  type IHex,
  type IMovementCapability,
  type IHexGrid,
  type IUnitGameState,
} from '@/types/gameplay';
import {
  TerrainType,
  type ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';
import { calculateLOS } from '@/utils/gameplay/lineOfSight';

import type {
  IAIPlayer,
  IAIUnitState,
  IAttackEvent,
  IMovementEvent,
  IPhysicalAttackEvent,
  IRetreatEvent,
} from '../../ai/IAIPlayer';
import type { IWeapon } from '../../ai/types';
import type { IViolation } from '../../invariants/types';

import { BotPlayer } from '../../ai/BotPlayer';
import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { runAttackPhase } from '../phases/weaponAttack';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';
import { toAIUnitState } from '../SimulationRunnerSupport';

export const AC20_WEAPON_ID = 'ac-20-test';
export const LRM15_WEAPON_ID = 'lrm-15-1';

export class DeclaresWeaponAttackAI implements IAIPlayer {
  constructor(
    private readonly weaponId: string = AC20_WEAPON_ID,
    private readonly targetId: string = 'opponent-1',
  ) {}

  evaluateRetreat(): IRetreatEvent | null {
    return null;
  }

  playMovementPhase(
    _unit: IAIUnitState,
    _grid: IHexGrid,
    _capability: IMovementCapability,
  ): IMovementEvent | null {
    return null;
  }

  playAttackPhase(attacker: IAIUnitState): IAttackEvent | null {
    if (attacker.unitId !== 'player-1') return null;
    return {
      type: GameEventType.AttackDeclared,
      payload: {
        attackerId: attacker.unitId,
        targetId: this.targetId,
        weapons: [this.weaponId],
      },
    };
  }

  playPhysicalAttackPhase(): IPhysicalAttackEvent | null {
    return null;
  }
}

export function createAC20(): IWeapon {
  return {
    id: AC20_WEAPON_ID,
    name: 'AC/20',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 20,
    heat: 7,
    minRange: 0,
    ammoPerTon: 5,
    destroyed: false,
  };
}

export function createLRM15(): IWeapon {
  return {
    id: LRM15_WEAPON_ID,
    name: 'LRM-15',
    shortRange: 7,
    mediumRange: 14,
    longRange: 21,
    damage: 15,
    heat: 5,
    minRange: 6,
    ammoPerTon: 8,
    destroyed: false,
  };
}

export function createAmmoBin(options: {
  binId?: string;
  weaponType: string;
  remainingRounds: number;
}): IAmmoSlotState {
  return {
    binId: options.binId ?? `${options.weaponType}-bin-1`,
    weaponType: options.weaponType,
    location: 'right_torso',
    remainingRounds: options.remainingRounds,
    maxRounds: 20,
    isExplosive: true,
  };
}

export function createUnit(
  id: string,
  side: GameSide,
  position: { q: number; r: number },
): IUnitGameState {
  return {
    id,
    side,
    position,
    facing: side === GameSide.Player ? Facing.South : Facing.North,
    heat: 3,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      center_torso: 47,
      left_torso: 32,
      right_torso: 32,
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

export function createHex(
  q: number,
  r: number,
  terrain: string = TerrainType.Clear,
  elevation = 0,
): IHex {
  return { coord: { q, r }, occupantId: null, terrain, elevation };
}

export function createBlockedGrid(): IHexGrid {
  const hexes = new Map();
  for (let q = -2; q <= 8; q++) {
    for (let r = -2; r <= 2; r++) {
      hexes.set(`${q},${r}`, createHex(q, r));
    }
  }

  hexes.set('2,0', createHex(2, 0, TerrainType.LightWoods));
  hexes.set('3,0', createHex(3, 0, TerrainType.HeavyWoods));
  return { config: { radius: 8 }, hexes };
}

export function createGroundedDropShipBlockedGrid(): IHexGrid {
  const hexes = new Map<string, ReturnType<typeof createHex>>();
  for (let q = -2; q <= 8; q++) {
    for (let r = -2; r <= 2; r++) {
      hexes.set(`${q},${r}`, createHex(q, r));
    }
  }

  hexes.set('2,0', {
    ...createHex(2, 0),
    occupantId: 'dropship-1',
  });
  return { config: { radius: 8 }, hexes };
}

export function createLandToUnderwaterGrid(targetPosition: {
  q: number;
  r: number;
}) {
  const hexes = new Map();
  for (let q = -2; q <= 8; q++) {
    for (let r = -2; r <= 2; r++) {
      hexes.set(`${q},${r}`, createHex(q, r));
    }
  }

  hexes.set(
    `${targetPosition.q},${targetPosition.r}`,
    createHex(targetPosition.q, targetPosition.r, 'water:2'),
  );
  return { config: { radius: 8 }, hexes };
}

export function createUnderwaterSeparatedByClearGrid(targetPosition: {
  q: number;
  r: number;
}): IHexGrid {
  const hexes = new Map<string, ReturnType<typeof createHex>>();
  for (let q = -2; q <= 8; q++) {
    for (let r = -2; r <= 2; r++) {
      hexes.set(`${q},${r}`, createHex(q, r));
    }
  }

  for (let q = 0; q <= targetPosition.q; q++) {
    hexes.set(
      `${q},${targetPosition.r}`,
      createHex(q, targetPosition.r, 'water:2'),
    );
  }
  hexes.set('2,0', createHex(2, 0, TerrainType.Clear, 2));

  return { config: { radius: 8 }, hexes };
}

export function createSameBuildingBlockedGrid(): IHexGrid {
  const hexes = new Map<string, ReturnType<typeof createHex>>();
  for (let q = -2; q <= 8; q++) {
    for (let r = -2; r <= 2; r++) {
      hexes.set(`${q},${r}`, createHex(q, r));
    }
  }

  const sameBuilding: ITerrainFeature[] = [
    { type: TerrainType.Building, level: 1, buildingId: 'warehouse-a' },
  ];
  const terrain = JSON.stringify(sameBuilding);
  for (let q = 0; q <= 4; q++) {
    hexes.set(`${q},0`, createHex(q, 0, terrain));
  }

  return { config: { radius: 8 }, hexes };
}

export function createSameBuildingLevelBlockedGrid(): IHexGrid {
  const hexes = new Map<string, ReturnType<typeof createHex>>();
  for (let q = -2; q <= 8; q++) {
    for (let r = -2; r <= 2; r++) {
      hexes.set(`${q},${r}`, createHex(q, r));
    }
  }

  const sameBuilding: ITerrainFeature[] = [
    { type: TerrainType.Building, level: 1, buildingId: 'warehouse-a' },
  ];
  const terrain = JSON.stringify(sameBuilding);
  hexes.set('0,0', createHex(0, 0, terrain, 0));
  hexes.set('1,0', createHex(1, 0, terrain, 0));
  hexes.set('2,0', createHex(2, 0, terrain, 0));
  hexes.set('3,0', createHex(3, 0, terrain, 1));

  return { config: { radius: 8 }, hexes };
}

export function createBuildingHeightBlockedGrid(): IHexGrid {
  const hexes = new Map<string, ReturnType<typeof createHex>>();
  for (let q = -2; q <= 4; q++) {
    for (let r = -2; r <= 2; r++) {
      hexes.set(`${q},${r}`, createHex(q, r));
    }
  }

  const elevatedBuilding: ITerrainFeature[] = [
    { type: TerrainType.Building, level: 3, constructionFactor: 40 },
  ];
  hexes.set('1,0', createHex(1, 0, JSON.stringify(elevatedBuilding)));

  return { config: { radius: 8 }, hexes };
}

export function createSinglePathElevationBlockedGrid(): IHexGrid {
  const hexes = new Map<string, ReturnType<typeof createHex>>();
  for (let q = -2; q <= 4; q++) {
    for (let r = -2; r <= 2; r++) {
      hexes.set(`${q},${r}`, createHex(q, r));
    }
  }

  hexes.set('1,0', createHex(1, 0, TerrainType.Clear, 2));

  return { config: { radius: 8 }, hexes };
}

export function createDividedLosBlockedGrid(): IHexGrid {
  const hexes = new Map<string, ReturnType<typeof createHex>>();
  for (let q = -2; q <= 4; q++) {
    for (let r = -5; r <= 1; r++) {
      hexes.set(`${q},${r}`, createHex(q, r));
    }
  }

  const elevatedBuilding: ITerrainFeature[] = [
    { type: TerrainType.Building, level: 3, constructionFactor: 40 },
  ];
  hexes.set('0,-1', createHex(0, -1, JSON.stringify(elevatedBuilding)));

  return { config: { radius: 8 }, hexes };
}

export function createDividedElevationBlockedGrid(): IHexGrid {
  const hexes = new Map<string, ReturnType<typeof createHex>>();
  for (let q = -2; q <= 4; q++) {
    for (let r = -5; r <= 1; r++) {
      hexes.set(`${q},${r}`, createHex(q, r));
    }
  }

  hexes.set('0,-1', createHex(0, -1, TerrainType.Clear, 2));

  return { config: { radius: 8 }, hexes };
}

export function createDiagramOnlyHeavyWoodsGrid(): IHexGrid {
  const hexes = new Map<string, ReturnType<typeof createHex>>();
  for (let q = -2; q <= 4; q++) {
    for (let r = -2; r <= 2; r++) {
      hexes.set(`${q},${r}`, createHex(q, r));
    }
  }

  hexes.set('0,0', createHex(0, 0, TerrainType.Clear, 3));
  hexes.set('1,0', createHex(1, 0, TerrainType.HeavyWoods, 1));
  hexes.set('2,0', createHex(2, 0));

  return { config: { radius: 8 }, hexes };
}

export function createWeaponAttackState(targetPosition: {
  q: number;
  r: number;
}): IGameState {
  return {
    gameId: 'invalid-range-test',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    activationIndex: 0,
    units: {
      'player-1': createUnit('player-1', GameSide.Player, { q: 0, r: 0 }),
      'opponent-1': createUnit('opponent-1', GameSide.Opponent, targetPosition),
    },
    turnEvents: [],
  };
}

export function runInvalidationScenario(options: {
  state: IGameState;
  weapon: IWeapon;
  grid?: IHexGrid;
  targetId?: string;
  declaredWeaponId?: string;
  optionalRules?: readonly string[];
}): { result: IGameState; events: IGameEvent[] } {
  const events: IGameEvent[] = [];
  const violations: IViolation[] = [];

  const result = runAttackPhase({
    state: options.state,
    botPlayer: new DeclaresWeaponAttackAI(
      options.declaredWeaponId ?? options.weapon.id,
      options.targetId,
    ),
    grid: options.grid,
    invariantRunner: new InvariantRunner(),
    violations,
    events,
    gameId: options.state.gameId,
    random: new SeededRandom(12345),
    weaponsByUnit: new Map([
      ['player-1', [options.weapon]],
      ['opponent-1', []],
    ]),
    optionalRules: options.optionalRules,
  });

  return { result, events };
}

export function withAttackerAmmo(
  state: IGameState,
  ammoBin: IAmmoSlotState,
): IGameState {
  return {
    ...state,
    units: {
      ...state.units,
      'player-1': {
        ...state.units['player-1'],
        ammoState: { [ammoBin.binId]: ammoBin },
      },
    },
  };
}

export function assertNoCombatSideEffects(
  result: IGameState,
  initialState: IGameState,
  ammoBin?: IAmmoSlotState,
): void {
  expect(result.units['player-1'].heat).toBe(
    initialState.units['player-1'].heat,
  );
  expect(result.units['player-1'].weaponsFiredThisTurn).toEqual([]);
  if (ammoBin) {
    expect(result.units['player-1'].ammoState?.[ammoBin.binId]).toEqual(
      ammoBin,
    );
  }
  expect(result.units['opponent-1'].armor).toEqual(
    initialState.units['opponent-1'].armor,
  );
  expect(result.units['opponent-1'].structure).toEqual(
    initialState.units['opponent-1'].structure,
  );
  expect(result.units['opponent-1'].damageThisPhase).toBe(0);
}

export function attackDeclaredPayload(
  events: readonly IGameEvent[],
): IAttackDeclaredPayload {
  const event = events.find(
    (candidate) => candidate.type === GameEventType.AttackDeclared,
  );
  if (!event) {
    throw new Error('AttackDeclared event not found');
  }
  return event.payload as IAttackDeclaredPayload;
}
