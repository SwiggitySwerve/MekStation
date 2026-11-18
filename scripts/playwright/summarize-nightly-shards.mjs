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

/** The live Chromium census of this checkout, as Playwright's --list JSON. */
function listCensus() {
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
  return JSON.parse(listing.stdout);
}

/** Returns the exit code. `deps` lets tests replace the census and output. */
export function main(
  argv,
  {
    env = process.env,
    listCensus: list = listCensus,
    log = console.log,
    error = console.error,
  } = {},
) {
  const [count, dir] = argv;
  const shardCount = Number(count);
  if (!Number.isInteger(shardCount) || shardCount < 1 || !dir) {
    error('Usage: summarize-nightly-shards.mjs <shardCount> <dir>');
    return 1;
  }
  const problems = [];
  try {
    const shardResult = env.NIGHTLY_SHARD_RESULT;
    // The aggregate result of the shard matrix: cancelled or skipped also fail.
    if (shardResult !== 'success')
      problems.push(`shard matrix result is ${shardResult || 'missing'}`);

    const census = collectTests(list());
    const hash = censusHash(census);
    log(`census: ${census.length} tests, ${hash}`);

    const lists = [];
    for (let shard = 1; shard <= shardCount; shard++) {
      const folder = path.join(dir, `nightly-e2e-timings-${shard}`);
      const plan = path.join(folder, 'plan-nightly.json');
      if (!fs.existsSync(plan))
        problems.push(`shard ${shard}: no plan uploaded`);
      else if (JSON.parse(fs.readFileSync(plan, 'utf8')).censusHash !== hash)
        problems.push(`shard ${shard}: planned a different census`);
      const report = path.join(folder, 'nightly.json');
      if (!fs.existsSync(report)) {
        problems.push(`shard ${shard}: no executed-test report`);
        continue;
      }
      const tests = collectTests(JSON.parse(fs.readFileSync(report, 'utf8')));
      log(`shard ${shard}/${shardCount}: ${tests.length} tests executed`);
      lists.push(tests);
    }
    if (lists.length === shardCount) {
      try {
        assertShardsCoverCensus(lists, census);
        log('union check: shard executions equal the census exactly');
      } catch (failure) {
        problems.push(`union check: ${failure.message}`);
      }
    } else problems.push('union check: incomplete, a shard report is missing');

    const accounting = retryAccounting(lists.flat());
    log(
      `first-attempt results: ${accounting.firstAttempt.length}; retry-only passes: ${accounting.retryOnly.length}; failed: ${accounting.failed.length}; skipped: ${accounting.skipped.length}`,
    );
    log('first-attempt results:');
    for (const key of accounting.firstAttempt) log(`  ${key}`);
    log('retry-only passes:');
    for (const { key, attempts } of accounting.retryOnly)
      log(
        `::warning::OBSERVATION retry-only pass (${attempts} attempts): ${key}`,
      );
    for (const key of accounting.failed) log(`  failed: ${key}`);
    if (accounting.failed.length)
      problems.push(`${accounting.failed.length} tests failed every attempt`);
  } catch (failure) {
    // A census or report that cannot be read still prints what came before.
    problems.push(failure.message);
  }
  for (const problem of problems) error(`::error::${problem}`);
  return problems.length ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  process.exitCode = main(process.argv.slice(2));
