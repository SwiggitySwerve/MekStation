/**
 * Tests for MetricsCollector
 * 
 * Tests per-game metrics recording and aggregate statistics computation.
 */

import { MetricsCollector } from '../metrics/MetricsCollector';
import { ISimulationResult } from '../core/types';
import { IViolation } from '../invariants/types';
import { GameEventType, GamePhase } from '@/types/gameplay/GameSessionInterfaces';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  describe('recordGame', () => {
    it('should record a single game result', () => {
      const result: ISimulationResult = {
        seed: 12345,
        winner: 'player',
        turns: 10,
        durationMs: 5000,
        events: [],
      };

      collector.recordGame(result);
      const metrics = collector.getMetrics();

      expect(metrics).toHaveLength(1);
      expect(metrics[0].seed).toBe(12345);
      expect(metrics[0].winner).toBe('player');
      expect(metrics[0].turns).toBe(10);
      expect(metrics[0].durationMs).toBe(5000);
    });

    it('should record multiple games', () => {
      const result1: ISimulationResult = {
        seed: 1,
        winner: 'player',
        turns: 5,
        durationMs: 2000,
        events: [],
      };

      const result2: ISimulationResult = {
        seed: 2,
        winner: 'opponent',
        turns: 8,
        durationMs: 3000,
        events: [],
      };

      collector.recordGame(result1);
      collector.recordGame(result2);

      const metrics = collector.getMetrics();
      expect(metrics).toHaveLength(2);
      expect(metrics[0].seed).toBe(1);
      expect(metrics[1].seed).toBe(2);
    });

    it('should extract violations from result', () => {
      const result: ISimulationResult = {
        seed: 100,
        winner: 'draw',
        turns: 15,
        durationMs: 7000,
        events: [],
      };

      collector.recordGame(result);
      const metrics = collector.getMetrics();

      expect(metrics[0].violations).toEqual([]);
    });

    it('should compute unit counts from events', () => {
      const result: ISimulationResult = {
        seed: 200,
        winner: 'player',
        turns: 12,
        durationMs: 6000,
        events: [],
      };

      collector.recordGame(result);
      const metrics = collector.getMetrics();

      expect(metrics[0].playerUnitsStart).toBeGreaterThanOrEqual(0);
      expect(metrics[0].opponentUnitsStart).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getMetrics', () => {
    it('should return empty array when no games recorded', () => {
      const metrics = collector.getMetrics();
      expect(metrics).toEqual([]);
    });

    it('should return defensive copy', () => {
      const result: ISimulationResult = {
        seed: 1,
        winner: 'player',
        turns: 5,
        durationMs: 2000,
        events: [],
      };

      collector.recordGame(result);
      const metrics1 = collector.getMetrics();
      const metrics2 = collector.getMetrics();

      expect(metrics1).not.toBe(metrics2);
      expect(metrics1).toEqual(metrics2);
    });
  });

  describe('getAggregate', () => {
    it('should return zero stats when no games recorded', () => {
      const agg = collector.getAggregate();

      expect(agg.totalGames).toBe(0);
      expect(agg.playerWins).toBe(0);
      expect(agg.opponentWins).toBe(0);
      expect(agg.draws).toBe(0);
      expect(agg.incompleteGames).toBe(0);
      expect(agg.avgTurns).toBe(0);
      expect(agg.avgDurationMs).toBe(0);
      expect(agg.playerWinRate).toBe(0);
      expect(agg.opponentWinRate).toBe(0);
      expect(agg.drawRate).toBe(0);
    });

    it('should compute stats for single game', () => {
      const result: ISimulationResult = {
        seed: 1,
        winner: 'player',
        turns: 10,
        durationMs: 5000,
        events: [],
      };

      collector.recordGame(result);
      const agg = collector.getAggregate();

      expect(agg.totalGames).toBe(1);
      expect(agg.playerWins).toBe(1);
      expect(agg.opponentWins).toBe(0);
      expect(agg.draws).toBe(0);
      expect(agg.avgTurns).toBe(10);
      expect(agg.avgDurationMs).toBe(5000);
      expect(agg.playerWinRate).toBeCloseTo(100, 2);
    });

    it('should compute win rates correctly', () => {
      const results: ISimulationResult[] = [
        { seed: 1, winner: 'player', turns: 5, durationMs: 2000, events: [] },
        { seed: 2, winner: 'opponent', turns: 6, durationMs: 2500, events: [] },
        { seed: 3, winner: 'player', turns: 7, durationMs: 3000, events: [] },
        { seed: 4, winner: 'draw', turns: 8, durationMs: 3500, events: [] },
      ];

      results.forEach((r) => collector.recordGame(r));
      const agg = collector.getAggregate();

      expect(agg.totalGames).toBe(4);
      expect(agg.playerWins).toBe(2);
      expect(agg.opponentWins).toBe(1);
      expect(agg.draws).toBe(1);
      expect(agg.playerWinRate).toBeCloseTo(50, 2); // 2/4 * 100
      expect(agg.opponentWinRate).toBeCloseTo(25, 2); // 1/4 * 100
      expect(agg.drawRate).toBeCloseTo(25, 2); // 1/4 * 100
    });

    it('should compute averages correctly', () => {
      const results: ISimulationResult[] = [
        { seed: 1, winner: 'player', turns: 10, durationMs: 5000, events: [] },
        { seed: 2, winner: 'opponent', turns: 20, durationMs: 10000, events: [] },
        { seed: 3, winner: 'draw', turns: 30, durationMs: 15000, events: [] },
      ];

      results.forEach((r) => collector.recordGame(r));
      const agg = collector.getAggregate();

      expect(agg.avgTurns).toBeCloseTo(20, 2); // (10+20+30)/3
      expect(agg.avgDurationMs).toBeCloseTo(10000, 2); // (5000+10000+15000)/3
    });

    it('should handle incomplete games (null winner)', () => {
      const results: ISimulationResult[] = [
        { seed: 1, winner: 'player', turns: 5, durationMs: 2000, events: [] },
        { seed: 2, winner: null, turns: 100, durationMs: 50000, events: [] },
        { seed: 3, winner: 'opponent', turns: 6, durationMs: 2500, events: [] },
      ];

      results.forEach((r) => collector.recordGame(r));
      const agg = collector.getAggregate();

      expect(agg.totalGames).toBe(3);
      expect(agg.incompleteGames).toBe(1);
      expect(agg.playerWins).toBe(1);
      expect(agg.opponentWins).toBe(1);
      expect(agg.playerWinRate).toBeCloseTo(50, 2); // 1/2 * 100 (excluding incomplete)
      expect(agg.opponentWinRate).toBeCloseTo(50, 2); // 1/2 * 100
    });

    it('should handle all incomplete games', () => {
      const results: ISimulationResult[] = [
        { seed: 1, winner: null, turns: 100, durationMs: 50000, events: [] },
        { seed: 2, winner: null, turns: 100, durationMs: 50000, events: [] },
      ];

      results.forEach((r) => collector.recordGame(r));
      const agg = collector.getAggregate();

      expect(agg.totalGames).toBe(2);
      expect(agg.incompleteGames).toBe(2);
      expect(agg.playerWinRate).toBe(0); // No completed games
      expect(agg.opponentWinRate).toBe(0);
      expect(agg.drawRate).toBe(0);
    });

    it('should handle all draws', () => {
      const results: ISimulationResult[] = [
        { seed: 1, winner: 'draw', turns: 10, durationMs: 5000, events: [] },
        { seed: 2, winner: 'draw', turns: 12, durationMs: 6000, events: [] },
      ];

      results.forEach((r) => collector.recordGame(r));
      const agg = collector.getAggregate();

      expect(agg.totalGames).toBe(2);
      expect(agg.draws).toBe(2);
      expect(agg.playerWinRate).toBe(0);
      expect(agg.opponentWinRate).toBe(0);
      expect(agg.drawRate).toBeCloseTo(100, 2);
    });

    it('should count violations by type', () => {
      const agg = collector.getAggregate();
      expect(agg.violationsByType).toEqual({});
    });

    it('should count violations by severity', () => {
      const agg = collector.getAggregate();
      expect(agg.violationsBySeverity.critical).toBe(0);
      expect(agg.violationsBySeverity.warning).toBe(0);
    });
  });

  describe('reset', () => {
    it('should clear all recorded games', () => {
      const result: ISimulationResult = {
        seed: 1,
        winner: 'player',
        turns: 5,
        durationMs: 2000,
        events: [],
      };

      collector.recordGame(result);
      expect(collector.getMetrics()).toHaveLength(1);

      collector.reset();
      expect(collector.getMetrics()).toHaveLength(0);

      const agg = collector.getAggregate();
      expect(agg.totalGames).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle division by zero in averages', () => {
      const agg = collector.getAggregate();
      expect(agg.avgTurns).toBe(0);
      expect(agg.avgDurationMs).toBe(0);
      expect(Number.isNaN(agg.avgTurns)).toBe(false);
    });

    it('should handle very large numbers', () => {
      const result: ISimulationResult = {
        seed: Number.MAX_SAFE_INTEGER,
        winner: 'player',
        turns: 1000000,
        durationMs: 999999999,
        events: [],
      };

      collector.recordGame(result);
      const metrics = collector.getMetrics();

      expect(metrics[0].seed).toBe(Number.MAX_SAFE_INTEGER);
      expect(metrics[0].turns).toBe(1000000);
    });

    it('should preserve timestamp order', () => {
      const results: ISimulationResult[] = [
        { seed: 1, winner: 'player', turns: 5, durationMs: 2000, events: [] },
        { seed: 2, winner: 'opponent', turns: 6, durationMs: 2500, events: [] },
        { seed: 3, winner: 'draw', turns: 7, durationMs: 3000, events: [] },
      ];

      results.forEach((r) => collector.recordGame(r));
      const metrics = collector.getMetrics();

      expect(metrics[0].seed).toBe(1);
      expect(metrics[1].seed).toBe(2);
      expect(metrics[2].seed).toBe(3);
    });
  });
});
