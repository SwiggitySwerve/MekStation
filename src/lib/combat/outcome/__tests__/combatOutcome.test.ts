/**
 * Tests for `deriveCombatOutcome` and the `ICombatOutcome` schema.
 *
 * Spec coverage:
 * - Outcome contains required top-level fields
 * - Deterministic derivation
 * - Schema versioning + assertCombatOutcomeCurrent
 * - Pilot status reflected in delta
 * - Destroyed unit produces destroyed: true delta
 * - Empty session returns empty unitDeltas
 *
 * @spec openspec/changes/add-combat-outcome-model/specs/after-combat-report/spec.md
 */

import { describe, it, expect } from '@jest/globals';

import {
  COMBAT_OUTCOME_VERSION,
  CombatEndReason,
  PilotFinalStatus,
  UnitFinalStatus,
  UnsupportedCombatOutcomeVersionError,
  assertCombatOutcomeCurrent,
} from '@/types/combat/CombatOutcome';
import {
  GameEventType,
  GameSide,
  GameStatus,
  type IDamageAppliedPayload,
  type IGameConfig,
  type IGameEvent,
  type IGameSession,
  type IGameUnit,
  type IUnitDestroyedPayload,
} from '@/types/gameplay/GameSessionInterfaces';
import { createGameSession, startGame } from '@/utils/gameplay/gameSession';
import { endGame } from '@/utils/gameplay/gameSessionCore';
import { deriveState } from '@/utils/gameplay/gameState';
import { derivePostBattleReport } from '@/utils/gameplay/postBattleReport';

import { deriveCombatOutcome, isSessionCompleted } from '../combatOutcome';

const config: IGameConfig = {
  mapRadius: 10,
  turnLimit: 10,
  victoryConditions: ['destruction'],
  optionalRules: [],
};

const units: IGameUnit[] = [
  {
    id: 'attacker',
    name: 'Hunchback',
    side: GameSide.Player,
    unitRef: 'hbk-4g',
    pilotRef: 'p1',
    gunnery: 4,
    piloting: 5,
  },
  {
    id: 'target',
    name: 'Marauder',
    side: GameSide.Opponent,
    unitRef: 'mad-3r',
    pilotRef: 'p2',
    gunnery: 4,
    piloting: 5,
  },
];

/**
 * Build a fresh, finished session for assertion convenience.
 * Player wins by destruction (the most common Phase 1 path).
 */
function buildCompletedSession(): IGameSession {
  let session = createGameSession(config, units);
  session = startGame(session, GameSide.Player);
  session = endGame(session, GameSide.Player, 'destruction');
  return session;
}

describe('deriveCombatOutcome — schema', () => {
  it('stamps the current version', () => {
    const session = buildCompletedSession();
    const outcome = deriveCombatOutcome(session);
    expect(outcome.version).toBe(COMBAT_OUTCOME_VERSION);
  });

  it('propagates matchId from session.id', () => {
    const session = buildCompletedSession();
    const outcome = deriveCombatOutcome(session);
    expect(outcome.matchId).toBe(session.id);
  });

  it('contains the composed Phase 1 IPostBattleReport', () => {
    const session = buildCompletedSession();
    const outcome = deriveCombatOutcome(session);
    const report = derivePostBattleReport(session);
    // Same matchId, same winner, same reason, same units array length.
    expect(outcome.report.matchId).toBe(report.matchId);
    expect(outcome.report.winner).toBe(report.winner);
    expect(outcome.report.reason).toBe(report.reason);
    expect(outcome.report.units.length).toBe(report.units.length);
  });

  it('maps Phase 1 reason → CombatEndReason enum', () => {
    const session = buildCompletedSession();
    const outcome = deriveCombatOutcome(session);
    expect(outcome.endReason).toBe(CombatEndReason.Destruction);
  });

  it('produces ISO-8601 capturedAt parseable by Date', () => {
    const session = buildCompletedSession();
    const outcome = deriveCombatOutcome(session);
    expect(Number.isNaN(Date.parse(outcome.capturedAt))).toBe(false);
  });
});

describe('deriveCombatOutcome — options propagation', () => {
  it('propagates contractId / scenarioId when supplied', () => {
    const session = buildCompletedSession();
    const outcome = deriveCombatOutcome(session, {
      contractId: 'contract-001',
      scenarioId: 'scenario-7',
    });
    expect(outcome.contractId).toBe('contract-001');
    expect(outcome.scenarioId).toBe('scenario-7');
  });

  it('defaults contractId / scenarioId to null', () => {
    const session = buildCompletedSession();
    const outcome = deriveCombatOutcome(session);
    expect(outcome.contractId).toBeNull();
    expect(outcome.scenarioId).toBeNull();
  });

  it('honors capturedAt override (used for deterministic tests)', () => {
    const session = buildCompletedSession();
    const outcome = deriveCombatOutcome(session, {
      capturedAt: '2025-01-01T00:00:00.000Z',
    });
    expect(outcome.capturedAt).toBe('2025-01-01T00:00:00.000Z');
  });
});

