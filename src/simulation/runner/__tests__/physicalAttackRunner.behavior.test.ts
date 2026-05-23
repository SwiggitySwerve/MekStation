/**
 * Behavior-class coverage for runner physical attacks that are supported by
 * the shared physical-attack rules but historically skipped by the runner.
 */

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  IGameEvent,
  IGameState,
  IHexGrid,
  IDamageAppliedPayload,
  IPhysicalAttackDeclaredPayload,
  IMovementCapability,
  IPhysicalAttackResolvedPayload,
  IUnitGameState,
  LockState,
  MovementType,
  PSRTrigger,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES,
  type PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks';

import type {
  IAIPlayer,
  IAIUnitState,
  IAttackEvent,
  IMovementEvent,
  IPhysicalAttackEvent,
  IRetreatEvent,
} from '../../ai/IAIPlayer';
import type { IViolation } from '../../invariants/types';

import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { runPhysicalAttackPhase } from '../phases/physicalAttack';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';

class DeclaresPhysicalAttackAI implements IAIPlayer {
  constructor(private readonly attackType: PhysicalAttackType) {}

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

  playAttackPhase(_attacker: IAIUnitState): IAttackEvent | null {
    return null;
  }

  playPhysicalAttackPhase(attacker: IAIUnitState): IPhysicalAttackEvent | null {
    if (attacker.unitId !== 'player-1') return null;
    return {
      type: GameEventType.PhysicalAttackDeclared,
      payload: {
        attackerId: attacker.unitId,
        targetId: 'opponent-1',
        attackType: this.attackType,
      },
    };
  }
}

