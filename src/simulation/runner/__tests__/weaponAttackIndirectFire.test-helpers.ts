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

export function makeLRM15(): IWeapon {
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

export class ScriptedAttackAI implements IAIPlayer {
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

export function makeUnit(
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

export function makeHex(
  q: number,
  r: number,
  terrain: string = 'clear',
  elevation: number = 0,
): IHex {
  return { coord: { q, r }, occupantId: null, terrain, elevation };
}

export function makeBlockedGrid(): IHexGrid {
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

export function makeClearGrid(): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -5; q <= 15; q++) {
    for (let r = -5; r <= 15; r++) {
      hexes.set(`${q},${r}`, makeHex(q, r));
    }
  }
  return { config: { radius: 15 }, hexes };
}

export function buildScenario(options: {
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

export function runPhase(options: {
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
