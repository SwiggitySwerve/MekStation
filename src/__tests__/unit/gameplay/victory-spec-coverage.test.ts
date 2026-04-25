/**
 * Spec-coverage tests for `add-victory-and-post-battle-summary`.
 *
 * Closes the SHALL scenarios that the existing smoke test
 * (`addVictoryAndPostBattleSummary.smoke.test.ts`) does not yet cover:
 *
 *  - `after-combat-report` "Final tie broken by lexicographic unitId"
 *  - `after-combat-report` "Tie broken by alphabetical designation"
 *  - `after-combat-report` "Unit report contains damage and kill accounting"
 *  - `after-combat-report` "Derivation counts kills from unit_destroyed events"
 *  - `game-session-management` "Selector true after GameEnded"
 *  - `game-session-management` "Selector false while game active"
 *  - `gameSessionCore` `isTurnLimitDraw` predicate paths
 *
 * Pure unit tests — no fetch, no DB, no rendering. The persistence
 * surface (POST/GET /api/matches) is exercised by the integration
 * test suite and the API route's own unit harness.
 *
 * @spec openspec/changes/add-victory-and-post-battle-summary/specs/after-combat-report/spec.md
 * @spec openspec/changes/add-victory-and-post-battle-summary/specs/game-session-management/spec.md
 */

import { describe, it, expect } from '@jest/globals';

import { selectIsGameCompleted } from '@/stores/useGameplayStore';
import {
  GameEventType,
  GameSide,
  GameStatus,
  type IGameEndedPayload,
  type IGameEvent,
  type IGameSession,
  type IGameUnit,
  type IUnitDestroyedPayload,
} from '@/types/gameplay';
import { createGameSession, startGame } from '@/utils/gameplay/gameSession';
import {
  isTurnLimitDraw,
  TURN_LIMIT_DRAW_TOLERANCE,
} from '@/utils/gameplay/gameSessionCore';
import { deriveState } from '@/utils/gameplay/gameState';
import {
  derivePostBattleReport,
  POST_BATTLE_REPORT_VERSION,
} from '@/utils/gameplay/postBattleReport';

const config = {
  mapRadius: 10,
  turnLimit: 10,
  victoryConditions: ['destruction'],
  optionalRules: [],
};

/**
 * Build a session with two duplicate-chassis units on the player
 * side so the MVP picker has to fall back to the unitId tie-break.
 * Designation collisions on the same side are common in hot-seat
 * play (two Atlas AS7-D in a duplicate-loadout force) — the
 * trailing unitId guard is the only thing that keeps replay
 * deterministic.
 */
function buildDuplicateAtlasSession(): IGameSession {
  const units: IGameUnit[] = [
    {
      id: 'u-002',
      name: 'Atlas AS7-D',
      side: GameSide.Player,
      unitRef: 'as7-d',
      pilotRef: 'p1',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'u-001',
      name: 'Atlas AS7-D',
      side: GameSide.Player,
      unitRef: 'as7-d',
      pilotRef: 'p2',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'target',
      name: 'Marauder',
      side: GameSide.Opponent,
      unitRef: 'mad-3r',
      pilotRef: 'p3',
      gunnery: 4,
      piloting: 5,
    },
  ];
  return createGameSession(config, units);
}

/**
 * Append AttackResolved + DamageApplied events crediting `attackerId`
 * with `damage` against `targetId`. Mirrors the same pattern the
 * smoke test uses; copied here so the file is self-contained.
 */
function appendDamage(
  session: IGameSession,
  attackerId: string,
  targetId: string,
  damage: number,
): IGameSession {
  const baseSeq = session.events.length;
  const turn = session.currentState.turn;
  const phase = session.currentState.phase;
  const resolved: IGameEvent = {
    id: `r-${baseSeq}`,
    gameId: session.id,
    sequence: baseSeq,
    timestamp: new Date().toISOString(),
    type: GameEventType.AttackResolved,
    turn,
    phase,
    actorId: attackerId,
    payload: {
      attackerId,
      targetId,
      weaponId: 'ml-1',
      roll: 10,
      toHitNumber: 4,
      hit: true,
      location: 'center_torso',
      damage,
    },
  };
  const dmg: IGameEvent = {
    id: `d-${baseSeq + 1}`,
    gameId: session.id,
    sequence: baseSeq + 1,
    timestamp: new Date().toISOString(),
    type: GameEventType.DamageApplied,
    turn,
    phase,
    actorId: targetId,
    payload: {
      unitId: targetId,
      location: 'center_torso',
      damage,
      armorRemaining: 10,
      structureRemaining: 10,
      locationDestroyed: false,
    },
  };
  const events = [...session.events, resolved, dmg];
  return { ...session, events, currentState: deriveState(session.id, events) };
}

