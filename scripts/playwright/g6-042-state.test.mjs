import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { tsImport } from 'tsx/esm/api';
import { parse } from 'yaml';

import {
  parseKernelReceipt,
  assertCleanKernelReceipts,
  verifyCausalEvents,
  rosterAst,
  sameListing,
  writeBrowserWrapper,
} from './g6-042-state.mjs';

test('raw native signal wins over JSON zero; unknown and contradictory data fail closed', () => {
  const json =
    '{"schema":"mekstation-browser-rusage/v1","maxRssKiB":143516,"exitStatus":0,"wallSeconds":"172.76"}';
  const receipt = parseKernelReceipt(
    'Command terminated by signal 11\n' + json,
  );
  assert.equal(receipt.outcome, 'CRASH');
  assert.equal(receipt.signal, 11);
  assert.throws(() => assertCleanKernelReceipts([{ receipt }]));
  for (const text of [
    '',
    '{}',
    'unknown\n' + json,
    json + '\n' + json,
    'Command exited with non-zero status 139\n' + json,
  ])
    assert.throws(() => parseKernelReceipt(text));
});

const renderer = {
  pid: 7,
  role: 'renderer',
  rssBytes: 1024,
  highWaterRssBytes: 2048,
};
const events = () =>
  [
    'body-api-end',
    'pre-teardown',
    'context-close-begin',
    'context-close-end',
    'context-close',
    'browser-disconnected',
    'page-target',
  ].map((kind) => ({
    kind,
    testId: 'focus',
    observation: { processes: [renderer] },
    data:
      kind === 'page-target'
        ? { targetId: 'page1', browserContextId: 'context1' }
        : {},
  }));
test('causal evidence needs real renderer, target/context identities and close/disconnect events without target-PID mapping', () => {
  const result = verifyCausalEvents(events(), 'focus');
  assert.equal(result.status, 'OBSERVABLE');
  assert.equal(result.targetToPidMapping, 'UNKNOWN');
  assert.equal(result.faultingThread, 'UNKNOWN');
  for (const kind of [
    'body-api-end',
    'pre-teardown',
    'context-close-begin',
    'context-close-end',
    'context-close',
    'browser-disconnected',
    'page-target',
  ])
    assert.throws(() =>
      verifyCausalEvents(
        events().filter((row) => row.kind !== kind),
        'focus',
      ),
    );
  assert.throws(() =>
    verifyCausalEvents(
      events().map((row) => ({ ...row, observation: { processes: [] } })),
      'focus',
    ),
  );
  assert.throws(() =>
    verifyCausalEvents(
      events().map((row) => ({ ...row, data: {} })),
      'focus',
    ),
  );
});

test('only the approved roster import seam may differ; assertion and body edits are detected', () => {
  const base =
    "import { test, expect } from '@playwright/test'; test('x',()=>{ expect(2).toBe(2); });";
  const seam = base.replace(
    '@playwright/test',
    './fixtures/g6-042-causal-state',
  );
  assert.equal(rosterAst(base), rosterAst(seam));
  assert.notEqual(
    rosterAst(base),
    rosterAst(seam.replace('toBe(2)', 'toBe(3)')),
  );
});

test('native listing order, IDs and worker fixture identity cannot silently change', () => {
  const rows = [
    { id: 'a', workerHash: 'w', poolDigest: 'p', file: 'a', titles: ['x'] },
    { id: 'b', workerHash: 'w', poolDigest: 'p', file: 'b', titles: ['y'] },
  ];
  assert.doesNotThrow(() => sameListing(rows, structuredClone(rows)));
  assert.throws(() => sameListing(rows, [...rows].reverse()));
  assert.throws(() =>
    sameListing(
      rows,
      rows.map((row) => ({ ...row, workerHash: 'other' })),
    ),
  );
  assert.throws(() =>
    sameListing(
      rows,
      rows.map((row) => ({ ...row, poolDigest: '' })),
    ),
  );
});

test('secondary config preserves test/server/launch policy except the unchanged-argv wrapper', async () => {
  process.env.MEKSTATION_G6_042_ROOT = path.resolve(os.tmpdir(), 'g6-config');
  const unwrap = (value) => value.default?.default ?? value.default;
  const base = unwrap(
    await tsImport('../../playwright.config.ts', import.meta.url),
  );
  const diagnostic = unwrap(
    await tsImport('../../playwright.g6-042.config.js', import.meta.url),
  );
  for (const key of [
    'testDir',
    'globalSetup',
    'fullyParallel',
    'workers',
    'retries',
    'timeout',
    'expect',
    'projects',
    'webServer',
    'outputDir',
    'snapshotDir',
  ])
    assert.deepEqual(diagnostic[key], base[key], key);
  const { launchOptions, ...use } = diagnostic.use;
  const { launchOptions: baseLaunch, ...baseUse } = base.use;
  const { executablePath, ...original } = launchOptions;
  assert.deepEqual(use, baseUse);
  assert.deepEqual(original, baseLaunch ?? {});
  assert.equal(
    executablePath,
    path.join(process.env.MEKSTATION_G6_042_ROOT, 'browser-wrapper.sh'),
  );
  assert.deepEqual(diagnostic.reporter.slice(0, -1), base.reporter);
});

test('scratch workflow can consume only one bounded read-only manual job and always retains reports', () => {
  const workflow = parse(
    fs.readFileSync('.github/workflows/pr-checks.yml', 'utf8'),
  );
  assert.deepEqual(Object.keys(workflow.on), ['workflow_dispatch']);
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.deepEqual(Object.keys(workflow.jobs), ['capture']);
  const job = workflow.jobs.capture;
  assert.equal(job['runs-on'], 'ubuntu-latest');
  assert.equal(job['timeout-minutes'], 15);
  assert.equal(job.strategy, undefined);
  assert.equal(
    job.steps.filter((step) => step.run?.includes('g6-042-state.mjs capture'))
      .length,
    1,
  );
  const upload = job.steps.find((step) =>
    step.uses?.startsWith('actions/upload-artifact@'),
  );
  assert.equal(upload.if, 'always()');
  assert.equal(upload.with['retention-days'], 3);
  assert.equal(upload.with['include-hidden-files'], true);
});

test(
  'Linux wrapper preserves literal argv/stderr and rejects native nonzero termination',
  { skip: process.platform !== 'linux' },
  () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'g6-argv-'));
    try {
      const target = path.join(root, 'fake-browser');
      fs.writeFileSync(
        target,
        '#!/bin/sh\nprintf "%s\\0" "$@"\nprintf "native failure\\n" >&2\nexit 11\n',
        { mode: 0o755 },
      );
      const wrapper = writeBrowserWrapper({ root, binary: target });
      const args = ['a b', '$(literal)', 'semi;literal'];
      const child = spawnSync(wrapper, args, {
        env: { ...process.env, MEKSTATION_G6_042_SUITE: 'gates' },
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 10000,
      });
      assert.equal(child.status, 11);
      assert.match(child.stderr.toString(), /native failure/);
      assert.deepEqual(child.stdout.toString().split('\0').slice(0, -1), args);
      const receipt = parseKernelReceipt(
        fs.readFileSync(
          path.join(root, `kernel/gates-${child.pid}.jsonl`),
          'utf8',
        ),
      );
      assert.equal(receipt.outcome, 'NONZERO_EXIT');
      assert.throws(() => assertCleanKernelReceipts([{ receipt }]));
    } finally {
      assert.ok(root.startsWith(path.resolve(os.tmpdir()) + path.sep));
      fs.rmSync(root, { recursive: true, force: true });
    }
  },
);
