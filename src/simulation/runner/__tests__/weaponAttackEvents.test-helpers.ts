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
import { WEAPON_CATALOG_FILES } from '@/utils/construction/equipmentBVCatalogData';

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
import { resolveAMSInterception } from '../phases/weaponAttackAMS';
import {
  isSemiGuidedAmmoSelectedForWeapon,
  resolveSandblasterAutocannonRateOfFireShotCount,
  resolveSpecialProjectileHit,
} from '../phases/weaponAttackFiringModes';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';
import {
  buildWeaponLookupFromCatalogFiles,
  toAIWeapon,
  type ICatalogWeaponStats,
} from '../UnitHydration';

export const weaponLookup = buildWeaponLookupFromCatalogFiles(
  WEAPON_CATALOG_FILES as readonly { items?: readonly unknown[] }[],
);

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
export function createAC20(id = 'ac-20-test'): IWeapon {
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

export function createTacOpsRapidFireAC20(
  id = 'ac-20-rapid-fire-test',
): IWeapon {
  return {
    ...createAC20(id),
    firingModes: {
      kind: 'rate-of-fire',
      defaultModeId: 'single',
      modes: [
        { id: 'single', damage: 20, heat: 7, shotsPerTurn: 1 },
        { id: 'rapid-fire', damage: 40, heat: 14, shotsPerTurn: 2 },
      ],
    },
  };
}

/**
 * Medium laser stand-in with deliberately low long range so we can
 * trigger an out-of-range scenario by spacing the units beyond
 * `longRange = 9`.
 */
export function createMediumLaser(id = 'medium-laser-test'): IWeapon {
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

export function createPlasmaCannon(id = 'clan-plasma-cannon'): IWeapon {
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

export function createUltraAC5(id = 'uac-5-test'): IWeapon {
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

export function createRotaryAC2(id = 'rac-2-test'): IWeapon {
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

export function createLBX10(id = 'lb-10-x-ac-0'): IWeapon {
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

export function createMML3(id = 'mml-3-0'): IWeapon {
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

export function createNarcBeacon(id = 'narc-0'): IWeapon {
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

export function createINarcBeacon(id = 'inarc-0'): IWeapon {
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

export function createSelectableINarcBeacon(id = 'inarc-0'): IWeapon {
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
        {
          id: 'explosive',
          damage: 0,
          heat: 0,
          shotsPerTurn: 1,
          ammoWeaponType: 'inarc-explosive-pods',
        },
        {
          id: 'unknown',
          damage: 0,
          heat: 0,
          shotsPerTurn: 1,
          ammoWeaponType: 'experimental-pods',
        },
      ],
    },
  };
}

export function createTAGDesignator(id = 'tag-0'): IWeapon {
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

export function createAMS(id = 'ams-0'): IWeapon {
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

export function createLaserAMS(id = 'laser-ams-0'): IWeapon {
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

export function createLRM10(id = 'lrm-10-0'): IWeapon {
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

export function createMRM10(id = 'mrm-10-0'): IWeapon {
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

export function createStreakSRM6(id = 'streak-srm-6-0'): IWeapon {
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

export function createThunderbolt10(id = 'thunderbolt-10-0'): IWeapon {
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

export function sequenceD6Roller(...rolls: readonly number[]): () => number {
  let index = 0;
  return () => rolls[index++] ?? 1;
}

export class SequenceRandom extends SeededRandom {
  private index = 0;

  constructor(private readonly d6Rolls: readonly number[]) {
    super(0);
  }

  override next(): number {
    const die = this.d6Rolls[this.index++] ?? 1;
    return (die - 0.5) / 6;
  }
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

export const VETERAN_MODE_BEHAVIOR: IBotBehavior = {
  retreatThreshold: 0.3,
  retreatEdge: 'nearest',
  safeHeatThreshold: 13,
  tier: 'Veteran',
};

export class ScriptedAttackAI implements IAIPlayer {
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

export class ScriptedMultiWeaponAttackAI implements IAIPlayer {
  constructor(private readonly weaponIds: readonly string[]) {}

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
        weapons: [...this.weaponIds],
      },
    };
  }

  playPhysicalAttackPhase() {
    return null;
  }
}

export class ScriptedSelectedAMSAttackAI implements IAIPlayer {
  constructor(
    private readonly weaponId: string,
    private readonly selectedAMSWeaponId: string,
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
        selectedAMSWeaponIds: {
          [this.weaponId]: this.selectedAMSWeaponId,
        },
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
export function createUnit(
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

export function armorTypeByLocation(
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
export function buildScenario(options: {
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
export function runPhase(options: {
  state: IGameState;
  weaponsByUnit: ReadonlyMap<string, readonly IWeapon[]>;
  seed?: number;
  botBehavior?: IBotBehavior;
  botPlayer?: IAIPlayer;
  optionalRules?: readonly string[];
}): IGameEvent[] {
  return runPhaseWithResult(options).events;
}

export function runPhaseWithResult(options: {
  state: IGameState;
  weaponsByUnit: ReadonlyMap<string, readonly IWeapon[]>;
  seed?: number;
  random?: SeededRandom;
  botBehavior?: IBotBehavior;
  botPlayer?: IAIPlayer;
  optionalRules?: readonly string[];
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
    optionalRules: options.optionalRules,
  });

  return { events, state: result };
}

// =============================================================================
// Per-event-type payload-shape assertions
// =============================================================================
