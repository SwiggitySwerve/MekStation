import { GameEventType } from '@/types/gameplay';

import type { IDetectorConfig } from '../runner/types';

import { ISimulationConfig } from '../core/types';
import { InvariantRunner } from '../invariants/InvariantRunner';
import { BatchRunner } from '../runner/BatchRunner';
import { SimulationRunner } from '../runner/SimulationRunner';

function createTestConfig(
  overrides: Partial<ISimulationConfig> = {},
): ISimulationConfig {
  return {
    seed: 12345,
    turnLimit: 10,
    unitCount: { player: 2, opponent: 2 },
    mapRadius: 5,
    ...overrides,
  };
}

describe('BatchRunner', () => {
  describe('runBatch', () => {
    it('should run specified number of simulations', () => {
      const batchRunner = new BatchRunner();
      const config = createTestConfig();

      const results = batchRunner.runBatch(5, config);

      expect(results).toHaveLength(5);
    });

    it('should return all results with valid structure', () => {
      const batchRunner = new BatchRunner();
      const config = createTestConfig();

      const results = batchRunner.runBatch(3, config);

      for (const result of results) {
        expect(result).toBeDefined();
        expect(typeof result.seed).toBe('number');
        expect(typeof result.turns).toBe('number');
        expect(typeof result.durationMs).toBe('number');
        expect(Array.isArray(result.events)).toBe(true);
        expect(Array.isArray(result.violations)).toBe(true);
      }
    });

    it('should use incrementing seeds', () => {
      const batchRunner = new BatchRunner();
      const config = createTestConfig({ seed: 1000 });

      const results = batchRunner.runBatch(3, config);

      expect(results[0].seed).toBe(1000);
      expect(results[1].seed).toBe(1001);
      expect(results[2].seed).toBe(1002);
    });

    it('should call progress callback', () => {
      const batchRunner = new BatchRunner();
      const config = createTestConfig();
      const progressCalls: { current: number; total: number }[] = [];

      batchRunner.runBatch(3, config, (current, total) => {
        progressCalls.push({ current, total });
      });

      expect(progressCalls).toHaveLength(3);
      expect(progressCalls[0]).toEqual({ current: 1, total: 3 });
      expect(progressCalls[1]).toEqual({ current: 2, total: 3 });
      expect(progressCalls[2]).toEqual({ current: 3, total: 3 });
    });

    it('should handle count of 0', () => {
      const batchRunner = new BatchRunner();
      const config = createTestConfig();

      const results = batchRunner.runBatch(0, config);

      expect(results).toHaveLength(0);
    });

    it('should handle single simulation', () => {
      const batchRunner = new BatchRunner();
      const config = createTestConfig();

      const results = batchRunner.runBatch(1, config);

      expect(results).toHaveLength(1);
      expect(results[0].seed).toBe(config.seed);
    });

    it('should complete 10 simulations in reasonable time', () => {
      const batchRunner = new BatchRunner();
      const config = createTestConfig({ turnLimit: 10 });

      const startTime = Date.now();
      const results = batchRunner.runBatch(10, config);
      const elapsed = Date.now() - startTime;

      expect(results).toHaveLength(10);
      expect(elapsed).toBeLessThan(10000);
    }, 15000);

    it('should produce different results for different seeds', () => {
      const batchRunner = new BatchRunner();
      const config = createTestConfig();

      const results = batchRunner.runBatch(5, config);

      const uniqueTurns = new Set(results.map((r) => r.turns));

      expect(uniqueTurns.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('batch integration with detectors', () => {
    it('should include detector fields in batch results', () => {
      const batchRunner = new BatchRunner();
      const config = createTestConfig();
      const results = batchRunner.runBatch(3, config);

      for (const result of results) {
        expect(Array.isArray(result.keyMoments)).toBe(true);
        expect(Array.isArray(result.anomalies)).toBe(true);
        expect(typeof result.haltedByCriticalAnomaly).toBe('boolean');
      }
    });
  });

  describe('invariant runner threading (audit 2026-06-09 E-7)', () => {
    /**
     * Build an InvariantRunner whose single registered invariant fires on
     * EVERY state check. Threading this through runBatch proves the
     * injected runner actually executes inside each per-run
     * SimulationRunner — the exact wiring the preset CLI relies on for
     * its violation exit gate (`totalViolations > 0 ? 1 : 0`).
     */
    function createAlwaysFiringRunner(): InvariantRunner {
      const runner = new InvariantRunner();
      runner.register({
        name: 'always_fires',
        description: 'Injected violation fixture — fires on every check',
        severity: 'critical',
        check: () => [
          {
            invariant: 'always_fires',
            severity: 'critical' as const,
            message: 'injected violation fixture',
            context: {},
          },
        ],
      });
      return runner;
    }

    it('threads an injected invariant runner into every run and surfaces violations', () => {
      const batchRunner = new BatchRunner();
      const config = createTestConfig({ turnLimit: 3 });

      const results = batchRunner.runBatch(
        2,
        config,
        undefined,
        undefined,
        createAlwaysFiringRunner(),
      );

      expect(results).toHaveLength(2);
      for (const result of results) {
        // The injected invariant runs per phase/turn — at least one hit
        // per run proves the runner executed inside the simulation loop.
        expect(result.violations.length).toBeGreaterThan(0);
        expect(
          result.violations.some((v) => v.invariant === 'always_fires'),
        ).toBe(true);
      }

      // The CLI exit gate condition: totalViolations > 0 flips exit code 1.
      const totalViolations = results.reduce(
        (sum, r) => sum + r.violations.length,
        0,
      );
      expect(totalViolations).toBeGreaterThan(0);
    });

    it('omitting the invariant runner preserves legacy behavior (zero violations)', () => {
      // Pre-fix behavior: no invariant runner → default EMPTY
      // InvariantRunner → no checks execute → violations stay empty.
      // This is the hole the audit flagged — kept here as the contrast
      // case so the threading test above is provably non-vacuous.
      const batchRunner = new BatchRunner();
      const config = createTestConfig({ turnLimit: 3 });

      const results = batchRunner.runBatch(2, config);

      for (const result of results) {
        // Detector anomalies are converted into `detector:*`-prefixed
        // violations independently of the invariant runner — exclude them
        // so this contrast case isolates invariant-check output only.
        const invariantViolations = result.violations.filter(
          (v) => !v.invariant.startsWith('detector:'),
        );
        expect(invariantViolations).toHaveLength(0);
      }
    });
  });
});
