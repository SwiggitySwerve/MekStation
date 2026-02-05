import { ISimulationConfig } from '../core/types';
import { SimulationRunner } from './SimulationRunner';
import { ISimulationRunResult, ProgressCallback } from './types';

export class BatchRunner {
  runBatch(
    count: number,
    baseConfig: ISimulationConfig,
    onProgress?: ProgressCallback,
  ): ISimulationRunResult[] {
    const results: ISimulationRunResult[] = [];

    for (let i = 0; i < count; i++) {
      const config = { ...baseConfig, seed: baseConfig.seed + i };
      const runner = new SimulationRunner(config.seed);
      const result = runner.run(config);
      results.push(result);

      if (onProgress) {
        onProgress(i + 1, count);
      }
    }

    return results;
  }
}
