/**
 * Tests for resolveAttack spotter-liveness mid-resolution re-check (PR-K6).
 *
 * Verifies that when an indirect-fire attack has been declared (with
 * `IndirectFireSpotterSelected` event emitted by PR-K4/K5 dispatch) and
 * the elected spotter is destroyed between attack-declaration and
 * resolution, `resolveAttack`:
 *
 *   1. Detects the destroyed spotter via session.events walkback
 *   2. Emits `IndirectFireSpotterLost` event with reason
 *   3. Forces the attack to auto-miss (hit=false) regardless of dice roll
 *   4. Preserves ammo consumption (already happened upstream) + heat (on
 *      AttackResolved payload regardless of hit) per spec
 *
 * Test pattern: pre-build a session with the AttackDeclared +
 * IndirectFireSpotterSelected events already in the log; mutate
 * `gameState.units[spotterId].destroyed = true`; call resolveAttack.
 */

import type { IWeapon } from '@/simulation/ai/types';
import type { IHex, IHexGrid } from '@/types/gameplay/HexGridInterfaces';
import type { IIndirectFireSpotterLostPayload } from '@/types/gameplay/IndirectFireInterfaces';

import { applyInteractiveSessionAttack } from '@/engine/InteractiveSession.actions';
import {
  GameEventType,
  GamePhase,
  GameSide,
  Facing,
  MovementType,
  RangeBracket,
  type IAttackResolvedPayload,
  type IGameSession,
  type IGameUnit,
  type IWeaponAttack,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';

import { createUnitDestroyedEvent } from '../gameEvents';
import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '../gameSession';
import { resolveAttack } from '../gameSessionAttackResolution';
import { appendEvent } from '../gameSessionCore';

// =============================================================================
// Fixtures — mirror the PR-K5 scenario test setup so a real
// IndirectFireSpotterSelected event lands in the log.
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
  hexes.set('2,0', makeHex(2, 0, TerrainType.HeavyWoods));
  hexes.set('3,0', makeHex(3, 0, TerrainType.LightWoods));
  return { config: { radius: 12 }, hexes };
}

function buildUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'a1',
      name: 'LRM Attacker',
      side: GameSide.Player,
      unitRef: 'lrm-mech',
      pilotRef: 'p1',
      gunnery: 4,
      piloting: 5,
      ammoConstruction: [
        {
          binId: 'bin-lrm15-1',
          weaponType: 'LRM-15',
          location: 'ct',
          maxRounds: 40,
          damagePerRound: 1,
          isExplosive: true,
        },
      ],
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

function setupSessionWithSpotterEvent(): IGameSession {
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
  s = advancePhase(s); // → Movement
  s = advancePhase(s); // → WeaponAttack
  // Position units AFTER advancePhase (state re-derives from events)
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

  // Declare attack — this emits AttackDeclared + IndirectFireSpotterSelected
  s = applyInteractiveSessionAttack({
    session: s,
    weaponsByUnit: buildWeaponsMap(),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['lrm-15-1'],
    grid: makeBlockedGrid(),
  });

  return s;
}

/** Always-hit roller — produces a TN-beating roll so a default attack would land. */
function alwaysHitRoller() {
  return {
    dice: [6, 6] as const,
    total: 12,
    isSnakeEyes: false,
    isBoxcars: true,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('resolveAttack — spotter-liveness mid-resolution (PR-K6)', () => {
  it('auto-misses + emits IndirectFireSpotterLost when elected spotter is destroyed before resolution', () => {
    const session = setupSessionWithSpotterEvent();

    // Verify pre-condition: the SpotterSelected event was emitted by K5 dispatch.
    const spotterSelected = session.events.find(
      (e) => e.type === GameEventType.IndirectFireSpotterSelected,
    );
    expect(spotterSelected).toBeDefined();

    // Destroy the spotter mid-resolution (between declare and resolve).
    // Emit a real UnitDestroyed event so event-sourced state derivation
    // reflects destroyed=true after subsequent appendEvent calls (direct
    // currentState mutation gets wiped by deriveState).
    const sessionWithDeadSpotter = appendEvent(
      session,
      createUnitDestroyedEvent(
        session.id,
        session.events.length,
        session.currentState.turn,
        GamePhase.WeaponAttack,
        's1',
        'damage',
      ),
    );

    // Find the AttackDeclared event to pass into resolveAttack.
    const attackDeclared = sessionWithDeadSpotter.events.find(
      (e) => e.type === GameEventType.AttackDeclared,
    );
    expect(attackDeclared).toBeDefined();

    // Sanity: verify the event-derived state correctly shows spotter destroyed
    expect(sessionWithDeadSpotter.currentState.units.s1.destroyed).toBe(true);

    const result = resolveAttack(
      sessionWithDeadSpotter,
      attackDeclared!,
      alwaysHitRoller,
    );

    // IndirectFireSpotterLost event emitted
    const spotterLost = result.events.find(
      (e) => e.type === GameEventType.IndirectFireSpotterLost,
    );
    expect(spotterLost).toBeDefined();
    const lostPayload = spotterLost!.payload as IIndirectFireSpotterLostPayload;
    expect(lostPayload.attackerId).toBe('a1');
    expect(lostPayload.spotterId).toBe('s1');
    expect(lostPayload.weaponId).toBe('lrm-15-1');
    expect(lostPayload.reason).toBe('Spotter destroyed before resolution');

    // AttackResolved event present with hit=false (auto-miss)
    const resolved = result.events.find(
      (e) => e.type === GameEventType.AttackResolved,
    );
    expect(resolved).toBeDefined();
    const resolvedPayload = resolved!.payload as IAttackResolvedPayload;
    expect(resolvedPayload.hit).toBe(false);

    // No DamageApplied events (auto-miss skips damage)
    const damageEvents = result.events.filter(
      (e) => e.type === GameEventType.DamageApplied,
    );
    expect(damageEvents.length).toBe(0);
  });

  it('preserves ammo consumption when spotter lost (ammo consumed upstream of spotter-liveness check)', () => {
    const session = setupSessionWithSpotterEvent();
    const sessionWithDeadSpotter = appendEvent(
      session,
      createUnitDestroyedEvent(
        session.id,
        session.events.length,
        session.currentState.turn,
        GamePhase.WeaponAttack,
        's1',
        'damage',
      ),
    );

    const attackDeclared = sessionWithDeadSpotter.events.find(
      (e) => e.type === GameEventType.AttackDeclared,
    );

    const result = resolveAttack(
      sessionWithDeadSpotter,
      attackDeclared!,
      alwaysHitRoller,
    );

    // AmmoConsumed event MUST be present — ammo consumption runs UPSTREAM of
    // the spotter-liveness check, so the spotter-lost branch does not
    // short-circuit it. (Heat is carried on AttackResolved.heat — also
    // preserved regardless of hit.)
    const ammoConsumed = result.events.find(
      (e) => e.type === GameEventType.AmmoConsumed,
    );
    expect(ammoConsumed).toBeDefined();
  });

  it('does NOT emit SpotterLost when spotter is still alive at resolution', () => {
    const session = setupSessionWithSpotterEvent();
    // Spotter remains alive (no destroyed mutation).

    const attackDeclared = session.events.find(
      (e) => e.type === GameEventType.AttackDeclared,
    );
    const result = resolveAttack(session, attackDeclared!, alwaysHitRoller);

    const spotterLost = result.events.find(
      (e) => e.type === GameEventType.IndirectFireSpotterLost,
    );
    expect(spotterLost).toBeUndefined();
  });
});