describe('deriveCombatOutcome — unit deltas', () => {
  it('returns one delta per session unit', () => {
    const session = buildCompletedSession();
    const outcome = deriveCombatOutcome(session);
    expect(outcome.unitDeltas).toHaveLength(units.length);
  });

  it('delta exposes side and unitId from the source unit', () => {
    const session = buildCompletedSession();
    const outcome = deriveCombatOutcome(session);
    const attackerDelta = outcome.unitDeltas.find(
      (d) => d.unitId === 'attacker',
    );
    expect(attackerDelta).toBeDefined();
    expect(attackerDelta!.side).toBe(GameSide.Player);
  });

  it('marks intact units as INTACT with destroyed=false', () => {
    const session = buildCompletedSession();
    const outcome = deriveCombatOutcome(session);
    for (const delta of outcome.unitDeltas) {
      // Fresh session, no actual damage applied → all units are intact.
      expect(delta.destroyed).toBe(false);
      expect(delta.finalStatus).toBe(UnitFinalStatus.Intact);
    }
  });

  it('reflects pilot consciousness + wounds in pilotState', () => {
    const session = buildCompletedSession();
    const outcome = deriveCombatOutcome(session);
    for (const delta of outcome.unitDeltas) {
      expect(delta.pilotState.conscious).toBe(true);
      expect(delta.pilotState.wounds).toBe(0);
      expect(delta.pilotState.killed).toBe(false);
      expect(delta.pilotState.finalStatus).toBe(PilotFinalStatus.Active);
    }
  });

  it('exposes ammoRemaining as a record (empty for units with no ammo)', () => {
    const session = buildCompletedSession();
    const outcome = deriveCombatOutcome(session);
    for (const delta of outcome.unitDeltas) {
      expect(typeof delta.ammoRemaining).toBe('object');
    }
  });
});

describe('deriveCombatOutcome — empty session', () => {
  it('returns empty unitDeltas when no units are present', () => {
    let session = createGameSession(config, []);
    session = startGame(session, GameSide.Player);
    session = endGame(session, 'draw', 'turn_limit');
    const outcome = deriveCombatOutcome(session);
    expect(outcome.unitDeltas).toHaveLength(0);
    expect(outcome.endReason).toBe(CombatEndReason.TurnLimit);
  });
});

describe('deriveCombatOutcome — determinism', () => {
  it('produces deeply-equal results for identical input + capturedAt', () => {
    const session = buildCompletedSession();
    const a = deriveCombatOutcome(session, {
      capturedAt: '2025-01-01T00:00:00.000Z',
    });
    const b = deriveCombatOutcome(session, {
      capturedAt: '2025-01-01T00:00:00.000Z',
    });
    expect(a).toEqual(b);
  });

  it('survives JSON round-trip', () => {
    const session = buildCompletedSession();
    const outcome = deriveCombatOutcome(session, {
      capturedAt: '2025-01-01T00:00:00.000Z',
    });
    const round = JSON.parse(JSON.stringify(outcome));
    expect(round.version).toBe(COMBAT_OUTCOME_VERSION);
    expect(round.matchId).toBe(outcome.matchId);
    expect(round.unitDeltas).toHaveLength(outcome.unitDeltas.length);
  });
});

describe('isSessionCompleted', () => {
  it('returns true for ended sessions', () => {
    const session = buildCompletedSession();
    expect(isSessionCompleted(session)).toBe(true);
    expect(session.currentState.status).toBe(GameStatus.Completed);
  });

  it('returns false for active sessions', () => {
    let session = createGameSession(config, units);
    session = startGame(session, GameSide.Player);
    expect(isSessionCompleted(session)).toBe(false);
  });
});

describe('assertCombatOutcomeCurrent', () => {
  it('passes for outcomes at the current version', () => {
    const session = buildCompletedSession();
    const outcome = deriveCombatOutcome(session);
    expect(() => assertCombatOutcomeCurrent(outcome)).not.toThrow();
  });

  it('throws UnsupportedCombatOutcomeVersionError for older versions', () => {
    expect(() => assertCombatOutcomeCurrent({ version: 0 })).toThrow(
      UnsupportedCombatOutcomeVersionError,
    );
  });

  it('throws UnsupportedCombatOutcomeVersionError for future versions', () => {
    expect(() => assertCombatOutcomeCurrent({ version: 999 })).toThrow(
      UnsupportedCombatOutcomeVersionError,
    );
  });
});

