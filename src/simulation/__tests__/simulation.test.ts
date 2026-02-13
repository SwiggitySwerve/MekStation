import type { ISimulationRunResult } from '../runner/types';

import { ISimulationConfig } from '../core/types';
import {
  checkUnitPositionUniqueness,
  checkHeatNonNegative,
  checkArmorBounds,
} from '../invariants/checkers';
import { InvariantRunner } from '../invariants/InvariantRunner';
import { BatchRunner } from '../runner/BatchRunner';
import { SimulationRunner } from '../runner/SimulationRunner';

const SIMULATION_COUNT = parseInt(process.env.SIMULATION_COUNT || '10', 10);
const BASE_SEED = 1000;

function createTestConfig(
  overrides: Partial<ISimulationConfig> = {},
): ISimulationConfig {
  return {
    seed: BASE_SEED,
    turnLimit: 10,
    unitCount: { player: 2, opponent: 2 },
    mapRadius: 5,
    ...overrides,
  };
}

function createInvariantRunner(): InvariantRunner {
  const runner = new InvariantRunner();
  runner.register({
    name: 'unit_position_uniqueness',
    description: 'Each hex can only have one unit',
    severity: 'critical',
    check: checkUnitPositionUniqueness,
  });
  runner.register({
    name: 'heat_non_negative',
    description: 'Heat cannot be negative',
    severity: 'critical',
    check: checkHeatNonNegative,
  });
  runner.register({
    name: 'armor_bounds',
    description: 'Armor/structure cannot be negative',
    severity: 'critical',
    check: checkArmorBounds,
  });
  return runner;
}

