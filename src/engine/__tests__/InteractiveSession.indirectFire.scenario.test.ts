/**
 * Scenario tests for the indirect-fire production wiring (PR-K5).
 *
 * Exercises `applyInteractiveSessionAttack` (which `InteractiveSession.applyAttack`
 * delegates to) with a heavy-woods grid that blocks attacker LOS but leaves
 * the spotter with LOS to the target. Verifies:
 *
 *   1. POSITIVE — when a spotter has LOS, applyInteractiveSessionAttack
 *      pre-computes the indirect-fire resolution and threads it into
 *      declareAttack, emitting AttackDeclared with `'Indirect fire'` modifier
 *      + IndirectFireSpotterSelected with basis='los'.
 *   2. NEGATIVE — when no friendly spotter exists and direct LOS is
 *      blocked, the player-facing attack path emits AttackInvalid rather
 *      than declaring a shot the map preview marked as blocked.
 *
 * Uses the pure-function path rather than the full InteractiveSession
 * instance to stay focused on the K5 wiring contract.
 */

import type { IWeapon } from '@/simulation/ai/types';
import type { IHex, IHexGrid } from '@/types/gameplay/HexGridInterfaces';
import type {
  IIndirectFireForwardObserverPayload,
  IIndirectFireSpotterSelectedPayload,
} from '@/types/gameplay/IndirectFireInterfaces';

import {
  GameEventType,
  GamePhase,
  GameSide,
  Facing,
  FiringArc,
  MovementType,
  RangeBracket,
  type IGameUnit,
  type IGameSession,
  type IAttackDeclaredPayload,
  type IAttackInvalidPayload,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSession';

import { applyInteractiveSessionAttack } from '../InteractiveSession.actions';

// =============================================================================
// Fixtures
// =============================================================================

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
  for (let q = -5; q <= 12; q++) {
    for (let r = -5; r <= 12; r++) {
      hexes.set(`${q},${r}`, makeHex(q, r));
    }
  }
  // Heavy + light woods exceed MegaMek's intervening woods LOS threshold.
  hexes.set('2,0', makeHex(2, 0, TerrainType.HeavyWoods));
  hexes.set('3,0', makeHex(3, 0, TerrainType.LightWoods));
  return { config: { radius: 12 }, hexes };
}

function makeOpenGrid(): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -5; q <= 12; q++) {
    for (let r = -5; r <= 12; r++) {
      hexes.set(`${q},${r}`, makeHex(q, r));
    }
  }
  return { config: { radius: 12 }, hexes };
}

function buildUnits(includeSpotter: boolean): readonly IGameUnit[] {
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
  ];
  if (includeSpotter) {
    units.push({
      id: 's1',
      name: 'Spotter',
      side: GameSide.Player,
      unitRef: 'spotter-mech',
      pilotRef: 'p3',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit);
  }
  return units;
}

function buildWeaponsMap(
  weaponOverrides: Partial<IWeapon> = {},
): Map<string, readonly IWeapon[]> {
  const lrm15: IWeapon = {
    id: 'lrm-15-1',
    name: 'LRM-15',
    damage: 9,
    heat: 5,
    minRange: 6,
    shortRange: 7,
    mediumRange: 14,
    longRange: 21,
    ...weaponOverrides,
  } as unknown as IWeapon;
  const map = new Map<string, readonly IWeapon[]>();
  map.set('a1', [lrm15]);
  return map;
}

function setupSessionAtWeaponAttack(includeSpotter: boolean): IGameSession {
  let s = createGameSession(
    {
      mapRadius: 12,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    } as never,
    buildUnits(includeSpotter),
  );
  s = startGame(s, GameSide.Player);
  s = rollInitiative(s);
  s = advancePhase(s); // Initiative → Movement
  s = advancePhase(s); // Movement → WeaponAttack
  // Mutate position on the FINAL state (advancePhase re-derives currentState
  // from events, so earlier mutations would be discarded). This is a
  // fixture-only path — production session state mutates via events.
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
  if (includeSpotter) {
    s.currentState.units.s1 = {
      ...s.currentState.units.s1,
      position: { q: 5, r: 1 },
      movementThisTurn: MovementType.Stationary,
    };
  }
  return s;
}

