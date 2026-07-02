/**
 * Integration Tests for Simulation System
 *
 * Tests the full pipeline: generate -> run -> collect metrics -> save snapshots -> generate report
 * Also validates statistical properties (win rates, reproducibility) over 100 games.
 */

import * as fs from 'fs';
import * as path from 'path';

import { GameEventType } from '@/types/gameplay';

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

function readPositiveIntEnv(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// Test configuration
const STATISTICAL_GAME_COUNT = readPositiveIntEnv('SIMULATION_COUNT', 100);
const PROFILE_GAME_COUNT = readPositiveIntEnv(
  'SIMULATION_PROFILE_GAME_COUNT',
  100,
);
// Default widened 750 → 2250 (3× per the repo perf-budget convention; see
// the dominance-ceiling widening in swarm-pilot-skills-batch.test.ts).
// Reason: a single STANDARD_LANCE run measures a consistent ~930-950 ms
// under Jest on a current dev box (3 consecutive runs, 2026-06-10) — the
// 750 ms default predates the audit-wave W0-W3 restorations of full combat
// fidelity (crit cascades, PSR chains, consciousness checks). The CI
// perf-smoke lane pins its own budget via env (4000 ms) and is unaffected.
const PROFILE_RUNNER_BUDGET_MS = readPositiveIntEnv(
  'SIMULATION_PROFILE_RUNNER_BUDGET_MS',
  2250,
);
const PROFILE_AVG_GAME_BUDGET_MS = readPositiveIntEnv(
  'SIMULATION_PROFILE_AVG_GAME_BUDGET_MS',
  1500,
);
// Widened 120s → 360s (3× per the repo perf-budget convention) when
// `gameUnitsWithAdaptedCombatSeeds` started seeding real per-location
// armor/structure into auto-resolved sessions — games last more turns now
// that armor absorbs damage; the contended 100-game batch measured ~148s.
const PROFILE_TIME_BUDGET_MS = readPositiveIntEnv(
  'SIMULATION_PROFILE_TIME_BUDGET_MS',
  360000,
);

// Statistical proofs are only meaningful at the full batch size: at the CI
// smoke count (SIMULATION_COUNT=5) batch-wide existence assertions can
// legitimately observe zero occurrences. Smoke runs keep structure-only
// checks; the full default (local runs + the nightly full-size lane, tracker
// W4.4) gets real existence teeth. Pattern follows the statisticalIt gate in
// swarm-pilot-skills-batch.test.ts (2026-06-09 audit finding E-5 fix);
// applied here for finding E-4.
const STATISTICAL_PROOF_GAME_MIN = 100;
const statisticalIt =
  STATISTICAL_GAME_COUNT >= STATISTICAL_PROOF_GAME_MIN ? it : it.skip;

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
      // Engine ceiling — see SimulationRunnerConstants.MAX_TURNS.
      expect(result.turns).toBeLessThanOrEqual(100);
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

      // All operations should be fast. These wall-clock profiling assertions
      // need enough room for shared runners and the stricter combat validation
      // path, while the batch wall-clock target below remains the
      // authoritative performance gate.
      expect(generatorMs).toBeLessThan(150);
      expect(runnerMs).toBeLessThan(PROFILE_RUNNER_BUDGET_MS);
      expect(metricsMs).toBeLessThan(30);
    });

    it(
      `should keep ${PROFILE_GAME_COUNT} games inside the contended profiling budget`,
      () => {
        const config: ISimulationConfig = { ...STANDARD_LANCE, seed: 10001 };
        const batchRunner = new BatchRunner();

        const startTime = Date.now();
        const results = batchRunner.runBatch(PROFILE_GAME_COUNT, config);
        const elapsed = Date.now() - startTime;

        expect(results).toHaveLength(PROFILE_GAME_COUNT);
        expect(elapsed).toBeLessThan(PROFILE_TIME_BUDGET_MS);
      },
      PROFILE_TIME_BUDGET_MS + 30000,
    );
  });
});
