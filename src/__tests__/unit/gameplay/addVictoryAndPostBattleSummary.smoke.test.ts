/**
 * Per-change smoke test for add-victory-and-post-battle-summary.
 *
 * Asserts:
 * - InteractiveSession.concede(side) emits GameEnded with the OPPOSITE
 *   side as winner and reason='concede' (closes B3 from Phase 1 review)
 * - derivePostBattleReport produces a versioned schema with per-unit
 *   damage totals + MVP nomination + full event log
 * - victoryReasonLabel produces human-readable labels for each reason
 *
 * @spec openspec/changes/add-victory-and-post-battle-summary/tasks.md § 1, § 4, § 7, § 8
 */

import { describe, it, expect } from '@jest/globals';

import { GameEngine } from '@/engine/GameEngine';
import {
  GameEventType,
  GameSide,
  type IDamageAppliedPayload,
  type IGameEndedPayload,
  type IGameEvent,
  type IGameSession,
  type IGameUnit,
  type IGameStartedPayload,
} from '@/types/gameplay';
import { createGameSession, startGame } from '@/utils/gameplay/gameSession';
import { deriveState } from '@/utils/gameplay/gameState';
import {
  derivePostBattleReport,
  victoryReasonLabel,
} from '@/utils/gameplay/postBattleReport';

const config = {
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
 * Inject a synthesized DamageApplied event so the report has data to
 * derive from. Mirrors the pattern from the integrate-damage-pipeline
 * smoke test.
 */
function injectDamageEvent(
  session: IGameSession,
  attackerId: string,
  targetId: string,
  damage: number,
): IGameSession {
  const baseSeq = session.events.length;
  const turn = session.currentState.turn;
  const phase = session.currentState.phase;

  // Need an AttackResolved first so the report can attribute damage.
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
      armorRemaining: 10,
      structureRemaining: 10,
      locationDestroyed: false,
    } as IDamageAppliedPayload,
  };
  const newEvents = [...session.events, resolvedEvent, damageEvent];
  return {
    ...session,
    events: newEvents,
    currentState: deriveState(session.id, newEvents),
  };
}

