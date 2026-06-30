#!/usr/bin/env npx tsx
/**
 * MekStation Simulation Runner
 *
 * Preset mode:
 *   npx tsx scripts/run-simulation.ts [--count=N] [--seed=N] [--preset=P] [--output=DIR]
 *
 * Swarm mode:
 *   npx tsx scripts/run-simulation.ts --config=<path.json> [overrides...]
 *
 * @spec openspec/changes/add-encounter-swarm-harness/specs/quick-session/spec.md
 */

import { loadSwarmConfig, parseSwarmArgs } from './run-simulation-cli';
import { runPresetMode } from './run-simulation-preset';
import { runSwarmMode } from './run-simulation-swarm';

async function main(): Promise<void> {
  const { configPath, overrides } = parseSwarmArgs();

  if (configPath !== undefined) {
    const config = loadSwarmConfig(configPath, overrides);
    await runSwarmMode(config, configPath);
  } else {
    await runPresetMode();
  }
}

main().catch((error) => {
  console.error('Simulation failed:', error);
  process.exit(1);
});
