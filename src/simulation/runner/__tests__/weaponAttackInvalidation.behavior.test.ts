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
  type IMovementCapability,
  type IHexGrid,
  type IUnitGameState,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
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

const AC20_WEAPON_ID = 'ac-20-test';
const LRM15_WEAPON_ID = 'lrm-15-1';

class DeclaresWeaponAttackAI implements IAIPlayer {
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

function createAC20(): IWeapon {
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

function createLRM15(): IWeapon {
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

function createAmmoBin(options: {
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

function createUnit(
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

function createHex(q: number, r: number, terrain: string = TerrainType.Clear) {
  return { coord: { q, r }, occupantId: null, terrain, elevation: 0 };
}

function createBlockedGrid(): IHexGrid {
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

function createLandToUnderwaterGrid(targetPosition: { q: number; r: number }) {
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

function createWeaponAttackState(targetPosition: {
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

function runInvalidationScenario(options: {
  state: IGameState;
  weapon: IWeapon;
  grid?: IHexGrid;
  targetId?: string;
  declaredWeaponId?: string;
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
  });

  return { result, events };
}

function withAttackerAmmo(
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

function assertNoCombatSideEffects(
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

describe('runAttackPhase invalid attacks', () => {
  it('emits declared range brackets and matching range modifiers for valid weapon attacks', () => {
    const cases: readonly {
      readonly distance: number;
      readonly range: NonNullable<IAttackDeclaredPayload['range']>;
      readonly modifierName: string;
      readonly modifierValue: number;
      readonly toHitNumber: number;
    }[] = [
      {
        distance: 3,
        range: 'short',
        modifierName: 'Range (short)',
        modifierValue: 0,
        toHitNumber: 4,
      },
      {
        distance: 6,
        range: 'medium',
        modifierName: 'Range (medium)',
        modifierValue: 2,
        toHitNumber: 6,
      },
      {
        distance: 9,
        range: 'long',
        modifierName: 'Range (long)',
        modifierValue: 4,
        toHitNumber: 8,
      },
    ];

    for (const testCase of cases) {
      const { events } = runInvalidationScenario({
        state: createWeaponAttackState({ q: testCase.distance, r: 0 }),
        weapon: createAC20(),
      });

      expect(
        events.some((event) => event.type === GameEventType.AttackInvalid),
      ).toBe(false);

      const payload = attackDeclaredPayload(events);
      expect(payload).toMatchObject({
        attackerId: 'player-1',
        targetId: 'opponent-1',
        weapons: [AC20_WEAPON_ID],
        range: testCase.range,
        toHitNumber: testCase.toHitNumber,
      });
      expect(payload.modifiers).toContainEqual(
        expect.objectContaining({
          name: testCase.modifierName,
          value: testCase.modifierValue,
        }),
      );
    }
  });

  it('keeps minimum-range attacks valid while surfacing the to-hit penalty', () => {
    const initialState = createWeaponAttackState({ q: 1, r: 0 });
    const { events, result } = runInvalidationScenario({
      state: initialState,
      weapon: createLRM15(),
    });

    expect(
      events.some((event) => event.type === GameEventType.AttackInvalid),
    ).toBe(false);

    const payload = attackDeclaredPayload(events);
    expect(payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weapons: [LRM15_WEAPON_ID],
      range: 'short',
      toHitNumber: 10,
    });
    expect(payload.modifiers).toContainEqual(
      expect.objectContaining({
        name: 'Minimum Range',
        value: 6,
      }),
    );
    expect(result.units['player-1'].heat).toBeGreaterThanOrEqual(
      initialState.units['player-1'].heat,
    );
  });

  it('emits AttackInvalid for out-of-range declarations without combat side effects', () => {
    const initialState = createWeaponAttackState({ q: 12, r: 0 });
    const { events, result } = runInvalidationScenario({
      state: initialState,
      weapon: createAC20(),
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'OutOfRange',
    });

    assertNoCombatSideEffects(result, initialState);
  });

  it('keeps extreme-range attacks valid when the weapon carries an extreme range', () => {
    const { events } = runInvalidationScenario({
      state: createWeaponAttackState({ q: 12, r: 0 }),
      weapon: { ...createAC20(), extremeRange: 18 },
    });

    expect(
      events.some((event) => event.type === GameEventType.AttackInvalid),
    ).toBe(false);

    const payload = attackDeclaredPayload(events);
    expect(payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weapons: [AC20_WEAPON_ID],
      range: 'extreme',
      toHitNumber: 10,
    });
    expect(payload.modifiers).toContainEqual(
      expect.objectContaining({
        name: 'Range (extreme)',
        value: 6,
      }),
    );
  });

  it('emits AttackInvalid for evading attackers without combat side effects', () => {
    const initialState = createWeaponAttackState({ q: 3, r: 0 });
    const evadingState: IGameState = {
      ...initialState,
      units: {
        ...initialState.units,
        'player-1': {
          ...initialState.units['player-1'],
          isEvading: true,
        },
      },
    };

    const { events, result } = runInvalidationScenario({
      state: evadingState,
      weapon: createAC20(),
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'AttackerEvading',
      details: "Attacker 'player-1' is evading and cannot fire ranged weapons",
    });

    assertNoCombatSideEffects(result, evadingState);
  });

  it('emits AttackInvalid for sprinting attackers without combat side effects', () => {
    const initialState = createWeaponAttackState({ q: 3, r: 0 });
    const sprintingState: IGameState = {
      ...initialState,
      units: {
        ...initialState.units,
        'player-1': {
          ...initialState.units['player-1'],
          sprintedThisTurn: true,
        },
      },
    };

    const { events, result } = runInvalidationScenario({
      state: sprintingState,
      weapon: createAC20(),
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'AttackerSprinted',
      details: "Attacker 'player-1' sprinted and cannot fire ranged weapons",
    });

    assertNoCombatSideEffects(result, sprintingState);
  });

  it('emits AttackInvalid for out-of-ammo declarations without combat side effects', () => {
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 0,
    });
    const stateWithAmmo = withAttackerAmmo(
      createWeaponAttackState({ q: 3, r: 0 }),
      ammoBin,
    );
    const { events, result } = runInvalidationScenario({
      state: stateWithAmmo,
      weapon: createAC20(),
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'OutOfAmmo',
    });

    assertNoCombatSideEffects(result, stateWithAmmo, ammoBin);
  });

  it('emits AttackInvalid for jammed declarations without combat side effects', () => {
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState({ q: 3, r: 0 });
    const stateWithJammedWeapon = withAttackerAmmo(
      {
        ...initialState,
        units: {
          ...initialState.units,
          'player-1': {
            ...initialState.units['player-1'],
            jammedWeapons: [AC20_WEAPON_ID],
          },
        },
      },
      ammoBin,
    );

    const { events, result } = runInvalidationScenario({
      state: stateWithJammedWeapon,
      weapon: createAC20(),
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'WeaponJammed',
    });

    assertNoCombatSideEffects(result, stateWithJammedWeapon, ammoBin);
    expect(result.units['player-1'].jammedWeapons).toEqual([AC20_WEAPON_ID]);
  });

  it('marks critical-destroyed weapon mounts unavailable to bot fire planning', () => {
    const attackerUnit = createUnit('player-1', GameSide.Player, {
      q: 0,
      r: 0,
    });
    const attacker = toAIUnitState(
      {
        ...attackerUnit,
        componentDamage: {
          ...DEFAULT_COMPONENT_DAMAGE,
          weaponsDestroyed: [AC20_WEAPON_ID],
        },
      },
      [createAC20()],
    );
    const target = toAIUnitState(
      createUnit('opponent-1', GameSide.Opponent, { q: 3, r: 0 }),
    );

    expect(attacker.weapons).toEqual([
      expect.objectContaining({ id: AC20_WEAPON_ID, destroyed: true }),
    ]);
    expect(
      new BotPlayer(new SeededRandom(123)).playAttackPhase(attacker, [target]),
    ).toBeNull();
  });

  it('emits AttackInvalid for critical-destroyed weapon declarations without combat side effects', () => {
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState({ q: 3, r: 0 });
    const stateWithDestroyedWeapon = withAttackerAmmo(
      {
        ...initialState,
        units: {
          ...initialState.units,
          'player-1': {
            ...initialState.units['player-1'],
            componentDamage: {
              ...DEFAULT_COMPONENT_DAMAGE,
              weaponsDestroyed: [AC20_WEAPON_ID],
            },
          },
        },
      },
      ammoBin,
    );

    const { events, result } = runInvalidationScenario({
      state: stateWithDestroyedWeapon,
      weapon: createAC20(),
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'WeaponDestroyed',
    });

    assertNoCombatSideEffects(result, stateWithDestroyedWeapon, ammoBin);
  });

  it('emits AttackInvalid for same-hex declarations without combat side effects', () => {
    const initialState = createWeaponAttackState({ q: 0, r: 0 });
    const { events, result } = runInvalidationScenario({
      state: initialState,
      weapon: createAC20(),
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'SameHex',
    });

    assertNoCombatSideEffects(result, initialState);
  });

  it('emits AttackInvalid for hydrated weapon ids missing from the unit weapon map', () => {
    const initialState = createWeaponAttackState({ q: 3, r: 0 });
    const { events, result } = runInvalidationScenario({
      state: initialState,
      weapon: createAC20(),
      declaredWeaponId: 'missing-hydrated-weapon',
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: 'missing-hydrated-weapon',
      reason: 'UnknownWeapon',
    });

    assertNoCombatSideEffects(result, initialState);
  });

  it('emits AttackInvalid for direct-fire no-LOS declarations without combat side effects', () => {
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState({ q: 6, r: 0 });
    const stateWithAmmo = withAttackerAmmo(initialState, ammoBin);
    const grid = createBlockedGrid();

    expect(
      calculateLOS(
        stateWithAmmo.units['player-1'].position,
        stateWithAmmo.units['opponent-1'].position,
        grid,
      ).hasLOS,
    ).toBe(false);

    const { events, result } = runInvalidationScenario({
      state: stateWithAmmo,
      weapon: createAC20(),
      grid,
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'NoLineOfSight',
    });

    assertNoCombatSideEffects(result, stateWithAmmo, ammoBin);
  });

  it('emits AttackInvalid for source-backed land-to-underwater no-LOS declarations without combat side effects', () => {
    const targetPosition = { q: 3, r: 0 };
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState(targetPosition);
    const stateWithAmmo = withAttackerAmmo(initialState, ammoBin);
    const grid = createLandToUnderwaterGrid(targetPosition);

    expect(
      calculateLOS(
        stateWithAmmo.units['player-1'].position,
        stateWithAmmo.units['opponent-1'].position,
        grid,
      ),
    ).toMatchObject({
      hasLOS: false,
      blockedBy: targetPosition,
      blockingTerrain: TerrainType.Water,
    });

    const { events, result } = runInvalidationScenario({
      state: stateWithAmmo,
      weapon: createAC20(),
      grid,
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'NoLineOfSight',
    });

    assertNoCombatSideEffects(result, stateWithAmmo, ammoBin);
  });

  it('emits AttackInvalid for indirect-capable no-LOS declarations without a spotter', () => {
    const ammoBin = createAmmoBin({
      weaponType: 'lrm-15',
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState({ q: 6, r: 0 });
    const stateWithAmmo = withAttackerAmmo(initialState, ammoBin);
    const grid = createBlockedGrid();

    const { events, result } = runInvalidationScenario({
      state: stateWithAmmo,
      weapon: createLRM15(),
      grid,
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: LRM15_WEAPON_ID,
      reason: 'NoLineOfSight',
    });

    assertNoCombatSideEffects(result, stateWithAmmo, ammoBin);
  });

  it('does not elect sprinting or evading spotters for no-LOS indirect declarations', () => {
    const ammoBin = createAmmoBin({
      weaponType: 'lrm-15',
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState({ q: 6, r: 0 });
    const stateWithAmmo = withAttackerAmmo(
      {
        ...initialState,
        units: {
          ...initialState.units,
          'sprinting-spotter': {
            ...createUnit('sprinting-spotter', GameSide.Player, {
              q: 5,
              r: 1,
            }),
            sprintedThisTurn: true,
          },
          'evading-spotter': {
            ...createUnit('evading-spotter', GameSide.Player, {
              q: 5,
              r: -1,
            }),
            isEvading: true,
          },
        },
      },
      ammoBin,
    );
    const grid = createBlockedGrid();

    const { events, result } = runInvalidationScenario({
      state: stateWithAmmo,
      weapon: createLRM15(),
      grid,
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: LRM15_WEAPON_ID,
      reason: 'NoLineOfSight',
    });
    expect(
      String((events[0].payload as IAttackInvalidPayload).details),
    ).toContain(
      'No friendly unit with line of sight to target is available as spotter',
    );

    assertNoCombatSideEffects(result, stateWithAmmo, ammoBin);
  });

  it('emits AttackInvalid for a missing target without combat side effects', () => {
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const stateWithAmmo = withAttackerAmmo(
      createWeaponAttackState({ q: 3, r: 0 }),
      ammoBin,
    );

    const { events, result } = runInvalidationScenario({
      state: stateWithAmmo,
      weapon: createAC20(),
      targetId: 'missing-target',
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'missing-target',
      weaponId: AC20_WEAPON_ID,
      reason: 'InvalidTarget',
    });

    assertNoCombatSideEffects(result, stateWithAmmo, ammoBin);
  });

  it('emits AttackInvalid for a destroyed target without combat side effects', () => {
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState({ q: 3, r: 0 });
    const stateWithAmmo = withAttackerAmmo(
      {
        ...initialState,
        units: {
          ...initialState.units,
          'opponent-1': {
            ...initialState.units['opponent-1'],
            destroyed: true,
          },
        },
      },
      ammoBin,
    );

    const { events, result } = runInvalidationScenario({
      state: stateWithAmmo,
      weapon: createAC20(),
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'InvalidTarget',
    });

    assertNoCombatSideEffects(result, stateWithAmmo, ammoBin);
  });

  it('emits AttackInvalid for a same-side target without combat side effects', () => {
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState({ q: 3, r: 0 });
    const stateWithAmmo = withAttackerAmmo(
      {
        ...initialState,
        units: {
          ...initialState.units,
          'opponent-1': {
            ...initialState.units['opponent-1'],
            side: GameSide.Player,
          },
        },
      },
      ammoBin,
    );

    const { events, result } = runInvalidationScenario({
      state: stateWithAmmo,
      weapon: createAC20(),
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'InvalidTarget',
    });

    assertNoCombatSideEffects(result, stateWithAmmo, ammoBin);
  });

  it('emits AttackInvalid for a retreated target without combat side effects', () => {
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState({ q: 3, r: 0 });
    const stateWithAmmo = withAttackerAmmo(
      {
        ...initialState,
        units: {
          ...initialState.units,
          'opponent-1': {
            ...initialState.units['opponent-1'],
            hasRetreated: true,
          },
        },
      },
      ammoBin,
    );

    const { events, result } = runInvalidationScenario({
      state: stateWithAmmo,
      weapon: createAC20(),
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'InvalidTarget',
    });

    assertNoCombatSideEffects(result, stateWithAmmo, ammoBin);
  });

  it('emits AttackInvalid for an ejected target without combat side effects', () => {
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState({ q: 3, r: 0 });
    const stateWithAmmo = withAttackerAmmo(
      {
        ...initialState,
        units: {
          ...initialState.units,
          'opponent-1': {
            ...initialState.units['opponent-1'],
            hasEjected: true,
          },
        },
      },
      ammoBin,
    );

    const { events, result } = runInvalidationScenario({
      state: stateWithAmmo,
      weapon: createAC20(),
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'InvalidTarget',
      details: "Target 'opponent-1' has ejected",
    });

    assertNoCombatSideEffects(result, stateWithAmmo, ammoBin);
  });
});
