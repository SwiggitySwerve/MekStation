import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import * as guard from './lint-and-test-guard.mjs';
import {
  AGGREGATOR,
  aggregatorMissing,
  shouldReportMissing,
} from './lint-and-test-guard.mjs';

test('a run whose aggregator ran, in any conclusion, needs no guard', () => {
  assert.equal(
    aggregatorMissing([{ name: 'Static Checks' }, { name: AGGREGATOR }]),
    false,
  );
});

test('a run without the aggregator job is reported as failed', () => {
  // Run 41817202190: every created job green, no Lint and Test job.
  assert.equal(
    aggregatorMissing([
      { name: 'Detect Changes' },
      { name: 'Unit Tests (1/6)' },
    ]),
    true,
  );
  assert.equal(aggregatorMissing([]), true);
});

test('only the exact required check name counts', () => {
  assert.equal(aggregatorMissing([{ name: 'Lint and Test (advisory)' }]), true);
});

test('a completed run without the aggregator is reported (#2660)', () => {
  // Run 41817202190 concluded failure with no Lint and Test job.
  const jobs = [{ name: 'Detect Changes' }, { name: 'Unit Tests (1/6)' }];
  assert.equal(shouldReportMissing({ conclusion: 'failure', jobs }), true);
  assert.equal(shouldReportMissing({ conclusion: 'success', jobs }), true);
});

test('a cancelled or skipped run posts nothing', () => {
  // Run 41902456406: a dispatch cancelled while pending, so it created only
  // Detect Changes; the guard's failure landed on a head that was green.
  const jobs = [{ name: 'Detect Changes' }];
  assert.equal(shouldReportMissing({ conclusion: 'cancelled', jobs }), false);
  assert.equal(shouldReportMissing({ conclusion: 'skipped', jobs: [] }), false);
});

test('a completed run whose aggregator ran posts nothing', () => {
  const jobs = [{ name: 'Detect Changes' }, { name: AGGREGATOR }];
  assert.equal(shouldReportMissing({ conclusion: 'failure', jobs }), false);
});

const options = {
  repo: 'SwiggitySwerve/MekStation',
  run: '42672743745',
  attempt: 4,
  sha: 'fd3801a9428b918f524e8502ec04f9b1a6194835',
  conclusion: 'success',
  event: 'pull_request',
};
const runUrl = (run = options.run, attempt = options.attempt) =>
  `https://github.com/${options.repo}/actions/runs/${run}/attempts/${attempt}`;
const realJob = (changes = {}) => ({
  id: 123,
  name: AGGREGATOR,
  status: 'completed',
  conclusion: 'success',
  run_attempt: 4,
  ...changes,
});
const legacyCheck = {
  id: 321,
  name: AGGREGATOR,
  status: 'completed',
  conclusion: 'failure',
  app: { slug: 'github-actions' },
  external_id: '',
  output: {
    title: 'Lint and Test never ran',
    summary: `PR Checks run ${options.run} finished without a Lint and Test job, so nothing proved its fan-out checks passed. Re-run PR Checks.`,
  },
};
const priorFailure = {
  creator: { login: 'github-actions[bot]' },
  context: AGGREGATOR,
  state: 'failure',
  description: `Guard: PR Checks run ${options.run} attempt 3 missing Lint and Test; clears when a real aggregator passes.`,
  target_url: runUrl(options.run, 3),
};

function fixture({
  snapshots = [[]],
  all = [],
  statuses = [],
  checks = {},
  pages,
  fail,
  elapsed = 0,
} = {}) {
  const calls = [],
    sleeps = [],
    logs = [],
    warnings = [];
  let reads = 0,
    clock = 0;
  const dependencies = {
    now: () => clock,
    sleep: async (ms) => {
      sleeps.push(ms);
      clock += ms;
    },
    log: (message) => logs.push(message),
    warn: (message) => warnings.push(message),
    request: async (endpoint, request = {}) => {
      calls.push({ endpoint, ...request });
      if (fail) throw new Error('GitHub unavailable');
      clock += elapsed;
      if (request.method === 'POST') return { id: 99 };
      const url = new URL(endpoint, 'https://api.github.com/');
      if (url.pathname.endsWith('/statuses')) return statuses;
      if (url.pathname.includes('/check-runs/')) {
        const id = Number(url.pathname.split('/').at(-1));
        return (
          checks[id] ?? {
            id,
            name: AGGREGATOR,
            external_id: `job-${id}`,
            app: { slug: 'github-actions' },
          }
        );
      }
      const pinned = url.pathname.endsWith(`/attempts/${options.attempt}/jobs`);
      const acrossAttempts =
        url.pathname.endsWith(`/runs/${options.run}/jobs`) &&
        url.searchParams.get('filter') === 'all';
      assert.ok(
        pinned || acrossAttempts,
        `unexpected or unpinned jobs read: ${endpoint}`,
      );
      const page = Number(url.searchParams.get('page') ?? 1);
      const jobs = acrossAttempts
        ? all
        : pages
          ? pages[page - 1]
          : snapshots[Math.min(reads++, snapshots.length - 1)];
      return {
        total_count: pages && pinned ? pages.flat().length : jobs.length,
        jobs,
      };
    },
  };
  return {
    calls,
    sleeps,
    logs,
    warnings,
    run: (changes = {}) =>
      guard.runGuard({ ...options, ...changes }, dependencies),
  };
}
const writes = (f) => f.calls.filter((call) => call.method === 'POST');

