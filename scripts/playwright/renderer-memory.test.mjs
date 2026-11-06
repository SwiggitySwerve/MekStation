import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import Reporter from './renderer-memory-reporter.mjs';
import {
  processSnapshot,
  observationPhase,
  parseKernelReceipt,
  diagnosticInvocation,
  diagnosticSuiteEnvironment,
  verifyRendererCoverage,
} from './renderer-memory.mjs';

test('diagnostics are opt-in and cannot silently switch production shard/config policies', () => {
  assert.deepEqual(diagnosticInvocation({}, '/repo'), {
    shards: 2,
    configArgs: [],
  });
  const root = path.resolve('capture');
  assert.equal(
    diagnosticInvocation(
      { MEKSTATION_E2E_MEMORY_ROOT: root, MEKSTATION_E2E_MEMORY_SHARDS: '3' },
      '/repo',
    ).shards,
    3,
  );
  assert.throws(() =>
    diagnosticInvocation({ MEKSTATION_E2E_MEMORY_SHARDS: '3' }, '/repo'),
  );
  assert.throws(() =>
    diagnosticInvocation({ MEKSTATION_E2E_MEMORY_ROOT: root }, '/repo'),
  );
});

test('public reporter records body/pre-close observations without overriding a native failure', () => {
  const rows = [];
  const reporter = new Reporter({
    emit: (row) => rows.push(row),
    observe: () => ({
      processes: [{ pid: 130, role: 'renderer', highWaterRssBytes: 8192 }],
    }),
  });
  const item = {
    id: 'roster',
    location: { file: '/repo/e2e/seam-roster-materialization-handoff.spec.ts' },
    titlePath: () => ['roster'],
  };
  const result = { status: 'failed', retry: 0, workerIndex: 0 };
  reporter.onStepEnd(item, result, {
    title: 'Navigate to /campaign',
    category: 'pw:api',
  });
  reporter.onStepBegin(item, result, {
    title: 'After Hooks',
    category: 'hook',
  });
  reporter.onStepBegin(item, result, {
    title: 'Close context',
    category: 'pw:api',
  });
  reporter.onTestEnd(item, result);
  assert.equal(reporter.onEnd({ status: 'failed' }), undefined);
  assert.deepEqual(
    rows.map((r) => r.phase),
    [
      'body-api-end',
      'pre-teardown',
      'context-close-begin',
      'test-end',
      'suite-end',
    ],
  );
  assert.equal(rows[3].status, 'failed');
  assert.equal(rows[3].retry, 0);
  assert.ok(rows.every((r) => r.observation.processes[0].role === 'renderer'));
  assert.equal(result.status, 'failed');
});

test('diagnostic suite servers retain separate ports and run-scoped absolute database namespaces', () => {
  assert.deepEqual(diagnosticSuiteEnvironment({}, 'gates', 1), {});
  const env = {
    MEKSTATION_E2E_MEMORY_ROOT: path.resolve('capture'),
    GITHUB_RUN_ID: '123',
    GITHUB_RUN_ATTEMPT: '1',
    MEKSTATION_E2E_MEMORY_SHARDS: '3',
  };
  const suites = ['gates', 'library', 'smoke'].map((suite) =>
    diagnosticSuiteEnvironment(env, suite, 1),
  );
  assert.equal(new Set(suites.map((s) => s.MEKSTATION_E2E_PORT)).size, 3);
  assert.equal(new Set(suites.map((s) => s.PLAYWRIGHT_E2E_RUN_ID)).size, 3);
  assert.notEqual(
    suites[0].PLAYWRIGHT_E2E_RUN_ID,
    diagnosticSuiteEnvironment(env, 'gates', 2).PLAYWRIGHT_E2E_RUN_ID,
  );
  assert.notEqual(
    suites[0].PLAYWRIGHT_E2E_RUN_ID,
    diagnosticSuiteEnvironment({ ...env, GITHUB_RUN_ATTEMPT: '2' }, 'gates', 1)
      .PLAYWRIGHT_E2E_RUN_ID,
  );
  assert.throws(() =>
    diagnosticSuiteEnvironment(
      { ...env, GITHUB_RUN_ID: undefined },
      'gates',
      1,
    ),
  );
});

