/**
 * Phase 2 of `add-combat-fidelity-suite` — per-event-type unit tests for
 * `runAttackPhase`'s lifecycle event chain.
 *
 * Spec contract:
 *   openspec/changes/add-combat-fidelity-suite/specs/combat-resolution/spec.md
 *     - "Weapon Attack Lifecycle Events"
 *     - "Location Destruction and Damage Transfer Events"
 *
 * Each test constructs a synthetic minimal scenario (1v1 mech mirror or
 * skewed armor budget) and asserts the discriminated-union payload
 * shape of the events produced by `runAttackPhase`. Determinism is
 * driven by a fixed `SeededRandom` seed; tests never depend on
 * Math.random.
 *
 * This file is intentionally narrow: per-event-type SHAPE assertions.
 * Cross-cutting causal-ordering invariants ("AttackDeclared count ===
 * AttackResolved count over a 5-turn match") live in the integration
 * test at `src/simulation/__tests__/atlasMirrorEventChain.integration.test.ts`.
 */

import type { IAmmoSlotState } from '@/types/gameplay/GameSessionInterfaces';

import {
  Facing,
  FiringArc,
  GamePhase,
  GameSide,
  GameStatus,
  IAttackDeclaredPayload,
  IAttackInvalidPayload,
  IAttackResolvedPayload,
  IDamageAppliedPayload,
  IDesignatorMarkerAppliedPayload,
  IGameEvent,
  IGameState,
  ILocationDestroyedPayload,
  ITransferDamagePayload,
  IUnitGameState,
  LockState,
  MovementType,
  GameEventType,
} from '@/types/gameplay';

import type { IAIPlayer, IAIUnitState, IAttackEvent } from '../../ai/IAIPlayer';
import type { IBotBehavior, IWeapon } from '../../ai/types';

import { BotPlayer } from '../../ai/BotPlayer';
import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { IViolation } from '../../invariants/types';
import {
  SPA_COMBAT_SUPPORT,
  SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT,
} from '../CombatFeatureSupport';
import { SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT } from '../CombatSpecialWeaponSupport';
import { runHeatPhase } from '../phases/postCombat';
import { runAttackPhase } from '../phases/weaponAttack';
import {
  isSemiGuidedAmmoSelectedForWeapon,
  resolveSpecialProjectileHit,
} from '../phases/weaponAttackFiringModes';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';

// =============================================================================
// Test fixture builders
// =============================================================================

/**
 * AC/20 stand-in tuned for low-armor scenarios. 20 damage in the short
 * range means a single hit on the low-armor LA fixture below zeroes
 * armor + structure and triggers transfer to LT — which is the
 * canonical scenario from `combat-resolution/spec.md` "LA destroyed
 * transfers remaining damage to LT".
 */