// ===========================================================================
// Kill Attribution (task 7.4)
// ===========================================================================
//
// `derivePostBattleReport` credits a kill to the attacker stored in the
// per-target `damageAttribution` map at the moment a `UnitDestroyed` event
// fires. `deriveCombatOutcome` composes that report under `outcome.report`,
// so kill attribution is observable transitively. These tests assert that
// the count surfaces correctly through the outcome's composed report.
// ===========================================================================

/**
 * Inject an `AttackResolved` → `DamageApplied` → optional `UnitDestroyed`
 * event triple onto a session. Mirrors the helper from
 * `addVictoryAndPostBattleSummary.smoke.test.ts` so the kill-attribution
 * assertion exercises the same code path the engine uses in production.
 */
function injectKillEvents(
  session: IGameSession,
  attackerId: string,
  targetId: string,
  damage: number,
  destroyTarget: boolean,
): IGameSession {
  const baseSeq = session.events.length;
  const turn = session.currentState.turn;
  const phase = session.currentState.phase;

  const resolvedEvent: IGameEvent = {
    id: `seed-resolved-${baseSeq}`,
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

  const damageEvent: IGameEvent = {
    id: `seed-damage-${baseSeq + 1}`,
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
      armorRemaining: 0,
      structureRemaining: 0,
      locationDestroyed: destroyTarget,
    } as IDamageAppliedPayload,
  };

  const newEvents: IGameEvent[] = [
    ...session.events,
    resolvedEvent,
    damageEvent,
  ];

  if (destroyTarget) {
    const destroyedEvent: IGameEvent = {
      id: `seed-destroyed-${baseSeq + 2}`,
      gameId: session.id,
      sequence: baseSeq + 2,
      timestamp: new Date().toISOString(),
      type: GameEventType.UnitDestroyed,
      turn,
      phase,
      actorId: targetId,
      payload: {
        unitId: targetId,
        cause: 'damage',
        killerUnitId: attackerId,
      } as IUnitDestroyedPayload,
    };
    newEvents.push(destroyedEvent);
  }

  return {
    ...session,
    events: newEvents,
    currentState: deriveState(session.id, newEvents),
  };
}

describe('deriveCombatOutcome — kill attribution (task 7.4)', () => {
  it('credits a kill to the last attacker via outcome.report.units[].kills', () => {
    let session = createGameSession(config, units);
    session = startGame(session, GameSide.Player);
    // Attacker delivers a fatal blow to the target.
    session = injectKillEvents(session, 'attacker', 'target', 25, true);
    session = endGame(session, GameSide.Player, 'destruction');

    const outcome = deriveCombatOutcome(session);
    const attackerReport = outcome.report.units.find(
      (u) => u.unitId === 'attacker',
    );
    const targetReport = outcome.report.units.find(
      (u) => u.unitId === 'target',
    );

    expect(attackerReport).toBeDefined();
    expect(attackerReport!.kills).toBe(1);
    // Target should not be credited with the kill on itself.
    expect(targetReport!.kills).toBe(0);
  });

  it('does not credit a kill when the unit was merely damaged (no UnitDestroyed)', () => {
    let session = createGameSession(config, units);
    session = startGame(session, GameSide.Player);
    session = injectKillEvents(session, 'attacker', 'target', 5, false);
    session = endGame(session, GameSide.Player, 'destruction');

    const outcome = deriveCombatOutcome(session);
    const attackerReport = outcome.report.units.find(
      (u) => u.unitId === 'attacker',
    );
    expect(attackerReport!.kills).toBe(0);
    // Damage still tracked even without a kill.
    expect(attackerReport!.damageDealt).toBe(5);
  });

  it('credits multiple kills to the same attacker across separate engagements', () => {
    const threeUnits: IGameUnit[] = [
      ...units,
      {
        id: 'second-target',
        name: 'Wolverine',
        side: GameSide.Opponent,
        unitRef: 'wvr-6r',
        pilotRef: 'p3',
        gunnery: 4,
        piloting: 5,
      },
    ];
    let session = createGameSession(config, threeUnits);
    session = startGame(session, GameSide.Player);
    session = injectKillEvents(session, 'attacker', 'target', 25, true);
    session = injectKillEvents(session, 'attacker', 'second-target', 25, true);
    session = endGame(session, GameSide.Player, 'destruction');

    const outcome = deriveCombatOutcome(session);
    const attackerReport = outcome.report.units.find(
      (u) => u.unitId === 'attacker',
    );
    expect(attackerReport!.kills).toBe(2);
  });
});

// ===========================================================================
// Full-Match Outcome Shape (task 7.7)
// ===========================================================================
//
// Asserts that a session driven through the documented `endGame` path with a
// non-trivial roster (4 units, two per side) produces an `ICombatOutcome`
// whose shape satisfies every required field declared in
// `after-combat-report/spec.md` (Scenario: Outcome contains required
// top-level fields). This complements `phase3RoundTrip.test.ts` (which uses
// synthetic outcomes to exercise the campaign-side bus wiring) by proving
// the engine-side derivation produces a valid outcome from an end-to-end
// session lifecycle.
// ===========================================================================