function createUnit(
  id: string,
  side: GameSide,
  position: { q: number; r: number },
  overrides: Partial<IUnitGameState> = {},
): IUnitGameState {
  return {
    id,
    side,
    position,
    facing: side === GameSide.Player ? Facing.South : Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    gunnery: 4,
    piloting: 5,
    armor: {
      head: 9,
      center_torso: 31,
      left_torso: 22,
      right_torso: 22,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    structure: {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
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
    ...overrides,
  };
}

function createState(): IGameState {
  return {
    gameId: 'physical-runner-behavior',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    activationIndex: 0,
    units: {
      'player-1': createUnit('player-1', GameSide.Player, { q: 0, r: 0 }),
      'opponent-1': createUnit('opponent-1', GameSide.Opponent, {
        q: 1,
        r: 0,
      }),
    },
    turnEvents: [],
  };
}

function createPhysicalGrid(
  options: { targetElevation?: number; waterTarget?: boolean } = {},
): IHexGrid {
  const hexes = new Map();
  hexes.set('0,0', {
    coord: { q: 0, r: 0 },
    occupantId: 'player-1',
    terrain: TerrainType.Clear,
    elevation: 0,
  });
  hexes.set('1,0', {
    coord: { q: 1, r: 0 },
    occupantId: 'opponent-1',
    terrain: options.waterTarget ? 'water:1' : TerrainType.Clear,
    elevation: options.targetElevation ?? 0,
  });
  hexes.set('1,1', {
    coord: { q: 1, r: 1 },
    occupantId: null,
    terrain: TerrainType.Clear,
    elevation: 0,
  });
  hexes.set('2,0', {
    coord: { q: 2, r: 0 },
    occupantId: null,
    terrain: TerrainType.Clear,
    elevation: 0,
  });
  hexes.set('-1,1', {
    coord: { q: -1, r: 1 },
    occupantId: null,
    terrain: TerrainType.Clear,
    elevation: 0,
  });
  return { config: { radius: 2 }, hexes };
}

function runPhase(
  attackType: PhysicalAttackType,
  options: {
    attacker?: Partial<IUnitGameState>;
    target?: Partial<IUnitGameState>;
    grid?: IHexGrid;
  } = {},
): {
  initialState: IGameState;
  result: IGameState;
  events: IGameEvent[];
} {
  const events: IGameEvent[] = [];
  const violations: IViolation[] = [];
  const baseState = createState();
  const state = {
    ...baseState,
    units: {
      ...baseState.units,
      'player-1': {
        ...baseState.units['player-1'],
        ...options.attacker,
      },
      'opponent-1': {
        ...baseState.units['opponent-1'],
        ...options.target,
      },
    },
  };

  const result = runPhysicalAttackPhase({
    state,
    botPlayer: new DeclaresPhysicalAttackAI(attackType),
    invariantRunner: new InvariantRunner(),
    violations,
    events,
    gameId: state.gameId,
    grid: options.grid,
    random: new SeededRandom(11),
  });

  return { initialState: state, result, events };
}

function runAutomaticPhase(
  options: {
    attacker?: Partial<IUnitGameState>;
    target?: Partial<IUnitGameState>;
  } = {},
): {
  initialState: IGameState;
  result: IGameState;
  events: IGameEvent[];
} {
  const events: IGameEvent[] = [];
  const violations: IViolation[] = [];
  const baseState = createState();
  const state = {
    ...baseState,
    units: {
      ...baseState.units,
      'player-1': {
        ...baseState.units['player-1'],
        ...options.attacker,
      },
      'opponent-1': {
        ...baseState.units['opponent-1'],
        ...options.target,
      },
    },
  };

  const result = runPhysicalAttackPhase({
    state,
    invariantRunner: new InvariantRunner(),
    violations,
    events,
    gameId: state.gameId,
    random: new SeededRandom(11),
  });

  return { initialState: state, result, events };
}

function damageEventsFor(
  events: readonly IGameEvent[],
  unitId: string,
): IDamageAppliedPayload[] {
  return events
    .filter((event) => event.type === GameEventType.DamageApplied)
    .map((event) => event.payload as IDamageAppliedPayload)
    .filter((payload) => payload.unitId === unitId);
}

function resolvedPayload(
  events: readonly IGameEvent[],
): IPhysicalAttackResolvedPayload {
  return events.find(
    (event) => event.type === GameEventType.PhysicalAttackResolved,
  )?.payload as IPhysicalAttackResolvedPayload;
}

function expectPendingPSR(
  state: IGameState,
  unitId: string,
  reasonCode: PSRTrigger,
): void {
  expect(state.units[unitId].pendingPSRs).toContainEqual(
    expect.objectContaining({ reasonCode }),
  );
}

describe('runPhysicalAttackPhase behavior validation lane', () => {
  it('honors an injected push declaration and queues the pushed PSR', () => {
    const { events, result } = runPhase('push', {
      attacker: { facing: Facing.Southeast },
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.PhysicalAttackDeclared,
      GameEventType.PhysicalAttackResolved,
    ]);

    const resolved = events[1].payload as IPhysicalAttackResolvedPayload;
    expect(resolved).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'push',
      roll: 8,
      toHitNumber: 4,
      hit: true,
      damage: 0,
    });
    expect(result.units['opponent-1'].pendingPSRs).toEqual([
      expect.objectContaining({ reasonCode: PSRTrigger.Pushed }),
    ]);
  });

  it('rejects injected physical declarations against passenger targets before side effects', () => {
    const { events, result } = runPhase('kick', {
      target: { isPassenger: true },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TargetPassenger',
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('rejects injected physical declarations against swarming targets before side effects', () => {
    const { events, result } = runPhase('kick', {
      target: { isSwarming: true },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TargetSwarming',
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('rejects injected physical declarations against targets making DFA before side effects', () => {
    const { events, result } = runPhase('kick', {
      target: { isMakingDFA: true },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TargetMakingDFA',
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('rejects injected charge declarations against targets making displacement attacks before side effects', () => {
    const { events, result } = runPhase('charge', {
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
      target: { isMakingDisplacementAttack: true },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TargetMakingDisplacementAttack',
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(damageEventsFor(events, 'player-1')).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['player-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('rejects injected push declarations against targets pushing another unit before side effects', () => {
    const { events, result } = runPhase('push', {
      attacker: { facing: Facing.Southeast },
      target: {
        isMakingDisplacementAttack: true,
        isPushing: true,
        displacementAttackTargetId: 'third-unit',
      },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TargetPushingAnotherMek',
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(damageEventsFor(events, 'player-1')).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['player-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('rejects injected physical declarations against targets inside another building before side effects', () => {
    const { events, result } = runPhase('kick', {
      target: { occupiedBuildingId: 'building-east' },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TargetInsideBuilding',
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('rejects injected physical declarations against airborne targets before side effects', () => {
    const { events, result } = runPhase('kick', {
      target: { isAirborne: true },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TargetAirborne',
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('rejects injected physical declarations by evading attackers before side effects', () => {
    const { events, result } = runPhase('kick', {
      attacker: { isEvading: true },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'AttackerEvading',
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('rejects injected physical declarations by cargo-interacting attackers before side effects', () => {
    const { events, result } = runPhase('kick', {
      attacker: { isLoadingOrUnloadingCargo: true },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'AttackerCargoInteraction',
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('rejects injected physical declarations against different-board targets before side effects', () => {
    const { events, result } = runPhase('kick', {
      attacker: { boardId: 'board-alpha' },
      target: { boardId: 'board-beta' },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'DifferentBoard',
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('rejects source-backed push legality gates before displacement side effects', () => {
    const { events, result } = runPhase('push', {
      target: { prone: true },
    });

    const resolved = resolvedPayload(events);
    expect(resolved).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
    });
    expect(resolved.displacements).toBeUndefined();
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('keeps injected push declarations conservative when fired weapon locations are unknown', () => {
    const { events, result } = runPhase('push', {
      attacker: {
        facing: Facing.Southeast,
        weaponsFiredThisTurn: ['right-arm-medium-laser'],
      },
    });

    const resolved = resolvedPayload(events);
    expect(resolved).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'WeaponFiredThisTurn',
    });
    expect(resolved.displacements).toBeUndefined();
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('rejects injected push declarations after hydrated arm-mounted weapon fire', () => {
    const { events, result } = runPhase('push', {
      attacker: {
        facing: Facing.Southeast,
        weaponsFiredThisTurn: ['right-arm-medium-laser'],
        weaponLocationById: {
          'right-arm-medium-laser': 'RIGHT_ARM',
        },
      },
    });

    const resolved = resolvedPayload(events);
    expect(resolved).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'WeaponFiredThisTurn',
    });
    expect(resolved.displacements).toBeUndefined();
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('allows injected push declarations after hydrated torso-mounted weapon fire', () => {
    const { events, result } = runPhase('push', {
      attacker: {
        facing: Facing.Southeast,
        weaponsFiredThisTurn: ['center-torso-laser'],
        weaponLocationById: {
          'center-torso-laser': 'CENTER_TORSO',
        },
      },
    });

    const resolved = resolvedPayload(events);
    expect(resolved).toMatchObject({
      attackType: 'push',
      roll: 8,
      toHitNumber: 4,
      hit: true,
      damage: 0,
    });
    expect(result.units['opponent-1'].pendingPSRs).toEqual([
      expect.objectContaining({ reasonCode: PSRTrigger.Pushed }),
    ]);
  });

  it('rejects injected push declarations when either attacker arm is missing', () => {
    const { events, result } = runPhase('push', {
      attacker: {
        facing: Facing.Southeast,
        destroyedLocations: ['left_arm'],
      },
    });

    const resolved = resolvedPayload(events);
    expect(resolved).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'LimbMissing',
    });
    expect(resolved.displacements).toBeUndefined();
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('rejects injected push declarations for explicit non-Mek attackers or targets', () => {
    const nonMekAttacker = runPhase('push', {
      attacker: {
        facing: Facing.Southeast,
        unitType: UnitType.VEHICLE,
      },
    });

    expect(resolvedPayload(nonMekAttacker.events)).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'AttackerNotMek',
    });
    expect(nonMekAttacker.result.units['opponent-1'].pendingPSRs).toHaveLength(
      0,
    );
    expect(nonMekAttacker.result.units['opponent-1'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(nonMekAttacker.result.units['player-1'].position).toEqual({
      q: 0,
      r: 0,
    });

    const nonMekTarget = runPhase('push', {
      attacker: { facing: Facing.Southeast },
      target: { unitType: UnitType.BATTLE_ARMOR },
    });

    expect(resolvedPayload(nonMekTarget.events)).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TargetNotMek',
    });
    expect(nonMekTarget.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(nonMekTarget.result.units['opponent-1'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(nonMekTarget.result.units['player-1'].position).toEqual({
      q: 0,
      r: 0,
    });
  });

  it('rejects injected push declarations from quad BattleMechs before side effects', () => {
    const quadAttacker = runPhase('push', {
      attacker: {
        facing: Facing.Southeast,
        isQuad: true,
      },
    });

    expect(resolvedPayload(quadAttacker.events)).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'AttackerQuad',
    });
    expect(quadAttacker.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(quadAttacker.result.units['opponent-1'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(quadAttacker.result.units['player-1'].position).toEqual({
      q: 0,
      r: 0,
    });
  });

  it('rejects injected push declarations from airborne attackers before side effects', () => {
    const airborneAttacker = runPhase('push', {
      attacker: {
        facing: Facing.Southeast,
        isAirborne: true,
      },
    });

    expect(resolvedPayload(airborneAttacker.events)).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'AttackerAirborne',
    });
    expect(
      airborneAttacker.result.units['opponent-1'].pendingPSRs,
    ).toHaveLength(0);
    expect(airborneAttacker.result.units['opponent-1'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(airborneAttacker.result.units['player-1'].position).toEqual({
      q: 0,
      r: 0,
    });
  });

  it('rejects injected push declarations with rear-flipped arms before side effects', () => {
    const flippedArms = runPhase('push', {
      attacker: {
        facing: Facing.Southeast,
        armsFlipped: true,
      },
    });

    expect(resolvedPayload(flippedArms.events)).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'ArmsFlipped',
    });
    expect(flippedArms.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(flippedArms.result.units['opponent-1'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(flippedArms.result.units['player-1'].position).toEqual({
      q: 0,
      r: 0,
    });
  });

  it('rejects injected charge declarations against non-Mek or prone targets before side effects', () => {
    const nonMekTarget = runPhase('charge', {
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
      target: { unitType: UnitType.BATTLE_ARMOR },
    });

    expect(resolvedPayload(nonMekTarget.events)).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TargetNotMek',
    });
    expect(damageEventsFor(nonMekTarget.events, 'opponent-1')).toHaveLength(0);
    expect(damageEventsFor(nonMekTarget.events, 'player-1')).toHaveLength(0);
    expect(nonMekTarget.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(nonMekTarget.result.units['player-1'].pendingPSRs).toHaveLength(0);
    expect(nonMekTarget.result.units['opponent-1'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(nonMekTarget.result.units['player-1'].position).toEqual({
      q: 0,
      r: 0,
    });

    const proneTarget = runPhase('charge', {
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
      target: { prone: true },
    });

    expect(resolvedPayload(proneTarget.events)).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TargetProne',
    });
    expect(damageEventsFor(proneTarget.events, 'opponent-1')).toHaveLength(0);
    expect(damageEventsFor(proneTarget.events, 'player-1')).toHaveLength(0);
    expect(proneTarget.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(proneTarget.result.units['player-1'].pendingPSRs).toHaveLength(0);
    expect(proneTarget.result.units['opponent-1'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(proneTarget.result.units['player-1'].position).toEqual({
      q: 0,
      r: 0,
    });
  });

  it('rejects injected charge declarations when target elevation does not overlap the attacker', () => {
    const elevatedTarget = runPhase('charge', {
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
      grid: createPhysicalGrid({ targetElevation: 2 }),
    });

    expect(resolvedPayload(elevatedTarget.events)).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'ElevationMismatch',
    });
    expect(damageEventsFor(elevatedTarget.events, 'opponent-1')).toHaveLength(
      0,
    );
    expect(damageEventsFor(elevatedTarget.events, 'player-1')).toHaveLength(0);
    expect(elevatedTarget.result.units['opponent-1'].pendingPSRs).toHaveLength(
      0,
    );
    expect(elevatedTarget.result.units['player-1'].pendingPSRs).toHaveLength(0);
    expect(elevatedTarget.result.units['opponent-1'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(elevatedTarget.result.units['player-1'].position).toEqual({
      q: 0,
      r: 0,
    });
  });

  it('rejects injected non-Mek charge declarations against infantry or ProtoMech targets', () => {
    const protoTarget = runPhase('charge', {
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
        unitType: UnitType.VEHICLE,
      },
      target: { unitType: UnitType.PROTOMECH },
    });

    expect(resolvedPayload(protoTarget.events)).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'TargetInfantryOrProtoMek',
    });
    expect(damageEventsFor(protoTarget.events, 'opponent-1')).toHaveLength(0);
    expect(damageEventsFor(protoTarget.events, 'player-1')).toHaveLength(0);
    expect(protoTarget.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
    expect(protoTarget.result.units['player-1'].pendingPSRs).toHaveLength(0);
    expect(protoTarget.result.units['opponent-1'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(protoTarget.result.units['player-1'].position).toEqual({
      q: 0,
      r: 0,
    });
  });

  it('rejects injected DFA declarations by infantry-family attackers before side effects', () => {
    const infantryAttacker = runPhase('dfa', {
      attacker: {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
        unitType: UnitType.INFANTRY,
      },
    });

    expect(resolvedPayload(infantryAttacker.events)).toMatchObject({
      attackType: 'dfa',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
      location: 'AttackerInfantry',
    });
    expect(damageEventsFor(infantryAttacker.events, 'opponent-1')).toHaveLength(
      0,
    );
    expect(damageEventsFor(infantryAttacker.events, 'player-1')).toHaveLength(
      0,
    );
    expect(
      infantryAttacker.result.units['opponent-1'].pendingPSRs,
    ).toHaveLength(0);
    expect(infantryAttacker.result.units['player-1'].pendingPSRs).toHaveLength(
      0,
    );
    expect(infantryAttacker.result.units['opponent-1'].position).toEqual({
      q: 1,
      r: 0,
    });
    expect(infantryAttacker.result.units['player-1'].position).toEqual({
      q: 0,
      r: 0,
    });
  });

  it('rejects side-adjacent push targets that are not directly ahead', () => {
    const { events, result } = runPhase('push');

    const resolved = resolvedPayload(events);
    expect(resolved).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
    });
    expect(resolved.displacements).toBeUndefined();
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('does not schedule injected physical attacks against non-adjacent targets', () => {
    const { events, result } = runPhase('kick', {
      target: { position: { q: 2, r: 0 } },
    });

    expect(
      events.filter(
        (event) =>
          event.type === GameEventType.PhysicalAttackDeclared ||
          event.type === GameEventType.PhysicalAttackResolved,
      ),
    ).toEqual([]);
    expect(result.units['opponent-1'].position).toEqual({ q: 2, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('does not schedule injected physical attacks against friendly targets', () => {
    const { events, result } = runPhase('kick', {
      target: { side: GameSide.Player },
    });

    expect(
      events.filter(
        (event) =>
          event.type === GameEventType.PhysicalAttackDeclared ||
          event.type === GameEventType.PhysicalAttackResolved,
      ),
    ).toEqual([]);
    expect(result.units['opponent-1'].side).toBe(GameSide.Player);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('does not schedule injected physical attacks against destroyed targets', () => {
    const { events, result } = runPhase('kick', {
      target: { destroyed: true },
    });

    expect(
      events.filter(
        (event) =>
          event.type === GameEventType.PhysicalAttackDeclared ||
          event.type === GameEventType.PhysicalAttackResolved,
      ),
    ).toEqual([]);
    expect(result.units['opponent-1'].destroyed).toBe(true);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('applies source-backed push displacement when the target hex is valid', () => {
    const { events, result } = runPhase('push', {
      attacker: { facing: Facing.Southeast },
      grid: createPhysicalGrid(),
    });

    const resolved = resolvedPayload(events);
    expect(resolved.displacements).toEqual([
      {
        unitId: 'opponent-1',
        from: { q: 1, r: 0 },
        to: { q: 2, r: 0 },
        reason: 'push',
      },
      {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'push',
      },
    ]);
    expect(result.units['opponent-1'].position).toEqual({ q: 2, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 1, r: 0 });
  });

  it('honors an injected melee weapon declaration and applies damage', () => {
    const { events, result } = runPhase('sword');

    const resolved = resolvedPayload(events);
    expect(resolved).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'sword',
      roll: 8,
      toHitNumber: 3,
      hit: true,
      damage: 8,
    });
    expect(
      events.some((event) => event.type === GameEventType.DamageApplied),
    ).toBe(true);
    expect(result.units['opponent-1'].armor.right_torso).toBeLessThan(22);
  });

  it('threads target movement modifier into physical to-hit resolution', () => {
    const { events } = runPhase('kick', {
      target: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 8,
      toHitNumber: 5,
      hit: true,
    });
  });

  it('applies pilot physical SPAs to runner to-hit and damage math', () => {
    const { events } = runPhase('kick', {
      attacker: {
        abilities: ['melee-specialist', 'melee-master'],
      },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 8,
      toHitNumber: 2,
      hit: true,
      damage: 14,
    });
  });

  it('applies physical unit quirks to runner punch restrictions and damage', () => {
    const noArms = runPhase('punch', {
      attacker: {
        unitQuirks: ['no_arms'],
      },
    });
    expect(resolvedPayload(noArms.events)).toMatchObject({
      attackType: 'punch',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      damage: 0,
    });

    const battleFist = runPhase('punch', {
      attacker: {
        unitQuirks: ['battle_fists_ra'],
      },
    });
    expect(resolvedPayload(battleFist.events)).toMatchObject({
      attackType: 'punch',
      roll: 8,
      toHitNumber: 5,
      hit: true,
      damage: 8,
    });
  });

  it('applies active TSM to runner physical damage', () => {
    const { events } = runPhase('kick', {
      attacker: {
        heat: 9,
        hasTSM: true,
      },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 8,
      toHitNumber: 3,
      hit: true,
      damage: 26,
    });
  });

  it('derives underwater physical damage from water terrain', () => {
    const { events } = runPhase('kick', {
      grid: createPhysicalGrid({ waterTarget: true }),
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'kick',
      roll: 8,
      toHitNumber: 3,
      hit: true,
      damage: 6,
    });
  });

  it('automatically selects charge after a running approach', () => {
    const { events } = runAutomaticPhase({
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
    });

    const declared = events.find(
      (event) =>
        event.type === GameEventType.PhysicalAttackDeclared &&
        (event.payload as IPhysicalAttackDeclaredPayload).attackerId ===
          'player-1',
    )?.payload as IPhysicalAttackDeclaredPayload | undefined;

    expect(declared).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'charge',
    });
  });

  it('automatically selects death from above after a jumping approach', () => {
    const { events } = runAutomaticPhase({
      attacker: {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
      },
    });

    const declared = events.find(
      (event) =>
        event.type === GameEventType.PhysicalAttackDeclared &&
        (event.payload as IPhysicalAttackDeclaredPayload).attackerId ===
          'player-1',
    )?.payload as IPhysicalAttackDeclaredPayload | undefined;

    expect(declared).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'dfa',
    });
  });

  it('does not automatically select physical attacks for evading units', () => {
    const { events } = runAutomaticPhase({
      attacker: {
        isEvading: true,
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
    });

    expect(
      events.filter(
        (event) =>
          event.actorId === 'player-1' &&
          (event.type === GameEventType.PhysicalAttackDeclared ||
            event.type === GameEventType.PhysicalAttackResolved),
      ),
    ).toEqual([]);
  });

  it('does not automatically select physical attacks for cargo-interacting units', () => {
    const { events } = runAutomaticPhase({
      attacker: {
        isLoadingOrUnloadingCargo: true,
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
    });

    expect(
      events.filter(
        (event) =>
          event.actorId === 'player-1' &&
          (event.type === GameEventType.PhysicalAttackDeclared ||
            event.type === GameEventType.PhysicalAttackResolved),
      ),
    ).toEqual([]);
  });

  it('does not automatically select physical attacks against different-board targets', () => {
    const { events } = runAutomaticPhase({
      attacker: {
        boardId: 'board-alpha',
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
      target: {
        boardId: 'board-beta',
      },
    });

    expect(
      events.filter(
        (event) =>
          event.actorId === 'player-1' &&
          (event.type === GameEventType.PhysicalAttackDeclared ||
            event.type === GameEventType.PhysicalAttackResolved),
      ),
    ).toEqual([]);
  });

  it('does not automatically select charge against targets making displacement attacks', () => {
    const { events } = runAutomaticPhase({
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
      target: {
        isMakingDisplacementAttack: true,
      },
    });

    const declared = events.find(
      (event) =>
        event.type === GameEventType.PhysicalAttackDeclared &&
        (event.payload as IPhysicalAttackDeclaredPayload).attackerId ===
          'player-1',
    )?.payload as IPhysicalAttackDeclaredPayload | undefined;

    expect(declared).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'kick',
    });
  });

  it.each([
    ['hatchet', 4, 13],
    ['sword', 3, 8],
    ['mace', 6, 17],
    ['lance', 6, 13],
  ] satisfies Array<[PhysicalAttackType, number, number]>)(
    'honors supported melee weapon %s through runner resolution',
    (attackType, toHitNumber, damage) => {
      expect(SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES).toContain(attackType);

      const { events } = runPhase(attackType);
      const declared = events.find(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      );
      const resolved = resolvedPayload(events);

      expect(declared?.payload).toMatchObject({
        attackerId: 'player-1',
        targetId: 'opponent-1',
        attackType,
      });
      expect(resolved).toMatchObject({
        attackerId: 'player-1',
        targetId: 'opponent-1',
        attackType,
        roll: 8,
        toHitNumber,
        hit: true,
        damage,
      });
      expect(damageEventsFor(events, 'opponent-1')).toHaveLength(1);
    },
  );

  it('applies charge target clusters, attacker self-damage, and both PSRs', () => {
    const { events, result } = runPhase('charge', {
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'charge',
      roll: 8,
      toHitNumber: 7,
      hit: true,
      damage: 28,
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(6);
    expect(damageEventsFor(events, 'player-1').length).toBeGreaterThan(0);
    expectPendingPSR(result, 'opponent-1', PSRTrigger.Charged);
    expectPendingPSR(result, 'player-1', PSRTrigger.Charged);
  });

  it('applies source-backed charge displacement after a successful charge', () => {
    const { events, result } = runPhase('charge', {
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
      grid: createPhysicalGrid(),
    });

    expect(resolvedPayload(events).displacements).toEqual([
      {
        unitId: 'opponent-1',
        from: { q: 1, r: 0 },
        to: { q: 1, r: 1 },
        reason: 'charge',
      },
      {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'charge',
      },
    ]);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 1 });
    expect(result.units['player-1'].position).toEqual({ q: 1, r: 0 });
  });

  it('queues charge-miss PSR without damaging the target', () => {
    const { events, result } = runPhase('charge', {
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
        piloting: 12,
      },
      grid: createPhysicalGrid(),
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'charge',
      roll: 8,
      toHitNumber: 14,
      hit: false,
    });
    expect(resolvedPayload(events).displacements).toEqual([
      {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: -1, r: 1 },
        reason: 'charge_miss',
      },
    ]);
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expectPendingPSR(result, 'player-1', PSRTrigger.ChargeMiss);
    expect(result.units['player-1'].position).toEqual({ q: -1, r: 1 });
    expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  });

  it('applies DFA target clusters, attacker leg damage, and both PSRs', () => {
    const { events, initialState, result } = runPhase('dfa', {
      attacker: {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
      },
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'dfa',
      roll: 8,
      toHitNumber: 5,
      hit: true,
      damage: 21,
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(5);
    expect(
      damageEventsFor(events, 'player-1').map((payload) => payload.location),
    ).toEqual(expect.arrayContaining(['left_leg', 'right_leg']));
    expect(result.units['player-1'].armor.left_leg).toBeLessThan(
      initialState.units['player-1'].armor.left_leg ?? 0,
    );
    expect(result.units['player-1'].armor.right_leg).toBeLessThan(
      initialState.units['player-1'].armor.right_leg ?? 0,
    );
    expectPendingPSR(result, 'opponent-1', PSRTrigger.DFATarget);
    expectPendingPSR(result, 'player-1', PSRTrigger.DFATarget);
  });

  it('applies source-backed DFA hit displacement', () => {
    const { events, result } = runPhase('dfa', {
      attacker: {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
      },
      grid: createPhysicalGrid(),
    });

    expect(resolvedPayload(events).displacements).toEqual([
      {
        unitId: 'opponent-1',
        from: { q: 1, r: 0 },
        to: { q: 1, r: 1 },
        reason: 'dfa',
      },
      {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'dfa',
      },
    ]);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 1 });
    expect(result.units['player-1'].position).toEqual({ q: 1, r: 0 });
  });

  it('applies source-backed DFA miss target displacement and attacker fall-in', () => {
    const { events, result } = runPhase('dfa', {
      attacker: {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
        piloting: 12,
      },
      grid: createPhysicalGrid(),
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'dfa',
      roll: 8,
      toHitNumber: 12,
      hit: false,
    });
    expect(resolvedPayload(events).displacements).toEqual([
      {
        unitId: 'opponent-1',
        from: { q: 1, r: 0 },
        to: { q: 1, r: 1 },
        reason: 'dfa_miss',
      },
      {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'dfa_miss',
      },
    ]);
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
    expectPendingPSR(result, 'player-1', PSRTrigger.DFAMiss);
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 1 });
    expect(result.units['player-1'].position).toEqual({ q: 1, r: 0 });
  });
});