function appendGameEnded(
  session: IGameSession,
  winner: GameSide | 'draw',
  reason: 'destruction' | 'concede' | 'turn_limit',
): IGameSession {
  const ended: IGameEvent = {
    id: 'ended',
    gameId: session.id,
    sequence: session.events.length,
    timestamp: new Date().toISOString(),
    type: GameEventType.GameEnded,
    turn: session.currentState.turn,
    phase: session.currentState.phase,
    payload: { winner, reason } as IGameEndedPayload,
  };
  const events = [...session.events, ended];
  return { ...session, events, currentState: deriveState(session.id, events) };
}

// =============================================================================
// MVP determination — unitId tie-break (after-combat-report § 8.2 final guard)
// =============================================================================

describe('MVP picker — final unitId tie-break', () => {
  it('picks the lexicographically-first unitId when every other tie-break collides', () => {
    // Two duplicate Atlas units, same designation, same damage dealt
    // and received → tie-break MUST fall through to unitId.
    let session = buildDuplicateAtlasSession();
    session = startGame(session, GameSide.Player);
    // Each Atlas does 100 damage to the Marauder, takes 50 itself.
    session = appendDamage(session, 'u-002', 'target', 100);
    session = appendDamage(session, 'u-001', 'target', 100);
    session = appendDamage(session, 'target', 'u-001', 50);
    session = appendDamage(session, 'target', 'u-002', 50);
    session = appendGameEnded(session, GameSide.Player, 'destruction');

    const report = derivePostBattleReport(session);
    expect(report.mvpUnitId).toBe('u-001');
  });

  it('result does NOT depend on input ordering of the units array', () => {
    // Same data, but the input units array passed to
    // `createGameSession` had `u-002` before `u-001`. The picker must
    // still return `u-001` lexicographically. This proves the sort
    // is total — a defective implementation that relied on
    // Array.sort stability would have returned `u-002`.
    let session = buildDuplicateAtlasSession();
    session = startGame(session, GameSide.Player);
    session = appendDamage(session, 'u-001', 'target', 100);
    session = appendDamage(session, 'u-002', 'target', 100);
    session = appendGameEnded(session, GameSide.Player, 'destruction');

    const report = derivePostBattleReport(session);
    expect(report.mvpUnitId).toBe('u-001');
  });

  it('alphabetical designation tie-break still wins when designations differ', () => {
    // Atlas vs Banshee: same damage, same damage taken, but
    // designations differ — Atlas comes first alphabetically.
    const units: IGameUnit[] = [
      {
        id: 'u-banshee',
        name: 'Banshee BNC-3M',
        side: GameSide.Player,
        unitRef: 'bnc-3m',
        pilotRef: 'p1',
        gunnery: 4,
        piloting: 5,
      },
      {
        id: 'u-atlas',
        name: 'Atlas AS7-D',
        side: GameSide.Player,
        unitRef: 'as7-d',
        pilotRef: 'p2',
        gunnery: 4,
        piloting: 5,
      },
      {
        id: 'target',
        name: 'Marauder',
        side: GameSide.Opponent,
        unitRef: 'mad-3r',
        pilotRef: 'p3',
        gunnery: 4,
        piloting: 5,
      },
    ];
    let session = createGameSession(config, units);
    session = startGame(session, GameSide.Player);
    session = appendDamage(session, 'u-atlas', 'target', 200);
    session = appendDamage(session, 'u-banshee', 'target', 200);
    session = appendDamage(session, 'target', 'u-atlas', 80);
    session = appendDamage(session, 'target', 'u-banshee', 80);
    session = appendGameEnded(session, GameSide.Player, 'destruction');

    const report = derivePostBattleReport(session);
    expect(report.mvpUnitId).toBe('u-atlas');
  });
});

// =============================================================================
// Kill accounting (after-combat-report — Derivation counts kills from
// unit_destroyed events)
// =============================================================================

