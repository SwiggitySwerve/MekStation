#!/usr/bin/env node
// Makes sure every PR Checks run reports a `Lint and Test` conclusion.
//
// `Lint and Test` (if: always()) is the only required check. GitHub has
// finished a PR Checks run without ever creating that job (run 41817202190,
// PR #2660: 32 jobs green, run failed, no aggregator). A missing required
// check blocks a normal merge but not an admin merge, so when the job is
// missing this posts a failed `Lint and Test` check on the run's head commit.
// A re-run that creates the real job reports a newer conclusion over it.
//
// Usage: node scripts/ci/lint-and-test-guard.mjs --repo <owner/name>
//          --run <run id> --sha <head sha> [--dry-run]
// Needs GH_TOKEN with checks:write (unless --dry-run) and actions:read.

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const AGGREGATOR = 'Lint and Test';

/** True when no job of the run's latest attempt is the aggregator. */
export function aggregatorMissing(jobs) {
  return !jobs.some((job) => job.name === AGGREGATOR);
}

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8' });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const repo = arg('repo');
  const run = arg('run');
  const sha = arg('sha');
  if (!repo || !run || !sha) {
    console.error(
      'usage: --repo <owner/name> --run <id> --sha <sha> [--dry-run]',
    );
    process.exit(2);
  }
  const jobs = gh([
    'api',
    '--paginate',
    `repos/${repo}/actions/runs/${run}/jobs?per_page=100`,
    '--jq',
    '.jobs[] | {name: .name}',
  ])
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  if (!aggregatorMissing(jobs)) {
    console.log(`${AGGREGATOR} reported in run ${run} (${jobs.length} jobs).`);
    process.exit(0);
  }
  const summary = `PR Checks run ${run} finished without a ${AGGREGATOR} job, so nothing proved its fan-out checks passed. Re-run PR Checks.`;
  console.log(
    `${AGGREGATOR} missing from run ${run}: reporting failure on ${sha}.`,
  );
  if (process.argv.includes('--dry-run')) process.exit(0);
  gh([
    'api',
    `repos/${repo}/check-runs`,
    '-f',
    `name=${AGGREGATOR}`,
    '-f',
    `head_sha=${sha}`,
    '-f',
    'status=completed',
    '-f',
    'conclusion=failure',
    '-f',
    `output[title]=${AGGREGATOR} never ran`,
    '-f',
    `output[summary]=${summary}`,
  ]);
}
