/**
 * Tests for Quick-Sim indirect-fire dispatch (PR-K7).
 *
 * The interactive path + bot AI path both pre-compute indirect-fire
 * resolution via `computeIndirectFireContext` and thread it through
 * `declareAttack` (PR-K4/K5). The Quick-Sim runner uses a PARALLEL
 * pipeline that hand-rolls `AttackDeclared` / `AttackResolved` from
 * `calculateToHit` directly — it does NOT go through `declareAttack`.
 *
 * PR-K7 wires the same dispatch into the Quick-Sim path so mass-scale
 * BV-balance Monte Carlo runs reflect indirect-fire to-hit math.
 *
 * Verifies:
 *   - LRM attacker with NO LOS + friendly spotter with LOS → AttackDeclared
 *     carries 'Indirect fire' modifier AND IndirectFireSpotterSelected event
 *     emitted with basis='los' + spotterId set
 *   - Direct LOS path: clear-grid LRM attacker → no indirect events (LOS
 *     present, direct fire works)
 *   - Backward-compat: no grid → no indirect events emitted
 */

import type { IHex, IHexGrid } from '@/types/gameplay/HexGridInterfaces';
import type {
  IIndirectFireForwardObserverPayload,
  IIndirectFireSpotterSelectedPayload,
} from '@/types/gameplay/IndirectFireInterfaces';
import type { IElectronicWarfareState } from '@/utils/gameplay/electronicWarfare';

import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  IAttackDeclaredPayload,
  IAttackResolvedPayload,
  IGameEvent,
  IGameState,
  IUnitGameState,
  LockState,
  MovementType,
  GameEventType,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import {
  addC3Network,
  createC3MasterSlaveNetwork,
  createC3Unit,
  createEmptyC3State,
} from '@/utils/gameplay/c3Network';

import type { IAIPlayer, IAIUnitState, IAttackEvent } from '../../ai/IAIPlayer';
import type { IWeapon } from '../../ai/types';

import { BotPlayer } from '../../ai/BotPlayer';
import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { IViolation } from '../../invariants/types';
import { SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT } from '../CombatFeatureSupport';
import { SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT } from '../CombatSpecialWeaponSupport';
import { runAttackPhase } from '../phases/weaponAttack';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';

// =============================================================================
// Fixtures
// =============================================================================

function makeLRM15(): IWeapon {
  return {
    id: 'lrm-15-1',
    name: 'LRM-15',
    shortRange: 7,
    mediumRange: 14,
    longRange: 21,
    damage: 9,
    heat: 5,
    minRange: 6,
    ammoPerTon: 8,
    destroyed: false,
  };
}

class SequenceRandom extends SeededRandom {
  private index = 0;

  constructor(private readonly d6Rolls: readonly number[]) {
    super(0);
  }

  override next(): number {
    const die = this.d6Rolls[this.index++] ?? 1;
    return (die - 0.5) / 6;
  }
}

class ScriptedAttackAI implements IAIPlayer {
  constructor(private readonly weaponId: string) {}

  evaluateRetreat() {
    return null;
  }

  playMovementPhase() {
    return null;
  }

  playAttackPhase(attacker: IAIUnitState): IAttackEvent | null {
    if (attacker.unitId !== 'player-1') return null;
    return {
      type: GameEventType.AttackDeclared,
      payload: {
        attackerId: attacker.unitId,
        targetId: 'opponent-1',
        weapons: [this.weaponId],
      },
    };
  }

  playPhysicalAttackPhase() {
    return null;
  }
}

function makeUnit(
  id: string,
  side: GameSide,
  position: { q: number; r: number },
): IUnitGameState {
  return {
    id,
    side,
    position,
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

function makeHex(
  q: number,
  r: number,
  terrain: string = 'clear',
  elevation: number = 0,
): IHex {
  return { coord: { q, r }, occupantId: null, terrain, elevation };
}

function makeBlockedGrid(): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -5; q <= 15; q++) {
    for (let r = -5; r <= 15; r++) {
      hexes.set(`${q},${r}`, makeHex(q, r));
    }
  }
  // Light + heavy woods block LOS from attacker (0,0) -> target (10,0).
  hexes.set('4,0', makeHex(4, 0, TerrainType.LightWoods));
  hexes.set('5,0', makeHex(5, 0, TerrainType.HeavyWoods));
  return { config: { radius: 15 }, hexes };
}

