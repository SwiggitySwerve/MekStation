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
import type { IIndirectFireSpotterSelectedPayload } from '@/types/gameplay/IndirectFireInterfaces';

import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  IAttackDeclaredPayload,
  IGameEvent,
  IGameState,
  IUnitGameState,
  LockState,
  MovementType,
  GameEventType,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';

import type { IWeapon } from '../../ai/types';

import { BotPlayer } from '../../ai/BotPlayer';
import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { IViolation } from '../../invariants/types';
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
  // Heavy + light woods exceed MegaMek's intervening woods LOS threshold.
  hexes.set('4,0', makeHex(4, 0, TerrainType.HeavyWoods));
  hexes.set('5,0', makeHex(5, 0, TerrainType.LightWoods));
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

function buildScenario(options: { includeSpotter: boolean }): {
  state: IGameState;
  weaponsByUnit: ReadonlyMap<string, readonly IWeapon[]>;
} {
  const attacker = makeUnit('player-1', GameSide.Player, { q: 0, r: 0 });
  const target = makeUnit('opponent-1', GameSide.Opponent, { q: 10, r: 0 });
  const units: Record<string, IUnitGameState> = {
    'player-1': attacker,
    'opponent-1': target,
  };
  const weaponsMap = new Map<string, readonly IWeapon[]>([
    ['player-1', [makeLRM15()]],
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
}): IGameEvent[] {
  const random = new SeededRandom(options.seed ?? 12345);
  const botPlayer = new BotPlayer(random);
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
});
