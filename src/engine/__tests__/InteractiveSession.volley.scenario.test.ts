/**
 * Scenario tests for the composed-volley engine path (change
 * `attack-phase-intent-composer`, ADR 0002 design D2).
 *
 * `applyInteractiveSessionVolley` declares one attack group per target —
 * primary first — then locks the attacker ONCE, so a multi-target volley
 * commits atomically. Verifies:
 *
 *   1. EQUIVALENCE — a single-group volley produces the exact same event
 *      stream as the legacy `applyInteractiveSessionAttack` for the same
 *      inputs (spec: "identical to the same volley built through the
 *      legacy flow").
 *   2. MULTI-TARGET — two groups declare in group order with exactly one
 *      AttackLocked after the final group.
 *   3. HOLD FIRE — an empty groups array locks with zero declarations.
 *   4. DEFENSIVE ABORT — an invalid group stops the fold WITHOUT locking,
 *      mirroring the single-target invalid path (player can adjust).
 *
 * Uses the pure-function path (same approach as the indirect-fire K5
 * scenario suite) to stay focused on the volley wiring contract.
 */

import type { IWeapon } from '@/simulation/ai/types';
import type { IHex, IHexGrid } from '@/types/gameplay/HexGridInterfaces';

import {
  GameEventType,
  GameSide,
  Facing,
  MovementType,
  type IGameUnit,
  type IGameSession,
  type IAttackDeclaredPayload,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSession';

import {
  applyInteractiveSessionAttack,
  applyInteractiveSessionVolley,
} from '../InteractiveSession.actions';

// =============================================================================
// Fixtures
// =============================================================================

function buildUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'a1',
      name: 'Attacker',
      side: GameSide.Player,
      unitRef: 'attacker-mech',
      pilotRef: 'p1',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
    {
      id: 't1',
      name: 'Target One',
      side: GameSide.Opponent,
      unitRef: 'target-mech-1',
      pilotRef: 'p2',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
    {
      id: 't2',
      name: 'Target Two',
      side: GameSide.Opponent,
      unitRef: 'target-mech-2',
      pilotRef: 'p3',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
  ];
}

function buildWeaponsMap(): Map<string, readonly IWeapon[]> {
  // Two direct-fire lasers with generous brackets so both front-arc
  // targets are in range — the volley contract, not range math, is under
  // test here.
  const laser = (id: string): IWeapon =>
    ({
      id,
      name: 'Large Laser',
      damage: 8,
      heat: 8,
      minRange: 0,
      shortRange: 7,
      mediumRange: 14,
      longRange: 21,
    }) as unknown as IWeapon;
  const map = new Map<string, readonly IWeapon[]>();
  map.set('a1', [laser('w1'), laser('w2')]);
  return map;
}

function setupSessionAtWeaponAttack(): IGameSession {
  let s = createGameSession(
    {
      mapRadius: 12,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    } as never,
    buildUnits(),
  );
  s = startGame(s, GameSide.Player);
  s = rollInitiative(s);
  s = advancePhase(s); // Initiative → Movement
  s = advancePhase(s); // Movement → WeaponAttack
  // Mutate positions on the FINAL state (advancePhase re-derives
  // currentState from events; earlier mutations would be discarded).
  // Fixture-only path — production state mutates via events.
  s.currentState.units.a1 = {
    ...s.currentState.units.a1,
    position: { q: 0, r: 0 },
    movementThisTurn: MovementType.Stationary,
  };
  s.currentState.units.t1 = {
    ...s.currentState.units.t1,
    position: { q: 5, r: 0 },
    facing: Facing.South,
  };
  s.currentState.units.t2 = {
    ...s.currentState.units.t2,
    position: { q: 5, r: 1 },
    facing: Facing.South,
  };
  return s;
}

// =============================================================================
// Tests
// =============================================================================

describe('applyInteractiveSessionVolley — composed-volley commit (ADR 0002 D2)', () => {
  it('EQUIVALENCE: a single-group volley emits the same events as the legacy applyAttack path', () => {
    const session = setupSessionAtWeaponAttack();
    const base = {
      session,
      weaponsByUnit: buildWeaponsMap(),
      attackerId: 'a1',
    };

    const legacy = applyInteractiveSessionAttack({
      ...base,
      targetId: 't1',
      weaponIds: ['w1', 'w2'],
    });
    const volley = applyInteractiveSessionVolley(base, [
      { targetId: 't1', weaponIds: ['w1', 'w2'], modesByWeaponId: {} },
    ]);

    const shape = (result: IGameSession) =>
      result.events
        .slice(session.events.length)
        .map((event) => ({ type: event.type, payload: event.payload }));
    expect(shape(volley)).toEqual(shape(legacy));
    expect(shape(volley).map((e) => e.type)).toContain(
      GameEventType.AttackDeclared,
    );
    expect(shape(volley).map((e) => e.type)).toContain(
      GameEventType.AttackLocked,
    );
  });

  it('MULTI-TARGET: declares one group per target in order, locking exactly once at the end', () => {
    const session = setupSessionAtWeaponAttack();

    const result = applyInteractiveSessionVolley(
      { session, weaponsByUnit: buildWeaponsMap(), attackerId: 'a1' },
      [
        { targetId: 't1', weaponIds: ['w1'], modesByWeaponId: {} },
        { targetId: 't2', weaponIds: ['w2'], modesByWeaponId: {} },
      ],
    );

    const newEvents = result.events.slice(session.events.length);
    const declared = newEvents.filter(
      (event) => event.type === GameEventType.AttackDeclared,
    );
    const locked = newEvents.filter(
      (event) => event.type === GameEventType.AttackLocked,
    );

    expect(declared).toHaveLength(2);
    // Primary-first group order is preserved in the declaration order.
    expect(
      declared.map(
        (event) => (event.payload as IAttackDeclaredPayload).targetId,
      ),
    ).toEqual(['t1', 't2']);
    expect(locked).toHaveLength(1);
    // The single lock lands AFTER both declarations — atomic commit.
    expect(newEvents.indexOf(locked[0])).toBeGreaterThan(
      newEvents.indexOf(declared[1]),
    );
  });

  it('HOLD FIRE: an empty groups array locks with zero declarations', () => {
    const session = setupSessionAtWeaponAttack();

    const result = applyInteractiveSessionVolley(
      { session, weaponsByUnit: buildWeaponsMap(), attackerId: 'a1' },
      [],
    );

    const newEvents = result.events.slice(session.events.length);
    expect(newEvents.map((event) => event.type)).toEqual([
      GameEventType.AttackLocked,
    ]);
  });

  it('DEFENSIVE ABORT: an invalid group stops the fold without locking', () => {
    const session = setupSessionAtWeaponAttack();

    const result = applyInteractiveSessionVolley(
      { session, weaponsByUnit: buildWeaponsMap(), attackerId: 'a1' },
      [
        { targetId: 't1', weaponIds: ['w1'], modesByWeaponId: {} },
        { targetId: 'missing-target', weaponIds: ['w2'], modesByWeaponId: {} },
      ],
    );

    const newEvents = result.events.slice(session.events.length);
    const types = newEvents.map((event) => event.type);
    expect(types).toContain(GameEventType.AttackDeclared);
    expect(types).toContain(GameEventType.AttackInvalid);
    expect(types).not.toContain(GameEventType.AttackLocked);
  });
});

// =============================================================================
// D8 pass-through regressions (phase 5): called-shot and indirect sub-flows
// are consumed as-is by the composer commit path — their outputs surface as
// opaque modifiers on the declared volley.
// =============================================================================

describe('applyInteractiveSessionVolley — called-shot / indirect pass-through (D8)', () => {
  it('CALLED SHOT: a volley with a called-shot election carries the Called Shot modifier', () => {
    const session = setupSessionAtWeaponAttack();

    const result = applyInteractiveSessionVolley(
      {
        session,
        weaponsByUnit: buildWeaponsMap(),
        attackerId: 'a1',
        calledShots: { w1: true },
      },
      [{ targetId: 't1', weaponIds: ['w1'], modesByWeaponId: {} }],
    );

    const declared = result.events.find(
      (event) => event.type === GameEventType.AttackDeclared,
    );
    expect(declared).toBeDefined();
    const payload = declared!.payload as IAttackDeclaredPayload;
    expect(
      payload.modifiers.some((modifier) => modifier.name === 'Called Shot'),
    ).toBe(true);
    // The volley still locks atomically after the called-shot declaration.
    expect(
      result.events
        .slice(session.events.length)
        .filter((event) => event.type === GameEventType.AttackLocked),
    ).toHaveLength(1);
  });

  it('INDIRECT: a blocked-LOS LRM volley with a spotter resolves indirect fire through the volley path', () => {
    // Dedicated fixture: LRM attacker behind woods, friendly spotter with
    // LOS beside the target (mirrors the PR-K5 scenario geometry).
    const spotterSession = setupIndirectSessionWithSpotter();

    const result = applyInteractiveSessionVolley(
      {
        session: spotterSession.session,
        weaponsByUnit: spotterSession.weaponsByUnit,
        attackerId: 'a1',
        grid: spotterSession.grid,
      },
      [{ targetId: 't1', weaponIds: ['lrm-15-1'], modesByWeaponId: {} }],
    );

    const declared = result.events.find(
      (event) => event.type === GameEventType.AttackDeclared,
    );
    expect(declared).toBeDefined();
    const payload = declared!.payload as IAttackDeclaredPayload;
    expect(
      payload.modifiers.some((modifier) => modifier.name === 'Indirect fire'),
    ).toBe(true);
    expect(
      result.events.some(
        (event) => event.type === GameEventType.IndirectFireSpotterSelected,
      ),
    ).toBe(true);
    expect(
      result.events
        .slice(spotterSession.session.events.length)
        .filter((event) => event.type === GameEventType.AttackLocked),
    ).toHaveLength(1);
  });
});

/**
 * Indirect-fire fixture (mirrors the PR-K5 scenario suite): LRM attacker at
 * (0,0), target at (5,0) behind cumulative woods, friendly spotter at (5,1)
 * with LOS.
 */
function setupIndirectSessionWithSpotter(): {
  readonly session: IGameSession;
  readonly weaponsByUnit: Map<string, readonly IWeapon[]>;
  readonly grid: IHexGrid;
} {
  const units: IGameUnit[] = [
    {
      id: 'a1',
      name: 'LRM Attacker',
      side: GameSide.Player,
      unitRef: 'lrm-mech',
      pilotRef: 'p1',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
    {
      id: 't1',
      name: 'Target',
      side: GameSide.Opponent,
      unitRef: 'target-mech',
      pilotRef: 'p2',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
    {
      id: 's1',
      name: 'Spotter',
      side: GameSide.Player,
      unitRef: 'spotter-mech',
      pilotRef: 'p3',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
  ];
  let s = createGameSession(
    {
      mapRadius: 12,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    } as never,
    units,
  );
  s = startGame(s, GameSide.Player);
  s = rollInitiative(s);
  s = advancePhase(s); // Initiative → Movement
  s = advancePhase(s); // Movement → WeaponAttack
  s.currentState.units.a1 = {
    ...s.currentState.units.a1,
    position: { q: 0, r: 0 },
    movementThisTurn: MovementType.Stationary,
  };
  s.currentState.units.t1 = {
    ...s.currentState.units.t1,
    position: { q: 5, r: 0 },
    facing: Facing.South,
  };
  s.currentState.units.s1 = {
    ...s.currentState.units.s1,
    position: { q: 5, r: 1 },
    movementThisTurn: MovementType.Stationary,
  };

  const hexes = new Map<string, IHex>();
  for (let q = -5; q <= 12; q++) {
    for (let r = -5; r <= 12; r++) {
      hexes.set(`${q},${r}`, {
        coord: { q, r },
        occupantId: null,
        terrain: 'clear',
        elevation: 0,
      });
    }
  }
  hexes.set('2,0', {
    coord: { q: 2, r: 0 },
    occupantId: null,
    terrain: TerrainType.LightWoods,
    elevation: 0,
  });
  hexes.set('3,0', {
    coord: { q: 3, r: 0 },
    occupantId: null,
    terrain: TerrainType.HeavyWoods,
    elevation: 0,
  });
  const grid: IHexGrid = { config: { radius: 12 }, hexes };

  const lrm15 = {
    id: 'lrm-15-1',
    name: 'LRM-15',
    damage: 9,
    heat: 5,
    minRange: 6,
    shortRange: 7,
    mediumRange: 14,
    longRange: 21,
  } as unknown as IWeapon;
  const weaponsByUnit = new Map<string, readonly IWeapon[]>();
  weaponsByUnit.set('a1', [lrm15]);

  return { session: s, weaponsByUnit, grid };
}