describe('add-victory-and-post-battle-summary — smoke test', () => {
  describe('InteractiveSession.concede (B3)', () => {
    it('emits GameEnded with opposite side as winner + reason=concede', () => {
      const engine = new GameEngine({ seed: 12345 });
      const interactive = engine.createInteractiveSession([], [], units);
      interactive.concede(GameSide.Player);

      const session = interactive.getSession();
      const ended = session.events.find(
        (e: IGameEvent) => e.type === GameEventType.GameEnded,
      );
      expect(ended).toBeDefined();
      const payload = ended!.payload as IGameEndedPayload;
      expect(payload.winner).toBe(GameSide.Opponent);
      expect(payload.reason).toBe('concede');
    });

    it('Opponent conceding makes Player the winner', () => {
      const engine = new GameEngine({ seed: 67890 });
      const interactive = engine.createInteractiveSession([], [], units);
      interactive.concede(GameSide.Opponent);

      const ended = interactive
        .getSession()
        .events.find((e: IGameEvent) => e.type === GameEventType.GameEnded);
      const payload = ended!.payload as IGameEndedPayload;
      expect(payload.winner).toBe(GameSide.Player);
    });

    it('throws once the game is already over', () => {
      const engine = new GameEngine({ seed: 11111 });
      const interactive = engine.createInteractiveSession([], [], units);
      interactive.concede(GameSide.Player);

      expect(() => interactive.concede(GameSide.Player)).toThrow(
        'Game is not active',
      );
      expect(() => interactive.concede(GameSide.Opponent)).toThrow(
        'Game is not active',
      );

      const endedCount = interactive
        .getSession()
        .events.filter(
          (e: IGameEvent) => e.type === GameEventType.GameEnded,
        ).length;
      expect(endedCount).toBe(1);
    });
  });

  describe('derivePostBattleReport', () => {
    it('produces a versioned schema with version=1 + matchId + log', () => {
      const session = createGameSession(config, units);
      const started = startGame(session, GameSide.Player);
      const report = derivePostBattleReport(started);

      expect(report.version).toBe(1);
      expect(report.matchId).toBe(session.id);
      expect(report.log).toBeInstanceOf(Array);
      expect(report.units).toHaveLength(2);
      // No GameEnded yet → defaults to draw / destruction
      expect(report.winner).toBe('draw');
      expect(report.mvpUnitId).toBeNull();
    });

    it('attributes damage to attacker and target via AttackResolved chain', () => {
      let session = createGameSession(config, units);
      session = startGame(session, GameSide.Player);
      session = injectDamageEvent(session, 'attacker', 'target', 10);
      session = injectDamageEvent(session, 'attacker', 'target', 5);

      const report = derivePostBattleReport(session);
      const attacker = report.units.find((u) => u.unitId === 'attacker');
      const target = report.units.find((u) => u.unitId === 'target');

      expect(attacker?.damageDealt).toBe(15);
      expect(target?.damageReceived).toBe(15);
      expect(target?.damageDealt).toBe(0);
    });

    it('picks MVP from the winning side using highest damageDealt', () => {
      let session = createGameSession(config, units);
      session = startGame(session, GameSide.Player);
      session = injectDamageEvent(session, 'attacker', 'target', 20);

      // Manually inject a GameEnded for the player side so MVP picks
      // attacker (the only damage-dealing player unit).
      const endedEvent: IGameEvent = {
        id: 'seed-ended',
        gameId: session.id,
        sequence: session.events.length,
        timestamp: new Date().toISOString(),
        type: GameEventType.GameEnded,
        turn: session.currentState.turn,
        phase: session.currentState.phase,
        payload: {
          winner: GameSide.Player,
          reason: 'destruction',
        } as IGameEndedPayload,
      };
      session = {
        ...session,
        events: [...session.events, endedEvent],
        currentState: deriveState(session.id, [...session.events, endedEvent]),
      };

      const report = derivePostBattleReport(session);
      expect(report.winner).toBe(GameSide.Player);
      expect(report.mvpUnitId).toBe('attacker');
    });

    it('returns mvpUnitId=null when winner side dealt no damage', () => {
      let session = createGameSession(config, units);
      session = startGame(session, GameSide.Player);
      // Player wins via concede with zero damage on the field.
      const endedEvent: IGameEvent = {
        id: 'seed-ended',
        gameId: session.id,
        sequence: session.events.length,
        timestamp: new Date().toISOString(),
        type: GameEventType.GameEnded,
        turn: session.currentState.turn,
        phase: session.currentState.phase,
        payload: {
          winner: GameSide.Player,
          reason: 'concede',
        } as IGameEndedPayload,
      };
      session = {
        ...session,
        events: [...session.events, endedEvent],
        currentState: deriveState(session.id, [...session.events, endedEvent]),
      };

      const report = derivePostBattleReport(session);
      expect(report.mvpUnitId).toBeNull();
    });
  });

  describe('victoryReasonLabel', () => {
    it('returns human-readable labels for each reason', () => {
      expect(victoryReasonLabel('destruction')).toBe('Last side standing');
      expect(victoryReasonLabel('concede')).toBe('Opponent conceded');
      expect(victoryReasonLabel('turn_limit')).toBe('Turn limit reached');
      expect(victoryReasonLabel('objective')).toBe('Objective complete');
    });

    it('uses "You conceded" perspective when loser perspective requested', () => {
      expect(victoryReasonLabel('concede', 'loser')).toBe('You conceded');
    });
  });

  describe('startGame helper safety check', () => {
    it('starts the game without errors (smoke check for IGameStartedPayload import)', () => {
      const session = createGameSession(config, units);
      const started = startGame(session, GameSide.Player);
      const startedEvent = started.events.find(
        (e: IGameEvent) => e.type === GameEventType.GameStarted,
      );
      const payload = startedEvent!.payload as IGameStartedPayload;
      expect(payload.firstSide).toBe(GameSide.Player);
    });
  });
});
