/**
 * Behavior-class coverage for runner-applied ranged to-hit modifiers.
 *
 * Helper-level GATOR math has its own tests; these scenarios verify the
 * weapon-attack runner actually threads combat state into AttackDeclared
 * events so simulated combat consumers see the same modifiers.
 */

import type { IAttackDeclaredPayload } from '@/types/gameplay/GameSessionAttackEvents';
import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
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
  type IHexGrid,
  type IEnvironmentalConditions,
  type IMovementCapability,
  type IUnitGameState,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  addC3Network,
  createC3MasterSlaveNetwork,
  createC3Unit,
  createEmptyC3State,
} from '@/utils/gameplay/c3Network';
import { createEnvironmentalConditions } from '@/utils/gameplay/environmentalModifiers';
import { calculateLOS } from '@/utils/gameplay/lineOfSight';
import { getTerrainToHitModifier } from '@/utils/gameplay/toHit';

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

import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { CANONICAL_SPA_COMBAT_SCOPE_SUPPORT } from '../CombatCanonicalSpaSupport';
import { SPA_COMBAT_SUPPORT } from '../CombatFeatureSupport';
import { PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT } from '../CombatPilotModifierApplicationSupport';
import {
  RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
} from '../CombatRuleSupport';
import { runAttackPhase } from '../phases/weaponAttack';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';

export const MEDIUM_LASER_ID = 'medium-laser-test';
export const LRM_ID = 'lrm-10-test';
export const BASE_ARMOR = {
  head: 9,
  center_torso: 47,
  left_torso: 32,
  right_torso: 32,
  left_arm: 34,
  right_arm: 34,
  left_leg: 41,
  right_leg: 41,
};
export const BASE_STRUCTURE = {
  head: 3,
  center_torso: 31,
  left_torso: 21,
  right_torso: 21,
  left_arm: 17,
  right_arm: 17,
  left_leg: 21,
  right_leg: 21,
};

export class DeclaresWeaponAttackAI implements IAIPlayer {
  constructor(
    private readonly weaponId = MEDIUM_LASER_ID,
    private readonly targetId = 'opponent-1',
    private readonly weaponIds?: readonly string[],
    private readonly weaponTargets?: Readonly<Record<string, string>>,
    private readonly calledShots?: Readonly<Record<string, boolean>>,
    private readonly teammateCalledShots?: Readonly<Record<string, boolean>>,
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
        weapons: this.weaponIds ?? [this.weaponId],
        ...(this.weaponTargets ? { weaponTargets: this.weaponTargets } : {}),
        ...(this.calledShots ? { calledShots: this.calledShots } : {}),
        ...(this.teammateCalledShots
          ? { teammateCalledShots: this.teammateCalledShots }
          : {}),
      },
    };
  }

  playPhysicalAttackPhase(): IPhysicalAttackEvent | null {
    return null;
  }
}

export function createLrm(): IWeapon {
  return {
    id: LRM_ID,
    name: 'LRM 10',
    shortRange: 7,
    mediumRange: 14,
    longRange: 21,
    damage: 10,
    heat: 4,
    minRange: 0,
    ammoPerTon: 12,
    destroyed: false,
  };
}

