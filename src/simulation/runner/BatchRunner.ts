import { ISimulationConfig } from '../core/types';
import { InvariantRunner } from '../invariants/InvariantRunner';
import { SimulationRunner } from './SimulationRunner';
import { IParticipant, ISimulationRunResult, ProgressCallback } from './types';

export class BatchRunner {
  /**
   * Run `count` sequential simulations, each with a unique deterministic seed
   * derived from baseConfig.seed + i.  Existing callers pass no participants
   * and receive schemaVersion-1 results unchanged.
   *
   * When `participants` is supplied (D8 — Phase 4 swarm harness), each result
   * is stamped with schemaVersion: 2 and the provided participant records so
   * downstream analysis can correlate outcomes with force composition.
   * The participants array is the same for every run in the batch (same force
   * composition; only seed differs per run).
   *
   * When `invariantRunner` is supplied (audit 2026-06-09 E-7), it is threaded
   * into every per-run SimulationRunner so registered state invariants
   * actually execute and surface in `result.violations`. Omitting it keeps
   * the legacy behavior (a default EMPTY InvariantRunner — no checks run),
   * which is what made the preset CLI's violation exit gate hollow before
   * the fix. The same instance is shared across runs — InvariantRunner holds
   * only the registration list and `runAll` is stateless per call.
   */
  runBatch(
    count: number,
    baseConfig: ISimulationConfig,
    onProgress?: ProgressCallback,
    participants?: readonly IParticipant[],
    invariantRunner?: InvariantRunner,
  ): ISimulationRunResult[] {
    const results: ISimulationRunResult[] = [];

    for (let i = 0; i < count; i++) {
      const config = { ...baseConfig, seed: baseConfig.seed + i };
      const runner = new SimulationRunner(config.seed, invariantRunner);
      const result = runner.run(config);

      // Stamp participants when provided; leave result untouched otherwise
      // so existing callers receive the same shape they always have.
      const stamped: ISimulationRunResult =
        participants !== undefined
          ? { ...result, schemaVersion: 2, participants }
          : result;

      results.push(stamped);

      if (onProgress) {
        onProgress(i + 1, count);
      }
    }

    return results;
  }
}