function enableFogOfWar(session: IGameSession): IGameSession {
  return {
    ...session,
    sideOwners: {
      [GameSide.Player]: 'pid_player',
      [GameSide.Opponent]: 'pid_opponent',
    },
    config: {
      ...session.config,
      fogOfWar: true,
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('applyInteractiveSessionAttack — indirect-fire wiring (PR-K5)', () => {
  it('POSITIVE: spotter with LOS triggers IndirectFireSpotterSelected', () => {
    const session = setupSessionAtWeaponAttack(true);
    const grid = makeBlockedGrid();

    const result = applyInteractiveSessionAttack({
      session,
      weaponsByUnit: buildWeaponsMap(),
      attackerId: 'a1',
      targetId: 't1',
      weaponIds: ['lrm-15-1'],
      weaponModesByWeaponId: { 'lrm-15-1': 'Indirect' },
      grid,
    });

    // AttackDeclared has the indirect-fire modifier
    const declared = result.events.find(
      (e) => e.type === GameEventType.AttackDeclared,
    );
    expect(declared).toBeDefined();
    const declaredPayload = declared!.payload as IAttackDeclaredPayload;
    expect(declaredPayload.weaponAttacks?.[0]?.mode).toBe('Indirect');
    const indirectMod = declaredPayload.modifiers.find(
      (m) => m.name === 'Indirect fire',
    );
    expect(indirectMod).toBeDefined();
    expect(indirectMod!.value).toBeGreaterThanOrEqual(1);

    // IndirectFireSpotterSelected event fires
    const spotterEvent = result.events.find(
      (e) => e.type === GameEventType.IndirectFireSpotterSelected,
    );
    expect(spotterEvent).toBeDefined();
    const spotterPayload = spotterEvent!
      .payload as IIndirectFireSpotterSelectedPayload;
    expect(spotterPayload.attackerId).toBe('a1');
    expect(spotterPayload.spotterId).toBe('s1');
    expect(spotterPayload.weaponId).toBe('lrm-15-1');
    expect(spotterPayload.basis).toBe('los');
  });

  it('POSITIVE: Forward Observer spotter cancels walked penalty and emits FO event', () => {
    const session = setupSessionAtWeaponAttack(true);
    session.currentState.units.s1 = {
      ...session.currentState.units.s1,
      movementThisTurn: MovementType.Walk,
      pilotSpas: ['forward_observer'],
    };
    const grid = makeBlockedGrid();

    const result = applyInteractiveSessionAttack({
      session,
      weaponsByUnit: buildWeaponsMap(),
      attackerId: 'a1',
      targetId: 't1',
      weaponIds: ['lrm-15-1'],
      grid,
    });

    const declared = result.events.find(
      (e) => e.type === GameEventType.AttackDeclared,
    );
    const declaredPayload = declared!.payload as IAttackDeclaredPayload;
    expect(
      declaredPayload.modifiers.find((m) => m.name === 'Indirect fire'),
    ).toMatchObject({ value: 1 });

    const forwardObserverEvent = result.events.find(
      (e) => e.type === GameEventType.IndirectFireForwardObserver,
    );
    expect(forwardObserverEvent).toBeDefined();
    expect(
      forwardObserverEvent!.payload as IIndirectFireForwardObserverPayload,
    ).toMatchObject({
      attackerId: 'a1',
      spotterId: 's1',
      weaponId: 'lrm-15-1',
      basis: 'los',
      toHitPenalty: 1,
      penaltyCancelled: 1,
    });
  });

  it('NEGATIVE: no spotter present — blocked LOS emits AttackInvalid', () => {
    const session = setupSessionAtWeaponAttack(false);
    const grid = makeBlockedGrid();

    const result = applyInteractiveSessionAttack({
      session,
      weaponsByUnit: buildWeaponsMap(),
      attackerId: 'a1',
      targetId: 't1',
      weaponIds: ['lrm-15-1'],
      grid,
    });

    const declared = result.events.find(
      (e) => e.type === GameEventType.AttackDeclared,
    );
    expect(declared).toBeUndefined();

    const invalid = result.events.find(
      (e) => e.type === GameEventType.AttackInvalid,
    );
    expect(invalid).toBeDefined();
    const invalidPayload = invalid!.payload as IAttackInvalidPayload;
    expect(invalidPayload).toMatchObject({
      attackerId: 'a1',
      targetId: 't1',
      weaponId: 'lrm-15-1',
      reason: 'NoLineOfSight',
    });
    expect(invalidPayload.details).toContain('(3, 0)');

    // No indirect-fire events
    const indirectEvents = result.events.filter(
      (e) =>
        e.type === GameEventType.IndirectFireSpotterSelected ||
        e.type === GameEventType.IndirectFireNarcOverride,
    );
    expect(indirectEvents.length).toBe(0);
  });

  it('NEGATIVE: fog-hidden target emits TargetNotVisible before attack declaration', () => {
    const session = enableFogOfWar(setupSessionAtWeaponAttack(false));
    const grid = makeBlockedGrid();

    const result = applyInteractiveSessionAttack({
      session,
      weaponsByUnit: buildWeaponsMap(),
      attackerId: 'a1',
      targetId: 't1',
      weaponIds: ['lrm-15-1'],
      grid,
    });

    expect(
      result.events.some((e) => e.type === GameEventType.AttackDeclared),
    ).toBe(false);
    expect(
      result.events.some((e) => e.type === GameEventType.AttackLocked),
    ).toBe(false);

    const invalid = result.events.find(
      (e) => e.type === GameEventType.AttackInvalid,
    );
    expect(invalid).toBeDefined();
    expect(invalid!.payload as IAttackInvalidPayload).toMatchObject({
      attackerId: 'a1',
      targetId: 't1',
      weaponId: 'lrm-15-1',
      reason: 'TargetNotVisible',
      details: 'Target t1 is not currently visible to player',
    });
  });

  it('POSITIVE: fog target remains attackable when a friendly spotter can see it', () => {
    const session = enableFogOfWar(setupSessionAtWeaponAttack(true));
    const grid = makeBlockedGrid();

    const result = applyInteractiveSessionAttack({
      session,
      weaponsByUnit: buildWeaponsMap(),
      attackerId: 'a1',
      targetId: 't1',
      weaponIds: ['lrm-15-1'],
      grid,
    });

    expect(
      result.events.some((e) => e.type === GameEventType.AttackInvalid),
    ).toBe(false);
    expect(
      result.events.some((e) => e.type === GameEventType.AttackDeclared),
    ).toBe(true);
    expect(
      result.events.some(
        (e) => e.type === GameEventType.IndirectFireSpotterSelected,
      ),
    ).toBe(true);
  });

  it('BACKWARD-COMPAT: no grid passed — behaves identically to pre-K5', () => {
    const session = setupSessionAtWeaponAttack(true);

    const result = applyInteractiveSessionAttack({
      session,
      weaponsByUnit: buildWeaponsMap(),
      attackerId: 'a1',
      targetId: 't1',
      weaponIds: ['lrm-15-1'],
      // grid intentionally omitted
    });

    const indirectEvents = result.events.filter(
      (e) =>
        e.type === GameEventType.IndirectFireSpotterSelected ||
        e.type === GameEventType.IndirectFireNarcOverride,
    );
    expect(indirectEvents.length).toBe(0);

    const declared = result.events.find(
      (e) => e.type === GameEventType.AttackDeclared,
    );
    const declaredPayload = declared!.payload as IAttackDeclaredPayload;
    const indirectMod = declaredPayload.modifiers.find(
      (m) => m.name === 'Indirect fire',
    );
    expect(indirectMod).toBeUndefined();
  });

  it('declares the real distance-derived range bracket instead of a fixed short range', () => {
    const session = setupSessionAtWeaponAttack(false);
    session.currentState.units.t1 = {
      ...session.currentState.units.t1,
      position: { q: 10, r: 0 },
    };

    const result = applyInteractiveSessionAttack({
      session,
      weaponsByUnit: buildWeaponsMap(),
      attackerId: 'a1',
      targetId: 't1',
      weaponIds: ['lrm-15-1'],
    });

    const declared = result.events.find(
      (e) => e.type === GameEventType.AttackDeclared,
    );
    expect(declared).toBeDefined();
    const declaredPayload = declared!.payload as IAttackDeclaredPayload;
    const rangeMod = declaredPayload.modifiers.find(
      (m) => m.source === 'range',
    );

    expect(declaredPayload.range).toBe(RangeBracket.Medium);
    expect(rangeMod).toMatchObject({
      name: `Range (${RangeBracket.Medium})`,
      value: 2,
    });
  });

  it('adds the selected weapon minimum-range penalty to the declared to-hit number', () => {
    const session = setupSessionAtWeaponAttack(false);

    const result = applyInteractiveSessionAttack({
      session,
      weaponsByUnit: buildWeaponsMap(),
      attackerId: 'a1',
      targetId: 't1',
      weaponIds: ['lrm-15-1'],
    });

    const declared = result.events.find(
      (e) => e.type === GameEventType.AttackDeclared,
    );
    expect(declared).toBeDefined();
    const declaredPayload = declared!.payload as IAttackDeclaredPayload;
    const minimumRangeMod = declaredPayload.modifiers.find(
      (m) => m.name === 'Minimum Range',
    );

    expect(declaredPayload.range).toBe(RangeBracket.Short);
    expect(minimumRangeMod).toMatchObject({
      name: 'Minimum Range',
      value: 2,
      source: 'range',
    });
    expect(declaredPayload.toHitNumber).toBe(6);
  });

  it('adds target terrain when the target hex grants a woods modifier', () => {
    const session = setupSessionAtWeaponAttack(false);
    session.currentState.units.t1 = {
      ...session.currentState.units.t1,
      position: { q: 7, r: 0 },
    };
    const grid = makeOpenGrid();
    grid.hexes.set('7,0', makeHex(7, 0, TerrainType.LightWoods));

    const result = applyInteractiveSessionAttack({
      session,
      weaponsByUnit: buildWeaponsMap(),
      attackerId: 'a1',
      targetId: 't1',
      weaponIds: ['lrm-15-1'],
      grid,
    });

    const declared = result.events.find(
      (e) => e.type === GameEventType.AttackDeclared,
    );
    expect(declared).toBeDefined();
    const declaredPayload = declared!.payload as IAttackDeclaredPayload;

    expect(declaredPayload.range).toBe(RangeBracket.Short);
    expect(declaredPayload.toHitNumber).toBe(5);
    expect(declaredPayload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Target Terrain',
          value: 1,
          source: 'terrain',
        }),
      ]),
    );
  });

  it('rejects selected weapons that cannot cover the target firing arc', () => {
    const session = setupSessionAtWeaponAttack(false);
    session.currentState.units.a1 = {
      ...session.currentState.units.a1,
      facing: Facing.North,
    };
    session.currentState.units.t1 = {
      ...session.currentState.units.t1,
      position: { q: 0, r: 1 },
    };

    const result = applyInteractiveSessionAttack({
      session,
      weaponsByUnit: buildWeaponsMap({ mountingArc: FiringArc.Front }),
      attackerId: 'a1',
      targetId: 't1',
      weaponIds: ['lrm-15-1'],
    });

    expect(
      result.events.some((e) => e.type === GameEventType.AttackDeclared),
    ).toBe(false);
    expect(
      result.events.some((e) => e.type === GameEventType.AttackLocked),
    ).toBe(false);

    const invalid = result.events.find(
      (e) => e.type === GameEventType.AttackInvalid,
    );
    expect(invalid).toBeDefined();
    expect(invalid!.payload as IAttackInvalidPayload).toMatchObject({
      attackerId: 'a1',
      targetId: 't1',
      weaponId: 'lrm-15-1',
      reason: 'OutOfArc',
      details: 'No selected weapons can fire into the rear arc',
    });
  });

  it('rejects out-of-range selected weapons before declaring the attack', () => {
    const session = setupSessionAtWeaponAttack(false);
    session.currentState.units.t1 = {
      ...session.currentState.units.t1,
      position: { q: 22, r: 0 },
    };

    const result = applyInteractiveSessionAttack({
      session,
      weaponsByUnit: buildWeaponsMap(),
      attackerId: 'a1',
      targetId: 't1',
      weaponIds: ['lrm-15-1'],
    });

    expect(
      result.events.some((e) => e.type === GameEventType.AttackDeclared),
    ).toBe(false);
    expect(
      result.events.some((e) => e.type === GameEventType.AttackLocked),
    ).toBe(false);

    const invalid = result.events.find(
      (e) => e.type === GameEventType.AttackInvalid,
    );
    expect(invalid).toBeDefined();
    expect(invalid!.payload as IAttackInvalidPayload).toMatchObject({
      attackerId: 'a1',
      targetId: 't1',
      weaponId: 'lrm-15-1',
      reason: 'OutOfRange',
    });
  });
});
