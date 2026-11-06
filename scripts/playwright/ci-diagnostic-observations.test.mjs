import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import YAML from 'yaml';

import { observeHost } from './ci-diagnostic-observations.mjs';
import Reporter from './ci-diagnostic-reporter.mjs';
import { parseInvocation } from './ci-e2e-plan.mjs';

test('native Playwright failure remains failed and emits real lifecycle observations', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-reporter-native-'));
  try {
    const report = path.join(root, 'native.json');
    fs.writeFileSync(
      path.join(root, 'probe.spec.cjs'),
      `const {test,expect}=require(${JSON.stringify(path.resolve('node_modules/@playwright/test/index.js'))}); test('expected diagnostic red',()=>expect(1).toBe(2));`,
    );
    fs.writeFileSync(
      path.join(root, 'playwright.config.cjs'),
      `module.exports={testDir:__dirname,workers:1,retries:0,reporter:[['json',{outputFile:${JSON.stringify(report)}}],[${JSON.stringify(path.resolve('scripts/playwright/ci-diagnostic-reporter.mjs'))}]]};`,
    );
    const child = spawnSync(
      process.execPath,
      [
        'node_modules/@playwright/test/cli.js',
        'test',
        '--config',
        path.join(root, 'playwright.config.cjs'),
      ],
      {
        env: {
          ...process.env,
          MEKSTATION_E2E_DIAGNOSTIC_DIR: root,
          MEKSTATION_E2E_DIAGNOSTIC_SUITE: 'gates',
          PLAYWRIGHT_JSON_OUTPUT_FILE: '',
        },
        stdio: 'pipe',
        timeout: 20000,
      },
    );
    assert.equal(child.status, 1, child.stderr.toString());
    assert.equal(
      JSON.parse(fs.readFileSync(report, 'utf8')).stats.unexpected,
      1,
    );
    const file = fs
      .readdirSync(root)
      .find((name) => /^gates-\d+\.jsonl$/.test(name));
    const events = fs
      .readFileSync(path.join(root, file), 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    assert.deepEqual(
      events.map((e) => e.event),
      ['suite-begin', 'test-begin', 'test-end', 'suite-end'],
    );
    assert.equal(events[2].status, 'failed');
    assert.equal(events[3].status, 'failed');
    assert.ok(events.every((e) => Array.isArray(e.observation.unavailable)));
  } finally {
    assert.ok(root.startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('scratch dispatch preserves native flags and always archives telemetry/reports', () => {
  const workflow = YAML.parse(
    fs.readFileSync('.github/workflows/pr-checks.yml', 'utf8'),
  );
  assert.deepEqual(Object.keys(workflow.on), ['workflow_dispatch']);
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.match(workflow.name, /DO NOT MERGE/);
  const job = workflow.jobs.e2e;
  assert.equal(job['runs-on'], 'ubuntu-latest');
  assert.equal(job['timeout-minutes'], 15);
  assert.equal(job.strategy['fail-fast'], false);
  const shards = job.strategy.matrix.shard;
  assert.ok([2, 3].includes(shards.length));
  const steps = job.steps.filter((s) =>
    s.run?.startsWith('node scripts/playwright/run-ci-e2e.mjs'),
  );
  assert.equal(steps.length, 3);
  for (const step of steps)
    for (const shard of shards) {
      const args = step.run
        .replace('${{ matrix.shard }}', String(shard))
        .split(' ')
        .slice(2);
      assert.equal(parseInvocation(args).shardIndex, shard);
    }
  assert.equal(steps[1].if, '${{ !cancelled() }}');
  assert.equal(steps[2].if, '${{ !cancelled() }}');
  assert.equal(workflow.env.DEBUG, 'pw:browser');
  assert.match(
    workflow.env.MEKSTATION_E2E_DIAGNOSTIC_DIR,
    /e2e-timings\/diagnostics$/,
  );
  const uploads = job.steps.filter((s) =>
    s.uses?.startsWith('actions/upload-artifact@'),
  );
  assert.equal(uploads.length, 3);
  for (const upload of uploads) {
    assert.equal(upload.if, 'always()');
    assert.equal(upload.with['retention-days'], 3);
  }
  assert.match(uploads.at(-1).with.path, /playwright-report-smoke/);
  assert.match(uploads.at(-1).with.path, /test-results/);
});

test('a failed/cancelled/skipped matrix cannot pass the diagnostic aggregator', () => {
  const job = YAML.parse(
    fs.readFileSync('.github/workflows/pr-checks.yml', 'utf8'),
  ).jobs['lint-and-test'];
  assert.equal(job.if, 'always()');
  assert.equal(job.needs, 'e2e');
  const body = /^node -e "(.+)"$/.exec(job.steps[0].run)[1];
  for (const result of ['success', 'failure', 'cancelled', 'skipped', '']) {
    const child = spawnSync(process.execPath, ['-e', body], {
      env: { ...process.env, E2E_RESULT: result },
      stdio: 'ignore',
      timeout: 5000,
    });
    assert.equal(child.status === 0, result === 'success');
  }
});

test('RSS, high-water RSS, cgroup counters and shm observations retain their units', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-observation-'));
  try {
    for (const dir of ['proc/21', 'proc/22', 'proc/self', 'cgroup/job'])
      fs.mkdirSync(path.join(root, dir), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'proc/meminfo'),
      'MemTotal: 100 kB\nMemAvailable: 40 kB\nSwapFree: 12 kB\n',
    );
    fs.writeFileSync(
      path.join(root, 'proc/21/status'),
      'Name:\tnode\nPid:\t21\nPPid:\t5\nVmRSS:\t10 kB\nVmHWM:\t30 kB\n',
    );
    fs.writeFileSync(
      path.join(root, 'proc/22/status'),
      'Name:\tchrome-headless\nPid:\t22\nPPid:\t21\nVmRSS:\t20 kB\nVmHWM:\t35 kB\n',
    );
    fs.writeFileSync(
      path.join(root, 'proc/21/cmdline'),
      'node\0.next/standalone/server.js\0',
    );
    fs.writeFileSync(
      path.join(root, 'proc/22/cmdline'),
      'chrome-headless-shell\0--disable-dev-shm-usage\0',
    );
    fs.writeFileSync(path.join(root, 'proc/self/cgroup'), '0::/job\n');
    for (const [name, value] of Object.entries({
      'memory.current': '400',
      'memory.peak': '900',
      'memory.max': 'max',
      'memory.events': 'oom 0\noom_kill 0\n',
    }))
      fs.writeFileSync(path.join(root, 'cgroup/job', name), value);
    const observed = observeHost({
      procRoot: path.join(root, 'proc'),
      cgroupRoot: path.join(root, 'cgroup'),
      shmPath: root,
    });
    assert.equal(observed.memory.MemAvailable, 40 * 1024);
    assert.equal(observed.processes[0].rssBytes, 10 * 1024);
    assert.equal(observed.processes[0].highWaterRssBytes, 30 * 1024);
    assert.equal(observed.processes[1].ppid, 21);
    assert.equal(observed.cgroup.values['memory.peak'], '900');
    assert.match(observed.cgroup.values['memory.events'], /oom_kill 0/);
    assert.ok(observed.shm.totalBytes > 0);
    assert.ok(
      observed.processes[1].command.includes('--disable-dev-shm-usage'),
    );
  } finally {
    assert.ok(root.startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('missing platform counters are explicit, never fabricated zero values', () => {
  const observed = observeHost({
    procRoot: '/missing-e2e-proc',
    cgroupRoot: '/missing-e2e-cgroup',
    shmPath: '/missing-e2e-shm',
  });
  assert.equal(observed.memory, null);
  assert.equal(observed.shm, null);
  assert.equal(observed.cgroup, null);
  assert.ok(observed.unavailable.length >= 3);
});

test('reporter observes lifecycle events without changing test outcomes or execution', () => {
  const events = [];
  const reporter = new Reporter({
    emit: (row) => events.push(row),
    observe: () => ({ marker: 'host snapshot' }),
  });
  const item = {
    id: 'anchor',
    titlePath: () => ['chromium', 'roster'],
    location: { file: 'roster.spec.ts', line: 113 },
  };
  const result = {
    status: 'failed',
    retry: 0,
    workerIndex: 0,
    duration: 10795,
  };
  reporter.onBegin(
    {
      workers: 1,
      projects: [{ name: 'chromium', retries: 0 }],
      webServer: {
        command: 'node .next/standalone/server.js',
        url: 'http://localhost:3600',
        env: {
          DATABASE_PATH: '/tmp/unique/db.sqlite',
          PLAYWRIGHT_E2E_RUN_ID: 'unique',
          GITHUB_TOKEN: 'excluded',
        },
      },
    },
    { allTests: () => [item] },
  );
  reporter.onTestBegin(item, result);
  reporter.onTestEnd(item, result);
  reporter.onError({ message: 'browser native crash' });
  assert.equal(reporter.onEnd({ status: 'failed' }), undefined);
  assert.deepEqual(
    events.map((x) => x.event),
    ['suite-begin', 'test-begin', 'test-end', 'runner-error', 'suite-end'],
  );
  assert.equal(events[2].status, 'failed');
  assert.equal(events[2].retry, 0);
  assert.ok(events.every((x) => x.observation.marker === 'host snapshot'));
  assert.equal(result.status, 'failed');
  assert.equal(reporter.printsToStdio(), false);
  assert.equal(events[0].server[0].env.DATABASE_PATH, '/tmp/unique/db.sqlite');
  assert.equal(events[0].server[0].env.GITHUB_TOKEN, undefined);
});
