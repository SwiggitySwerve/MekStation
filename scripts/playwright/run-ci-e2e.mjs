// Run one duration-balanced PR shard. The app is built once by its CI job.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import {
  assertSameTests,
  collectTests,
  parseInvocation,
  planShards,
  suitesForDataSpecs,
} from './ci-e2e-plan.mjs';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const cli = path.join(root, 'node_modules/@playwright/test/cli.js');
const planOnly = process.argv.includes('--plan-only');
const dataSpecs = JSON.parse(process.env.CI_E2E_DATA_SPECS || '[]');
const suites = suitesForDataSpecs(dataSpecs);
const { suite: requestedSuite, shardIndex } = parseInvocation(
  process.argv.slice(2).filter((arg) => arg !== '--plan-only'),
  dataSpecs,
);
const output = path.join(root, 'e2e-timings');
fs.mkdirSync(output, { recursive: true });
const invocationStarted = performance.now();
const listings = [];

function writeListingTimings() {
  const receipt = {
    suite: requestedSuite.name,
    shard: shardIndex,
    planOnly,
    listings,
    listingCount: listings.length,
    listingMs: listings.reduce((total, { elapsedMs }) => total + elapsedMs, 0),
    invocationMs: performance.now() - invocationStarted,
  };
  fs.writeFileSync(
    path.join(output, `listing-${requestedSuite.name}.json`),
    JSON.stringify(receipt, null, 2),
  );
}

function listTests(args, phase) {
  const started = performance.now();
  const result = spawnSync(
    process.execPath,
    [cli, 'test', ...args, '--project=chromium', '--list', '--reporter=json'],
    {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120_000,
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: '' },
    },
  );
  const listing = {
    phase,
    elapsedMs: performance.now() - started,
    exitCode: result.status,
  };
  listings.push(listing);
  writeListingTimings();
  console.log(
    JSON.stringify({
      suite: requestedSuite.name,
      shard: shardIndex,
      e2eListing: listing,
    }),
  );
  if (result.error || result.status !== 0)
    throw new Error(
      `Cannot collect E2E census: ${result.error ?? result.stderr}`,
    );
  return collectTests(JSON.parse(result.stdout));
}

const tests = listTests(
  suites.flatMap(({ files }) => files.map((f) => `e2e/${f}`)),
  'census',
);
const timing = JSON.parse(
  fs.readFileSync(
    path.join(root, 'config/playwright/ci-durations.json'),
    'utf8',
  ),
);
const plan = planShards(tests, timing, 2, dataSpecs);
fs.writeFileSync(
  path.join(output, `plan-${requestedSuite.name}.json`),
  JSON.stringify(plan, null, 2),
);
console.log(
  JSON.stringify({
    census: plan.censusHash,
    tests: plan.count,
    unknown: plan.unknown,
    predictedShardSeconds: plan.shards.map(
      ({ milliseconds }) => milliseconds / 1000,
    ),
  }),
);

async function runTask(task) {
  const suite = suites.find(({ name }) => name === task.suite);
  const list = path.join(output, `${suite.name}.txt`);
  const report = path.join(output, `${suite.name}.json`);
  fs.writeFileSync(list, task.tests.map(({ key }) => key).join('\n') + '\n');
  const args = [
    ...suite.files.map((f) => `e2e/${f}`),
    `--test-list=${list}`,
    '--project=chromium',
    `--workers=${suite.workers}`,
    ...suite.options,
    `--output=test-results/${suite.name}`,
  ];
  assertSameTests(task.tests, listTests(args, 'selection'));
  const started = Date.now();
  if (planOnly) return;
  const child = spawn(
    process.execPath,
    [path.join(root, 'scripts/playwright/run-playwright.mjs'), 'test', ...args],
    {
      cwd: root,
      env: {
        ...process.env,
        PLAYWRIGHT_HTML_OUTPUT_DIR: `playwright-report-${suite.name}`,
        PLAYWRIGHT_JSON_OUTPUT_FILE: report,
      },
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'inherit', 'inherit'],
    },
  );
  const kill = () => {
    if (process.platform === 'win32')
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
      });
    else {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    }
  };
  const interrupted = () => {
    kill();
    process.exitCode = 1;
  };
  process.once('SIGTERM', interrupted);
  process.once('SIGINT', interrupted);
  // A stuck browser/server must fail this gate and release its process tree.
  const timeout = setTimeout(kill, 600_000);
  let code;
  try {
    code = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (status) => resolve(status ?? 1));
    });
  } finally {
    clearTimeout(timeout);
    process.removeListener('SIGTERM', interrupted);
    process.removeListener('SIGINT', interrupted);
  }
  if (code !== 0) throw new Error(`${suite.name} failed with exit ${code}`);
  const observed = collectTests(JSON.parse(fs.readFileSync(report, 'utf8')));
  assertSameTests(task.tests, observed);
  if (observed.some(({ results }) => results.length === 0))
    throw new Error(`${suite.name} reported unexecuted tests`);
  console.log(
    JSON.stringify({
      suite: suite.name,
      tests: observed.length,
      elapsedMs: Date.now() - started,
    }),
  );
}

const failures = [];
// Continue collecting evidence from remaining suites when a previous one fails.
for (const task of plan.shards[shardIndex - 1].tasks.filter(
  ({ suite }) => suite === requestedSuite.name,
)) {
  try {
    await runTask(task);
  } catch (error) {
    failures.push(error);
    console.error(error);
  }
}
if (failures.length) process.exitCode = 1;
writeListingTimings();
