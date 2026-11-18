// The Nightly "Full E2E Suite (chromium)" summary: after all shards, prove the
// executed tests of every shard partition a fresh census of the same head
// (none missing, none duplicated), merge retry accounting, and fail unless
// every shard succeeded.
// Usage: node summarize-nightly-shards.mjs <shardCount> <dir>
// <dir>/nightly-e2e-timings-<i>/ holds shard i's e2e-timings upload.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  assertShardsCoverCensus,
  censusHash,
  collectTests,
  nightlyCensusArgs,
  retryAccounting,
} from './ci-e2e-plan.mjs';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const [count, dir] = process.argv.slice(2);
const shardCount = Number(count);
if (!Number.isInteger(shardCount) || shardCount < 1 || !dir)
  throw new Error('Usage: summarize-nightly-shards.mjs <shardCount> <dir>');

const problems = [];
const shardResult = process.env.NIGHTLY_SHARD_RESULT;
// The aggregate result of the shard matrix: cancelled or skipped also fail.
if (shardResult !== 'success')
  problems.push(`shard matrix result is ${shardResult || 'missing'}`);

const listing = spawnSync(
  process.execPath,
  [
    path.join(root, 'node_modules/@playwright/test/cli.js'),
    'test',
    ...nightlyCensusArgs(),
    '--project=chromium',
    '--list',
    '--reporter=json',
  ],
  {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 120_000,
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: '' },
  },
);
if (listing.error || listing.status !== 0)
  throw new Error(
    `Cannot collect E2E census: ${listing.error ?? listing.stderr}`,
  );
const census = collectTests(JSON.parse(listing.stdout));
const hash = censusHash(census);
console.log(`census: ${census.length} tests, ${hash}`);

const lists = [];
for (let shard = 1; shard <= shardCount; shard++) {
  const folder = path.join(dir, `nightly-e2e-timings-${shard}`);
  const plan = path.join(folder, 'plan-nightly.json');
  if (!fs.existsSync(plan)) problems.push(`shard ${shard}: no plan uploaded`);
  else if (JSON.parse(fs.readFileSync(plan, 'utf8')).censusHash !== hash)
    problems.push(`shard ${shard}: planned a different census`);
  const report = path.join(folder, 'nightly.json');
  if (!fs.existsSync(report)) {
    problems.push(`shard ${shard}: no executed-test report`);
    continue;
  }
  const tests = collectTests(JSON.parse(fs.readFileSync(report, 'utf8')));
  console.log(`shard ${shard}/${shardCount}: ${tests.length} tests executed`);
  lists.push(tests);
}
if (lists.length === shardCount) {
  try {
    assertShardsCoverCensus(lists, census);
    console.log('union check: shard executions equal the census exactly');
  } catch (error) {
    problems.push(`union check: ${error.message}`);
  }
} else problems.push('union check: incomplete, a shard report is missing');

const accounting = retryAccounting(lists.flat());
console.log(
  `first-attempt results: ${accounting.firstAttempt.length}; retry-only passes: ${accounting.retryOnly.length}; failed: ${accounting.failed.length}; skipped: ${accounting.skipped.length}`,
);
console.log('first-attempt results:');
for (const key of accounting.firstAttempt) console.log(`  ${key}`);
console.log('retry-only passes:');
for (const { key, attempts } of accounting.retryOnly)
  console.log(
    `::warning::OBSERVATION retry-only pass (${attempts} attempts): ${key}`,
  );
for (const key of accounting.failed) console.log(`  failed: ${key}`);
if (accounting.failed.length)
  problems.push(`${accounting.failed.length} tests failed every attempt`);

for (const problem of problems) console.error(`::error::${problem}`);
if (problems.length) process.exitCode = 1;