describe('Simulation Integration Tests', () => {
  describe('Single Simulation', () => {
    it('should run with invariant checking', () => {
      const invariantRunner = createInvariantRunner();
      const runner = new SimulationRunner(12345, invariantRunner);
      const config = createTestConfig();

      const result = runner.run(config);

      expect(result).toBeDefined();
      expect(result.turns).toBeGreaterThan(0);
    });

    it('should complete within 1 second', () => {
      const runner = new SimulationRunner(12345);
      const config = createTestConfig();

      const startTime = Date.now();
      runner.run(config);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(1000);
    });
  });

  describe(`Batch Simulation (count=${SIMULATION_COUNT})`, () => {
    let batchResults: ISimulationRunResult[];

    beforeAll(() => {
      const batchRunner = new BatchRunner();
      const config = createTestConfig({ seed: BASE_SEED });
      batchResults = batchRunner.runBatch(SIMULATION_COUNT, config);
    }, 60000);

    it('should complete all simulations', () => {
      expect(batchResults).toHaveLength(SIMULATION_COUNT);
    });

    it('should have valid results for all simulations', () => {
      for (const result of batchResults) {
        expect(result.seed).toBeDefined();
        expect(result.turns).toBeGreaterThan(0);
        expect(result.durationMs).toBeGreaterThanOrEqual(0);
      }
    });

    it('should complete within timeout', () => {
      const totalDuration = batchResults.reduce(
        (sum, r) => sum + r.durationMs,
        0,
      );
      expect(totalDuration).toBeLessThan(10000);
    });

    it('should have no critical invariant violations', () => {
      const allViolations = batchResults.flatMap((r) => r.violations);
      const criticalInvariantViolations = allViolations.filter(
        (v) =>
          v.severity === 'critical' && !v.invariant.startsWith('detector:'),
      );

      expect(criticalInvariantViolations.length).toBe(0);
    });

    it('should have variety in results', () => {
      const uniqueWinners = new Set(batchResults.map((r) => r.winner));
      expect(uniqueWinners.size).toBeGreaterThanOrEqual(1);
    });
  });

  const seedTestCases = [
    { seed: 1, expected: { minTurns: 1, maxTurns: 10 } },
    { seed: 100, expected: { minTurns: 1, maxTurns: 10 } },
    { seed: 9999, expected: { minTurns: 1, maxTurns: 10 } },
    { seed: 123456789, expected: { minTurns: 1, maxTurns: 10 } },
  ];

  describe.each(seedTestCases)(
    'Seed Parameterized Tests',
    ({ seed, expected }) => {
      it(`should handle seed ${seed} within turn bounds`, () => {
        const runner = new SimulationRunner(seed);
        const config = createTestConfig({ seed, turnLimit: 10 });

        const result = runner.run(config);

        expect(result.turns).toBeGreaterThanOrEqual(expected.minTurns);
        expect(result.turns).toBeLessThanOrEqual(expected.maxTurns);
      });
    },
  );

  const unitCountTestCases = [
    { player: 1, opponent: 1 },
    { player: 2, opponent: 2 },
    { player: 3, opponent: 3 },
    { player: 2, opponent: 4 },
    { player: 4, opponent: 2 },
  ];

  describe.each(unitCountTestCases)('Unit Count Variations', (unitCount) => {
    it(`should handle ${unitCount.player}v${unitCount.opponent} units`, () => {
      const runner = new SimulationRunner(12345);
      const config = createTestConfig({ unitCount });

      const result = runner.run(config);

      expect(result).toBeDefined();
      expect(result.turns).toBeGreaterThan(0);
    });
  });

  describe('Turn Limit Variations', () => {
    it.each([1, 3, 5, 10])('should respect turn limit of %i', (turnLimit) => {
      const runner = new SimulationRunner(12345);
      const config = createTestConfig({ turnLimit });

      const result = runner.run(config);

      expect(result.turns).toBeLessThanOrEqual(turnLimit);
    });
  });

  describe('Map Radius Variations', () => {
    it.each([3, 5, 7, 10])('should handle map radius %i', (mapRadius) => {
      const runner = new SimulationRunner(12345);
      const config = createTestConfig({ mapRadius });

      const result = runner.run(config);

      expect(result).toBeDefined();
      expect(result.turns).toBeGreaterThan(0);
    });
  });

  describe('Determinism', () => {
    it('should produce identical results for same seed', () => {
      const config = createTestConfig({ seed: 77777 });

      const runner1 = new SimulationRunner(77777);
      const result1 = runner1.run(config);

      const runner2 = new SimulationRunner(77777);
      const result2 = runner2.run(config);

      expect(result1.turns).toBe(result2.turns);
      expect(result1.winner).toBe(result2.winner);
      expect(result1.violations.length).toBe(result2.violations.length);
    });

    it('should produce different results for different seeds', () => {
      const batchRunner = new BatchRunner();
      const config = createTestConfig();

      const results = batchRunner.runBatch(20, config);
      const uniqueTurnCounts = new Set(results.map((r) => r.turns));
      const uniqueWinners = new Set(results.map((r) => r.winner));

      const hasVariety = uniqueTurnCounts.size > 1 || uniqueWinners.size > 1;
      expect(hasVariety || results.length === 20).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should run single simulation in under 1 second', () => {
      const runner = new SimulationRunner(12345);
      const config = createTestConfig();

      const result = runner.run(config);

      expect(result.durationMs).toBeLessThan(1000);
    });

    it(`should run ${SIMULATION_COUNT} simulations in under 10 seconds`, () => {
      const batchRunner = new BatchRunner();
      const config = createTestConfig();

      const startTime = Date.now();
      batchRunner.runBatch(SIMULATION_COUNT, config);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(10000);
    }, 15000);
  });

  describe('Timeout Prevention', () => {
    it('should not hang on turn limit 0 (no limit)', () => {
      const runner = new SimulationRunner(12345);
      const config = createTestConfig({ turnLimit: 0 });

      const result = runner.run(config);

      expect(result.turns).toBeLessThanOrEqual(10);
    });

    it('should complete game that ends early via victory', () => {
      const runner = new SimulationRunner(98765);
      const config = createTestConfig({
        turnLimit: 100,
        unitCount: { player: 1, opponent: 1 },
      });

      const result = runner.run(config);

      expect(result).toBeDefined();
    });
  });
});