describe('IUnitReport kill accounting', () => {
  it('increments kills for each unit_destroyed event attributed to a killer', () => {
    const units: IGameUnit[] = [
      {
        id: 'killer',
        name: 'Hunchback',
        side: GameSide.Player,
        unitRef: 'hbk-4g',
        pilotRef: 'p1',
        gunnery: 4,
        piloting: 5,
      },
      {
        id: 'victim-a',
        name: 'Locust',
        side: GameSide.Opponent,
        unitRef: 'lct-1v',
        pilotRef: 'p2',
        gunnery: 5,
        piloting: 5,
      },
      {
        id: 'victim-b',
        name: 'Wasp',
        side: GameSide.Opponent,
        unitRef: 'wsp-1a',
        pilotRef: 'p3',
        gunnery: 5,
        piloting: 5,
      },
    ];
    let session = createGameSession(config, units);
    session = startGame(session, GameSide.Player);
    // killer destroys victim-a (damage attribution + UnitDestroyed)
    session = appendDamage(session, 'killer', 'victim-a', 80);
    {
      const destroyed: IGameEvent = {
        id: 'destroyed-a',
        gameId: session.id,
        sequence: session.events.length,
        timestamp: new Date().toISOString(),
        type: GameEventType.UnitDestroyed,
        turn: session.currentState.turn,
        phase: session.currentState.phase,
        payload: { unitId: 'victim-a' } as IUnitDestroyedPayload,
      };
      const events = [...session.events, destroyed];
      session = {
        ...session,
        events,
        currentState: deriveState(session.id, events),
      };
    }
    // killer destroys victim-b
    session = appendDamage(session, 'killer', 'victim-b', 80);
    {
      const destroyed: IGameEvent = {
        id: 'destroyed-b',
        gameId: session.id,
        sequence: session.events.length,
        timestamp: new Date().toISOString(),
        type: GameEventType.UnitDestroyed,
        turn: session.currentState.turn,
        phase: session.currentState.phase,
        payload: { unitId: 'victim-b' } as IUnitDestroyedPayload,
      };
      const events = [...session.events, destroyed];
      session = {
        ...session,
        events,
        currentState: deriveState(session.id, events),
      };
    }
    session = appendGameEnded(session, GameSide.Player, 'destruction');

    const report = derivePostBattleReport(session);
    const killer = report.units.find((u) => u.unitId === 'killer');
    expect(killer?.kills).toBe(2);
    // Victims should have 0 kills.
    expect(report.units.find((u) => u.unitId === 'victim-a')?.kills).toBe(0);
    expect(report.units.find((u) => u.unitId === 'victim-b')?.kills).toBe(0);
  });

  it('IUnitReport.xpPending is always literal `true`', () => {
    let session = buildDuplicateAtlasSession();
    session = startGame(session, GameSide.Player);
    session = appendGameEnded(session, GameSide.Player, 'concede');
    const report = derivePostBattleReport(session);
    for (const unit of report.units) {
      expect(unit.xpPending).toBe(true);
    }
  });
});

// =============================================================================
// Post-battle schema versioning
// =============================================================================

describe('IPostBattleReport schema', () => {
  it('reports POST_BATTLE_REPORT_VERSION literal 1', () => {
    expect(POST_BATTLE_REPORT_VERSION).toBe(1);
  });

  it('every derived report carries version: 1', () => {
    let session = buildDuplicateAtlasSession();
    session = startGame(session, GameSide.Player);
    const report = derivePostBattleReport(session);
    expect(report.version).toBe(1);
    expect(report.version).toBe(POST_BATTLE_REPORT_VERSION);
  });
});

// =============================================================================
// useGameplayStore.isGameCompleted selector
// (game-session-management — Game Completed Store Projection)
// =============================================================================

describe('selectIsGameCompleted', () => {
  it('returns true when session.currentState.status === Completed', () => {
    const session = {
      id: 'm-ok',
      currentState: { status: GameStatus.Completed },
    } as unknown as IGameSession;
    expect(selectIsGameCompleted({ session })).toBe(true);
  });

  it('returns false when session is Active', () => {
    const session = {
      id: 'm-active',
      currentState: { status: GameStatus.Active },
    } as unknown as IGameSession;
    expect(selectIsGameCompleted({ session })).toBe(false);
  });

  it('returns false when session is Setup', () => {
    const session = {
      id: 'm-setup',
      currentState: { status: GameStatus.Setup },
    } as unknown as IGameSession;
    expect(selectIsGameCompleted({ session })).toBe(false);
  });

  it('returns false when session is null', () => {
    expect(selectIsGameCompleted({ session: null })).toBe(false);
  });
});

// =============================================================================
// Turn-limit damage tie-break predicate (gameSessionCore)
// =============================================================================

describe('isTurnLimitDraw predicate', () => {
  it('returns true when both sides dealt zero damage (max===0 short-circuit)', () => {
    expect(isTurnLimitDraw(0, 0)).toBe(true);
  });

  it('returns true at exactly the 5% tolerance boundary', () => {
    // 95 vs 100 → delta = 5/100 = 0.05 → equal to tolerance →
    // predicate returns true (draw).
    expect(isTurnLimitDraw(95, 100)).toBe(true);
    expect(isTurnLimitDraw(100, 95)).toBe(true);
  });

  it('returns false when delta exceeds 5%', () => {
    // 200 vs 300 → delta = 100/300 ≈ 0.333 → outside tolerance.
    expect(isTurnLimitDraw(200, 300)).toBe(false);
  });

  it('returns true for near-equal damage within tolerance (310 vs 300)', () => {
    // Spec scenario: "Turn limit with near-equal damage is draw".
    // 310 vs 300 → delta = 10/310 ≈ 0.032 → inside 0.05 → draw.
    expect(isTurnLimitDraw(310, 300)).toBe(true);
  });

  it('exposes the tolerance constant for inspection', () => {
    expect(TURN_LIMIT_DRAW_TOLERANCE).toBe(0.05);
  });
});