const fourMechUnits: IGameUnit[] = [
  {
    id: 'p-alpha',
    name: 'Hunchback HBK-4G',
    side: GameSide.Player,
    unitRef: 'hbk-4g',
    pilotRef: 'pilot-alpha',
    gunnery: 4,
    piloting: 5,
  },
  {
    id: 'p-bravo',
    name: 'Centurion CN9-A',
    side: GameSide.Player,
    unitRef: 'cn9-a',
    pilotRef: 'pilot-bravo',
    gunnery: 4,
    piloting: 5,
  },
  {
    id: 'o-charlie',
    name: 'Marauder MAD-3R',
    side: GameSide.Opponent,
    unitRef: 'mad-3r',
    pilotRef: 'pilot-charlie',
    gunnery: 4,
    piloting: 5,
  },
  {
    id: 'o-delta',
    name: 'Warhammer WHM-6R',
    side: GameSide.Opponent,
    unitRef: 'whm-6r',
    pilotRef: 'pilot-delta',
    gunnery: 4,
    piloting: 5,
  },
];

describe('deriveCombatOutcome — full 4-mech match (task 7.7)', () => {
  it('produces an outcome with all spec-required top-level fields', () => {
    let session = createGameSession(config, fourMechUnits);
    session = startGame(session, GameSide.Player);
    // Player wipes both opponents.
    session = injectKillEvents(session, 'p-alpha', 'o-charlie', 25, true);
    session = injectKillEvents(session, 'p-bravo', 'o-delta', 25, true);
    session = endGame(session, GameSide.Player, 'destruction');

    const outcome = deriveCombatOutcome(session, {
      contractId: 'ctr-7',
      scenarioId: 'scn-3',
      capturedAt: '2025-01-01T00:00:00.000Z',
    });

    // Top-level required fields per spec scenario "Outcome contains required
    // top-level fields".
    expect(outcome.version).toBe(COMBAT_OUTCOME_VERSION);
    expect(outcome.matchId).toBe(session.id);
    expect(outcome.contractId).toBe('ctr-7');
    expect(outcome.scenarioId).toBe('scn-3');
    expect(outcome.endReason).toBe(CombatEndReason.Destruction);
    expect(outcome.capturedAt).toBe('2025-01-01T00:00:00.000Z');

    // Composed report: matchId, winner, reason, units, log.
    expect(outcome.report.matchId).toBe(session.id);
    expect(outcome.report.winner).toBe(GameSide.Player);
    expect(outcome.report.reason).toBe('destruction');
    expect(outcome.report.units).toHaveLength(4);
    expect(outcome.report.log.length).toBeGreaterThan(0);

    // Per-unit deltas: one entry per session unit, with the destroyed
    // opponents flagged.
    expect(outcome.unitDeltas).toHaveLength(4);
    const charlie = outcome.unitDeltas.find((d) => d.unitId === 'o-charlie');
    const delta = outcome.unitDeltas.find((d) => d.unitId === 'o-delta');
    const alpha = outcome.unitDeltas.find((d) => d.unitId === 'p-alpha');
    expect(charlie?.destroyed).toBe(true);
    expect(charlie?.finalStatus).toBe(UnitFinalStatus.Destroyed);
    expect(delta?.destroyed).toBe(true);
    expect(delta?.finalStatus).toBe(UnitFinalStatus.Destroyed);
    expect(alpha?.destroyed).toBe(false);
    expect(alpha?.finalStatus).toBe(UnitFinalStatus.Intact);

    // Survivor pilot is ACTIVE. Destroyed-unit pilot final status depends
    // on consciousness events (Wave 5 pilot-event derivation, deferred);
    // the per-unit `destroyed` flag and `finalStatus` already prove the
    // mech-side of the spec scenario.
    expect(alpha?.pilotState.finalStatus).toBe(PilotFinalStatus.Active);
    // Destroyed unit's pilot is at minimum *not* still ACTIVE-with-zero-
    // wounds when consciousness wiring lands; today the field is exposed
    // and serializable (the load-bearing contract for Wave 1 consumers).
    expect(charlie?.pilotState).toBeDefined();
    expect(typeof charlie?.pilotState.conscious).toBe('boolean');

    // Kill credit surfaces through the composed report.
    const alphaReport = outcome.report.units.find(
      (u) => u.unitId === 'p-alpha',
    );
    const bravoReport = outcome.report.units.find(
      (u) => u.unitId === 'p-bravo',
    );
    expect(alphaReport!.kills).toBe(1);
    expect(bravoReport!.kills).toBe(1);

    // Consumer guard: outcome is at the current schema version.
    expect(() => assertCombatOutcomeCurrent(outcome)).not.toThrow();
  });
});
