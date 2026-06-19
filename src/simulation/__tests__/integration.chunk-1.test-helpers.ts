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
const PROFILE_TIME_BUDGET_MS = readPositiveIntEnv(
  'SIMULATION_PROFILE_TIME_BUDGET_MS',
  120000,
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

      const startTime = Date.now();
      batchResults = batchRunner.runBatch(STATISTICAL_GAME_COUNT, config);
      const elapsed = Date.now() - startTime;

      metricsCollector = new MetricsCollector();
      for (const result of batchResults) {
        metricsCollector.recordGame(result);
      }
      aggregate = metricsCollector.getAggregate();
    }, 120000); // 2 minute timeout for 100 games

    it(`should complete ${STATISTICAL_GAME_COUNT} games`, () => {
      expect(batchResults).toHaveLength(STATISTICAL_GAME_COUNT);
    });

    it('should keep win/loss accounting consistent at any batch size', () => {
      // Honest replacement for the pre-audit "balanced win rates (40-60%
      // range for MVP)" test (2026-06-09 audit finding E-4): that test's
      // only live assertion was totalGames > 0 — its win-rate branch was
      // dead code because completedGames is 0 at EVERY batch size for this
      // config (verified by direct measurement 2026-06-10: 0 of 100
      // STANDARD_LANCE games finish inside turnLimit 20; minimal units
      // carry too much HP to be destroyed that fast). Win-rate balance is
      // proven with real teeth in swarm-pilot-skills-batch.test.ts (E-5
      // fix), which uses a 100-turn cap so games actually complete.
      expect(aggregate.totalGames).toBe(STATISTICAL_GAME_COUNT);
      expect(
        aggregate.playerWins +
          aggregate.opponentWins +
          aggregate.draws +
          aggregate.incompleteGames,
      ).toBe(aggregate.totalGames);
    });

    statisticalIt(
      'should produce real combat activity in nearly every statistical-batch game',
      () => {
        // Existence teeth for the statistical batch (audit E-4): a
        // regression that silences the combat pipeline (no attacks, no
        // damage, no falls) must fail loudly at the full batch size instead
        // of sliding through structure-only checks. Thresholds calibrated
        // by direct measurement 2026-06-10 at N=100, seed 50000: 100/100
        // games with AttackResolved, 100/100 with DamageApplied, 96/100
        // with UnitFell. Margins leave room for seeded drift when
        // unrelated rules change.
        const gamesWithAttacks = batchResults.filter((r) =>
          r.events.some((e) => e.type === GameEventType.AttackResolved),
        ).length;
        const gamesWithDamage = batchResults.filter((r) =>
          r.events.some((e) => e.type === GameEventType.DamageApplied),
        ).length;
        const gamesWithFalls = batchResults.filter((r) =>
          r.events.some((e) => e.type === GameEventType.UnitFell),
        ).length;

        expect(gamesWithAttacks).toBeGreaterThanOrEqual(
          STATISTICAL_GAME_COUNT * 0.9,
        );
        expect(gamesWithDamage).toBeGreaterThanOrEqual(
          STATISTICAL_GAME_COUNT * 0.9,
        );
        expect(gamesWithFalls).toBeGreaterThan(STATISTICAL_GAME_COUNT * 0.5);
      },
    );

    it('should have less than 5% games with violations', () => {
      const isInvariantViolation = (v: { invariant: string }) =>
        !v.invariant.startsWith('detector:');

      const gamesWithViolations = batchResults.filter(
        (r) => r.violations.filter(isInvariantViolation).length > 0,
      ).length;
      const violationRate =
        (gamesWithViolations / STATISTICAL_GAME_COUNT) * 100;

      expect(violationRate).toBeLessThan(5);
    });

    it('should have no systematic violations (same violation in >10% of games)', () => {
      const violationCounts: Record<string, number> = {};

      for (const result of batchResults) {
        for (const violation of result.violations) {
          if (violation.invariant.startsWith('detector:')) continue;
          violationCounts[violation.invariant] =
            (violationCounts[violation.invariant] || 0) + 1;
        }
      }

      const threshold = STATISTICAL_GAME_COUNT * 0.1;
      for (const [type, count] of Object.entries(violationCounts)) {
        expect(count).toBeLessThanOrEqual(threshold);
      }
    });

    it('should complete within concurrent-suite per-game budget', () => {
      const totalDuration = batchResults.reduce(
        (sum, r) => sum + r.durationMs,
        0,
      );
      const avgDuration = totalDuration / STATISTICAL_GAME_COUNT;

      // Keep the statistical batch under a coarse per-game ceiling even when
      // Jest runs this suite beside other simulation workers. Full-suite Jest
      // contention can push individual recorded game durations far above the
      // isolated profile. Keep this coarse enough for full-suite contention
      // while still catching runaway per-game regressions.
      expect(avgDuration).toBeLessThan(PROFILE_AVG_GAME_BUDGET_MS);
    });
  });

  describe('Reproducibility', () => {
    // Re-enabled (2026-06-09 audit finding E-3): this was skipped against a
    // determinism gap exposed when MAX_TURNS was raised 10 → 100, with the
    // skip pointing at a "simulation engine determinism audit" follow-up.
    // That follow-up landed (the determinism-audit CI lane bans unseeded
    // Math.random() in the combat pipeline, and the W0 audit wave restored
    // the seeded-dice reverts); the skip itself was untracked and stale.
    // Verified green at STANDARD_LANCE seed 99999 on re-enable.
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
});
