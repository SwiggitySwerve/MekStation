/**
 * Scenario tests for the indirect-fire production wiring (PR-K5).
 *
 * Exercises `applyInteractiveSessionAttack` (which `InteractiveSession.applyAttack`
 * delegates to) with a cumulative-woods grid that blocks attacker LOS but leaves
 * the spotter with LOS to the target. Verifies:
 *
 *   1. POSITIVE — when a spotter has LOS, applyInteractiveSessionAttack
 *      pre-computes the indirect-fire resolution and threads it into
 *      declareAttack, emitting AttackDeclared with `'Indirect fire'` modifier
 *      + IndirectFireSpotterSelected with basis='los'.
 *   2. NEGATIVE — when no friendly spotter exists, the resolution is
 *      permitted=false and declareAttack falls through unchanged (no
 *      indirect-fire events emitted).
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
  MovementType,
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
  // Light + heavy woods block LOS from attacker (0,0) -> target (5,0).
  hexes.set('2,0', makeHex(2, 0, TerrainType.LightWoods));
  hexes.set('3,0', makeHex(3, 0, TerrainType.HeavyWoods));
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

function buildWeaponsMap(): Map<string, readonly IWeapon[]> {
  const lrm15: IWeapon = {
    id: 'lrm-15-1',
    name: 'LRM-15',
    damage: 9,
    heat: 5,
    minRange: 6,
    shortRange: 7,
    mediumRange: 14,
    longRange: 21,
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

// =============================================================================
// Tests
// =============================================================================

describe('applyInteractiveSessionAttack — indirect-fire wiring (PR-K5)', () => {
  it('NEGATIVE: invalid targets are not declaration-locked by the wrapper', () => {
    const session = setupSessionAtWeaponAttack(false);

    const result = applyInteractiveSessionAttack({
      session,
      weaponsByUnit: buildWeaponsMap(),
      attackerId: 'a1',
      targetId: 'missing-target',
      weaponIds: ['lrm-15-1'],
    });

    const newEvents = result.events.slice(session.events.length);
    expect(newEvents.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(newEvents[0].payload as IAttackInvalidPayload).toMatchObject({
      attackerId: 'a1',
      targetId: 'missing-target',
      weaponId: 'lrm-15-1',
      reason: 'InvalidTarget',
    });
    expect(result.currentState.units.a1.lockState).toBe(
      session.currentState.units.a1.lockState,
    );
  });

  it('POSITIVE: spotter with LOS triggers IndirectFireSpotterSelected', () => {
    const session = setupSessionAtWeaponAttack(true);
    const grid = makeBlockedGrid();

    const result = applyInteractiveSessionAttack({
      session,
      weaponsByUnit: buildWeaponsMap(),
      attackerId: 'a1',
      targetId: 't1',
      weaponIds: ['lrm-15-1'],
      grid,
    });

    // AttackDeclared has the indirect-fire modifier
    const declared = result.events.find(
      (e) => e.type === GameEventType.AttackDeclared,
    );
    expect(declared).toBeDefined();
    const declaredPayload = declared!.payload as IAttackDeclaredPayload;
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

  it('POSITIVE: walking Forward Observer spotter emits the cancellation event', () => {
    const session = setupSessionAtWeaponAttack(true);
    session.currentState.units.s1 = {
      ...session.currentState.units.s1,
      movementThisTurn: MovementType.Walk,
      abilities: ['forward_observer'],
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

    const indirectEvents = result.events.filter(
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
      attackerId: 'a1',
      spotterId: 's1',
      weaponId: 'lrm-15-1',
      basis: 'los',
      toHitPenalty: 1,
      penaltyCancelled: 1,
    });
  });

  it('POSITIVE: Oblique Attacker reduces indirect-fire declaration penalty', () => {
    const session = setupSessionAtWeaponAttack(true);
    session.currentState.units.a1 = {
      ...session.currentState.units.a1,
      abilities: ['oblique-attacker'],
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
    expect(declared).toBeDefined();
    const declaredPayload = declared!.payload as IAttackDeclaredPayload;
    expect(
      declaredPayload.modifiers.find((m) => m.name === 'Indirect fire'),
    ).toBeUndefined();

    const spotterEvent = result.events.find(
      (e) => e.type === GameEventType.IndirectFireSpotterSelected,
    );
    expect(spotterEvent?.payload).toMatchObject({
      attackerId: 'a1',
      spotterId: 's1',
      weaponId: 'lrm-15-1',
      basis: 'los',
      toHitPenalty: 0,
    });
  });

  it('NEGATIVE: no spotter present rejects blocked-LOS indirect fire', () => {
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

    const newEvents = result.events.slice(session.events.length);
    expect(newEvents.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(newEvents[0].payload as IAttackInvalidPayload).toMatchObject({
      attackerId: 'a1',
      targetId: 't1',
      weaponId: 'lrm-15-1',
      reason: 'NoLineOfSight',
    });
    expect(result.currentState.units.a1.lockState).toBe(
      session.currentState.units.a1.lockState,
    );

    // No indirect-fire events
    const indirectEvents = result.events.filter(
      (e) =>
        e.type === GameEventType.IndirectFireSpotterSelected ||
        e.type === GameEventType.IndirectFireNarcOverride,
    );
    expect(indirectEvents.length).toBe(0);
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
});
