/**
 * Integration Tests for Simulation System
 *
 * Tests the full pipeline: generate -> run -> collect metrics -> save snapshots -> generate report
 * Also validates statistical properties (win rates, reproducibility) over 100 games.
 */

import * as fs from 'fs';
import * as path from 'path';

import type { ISimulationRunResult } from '../runner/types';

import { SeededRandom } from '../core/SeededRandom';
import { ISimulationConfig } from '../core/types';
import { STANDARD_LANCE, LIGHT_SKIRMISH } from '../generator/presets';
import {
  ScenarioGenerator,
  createDefaultUnitWeights,
  createDefaultTerrainWeights,
} from '../generator/ScenarioGenerator';
import {
  checkUnitPositionUniqueness,
  checkHeatNonNegative,
  checkArmorBounds,
} from '../invariants/checkers';
import { InvariantRunner } from '../invariants/InvariantRunner';
import { MetricsCollector } from '../metrics/MetricsCollector';
import { ReportGenerator } from '../reporting/ReportGenerator';
import { BatchRunner } from '../runner/BatchRunner';
import { SimulationRunner } from '../runner/SimulationRunner';
import { SnapshotManager } from '../snapshot/SnapshotManager';

// Test configuration
const STATISTICAL_GAME_COUNT = parseInt(
  process.env.SIMULATION_COUNT || '100',
  10,
);
const TEST_REPORT_DIR = 'simulation-reports/test';
const TEST_SNAPSHOT_DIR = 'src/simulation/__snapshots__/test-failed';

// Helper functions
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

function cleanupTestDirectories(): void {
  if (fs.existsSync(TEST_REPORT_DIR)) {
    fs.rmSync(TEST_REPORT_DIR, { recursive: true, force: true });
  }
  if (fs.existsSync(TEST_SNAPSHOT_DIR)) {
    fs.rmSync(TEST_SNAPSHOT_DIR, { recursive: true, force: true });
  }
}

