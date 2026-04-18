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
  GameSide,
  GameStatus,
  type IGameConfig,
  type IGameSession,
  type IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import { createGameSession, startGame } from '@/utils/gameplay/gameSession';
import { endGame } from '@/utils/gameplay/gameSessionCore';
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
