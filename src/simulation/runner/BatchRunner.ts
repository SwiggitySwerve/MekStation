import { ISimulationConfig } from '../core/types';
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
   */
  runBatch(
    count: number,
    baseConfig: ISimulationConfig,
    onProgress?: ProgressCallback,
    participants?: readonly IParticipant[],
  ): ISimulationRunResult[] {
    const results: ISimulationRunResult[] = [];

    for (let i = 0; i < count; i++) {
      const config = { ...baseConfig, seed: baseConfig.seed + i };
      const runner = new SimulationRunner(config.seed);
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
