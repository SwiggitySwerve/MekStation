// Run one duration-balanced PR shard, or with `--suite-set nightly` one shard of
// the full Nightly census. The app is built once by its CI job.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import {
  NIGHTLY_DURATIONS,
  assertSameTests,
  assertShardNotEmpty,
  assertShardsCoverCensus,
  collectTests,
  nightlyCensusArgs,
  nightlySuites,
  nightlyTaskArgs,
  parseInvocation,
  parseNightlyInvocation,
  planShards,
  planSuiteShards,
  prCensusArgs,
  prTaskArgs,
  shardTestLists,
  suitesForDataSpecs,
} from './ci-e2e-plan.mjs';
import { LIMIT } from './unit-spec-refs.mjs';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const cli = path.join(root, 'node_modules/@playwright/test/cli.js');
const planOnly = process.argv.includes('--plan-only');
const argv = process.argv.slice(2).filter((arg) => arg !== '--plan-only');
const nightly = argv.includes('--suite-set');
const dataSpecs = nightly
  ? []
  : JSON.parse(process.env.CI_E2E_DATA_SPECS || '[]');
// Nightly suites need the census, so they are built after it is listed.
let suites = nightly ? [] : suitesForDataSpecs(dataSpecs);
const {
  suite: requestedSuite,
  shardIndex,
  shardCount,
} = nightly ? parseNightlyInvocation(argv) : parseInvocation(argv, dataSpecs);
// The data step names what it cannot see: a green data step does not mean no
// spec depends on the changed data (family/glob selection is not selected).
if (requestedSuite.name === 'data') console.log(LIMIT);
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
  nightly ? nightlyCensusArgs() : prCensusArgs(suites),
  'census',
);
if (nightly) suites = nightlySuites(tests);
const durations = nightly
  ? path.join(root, NIGHTLY_DURATIONS)
  : path.join(root, 'config/playwright/ci-durations.json');
if (nightly && !fs.existsSync(durations))
  throw new Error(
    `Missing ${NIGHTLY_DURATIONS}: record it from Nightly reports with record-ci-e2e-durations.mjs --suite-set nightly`,
  );
const timing = JSON.parse(fs.readFileSync(durations, 'utf8'));
const plan = nightly
  ? planSuiteShards(tests, timing, shardCount, suites)
  : planShards(tests, timing, shardCount, dataSpecs);
// Every shard process re-derives the same plan: prove it partitions the census
// and that this shard has something to run. A PR step runs only its own suite's
// task, so one suite may have nothing on this shard; the shard as a whole may not.
assertShardsCoverCensus(shardTestLists(plan), tests);
assertShardNotEmpty(
  shardTestLists(plan)[shardIndex - 1],
  `${shardIndex}/${shardCount}`,
);
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
  const args = nightly ? nightlyTaskArgs(suite, list) : prTaskArgs(suite, list);
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
  // A Nightly shard runs a third of the whole suite, inside a 180-minute job.
  const timeout = setTimeout(kill, nightly ? 9_000_000 : 600_000);
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
  assertShardNotEmpty(observed, `${suite.name} execution`);
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
