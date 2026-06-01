/* eslint-disable max-lines -- Runner behavior fixtures need complete unit/grid state to prove modifier integration without shared mutable test data. */
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
import { SPA_COMBAT_SUPPORT } from '../CombatFeatureSupport';
import { PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT } from '../CombatPilotModifierApplicationSupport';
import {
  RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
} from '../CombatRuleSupport';
import { runAttackPhase } from '../phases/weaponAttack';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';

const MEDIUM_LASER_ID = 'medium-laser-test';
const LRM_ID = 'lrm-10-test';
const BASE_ARMOR = {
  head: 9,
  center_torso: 47,
  left_torso: 32,
  right_torso: 32,
  left_arm: 34,
  right_arm: 34,
  left_leg: 41,
  right_leg: 41,
};
const BASE_STRUCTURE = {
  head: 3,
  center_torso: 31,
  left_torso: 21,
  right_torso: 21,
  left_arm: 17,
  right_arm: 17,
  left_leg: 21,
  right_leg: 21,
};

class DeclaresWeaponAttackAI implements IAIPlayer {
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

function createLrm(): IWeapon {
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

function createMediumLaser(id = MEDIUM_LASER_ID): IWeapon {
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

function createUnit(options: {
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

function createHex(q: number, r: number, terrain: string) {
  return { coord: { q, r }, occupantId: null, terrain, elevation: 0 };
}

function createGrid(
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

function createWeaponAttackState(options?: {
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

function runModifierScenario(options?: {
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

function attackDeclaredPayload(
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

function attackDeclaredPayloads(
  events: readonly IGameEvent[],
): IAttackDeclaredPayload[] {
  return events
    .filter((candidate) => candidate.type === GameEventType.AttackDeclared)
    .map((event) => event.payload as IAttackDeclaredPayload);
}

function expectModifier(
  payload: IAttackDeclaredPayload,
  expected: { name: string; value: number; source: string },
): void {
  expect(payload.modifiers).toContainEqual(expect.objectContaining(expected));
}

describe('runAttackPhase to-hit modifier integration', () => {
  it('threads attacker gunnery, movement, and heat into AttackDeclared', () => {
    const events = runModifierScenario({
      state: createWeaponAttackState({
        attacker: {
          gunnery: 3,
          movementThisTurn: MovementType.Run,
          heat: 8,
        },
      }),
    });

    expect(
      events.some((event) => event.type === GameEventType.AttackInvalid),
    ).toBe(false);

    const payload = attackDeclaredPayload(events);
    expect(payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weapons: [MEDIUM_LASER_ID],
      range: 'short',
      toHitNumber: 6,
    });
    expectModifier(payload, {
      name: 'Gunnery Skill',
      value: 3,
      source: 'base',
    });
    expectModifier(payload, {
      name: 'Attacker Movement',
      value: 2,
      source: 'attacker_movement',
    });
    expectModifier(payload, { name: 'Heat', value: 1, source: 'heat' });
  });

  it('applies Some Like It Hot heat to-hit relief in AttackDeclared', () => {
    const events = runModifierScenario({
      state: createWeaponAttackState({
        attacker: {
          heat: 17,
          abilities: ['some-like-it-hot'],
        },
      }),
    });

    const payload = attackDeclaredPayload(events);

    expect(payload.toHitNumber).toBe(6);
    expectModifier(payload, { name: 'Heat', value: 2, source: 'heat' });
    expect(SPA_COMBAT_SUPPORT['some-like-it-hot']).toMatchObject({
      level: 'integrated',
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['heat-application'],
    ).toMatchObject({ level: 'helper-only' });
  });

  it('threads target movement, prone, shutdown, partial cover, and target terrain into AttackDeclared', () => {
    const events = runModifierScenario({
      state: createWeaponAttackState({
        target: {
          movementThisTurn: MovementType.Jump,
          hexesMovedThisTurn: 5,
          prone: true,
          shutdown: true,
        },
      }),
      grid: createGrid(TerrainType.LightWoods),
    });

    expect(
      events.some((event) => event.type === GameEventType.AttackInvalid),
    ).toBe(false);

    const payload = attackDeclaredPayload(events);
    expect(payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weapons: [MEDIUM_LASER_ID],
      range: 'short',
      toHitNumber: 6,
    });
    expectModifier(payload, {
      name: 'Target Movement (TMM)',
      value: 3,
      source: 'target_movement',
    });
    expectModifier(payload, {
      name: 'Target Prone',
      value: 1,
      source: 'other',
    });
    expectModifier(payload, {
      name: 'Target Immobile',
      value: -4,
      source: 'other',
    });
    expectModifier(payload, {
      name: 'Partial Cover',
      value: 1,
      source: 'terrain',
    });
    expectModifier(payload, {
      name: 'Target Terrain',
      value: 1,
      source: 'terrain',
    });
  });

  it('threads explicit target hull-down state into AttackDeclared', () => {
    const events = runModifierScenario({
      state: createWeaponAttackState({
        target: {
          hullDown: true,
        },
      }),
    });

    const payload = attackDeclaredPayload(events);

    expect(payload.toHitNumber).toBe(6);
    expectModifier(payload, {
      name: 'Hull-Down',
      value: 2,
      source: 'terrain',
    });
    expect(payload.modifiers).not.toContainEqual(
      expect.objectContaining({ name: 'Partial Cover' }),
    );
    expect(RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['hull-down']).toMatchObject({
      level: 'integrated',
    });
  });

  it('threads explicit target evasion state into AttackDeclared', () => {
    const events = runModifierScenario({
      state: createWeaponAttackState({
        target: {
          isEvading: true,
        },
      }),
    });

    const payload = attackDeclaredPayload(events);

    expect(payload.toHitNumber).toBe(5);
    expectModifier(payload, {
      name: 'Target Evasion',
      value: 1,
      source: 'target_movement',
    });
    expect(
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['target-evasion'],
    ).toMatchObject({ level: 'integrated' });
  });

  it('threads explicit Skilled Evasion target bonuses into AttackDeclared', () => {
    const events = runModifierScenario({
      state: createWeaponAttackState({
        target: {
          isEvading: true,
          evasionBonus: 3,
        },
      }),
    });

    const payload = attackDeclaredPayload(events);

    expect(payload.toHitNumber).toBe(7);
    expectModifier(payload, {
      name: 'Target Evasion',
      value: 3,
      source: 'target_movement',
    });
  });

  it('threads explicit target sprinted state into AttackDeclared', () => {
    const events = runModifierScenario({
      state: createWeaponAttackState({
        target: {
          sprintedThisTurn: true,
        },
      }),
    });

    const payload = attackDeclaredPayload(events);

    expect(payload.toHitNumber).toBe(3);
    expectModifier(payload, {
      name: 'Target Sprinted',
      value: -1,
      source: 'target_movement',
    });
    expect(
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['target-movement'],
    ).toMatchObject({ level: 'integrated' });
  });

  it('threads wounds, sensor hits, actuator damage, and attacker prone into AttackDeclared', () => {
    const events = runModifierScenario({
      state: createWeaponAttackState({
        attacker: {
          pilotWounds: 1,
          prone: true,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            sensorHits: 1,
            actuators: { [ActuatorType.UPPER_ARM]: true },
          },
        },
      }),
    });

    expect(
      events.some((event) => event.type === GameEventType.AttackInvalid),
    ).toBe(false);

    const payload = attackDeclaredPayload(events);
    expect(payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weapons: [MEDIUM_LASER_ID],
      range: 'short',
      toHitNumber: 9,
    });
    expectModifier(payload, {
      name: 'Pilot Wounds',
      value: 1,
      source: 'other',
    });
    expectModifier(payload, {
      name: 'Sensor Damage',
      value: 1,
      source: 'damage',
    });
    expectModifier(payload, {
      name: 'Actuator Damage',
      value: 1,
      source: 'damage',
    });
    expectModifier(payload, {
      name: 'Attacker Prone',
      value: 2,
      source: 'other',
    });
    expect(RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['pilot-wounds']).toMatchObject(
      { level: 'integrated' },
    );
    expect(
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['sensor-damage'],
    ).toMatchObject({ level: 'integrated' });
    expect(
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['actuator-damage'],
    ).toMatchObject({ level: 'integrated' });
    expect(
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['attacker-prone'],
    ).toMatchObject({ level: 'integrated' });
  });

  it('threads non-blocking intervening terrain features into AttackDeclared', () => {
    const clearEvents = runModifierScenario();
    const terrainEvents = runModifierScenario({
      grid: createGrid(TerrainType.Clear, [
        { q: 1, r: 0, terrain: TerrainType.LightWoods },
        { q: 2, r: 0, terrain: TerrainType.Smoke },
      ]),
    });

    expect(
      terrainEvents.some((event) => event.type === GameEventType.AttackInvalid),
    ).toBe(false);

    const clearPayload = attackDeclaredPayload(clearEvents);
    const terrainPayload = attackDeclaredPayload(terrainEvents);
    const helperTerrainModifier = getTerrainToHitModifier(
      [],
      [
        [{ type: TerrainType.LightWoods, level: 1 }],
        [{ type: TerrainType.Smoke, level: 1 }],
      ],
    );

    expect(helperTerrainModifier).toBe(2);
    expect(clearPayload.toHitNumber).toBe(4);
    expect(terrainPayload.toHitNumber).toBe(
      clearPayload.toHitNumber + helperTerrainModifier,
    );
    expectModifier(terrainPayload, {
      name: 'Intervening Terrain',
      value: helperTerrainModifier,
      source: 'terrain',
    });
    expect(
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['terrain-features'],
    ).toMatchObject({
      level: 'integrated',
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['terrain-to-hit-features'],
    ).toMatchObject({
      level: 'integrated',
    });
  });

  it('threads explicit C3 network state into AttackDeclared range math', () => {
    const network = createC3MasterSlaveNetwork('runner-c3', [
      createC3Unit({
        entityId: 'player-1',
        teamId: GameSide.Player,
        role: 'master',
        position: { q: 0, r: 0 },
      }),
      createC3Unit({
        entityId: 'spotter-1',
        teamId: GameSide.Player,
        role: 'slave',
        position: { q: 5, r: 0 },
      }),
    ]);
    const state = createWeaponAttackState({
      attacker: { position: { q: 5, r: 0 } },
      target: { position: { q: 0, r: 0 } },
    });

    expect(network).not.toBeNull();

    const c3State: IGameState = {
      ...state,
      c3Network: addC3Network(createEmptyC3State(), network!),
      units: {
        ...state.units,
        'spotter-1': createUnit({
          id: 'spotter-1',
          side: GameSide.Player,
          position: { q: 2, r: 0 },
        }),
      },
    };

    const payload = attackDeclaredPayload(
      runModifierScenario({ state: c3State }),
    );

    expect(payload).toMatchObject({
      range: 'medium',
      toHitNumber: 4,
    });
    expectModifier(payload, {
      name: 'Range (short)',
      value: 0,
      source: 'range',
    });
    expectModifier(payload, {
      name: 'C3 Network',
      value: 0,
      source: 'equipment',
    });
    expect(RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT.c3).toMatchObject({
      level: 'integrated',
    });
  });

  it('does not require C3 spotter line of sight for default range sharing', () => {
    const network = createC3MasterSlaveNetwork('runner-c3-no-los', [
      createC3Unit({
        entityId: 'player-1',
        teamId: GameSide.Player,
        role: 'master',
        position: { q: 5, r: 0 },
      }),
      createC3Unit({
        entityId: 'spotter-1',
        teamId: GameSide.Player,
        role: 'slave',
        position: { q: 2, r: 1 },
      }),
    ]);
    const state = createWeaponAttackState({
      attacker: { position: { q: 5, r: 0 } },
      target: { position: { q: 0, r: 0 } },
    });
    const grid = createGrid(TerrainType.Clear, [
      {
        q: 1,
        r: 1,
        terrain: JSON.stringify([
          { type: TerrainType.HeavyWoods, level: 1 },
          { type: TerrainType.LightWoods, level: 1 },
        ]),
      },
    ]);

    expect(network).not.toBeNull();
    expect(
      calculateLOS(state.units['player-1'].position, { q: 0, r: 0 }, grid)
        .hasLOS,
    ).toBe(true);
    expect(calculateLOS({ q: 2, r: 1 }, { q: 0, r: 0 }, grid).hasLOS).toBe(
      false,
    );

    const c3State: IGameState = {
      ...state,
      c3Network: addC3Network(createEmptyC3State(), network!),
      units: {
        ...state.units,
        'spotter-1': createUnit({
          id: 'spotter-1',
          side: GameSide.Player,
          position: { q: 2, r: 1 },
        }),
      },
    };

    const events = runModifierScenario({ state: c3State, grid });

    expect(
      events.some((event) => event.type === GameEventType.AttackInvalid),
    ).toBe(false);

    const payload = attackDeclaredPayload(events);
    expect(payload).toMatchObject({
      range: 'medium',
      toHitNumber: 4,
    });
    expectModifier(payload, {
      name: 'Range (short)',
      value: 0,
      source: 'range',
    });
    expectModifier(payload, {
      name: 'C3 Network',
      value: 0,
      source: 'equipment',
    });
  });

  it('requires C3 spotter line of sight when PLAYTEST_3 is enabled', () => {
    const network = createC3MasterSlaveNetwork('runner-c3-playtest3-los', [
      createC3Unit({
        entityId: 'player-1',
        teamId: GameSide.Player,
        role: 'master',
        position: { q: 5, r: 0 },
      }),
      createC3Unit({
        entityId: 'spotter-1',
        teamId: GameSide.Player,
        role: 'slave',
        position: { q: 2, r: 1 },
      }),
    ]);
    const state = createWeaponAttackState({
      attacker: { position: { q: 5, r: 0 } },
      target: { position: { q: 0, r: 0 } },
    });
    const grid = createGrid(TerrainType.Clear, [
      {
        q: 1,
        r: 1,
        terrain: JSON.stringify([
          { type: TerrainType.HeavyWoods, level: 1 },
          { type: TerrainType.LightWoods, level: 1 },
        ]),
      },
    ]);

    expect(network).not.toBeNull();
    expect(
      calculateLOS(state.units['player-1'].position, { q: 0, r: 0 }, grid)
        .hasLOS,
    ).toBe(true);
    expect(calculateLOS({ q: 2, r: 1 }, { q: 0, r: 0 }, grid).hasLOS).toBe(
      false,
    );

    const c3State: IGameState = {
      ...state,
      c3Network: addC3Network(createEmptyC3State(), network!),
      units: {
        ...state.units,
        'spotter-1': createUnit({
          id: 'spotter-1',
          side: GameSide.Player,
          position: { q: 2, r: 1 },
        }),
      },
    };

    const payload = attackDeclaredPayload(
      runModifierScenario({
        state: c3State,
        grid,
        optionalRules: ['PLAYTEST_3'],
      }),
    );

    expect(payload).toMatchObject({
      range: 'medium',
      toHitNumber: 6,
    });
    expectModifier(payload, {
      name: 'Range (medium)',
      value: 2,
      source: 'range',
    });
    expect(payload.modifiers).not.toContainEqual(
      expect.objectContaining({ name: 'C3 Network' }),
    );
  });

  it('keeps C3 range sharing under PLAYTEST_3 when the spotter has line of sight', () => {
    const network = createC3MasterSlaveNetwork('runner-c3-playtest3-clear', [
      createC3Unit({
        entityId: 'player-1',
        teamId: GameSide.Player,
        role: 'master',
        position: { q: 5, r: 0 },
      }),
      createC3Unit({
        entityId: 'spotter-1',
        teamId: GameSide.Player,
        role: 'slave',
        position: { q: 2, r: 0 },
      }),
    ]);
    const state = createWeaponAttackState({
      attacker: { position: { q: 5, r: 0 } },
      target: { position: { q: 0, r: 0 } },
    });

    expect(network).not.toBeNull();

    const c3State: IGameState = {
      ...state,
      c3Network: addC3Network(createEmptyC3State(), network!),
      units: {
        ...state.units,
        'spotter-1': createUnit({
          id: 'spotter-1',
          side: GameSide.Player,
          position: { q: 2, r: 0 },
        }),
      },
    };

    const payload = attackDeclaredPayload(
      runModifierScenario({
        state: c3State,
        optionalRules: ['PLAYTEST_3'],
      }),
    );

    expect(payload).toMatchObject({
      range: 'medium',
      toHitNumber: 4,
    });
    expectModifier(payload, {
      name: 'Range (short)',
      value: 0,
      source: 'range',
    });
    expectModifier(payload, {
      name: 'C3 Network',
      value: 0,
      source: 'equipment',
    });
  });

  it('hydrates iNARC ECM pod disruption before runner C3 range math', () => {
    const network = createC3MasterSlaveNetwork('runner-c3-ecm', [
      createC3Unit({
        entityId: 'player-1',
        teamId: GameSide.Player,
        role: 'master',
        position: { q: 5, r: 0 },
      }),
      createC3Unit({
        entityId: 'spotter-1',
        teamId: GameSide.Player,
        role: 'slave',
        position: { q: 2, r: 0 },
      }),
    ]);
    const state = createWeaponAttackState({
      attacker: {
        position: { q: 5, r: 0 },
        iNarcPods: [{ teamId: GameSide.Opponent, podType: 'ecm' }],
      },
      target: { position: { q: 0, r: 0 } },
    });

    expect(network).not.toBeNull();

    const c3State: IGameState = {
      ...state,
      c3Network: addC3Network(createEmptyC3State(), network!),
      units: {
        ...state.units,
        'spotter-1': createUnit({
          id: 'spotter-1',
          side: GameSide.Player,
          position: { q: 2, r: 0 },
        }),
      },
    };

    const payload = attackDeclaredPayload(
      runModifierScenario({ state: c3State }),
    );

    expect(payload).toMatchObject({
      range: 'medium',
      toHitNumber: 6,
    });
    expectModifier(payload, {
      name: 'Range (medium)',
      value: 2,
      source: 'range',
    });
    expect(payload.modifiers).not.toContainEqual(
      expect.objectContaining({ name: 'C3 Network' }),
    );
  });

  it('does not add a generic ECM to-hit penalty for Artemis guidance', () => {
    const baseState = createWeaponAttackState();
    const state: IGameState = {
      ...baseState,
      electronicWarfare: {
        ecmSuites: [
          {
            type: 'guardian',
            mode: 'ecm',
            operational: true,
            entityId: 'opponent-ecm-suite',
            teamId: GameSide.Opponent,
            position: baseState.units['opponent-1'].position,
          },
        ],
        activeProbes: [],
      },
    };

    const payload = attackDeclaredPayload(
      runModifierScenario({
        state,
        weapon: { ...createLrm(), hasArtemisIV: true },
      }),
    );

    expect(payload.toHitNumber).toBe(4);
    expect(payload.modifiers).not.toContainEqual(
      expect.objectContaining({ name: expect.stringContaining('ECM') }),
    );
  });

  it('does not add a generic ECM to-hit penalty for NARC guidance', () => {
    const baseState = createWeaponAttackState({
      target: { narcedBy: [GameSide.Player] },
    });
    const state: IGameState = {
      ...baseState,
      electronicWarfare: {
        ecmSuites: [
          {
            type: 'guardian',
            mode: 'ecm',
            operational: true,
            entityId: 'opponent-ecm-suite',
            teamId: GameSide.Opponent,
            position: baseState.units['opponent-1'].position,
          },
        ],
        activeProbes: [],
      },
    };

    const payload = attackDeclaredPayload(
      runModifierScenario({ state, weapon: createLrm() }),
    );

    expect(payload.toHitNumber).toBe(4);
    expect(payload.modifiers).not.toContainEqual(
      expect.objectContaining({ name: expect.stringContaining('ECM') }),
    );
  });

  it('does not add runner ECM to-hit modifiers for unguided weapon attacks', () => {
    const baseState = createWeaponAttackState();
    const state: IGameState = {
      ...baseState,
      electronicWarfare: {
        ecmSuites: [
          {
            type: 'guardian',
            mode: 'ecm',
            operational: true,
            entityId: 'opponent-ecm-suite',
            teamId: GameSide.Opponent,
            position: baseState.units['opponent-1'].position,
          },
        ],
        activeProbes: [],
      },
    };

    const payload = attackDeclaredPayload(runModifierScenario({ state }));

    expect(payload.toHitNumber).toBe(4);
    expect(payload.modifiers).not.toContainEqual(
      expect.objectContaining({ name: expect.stringContaining('ECM') }),
    );
  });

  it('refreshes C3 member lifecycle state before runner range math', () => {
    const network = createC3MasterSlaveNetwork('runner-c3-lifecycle', [
      createC3Unit({
        entityId: 'master-1',
        teamId: GameSide.Player,
        role: 'master',
        position: { q: 5, r: 0 },
      }),
      createC3Unit({
        entityId: 'player-1',
        teamId: GameSide.Player,
        role: 'slave',
        position: { q: 5, r: 0 },
      }),
      createC3Unit({
        entityId: 'spotter-1',
        teamId: GameSide.Player,
        role: 'slave',
        position: { q: 2, r: 0 },
      }),
    ]);
    const state = createWeaponAttackState({
      attacker: { position: { q: 5, r: 0 } },
      target: { position: { q: 0, r: 0 } },
    });

    expect(network).not.toBeNull();

    const c3State: IGameState = {
      ...state,
      c3Network: addC3Network(createEmptyC3State(), network!),
      units: {
        ...state.units,
        'master-1': createUnit({
          id: 'master-1',
          side: GameSide.Player,
          position: { q: 5, r: 0 },
          overrides: { destroyed: true },
        }),
        'spotter-1': createUnit({
          id: 'spotter-1',
          side: GameSide.Player,
          position: { q: 2, r: 0 },
        }),
      },
    };

    const payload = attackDeclaredPayload(
      runModifierScenario({ state: c3State }),
    );

    expect(payload).toMatchObject({
      range: 'medium',
      toHitNumber: 6,
    });
    expectModifier(payload, {
      name: 'Range (medium)',
      value: 2,
      source: 'range',
    });
    expect(payload.modifiers).not.toContainEqual(
      expect.objectContaining({ name: 'C3 Network' }),
    );
  });

  it('suppresses C3 range sharing when mounted C3 equipment is critically destroyed', () => {
    const network = createC3MasterSlaveNetwork('runner-c3-damaged-equipment', [
      createC3Unit({
        entityId: 'player-1',
        teamId: GameSide.Player,
        role: 'master',
        position: { q: 5, r: 0 },
      }),
      createC3Unit({
        entityId: 'spotter-1',
        teamId: GameSide.Player,
        role: 'slave',
        position: { q: 2, r: 0 },
      }),
    ]);
    const state = createWeaponAttackState({
      attacker: {
        position: { q: 5, r: 0 },
        c3Equipment: [
          {
            role: 'master',
            sourceEquipmentId: 'C3 Master Computer',
            sourceLocation: 'CENTER_TORSO',
          },
        ],
      },
      target: { position: { q: 0, r: 0 } },
    });

    expect(network).not.toBeNull();

    const c3State: IGameState = {
      ...state,
      c3Network: addC3Network(createEmptyC3State(), network!),
      units: {
        ...state.units,
        'spotter-1': createUnit({
          id: 'spotter-1',
          side: GameSide.Player,
          position: { q: 2, r: 0 },
        }),
      },
    };
    const manifestsByUnit = new Map<string, CriticalSlotManifest>([
      [
        'player-1',
        {
          center_torso: [
            {
              slotIndex: 0,
              componentType: 'equipment',
              componentName: 'C3 Master Computer',
              destroyed: true,
            },
          ],
        },
      ],
    ]);

    const payload = attackDeclaredPayload(
      runModifierScenario({ state: c3State, manifestsByUnit }),
    );

    expect(payload).toMatchObject({
      range: 'medium',
      toHitNumber: 6,
    });
    expectModifier(payload, {
      name: 'Range (medium)',
      value: 2,
      source: 'range',
    });
    expect(payload.modifiers).not.toContainEqual(
      expect.objectContaining({ name: 'C3 Network' }),
    );
  });

  it('threads target-hex terrain modifiers into AttackDeclared', () => {
    const clearEvents = runModifierScenario();
    const heavyWoodsEvents = runModifierScenario({
      grid: createGrid(TerrainType.HeavyWoods),
    });
    const waterEvents = runModifierScenario({
      grid: createGrid(TerrainType.Water),
    });
    const smokeEvents = runModifierScenario({
      grid: createGrid(TerrainType.Smoke),
    });

    const clearPayload = attackDeclaredPayload(clearEvents);
    const heavyWoodsPayload = attackDeclaredPayload(heavyWoodsEvents);
    const waterPayload = attackDeclaredPayload(waterEvents);
    const smokePayload = attackDeclaredPayload(smokeEvents);

    expect(clearPayload.toHitNumber).toBe(4);
    expect(heavyWoodsPayload.toHitNumber).toBe(6);
    expectModifier(heavyWoodsPayload, {
      name: 'Target Terrain',
      value: 2,
      source: 'terrain',
    });

    expect(waterPayload.toHitNumber).toBe(4);
    expectModifier(waterPayload, {
      name: 'Partial Cover',
      value: 1,
      source: 'terrain',
    });
    expectModifier(waterPayload, {
      name: 'Target Terrain',
      value: -1,
      source: 'terrain',
    });

    expect(smokePayload.toHitNumber).toBe(6);
    expectModifier(smokePayload, {
      name: 'Partial Cover',
      value: 1,
      source: 'terrain',
    });
    expectModifier(smokePayload, {
      name: 'Target Terrain',
      value: 1,
      source: 'terrain',
    });
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['smoke-to-hit']).toMatchObject({
      level: 'integrated',
    });
  });

  it('threads environmental light, weather, fog, and missile wind into AttackDeclared', () => {
    const environmentalConditions = createEnvironmentalConditions({
      light: 'night',
      precipitation: 'heavy_rain',
      fog: 'heavy_fog',
      blowingSand: true,
      wind: 'strong',
    });
    const laserEvents = runModifierScenario({ environmentalConditions });
    const missileEvents = runModifierScenario({
      environmentalConditions,
      weapon: createLrm(),
    });

    const laserPayload = attackDeclaredPayload(laserEvents);
    const missilePayload = attackDeclaredPayload(missileEvents);

    expect(laserPayload.toHitNumber).toBe(11);
    expectModifier(laserPayload, {
      name: 'Light Conditions',
      value: 2,
      source: 'environmental',
    });
    expectModifier(laserPayload, {
      name: 'Precipitation',
      value: 2,
      source: 'environmental',
    });
    expectModifier(laserPayload, {
      name: 'Fog',
      value: 2,
      source: 'environmental',
    });
    expectModifier(laserPayload, {
      name: 'Blowing Sand',
      value: 1,
      source: 'environmental',
    });
    expect(
      laserPayload.modifiers.some((modifier) =>
        modifier.name.startsWith('Wind'),
      ),
    ).toBe(false);

    expect(missilePayload.toHitNumber).toBe(12);
    expectModifier(missilePayload, {
      name: 'Wind (Missiles)',
      value: 2,
      source: 'environmental',
    });
    expect(
      missilePayload.modifiers.some(
        (modifier) => modifier.name === 'Blowing Sand',
      ),
    ).toBe(false);
    expect(
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['environmental-conditions'],
    ).toMatchObject({ level: 'integrated' });
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.fog).toMatchObject({
      level: 'integrated',
    });
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.night).toMatchObject({
      level: 'integrated',
    });
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.wind).toMatchObject({
      level: 'integrated',
    });
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.dust).toMatchObject({
      level: 'integrated',
    });
  });

  it('threads pilot SPA and quirk to-hit state into AttackDeclared', () => {
    const events = runModifierScenario({
      state: createWeaponAttackState({
        attacker: {
          abilities: ['weapon-specialist'],
          designatedWeaponType: 'Medium Laser',
          unitQuirks: ['improved_targeting_short'],
          weaponQuirks: { [MEDIUM_LASER_ID]: ['accurate'] },
        },
        target: {
          abilities: ['dodge-maneuver'],
          isDodging: true,
          unitQuirks: ['distracting'],
        },
      }),
    });
    const payload = attackDeclaredPayload(events);

    expect(payload.toHitNumber).toBe(3);
    expectModifier(payload, {
      name: 'Weapon Specialist',
      value: -2,
      source: 'spa',
    });
    expectModifier(payload, {
      name: 'Dodge Maneuver',
      value: 2,
      source: 'spa',
    });
    expectModifier(payload, {
      name: 'Improved Targeting',
      value: -1,
      source: 'quirk',
    });
    expectModifier(payload, {
      name: 'Accurate Weapon',
      value: -1,
      source: 'quirk',
    });
    expectModifier(payload, {
      name: 'Distracting',
      value: 1,
      source: 'quirk',
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['ranged-to-hit-state-hydration'],
    ).toMatchObject({
      level: 'integrated',
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['weapon-to-hit-quirk-application'],
    ).toMatchObject({
      level: 'integrated',
    });
  });

  it('applies source-backed Dodge Maneuver only for explicit dodging Mek targets', () => {
    const dodgingMekPayload = attackDeclaredPayload(
      runModifierScenario({
        state: createWeaponAttackState({
          target: {
            unitType: UnitType.BATTLEMECH,
            abilities: ['dodge_maneuver'],
            isDodging: true,
          },
        }),
      }),
    );
    const notDodgingPayload = attackDeclaredPayload(
      runModifierScenario({
        state: createWeaponAttackState({
          target: {
            unitType: UnitType.BATTLEMECH,
            abilities: ['dodge_maneuver'],
            isDodging: false,
          },
        }),
      }),
    );
    const nonMekPayload = attackDeclaredPayload(
      runModifierScenario({
        state: createWeaponAttackState({
          target: {
            unitType: UnitType.VEHICLE,
            abilities: ['dodge_maneuver'],
            isDodging: true,
          },
        }),
      }),
    );

    expect(dodgingMekPayload.toHitNumber).toBe(6);
    expectModifier(dodgingMekPayload, {
      name: 'Dodge Maneuver',
      value: 2,
      source: 'spa',
    });
    expect(notDodgingPayload.toHitNumber).toBe(4);
    expect(nonMekPayload.toHitNumber).toBe(4);
    expect(
      notDodgingPayload.modifiers.some(
        (modifier) => modifier.name === 'Dodge Maneuver',
      ),
    ).toBe(false);
    expect(
      nonMekPayload.modifiers.some(
        (modifier) => modifier.name === 'Dodge Maneuver',
      ),
    ).toBe(false);
  });

  it('applies source-backed Shaky Stick only for ground-to-air attacks', () => {
    const groundToAirPayload = attackDeclaredPayload(
      runModifierScenario({
        state: createWeaponAttackState({
          target: {
            abilities: ['shaky_stick'],
            isAirborne: true,
          },
        }),
      }),
    );
    const airToAirPayload = attackDeclaredPayload(
      runModifierScenario({
        state: createWeaponAttackState({
          attacker: { isAirborne: true },
          target: {
            abilities: ['shaky_stick'],
            isAirborne: true,
          },
        }),
      }),
    );
    const groundedTargetPayload = attackDeclaredPayload(
      runModifierScenario({
        state: createWeaponAttackState({
          target: {
            abilities: ['shaky_stick'],
            isAirborne: false,
          },
        }),
      }),
    );

    expect(groundToAirPayload.toHitNumber).toBe(5);
    expectModifier(groundToAirPayload, {
      name: 'Shaky Stick',
      value: 1,
      source: 'spa',
    });
    expect(airToAirPayload.toHitNumber).toBe(4);
    expect(groundedTargetPayload.toHitNumber).toBe(4);
    expect(
      airToAirPayload.modifiers.some(
        (modifier) => modifier.name === 'Shaky Stick',
      ),
    ).toBe(false);
    expect(
      groundedTargetPayload.modifiers.some(
        (modifier) => modifier.name === 'Shaky Stick',
      ),
    ).toBe(false);
    expect(SPA_COMBAT_SUPPORT.shaky_stick).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('airborne target'),
    });
  });

  it('hydrates target terrain for source-backed Terrain Master defender to-hit variants', () => {
    const forestRangerPayload = attackDeclaredPayload(
      runModifierScenario({
        state: createWeaponAttackState({
          target: {
            abilities: ['tm_forest_ranger'],
            movementThisTurn: MovementType.Walk,
          },
        }),
        grid: createGrid(TerrainType.LightWoods),
      }),
    );
    const swampBeastPayload = attackDeclaredPayload(
      runModifierScenario({
        state: createWeaponAttackState({
          target: {
            abilities: ['tm_swamp_beast'],
            movementThisTurn: MovementType.Run,
          },
        }),
        grid: createGrid(TerrainType.Mud),
      }),
    );
    const wrongMovementPayload = attackDeclaredPayload(
      runModifierScenario({
        state: createWeaponAttackState({
          target: {
            abilities: ['tm_forest_ranger'],
            movementThisTurn: MovementType.Run,
          },
        }),
        grid: createGrid(TerrainType.LightWoods),
      }),
    );

    expect(forestRangerPayload.toHitNumber).toBe(7);
    expectModifier(forestRangerPayload, {
      name: 'Forest Ranger',
      value: 1,
      source: 'spa',
    });
    expectModifier(forestRangerPayload, {
      name: 'Target Terrain',
      value: 1,
      source: 'terrain',
    });
    expect(swampBeastPayload.toHitNumber).toBe(5);
    expectModifier(swampBeastPayload, {
      name: 'Swamp Beast',
      value: 1,
      source: 'spa',
    });
    expect(
      wrongMovementPayload.modifiers.some(
        (modifier) => modifier.name === 'Forest Ranger',
      ),
    ).toBe(false);
    expect(SPA_COMBAT_SUPPORT.tm_forest_ranger).toMatchObject({
      level: 'integrated',
    });
    expect(SPA_COMBAT_SUPPORT.tm_swamp_beast).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('to-hit'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['ranged-to-hit-state-hydration'],
    ).toMatchObject({
      level: 'integrated',
    });
  });

  it('threads per-weapon secondary target state and Multi-Tasker into AttackDeclared', () => {
    const secondaryWeaponId = 'medium-laser-secondary';
    const state = createWeaponAttackState({
      attacker: {
        abilities: ['multi-tasker'],
      },
      target: {
        position: { q: 0, r: 2 },
      },
    });
    const multiTargetState: IGameState = {
      ...state,
      units: {
        ...state.units,
        'opponent-2': createUnit({
          id: 'opponent-2',
          side: GameSide.Opponent,
          position: { q: 3, r: 0 },
        }),
      },
    };
    const events: IGameEvent[] = [];
    const violations: IViolation[] = [];

    runAttackPhase({
      state: multiTargetState,
      botPlayer: new DeclaresWeaponAttackAI(
        MEDIUM_LASER_ID,
        'opponent-1',
        [MEDIUM_LASER_ID, secondaryWeaponId],
        {
          [MEDIUM_LASER_ID]: 'opponent-1',
          [secondaryWeaponId]: 'opponent-2',
        },
      ),
      grid: createGrid(),
      invariantRunner: new InvariantRunner(),
      violations,
      events,
      gameId: multiTargetState.gameId,
      random: new SeededRandom(12345),
      weaponsByUnit: new Map([
        [
          'player-1',
          [
            createMediumLaser(MEDIUM_LASER_ID),
            createMediumLaser(secondaryWeaponId),
          ],
        ],
        ['opponent-1', []],
        ['opponent-2', []],
      ]),
    });

    const payloads = attackDeclaredPayloads(events);
    const primaryPayload = payloads.find(
      (payload) => payload.targetId === 'opponent-1',
    );
    const secondaryPayload = payloads.find(
      (payload) => payload.targetId === 'opponent-2',
    );

    expect(primaryPayload?.modifiers).not.toContainEqual(
      expect.objectContaining({ name: 'Secondary Target' }),
    );
    expect(secondaryPayload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-2',
      weapons: [secondaryWeaponId],
      toHitNumber: 5,
    });
    expectModifier(secondaryPayload!, {
      name: 'Secondary Target',
      value: 2,
      source: 'other',
    });
    expectModifier(secondaryPayload!, {
      name: 'Multi-Tasker',
      value: -1,
      source: 'spa',
    });
    expect(
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['secondary-target'],
    ).toMatchObject({
      level: 'integrated',
    });
    expect(SPA_COMBAT_SUPPORT['multi-tasker']).toMatchObject({
      level: 'integrated',
    });
  });

  it('threads secondary-facing torso twist into secondary target front-arc math', () => {
    const secondaryWeaponId = 'medium-laser-secondary';
    const state = createWeaponAttackState({
      attacker: {
        facing: Facing.North,
        secondaryFacing: Facing.Northeast,
      },
      target: {
        position: { q: 0, r: -2 },
      },
    });
    const multiTargetState: IGameState = {
      ...state,
      units: {
        ...state.units,
        'opponent-2': createUnit({
          id: 'opponent-2',
          side: GameSide.Opponent,
          position: { q: 2, r: -1 },
        }),
      },
    };
    const events: IGameEvent[] = [];
    const violations: IViolation[] = [];

    runAttackPhase({
      state: multiTargetState,
      botPlayer: new DeclaresWeaponAttackAI(
        MEDIUM_LASER_ID,
        'opponent-1',
        [MEDIUM_LASER_ID, secondaryWeaponId],
        {
          [MEDIUM_LASER_ID]: 'opponent-1',
          [secondaryWeaponId]: 'opponent-2',
        },
      ),
      grid: createGrid(),
      invariantRunner: new InvariantRunner(),
      violations,
      events,
      gameId: multiTargetState.gameId,
      random: new SeededRandom(12345),
      weaponsByUnit: new Map([
        [
          'player-1',
          [
            createMediumLaser(MEDIUM_LASER_ID),
            createMediumLaser(secondaryWeaponId),
          ],
        ],
        ['opponent-1', []],
        ['opponent-2', []],
      ]),
    });

    const secondaryPayload = attackDeclaredPayloads(events).find(
      (payload) => payload.targetId === 'opponent-2',
    );

    expect(secondaryPayload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-2',
      weapons: [secondaryWeaponId],
      toHitNumber: 5,
    });
    expectModifier(secondaryPayload!, {
      name: 'Secondary Target',
      value: 1,
      source: 'other',
    });
  });

  it('threads per-weapon called-shot intent into AttackDeclared to-hit math', () => {
    const events: IGameEvent[] = [];
    const violations: IViolation[] = [];
    const state = createWeaponAttackState();

    runAttackPhase({
      state,
      botPlayer: new DeclaresWeaponAttackAI(
        MEDIUM_LASER_ID,
        'opponent-1',
        [MEDIUM_LASER_ID],
        undefined,
        { [MEDIUM_LASER_ID]: true },
      ),
      grid: createGrid(),
      invariantRunner: new InvariantRunner(),
      violations,
      events,
      gameId: state.gameId,
      random: new SeededRandom(12345),
      weaponsByUnit: new Map([
        ['player-1', [createMediumLaser(MEDIUM_LASER_ID)]],
        ['opponent-1', []],
      ]),
    });

    const payload = attackDeclaredPayload(events);

    expect(payload.toHitNumber).toBe(7);
    expectModifier(payload, {
      name: 'Called Shot',
      value: 3,
      source: 'other',
    });
    expect(RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['called-shot']).toMatchObject({
      level: 'integrated',
    });
  });

  it('uses source-backed called-shot penalties without local Marksman reductions', () => {
    const events: IGameEvent[] = [];
    const violations: IViolation[] = [];
    const state = createWeaponAttackState({
      attacker: { abilities: ['marksman', 'sharpshooter'] },
    });

    runAttackPhase({
      state,
      botPlayer: new DeclaresWeaponAttackAI(
        MEDIUM_LASER_ID,
        'opponent-1',
        [MEDIUM_LASER_ID],
        undefined,
        { [MEDIUM_LASER_ID]: true },
      ),
      grid: createGrid(),
      invariantRunner: new InvariantRunner(),
      violations,
      events,
      gameId: state.gameId,
      random: new SeededRandom(12345),
      weaponsByUnit: new Map([
        ['player-1', [createMediumLaser(MEDIUM_LASER_ID)]],
        ['opponent-1', []],
      ]),
    });

    const payload = attackDeclaredPayload(events);
    const calledShotModifier = payload.modifiers.find(
      (modifier) => modifier.name === 'Called Shot',
    );

    expect(payload.toHitNumber).toBe(7);
    expect(calledShotModifier).toMatchObject({
      value: 3,
      source: 'other',
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['called-shot-application'],
    ).toMatchObject({
      level: 'integrated',
    });
  });
});
