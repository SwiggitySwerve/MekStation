/**
 * Swarm throughput test — Task 5.12.
 *
 * Verifies that 1000 sequential simulation runs with the minimal 1v1 config
 * complete in under 60 seconds. This acts as a performance regression guard:
 * if any change in the simulation loop significantly degrades throughput, this
 * test will catch it before it lands.
 *
 * Uses the same minimal config as the smoke tests (turnLimit=5, mapRadius=5)
 * to keep each individual run fast while exercising the sequential-loop path
 * that the swarm CLI runner uses.
 *
 * @spec openspec/changes/add-encounter-swarm-harness/specs/quick-session/spec.md
 * @design D10 — sequential execution (no worker_threads)
 */

import { getBehaviorVariant } from '../ai/behaviorVariants';
import { BotPlayer } from '../ai/BotPlayer';
import { SideKeyedAIPlayer } from '../ai/SideKeyedAIPlayer';
import { SeededRandom } from '../core/SeededRandom';
import { ISimulationConfig } from '../core/types';
import { SimulationRunner } from '../runner/SimulationRunner';

// =============================================================================
// Config
// =============================================================================

/** Minimal 1v1 config — identical to smoke test for consistency. */
const THROUGHPUT_CONFIG: ISimulationConfig = {
  seed: 12345,
  turnLimit: 5,
  unitCount: { player: 1, opponent: 1 },
  mapRadius: 5,
};

function readPositiveIntEnv(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Number of sequential runs to execute. */
const RUN_COUNT = readPositiveIntEnv('SWARM_THROUGHPUT_RUN_COUNT', 1000);

/**
 * Wall-clock time budget in milliseconds. Widened 60s → 180s (3× per the
 * repo perf-budget convention) when `gameUnitsWithAdaptedCombatSeeds`
 * started seeding real per-location armor/structure into auto-resolved
 * sessions — battles genuinely last more turns now that armor absorbs
 * damage (the prior empty maps made every penetrating hit destroy the
 * location), measured ~70s for the 1000-run batch on a current dev box.
 */
const TIME_BUDGET_MS = readPositiveIntEnv(
  'SWARM_THROUGHPUT_TIME_BUDGET_MS',
  180_000,
);
const JEST_TIMEOUT_MS =
  TIME_BUDGET_MS + Math.max(5_000, Math.ceil(TIME_BUDGET_MS * 0.1));

// =============================================================================
// Tests
// =============================================================================

describe(`Swarm throughput — ${RUN_COUNT} sequential runs in < ${
  TIME_BUDGET_MS / 1000
}s (Task 5.12)`, () => {
  it(
    `completes ${RUN_COUNT} sequential runs within ${TIME_BUDGET_MS / 1000}s`,
    () => {
      const behaviorA = getBehaviorVariant('default');
      const behaviorB = getBehaviorVariant('aggressive');

      const startMs = Date.now();

      for (let i = 0; i < RUN_COUNT; i++) {
        // Each run gets a distinct seed derived from the base seed + run index,
        // matching the swarm CLI runner pattern (baseSeed + i).
        const runSeed = THROUGHPUT_CONFIG.seed + i;

        const aiFactory = (random: SeededRandom) =>
          new SideKeyedAIPlayer(
            new BotPlayer(random, behaviorA),
            new BotPlayer(random, behaviorB),
          );

        const runner = new SimulationRunner(
          runSeed,
          undefined,
          undefined,
          aiFactory,
        );
        runner.run(THROUGHPUT_CONFIG);
      }

      const elapsedMs = Date.now() - startMs;

      // Report elapsed for easy CI log inspection.
      console.log(
        `[throughput] ${RUN_COUNT} runs completed in ${elapsedMs}ms (${(elapsedMs / RUN_COUNT).toFixed(2)}ms/run)`,
      );

      expect(elapsedMs).toBeLessThan(TIME_BUDGET_MS);
    },
    JEST_TIMEOUT_MS,
  );

  it(
    `all ${RUN_COUNT} runs produce zero logic violations (state-cycle excluded)`,
    () => {
      const behaviorA = getBehaviorVariant('default');
      const behaviorB = getBehaviorVariant('defensive');

      let logicViolations = 0;

      for (let i = 0; i < RUN_COUNT; i++) {
        const runSeed = THROUGHPUT_CONFIG.seed + i;

        const aiFactory = (random: SeededRandom) =>
          new SideKeyedAIPlayer(
            new BotPlayer(random, behaviorA),
            new BotPlayer(random, behaviorB),
          );

        const runner = new SimulationRunner(
          runSeed,
          undefined,
          undefined,
          aiFactory,
        );
        const result = runner.run(THROUGHPUT_CONFIG);
        // Exclude state-cycle detector hits — these are heuristic cycle
        // detections that fire on short (turnLimit=5) runs when units repeat
        // positions on a small map. The invariant tested here is that no
        // engine-logic violations occur across the full configured batch.
        logicViolations += result.violations.filter(
          (v) => v.invariant !== 'detector:state-cycle',
        ).length;
      }

      expect(logicViolations).toBe(0);
    },
    JEST_TIMEOUT_MS,
  );
});