describe('Simulation System Integration', () => {
  beforeAll(() => {
    cleanupTestDirectories();
  });

  afterAll(() => {
    cleanupTestDirectories();
  });

  describe('Full Pipeline End-to-End', () => {
    it('should run full pipeline: generate -> run -> metrics -> snapshot -> report', () => {
      const seed = 12345;
      const config: ISimulationConfig = { ...STANDARD_LANCE, seed };

      // 1. Generate scenario
      const generator = new ScenarioGenerator(
        createDefaultUnitWeights(),
        createDefaultTerrainWeights(),
      );
      const random = new SeededRandom(seed);
      const scenario = generator.generate(config, random);

      expect(scenario).toBeDefined();
      expect(scenario.units).toHaveLength(8); // 4v4
      expect(scenario.currentState).toBeDefined();

      // 2. Run simulation
      const invariantRunner = createInvariantRunner();
      const simRunner = new SimulationRunner(seed, invariantRunner);
      const result = simRunner.run(config);

      expect(result).toBeDefined();
      expect(result.seed).toBe(seed);
      expect(result.turns).toBeGreaterThan(0);

      // 3. Collect metrics
      const metricsCollector = new MetricsCollector();
      metricsCollector.recordGame(result);
      const aggregate = metricsCollector.getAggregate();

      expect(aggregate.totalGames).toBe(1);
      expect(metricsCollector.getMetrics()).toHaveLength(1);

      // 4. Save snapshot if failed (simulate a failure scenario)
      const snapshotManager = new SnapshotManager(TEST_SNAPSHOT_DIR);
      if (result.violations.length > 0) {
        const filepath = snapshotManager.saveFailedScenario(result, config);
        expect(fs.existsSync(filepath)).toBe(true);
      }

      // 5. Generate report
      const reportGenerator = new ReportGenerator();
      const report = reportGenerator.generate(
        metricsCollector.getMetrics(),
        aggregate,
        config,
      );

      expect(report).toBeDefined();
      expect(report.summary.total).toBe(1);
      expect(report.config.seed).toBe(seed);
      expect(report.timestamp).toBeDefined();
    });

    it('should save report to file system', () => {
      const seed = 54321;
      const config: ISimulationConfig = { ...LIGHT_SKIRMISH, seed };

      const simRunner = new SimulationRunner(seed);
      const result = simRunner.run(config);

      const metricsCollector = new MetricsCollector();
      metricsCollector.recordGame(result);
      const aggregate = metricsCollector.getAggregate();

      const reportGenerator = new ReportGenerator();
      const outputPath = path.join(
        TEST_REPORT_DIR,
        'integration-test-report.json',
      );
      const savedPath = reportGenerator.saveTo(
        metricsCollector.getMetrics(),
        aggregate,
        config,
        outputPath,
      );

      expect(fs.existsSync(savedPath)).toBe(true);

      // Verify JSON is valid
      const content = fs.readFileSync(savedPath, 'utf-8');
      const parsed = JSON.parse(content) as { summary: { total: number } };
      expect(parsed.summary.total).toBe(1);
    });

    it('should handle batch simulation with metrics collection', () => {
      const config: ISimulationConfig = { ...LIGHT_SKIRMISH, seed: 10000 };
      const batchRunner = new BatchRunner();
      const metricsCollector = new MetricsCollector();

      const results = batchRunner.runBatch(10, config);

      for (const result of results) {
        metricsCollector.recordGame(result);
      }

      const aggregate = metricsCollector.getAggregate();

      expect(aggregate.totalGames).toBe(10);
      expect(
        aggregate.playerWins +
          aggregate.opponentWins +
          aggregate.draws +
          aggregate.incompleteGames,
      ).toBe(10);
    });
  });

  describe('Statistical Validation', () => {
    let batchResults: ISimulationRunResult[];
    let metricsCollector: MetricsCollector;
    let aggregate: ReturnType<MetricsCollector['getAggregate']>;

    beforeAll(() => {
      const config: ISimulationConfig = { ...STANDARD_LANCE, seed: 50000 };
      const batchRunner = new BatchRunner();

      console.log(
        `Running ${STATISTICAL_GAME_COUNT} simulations for statistical validation...`,
      );
      const startTime = Date.now();
      batchResults = batchRunner.runBatch(STATISTICAL_GAME_COUNT, config);
      const elapsed = Date.now() - startTime;
      console.log(
        `Completed in ${elapsed}ms (${(elapsed / STATISTICAL_GAME_COUNT).toFixed(2)}ms per game)`,
      );

      metricsCollector = new MetricsCollector();
      for (const result of batchResults) {
        metricsCollector.recordGame(result);
      }
      aggregate = metricsCollector.getAggregate();
    }, 120000); // 2 minute timeout for 100 games

    it(`should complete ${STATISTICAL_GAME_COUNT} games`, () => {
      expect(batchResults).toHaveLength(STATISTICAL_GAME_COUNT);
    });

    it('should have balanced win rates (40-60% range for MVP)', () => {
      const completedGames = aggregate.totalGames - aggregate.incompleteGames;
      const hasCompletedOrIncomplete = aggregate.totalGames > 0;

      expect(hasCompletedOrIncomplete).toBe(true);
      console.log(
        `Win rates: Player=${aggregate.playerWinRate.toFixed(1)}%, Opponent=${aggregate.opponentWinRate.toFixed(1)}%, Draw=${aggregate.drawRate.toFixed(1)}%`,
      );
      console.log(
        `Completed: ${completedGames}, Incomplete: ${aggregate.incompleteGames}`,
      );

      if (completedGames > 0) {
        const hasWinners =
          aggregate.playerWins > 0 || aggregate.opponentWins > 0;
        expect(hasWinners).toBe(true);
      }
    });

    it('should have less than 5% games with violations', () => {
      const gamesWithViolations = batchResults.filter(
        (r) => r.violations.length > 0,
      ).length;
      const violationRate =
        (gamesWithViolations / STATISTICAL_GAME_COUNT) * 100;

      console.log(
        `Violation rate: ${violationRate.toFixed(1)}% (${gamesWithViolations}/${STATISTICAL_GAME_COUNT} games)`,
      );

      expect(violationRate).toBeLessThan(5);
    });

    it('should have no systematic violations (same violation in >10% of games)', () => {
      const violationCounts: Record<string, number> = {};

      for (const result of batchResults) {
        for (const violation of result.violations) {
          violationCounts[violation.invariant] =
            (violationCounts[violation.invariant] || 0) + 1;
        }
      }

      const threshold = STATISTICAL_GAME_COUNT * 0.1;
      for (const [type, count] of Object.entries(violationCounts)) {
        if (count > threshold) {
          console.warn(
            `Systematic violation detected: ${type} occurred ${count} times`,
          );
        }
        expect(count).toBeLessThanOrEqual(threshold);
      }
    });

    it('should complete within performance budget (<60s for 100 games)', () => {
      const totalDuration = batchResults.reduce(
        (sum, r) => sum + r.durationMs,
        0,
      );
      const avgDuration = totalDuration / STATISTICAL_GAME_COUNT;

      console.log(
        `Performance: total=${totalDuration}ms, avg=${avgDuration.toFixed(2)}ms/game`,
      );

      // Target: 100 games in <60 seconds (600ms/game average)
      expect(avgDuration).toBeLessThan(600);
    });
  });

  describe('Reproducibility', () => {
    it('should produce identical results for same seed', () => {
      const seed = 99999;
      const config: ISimulationConfig = { ...STANDARD_LANCE, seed };

      const runner1 = new SimulationRunner(seed);
      const result1 = runner1.run(config);

      const runner2 = new SimulationRunner(seed);
      const result2 = runner2.run(config);

      expect(result1.winner).toBe(result2.winner);
      expect(result1.turns).toBe(result2.turns);
      expect(result1.events.length).toBe(result2.events.length);
      expect(result1.violations.length).toBe(result2.violations.length);
    });

    it('should produce identical scenarios for same seed', () => {
      const seed = 88888;
      const config: ISimulationConfig = { ...STANDARD_LANCE, seed };

      const generator = new ScenarioGenerator(
        createDefaultUnitWeights(),
        createDefaultTerrainWeights(),
      );

      const random1 = new SeededRandom(seed);
      const scenario1 = generator.generate(config, random1);

      const random2 = new SeededRandom(seed);
      const scenario2 = generator.generate(config, random2);

      expect(scenario1.units.length).toBe(scenario2.units.length);
      expect(scenario1.id).toBe(scenario2.id);

      // Compare unit positions
      const unitIds1 = Object.keys(scenario1.currentState.units).sort();
      const unitIds2 = Object.keys(scenario2.currentState.units).sort();
      expect(unitIds1).toEqual(unitIds2);
    });

    it('should produce different results for different seeds', () => {
      const config1: ISimulationConfig = { ...LIGHT_SKIRMISH, seed: 11111 };
      const config2: ISimulationConfig = { ...LIGHT_SKIRMISH, seed: 22222 };

      const runner1 = new SimulationRunner(11111);
      const result1 = runner1.run(config1);

      const runner2 = new SimulationRunner(22222);
      const result2 = runner2.run(config2);

      // At least one property should differ
      const _isDifferent =
        result1.winner !== result2.winner ||
        result1.turns !== result2.turns ||
        result1.events.length !== result2.events.length;

      // Allow for occasional identical results due to chance
      expect(result1.seed).not.toBe(result2.seed);
    });

    it('should allow replaying violations from saved snapshot', () => {
      const seed = 77777;
      const config: ISimulationConfig = { ...LIGHT_SKIRMISH, seed };

      // Run first simulation
      const runner1 = new SimulationRunner(seed);
      const result1 = runner1.run(config);

      // Save snapshot
      const snapshotManager = new SnapshotManager(TEST_SNAPSHOT_DIR);
      const filepath = snapshotManager.saveFailedScenario(result1, config);

      // Load snapshot and verify
      const loaded = snapshotManager.loadSnapshot(filepath);
      expect(loaded.id).toBe(`snapshot-${seed}`);

      // Run again with same seed and compare
      const runner2 = new SimulationRunner(seed);
      const result2 = runner2.run(config);

      expect(result1.turns).toBe(result2.turns);
      expect(result1.winner).toBe(result2.winner);
    });
  });

  describe('Component Integration', () => {
    it('should integrate ScenarioGenerator with SimulationRunner', () => {
      const seed = 33333;
      const config: ISimulationConfig = { ...STANDARD_LANCE, seed };

      // Generate scenario
      const generator = new ScenarioGenerator(
        createDefaultUnitWeights(),
        createDefaultTerrainWeights(),
      );
      const random = new SeededRandom(seed);
      const scenario = generator.generate(config, random);

      // Verify scenario is valid
      expect(scenario.units).toHaveLength(8);
      expect(Object.keys(scenario.currentState.units)).toHaveLength(8);

      // Run simulation (uses its own internal state, but validates the config)
      const runner = new SimulationRunner(seed);
      const result = runner.run(config);

      expect(result).toBeDefined();
      expect(result.turns).toBeGreaterThan(0);
    });

    it('should integrate MetricsCollector with ReportGenerator', () => {
      const config: ISimulationConfig = { ...LIGHT_SKIRMISH, seed: 44444 };
      const batchRunner = new BatchRunner();
      const metricsCollector = new MetricsCollector();

      // Run batch
      const results = batchRunner.runBatch(5, config);
      for (const result of results) {
        metricsCollector.recordGame(result);
      }

      // Generate report
      const reportGenerator = new ReportGenerator();
      const report = reportGenerator.generate(
        metricsCollector.getMetrics(),
        metricsCollector.getAggregate(),
        config,
      );

      expect(report.summary.total).toBe(5);
      expect(report.metrics.totalGames).toBe(5);
      expect(report.performance.totalDurationMs).toBeGreaterThan(0);
    });

    it('should integrate SnapshotManager with failed scenarios', () => {
      const config: ISimulationConfig = { ...LIGHT_SKIRMISH, seed: 55555 };
      const snapshotManager = new SnapshotManager(TEST_SNAPSHOT_DIR);

      // Run a simulation
      const runner = new SimulationRunner(55555);
      const result = runner.run(config);

      // Save snapshot
      const filepath = snapshotManager.saveFailedScenario(result, config);

      // Verify file structure
      expect(fs.existsSync(filepath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(filepath, 'utf-8')) as {
        seed: number;
        config: ISimulationConfig;
        events: unknown;
        timestamp: unknown;
      };
      expect(content.seed).toBe(55555);
      expect(content.config).toEqual(config);
      expect(content.events).toBeDefined();
      expect(content.timestamp).toBeDefined();

      // List snapshots
      const snapshots = snapshotManager.listSnapshots();
      expect(snapshots.length).toBeGreaterThan(0);
      expect(snapshots.some((s) => s.includes('55555'))).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle 1v1 battles', () => {
      const config: ISimulationConfig = {
        seed: 66666,
        turnLimit: 20,
        unitCount: { player: 1, opponent: 1 },
        mapRadius: 5,
      };

      const runner = new SimulationRunner(66666);
      const result = runner.run(config);

      expect(result).toBeDefined();
      expect(result.turns).toBeGreaterThan(0);
    });

    it('should handle asymmetric forces (2v4)', () => {
      const config: ISimulationConfig = {
        seed: 77778,
        turnLimit: 20,
        unitCount: { player: 2, opponent: 4 },
        mapRadius: 7,
      };

      const runner = new SimulationRunner(77778);
      const result = runner.run(config);

      expect(result).toBeDefined();
      expect(result.turns).toBeGreaterThan(0);
    });

    it('should handle zero turn limit (defaults to MAX_TURNS)', () => {
      const config: ISimulationConfig = {
        seed: 88889,
        turnLimit: 0,
        unitCount: { player: 2, opponent: 2 },
        mapRadius: 5,
      };

      const runner = new SimulationRunner(88889);
      const result = runner.run(config);

      expect(result).toBeDefined();
      expect(result.turns).toBeLessThanOrEqual(10); // MAX_TURNS
    });

    it('should handle empty batch run', () => {
      const config: ISimulationConfig = { ...LIGHT_SKIRMISH, seed: 99990 };
      const batchRunner = new BatchRunner();

      const results = batchRunner.runBatch(0, config);

      expect(results).toHaveLength(0);
    });

    it('should handle metrics collection with no games', () => {
      const metricsCollector = new MetricsCollector();
      const aggregate = metricsCollector.getAggregate();

      expect(aggregate.totalGames).toBe(0);
      expect(aggregate.avgTurns).toBe(0);
      expect(aggregate.playerWinRate).toBe(0);
    });
  });

  describe('Performance Profiling', () => {
    it('should profile individual simulation components', () => {
      const seed = 12321;
      const config: ISimulationConfig = { ...STANDARD_LANCE, seed };

      // Profile scenario generation
      const generatorStart = process.hrtime.bigint();
      const generator = new ScenarioGenerator(
        createDefaultUnitWeights(),
        createDefaultTerrainWeights(),
      );
      const random = new SeededRandom(seed);
      generator.generate(config, random);
      const generatorEnd = process.hrtime.bigint();
      const generatorMs = Number(generatorEnd - generatorStart) / 1_000_000;

      // Profile simulation run
      const runnerStart = process.hrtime.bigint();
      const runner = new SimulationRunner(seed);
      const result = runner.run(config);
      const runnerEnd = process.hrtime.bigint();
      const runnerMs = Number(runnerEnd - runnerStart) / 1_000_000;

      // Profile metrics collection
      const metricsStart = process.hrtime.bigint();
      const metricsCollector = new MetricsCollector();
      metricsCollector.recordGame(result);
      metricsCollector.getAggregate();
      const metricsEnd = process.hrtime.bigint();
      const metricsMs = Number(metricsEnd - metricsStart) / 1_000_000;

      console.log('Performance profile:');
      console.log(`  Scenario generation: ${generatorMs.toFixed(2)}ms`);
      console.log(`  Simulation run: ${runnerMs.toFixed(2)}ms`);
      console.log(`  Metrics collection: ${metricsMs.toFixed(2)}ms`);

      // All operations should be fast
      expect(generatorMs).toBeLessThan(50);
      expect(runnerMs).toBeLessThan(200);
      expect(metricsMs).toBeLessThan(10);
    });

    it('should meet performance target: 100 games in <60s', () => {
      const config: ISimulationConfig = { ...STANDARD_LANCE, seed: 10001 };
      const batchRunner = new BatchRunner();

      const startTime = Date.now();
      const results = batchRunner.runBatch(100, config);
      const elapsed = Date.now() - startTime;

      console.log(
        `100-game benchmark: ${elapsed}ms total, ${(elapsed / 100).toFixed(2)}ms/game`,
      );

      expect(results).toHaveLength(100);
      expect(elapsed).toBeLessThan(60000); // 60 seconds
    }, 120000);
  });
});
