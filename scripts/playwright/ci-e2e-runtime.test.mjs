import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { CI_SUITES, parseInvocation } from './ci-e2e-plan.mjs';
import {
  assertRuntime,
  settleSuites,
  suiteRuntime,
} from './ci-e2e-runtime.mjs';

test('every suite, shard and attempt owns separate absolute database paths and readiness identity', () => {
  const root = path.resolve('test worktree');
  const runtimes = [1, 2].flatMap((shard) =>
    [1, 2].flatMap((attempt) =>
      CI_SUITES.map(({ name }) =>
        suiteRuntime(root, name, shard, '123', attempt),
      ),
    ),
  );
  for (const key of ['runId', 'database', 'multiplayerDatabase'])
    assert.equal(new Set(runtimes.map((r) => r[key])).size, 12, key);
  assert.equal(new Set(runtimes.slice(0, 3).map(({ port }) => port)).size, 3);
  for (const runtime of runtimes) {
    assert.ok(path.isAbsolute(runtime.database));
    assert.ok(path.isAbsolute(runtime.multiplayerDatabase));
    assert.equal(
      runtime.environment.MEKSTATION_E2E_REUSE_EXISTING_SERVER,
      'false',
    );
    assert.equal(runtime.environment.PLAYWRIGHT_E2E_RUN_ID, runtime.runId);
  }
  assert.throws(() => suiteRuntime(root, 'library', 1, '../escape', '1'));
});

test('the native report must confirm the selected port, runId and both DBs', () => {
  const runtime = suiteRuntime(path.resolve('.'), 'library', 1, '123', '1');
  const report = {
    config: {
      webServer: {
        command: 'node .next/standalone/server.js',
        url: `http://localhost:${runtime.port}/__playwright_e2e_ready__?runId=${runtime.runId}`,
        reuseExistingServer: false,
        env: {
          PORT: String(runtime.port),
          PLAYWRIGHT_E2E_RUN_ID: runtime.runId,
          DATABASE_PATH: runtime.database,
          MULTIPLAYER_DB_PATH: runtime.multiplayerDatabase,
        },
      },
    },
  };
  assertRuntime(report, runtime);
  for (const key of Object.keys(report.config.webServer.env)) {
    const wrong = structuredClone(report);
    wrong.config.webServer.env[key] = 'shared';
    assert.throws(() => assertRuntime(wrong, runtime), key);
  }
  const stale = structuredClone(report);
  stale.config.webServer.reuseExistingServer = true;
  assert.throws(() => assertRuntime(stale, runtime));
});

test('two longest suites start first, never exceed two active, and later suites still run after failure', async () => {
  const started = [];
  const finished = [];
  let active = 0;
  let max = 0;
  let releaseSlow;
  const slow = new Promise((resolve) => {
    releaseSlow = resolve;
  });
  const errors = await settleSuites(
    [
      { suite: 'short', milliseconds: 1 },
      { suite: 'slow', milliseconds: 30 },
      { suite: 'middle', milliseconds: 20 },
    ],
    2,
    async ({ suite }) => {
      started.push(suite);
      active++;
      max = Math.max(max, active);
      try {
        if (suite === 'slow') await slow;
        if (suite === 'middle') throw new Error('gate failed');
        if (suite === 'short') releaseSlow();
      } finally {
        active--;
        finished.push(suite);
      }
    },
  );
  assert.deepEqual(started, ['slow', 'middle', 'short']);
  assert.equal(max, 2);
  assert.equal(finished.length, 3);
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /gate failed/);
  await assert.rejects(settleSuites([], 3, async () => {}));
});

test('interrupting the queue prevents launching waiting suites', async () => {
  const started = [];
  let stopped = false;
  await settleSuites(
    [
      { suite: 'a', milliseconds: 3 },
      { suite: 'b', milliseconds: 2 },
    ],
    1,
    async ({ suite }) => {
      started.push(suite);
      stopped = true;
    },
    () => stopped,
  );
  assert.deepEqual(started, ['a']);
});

test('zero-retry gates run alone; library and smoke overlap after a gate failure', async () => {
  const active = new Set();
  const started = [];
  let max = 0;
  let releaseLibrary;
  const library = new Promise((resolve) => {
    releaseLibrary = resolve;
  });
  const errors = await settleSuites(
    [
      { suite: 'smoke', milliseconds: 20 },
      { suite: 'library', milliseconds: 30 },
      { suite: 'gates', milliseconds: 1 },
    ],
    2,
    async ({ suite }) => {
      if (suite === 'gates') assert.equal(active.size, 0);
      else assert.equal(active.has('gates'), false);
      active.add(suite);
      started.push(suite);
      max = Math.max(max, active.size);
      try {
        if (suite === 'gates') throw new Error('gate failed');
        if (suite === 'library') await library;
        if (suite === 'smoke') releaseLibrary();
      } finally {
        active.delete(suite);
      }
    },
  );
  assert.deepEqual(started, ['gates', 'library', 'smoke']);
  assert.equal(max, 2);
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /gate failed/);
});

test('concurrent invocation keeps all specs, native policies and the two-suite limit', () => {
  const args = [
    'test',
    ...CI_SUITES.flatMap(({ files }) => files.map((f) => `e2e/${f}`)),
    '--project=chromium',
    '--gate-retries=0',
    '--gate-trace=retain-on-failure',
    '--gate-workers=1',
    '--library-workers=1',
    '--smoke-workers=4',
    '--shard=1/2',
    '--concurrency=2',
    '--output=test-results',
  ];
  assert.equal(parseInvocation(args).concurrency, 2);
  for (const token of args.slice(1))
    assert.throws(
      () => parseInvocation(args.filter((arg) => arg !== token)),
      token,
    );
  assert.throws(() =>
    parseInvocation(
      args.map((a) => (a === '--concurrency=2' ? '--concurrency=4' : a)),
    ),
  );
  assert.throws(() => parseInvocation([...args, '--grep=one-test']));
});
