#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const lane = process.argv[2];
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const perfSensitiveTests = [
  'src/simulation/__tests__/simulation.test.ts',
  'src/simulation/__tests__/integration.test.ts',
  'src/simulation/__tests__/simulation-combat-integration.test.ts',
  'src/simulation/__tests__/swarm-pilot-skills-batch.test.ts',
  'src/simulation/__tests__/swarm-throughput.test.ts',
  'src/components/gameplay/__tests__/perfBudgets.test.tsx',
  // Stays in the unit shards for its functional assertions; its broadcast
  // wall-clock budget is asserted only here (SIMULATION_PERF_ASSERTIONS=true).
  'src/lib/multiplayer/server/__tests__/fogOfWar.test.ts',
];

const lanes = {
  stable: {
    env: {
      JEST_EXCLUDE_PERF_SENSITIVE: 'true',
    },
    args: ['jest', '--watchAll=false'],
  },
  // Whole-catalog suites and roadmap tooling tests, split out of `unit` by
  // JEST_SPLIT_CORPUS (config/jest/corpus-suites.js). CI runs them as their own
  // jobs; locally, `test:corpus` / `test:roadmap` run just those.
  corpus: {
    env: { JEST_SPLIT_CORPUS: 'true' },
    args: ['jest', '--selectProjects', 'corpus', '--watchAll=false'],
  },
  roadmap: {
    env: { JEST_SPLIT_CORPUS: 'true' },
    args: ['jest', '--selectProjects', 'roadmap', '--watchAll=false'],
  },
  'perf-sensitive': {
    env: {
      SIMULATION_PERF_ASSERTIONS: 'true',
    },
    baseArgs: [
      'jest',
      '--selectProjects',
      'unit',
      '--watchAll=false',
      '--runInBand',
      '--runTestsByPath',
    ],
    isolatedPaths: perfSensitiveTests,
  },
};

const selectedLane = lanes[lane];

if (!selectedLane) {
  console.error(
    `Unknown Jest lane "${lane ?? ''}". Expected one of: ${Object.keys(lanes).join(', ')}`,
  );
  process.exit(1);
}

function runJest(args) {
  return spawnSync(npxCommand, args, {
    env: {
      ...process.env,
      ...selectedLane.env,
    },
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });
}

if (selectedLane.isolatedPaths) {
  for (const testPath of selectedLane.isolatedPaths) {
    console.log(`[jest-lane:${lane}] ${testPath}`);
    const result = runJest([...selectedLane.baseArgs, testPath]);

    if (result.error) {
      console.error(result.error);
      process.exit(1);
    }

    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }

  process.exit(0);
}

const result = runJest(selectedLane.args);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