test('the retry decision ignores a completed aggregator from another attempt only when it is legacy', () => {
  assert.equal(
    shouldReportMissing({
      conclusion: 'success',
      attempt: options.attempt,
      jobs: [],
      allAttemptJobs: [realJob({ run_attempt: 5 })],
    }),
    false,
  );
  assert.equal(
    shouldReportMissing({
      conclusion: 'success',
      attempt: options.attempt,
      jobs: [],
      allAttemptJobs: [legacyCheck],
    }),
    true,
  );
  assert.equal(aggregatorMissing([legacyCheck]), true);
});

test('missing-then-present listing retries the exact attempt without posting', async () => {
  const f = fixture({ snapshots: [[], [realJob()]] });
  await f.run();
  assert.deepEqual(f.sleeps, [20000]);
  assert.equal(writes(f).length, 0);
  assert.equal(
    f.calls.filter((c) => c.endpoint.includes('/attempts/4/jobs')).length,
    2,
  );
  assert.match(f.logs.join('\n'), /no failure/i);
});

for (const conclusion of ['success', 'failure']) {
  test(`a genuinely missing aggregator on ${conclusion} posts a commit status after bounded retries`, async () => {
    const f = fixture();
    await f.run({ conclusion });
    assert.deepEqual(f.sleeps, [20000, 40000]);
    const posted = writes(f);
    assert.equal(posted.length, 1);
    assert.equal(
      posted[0].endpoint,
      `repos/${options.repo}/statuses/${options.sha}`,
    );
    assert.equal(posted[0].fields.context, AGGREGATOR);
    assert.equal(posted[0].fields.state, 'failure');
    assert.match(
      posted[0].fields.description,
      /^Guard: PR Checks run 42672743745 attempt 4 .*clears when a real aggregator passes\.$/,
    );
    assert.ok(posted[0].fields.description.length <= 140);
    assert.ok(f.calls.at(-2).endpoint.includes('filter=all'));
    assert.ok(f.calls.every((call) => !call.endpoint.endsWith('/check-runs')));
  });
}

for (const conclusion of ['cancelled', 'skipped']) {
  test(`${conclusion} performs no requests, sleeps or writes`, async () => {
    const f = fixture();
    await f.run({ conclusion, event: 'push' });
    assert.deepEqual(f.calls, []);
    assert.deepEqual(f.sleeps, []);
  });
}

test('trigger attempt aggregator wins even when a different attempt has no aggregator', async () => {
  const f = fixture({ snapshots: [[realJob()]], all: [] });
  await f.run();
  assert.equal(writes(f).length, 0);
  assert.deepEqual(f.sleeps, []);
});

test('final all-attempt inspection suppresses failure when a later completed aggregator exists', async () => {
  const f = fixture({ all: [realJob({ run_attempt: 5 })] });
  await f.run();
  assert.deepEqual(f.sleeps, [20000, 40000]);
  assert.equal(writes(f).length, 0);
  assert.match(f.logs.join('\n'), /no failure/i);
});

test('attempt two still needs a failure when only attempt one completed its aggregator', () => {
  assert.equal(
    shouldReportMissing({
      conclusion: 'success',
      attempt: 2,
      jobs: [],
      allAttemptJobs: [realJob({ run_attempt: 1 })],
    }),
    true,
  );
});

test('a full rerun without an aggregator posts despite an older successful aggregator', async () => {
  const f = fixture({ all: [realJob({ run_attempt: options.attempt - 1 })] });
  await f.run();
  assert.deepEqual(f.sleeps, [20000, 40000]);
  assert.equal(writes(f).length, 1);
  assert.equal(writes(f)[0].fields.state, 'failure');
});

test('final all-attempt inspection suppresses failure for the completed trigger attempt aggregator', async () => {
  const f = fixture({ all: [realJob({ run_attempt: options.attempt })] });
  await f.run();
  assert.equal(writes(f).length, 0);
  assert.match(f.logs.join('\n'), /no failure/i);
});

test('an unfinished aggregator in another attempt does not suppress genuinely missing failure', async () => {
  const f = fixture({
    all: [realJob({ run_attempt: 5, status: 'in_progress', conclusion: null })],
  });
  await f.run();
  assert.equal(writes(f)[0].fields.state, 'failure');
});

test('legacy synthetic entries in jobs listings never count as real aggregators', async () => {
  const f = fixture({
    snapshots: [[legacyCheck]],
    all: [legacyCheck],
    checks: { 321: legacyCheck },
  });
  await f.run();
  assert.equal(writes(f)[0].fields.state, 'failure');
  assert.equal(f.calls.filter((c) => c.method === 'PATCH').length, 0);
});