export function createMediumLaser(id = MEDIUM_LASER_ID): IWeapon {
  return {
    id,
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

export function createUnit(options: {
  id: string;
  side: GameSide;
  position: { q: number; r: number };
  overrides?: Partial<IUnitGameState>;
}): IUnitGameState {
  const { id, overrides, position, side } = options;
  return {
    id,
    side,
    position,
    facing: side === GameSide.Player ? Facing.South : Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: { ...BASE_ARMOR },
    structure: { ...BASE_STRUCTURE },
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
    ...overrides,
  };
}

export function createHex(q: number, r: number, terrain: string) {
  return { coord: { q, r }, occupantId: null, terrain, elevation: 0 };
}

export function createGrid(
  targetTerrain: TerrainType = TerrainType.Clear,
  interveningTerrain: ReadonlyArray<{
    q: number;
    r: number;
    terrain: string;
  }> = [],
): IHexGrid {
  const hexes = new Map();
  for (let q = -2; q <= 5; q++) {
    for (let r = -2; r <= 2; r++) {
      hexes.set(`${q},${r}`, createHex(q, r, TerrainType.Clear));
    }
  }

  for (const hex of interveningTerrain) {
    hexes.set(`${hex.q},${hex.r}`, createHex(hex.q, hex.r, hex.terrain));
  }
  hexes.set('3,0', createHex(3, 0, targetTerrain));
  return { config: { radius: 5 }, hexes };
}

export function createWeaponAttackState(options?: {
  attacker?: Partial<IUnitGameState>;
  target?: Partial<IUnitGameState>;
}): IGameState {
  return {
    gameId: 'runner-to-hit-modifiers-test',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    activationIndex: 0,
    units: {
      'player-1': createUnit({
        id: 'player-1',
        side: GameSide.Player,
        position: { q: 0, r: 0 },
        overrides: options?.attacker,
      }),
      'opponent-1': createUnit({
        id: 'opponent-1',
        side: GameSide.Opponent,
        position: { q: 3, r: 0 },
        overrides: options?.target,
      }),
    },
    turnEvents: [],
  };
}

export function runModifierScenario(options?: {
  state?: IGameState;
  grid?: IHexGrid;
  weapon?: IWeapon;
  manifestsByUnit?: Map<string, CriticalSlotManifest>;
  environmentalConditions?: IEnvironmentalConditions;
  optionalRules?: readonly string[];
}): IGameEvent[] {
  const state = options?.state ?? createWeaponAttackState();
  const events: IGameEvent[] = [];
  const violations: IViolation[] = [];
  const weapon = options?.weapon ?? createMediumLaser();

  runAttackPhase({
    state,
    botPlayer: new DeclaresWeaponAttackAI(weapon.id),
    grid: options?.grid ?? createGrid(),
    environmentalConditions: options?.environmentalConditions,
    invariantRunner: new InvariantRunner(),
    violations,
    events,
    gameId: state.gameId,
    random: new SeededRandom(12345),
    weaponsByUnit: new Map([
      ['player-1', [weapon]],
      ['opponent-1', []],
    ]),
    manifestsByUnit: options?.manifestsByUnit,
    optionalRules: options?.optionalRules,
  });

  return events;
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

export function attackDeclaredPayloads(
  events: readonly IGameEvent[],
): IAttackDeclaredPayload[] {
  return events
    .filter((candidate) => candidate.type === GameEventType.AttackDeclared)
    .map((event) => event.payload as IAttackDeclaredPayload);
}

export function expectModifier(
  payload: IAttackDeclaredPayload,
  expected: { name: string; value: number; source: string },
): void {
  expect(payload.modifiers).toContainEqual(expect.objectContaining(expected));
}

export {
  ActuatorType,
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  TerrainType,
  UnitType,
  addC3Network,
  createC3MasterSlaveNetwork,
  createC3Unit,
  createEmptyC3State,
  createEnvironmentalConditions,
  calculateLOS,
  getTerrainToHitModifier,
  SeededRandom,
  InvariantRunner,
  CANONICAL_SPA_COMBAT_SCOPE_SUPPORT,
  SPA_COMBAT_SUPPORT,
  PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT,
  RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
  runAttackPhase,
  DEFAULT_COMPONENT_DAMAGE,
};

export type {
  IAttackDeclaredPayload,
  CriticalSlotManifest,
  IGameEvent,
  IGameState,
  IHexGrid,
  IEnvironmentalConditions,
  IMovementCapability,
  IUnitGameState,
  IAIPlayer,
  IAIUnitState,
  IAttackEvent,
  IMovementEvent,
  IPhysicalAttackEvent,
  IRetreatEvent,
  IWeapon,
  IViolation,
};