test('renamed renderers remain visible through ancestry; unrelated host processes stay excluded', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'renderer-proc-'));
  try {
    for (const [pid, parent, name, command] of [
      [100, 1, 'node', 'node playwright'],
      [110, 100, 'node', 'node worker'],
      [120, 110, 'Browser', 'chrome-headless-shell'],
      [130, 120, 'Renderer', 'chrome-headless-shell\0--type=renderer'],
      [999, 1, 'chrome-headless', 'UNRELATED_SECRET_ARGUMENT'],
    ]) {
      fs.mkdirSync(path.join(root, String(pid)));
      fs.writeFileSync(
        path.join(root, String(pid), 'status'),
        `Name:\t${name}\nPPid:\t${parent}\nVmRSS:\t8192 kB\nVmHWM:\t16384 kB\n`,
      );
      fs.writeFileSync(path.join(root, String(pid), 'cmdline'), command);
    }
    const result = processSnapshot({ procRoot: root, rootPid: 100 });
    assert.deepEqual(
      result.processes.map((p) => p.pid),
      [100, 110, 120, 130],
    );
    const renderer = result.processes.find((p) => p.pid === 130);
    assert.equal(renderer.role, 'renderer');
    assert.equal(renderer.highWaterRssBytes, 16384 * 1024);
    assert.equal(renderer.rssBytes, 8192 * 1024);
    assert.ok(!JSON.stringify(result).includes('UNRELATED_SECRET_ARGUMENT'));
  } finally {
    assert.ok(root.startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('missing process counters stay unknown and observable', () => {
  const result = processSnapshot({
    procRoot: '/absent-renderer-observation',
    rootPid: 100,
  });
  assert.deepEqual(result.processes, []);
  assert.ok(result.unavailable.length);
});

test('roster body and pre-close events are sampled while fixtures are still alive', () => {
  const item = {
    location: { file: '/repo/e2e/seam-roster-materialization-handoff.spec.ts' },
  };
  assert.equal(
    observationPhase(
      item,
      { category: 'pw:api', title: 'Navigate to /campaigns' },
      'end',
    ),
    'body-api-end',
  );
  assert.equal(
    observationPhase(item, { category: 'hook', title: 'After Hooks' }, 'begin'),
    'pre-teardown',
  );
  assert.equal(
    observationPhase(
      item,
      { category: 'pw:api', title: 'Close context' },
      'begin',
    ),
    'context-close-begin',
  );
  assert.equal(
    observationPhase(
      item,
      { category: 'pw:api', title: 'Close context' },
      'end',
    ),
    'context-close-end',
  );
  assert.equal(
    observationPhase(
      { location: { file: '/other.spec.ts' } },
      { category: 'pw:api' },
      'end',
    ),
    null,
  );
  assert.equal(
    observationPhase(
      item,
      {
        category: 'pw:api',
        title: 'Create context',
        parent: { category: 'fixture' },
      },
      'end',
    ),
    null,
  );
});

test('kernel command-exit receipt retains RSS units and native nonzero failures', () => {
  const receipt = parseKernelReceipt(
    'Command exited with non-zero status 11\n{"schema":"mekstation-browser-rusage/v1","maxRssKiB":32768,"exitStatus":11,"wallSeconds":"2.4"}\n',
  );
  assert.equal(receipt.browserMainMaxRssBytes, 32768 * 1024);
  assert.equal(receipt.scope, 'browser-main-process');
  assert.match(receipt.meaning, /Browser main process maxrss/);
  assert.ok(!Object.hasOwn(receipt, 'maxAccountedProcessRssBytes'));
  assert.equal(receipt.exitStatus, 11);
  for (const text of [
    '',
    '{}',
    '{"schema":"mekstation-browser-rusage/v1","maxRssKiB":0,"exitStatus":0}',
    '{"schema":"mekstation-browser-rusage/v1","maxRssKiB":-3,"exitStatus":0}',
  ])
    assert.throws(() => parseKernelReceipt(text));
});

test('control descendant VmHWM is independent of the browser main process maxrss', () => {
  const processes = [
    {
      pid: 3366,
      ppid: 3109,
      role: 'renderer',
      rssBytes: 451133440,
      highWaterRssBytes: 459505664,
    },
    {
      pid: 3109,
      ppid: 3105,
      role: 'browser',
      command: 'chrome-headless-shell --type=zygote',
    },
    {
      pid: 3105,
      ppid: 3104,
      role: 'browser',
      command: 'chrome-headless-shell --remote-debugging-pipe',
      highWaterRssBytes: 146178048,
    },
    { pid: 3104, ppid: 3091, role: 'runner', command: '/usr/bin/time' },
  ];
  const rows = [
    'body-api-end',
    'pre-teardown',
    'context-close-begin',
    'context-close-end',
  ].map((phase) => ({ phase, observation: { processes } }));
  const receipt = parseKernelReceipt(
    '{"schema":"mekstation-browser-rusage/v1","maxRssKiB":142752,"exitStatus":0,"wallSeconds":"171.27"}\n',
  );
  const result = verifyRendererCoverage(rows, [{ wrapperPid: 3104, receipt }]);
  assert.equal(result.status, 'OBSERVABLE');
  assert.equal(
    result.primaryRendererEvidence,
    'procfs-per-renderer-vmrss-vmhwm',
  );
  assert.equal(
    result.rendererObservations[0].observedRendererVmHwmBytes,
    459505664,
  );
  assert.equal(
    result.rendererObservations[0].observedRendererRssBytes,
    451133440,
  );
  assert.equal(
    result.rendererObservations[0].browserMainProcess.browserMainMaxRssBytes,
    146178048,
  );
  assert.equal(result.rendererTeardownPeakBytes, null);
  assert.equal(result.stabilityClearance, false);
});

test('observability fails closed for missing renderer, pre-close, close bracket or browser receipt', () => {
  const processes = [
    {
      pid: 130,
      ppid: 120,
      role: 'renderer',
      rssBytes: 1024,
      highWaterRssBytes: 2048,
    },
    {
      pid: 120,
      ppid: 119,
      role: 'browser',
      command: 'chrome-headless-shell --remote-debugging-pipe',
    },
    { pid: 119, ppid: 100, role: 'runner', command: '/usr/bin/time' },
  ];
  const rows = [
    'body-api-end',
    'pre-teardown',
    'context-close-begin',
    'context-close-end',
  ].map((phase) => ({ phase, observation: { processes } }));
  const kernels = [
    {
      wrapperPid: 119,
      receipt: { browserMainMaxRssBytes: 4096, exitStatus: 0 },
    },
  ];
  assert.equal(verifyRendererCoverage(rows, kernels).status, 'OBSERVABLE');
  assert.throws(() =>
    verifyRendererCoverage(
      rows.map((r) => ({ ...r, observation: { processes: [] } })),
      kernels,
    ),
  );
  assert.throws(() =>
    verifyRendererCoverage(
      rows.filter(
        (r) => !['pre-teardown', 'context-close-begin'].includes(r.phase),
      ),
      kernels,
    ),
  );
  assert.throws(() => verifyRendererCoverage(rows, []));
  for (const phase of ['context-close-begin', 'context-close-end'])
    assert.throws(() =>
      verifyRendererCoverage(
        rows.filter((r) => r.phase !== phase),
        kernels,
      ),
    );
  assert.throws(() =>
    verifyRendererCoverage(
      rows.map((r) => ({
        ...r,
        observation: {
          processes: processes.map((p) => ({ ...p, highWaterRssBytes: null })),
        },
      })),
      kernels,
    ),
  );
  assert.throws(() =>
    verifyRendererCoverage(rows, [
      { wrapperPid: 999, receipt: { browserMainMaxRssBytes: 512 } },
    ]),
  );
  assert.throws(() =>
    verifyRendererCoverage(rows, [{ wrapperPid: 119, receipt: {} }]),
  );
});

test('missing native observations fail the real verifier and retain an explicit unknown artifact', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'missing-observations-'));
  try {
    const child = spawnSync(
      process.execPath,
      [path.resolve('scripts/playwright/renderer-memory-verify.mjs')],
      {
        cwd: root,
        env: { ...process.env, MEKSTATION_E2E_MEMORY_ROOT: root },
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 10000,
      },
    );
    assert.equal(child.status, 1);
    const artifact = JSON.parse(
      fs.readFileSync(path.join(root, 'observability.json'), 'utf8'),
    );
    assert.equal(artifact.coverage.status, 'NOT_OBSERVABLE');
    assert.equal(artifact.stabilityClearance, false);
    assert.ok(artifact.coverage.error);
  } finally {
    assert.ok(root.startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(root, { recursive: true, force: true });
  }
});
