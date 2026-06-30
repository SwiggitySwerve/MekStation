import * as fs from 'fs';
import * as path from 'path';

import { createDefaultInvariantRunner } from '../src/simulation/invariants/createDefaultInvariantRunner';
import { MetricsCollector } from '../src/simulation/metrics/MetricsCollector';
import { ReportGenerator } from '../src/simulation/reporting/ReportGenerator';
import { BatchRunner } from '../src/simulation/runner/BatchRunner';
import { SnapshotManager } from '../src/simulation/snapshot/SnapshotManager';
import { getPresetConfig, parsePresetArgs } from './run-simulation-cli';

export async function runPresetMode(): Promise<void> {
  const { count, seed, preset, outputDir } = parsePresetArgs();
  const config = getPresetConfig(preset, seed);

  console.log('='.repeat(60));
  console.log('MekStation Simulation Runner');
  console.log('='.repeat(60));
  console.log(`Simulations: ${count}`);
  console.log(`Base Seed:   ${seed}`);
  console.log(`Preset:      ${preset}`);
  console.log(`Output Dir:  ${outputDir}`);
  console.log(
    `Config:      ${config.unitCount.player}v${config.unitCount.opponent}, ${config.turnLimit} turn limit, radius ${config.mapRadius}`,
  );
  console.log('='.repeat(60));

  const batchRunner = new BatchRunner();
  const metricsCollector = new MetricsCollector();
  const snapshotManager = new SnapshotManager();

  console.log('\nRunning simulations...');
  const startTime = Date.now();

  let lastProgress = 0;
  const results = batchRunner.runBatch(
    count,
    config,
    (current, total) => {
      const progress = Math.floor((current / total) * 100);
      if (progress >= lastProgress + 10) {
        process.stdout.write(
          `\r  Progress: ${progress}% (${current}/${total})`,
        );
        lastProgress = progress;
      }
    },
    undefined,
    createDefaultInvariantRunner(),
  );

  const elapsed = Date.now() - startTime;
  console.log(`\r  Progress: 100% (${count}/${count})    `);
  console.log(
    `\nCompleted in ${elapsed}ms (${(elapsed / count).toFixed(2)}ms per simulation)`,
  );

  let failedCount = 0;
  for (const result of results) {
    metricsCollector.recordGame(result);

    if (result.violations.length > 0) {
      failedCount++;
      snapshotManager.saveFailedScenario(result, {
        ...config,
        seed: result.seed,
      });
    }
  }

  const aggregate = metricsCollector.getAggregate();

  console.log('\n' + '-'.repeat(60));
  console.log('Results Summary');
  console.log('-'.repeat(60));
  console.log(`Total Games:      ${aggregate.totalGames}`);
  console.log(
    `Player Wins:      ${aggregate.playerWins} (${aggregate.playerWinRate.toFixed(1)}%)`,
  );
  console.log(
    `Opponent Wins:    ${aggregate.opponentWins} (${aggregate.opponentWinRate.toFixed(1)}%)`,
  );
  console.log(
    `Draws:            ${aggregate.draws} (${aggregate.drawRate.toFixed(1)}%)`,
  );
  console.log(`Incomplete:       ${aggregate.incompleteGames}`);
  console.log(`Average Turns:    ${aggregate.avgTurns.toFixed(1)}`);
  console.log(`Total Violations: ${aggregate.totalViolations}`);
  console.log(`Failed Scenarios: ${failedCount}`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(
    outputDir,
    `simulation-report-${timestamp}.json`,
  );

  const reportGenerator = new ReportGenerator();
  reportGenerator.saveTo(
    metricsCollector.getMetrics(),
    aggregate,
    config,
    reportPath,
  );

  console.log('\n' + '-'.repeat(60));
  console.log(`Report saved: ${reportPath}`);

  if (failedCount > 0) {
    console.log(`Snapshots saved to: src/simulation/__snapshots__/failed/`);
  }

  console.log('-'.repeat(60));

  const exitCode = aggregate.totalViolations > 0 ? 1 : 0;
  process.exit(exitCode);
}