function makeClearGrid(): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -5; q <= 15; q++) {
    for (let r = -5; r <= 15; r++) {
      hexes.set(`${q},${r}`, makeHex(q, r));
    }
  }
  return { config: { radius: 15 }, hexes };
}

function buildScenario(options: {
  includeSpotter: boolean;
  attackerWeapon?: IWeapon;
  attackerOverrides?: Partial<IUnitGameState>;
}): {
  state: IGameState;
  weaponsByUnit: ReadonlyMap<string, readonly IWeapon[]>;
} {
  const attacker = {
    ...makeUnit('player-1', GameSide.Player, { q: 0, r: 0 }),
    ...options.attackerOverrides,
  };
  const target = makeUnit('opponent-1', GameSide.Opponent, { q: 10, r: 0 });
  const units: Record<string, IUnitGameState> = {
    'player-1': attacker,
    'opponent-1': target,
  };
  const weaponsMap = new Map<string, readonly IWeapon[]>([
    ['player-1', [options.attackerWeapon ?? makeLRM15()]],
    ['opponent-1', []],
  ]);
  if (options.includeSpotter) {
    units['player-2'] = makeUnit('player-2', GameSide.Player, { q: 10, r: 1 });
    weaponsMap.set('player-2', []);
  }
  const state: IGameState = {
    gameId: 'test-game',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    activationIndex: 0,
    units,
    turnEvents: [],
  } as unknown as IGameState;
  return { state, weaponsByUnit: weaponsMap };
}

function runPhase(options: {
  state: IGameState;
  weaponsByUnit: ReadonlyMap<string, readonly IWeapon[]>;
  grid?: IHexGrid;
  seed?: number;
  random?: SeededRandom;
  botPlayer?: IAIPlayer;
}): IGameEvent[] {
  const random = options.random ?? new SeededRandom(options.seed ?? 12345);
  const botPlayer = options.botPlayer ?? new BotPlayer(random);
  const invariantRunner = new InvariantRunner();
  const violations: IViolation[] = [];
  const events: IGameEvent[] = [];
  runAttackPhase({
    state: options.state,
    botPlayer,
    grid: options.grid,
    invariantRunner,
    violations,
    events,
    gameId: options.state.gameId,
    random,
    weaponsByUnit: options.weaponsByUnit,
  });
  return events;
}

// =============================================================================
// Tests
// =============================================================================