test('a job-backed aggregator with empty external_id still counts unless it has the legacy fingerprint', async () => {
  const f = fixture({
    snapshots: [[realJob()]],
    checks: { 123: { external_id: '', name: AGGREGATOR } },
  });
  await f.run();
  assert.equal(writes(f).length, 0);
});

test('jobs pagination includes an aggregator beyond the first hundred entries', async () => {
  const f = fixture({
    pages: [
      Array.from({ length: 100 }, (_, id) => ({ id, name: `Other ${id}` })),
      [realJob()],
    ],
  });
  await f.run();
  assert.ok(f.calls.some((c) => c.endpoint.includes('page=2')));
  assert.equal(writes(f).length, 0);
  assert.deepEqual(f.sleeps, []);
});

test('job-backed check metadata uses check_run_url rather than assuming the job ID is its check ID', async () => {
  const f = fixture({
    snapshots: [
      [
        realJob({
          check_run_url: `https://api.github.com/repos/${options.repo}/check-runs/456`,
        }),
      ],
    ],
  });
  await f.run();
  assert.ok(f.calls.some((call) => call.endpoint.endsWith('/check-runs/456')));
  assert.equal(writes(f).length, 0);
});

test('push self-clear posts success only over its own prior failure after the trigger aggregator passed', async () => {
  const f = fixture({ snapshots: [[realJob()]], statuses: [priorFailure] });
  await f.run({ event: 'push' });
  assert.equal(writes(f).length, 1);
  assert.equal(writes(f)[0].fields.state, 'success');
  assert.equal(writes(f)[0].fields.context, AGGREGATOR);
});

for (const event of ['pull_request', 'workflow_dispatch', undefined]) {
  test(`${event ?? 'unspecified event'} never writes success over budget policy`, async () => {
    const f = fixture({ snapshots: [[realJob()]], statuses: [priorFailure] });
    await f.run({ event });
    assert.equal(writes(f).length, 0);
  });
}

for (const statuses of [
  [],
  [{ ...priorFailure, description: 'Budget policy failed' }],
  [{ ...priorFailure, state: 'success' }],
  [{ ...priorFailure, target_url: 'https://example.com/forged' }],
  [{ ...priorFailure, creator: { login: 'somebody-else' } }],
  [{ ...priorFailure, creator: null }],
  [{ ...priorFailure, description: 'Budget policy failed' }, priorFailure],
]) {
  test(`push does not clear a status it does not currently own (${JSON.stringify(statuses)})`, async () => {
    const f = fixture({ snapshots: [[realJob()]], statuses });
    await f.run({ event: 'push' });
    assert.equal(writes(f).length, 0);
  });
}

for (const job of [
  realJob({ conclusion: 'failure' }),
  realJob({ status: 'in_progress', conclusion: null }),
]) {
  test(`push cannot self-clear from a ${job.status}/${job.conclusion} aggregator`, async () => {
    const f = fixture({ snapshots: [[job]], statuses: [priorFailure] });
    await f.run({ event: 'push' });
    assert.equal(writes(f).length, 0);
  });
}

test('push cannot self-clear using only another attempt aggregator', async () => {
  const f = fixture({
    all: [realJob({ run_attempt: 5 })],
    statuses: [priorFailure],
  });
  await f.run({ event: 'push' });
  assert.equal(writes(f).length, 0);
});

for (const changes of [{}, { event: 'push' }]) {
  test(`dry-run never writes checks or statuses (${changes.event ?? 'pull_request'})`, async () => {
    const f = fixture();
    await f.run({ ...changes, dryRun: true });
    assert.equal(writes(f).length, 0);
    assert.match(f.logs.join('\n'), /would post status/i);
  });
}

test('dry-run push self-clear describes success without writing', async () => {
  const f = fixture({ snapshots: [[realJob()]], statuses: [priorFailure] });
  await f.run({ event: 'push', dryRun: true });
  assert.equal(writes(f).length, 0);
  assert.match(f.logs.join('\n'), /would post status.*success/i);
});

test('API errors warn and return normally without manufacturing failure', async () => {
  const f = fixture({ fail: true });
  await f.run();
  assert.equal(writes(f).length, 0);
  assert.match(f.warnings.join('\n'), /::warning::.*GitHub unavailable/);
});

test('the ninety-second deadline warns without posting and bounds request timeouts', async () => {
  const f = fixture({ elapsed: 95000 });
  await f.run();
  assert.equal(writes(f).length, 0);
  assert.match(f.warnings.join('\n'), /::warning::.*deadline/i);
  assert.ok(f.calls.every((c) => c.timeoutMs > 0 && c.timeoutMs <= 90000));
});

test('malformed API metadata warns without publishing', async () => {
  const f = fixture({ snapshots: [[realJob()]], checks: { 123: {} } });
  await f.run();
  assert.equal(writes(f).length, 0);
  assert.match(f.warnings.join('\n'), /::warning::.*Invalid aggregator/);
});

test('the CLI requires an attempt and exits two before any API request', () => {
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL('./lint-and-test-guard.mjs', import.meta.url)),
      '--repo',
      options.repo,
      '--run',
      options.run,
      '--sha',
      options.sha,
      '--conclusion',
      'success',
      '--dry-run',
    ],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--attempt/);
});
