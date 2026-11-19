#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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
  'src/lib/multiplayer/server/__tests__/campaignHostIntentServerTime.test.ts',
  'src/lib/multiplayer/server/__tests__/MatchStoreStress.test.ts',
  'src/__tests__/performance.test.tsx',
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

export function buildLaneInvocations(lane, extraArgs = []) {
  const selectedLane = lanes[lane];

  if (!selectedLane) {
    return {
      exitCode: 1,
      error: `Unknown Jest lane "${lane ?? ''}". Expected one of: ${Object.keys(lanes).join(', ')}`,
    };
  }

  if (selectedLane.isolatedPaths) {
    // Each fixed file runs alone --runInBand; extra Jest args would conflict
    // with that loop, so refuse them instead of silently dropping them.
    if (extraArgs.length > 0) {
      return {
        exitCode: 2,
        error: `${lane} runs fixed files --runInBand; extra arguments are not supported: ${extraArgs.join(' ')}`,
      };
    }

    return {
      env: selectedLane.env,
      invocations: selectedLane.isolatedPaths.map((testPath) => ({
        label: testPath,
        args: [...selectedLane.baseArgs, testPath],
      })),
    };
  }

  return {
    env: selectedLane.env,
    // Forward everything after the lane name (`npm run test:corpus -- ...`).
    invocations: [{ args: [...selectedLane.args, ...extraArgs] }],
  };
}

function runJest(args, env) {
  return spawnSync(npxCommand, args, {
    env: {
      ...process.env,
      ...env,
    },
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });
}

function main(lane, extraArgs) {
  const plan = buildLaneInvocations(lane, extraArgs);

  if (plan.error) {
    console.error(plan.error);
    return plan.exitCode;
  }

  for (const { label, args } of plan.invocations) {
    if (label) console.log(`[jest-lane:${lane}] ${label}`);
    const result = runJest(args, plan.env);

    if (result.error) {
      console.error(result.error);
      return 1;
    }

    if (result.status !== 0) {
      return result.status ?? 1;
    }
  }

  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv[2], process.argv.slice(3)));
}