describe('runAttackPhase — Quick-Sim indirect-fire dispatch (PR-K7)', () => {
  it('POSITIVE: no LOS + spotter → Indirect fire modifier + IndirectFireSpotterSelected event', () => {
    const { state, weaponsByUnit } = buildScenario({ includeSpotter: true });
    const events = runPhase({ state, weaponsByUnit, grid: makeBlockedGrid() });

    const declared = events.find(
      (e) =>
        e.type === GameEventType.AttackDeclared &&
        (e.payload as IAttackDeclaredPayload).attackerId === 'player-1',
    );
    expect(declared).toBeDefined();
    const declaredPayload = declared!.payload as IAttackDeclaredPayload;
    const indirectMod = declaredPayload.modifiers.find(
      (m) => m.name === 'Indirect fire',
    );
    expect(indirectMod).toBeDefined();
    expect(indirectMod!.value).toBeGreaterThanOrEqual(1);

    const spotterEvent = events.find(
      (e) => e.type === GameEventType.IndirectFireSpotterSelected,
    );
    expect(spotterEvent).toBeDefined();
    const spotterPayload = spotterEvent!
      .payload as IIndirectFireSpotterSelectedPayload;
    expect(spotterPayload.attackerId).toBe('player-1');
    expect(spotterPayload.spotterId).toBe('player-2');
    expect(spotterPayload.weaponId).toBe('lrm-15-1');
    expect(spotterPayload.basis).toBe('los');
  });

  it('does not apply C3 range sharing to indirect fire', () => {
    const { state, weaponsByUnit } = buildScenario({ includeSpotter: true });
    const network = createC3MasterSlaveNetwork('runner-indirect-c3', [
      createC3Unit({
        entityId: 'player-1',
        teamId: GameSide.Player,
        role: 'master',
        position: { q: 0, r: 0 },
      }),
      createC3Unit({
        entityId: 'player-2',
        teamId: GameSide.Player,
        role: 'slave',
        position: { q: 10, r: 1 },
      }),
    ]);

    expect(network).not.toBeNull();

    const events = runPhase({
      state: {
        ...state,
        c3Network: addC3Network(createEmptyC3State(), network!),
      },
      weaponsByUnit,
      grid: makeBlockedGrid(),
    });
    const declared = events.find(
      (e) =>
        e.type === GameEventType.AttackDeclared &&
        (e.payload as IAttackDeclaredPayload).attackerId === 'player-1',
    );

    expect(declared).toBeDefined();

    const declaredPayload = declared!.payload as IAttackDeclaredPayload;
    expect(declaredPayload.toHitNumber).toBe(7);
    expect(declaredPayload.modifiers).toContainEqual(
      expect.objectContaining({
        name: 'Range (medium)',
        value: 2,
        source: 'range',
      }),
    );
    expect(declaredPayload.modifiers).toContainEqual(
      expect.objectContaining({ name: 'Indirect fire' }),
    );
    expect(declaredPayload.modifiers).not.toContainEqual(
      expect.objectContaining({ name: 'C3 Network' }),
    );
  });

  it('emits Forward Observer event when a walking spotter cancels the walked penalty', () => {
    const { state, weaponsByUnit } = buildScenario({ includeSpotter: true });
    state.units['player-2'] = {
      ...state.units['player-2'],
      movementThisTurn: MovementType.Walk,
      abilities: ['forward_observer'],
    };

    const events = runPhase({ state, weaponsByUnit, grid: makeBlockedGrid() });

    const declared = events.find(
      (e) =>
        e.type === GameEventType.AttackDeclared &&
        (e.payload as IAttackDeclaredPayload).attackerId === 'player-1',
    );
    expect(declared).toBeDefined();
    const declaredPayload = declared!.payload as IAttackDeclaredPayload;
    expect(
      declaredPayload.modifiers.find((m) => m.name === 'Indirect fire'),
    ).toMatchObject({ value: 1 });

    const indirectEvents = events.filter(
      (e) =>
        e.type === GameEventType.IndirectFireSpotterSelected ||
        e.type === GameEventType.IndirectFireForwardObserver,
    );
    expect(indirectEvents.map((e) => e.type)).toEqual([
      GameEventType.IndirectFireSpotterSelected,
      GameEventType.IndirectFireForwardObserver,
    ]);

    const forwardObserverPayload = indirectEvents[1]
      .payload as IIndirectFireForwardObserverPayload;
    expect(forwardObserverPayload).toMatchObject({
      attackerId: 'player-1',
      spotterId: 'player-2',
      weaponId: 'lrm-15-1',
      basis: 'los',
      toHitPenalty: 1,
      penaltyCancelled: 1,
    });
  });

  it('applies Comm Implant spotter relief to runner indirect-fire penalty math', () => {
    const { state, weaponsByUnit } = buildScenario({ includeSpotter: true });
    state.units['player-2'] = {
      ...state.units['player-2'],
      movementThisTurn: MovementType.Walk,
      abilities: ['comm_implant'],
    };

    const events = runPhase({ state, weaponsByUnit, grid: makeBlockedGrid() });

    const declared = events.find(
      (e) =>
        e.type === GameEventType.AttackDeclared &&
        (e.payload as IAttackDeclaredPayload).attackerId === 'player-1',
    );
    expect(declared).toBeDefined();
    const declaredPayload = declared!.payload as IAttackDeclaredPayload;
    expect(
      declaredPayload.modifiers.find((m) => m.name === 'Indirect fire'),
    ).toMatchObject({ value: 1 });

    const spotterEvent = events.find(
      (e) => e.type === GameEventType.IndirectFireSpotterSelected,
    );
    expect(spotterEvent?.payload).toMatchObject({
      attackerId: 'player-1',
      spotterId: 'player-2',
      weaponId: 'lrm-15-1',
      basis: 'los',
      toHitPenalty: 1,
    });
  });

  it('applies Oblique Attacker to runner indirect-fire penalty math', () => {
    const { state, weaponsByUnit } = buildScenario({ includeSpotter: true });
    state.units['player-1'] = {
      ...state.units['player-1'],
      abilities: ['oblique-attacker'],
    };

    const events = runPhase({ state, weaponsByUnit, grid: makeBlockedGrid() });

    const declared = events.find(
      (e) =>
        e.type === GameEventType.AttackDeclared &&
        (e.payload as IAttackDeclaredPayload).attackerId === 'player-1',
    );
    expect(declared).toBeDefined();
    const declaredPayload = declared!.payload as IAttackDeclaredPayload;
    expect(
      declaredPayload.modifiers.find((m) => m.name === 'Indirect fire'),
    ).toBeUndefined();

    const spotterEvent = events.find(
      (e) => e.type === GameEventType.IndirectFireSpotterSelected,
    );
    expect(spotterEvent?.payload).toMatchObject({
      attackerId: 'player-1',
      spotterId: 'player-2',
      weaponId: 'lrm-15-1',
      basis: 'los',
      toHitPenalty: 0,
    });
  });

  it('BACKWARD-COMPAT: no grid passed → no indirect events emitted', () => {
    const { state, weaponsByUnit } = buildScenario({ includeSpotter: true });
    const events = runPhase({ state, weaponsByUnit });

    const indirectEvents = events.filter(
      (e) =>
        e.type === GameEventType.IndirectFireSpotterSelected ||
        e.type === GameEventType.IndirectFireNarcOverride,
    );
    expect(indirectEvents.length).toBe(0);

    const declared = events.find(
      (e) =>
        e.type === GameEventType.AttackDeclared &&
        (e.payload as IAttackDeclaredPayload).attackerId === 'player-1',
    );
    if (declared) {
      const declaredPayload = declared.payload as IAttackDeclaredPayload;
      const indirectMod = declaredPayload.modifiers.find(
        (m) => m.name === 'Indirect fire',
      );
      expect(indirectMod).toBeUndefined();
    }
  });

  it('DIRECT-LOS PATH: clear grid → no indirect events (LRM uses direct fire)', () => {
    const { state, weaponsByUnit } = buildScenario({ includeSpotter: false });
    const events = runPhase({ state, weaponsByUnit, grid: makeClearGrid() });

    const indirectEvents = events.filter(
      (e) =>
        e.type === GameEventType.IndirectFireSpotterSelected ||
        e.type === GameEventType.IndirectFireNarcOverride,
    );
    expect(indirectEvents.length).toBe(0);

    const declared = events.find(
      (e) =>
        e.type === GameEventType.AttackDeclared &&
        (e.payload as IAttackDeclaredPayload).attackerId === 'player-1',
    );
    if (declared) {
      const declaredPayload = declared.payload as IAttackDeclaredPayload;
      const indirectMod = declaredPayload.modifiers.find(
        (m) => m.name === 'Indirect fire',
      );
      expect(indirectMod).toBeUndefined();
    }
  });

  it('applies indirect-fire to-hit penalty strongly enough to change hit outcome', () => {
    const lrm15: IWeapon = { ...makeLRM15(), damage: 15 };
    const directScenario = buildScenario({
      includeSpotter: false,
      attackerWeapon: lrm15,
      attackerOverrides: { gunnery: 1 },
    });
    const indirectScenario = buildScenario({
      includeSpotter: true,
      attackerWeapon: lrm15,
      attackerOverrides: { gunnery: 1 },
    });

    const directEvents = runPhase({
      ...directScenario,
      grid: makeClearGrid(),
      random: new SequenceRandom([1, 2, 1, 2, 1, 1]),
      botPlayer: new ScriptedAttackAI(lrm15.id),
    });
    const indirectEvents = runPhase({
      ...indirectScenario,
      grid: makeBlockedGrid(),
      random: new SequenceRandom([1, 2]),
      botPlayer: new ScriptedAttackAI(lrm15.id),
    });

    const directResolved = directEvents.find(
      (event) =>
        event.type === GameEventType.AttackResolved &&
        (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
    ) as IGameEvent & { payload: IAttackResolvedPayload };
    const indirectResolved = indirectEvents.find(
      (event) =>
        event.type === GameEventType.AttackResolved &&
        (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
    ) as IGameEvent & { payload: IAttackResolvedPayload };

    expect(directResolved.payload).toMatchObject({
      hit: true,
      roll: 3,
      toHitNumber: 3,
    });
    expect(indirectResolved.payload).toMatchObject({
      hit: false,
      roll: 3,
      toHitNumber: 4,
    });
  });

  it('suppresses Artemis IV cluster bonus during indirect LRM fire', () => {
    const artemisLRM: IWeapon = {
      ...makeLRM15(),
      damage: 15,
      hasArtemisIV: true,
    };
    const directScenario = buildScenario({
      includeSpotter: false,
      attackerWeapon: artemisLRM,
      attackerOverrides: { gunnery: 0 },
    });
    const indirectScenario = buildScenario({
      includeSpotter: true,
      attackerWeapon: artemisLRM,
      attackerOverrides: { gunnery: 0 },
    });

    const directEvents = runPhase({
      ...directScenario,
      grid: makeClearGrid(),
      random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
      botPlayer: new ScriptedAttackAI(artemisLRM.id),
    });
    const indirectEvents = runPhase({
      ...indirectScenario,
      grid: makeBlockedGrid(),
      random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
      botPlayer: new ScriptedAttackAI(artemisLRM.id),
    });

    const directResolved = directEvents.find(
      (event) =>
        event.type === GameEventType.AttackResolved &&
        (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
    ) as IGameEvent & { payload: IAttackResolvedPayload };
    const indirectResolved = indirectEvents.find(
      (event) =>
        event.type === GameEventType.AttackResolved &&
        (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
    ) as IGameEvent & { payload: IAttackResolvedPayload };
    const indirectDeclared = indirectEvents.find(
      (event) =>
        event.type === GameEventType.AttackDeclared &&
        (event.payload as IAttackDeclaredPayload).attackerId === 'player-1',
    );

    expect(directResolved.payload).toMatchObject({
      hit: true,
      projectileCount: 9,
      damage: 9,
      toHitNumber: 2,
    });
    expect(indirectResolved.payload).toMatchObject({
      hit: true,
      projectileCount: 5,
      damage: 5,
      toHitNumber: 3,
    });
    expect(
      (indirectDeclared!.payload as IAttackDeclaredPayload).modifiers.find(
        (modifier) => modifier.name === 'Indirect fire',
      ),
    ).toMatchObject({ value: 1 });
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.artemis.evidence).toContain(
      'indirect-fire suppression',
    );
  });

  it('suppresses Artemis IV cluster bonus when target ECM covers direct fire', () => {
    const artemisLRM: IWeapon = {
      ...makeLRM15(),
      damage: 15,
      hasArtemisIV: true,
    };
    const noEcmScenario = buildScenario({
      includeSpotter: false,
      attackerWeapon: artemisLRM,
      attackerOverrides: { gunnery: 0 },
    });
    const ecmScenario = buildScenario({
      includeSpotter: false,
      attackerWeapon: artemisLRM,
      attackerOverrides: { gunnery: 0 },
    });
    const electronicWarfare: IElectronicWarfareState = {
      ecmSuites: [
        {
          type: 'guardian',
          mode: 'ecm',
          operational: true,
          entityId: 'opponent-ecm',
          teamId: GameSide.Opponent,
          position: { q: 10, r: 0 },
        },
      ],
      activeProbes: [],
    };

    const noEcmEvents = runPhase({
      ...noEcmScenario,
      grid: makeClearGrid(),
      random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
      botPlayer: new ScriptedAttackAI(artemisLRM.id),
    });
    const ecmEvents = runPhase({
      ...ecmScenario,
      state: { ...ecmScenario.state, electronicWarfare },
      grid: makeClearGrid(),
      random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
      botPlayer: new ScriptedAttackAI(artemisLRM.id),
    });

    const noEcmResolved = noEcmEvents.find(
      (event) =>
        event.type === GameEventType.AttackResolved &&
        (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
    ) as IGameEvent & { payload: IAttackResolvedPayload };
    const ecmResolved = ecmEvents.find(
      (event) =>
        event.type === GameEventType.AttackResolved &&
        (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
    ) as IGameEvent & { payload: IAttackResolvedPayload };

    expect(noEcmResolved.payload).toMatchObject({
      hit: true,
      projectileCount: 9,
      damage: 9,
    });
    expect(ecmResolved.payload).toMatchObject({
      hit: true,
      projectileCount: 5,
      damage: 5,
    });
  });

  it.each([
    ['ecm', 5],
    ['eccm', 9],
    ['off', 9],
  ] as const)(
    'uses target ECM suite %s mode when applying Artemis IV suppression',
    (mode, expectedProjectileCount) => {
      const artemisLRM: IWeapon = {
        ...makeLRM15(),
        damage: 15,
        hasArtemisIV: true,
      };
      const scenario = buildScenario({
        includeSpotter: false,
        attackerWeapon: artemisLRM,
        attackerOverrides: { gunnery: 0 },
      });
      const electronicWarfare: IElectronicWarfareState = {
        ecmSuites: [
          {
            type: 'guardian',
            mode,
            operational: true,
            entityId: 'opponent-ecm',
            teamId: GameSide.Opponent,
            position: { q: 10, r: 0 },
          },
        ],
        activeProbes: [],
      };

      const events = runPhase({
        ...scenario,
        state: { ...scenario.state, electronicWarfare },
        grid: makeClearGrid(),
        random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
        botPlayer: new ScriptedAttackAI(artemisLRM.id),
      });

      const resolved = events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };

      expect(resolved.payload).toMatchObject({
        hit: true,
        projectileCount: expectedProjectileCount,
        damage: expectedProjectileCount,
      });
      expect(
        SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-ecm-mode-lifecycle']
          .evidence,
      ).toContain('ECM mode');
    },
  );

  it('allows active probes to counter target ECM before Artemis IV suppression', () => {
    const artemisLRM: IWeapon = {
      ...makeLRM15(),
      damage: 15,
      hasArtemisIV: true,
    };
    const baseScenario = buildScenario({
      includeSpotter: false,
      attackerWeapon: artemisLRM,
      attackerOverrides: { gunnery: 0 },
    });
    const electronicWarfare: IElectronicWarfareState = {
      ecmSuites: [
        {
          type: 'guardian',
          mode: 'ecm',
          operational: true,
          entityId: 'opponent-ecm',
          teamId: GameSide.Opponent,
          position: { q: 4, r: 0 },
        },
      ],
      activeProbes: [
        {
          type: 'beagle',
          operational: true,
          entityId: 'player-1',
          teamId: GameSide.Player,
          position: { q: 0, r: 0 },
        },
      ],
    };

    const events = runPhase({
      ...baseScenario,
      state: { ...baseScenario.state, electronicWarfare },
      grid: makeClearGrid(),
      random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
      botPlayer: new ScriptedAttackAI(artemisLRM.id),
    });

    const resolved = events.find(
      (event) =>
        event.type === GameEventType.AttackResolved &&
        (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
    ) as IGameEvent & { payload: IAttackResolvedPayload };

    expect(resolved.payload).toMatchObject({
      hit: true,
      projectileCount: 9,
      damage: 9,
    });
  });

  it('suppresses Artemis IV cluster bonus while attacker stealth armor is active', () => {
    const artemisLRM: IWeapon = {
      ...makeLRM15(),
      damage: 15,
      hasArtemisIV: true,
    };
    const noStealthScenario = buildScenario({
      includeSpotter: false,
      attackerWeapon: artemisLRM,
      attackerOverrides: { gunnery: 0 },
    });
    const stealthWithoutEcmScenario = buildScenario({
      includeSpotter: false,
      attackerWeapon: artemisLRM,
      attackerOverrides: { gunnery: 0, hasStealthArmor: true },
    });
    const stealthWithEcmScenario = buildScenario({
      includeSpotter: false,
      attackerWeapon: artemisLRM,
      attackerOverrides: { gunnery: 0, hasStealthArmor: true },
    });
    const electronicWarfare: IElectronicWarfareState = {
      ecmSuites: [
        {
          type: 'guardian',
          mode: 'ecm',
          operational: true,
          entityId: 'player-1:ISGuardianECMSuite:0',
          teamId: GameSide.Player,
          position: { q: 0, r: 0 },
        },
      ],
      activeProbes: [],
    };

    const noStealthEvents = runPhase({
      ...noStealthScenario,
      grid: makeClearGrid(),
      random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
      botPlayer: new ScriptedAttackAI(artemisLRM.id),
    });
    const stealthWithoutEcmEvents = runPhase({
      ...stealthWithoutEcmScenario,
      grid: makeClearGrid(),
      random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
      botPlayer: new ScriptedAttackAI(artemisLRM.id),
    });
    const stealthWithEcmEvents = runPhase({
      ...stealthWithEcmScenario,
      state: { ...stealthWithEcmScenario.state, electronicWarfare },
      grid: makeClearGrid(),
      random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
      botPlayer: new ScriptedAttackAI(artemisLRM.id),
    });

    const findResolved = (
      events: readonly IGameEvent[],
    ): IGameEvent & { payload: IAttackResolvedPayload } =>
      events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };

    expect(findResolved(noStealthEvents).payload).toMatchObject({
      hit: true,
      projectileCount: 9,
      damage: 9,
    });
    expect(findResolved(stealthWithoutEcmEvents).payload).toMatchObject({
      hit: true,
      projectileCount: 9,
      damage: 9,
    });
    expect(findResolved(stealthWithEcmEvents).payload).toMatchObject({
      hit: true,
      projectileCount: 5,
      damage: 5,
    });
  });
});