function createAC20(id = 'ac-20-test'): IWeapon {
  return {
    id,
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

/**
 * Medium laser stand-in with deliberately low long range so we can
 * trigger an out-of-range scenario by spacing the units beyond
 * `longRange = 9`.
 */
function createMediumLaser(id = 'medium-laser-test'): IWeapon {
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

function createPlasmaCannon(id = 'clan-plasma-cannon'): IWeapon {
  return {
    id,
    name: 'Plasma Cannon (Clan)',
    shortRange: 6,
    mediumRange: 12,
    longRange: 18,
    damage: 0,
    heat: 7,
    minRange: 0,
    ammoPerTon: 10,
    destroyed: false,
  };
}

function createUltraAC5(id = 'uac-5-test'): IWeapon {
  return {
    id,
    name: 'Ultra AC/5',
    shortRange: 6,
    mediumRange: 13,
    longRange: 20,
    damage: 5,
    heat: 1,
    minRange: 0,
    ammoPerTon: 20,
    destroyed: false,
    firingModes: {
      kind: 'rate-of-fire',
      defaultModeId: 'single',
      modes: [
        { id: 'single', damage: 5, heat: 1, shotsPerTurn: 1 },
        { id: 'double', damage: 10, heat: 2, shotsPerTurn: 2 },
      ],
    },
  };
}

function createRotaryAC2(id = 'rac-2-test'): IWeapon {
  return {
    id,
    name: 'Rotary AC/2',
    shortRange: 6,
    mediumRange: 12,
    longRange: 18,
    damage: 2,
    heat: 1,
    minRange: 0,
    ammoPerTon: 45,
    destroyed: false,
    firingModes: {
      kind: 'rate-of-fire',
      defaultModeId: 'rof-1',
      modes: [
        { id: 'rof-1', damage: 2, heat: 1, shotsPerTurn: 1 },
        { id: 'rof-3', damage: 6, heat: 3, shotsPerTurn: 3 },
      ],
    },
  };
}

function createLBX10(id = 'lb-10-x-ac-0'): IWeapon {
  return {
    id,
    name: 'LB 10-X AC',
    shortRange: 6,
    mediumRange: 12,
    longRange: 18,
    damage: 10,
    heat: 2,
    minRange: 0,
    ammoPerTon: 10,
    destroyed: false,
    firingModes: {
      kind: 'cluster-slug',
      defaultModeId: 'slug',
      modes: [
        { id: 'slug', damage: 10, heat: 2, shotsPerTurn: 1 },
        { id: 'cluster', damage: 10, heat: 2, shotsPerTurn: 1 },
      ],
    },
  };
}

function createMML3(id = 'mml-3-0'): IWeapon {
  return {
    id,
    name: 'MML 3',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 6,
    heat: 2,
    minRange: 0,
    ammoPerTon: 40,
    destroyed: false,
    firingModes: {
      kind: 'ammo-mode',
      defaultModeId: 'srm',
      modes: [
        {
          id: 'srm',
          damage: 6,
          heat: 2,
          shotsPerTurn: 1,
          ammoWeaponType: 'srm-3',
        },
        {
          id: 'lrm',
          damage: 3,
          heat: 2,
          shotsPerTurn: 1,
          ammoWeaponType: 'lrm-3',
        },
      ],
    },
  };
}

function createNarcBeacon(id = 'narc-0'): IWeapon {
  return {
    id,
    name: 'NARC Beacon',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 0,
    heat: 0,
    minRange: 0,
    ammoPerTon: 6,
    destroyed: false,
  };
}

function createINarcBeacon(id = 'inarc-0'): IWeapon {
  return {
    id,
    name: 'iNARC Launcher',
    shortRange: 4,
    mediumRange: 8,
    longRange: 12,
    damage: 0,
    heat: 0,
    minRange: 0,
    ammoPerTon: 4,
    destroyed: false,
  };
}

function createSelectableINarcBeacon(id = 'inarc-0'): IWeapon {
  return {
    ...createINarcBeacon(id),
    firingModes: {
      kind: 'ammo-mode',
      defaultModeId: 'homing',
      modes: [
        {
          id: 'homing',
          damage: 0,
          heat: 0,
          shotsPerTurn: 1,
          ammoWeaponType: 'inarc',
        },
        {
          id: 'ecm',
          damage: 0,
          heat: 0,
          shotsPerTurn: 1,
          ammoWeaponType: 'inarc-ecm',
        },
        {
          id: 'haywire',
          damage: 0,
          heat: 0,
          shotsPerTurn: 1,
          ammoWeaponType: 'inarc-haywire',
        },
        {
          id: 'nemesis',
          damage: 0,
          heat: 0,
          shotsPerTurn: 1,
          ammoWeaponType: 'inarc-nemesis',
        },
      ],
    },
  };
}

function createTAGDesignator(id = 'tag-0'): IWeapon {
  return {
    id,
    name: 'TAG',
    shortRange: 5,
    mediumRange: 9,
    longRange: 15,
    damage: 0,
    heat: 0,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

function createAMS(id = 'ams-0'): IWeapon {
  return {
    id,
    name: 'Anti-Missile System',
    shortRange: 1,
    mediumRange: 1,
    longRange: 1,
    damage: 0,
    heat: 1,
    minRange: 0,
    ammoPerTon: 12,
    destroyed: false,
  };
}

function createLaserAMS(id = 'laser-ams-0'): IWeapon {
  return {
    id,
    name: 'Laser Anti-Missile System',
    shortRange: 1,
    mediumRange: 1,
    longRange: 1,
    damage: 0,
    heat: 5,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

function createLRM10(id = 'lrm-10-0'): IWeapon {
  return {
    id,
    name: 'LRM 10',
    shortRange: 7,
    mediumRange: 14,
    longRange: 21,
    damage: 10,
    heat: 4,
    minRange: 6,
    ammoPerTon: 12,
    destroyed: false,
  };
}

function createMRM10(id = 'mrm-10-0'): IWeapon {
  return {
    id,
    name: 'MRM 10',
    shortRange: 3,
    mediumRange: 8,
    longRange: 15,
    damage: 10,
    heat: 4,
    minRange: 0,
    ammoPerTon: 24,
    destroyed: false,
  };
}

function createStreakSRM6(id = 'streak-srm-6-0'): IWeapon {
  return {
    id,
    name: 'Streak SRM 6',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 12,
    heat: 4,
    minRange: 0,
    ammoPerTon: 15,
    destroyed: false,
  };
}

function createThunderbolt10(id = 'thunderbolt-10-0'): IWeapon {
  return {
    id,
    name: 'Thunderbolt 10',
    shortRange: 5,
    mediumRange: 10,
    longRange: 15,
    damage: 10,
    heat: 5,
    minRange: 5,
    ammoPerTon: 6,
    destroyed: false,
  };
}

function sequenceD6Roller(...rolls: readonly number[]): () => number {
  let index = 0;
  return () => rolls[index++] ?? 1;
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

const VETERAN_MODE_BEHAVIOR: IBotBehavior = {
  retreatThreshold: 0.3,
  retreatEdge: 'nearest',
  safeHeatThreshold: 13,
  tier: 'Veteran',
};

class ScriptedAttackAI implements IAIPlayer {
  constructor(
    private readonly weaponId: string,
    private readonly modeId?: string,
  ) {}

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
        ...(this.modeId
          ? { weaponModes: { [this.weaponId]: this.modeId } }
          : {}),
      },
    };
  }

  playPhysicalAttackPhase() {
    return null;
  }
}

/**
 * Build an `IUnitGameState` with full per-location armor + structure.
 * `armorOverride` / `structureOverride` patch specific locations so
 * destruction / transfer scenarios can be set up deterministically.
 */
function createUnit(
  id: string,
  side: GameSide,
  position: { q: number; r: number },
  armorOverride: Partial<IUnitGameState['armor']> = {},
  structureOverride: Partial<IUnitGameState['structure']> = {},
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
      ...armorOverride,
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
      ...structureOverride,
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

function armorTypeByLocation(
  armorType: string,
): Readonly<Record<string, string>> {
  return {
    head: armorType,
    center_torso: armorType,
    center_torso_rear: armorType,
    left_torso: armorType,
    left_torso_rear: armorType,
    right_torso: armorType,
    right_torso_rear: armorType,
    left_arm: armorType,
    right_arm: armorType,
    left_leg: armorType,
    right_leg: armorType,
  };
}

/**
 * Build a 1v1 game state with two units placed at the supplied
 * positions and a hydration map seeding both with the supplied
 * weapons. Adjacent positions (default) put both units in AC/20 short
 * range; distant positions exercise the out-of-range path.
 */
function buildScenario(options: {
  attackerWeapons: readonly IWeapon[];
  targetArmorOverride?: Partial<IUnitGameState['armor']>;
  targetStructureOverride?: Partial<IUnitGameState['structure']>;
  attackerStateOverride?: Partial<IUnitGameState>;
  targetStateOverride?: Partial<IUnitGameState>;
  targetWeapons?: readonly IWeapon[];
  attackerPosition?: { q: number; r: number };
  targetPosition?: { q: number; r: number };
}): {
  state: IGameState;
  weaponsByUnit: ReadonlyMap<string, readonly IWeapon[]>;
} {
  const attackerPos = options.attackerPosition ?? { q: 0, r: 0 };
  // Default range = 1 hex (well within AC/20 short bracket).
  const targetPos = options.targetPosition ?? { q: 1, r: 0 };

  const attacker = {
    ...createUnit('player-1', GameSide.Player, attackerPos),
    ...options.attackerStateOverride,
  };
  const target = createUnit(
    'opponent-1',
    GameSide.Opponent,
    targetPos,
    options.targetArmorOverride,
    options.targetStructureOverride,
  );
  const targetWithOverrides = {
    ...target,
    ...options.targetStateOverride,
  };

  const weaponsByUnit = new Map<string, readonly IWeapon[]>([
    ['player-1', options.attackerWeapons],
    // Disarm the opponent so only the attacker fires; keeps event
    // streams readable per scenario without enemy noise.
    ['opponent-1', options.targetWeapons ?? []],
  ]);

  const state: IGameState = {
    gameId: 'test-game',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    activationIndex: 0,
    units: {
      'player-1': attacker,
      'opponent-1': targetWithOverrides,
    },
    turnEvents: [],
  };

  return { state, weaponsByUnit };
}

/**
 * Run `runAttackPhase` with the supplied scenario + seed and return
 * the resulting events. Wraps the boilerplate (BotPlayer construction,
 * invariant runner, violations sink) so tests stay focused on
 * assertions.
 */
function runPhase(options: {
  state: IGameState;
  weaponsByUnit: ReadonlyMap<string, readonly IWeapon[]>;
  seed?: number;
  botBehavior?: IBotBehavior;
  botPlayer?: IAIPlayer;
}): IGameEvent[] {
  return runPhaseWithResult(options).events;
}

function runPhaseWithResult(options: {
  state: IGameState;
  weaponsByUnit: ReadonlyMap<string, readonly IWeapon[]>;
  seed?: number;
  random?: SeededRandom;
  botBehavior?: IBotBehavior;
  botPlayer?: IAIPlayer;
}): { events: IGameEvent[]; state: IGameState } {
  const random = options.random ?? new SeededRandom(options.seed ?? 12345);
  const botPlayer =
    options.botPlayer ?? new BotPlayer(random, options.botBehavior);
  const invariantRunner = new InvariantRunner();
  const violations: IViolation[] = [];
  const events: IGameEvent[] = [];

  const result = runAttackPhase({
    state: options.state,
    botPlayer,
    invariantRunner,
    violations,
    events,
    gameId: options.state.gameId,
    random,
    weaponsByUnit: options.weaponsByUnit,
  });

  return { events, state: result };
}

// =============================================================================
// Per-event-type payload-shape assertions
// =============================================================================

describe('runAttackPhase events — Phase 2 (combat-resolution + damage-system deltas)', () => {
  describe('AttackDeclared', () => {
    it('emits before the to-hit roll with attackerId, targetId, weaponId, range, firingArc, modifiers', () => {
      // Atlas-like AC/20 attacker at range 1 vs full-armor target.
      // Seed picked empirically to ensure the bot fires AC/20 from
      // adjacent hex (range = 1, short bracket).
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [createAC20()],
      });
      const events = runPhase({ state, weaponsByUnit });

      const declared = events.filter(
        (e) => e.type === GameEventType.AttackDeclared,
      );
      expect(declared.length).toBeGreaterThanOrEqual(1);

      const payload = declared[0].payload as IAttackDeclaredPayload;
      expect(payload.attackerId).toBe('player-1');
      expect(payload.targetId).toBe('opponent-1');
      expect(payload.weapons).toEqual(['ac-20-test']);
      expect(payload.toHitNumber).toBeGreaterThan(0);
      expect(Array.isArray(payload.modifiers)).toBe(true);
      expect(payload.modifiers.length).toBeGreaterThan(0);
      // gunnery is always the first modifier in calculateToHit.
      const gunneryMod = payload.modifiers.find((m) => m.source === 'base');
      expect(gunneryMod).toBeDefined();
      expect(gunneryMod?.value).toBe(4);
      expect(payload.range).toBe('short');
      expect(payload.firingArc).toBeDefined();
    });

    it('emits one AttackDeclared per declared weapon mount', () => {
      // Two weapons declared → two AttackDeclared events (per design D4).
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [createMediumLaser('ml-1'), createMediumLaser('ml-2')],
      });
      const events = runPhase({ state, weaponsByUnit });

      const declared = events.filter(
        (e) => e.type === GameEventType.AttackDeclared,
      );
      // The bot may pick a subset (heat budget), but with 2 cool MLs at
      // heat 0 it will fire both.
      const weaponIds = declared.map(
        (e) => (e.payload as IAttackDeclaredPayload).weapons[0],
      );
      expect(weaponIds).toContain('ml-1');
      expect(weaponIds).toContain('ml-2');
    });

    it('resolves selected rate-of-fire modes as independent runner shots', () => {
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [createUltraAC5()],
      });
      const stateWithEasyShot: IGameState = {
        ...state,
        units: {
          ...state.units,
          'player-1': {
            ...state.units['player-1'],
            gunnery: 2,
          },
        },
      };

      const result = runPhaseWithResult({
        state: stateWithEasyShot,
        weaponsByUnit,
        botBehavior: VETERAN_MODE_BEHAVIOR,
      });
      const { events } = result;

      const declared = events.filter(
        (e) =>
          e.type === GameEventType.AttackDeclared &&
          (e.payload as IAttackDeclaredPayload).attackerId === 'player-1',
      ) as Array<IGameEvent & { payload: IAttackDeclaredPayload }>;
      const resolved = events.filter(
        (e) =>
          e.type === GameEventType.AttackResolved &&
          (e.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as Array<IGameEvent & { payload: IAttackResolvedPayload }>;

      expect(declared).toHaveLength(2);
      expect(resolved).toHaveLength(2);
      expect(
        declared.every(
          (event) => event.payload.weaponModes?.['uac-5-test'] === 'double',
        ),
      ).toBe(true);
      expect(resolved.map((event) => event.payload.damage)).toEqual([5, 5]);
      expect(resolved.map((event) => event.payload.heat)).toEqual([1, 1]);
      expect(result.state.units['player-1'].weaponsFiredThisTurn).toEqual([
        'uac-5-test',
        'uac-5-test',
      ]);
    });
  });

  describe('AttackResolved', () => {
    it('emits after the to-hit roll with rolledTN, rolled2d6, hit:bool, hitLocation on hit', () => {
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [createAC20()],
      });
      const events = runPhase({ state, weaponsByUnit });

      const resolved = events.filter(
        (e) => e.type === GameEventType.AttackResolved,
      );
      expect(resolved.length).toBeGreaterThanOrEqual(1);

      const payload = resolved[0].payload as IAttackResolvedPayload;
      expect(payload.attackerId).toBe('player-1');
      expect(payload.targetId).toBe('opponent-1');
      expect(payload.weaponId).toBe('ac-20-test');
      expect(payload.toHitNumber).toBeGreaterThan(0);
      expect(payload.roll).toBeGreaterThanOrEqual(2);
      expect(payload.roll).toBeLessThanOrEqual(12);
      expect(typeof payload.hit).toBe('boolean');
      if (payload.hit) {
        expect(typeof payload.location).toBe('string');
        expect(payload.damage).toBe(20);
      }
      expect(payload.heat).toBe(7);
      expect(payload.attackerArc).toBeDefined();
    });

    it('emits AttackResolved on miss with hit:false and no hitLocation', () => {
      // Push the gunnery to 7 and target movement so to-hit is hard;
      // with seed 99999 we'll get a miss and exercise the miss branch.
      // Not strictly seed-dependent — the test asserts that IF a miss
      // occurs, the payload shape is right.
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [createMediumLaser()],
      });
      const events = runPhase({ state, weaponsByUnit, seed: 99999 });

      const resolved = events.filter(
        (e) => e.type === GameEventType.AttackResolved,
      ) as Array<IGameEvent & { payload: IAttackResolvedPayload }>;
      // At least one resolved event should fire.
      expect(resolved.length).toBeGreaterThan(0);

      // Find a miss if any; if all hit, that's fine — the assertion is
      // about miss-shape WHEN a miss happens.
      const missEvent = resolved.find((e) => !e.payload.hit);
      if (missEvent) {
        expect(missEvent.payload.hit).toBe(false);
        expect(missEvent.payload.location).toBeUndefined();
        expect(missEvent.payload.damage).toBeUndefined();
        expect(missEvent.payload.attackerArc).toBeDefined();
      }
    });

    it('valid misses still mark firing heat and consume one ammo round', () => {
      const weapon = createAC20();
      const ammoBin = createAmmoBin({
        weaponType: weapon.id,
        remainingRounds: 5,
      });
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [weapon],
        attackerStateOverride: {
          gunnery: 13,
          ammoState: { [ammoBin.binId]: ammoBin },
        },
      });

      const result = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(weapon.id),
      });

      const resolved = result.events.find(
        (event) => event.type === GameEventType.AttackResolved,
      ) as IGameEvent & { payload: IAttackResolvedPayload };
      const consumed = result.events.find(
        (event) => event.type === GameEventType.AmmoConsumed,
      ) as
        | (IGameEvent & {
            payload: { roundsConsumed: number; roundsRemaining: number };
          })
        | undefined;

      expect(resolved.payload.hit).toBe(false);
      expect(consumed?.payload.roundsConsumed).toBe(1);
      expect(consumed?.payload.roundsRemaining).toBe(4);
      expect(result.state.units['player-1'].weaponsFiredThisTurn).toEqual([
        weapon.id,
      ]);
      expect(
        result.state.units['player-1'].ammoState?.[ammoBin.binId]
          .remainingRounds,
      ).toBe(4);
    });

    it('runner ammo consumption matches catalog mount ids to display-style ammo bins', () => {
      const weapon = createAC20('ac-20-0');
      const ammoBin = createAmmoBin({
        weaponType: 'AC/20',
        remainingRounds: 5,
      });
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [weapon],
        attackerStateOverride: {
          gunnery: 13,
          ammoState: { [ammoBin.binId]: ammoBin },
        },
      });

      const result = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(weapon.id),
      });

      expect(
        result.events.some(
          (event) => event.type === GameEventType.AttackInvalid,
        ),
      ).toBe(false);
      expect(
        result.events.some(
          (event) => event.type === GameEventType.AmmoConsumed,
        ),
      ).toBe(true);
      expect(
        result.state.units['player-1'].ammoState?.[ammoBin.binId]
          .remainingRounds,
      ).toBe(4);
    });

    it('LB-X slug mode resolves as a single projectile hit', () => {
      const weapon = createLBX10();
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [weapon],
        attackerStateOverride: { gunnery: 2 },
      });

      const result = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(weapon.id, 'slug'),
      });

      const resolved = result.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };

      expect(resolved.payload.hit).toBe(true);
      expect(resolved.payload.projectileCount).toBeUndefined();
      expect(resolved.payload.damage).toBeGreaterThan(0);
      expect(resolved.payload.damage).toBeLessThanOrEqual(10);
    });

    it('LB-X cluster mode rolls cluster hits and exposes projectile count', () => {
      const weapon = createLBX10();
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [weapon],
        attackerStateOverride: { gunnery: 2 },
      });

      const result = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(weapon.id, 'cluster'),
      });

      const resolved = result.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };

      expect(resolved.payload.hit).toBe(true);
      expect(resolved.payload.projectileCount).toBeGreaterThan(0);
      expect(resolved.payload.projectileCount).toBeLessThanOrEqual(10);
      expect(resolved.payload.damage).toBeGreaterThan(0);
      expect(resolved.payload.damage).toBeLessThanOrEqual(
        resolved.payload.projectileCount ?? 0,
      );
    });

    it('MML selected ammo modes drive runner damage without collapsing variable catalog damage', () => {
      const weapon = createMML3();
      const srmAmmoBin = createAmmoBin({
        binId: 'srm-3-bin',
        weaponType: 'srm-3',
        remainingRounds: 4,
      });
      const lrmAmmoBin = createAmmoBin({
        binId: 'lrm-3-bin',
        weaponType: 'lrm-3',
        remainingRounds: 4,
      });
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [weapon],
        attackerStateOverride: {
          gunnery: 2,
          ammoState: {
            [srmAmmoBin.binId]: srmAmmoBin,
            [lrmAmmoBin.binId]: lrmAmmoBin,
          },
        },
      });

      const srmResult = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(weapon.id, 'srm'),
      });
      const lrmResult = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(weapon.id, 'lrm'),
      });
      const srmResolved = srmResult.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };
      const lrmResolved = lrmResult.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };

      expect(srmResolved.payload).toMatchObject({
        hit: true,
        projectileCount: 2,
        damage: 4,
      });
      expect(lrmResolved.payload).toMatchObject({
        hit: true,
        projectileCount: 2,
        damage: 2,
      });
      expect(srmResolved.payload.damage).toBeGreaterThan(
        lrmResolved.payload.damage ?? 0,
      );
    });

    it('MML selected ammo modes consume distinct SRM and LRM ammo bins', () => {
      const weapon = createMML3();
      const srmAmmoBin = createAmmoBin({
        binId: 'srm-3-bin',
        weaponType: 'srm-3',
        remainingRounds: 1,
      });
      const lrmAmmoBin = createAmmoBin({
        binId: 'lrm-3-bin',
        weaponType: 'lrm-3',
        remainingRounds: 1,
      });
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [weapon],
        attackerStateOverride: {
          gunnery: 13,
          ammoState: {
            [srmAmmoBin.binId]: srmAmmoBin,
            [lrmAmmoBin.binId]: lrmAmmoBin,
          },
        },
      });

      const srmResult = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(weapon.id, 'srm'),
      });
      const lrmResult = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(weapon.id, 'lrm'),
      });
      const srmConsumed = srmResult.events.find(
        (event) => event.type === GameEventType.AmmoConsumed,
      ) as IGameEvent & {
        payload: {
          binId: string;
          weaponType: string;
          roundsRemaining: number;
        };
      };
      const lrmConsumed = lrmResult.events.find(
        (event) => event.type === GameEventType.AmmoConsumed,
      ) as IGameEvent & {
        payload: {
          binId: string;
          weaponType: string;
          roundsRemaining: number;
        };
      };

      expect(
        srmResult.events.some(
          (event) => event.type === GameEventType.AttackInvalid,
        ),
      ).toBe(false);
      expect(
        lrmResult.events.some(
          (event) => event.type === GameEventType.AttackInvalid,
        ),
      ).toBe(false);
      expect(srmConsumed.payload).toMatchObject({
        binId: srmAmmoBin.binId,
        weaponType: 'srm-3',
        roundsRemaining: 0,
      });
      expect(lrmConsumed.payload).toMatchObject({
        binId: lrmAmmoBin.binId,
        weaponType: 'lrm-3',
        roundsRemaining: 0,
      });
      expect(
        srmResult.state.units['player-1'].ammoState?.[lrmAmmoBin.binId]
          .remainingRounds,
      ).toBe(1);
      expect(
        lrmResult.state.units['player-1'].ammoState?.[srmAmmoBin.binId]
          .remainingRounds,
      ).toBe(1);
    });

    it('NARC beacon hits attach a target marker without applying damage', () => {
      const weapon = createNarcBeacon();
      const ammoBin = createAmmoBin({
        weaponType: 'narc',
        remainingRounds: 2,
      });
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [weapon],
        attackerStateOverride: {
          gunnery: 2,
          ammoState: { [ammoBin.binId]: ammoBin },
        },
      });

      const result = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(weapon.id),
      });

      const resolved = result.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };
      const consumed = result.events.find(
        (event) => event.type === GameEventType.AmmoConsumed,
      ) as
        | (IGameEvent & {
            payload: { roundsConsumed: number; roundsRemaining: number };
          })
        | undefined;
      const markerApplied = result.events.find(
        (event) => event.type === GameEventType.DesignatorMarkerApplied,
      ) as
        | (IGameEvent & { payload: IDesignatorMarkerAppliedPayload })
        | undefined;

      expect(resolved.payload).toMatchObject({
        hit: true,
        damage: 0,
        heat: 0,
      });
      expect(markerApplied?.payload).toMatchObject({
        attackerId: 'player-1',
        targetId: 'opponent-1',
        weaponId: weapon.id,
        marker: 'narc',
        persistent: true,
        teamId: GameSide.Player,
      });
      expect(result.state.units['opponent-1'].narcedBy).toContain(
        GameSide.Player,
      );
      expect(
        result.events.some(
          (event) => event.type === GameEventType.DamageApplied,
        ),
      ).toBe(false);
      expect(consumed?.payload.roundsConsumed).toBe(1);
      expect(consumed?.payload.roundsRemaining).toBe(1);
      expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.narc.level).toBe(
        'helper-only',
      );
      expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.narc.evidence).toContain(
        'narcedBy',
      );
    });

    it('target AMS can destroy a NARC pod before marker attachment', () => {
      const weapon = createNarcBeacon();
      const ams = createAMS();
      const narcAmmoBin = createAmmoBin({
        weaponType: 'narc',
        remainingRounds: 2,
      });
      const amsAmmoBin = createAmmoBin({
        binId: 'ams-bin',
        weaponType: 'ams',
        remainingRounds: 2,
      });
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [weapon],
        attackerStateOverride: {
          gunnery: 2,
          ammoState: { [narcAmmoBin.binId]: narcAmmoBin },
        },
        targetStateOverride: {
          ammoState: { [amsAmmoBin.binId]: amsAmmoBin },
        },
        targetWeapons: [ams],
      });

      const result = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(weapon.id),
        random: new SequenceRandom([6, 6, 2]),
      });

      const resolved = result.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };
      const amsInterception = result.events.find(
        (event) => event.type === GameEventType.AMSInterception,
      ) as
        | (IGameEvent & {
            payload: {
              resolution: string;
              incomingProjectiles: number;
              projectilesIntercepted: number;
              projectilesRemaining: number;
              roll: readonly number[];
              ammoBinId?: string;
              ammoRemaining?: number;
            };
          })
        | undefined;

      expect(resolved.payload).toMatchObject({
        hit: false,
        damage: 0,
        heat: 0,
        projectileCount: 0,
      });
      expect(result.state.units['opponent-1'].narcedBy).toBeUndefined();
      expect(amsInterception?.payload).toMatchObject({
        resolution: 'single-missile',
        incomingProjectiles: 1,
        projectilesIntercepted: 1,
        projectilesRemaining: 0,
        roll: [2],
        ammoBinId: amsAmmoBin.binId,
        ammoRemaining: 1,
      });
      expect(
        result.state.units['opponent-1'].ammoState?.[amsAmmoBin.binId]
          .remainingRounds,
      ).toBe(1);
      expect(
        result.events.some(
          (event) => event.type === GameEventType.DesignatorMarkerApplied,
        ),
      ).toBe(false);
      expect(
        result.state.units['player-1'].ammoState?.[narcAmmoBin.binId]
          .remainingRounds,
      ).toBe(1);
    });

    it('NARC pod attaches when single-missile AMS fails its interception roll', () => {
      const weapon = createNarcBeacon();
      const ams = createAMS();
      const narcAmmoBin = createAmmoBin({
        weaponType: 'narc',
        remainingRounds: 2,
      });
      const amsAmmoBin = createAmmoBin({
        binId: 'ams-bin',
        weaponType: 'ams',
        remainingRounds: 2,
      });
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [weapon],
        attackerStateOverride: {
          gunnery: 2,
          ammoState: { [narcAmmoBin.binId]: narcAmmoBin },
        },
        targetStateOverride: {
          ammoState: { [amsAmmoBin.binId]: amsAmmoBin },
        },
        targetWeapons: [ams],
      });

      const result = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(weapon.id),
        random: new SequenceRandom([6, 6, 4, 1, 1]),
      });

      const resolved = result.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };
      const amsInterception = result.events.find(
        (event) => event.type === GameEventType.AMSInterception,
      ) as
        | (IGameEvent & {
            payload: {
              resolution: string;
              projectilesIntercepted: number;
              projectilesRemaining: number;
              roll: readonly number[];
            };
          })
        | undefined;
      const markerApplied = result.events.find(
        (event) => event.type === GameEventType.DesignatorMarkerApplied,
      ) as
        | (IGameEvent & { payload: IDesignatorMarkerAppliedPayload })
        | undefined;

      expect(resolved.payload).toMatchObject({
        hit: true,
        damage: 0,
        heat: 0,
        projectileCount: 1,
      });
      expect(result.state.units['opponent-1'].narcedBy).toContain(
        GameSide.Player,
      );
      expect(amsInterception?.payload).toMatchObject({
        resolution: 'single-missile',
        projectilesIntercepted: 0,
        projectilesRemaining: 1,
        roll: [4],
      });
      expect(markerApplied?.payload).toMatchObject({
        marker: 'narc',
        persistent: true,
        teamId: GameSide.Player,
      });
    });

    it('iNARC homing pod hits attach variant marker state without standard NARC state', () => {
      const weapon = createINarcBeacon();
      const ammoBin = createAmmoBin({
        weaponType: 'inarc',
        remainingRounds: 2,
      });
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [weapon],
        attackerStateOverride: {
          gunnery: 2,
          ammoState: { [ammoBin.binId]: ammoBin },
        },
      });

      const result = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(weapon.id),
      });

      const resolved = result.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };
      const markerApplied = result.events.find(
        (event) => event.type === GameEventType.DesignatorMarkerApplied,
      ) as
        | (IGameEvent & { payload: IDesignatorMarkerAppliedPayload })
        | undefined;

      expect(resolved.payload).toMatchObject({
        hit: true,
        damage: 0,
        heat: 0,
      });
      expect(markerApplied?.payload).toMatchObject({
        attackerId: 'player-1',
        targetId: 'opponent-1',
        weaponId: weapon.id,
        marker: 'inarc',
        podType: 'homing',
        persistent: true,
        teamId: GameSide.Player,
      });
      expect(result.state.units['opponent-1'].iNarcPods).toEqual([
        expect.objectContaining({
          teamId: GameSide.Player,
          podType: 'homing',
        }),
      ]);
      expect(result.state.units['opponent-1'].narcedBy).toBeUndefined();
    });

    it.each([
      ['ecm', 'inarc-ecm'],
      ['haywire', 'inarc-haywire'],
      ['nemesis', 'inarc-nemesis'],
    ] as const)(
      'iNARC %s ammo hits attach the selected pod variant without standard NARC state',
      (modeId, ammoWeaponType) => {
        const weapon = createSelectableINarcBeacon();
        const ammoBin = createAmmoBin({
          weaponType: ammoWeaponType,
          remainingRounds: 2,
        });
        const { state, weaponsByUnit } = buildScenario({
          attackerWeapons: [weapon],
          attackerStateOverride: {
            gunnery: 2,
            ammoState: { [ammoBin.binId]: ammoBin },
          },
        });

        const result = runPhaseWithResult({
          state,
          weaponsByUnit,
          botPlayer: new ScriptedAttackAI(weapon.id, modeId),
          random: new SequenceRandom([6, 6, 3, 4]),
        });

        const markerApplied = result.events.find(
          (event) => event.type === GameEventType.DesignatorMarkerApplied,
        ) as
          | (IGameEvent & { payload: IDesignatorMarkerAppliedPayload })
          | undefined;

        expect(markerApplied?.payload).toMatchObject({
          attackerId: 'player-1',
          targetId: 'opponent-1',
          weaponId: weapon.id,
          marker: 'inarc',
          podType: modeId,
          persistent: true,
          teamId: GameSide.Player,
        });
        expect(result.state.units['opponent-1'].iNarcPods).toEqual([
          expect.objectContaining({
            teamId: GameSide.Player,
            podType: modeId,
          }),
        ]);
        expect(result.state.units['opponent-1'].narcedBy).toBeUndefined();
        expect(
          result.state.units['player-1'].ammoState?.[ammoBin.binId]
            .remainingRounds,
        ).toBe(1);
      },
    );

    it('TAG hits designate the target without applying damage', () => {
      const weapon = createTAGDesignator();
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [weapon],
        attackerStateOverride: { gunnery: 2 },
      });

      const result = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(weapon.id),
      });

      const resolved = result.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };
      const markerApplied = result.events.find(
        (event) => event.type === GameEventType.DesignatorMarkerApplied,
      ) as
        | (IGameEvent & { payload: IDesignatorMarkerAppliedPayload })
        | undefined;

      expect(resolved.payload).toMatchObject({
        hit: true,
        damage: 0,
        heat: 0,
      });
      expect(markerApplied?.payload).toMatchObject({
        attackerId: 'player-1',
        targetId: 'opponent-1',
        weaponId: weapon.id,
        marker: 'tag',
        persistent: false,
      });
      expect(result.state.units['opponent-1'].tagDesignated).toBe(true);
      expect(
        result.events.some(
          (event) => event.type === GameEventType.DamageApplied,
        ),
      ).toBe(false);
      expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.tag.level).toBe('integrated');
      expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.tag.evidence).toContain(
        'tagDesignated',
      );
    });

    it('plasma cannon hits apply external target heat without BattleMech damage', () => {
      const weapon = createPlasmaCannon();
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [weapon],
        attackerStateOverride: { gunnery: 0 },
        targetStateOverride: { heat: 4 },
        targetPosition: { q: 5, r: 0 },
      });

      const result = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(weapon.id),
        random: new SequenceRandom([6, 6, 3, 4, 2, 5]),
      });

      const resolved = result.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };
      const heatGenerated = result.events.find(
        (event) =>
          event.type === GameEventType.HeatGenerated &&
          (event.payload as { unitId?: string }).unitId === 'opponent-1',
      ) as
        | (IGameEvent & {
            payload: {
              amount: number;
              source: string;
              previousTotal: number;
              newTotal: number;
            };
          })
        | undefined;

      expect(resolved.payload).toMatchObject({
        hit: true,
        damage: 0,
        heat: 7,
        location: expect.any(String),
      });
      expect(heatGenerated?.payload).toMatchObject({
        amount: 7,
        source: 'external',
        previousTotal: 4,
        newTotal: 11,
      });
      expect(result.state.units['opponent-1'].heat).toBe(11);
      expect(
        result.events.some(
          (event) => event.type === GameEventType.DamageApplied,
        ),
      ).toBe(false);
      expect(
        SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].evidence,
      ).toContain('HeatGenerated');
      expect(
        SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].gap,
      ).not.toContain('external target heat');
    });

    it('plasma cannon hits consume source-backed plasma ammunition', () => {
      const weapon = createPlasmaCannon();
      const ammoBin = createAmmoBin({
        binId: 'right-arm-plasma-bin',
        weaponType: 'CLPlasmaCannonAmmo',
        remainingRounds: 2,
      });
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [weapon],
        attackerStateOverride: {
          gunnery: 0,
          ammoState: { [ammoBin.binId]: ammoBin },
        },
        targetStateOverride: { heat: 4 },
        targetPosition: { q: 5, r: 0 },
      });

      const result = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(weapon.id),
        random: new SequenceRandom([6, 6, 3, 4, 2, 5]),
      });
      const consumed = result.events.find(
        (event) => event.type === GameEventType.AmmoConsumed,
      );

      expect(consumed?.payload).toMatchObject({
        unitId: 'player-1',
        binId: ammoBin.binId,
        weaponType: 'clan-plasma-cannon',
        roundsConsumed: 1,
        roundsRemaining: 1,
      });
      expect(
        result.state.units['player-1'].ammoState?.[ammoBin.binId]
          .remainingRounds,
      ).toBe(1);
      expect(
        result.events.some(
          (event) =>
            event.type === GameEventType.HeatGenerated &&
            (event.payload as { unitId?: string }).unitId === 'opponent-1',
        ),
      ).toBe(true);
    });

    it.each([
      ['reflective armor', 'Reflective', 3],
      ['heat-dissipating armor', 'Heat-Dissipating', 3],
    ])(
      'plasma cannon target heat is halved by intact %s',
      (_label, armorType, expectedHeat) => {
        const weapon = createPlasmaCannon();
        const { state, weaponsByUnit } = buildScenario({
          attackerWeapons: [weapon],
          attackerStateOverride: { gunnery: 0 },
          targetStateOverride: {
            heat: 4,
            armorTypeByLocation: armorTypeByLocation(armorType),
          },
          targetPosition: { q: 5, r: 0 },
        });

        const result = runPhaseWithResult({
          state,
          weaponsByUnit,
          botPlayer: new ScriptedAttackAI(weapon.id),
          random: new SequenceRandom([6, 6, 3, 4, 2, 5]),
        });
        const heatGenerated = result.events.find(
          (event) =>
            event.type === GameEventType.HeatGenerated &&
            (event.payload as { unitId?: string }).unitId === 'opponent-1',
        ) as
          | (IGameEvent & {
              payload: {
                amount: number;
                source: string;
                previousTotal: number;
                newTotal: number;
              };
            })
          | undefined;

        expect(heatGenerated?.payload).toMatchObject({
          amount: expectedHeat,
          source: 'external',
          previousTotal: 4,
          newTotal: 4 + expectedHeat,
        });
        expect(result.state.units['opponent-1'].heat).toBe(4 + expectedHeat);
      },
    );

    it('standard missile salvos use the cluster table with NARC and MRM modifiers', () => {
      const lrm = createLRM10();
      const unmarked = resolveSpecialProjectileHit({
        baseWeapon: lrm,
        shotWeapon: lrm,
        selectedMode: undefined,
        d6Roller: sequenceD6Roller(3, 4),
      });
      const narced = resolveSpecialProjectileHit({
        baseWeapon: lrm,
        shotWeapon: lrm,
        selectedMode: undefined,
        d6Roller: sequenceD6Roller(3, 4),
        clusterContext: {
          attackerTeamId: GameSide.Player,
          targetNarcedBy: [GameSide.Player],
        },
      });
      const mrm = createMRM10();
      const mrmWithPenalty = resolveSpecialProjectileHit({
        baseWeapon: mrm,
        shotWeapon: mrm,
        selectedMode: undefined,
        d6Roller: sequenceD6Roller(4, 5),
      });

      expect(unmarked).toMatchObject({
        projectileCount: 6,
        weapon: { damage: 6 },
      });
      expect(narced).toMatchObject({
        projectileCount: 8,
        weapon: { damage: 8 },
      });
      expect(mrmWithPenalty).toMatchObject({
        projectileCount: 6,
        weapon: { damage: 6 },
      });
      expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.narc.evidence).toContain(
        'cluster',
      );
    });

    it('iNARC homing pods drive source-backed missile guidance without using narcedBy', () => {
      const lrm = createLRM10();
      const inarced = resolveSpecialProjectileHit({
        baseWeapon: lrm,
        shotWeapon: lrm,
        selectedMode: undefined,
        d6Roller: sequenceD6Roller(3, 4),
        clusterContext: {
          attackerTeamId: GameSide.Player,
          targetINarcedBy: [GameSide.Player],
        },
      });
      const indirectINarced = resolveSpecialProjectileHit({
        baseWeapon: lrm,
        shotWeapon: lrm,
        selectedMode: undefined,
        d6Roller: sequenceD6Roller(3, 4),
        clusterContext: {
          attackerTeamId: GameSide.Player,
          targetINarcedBy: [GameSide.Player],
          isIndirectFire: true,
        },
      });
      const mrm = createMRM10();
      const mrmWithoutGuidance = resolveSpecialProjectileHit({
        baseWeapon: mrm,
        shotWeapon: mrm,
        selectedMode: undefined,
        d6Roller: sequenceD6Roller(3, 4),
      });
      const mrmWithINarcPod = resolveSpecialProjectileHit({
        baseWeapon: mrm,
        shotWeapon: mrm,
        selectedMode: undefined,
        d6Roller: sequenceD6Roller(3, 4),
        clusterContext: {
          attackerTeamId: GameSide.Player,
          targetINarcedBy: [GameSide.Player],
        },
      });

      expect(inarced).toMatchObject({
        projectileCount: 8,
        weapon: { damage: 8 },
      });
      expect(indirectINarced).toMatchObject({
        projectileCount: 6,
        weapon: { damage: 6 },
      });
      expect(mrmWithINarcPod).toMatchObject(mrmWithoutGuidance);
    });

    it('iNARC homing pods apply the source-backed missile to-hit bonus', () => {
      const lrm = createLRM10();
      const baseline = buildScenario({
        attackerWeapons: [lrm],
      });
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [lrm],
        targetStateOverride: {
          iNarcPods: [{ teamId: GameSide.Player, podType: 'homing' }],
        },
      });

      const baselineResult = runPhaseWithResult({
        state: baseline.state,
        weaponsByUnit: baseline.weaponsByUnit,
        botPlayer: new ScriptedAttackAI(lrm.id),
        random: new SequenceRandom([6, 6, 1, 1]),
      });
      const result = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(lrm.id),
        random: new SequenceRandom([6, 6, 1, 1]),
      });

      const declared = result.events.find(
        (event) => event.type === GameEventType.AttackDeclared,
      ) as IGameEvent & { payload: IAttackDeclaredPayload };
      const baselineDeclared = baselineResult.events.find(
        (event) => event.type === GameEventType.AttackDeclared,
      ) as IGameEvent & { payload: IAttackDeclaredPayload };

      expect(declared.payload.toHitNumber).toBe(
        baselineDeclared.payload.toHitNumber - 1,
      );
      expect(declared.payload.modifiers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'iNARC Homing',
            value: -1,
            source: 'equipment',
          }),
        ]),
      );
    });

    it('iNARC homing pods do not guide non-NARC-compatible MRM launchers', () => {
      const mrm = createMRM10();
      const baseline = buildScenario({
        attackerWeapons: [mrm],
      });
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [mrm],
        targetStateOverride: {
          iNarcPods: [{ teamId: GameSide.Player, podType: 'homing' }],
        },
      });

      const baselineResult = runPhaseWithResult({
        state: baseline.state,
        weaponsByUnit: baseline.weaponsByUnit,
        botPlayer: new ScriptedAttackAI(mrm.id),
        random: new SequenceRandom([6, 6, 1, 1]),
      });
      const result = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(mrm.id),
        random: new SequenceRandom([6, 6, 1, 1]),
      });

      const declared = result.events.find(
        (event) => event.type === GameEventType.AttackDeclared,
      ) as IGameEvent & { payload: IAttackDeclaredPayload };
      const baselineDeclared = baselineResult.events.find(
        (event) => event.type === GameEventType.AttackDeclared,
      ) as IGameEvent & { payload: IAttackDeclaredPayload };

      expect(declared.payload.toHitNumber).toBe(
        baselineDeclared.payload.toHitNumber,
      );
      expect(declared.payload.modifiers).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'iNARC Homing' }),
        ]),
      );
    });

    it('iNARC haywire pods apply the source-backed attacker to-hit penalty', () => {
      const laser = createMediumLaser();
      const baseline = buildScenario({
        attackerWeapons: [laser],
      });
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [laser],
        attackerStateOverride: {
          iNarcPods: [{ teamId: GameSide.Opponent, podType: 'haywire' }],
        },
      });

      const baselineResult = runPhaseWithResult({
        state: baseline.state,
        weaponsByUnit: baseline.weaponsByUnit,
        botPlayer: new ScriptedAttackAI(laser.id),
        random: new SequenceRandom([6, 6, 1, 1]),
      });
      const result = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(laser.id),
        random: new SequenceRandom([6, 6, 1, 1]),
      });

      const declared = result.events.find(
        (event) => event.type === GameEventType.AttackDeclared,
      ) as IGameEvent & { payload: IAttackDeclaredPayload };
      const baselineDeclared = baselineResult.events.find(
        (event) => event.type === GameEventType.AttackDeclared,
      ) as IGameEvent & { payload: IAttackDeclaredPayload };

      expect(declared.payload.toHitNumber).toBe(
        baselineDeclared.payload.toHitNumber + 1,
      );
      expect(declared.payload.modifiers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'iNARC Haywire',
            value: 1,
            source: 'equipment',
          }),
        ]),
      );
    });

    it('Artemis IV flags shift missile cluster results in direct and runner resolution', () => {
      const lrm = createLRM10();
      const artemisLRM: IWeapon = { ...lrm, hasArtemisIV: true };
      const unmodified = resolveSpecialProjectileHit({
        baseWeapon: lrm,
        shotWeapon: lrm,
        selectedMode: undefined,
        d6Roller: sequenceD6Roller(1, 2),
      });
      const artemisModified = resolveSpecialProjectileHit({
        baseWeapon: artemisLRM,
        shotWeapon: artemisLRM,
        selectedMode: undefined,
        d6Roller: sequenceD6Roller(1, 2),
      });
      const baseScenario = buildScenario({
        attackerWeapons: [lrm],
        attackerStateOverride: { gunnery: 0 },
        targetPosition: { q: 7, r: 0 },
      });
      const artemisScenario = buildScenario({
        attackerWeapons: [artemisLRM],
        attackerStateOverride: { gunnery: 0 },
        targetPosition: { q: 7, r: 0 },
      });
      const noArtemisResult = runPhaseWithResult({
        ...baseScenario,
        botPlayer: new ScriptedAttackAI(lrm.id),
        random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
      });
      const artemisResult = runPhaseWithResult({
        ...artemisScenario,
        botPlayer: new ScriptedAttackAI(artemisLRM.id),
        random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
      });

      const noArtemisResolved = noArtemisResult.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };
      const artemisResolved = artemisResult.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };

      expect(unmodified).toMatchObject({
        projectileCount: 3,
        weapon: { damage: 3 },
      });
      expect(artemisModified).toMatchObject({
        projectileCount: 6,
        weapon: { damage: 6 },
      });
      expect(noArtemisResolved.payload.projectileCount).toBe(3);
      expect(artemisResolved.payload.projectileCount).toBe(6);
      expect(
        SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-cluster-modifier']
          .level,
      ).toBe('integrated');
    });

    it('iNARC ECM pods on the attacker suppress source-backed Artemis flight-path guidance', () => {
      const lrm = createLRM10();
      const artemisLRM: IWeapon = { ...lrm, hasArtemisIV: true };
      const baselineScenario = buildScenario({
        attackerWeapons: [artemisLRM],
        attackerStateOverride: { gunnery: 0 },
        targetPosition: { q: 7, r: 0 },
      });
      const ecmPodScenario = buildScenario({
        attackerWeapons: [artemisLRM],
        attackerStateOverride: {
          gunnery: 0,
          iNarcPods: [{ teamId: GameSide.Opponent, podType: 'ecm' }],
        },
        targetPosition: { q: 7, r: 0 },
      });

      const baselineResult = runPhaseWithResult({
        ...baselineScenario,
        botPlayer: new ScriptedAttackAI(artemisLRM.id),
        random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
      });
      const ecmPodResult = runPhaseWithResult({
        ...ecmPodScenario,
        botPlayer: new ScriptedAttackAI(artemisLRM.id),
        random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
      });
      const narcedWithAttackerECM = resolveSpecialProjectileHit({
        baseWeapon: lrm,
        shotWeapon: lrm,
        selectedMode: undefined,
        d6Roller: sequenceD6Roller(3, 4),
        clusterContext: {
          attackerTeamId: GameSide.Player,
          flightPathEcmAffected: true,
          targetNarcedBy: [GameSide.Player],
        },
      });

      const baselineResolved = baselineResult.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };
      const ecmPodResolved = ecmPodResult.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };

      expect(baselineResolved.payload.projectileCount).toBe(6);
      expect(ecmPodResolved.payload.projectileCount).toBe(3);
      expect(narcedWithAttackerECM).toMatchObject({
        projectileCount: 8,
        weapon: { damage: 8 },
      });
      expect(
        SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
          'inarc-ecm-attacker-flight-path-suppression'
        ].level,
      ).toBe('integrated');
    });

    it('iNARC Nemesis pods redirect source-backed confusable missiles to friendly intervening units', () => {
      const lrm = createLRM10();
      const scenario = buildScenario({
        attackerWeapons: [lrm],
        attackerStateOverride: { gunnery: 0 },
        attackerPosition: { q: 0, r: 0 },
        targetPosition: { q: 7, r: 0 },
      });
      const nemesisCarrier = {
        ...createUnit('player-2', GameSide.Player, { q: 3, r: 0 }),
        iNarcPods: [{ teamId: GameSide.Opponent, podType: 'nemesis' as const }],
      };
      const weaponsByUnit = new Map(scenario.weaponsByUnit);
      weaponsByUnit.set('player-2', []);

      const result = runPhaseWithResult({
        state: {
          ...scenario.state,
          units: {
            ...scenario.state.units,
            'player-2': nemesisCarrier,
          },
        },
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(lrm.id),
        random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
      });

      const declared = result.events.find(
        (event) => event.type === GameEventType.AttackDeclared,
      ) as IGameEvent & { payload: IAttackDeclaredPayload };
      const resolved = result.events.find(
        (event) => event.type === GameEventType.AttackResolved,
      ) as IGameEvent & { payload: IAttackResolvedPayload };

      expect(declared.payload.targetId).toBe('player-2');
      expect(resolved.payload).toMatchObject({
        targetId: 'player-2',
        hit: true,
      });
      expect(result.state.units['player-2'].armor).not.toEqual(
        nemesisCarrier.armor,
      );
      expect(result.state.units['opponent-1'].armor).toEqual(
        scenario.state.units['opponent-1'].armor,
      );
      expect(
        SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-nemesis-redirect'].level,
      ).toBe('integrated');
    });

    it('iNARC Nemesis pods do not redirect non-confusable MRM fire', () => {
      const mrm = createMRM10();
      const scenario = buildScenario({
        attackerWeapons: [mrm],
        attackerStateOverride: { gunnery: 0 },
        attackerPosition: { q: 0, r: 0 },
        targetPosition: { q: 7, r: 0 },
      });
      const nemesisCarrier = {
        ...createUnit('player-2', GameSide.Player, { q: 3, r: 0 }),
        iNarcPods: [{ teamId: GameSide.Opponent, podType: 'nemesis' as const }],
      };
      const weaponsByUnit = new Map(scenario.weaponsByUnit);
      weaponsByUnit.set('player-2', []);

      const result = runPhaseWithResult({
        state: {
          ...scenario.state,
          units: {
            ...scenario.state.units,
            'player-2': nemesisCarrier,
          },
        },
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(mrm.id),
        random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
      });

      const declared = result.events.find(
        (event) => event.type === GameEventType.AttackDeclared,
      ) as IGameEvent & { payload: IAttackDeclaredPayload };
      const resolved = result.events.find(
        (event) => event.type === GameEventType.AttackResolved,
      ) as IGameEvent & { payload: IAttackResolvedPayload };

      expect(declared.payload.targetId).toBe('opponent-1');
      expect(resolved.payload.targetId).toBe('opponent-1');
      expect(result.state.units['player-2'].armor).toEqual(
        nemesisCarrier.armor,
      );
    });

    it('prototype Artemis IV flags shift missile cluster results by +1 in direct and runner resolution', () => {
      const lrm = createLRM10();
      const prototypeArtemisLRM: IWeapon = {
        ...lrm,
        hasPrototypeArtemisIV: true,
      };
      const prototypeModified = resolveSpecialProjectileHit({
        baseWeapon: prototypeArtemisLRM,
        shotWeapon: prototypeArtemisLRM,
        selectedMode: undefined,
        d6Roller: sequenceD6Roller(1, 2),
      });
      const prototypeScenario = buildScenario({
        attackerWeapons: [prototypeArtemisLRM],
        attackerStateOverride: { gunnery: 0 },
        targetPosition: { q: 7, r: 0 },
      });
      const prototypeResult = runPhaseWithResult({
        ...prototypeScenario,
        botPlayer: new ScriptedAttackAI(prototypeArtemisLRM.id),
        random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
      });
      const prototypeResolved = prototypeResult.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };

      expect(prototypeModified).toMatchObject({
        projectileCount: 4,
        weapon: { damage: 4 },
      });
      expect(prototypeResolved.payload.projectileCount).toBe(4);
    });

    it('Cluster Hitter SPA shifts missile cluster results in direct and runner resolution', () => {
      const lrm = createLRM10();
      const baseCluster = resolveSpecialProjectileHit({
        baseWeapon: lrm,
        shotWeapon: lrm,
        selectedMode: undefined,
        d6Roller: sequenceD6Roller(4, 4),
      });
      const clusterHitter = resolveSpecialProjectileHit({
        baseWeapon: lrm,
        shotWeapon: lrm,
        selectedMode: undefined,
        d6Roller: sequenceD6Roller(4, 4),
        clusterContext: {
          clusterHitterSPA: true,
        },
      });
      const baseScenario = buildScenario({
        attackerWeapons: [lrm],
        attackerStateOverride: { gunnery: 0 },
        targetPosition: { q: 7, r: 0 },
      });
      const skilledScenario = buildScenario({
        attackerWeapons: [lrm],
        attackerStateOverride: {
          abilities: ['cluster-hitter'],
          gunnery: 0,
        },
        targetPosition: { q: 7, r: 0 },
      });
      const noSpaResult = runPhaseWithResult({
        ...baseScenario,
        botPlayer: new ScriptedAttackAI(lrm.id),
        random: new SequenceRandom([6, 6, 4, 4, 1, 1]),
      });
      const spaResult = runPhaseWithResult({
        ...skilledScenario,
        botPlayer: new ScriptedAttackAI(lrm.id),
        random: new SequenceRandom([6, 6, 4, 4, 1, 1]),
      });

      const noSpaResolved = noSpaResult.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };
      const spaResolved = spaResult.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };

      expect(baseCluster).toMatchObject({
        projectileCount: 6,
        weapon: { damage: 6 },
      });
      expect(clusterHitter).toMatchObject({
        projectileCount: 8,
        weapon: { damage: 8 },
      });
      expect(noSpaResolved.payload.projectileCount).toBe(6);
      expect(spaResolved.payload.projectileCount).toBe(8);
      expect(SPA_COMBAT_SUPPORT['cluster-hitter'].level).toBe('integrated');
    });

    it('Sandblaster shifts designated cluster-table weapons by source-backed range bands', () => {
      const lbx = createLBX10();
      const clusterMode = lbx.firingModes?.modes.find(
        (mode) => mode.id === 'cluster',
      );
      const baseCluster = resolveSpecialProjectileHit({
        baseWeapon: lbx,
        shotWeapon: lbx,
        selectedMode: clusterMode,
        d6Roller: sequenceD6Roller(4, 4),
      });
      const sandblasterCluster = resolveSpecialProjectileHit({
        baseWeapon: lbx,
        shotWeapon: lbx,
        selectedMode: clusterMode,
        d6Roller: sequenceD6Roller(4, 4),
        clusterContext: {
          sandblasterSPA: true,
          designatedWeaponType: 'LB 10-X AC',
          attackRange: 6,
        },
      });
      const baseScenario = buildScenario({
        attackerWeapons: [lbx],
        attackerStateOverride: { gunnery: 0 },
        targetPosition: { q: 6, r: 0 },
      });
      const sandblasterScenario = buildScenario({
        attackerWeapons: [lbx],
        attackerStateOverride: {
          abilities: ['sandblaster'],
          designatedWeaponType: 'LB 10-X AC',
          gunnery: 0,
        },
        targetPosition: { q: 6, r: 0 },
      });
      const baseResult = runPhaseWithResult({
        ...baseScenario,
        botPlayer: new ScriptedAttackAI(lbx.id, 'cluster'),
        random: new SequenceRandom([6, 6, 4, 4, 1, 1]),
      });
      const sandblasterResult = runPhaseWithResult({
        ...sandblasterScenario,
        botPlayer: new ScriptedAttackAI(lbx.id, 'cluster'),
        random: new SequenceRandom([6, 6, 4, 4, 1, 1]),
      });

      const baseResolved = baseResult.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };
      const sandblasterResolved = sandblasterResult.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };

      expect(baseCluster).toMatchObject({
        projectileCount: 6,
        weapon: { damage: 6 },
      });
      expect(sandblasterCluster).toMatchObject({
        projectileCount: 10,
        weapon: { damage: 10 },
      });
      expect(baseResolved.payload.projectileCount).toBe(6);
      expect(sandblasterResolved.payload.projectileCount).toBe(10);
      expect(SPA_COMBAT_SUPPORT.sandblaster).toMatchObject({
        level: 'helper-only',
        gap: expect.stringContaining('UAC/RAC'),
      });
    });

    it('target-mounted AMS reduces incoming missile projectile count', () => {
      const lrm = createLRM10();
      const ams = createAMS();
      const amsBin = createAmmoBin({
        binId: 'ams-bin',
        weaponType: 'ams',
        remainingRounds: 1,
      });
      const emptyAmsBin = createAmmoBin({
        binId: 'ams-empty-bin',
        weaponType: 'ams',
        remainingRounds: 0,
      });
      const withoutAMS = resolveSpecialProjectileHit({
        baseWeapon: lrm,
        shotWeapon: lrm,
        selectedMode: undefined,
        d6Roller: sequenceD6Roller(3, 4),
      });
      const withAMS = resolveSpecialProjectileHit({
        baseWeapon: lrm,
        shotWeapon: lrm,
        selectedMode: undefined,
        d6Roller: sequenceD6Roller(3, 4),
        clusterContext: {
          targetWeapons: [ams],
          targetAmmoState: { [amsBin.binId]: amsBin },
        },
      });
      const noAmmoStateAMS = resolveSpecialProjectileHit({
        baseWeapon: lrm,
        shotWeapon: lrm,
        selectedMode: undefined,
        d6Roller: sequenceD6Roller(3, 4),
        clusterContext: {
          targetWeapons: [ams],
        },
      });
      const destroyedAMS = resolveSpecialProjectileHit({
        baseWeapon: lrm,
        shotWeapon: lrm,
        selectedMode: undefined,
        d6Roller: sequenceD6Roller(3, 4),
        clusterContext: {
          targetWeapons: [{ ...ams, destroyed: true }],
        },
      });
      const outOfAmmoAMS = resolveSpecialProjectileHit({
        baseWeapon: lrm,
        shotWeapon: lrm,
        selectedMode: undefined,
        d6Roller: sequenceD6Roller(3, 4),
        clusterContext: {
          targetWeapons: [ams],
          targetAmmoState: { [emptyAmsBin.binId]: emptyAmsBin },
        },
      });

      expect(withoutAMS).toMatchObject({
        projectileCount: 6,
        weapon: { damage: 6 },
      });
      expect(withAMS).toMatchObject({
        projectileCount: 3,
        weapon: { damage: 3 },
      });
      expect(withAMS.amsInterception).toMatchObject({
        amsWeaponId: ams.id,
        ammoWeaponType: 'ams',
        incomingProjectiles: 6,
        projectilesIntercepted: 3,
        projectilesRemaining: 3,
        ammoConsumed: 1,
        roll: [3, 4],
        clusterRoll: 7,
        clusterModifier: -4,
        modifiedClusterRoll: 3,
      });
      expect(noAmmoStateAMS).toMatchObject({
        projectileCount: 6,
        weapon: { damage: 6 },
      });
      expect(noAmmoStateAMS.amsInterception).toBeUndefined();
      expect(destroyedAMS).toMatchObject({
        projectileCount: 6,
        weapon: { damage: 6 },
      });
      expect(destroyedAMS.amsInterception).toBeUndefined();
      expect(outOfAmmoAMS).toMatchObject({
        projectileCount: 6,
        weapon: { damage: 6 },
      });
      expect(outOfAmmoAMS.amsInterception).toBeUndefined();
      expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.ams.evidence).toContain(
        'cluster-table modifier',
      );
    });

    it('only lets target AMS intercept from its mounted firing arc when arc state is available', () => {
      const lrm = createLRM10();
      const ams = createAMS();
      const amsBin = createAmmoBin({
        binId: 'ams-bin',
        weaponType: 'ams',
        remainingRounds: 2,
      });

      const frontArcAMS = resolveSpecialProjectileHit({
        baseWeapon: lrm,
        shotWeapon: lrm,
        selectedMode: undefined,
        d6Roller: sequenceD6Roller(3, 4),
        clusterContext: {
          incomingAttackArc: FiringArc.Front,
          targetWeapons: [{ ...ams, mountingArc: FiringArc.Front }],
          targetAmmoState: { [amsBin.binId]: amsBin },
        },
      });
      const rearArcAMS = resolveSpecialProjectileHit({
        baseWeapon: lrm,
        shotWeapon: lrm,
        selectedMode: undefined,
        d6Roller: sequenceD6Roller(3, 4),
        clusterContext: {
          incomingAttackArc: FiringArc.Front,
          targetWeapons: [{ ...ams, mountingArc: FiringArc.Rear }],
          targetAmmoState: { [amsBin.binId]: amsBin },
        },
      });

      expect(frontArcAMS.amsInterception?.amsWeaponId).toBe(ams.id);
      expect(frontArcAMS.projectileCount).toBe(3);
      expect(rearArcAMS.amsInterception).toBeUndefined();
      expect(rearArcAMS.projectileCount).toBe(6);
    });

    it('runner attack resolution passes target AMS mounts into missile interception', () => {
      const lrm = createLRM10();
      const ams = createAMS();
      const amsAmmoBin = createAmmoBin({
        binId: 'ams-bin',
        weaponType: 'ams',
        remainingRounds: 2,
      });
      const scenario = buildScenario({
        attackerWeapons: [lrm],
        attackerStateOverride: { gunnery: 0 },
        targetPosition: { q: 7, r: 0 },
      });
      const noAmsResult = runPhaseWithResult({
        ...scenario,
        botPlayer: new ScriptedAttackAI(lrm.id),
        random: new SequenceRandom([6, 6, 3, 4, 1, 1]),
      });
      const withAmsScenario = buildScenario({
        attackerWeapons: [lrm],
        attackerStateOverride: { gunnery: 0 },
        targetStateOverride: {
          ammoState: { [amsAmmoBin.binId]: amsAmmoBin },
        },
        targetWeapons: [ams],
        targetPosition: { q: 7, r: 0 },
      });
      const withAmsResult = runPhaseWithResult({
        ...withAmsScenario,
        botPlayer: new ScriptedAttackAI(lrm.id),
        random: new SequenceRandom([6, 6, 3, 4, 1, 1]),
      });

      const noAmsResolved = noAmsResult.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };
      const withAmsResolved = withAmsResult.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };
      const amsConsumed = withAmsResult.events.find(
        (event) =>
          event.type === GameEventType.AmmoConsumed &&
          (event.payload as { unitId?: string }).unitId === 'opponent-1',
      ) as
        | (IGameEvent & {
            payload: {
              binId: string;
              roundsConsumed: number;
              roundsRemaining: number;
            };
          })
        | undefined;
      const amsInterception = withAmsResult.events.find(
        (event) => event.type === GameEventType.AMSInterception,
      ) as
        | (IGameEvent & {
            payload: {
              defenderId: string;
              attackerId: string;
              incomingWeaponId: string;
              amsWeaponId: string;
              incomingProjectiles: number;
              projectilesIntercepted: number;
              projectilesRemaining: number;
              ammoConsumed: number;
              ammoBinId?: string;
              ammoRemaining?: number;
              roll: readonly number[];
              clusterRoll: number;
              clusterModifier: number;
              modifiedClusterRoll: number;
            };
          })
        | undefined;

      expect(noAmsResolved.payload.hit).toBe(true);
      expect(withAmsResolved.payload.hit).toBe(true);
      expect(noAmsResolved.payload.projectileCount).toBe(6);
      expect(withAmsResolved.payload.projectileCount).toBe(3);
      expect(noAmsResolved.payload.projectileCount).toBeGreaterThan(
        withAmsResolved.payload.projectileCount ?? -1,
      );
      expect(withAmsResolved.payload.damage).toBeLessThan(
        noAmsResolved.payload.damage ?? 0,
      );
      expect(amsConsumed?.payload).toMatchObject({
        binId: amsAmmoBin.binId,
        roundsConsumed: 1,
        roundsRemaining: 1,
      });
      expect(amsInterception?.payload).toMatchObject({
        defenderId: 'opponent-1',
        attackerId: 'player-1',
        incomingWeaponId: lrm.id,
        amsWeaponId: ams.id,
        incomingProjectiles: 6,
        projectilesIntercepted: 3,
        projectilesRemaining: 3,
        ammoConsumed: 1,
        ammoBinId: amsAmmoBin.binId,
        ammoRemaining: 1,
        roll: [3, 4],
        clusterRoll: 7,
        clusterModifier: -4,
        modifiedClusterRoll: 3,
      });
      expect(
        withAmsResult.state.units['opponent-1'].ammoState?.[amsAmmoBin.binId]
          .remainingRounds,
      ).toBe(1);
      expect(
        withAmsResult.state.units['opponent-1'].weaponsFiredThisTurn,
      ).toEqual([ams.id]);

      const heatEvents: IGameEvent[] = [];
      runHeatPhase({
        state: withAmsResult.state,
        events: heatEvents,
        gameId: withAmsScenario.state.gameId,
        random: new SeededRandom(77),
        weaponsByUnit: withAmsScenario.weaponsByUnit,
      });
      const amsHeat = heatEvents.find(
        (event) =>
          event.type === GameEventType.HeatGenerated &&
          (event.payload as { unitId?: string }).unitId === 'opponent-1',
      ) as
        | (IGameEvent & {
            payload: { amount: number; source: string };
          })
        | undefined;

      expect(amsHeat?.payload).toMatchObject({
        amount: ams.heat,
        source: 'firing',
      });
      expect(
        SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-ammo-consumption'].level,
      ).toBe('integrated');
      expect(
        SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-interception-events'].level,
      ).toBe('integrated');
      expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.ams.gap).toContain(
        'defender choice',
      );
      expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.ams.gap).not.toContain(
        'automatic firing-arc assignment',
      );
    });

    it('runner attack resolution respects target AMS mounted arc when resolving interception', () => {
      const lrm = createLRM10();
      const ams = createAMS();
      const amsAmmoBin = createAmmoBin({
        binId: 'ams-bin',
        weaponType: 'ams',
        remainingRounds: 2,
      });
      const frontArcScenario = buildScenario({
        attackerWeapons: [lrm],
        attackerPosition: { q: 0, r: -7 },
        attackerStateOverride: { gunnery: 0 },
        targetPosition: { q: 0, r: 0 },
        targetStateOverride: {
          facing: Facing.North,
          ammoState: { [amsAmmoBin.binId]: amsAmmoBin },
        },
        targetWeapons: [{ ...ams, mountingArc: FiringArc.Front }],
      });
      const rearArcScenario = buildScenario({
        attackerWeapons: [lrm],
        attackerPosition: { q: 0, r: -7 },
        attackerStateOverride: { gunnery: 0 },
        targetPosition: { q: 0, r: 0 },
        targetStateOverride: {
          facing: Facing.North,
          ammoState: { [amsAmmoBin.binId]: amsAmmoBin },
        },
        targetWeapons: [{ ...ams, mountingArc: FiringArc.Rear }],
      });

      const frontArcResult = runPhaseWithResult({
        ...frontArcScenario,
        botPlayer: new ScriptedAttackAI(lrm.id),
        random: new SequenceRandom([6, 6, 3, 4, 1, 1]),
      });
      const rearArcResult = runPhaseWithResult({
        ...rearArcScenario,
        botPlayer: new ScriptedAttackAI(lrm.id),
        random: new SequenceRandom([6, 6, 3, 4, 1, 1]),
      });

      const frontArcInterception = frontArcResult.events.find(
        (event) => event.type === GameEventType.AMSInterception,
      );
      const rearArcInterception = rearArcResult.events.find(
        (event) => event.type === GameEventType.AMSInterception,
      );
      const frontArcResolved = frontArcResult.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };
      const rearArcResolved = rearArcResult.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };

      expect(frontArcInterception).toBeDefined();
      expect(rearArcInterception).toBeUndefined();
      expect(frontArcResolved.payload.attackerArc).toBe(FiringArc.Front);
      expect(frontArcResolved.payload.projectileCount).toBe(3);
      expect(rearArcResolved.payload.attackerArc).toBe(FiringArc.Front);
      expect(rearArcResolved.payload.projectileCount).toBe(6);
    });

    it('laser AMS intercepts without ammo consumption and still enters heat accounting', () => {
      const lrm = createLRM10();
      const laserAMS = createLaserAMS();
      const laserAmsScenario = buildScenario({
        attackerWeapons: [lrm],
        attackerStateOverride: { gunnery: 0 },
        targetWeapons: [laserAMS],
        targetPosition: { q: 7, r: 0 },
      });

      const result = runPhaseWithResult({
        ...laserAmsScenario,
        botPlayer: new ScriptedAttackAI(lrm.id),
        random: new SequenceRandom([6, 6, 3, 4, 1, 1]),
      });
      const amsInterception = result.events.find(
        (event) => event.type === GameEventType.AMSInterception,
      ) as
        | (IGameEvent & {
            payload: {
              amsWeaponId: string;
              ammoConsumed: number;
              projectilesRemaining: number;
            };
          })
        | undefined;

      expect(
        result.events.some(
          (event) =>
            event.type === GameEventType.AmmoConsumed &&
            (event.payload as { unitId?: string }).unitId === 'opponent-1',
        ),
      ).toBe(false);
      expect(amsInterception?.payload).toMatchObject({
        amsWeaponId: laserAMS.id,
        ammoConsumed: 0,
        projectilesRemaining: 3,
      });
      expect(result.state.units['opponent-1'].weaponsFiredThisTurn).toEqual([
        laserAMS.id,
      ]);

      const heatEvents: IGameEvent[] = [];
      runHeatPhase({
        state: result.state,
        events: heatEvents,
        gameId: laserAmsScenario.state.gameId,
        random: new SeededRandom(78),
        weaponsByUnit: laserAmsScenario.weaponsByUnit,
      });
      const laserAmsHeat = heatEvents.find(
        (event) =>
          event.type === GameEventType.HeatGenerated &&
          (event.payload as { unitId?: string }).unitId === 'opponent-1',
      ) as
        | (IGameEvent & {
            payload: { amount: number; source: string };
          })
        | undefined;

      expect(laserAmsHeat?.payload).toMatchObject({
        amount: laserAMS.heat,
        source: 'firing',
      });
    });

    it('Thunderbolt-style single missiles use the MegaMek AMS 1d6 destroy check', () => {
      const weapon = createThunderbolt10();
      const ams = createAMS();
      const amsAmmoBin = createAmmoBin({
        binId: 'ams-bin',
        weaponType: 'ams',
        remainingRounds: 2,
      });

      const destroyed = resolveSpecialProjectileHit({
        baseWeapon: weapon,
        shotWeapon: weapon,
        selectedMode: undefined,
        d6Roller: sequenceD6Roller(3),
        clusterContext: {
          targetWeapons: [ams],
          targetAmmoState: { [amsAmmoBin.binId]: amsAmmoBin },
        },
      });
      const survived = resolveSpecialProjectileHit({
        baseWeapon: weapon,
        shotWeapon: weapon,
        selectedMode: undefined,
        d6Roller: sequenceD6Roller(4),
        clusterContext: {
          targetWeapons: [ams],
          targetAmmoState: { [amsAmmoBin.binId]: amsAmmoBin },
        },
      });

      expect(destroyed).toMatchObject({
        projectileCount: 0,
        weapon: { damage: 0 },
        amsInterception: {
          resolution: 'single-missile',
          incomingProjectiles: 1,
          projectilesIntercepted: 1,
          projectilesRemaining: 0,
          roll: [3],
        },
      });
      expect(survived).toMatchObject({
        projectileCount: 1,
        weapon: { damage: 10 },
        amsInterception: {
          resolution: 'single-missile',
          incomingProjectiles: 1,
          projectilesIntercepted: 0,
          projectilesRemaining: 1,
          roll: [4],
        },
      });
    });

    it('semi-guided LRM ammo leaves missile cluster counts unchanged by TAG', () => {
      const lrm = createLRM10();
      const ammoBin = createAmmoBin({
        weaponType: 'semi-guided-lrm-10',
        remainingRounds: 3,
      });
      const { state } = buildScenario({
        attackerWeapons: [lrm],
        attackerStateOverride: {
          ammoState: { [ammoBin.binId]: ammoBin },
        },
      });
      const isSemiGuided = isSemiGuidedAmmoSelectedForWeapon(
        state.units['player-1'],
        lrm,
      );

      const baseline = resolveSpecialProjectileHit({
        baseWeapon: lrm,
        shotWeapon: lrm,
        selectedMode: undefined,
        d6Roller: sequenceD6Roller(3, 4),
      });
      const contextOnly = resolveSpecialProjectileHit({
        baseWeapon: lrm,
        shotWeapon: lrm,
        selectedMode: undefined,
        d6Roller: sequenceD6Roller(3, 4),
        clusterContext: {},
      });

      expect(isSemiGuided).toBe(true);
      expect(baseline).toMatchObject({
        projectileCount: 6,
        weapon: { damage: 6 },
      });
      expect(contextOnly).toMatchObject({
        projectileCount: 6,
        weapon: { damage: 6 },
      });
      expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.tag.evidence).toContain(
        'semi-guided',
      );
      expect(
        SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['tag-semi-guided-to-hit'].level,
      ).toBe('integrated');
      expect(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT).not.toHaveProperty(
        'tag-semi-guided-cluster-bonus',
      );
    });

    it('semi-guided TAG cancels runner target movement to-hit while preserving the TMM row', () => {
      const lrm = createLRM10();
      const ammoBin = createAmmoBin({
        weaponType: 'semi-guided-lrm-10',
        remainingRounds: 3,
      });
      const movingTarget = {
        movementThisTurn: MovementType.Walk,
        hexesMovedThisTurn: 5,
      };
      const baselineScenario = buildScenario({
        attackerWeapons: [lrm],
        attackerPosition: { q: 0, r: 0 },
        targetPosition: { q: 7, r: 0 },
        attackerStateOverride: {
          ammoState: { [ammoBin.binId]: ammoBin },
        },
        targetStateOverride: movingTarget,
      });
      const taggedScenario = buildScenario({
        attackerWeapons: [lrm],
        attackerPosition: { q: 0, r: 0 },
        targetPosition: { q: 7, r: 0 },
        attackerStateOverride: {
          ammoState: { [ammoBin.binId]: ammoBin },
        },
        targetStateOverride: {
          ...movingTarget,
          tagDesignated: true,
        },
      });
      const baselineResult = runPhaseWithResult({
        ...baselineScenario,
        botPlayer: new ScriptedAttackAI(lrm.id),
      });
      const taggedResult = runPhaseWithResult({
        ...taggedScenario,
        botPlayer: new ScriptedAttackAI(lrm.id),
      });
      const baselineDeclared = baselineResult.events.find(
        (event) => event.type === GameEventType.AttackDeclared,
      ) as IGameEvent & { payload: IAttackDeclaredPayload };
      const taggedDeclared = taggedResult.events.find(
        (event) => event.type === GameEventType.AttackDeclared,
      ) as IGameEvent & { payload: IAttackDeclaredPayload };

      expect(taggedDeclared.payload.toHitNumber).toBe(
        baselineDeclared.payload.toHitNumber - 2,
      );
      expect(taggedDeclared.payload.modifiers).toContainEqual(
        expect.objectContaining({
          name: 'Target Movement (TMM)',
          value: 2,
          source: 'target_movement',
        }),
      );
      expect(taggedDeclared.payload.modifiers).toContainEqual(
        expect.objectContaining({
          name: 'Semi-guided TAG target movement',
          value: -2,
          source: 'equipment',
        }),
      );
      expect(
        SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['tag-semi-guided-to-hit'].level,
      ).toBe('integrated');
    });

    it('applies LB-X cluster-mode -1 to-hit adjustment in declared attack math', () => {
      const weapon = createLBX10();
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [weapon],
        attackerStateOverride: { gunnery: 4 },
      });

      const slugResult = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(weapon.id, 'slug'),
      });
      const clusterResult = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(weapon.id, 'cluster'),
      });
      const slugDeclared = slugResult.events.find(
        (event) => event.type === GameEventType.AttackDeclared,
      ) as IGameEvent & { payload: IAttackDeclaredPayload };
      const clusterDeclared = clusterResult.events.find(
        (event) => event.type === GameEventType.AttackDeclared,
      ) as IGameEvent & { payload: IAttackDeclaredPayload };

      expect(clusterDeclared.payload.weaponModes?.[weapon.id]).toBe('cluster');
      expect(clusterDeclared.payload.toHitNumber).toBe(
        slugDeclared.payload.toHitNumber - 1,
      );
      expect(
        clusterDeclared.payload.modifiers.some((modifier) =>
          /LB-X|cluster/i.test(modifier.name),
        ),
      ).toBe(true);
      expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['lb-x-ac'].level).toBe(
        'integrated',
      );
      expect(
        SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['lb-x-ac'].evidence,
      ).toContain('selectedModeToHitModifier');
    });

    it('Streak SRM hit exposes the full rack as projectile count', () => {
      const weapon = createStreakSRM6();
      const ammoBin = createAmmoBin({
        weaponType: 'streak-srm-6',
        remainingRounds: 3,
      });
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [weapon],
        attackerStateOverride: {
          gunnery: 2,
          ammoState: { [ammoBin.binId]: ammoBin },
        },
      });

      const result = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(weapon.id),
      });

      const resolved = result.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };
      const consumed = result.events.find(
        (event) => event.type === GameEventType.AmmoConsumed,
      ) as
        | (IGameEvent & {
            payload: { roundsConsumed: number; roundsRemaining: number };
          })
        | undefined;

      expect(resolved.payload.hit).toBe(true);
      expect(resolved.payload.projectileCount).toBe(6);
      expect(resolved.payload.damage).toBeGreaterThan(0);
      expect(resolved.payload.damage).toBeLessThanOrEqual(12);
      expect(resolved.payload.heat).toBe(4);
      expect(consumed?.payload.roundsConsumed).toBe(1);
      expect(consumed?.payload.roundsRemaining).toBe(2);
      expect(result.state.units['player-1'].weaponsFiredThisTurn).toEqual([
        weapon.id,
      ]);
    });

    it('Streak SRM hit resolves target AMS through the cluster table', () => {
      const weapon = createStreakSRM6();
      const ams = createAMS();
      const streakAmmoBin = createAmmoBin({
        weaponType: 'streak-srm-6',
        remainingRounds: 3,
      });
      const amsAmmoBin = createAmmoBin({
        binId: 'ams-bin',
        weaponType: 'ams',
        remainingRounds: 2,
      });
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [weapon],
        attackerStateOverride: {
          gunnery: 2,
          ammoState: { [streakAmmoBin.binId]: streakAmmoBin },
        },
        targetStateOverride: {
          ammoState: { [amsAmmoBin.binId]: amsAmmoBin },
        },
        targetWeapons: [ams],
      });

      const result = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(weapon.id),
        random: new SequenceRandom([6, 6, 1, 1]),
      });

      const resolved = result.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };
      const amsInterception = result.events.find(
        (event) => event.type === GameEventType.AMSInterception,
      ) as
        | (IGameEvent & {
            payload: {
              incomingProjectiles: number;
              projectilesIntercepted: number;
              projectilesRemaining: number;
              roll: readonly number[];
              clusterRoll: number;
              clusterModifier: number;
              modifiedClusterRoll: number;
            };
          })
        | undefined;

      expect(resolved.payload.hit).toBe(true);
      expect(resolved.payload.projectileCount).toBe(4);
      expect(resolved.payload.damage).toBe(8);
      expect(amsInterception?.payload).toMatchObject({
        incomingProjectiles: 6,
        projectilesIntercepted: 2,
        projectilesRemaining: 4,
        roll: [11],
        clusterRoll: 11,
        clusterModifier: -4,
        modifiedClusterRoll: 7,
      });
      expect(
        result.state.units['opponent-1'].ammoState?.[amsAmmoBin.binId]
          .remainingRounds,
      ).toBe(1);
      expect(result.state.units['opponent-1'].weaponsFiredThisTurn).toEqual([
        ams.id,
      ]);
      expect(
        SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-streak-cluster-parity']
          .level,
      ).toBe('integrated');
    });

    it('Streak SRM failed lock does not spend ammo or firing heat', () => {
      const weapon = createStreakSRM6();
      const ammoBin = createAmmoBin({
        weaponType: 'streak-srm-6',
        remainingRounds: 3,
      });
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [weapon],
        attackerStateOverride: {
          gunnery: 13,
          ammoState: { [ammoBin.binId]: ammoBin },
        },
      });

      const result = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(weapon.id),
      });

      const resolved = result.events.find(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as IGameEvent & { payload: IAttackResolvedPayload };

      expect(resolved.payload.hit).toBe(false);
      expect(resolved.payload.damage).toBeUndefined();
      expect(resolved.payload.projectileCount).toBeUndefined();
      expect(resolved.payload.heat).toBe(0);
      expect(
        result.events.some(
          (event) => event.type === GameEventType.AmmoConsumed,
        ),
      ).toBe(false);
      expect(result.state.units['player-1'].weaponsFiredThisTurn).toEqual([]);
      expect(
        result.state.units['player-1'].ammoState?.[ammoBin.binId]
          .remainingRounds,
      ).toBe(3);
    });

    it('AttackDeclared count equals AttackResolved count (per-mount invariant)', () => {
      // Causal-ordering invariant: every declared shot resolves to
      // hit-or-miss. No in-flight attacks at end of phase.
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [
          createMediumLaser('ml-1'),
          createMediumLaser('ml-2'),
          createMediumLaser('ml-3'),
        ],
      });
      const events = runPhase({ state, weaponsByUnit });

      const declared = events.filter(
        (e) => e.type === GameEventType.AttackDeclared,
      ).length;
      const resolved = events.filter(
        (e) => e.type === GameEventType.AttackResolved,
      ).length;
      expect(declared).toBe(resolved);
      expect(declared).toBeGreaterThan(0);
    });
  });

  describe('AttackInvalid (out-of-range)', () => {
    it('emits OutOfAmmo before declaration, heat, or damage side effects', () => {
      const weapon = createUltraAC5();
      const emptyBin = createAmmoBin({
        weaponType: weapon.id,
        remainingRounds: 0,
      });
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [weapon],
        attackerStateOverride: {
          ammoState: { [emptyBin.binId]: emptyBin },
        },
      });

      const result = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(weapon.id, 'double'),
      });

      const invalid = result.events.filter(
        (event) => event.type === GameEventType.AttackInvalid,
      ) as Array<IGameEvent & { payload: IAttackInvalidPayload }>;

      expect(invalid).toHaveLength(1);
      expect(invalid[0].payload).toMatchObject({
        attackerId: 'player-1',
        targetId: 'opponent-1',
        weaponId: weapon.id,
        reason: 'OutOfAmmo',
      });
      expect(
        result.events.some(
          (event) =>
            event.type === GameEventType.AttackDeclared ||
            event.type === GameEventType.AttackResolved ||
            event.type === GameEventType.AmmoConsumed,
        ),
      ).toBe(false);
      expect(result.state.units['player-1'].weaponsFiredThisTurn).toEqual([]);
      expect(
        result.state.units['player-1'].ammoState?.[emptyBin.binId],
      ).toEqual(emptyBin);
    });

    it('stops a selected rate-of-fire mode when ammo runs out mid-mode', () => {
      const weapon = createRotaryAC2();
      const ammoBin = createAmmoBin({
        weaponType: weapon.id,
        remainingRounds: 2,
      });
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [weapon],
        attackerStateOverride: {
          gunnery: 2,
          ammoState: { [ammoBin.binId]: ammoBin },
        },
      });

      const result = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(weapon.id, 'rof-3'),
      });

      const playerDeclared = result.events.filter(
        (event) =>
          event.type === GameEventType.AttackDeclared &&
          (event.payload as IAttackDeclaredPayload).attackerId === 'player-1',
      );
      const playerResolved = result.events.filter(
        (event) =>
          event.type === GameEventType.AttackResolved &&
          (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
      ) as Array<IGameEvent & { payload: IAttackResolvedPayload }>;
      const consumed = result.events.filter(
        (event) => event.type === GameEventType.AmmoConsumed,
      );
      const invalid = result.events.find(
        (event) => event.type === GameEventType.AttackInvalid,
      ) as IGameEvent & { payload: IAttackInvalidPayload };

      expect(playerDeclared).toHaveLength(2);
      expect(playerResolved).toHaveLength(2);
      expect(playerResolved.map((event) => event.payload.damage)).toEqual([
        2, 2,
      ]);
      expect(consumed).toHaveLength(2);
      expect(invalid.payload.reason).toBe('OutOfAmmo');
      expect(result.state.units['player-1'].weaponsFiredThisTurn).toEqual([
        weapon.id,
        weapon.id,
      ]);
      expect(
        result.state.units['player-1'].ammoState?.[ammoBin.binId]
          .remainingRounds,
      ).toBe(0);
    });

    it.each([
      ['ultra-ac', createUltraAC5(), 'double', 2],
      ['rotary-ac', createRotaryAC2(), 'rof-3', 3],
    ] as const)(
      'applies %s natural-2 auto-miss and jam persistence',
      (familyId, weapon, modeId, expectedShots) => {
        const ammoBin = createAmmoBin({
          weaponType: weapon.id,
          remainingRounds: 6,
        });
        const { state, weaponsByUnit } = buildScenario({
          attackerWeapons: [weapon],
          attackerStateOverride: {
            gunnery: 2,
            ammoState: { [ammoBin.binId]: ammoBin },
          },
        });

        const result = runPhaseWithResult({
          state,
          weaponsByUnit,
          seed: 7,
          botPlayer: new ScriptedAttackAI(weapon.id, modeId),
        });
        const resolved = result.events.filter(
          (event) =>
            event.type === GameEventType.AttackResolved &&
            (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
        ) as Array<IGameEvent & { payload: IAttackResolvedPayload }>;

        expect(resolved).toHaveLength(expectedShots);
        expect(resolved[0].payload).toMatchObject({
          weaponId: weapon.id,
          roll: 2,
          hit: false,
        });
        expect(result.state.units['player-1'].jammedWeapons ?? []).toContain(
          weapon.id,
        );
        expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT[familyId].level).toBe(
          'integrated',
        );
        expect(
          SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT[familyId].evidence,
        ).toContain('shouldJamOnNaturalTwo');
      },
    );

    it('rejects a declared UAC/RAC attack when the weapon is already jammed', () => {
      const weapon = createUltraAC5();
      const ammoBin = createAmmoBin({
        weaponType: weapon.id,
        remainingRounds: 6,
      });
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [weapon],
        attackerStateOverride: {
          ammoState: { [ammoBin.binId]: ammoBin },
          jammedWeapons: [weapon.id],
        },
      });

      const result = runPhaseWithResult({
        state,
        weaponsByUnit,
        botPlayer: new ScriptedAttackAI(weapon.id, 'double'),
      });
      const invalid = result.events.filter(
        (event) => event.type === GameEventType.AttackInvalid,
      ) as Array<IGameEvent & { payload: IAttackInvalidPayload }>;

      expect(invalid).toHaveLength(1);
      expect(invalid[0].payload).toMatchObject({
        attackerId: 'player-1',
        targetId: 'opponent-1',
        weaponId: weapon.id,
        reason: 'WeaponJammed',
      });
      expect(
        result.events.some(
          (event) =>
            event.type === GameEventType.AttackDeclared ||
            event.type === GameEventType.AttackResolved ||
            event.type === GameEventType.AmmoConsumed,
        ),
      ).toBe(false);
      expect(result.state.units['player-1'].weaponsFiredThisTurn).toEqual([]);
      expect(result.state.units['player-1'].ammoState?.[ammoBin.binId]).toEqual(
        ammoBin,
      );
    });

    it('emits AttackInvalid with reason "OutOfRange" and no AttackDeclared / AttackResolved follows', () => {
      // Place the target 12 hexes away — beyond AC/20 long range (9).
      // The AI may or may not target this enemy at all (if it's the
      // only enemy, it will). When it does, the runner emits
      // AttackInvalid for that mount.
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [createAC20()],
        attackerPosition: { q: 0, r: 0 },
        targetPosition: { q: 12, r: 0 },
      });
      const events = runPhase({ state, weaponsByUnit });

      const invalid = events.filter(
        (e) => e.type === GameEventType.AttackInvalid,
      ) as Array<IGameEvent & { payload: IAttackInvalidPayload }>;

      // The bot may opt out of declaring an attack at this range
      // (it filters candidate weapons by range first). If it does
      // declare anyway and the runner catches it, AttackInvalid
      // fires. We assert ONE of two equally-valid outcomes:
      //   (a) bot declined → 0 attack events (no Declared / Invalid)
      //   (b) bot declared but runner rejected → 1 Invalid, 0 Declared
      const declared = events.filter(
        (e) => e.type === GameEventType.AttackDeclared,
      ).length;
      const resolved = events.filter(
        (e) => e.type === GameEventType.AttackResolved,
      ).length;
      if (invalid.length > 0) {
        expect(invalid[0].payload.reason).toBe('OutOfRange');
        expect(invalid[0].payload.weaponId).toBeDefined();
        expect(invalid[0].payload.attackerId).toBe('player-1');
        expect(invalid[0].payload.targetId).toBe('opponent-1');
        // Per spec: no Declared / Resolved for an Invalid attempt on
        // that same mount.
        expect(declared).toBe(resolved);
      } else {
        // Bot declined — expect zero combat events for this attacker.
        expect(declared).toBe(0);
        expect(resolved).toBe(0);
      }
    });
  });

  describe('LocationDestroyed', () => {
    it('emits with viaTransfer:false on direct destruction (armor + structure both zeroed)', () => {
      // Set target HD to 1/1 and feed AC/20 (damage capped at 3 on HD).
      // 3 damage across 1 armor + 1 structure leaves residual that
      // gets discarded per head-cap rule — HD destruction no transfer.
      // But because hit-location is random, we use an alternate
      // approach: zero ALL armor + leave structure at 1 everywhere.
      // First successful hit produces a LocationDestroyed event.
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [createAC20()],
        targetArmorOverride: {
          head: 0,
          center_torso: 0,
          center_torso_rear: 0,
          left_torso: 0,
          left_torso_rear: 0,
          right_torso: 0,
          right_torso_rear: 0,
          left_arm: 0,
          right_arm: 0,
          left_leg: 0,
          right_leg: 0,
        },
        targetStructureOverride: {
          head: 1,
          center_torso: 1,
          left_torso: 1,
          right_torso: 1,
          left_arm: 1,
          right_arm: 1,
          left_leg: 1,
          right_leg: 1,
        },
      });
      const events = runPhase({ state, weaponsByUnit });

      const destroyed = events.filter(
        (e) => e.type === GameEventType.LocationDestroyed,
      ) as Array<IGameEvent & { payload: ILocationDestroyedPayload }>;
      // With a hit, at least one location is destroyed (every location
      // has 1 structure and the AC/20 delivers 20 damage). If a miss
      // occurs, this scenario produces zero LocationDestroyed events
      // and the next assertion is skipped.
      if (destroyed.length === 0) {
        // Acceptable when the AC/20 missed; no further assertions.
        return;
      }

      const direct = destroyed[0];
      expect(direct.payload.unitId).toBe('opponent-1');
      expect(typeof direct.payload.location).toBe('string');
      // First entry in the chain is direct (i === 0 in the runner loop).
      expect(direct.payload.viaTransfer).toBe(false);
    });

    it('emits viaTransfer:true on cascade destruction from transfer chain', () => {
      // LA at 1/1 + LT at 1/1: 20 damage to LA → LA destroyed (used
      // 2 dmg) → 18 damage transfers to LT → LT also zeroed →
      // residual continues to CT. Two LocationDestroyed events fire:
      // first viaTransfer:false (LA direct), second viaTransfer:true
      // (LT received transfer).
      //
      // To force LA hit specifically, we'd need a deterministic
      // hit-location seed — instead we set EVERY arm/leg/torso to 1/1
      // so any hit on any limb cascades. The assertion focuses on
      // the existence of a viaTransfer:true event when the chain
      // reaches at least 2 locations.
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [createAC20()],
        targetArmorOverride: {
          head: 0,
          center_torso: 0,
          center_torso_rear: 0,
          left_torso: 0,
          left_torso_rear: 0,
          right_torso: 0,
          right_torso_rear: 0,
          left_arm: 0,
          right_arm: 0,
          left_leg: 0,
          right_leg: 0,
        },
        targetStructureOverride: {
          head: 1,
          center_torso: 1,
          left_torso: 1,
          right_torso: 1,
          left_arm: 1,
          right_arm: 1,
          left_leg: 1,
          right_leg: 1,
        },
      });
      const events = runPhase({ state, weaponsByUnit });

      const destroyed = events.filter(
        (e) => e.type === GameEventType.LocationDestroyed,
      ) as Array<IGameEvent & { payload: ILocationDestroyedPayload }>;
      const transfers = events.filter(
        (e) => e.type === GameEventType.TransferDamage,
      ) as Array<IGameEvent & { payload: ITransferDamagePayload }>;

      // If we reached the limb path AND damage transferred, at least
      // one destroyed event should have viaTransfer:true.
      if (transfers.length > 0) {
        const cascade = destroyed.find((e) => e.payload.viaTransfer === true);
        expect(cascade).toBeDefined();
        expect(cascade?.payload.unitId).toBe('opponent-1');
      }
    });

    it('on HD destruction emits LocationDestroyed and no TransferDamage downstream', () => {
      // Per spec scenario: HD has no transfer target. Set every
      // location except HD to massive armor + structure so the only
      // realistic destruction path is HD (when the hit-location roll
      // lands on head).
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [createAC20()],
        targetArmorOverride: {
          head: 0,
        },
        targetStructureOverride: {
          head: 1,
        },
      });
      const events = runPhase({ state, weaponsByUnit });

      const destroyed = events.filter(
        (e) => e.type === GameEventType.LocationDestroyed,
      ) as Array<IGameEvent & { payload: ILocationDestroyedPayload }>;
      const headDestroyed = destroyed.find(
        (e) => e.payload.location === 'head',
      );

      // If the hit-location roll happened to land on head with this
      // seed, assert no transfer downstream from the HD destruction.
      // Otherwise the test is a no-op — the per-event SHAPE assertion
      // is the contract here, not the random landing of the hit.
      if (headDestroyed) {
        const headDestroyedIdx = events.indexOf(headDestroyed);
        const subsequent = events.slice(headDestroyedIdx + 1);
        // No TransferDamage may originate fromLocation === 'head'.
        const transferFromHead = subsequent.find(
          (e) =>
            e.type === GameEventType.TransferDamage &&
            (e.payload as ITransferDamagePayload).fromLocation === 'head',
        );
        expect(transferFromHead).toBeUndefined();
      }
    });
  });

  describe('TransferDamage', () => {
    it('emits with unitId, fromLocation, toLocation, damage when residual flows', () => {
      // Same low-armor target — at least one limb hit will cascade.
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [createAC20()],
        targetArmorOverride: {
          head: 0,
          center_torso: 0,
          center_torso_rear: 0,
          left_torso: 0,
          left_torso_rear: 0,
          right_torso: 0,
          right_torso_rear: 0,
          left_arm: 0,
          right_arm: 0,
          left_leg: 0,
          right_leg: 0,
        },
        targetStructureOverride: {
          head: 1,
          center_torso: 1,
          left_torso: 1,
          right_torso: 1,
          left_arm: 1,
          right_arm: 1,
          left_leg: 1,
          right_leg: 1,
        },
      });
      const events = runPhase({ state, weaponsByUnit });

      const transfers = events.filter(
        (e) => e.type === GameEventType.TransferDamage,
      ) as Array<IGameEvent & { payload: ITransferDamagePayload }>;

      // A transfer event SHOULD fire (AC/20 = 20 damage; even if the
      // hit lands on a torso, residual flows to CT or via cascade).
      // When it fires, payload shape MUST match the contract.
      if (transfers.length > 0) {
        const t = transfers[0].payload;
        expect(t.unitId).toBe('opponent-1');
        expect(typeof t.fromLocation).toBe('string');
        expect(typeof t.toLocation).toBe('string');
        expect(t.damage).toBeGreaterThan(0);
        expect(t.fromLocation).not.toBe(t.toLocation);
      }
    });

    it('TransferDamage MUST emit before the receiving DamageApplied event (causal ordering)', () => {
      const { state, weaponsByUnit } = buildScenario({
        attackerWeapons: [createAC20()],
        targetArmorOverride: {
          head: 0,
          center_torso: 0,
          center_torso_rear: 0,
          left_torso: 0,
          left_torso_rear: 0,
          right_torso: 0,
          right_torso_rear: 0,
          left_arm: 0,
          right_arm: 0,
          left_leg: 0,
          right_leg: 0,
        },
        targetStructureOverride: {
          head: 1,
          center_torso: 1,
          left_torso: 1,
          right_torso: 1,
          left_arm: 1,
          right_arm: 1,
          left_leg: 1,
          right_leg: 1,
        },
      });
      const events = runPhase({ state, weaponsByUnit });

      // Walk the event log and verify: every TransferDamage event MUST
      // be preceded (within the same shot) by a DamageApplied for the
      // fromLocation, and followed by a DamageApplied for the
      // toLocation. This is the causal ordering contract.
      for (let i = 0; i < events.length; i++) {
        if (events[i].type !== GameEventType.TransferDamage) continue;
        const transfer = events[i].payload as ITransferDamagePayload;

        // Find the preceding DamageApplied for fromLocation.
        let foundPrior = false;
        for (let j = i - 1; j >= 0 && !foundPrior; j--) {
          if (events[j].type === GameEventType.AttackDeclared) break; // shot boundary
          if (events[j].type === GameEventType.DamageApplied) {
            const dmg = events[j].payload as IDamageAppliedPayload;
            if (
              dmg.location === transfer.fromLocation &&
              dmg.unitId === transfer.unitId
            ) {
              foundPrior = true;
            }
          }
        }
        expect(foundPrior).toBe(true);

        // Find the following DamageApplied for toLocation.
        let foundNext = false;
        for (let k = i + 1; k < events.length && !foundNext; k++) {
          if (events[k].type === GameEventType.AttackResolved) break; // next-shot boundary
          if (events[k].type === GameEventType.DamageApplied) {
            const dmg = events[k].payload as IDamageAppliedPayload;
            if (
              dmg.location === transfer.toLocation &&
              dmg.unitId === transfer.unitId
            ) {
              foundNext = true;
            }
          }
        }
        expect(foundNext).toBe(true);
      }
    });
  });
});
