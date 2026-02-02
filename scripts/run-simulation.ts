#!/usr/bin/env npx tsx
import * as path from 'path';
import * as fs from 'fs';

import { BatchRunner } from '../src/simulation/runner/BatchRunner';
import { SimulationRunner } from '../src/simulation/runner/SimulationRunner';
import { InvariantRunner } from '../src/simulation/invariants/InvariantRunner';
import {
  checkUnitPositionUniqueness,
  checkHeatNonNegative,
  checkArmorBounds,
} from '../src/simulation/invariants/checkers';
import { MetricsCollector } from '../src/simulation/metrics/MetricsCollector';
import { ReportGenerator } from '../src/simulation/reporting/ReportGenerator';
import { SnapshotManager } from '../src/simulation/snapshot/SnapshotManager';
import { STANDARD_LANCE } from '../src/simulation/generator/presets';
import { ISimulationConfig } from '../src/simulation/core/types';

function parseArgs(): { count: number; seed: number; preset: string; outputDir: string } {
  const args = process.argv.slice(2);
  
  let count = 10;
  let seed = Date.now();
  let preset = 'standard';
  let outputDir = 'simulation-reports';

  for (const arg of args) {
    if (arg.startsWith('--count=')) {
      count = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--seed=')) {
      seed = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--preset=')) {
      preset = arg.split('=')[1];
    } else if (arg.startsWith('--output=')) {
      outputDir = arg.split('=')[1];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return { count, seed, preset, outputDir };
}

function printHelp(): void {
  console.log(`
MekStation Simulation Runner

Usage: npx tsx scripts/run-simulation.ts [options]

Options:
  --count=N     Number of simulations to run (default: 10)
  --seed=N      Base random seed (default: current timestamp)
  --preset=P    Scenario preset: standard, light, stress (default: standard)
  --output=DIR  Output directory for reports (default: simulation-reports)
  --help, -h    Show this help message

Examples:
  npx tsx scripts/run-simulation.ts --count=100 --seed=12345
  npx tsx scripts/run-simulation.ts --preset=light --count=50
  npx tsx scripts/run-simulation.ts --count=1000 --output=./reports
`);
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

function getPresetConfig(preset: string, seed: number): ISimulationConfig {
  switch (preset) {
    case 'light':
      return { seed, turnLimit: 10, unitCount: { player: 2, opponent: 2 }, mapRadius: 5 };
    case 'stress':
      return { seed, turnLimit: 50, unitCount: { player: 4, opponent: 4 }, mapRadius: 10 };
    case 'standard':
    default:
      return { ...STANDARD_LANCE, seed };
  }
}

async function main(): Promise<void> {
  const { count, seed, preset, outputDir } = parseArgs();
  const config = getPresetConfig(preset, seed);

  console.log('='.repeat(60));
  console.log('MekStation Simulation Runner');
  console.log('='.repeat(60));
  console.log(`Simulations: ${count}`);
  console.log(`Base Seed:   ${seed}`);
  console.log(`Preset:      ${preset}`);
  console.log(`Output Dir:  ${outputDir}`);
  console.log(`Config:      ${config.unitCount.player}v${config.unitCount.opponent}, ${config.turnLimit} turn limit, radius ${config.mapRadius}`);
  console.log('='.repeat(60));

  const batchRunner = new BatchRunner();
  const metricsCollector = new MetricsCollector();
  const snapshotManager = new SnapshotManager();

  console.log('\nRunning simulations...');
  const startTime = Date.now();

  let lastProgress = 0;
  const results = batchRunner.runBatch(count, config, (current, total) => {
    const progress = Math.floor((current / total) * 100);
    if (progress >= lastProgress + 10) {
      process.stdout.write(`\r  Progress: ${progress}% (${current}/${total})`);
      lastProgress = progress;
    }
  });
  
  const elapsed = Date.now() - startTime;
  console.log(`\r  Progress: 100% (${count}/${count})    `);
  console.log(`\nCompleted in ${elapsed}ms (${(elapsed / count).toFixed(2)}ms per simulation)`);

  let failedCount = 0;
  for (const result of results) {
    metricsCollector.recordGame(result);
    
    if (result.violations.length > 0) {
      failedCount++;
      snapshotManager.saveFailedScenario(result, { ...config, seed: result.seed });
    }
  }

  const aggregate = metricsCollector.getAggregate();

  console.log('\n' + '-'.repeat(60));
  console.log('Results Summary');
  console.log('-'.repeat(60));
  console.log(`Total Games:      ${aggregate.totalGames}`);
  console.log(`Player Wins:      ${aggregate.playerWins} (${aggregate.playerWinRate.toFixed(1)}%)`);
  console.log(`Opponent Wins:    ${aggregate.opponentWins} (${aggregate.opponentWinRate.toFixed(1)}%)`);
  console.log(`Draws:            ${aggregate.draws} (${aggregate.drawRate.toFixed(1)}%)`);
  console.log(`Incomplete:       ${aggregate.incompleteGames}`);
  console.log(`Average Turns:    ${aggregate.avgTurns.toFixed(1)}`);
  console.log(`Total Violations: ${aggregate.totalViolations}`);
  console.log(`Failed Scenarios: ${failedCount}`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(outputDir, `simulation-report-${timestamp}.json`);

  const reportGenerator = new ReportGenerator();
  reportGenerator.saveTo(
    metricsCollector.getMetrics(),
    aggregate,
    config,
    reportPath
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

main().catch((error) => {
  console.error('Simulation failed:', error);
  process.exit(1);
});
