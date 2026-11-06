import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { parse } from 'yaml';

import { start, wait } from './background-step.mjs';

const workflow = parse(
  fs.readFileSync(
    new URL('../../.github/workflows/pr-checks.yml', import.meta.url),
    'utf8',
  ),
);
const steps = workflow.jobs['static-checks'].steps;
const hasBash =
  spawnSync('bash', ['-c', 'true'], { timeout: 5000 }).status === 0;
const bashTest = hasBash ? test : test.skip;
const sink = () => {
  let text = '';
  return { write: (chunk) => (text += chunk), text: () => text };
};

const assertAggregator = (failed) => {
  const aggregator = workflow.jobs['lint-and-test'];
  const needs = Object.fromEntries(
    aggregator.needs.map((name) => [name, { result: 'success' }]),
  );
  needs['static-checks'].result = failed ? 'failure' : 'success';
  const step = aggregator.steps[0];
  const result = spawnSync('bash', ['-e', '-c', step.run], {
    encoding: 'utf8',
    timeout: 5000,
    env: {
      ...process.env,
      NEEDS_JSON: JSON.stringify(needs),
      GATES: step.env.GATES,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.equal(result.status, failed ? 1 : 0, result.stdout + result.stderr);
  assert.match(
    result.stdout,
    failed ? /static-checks=failure/ : /All fan-out checks passed/,
  );
};

test('format overlaps typecheck, after route generation, with independent failure gates', () => {
  const index = (name) => steps.findIndex((step) => step.name === name);
  const generate = index('Generate Next.js route types');
  const launch = index('Start Format Check in the background');
  const typecheck = index('Type Check');
  const format = index('Format Check');
  assert.ok(generate >= 0 && launch > generate);
  assert.equal(typecheck, launch + 1);
  assert.equal(format, typecheck + 1);
  assert.equal(steps[generate].run, 'npx next typegen');
  assert.equal(
    steps[launch].run,
    'node scripts/ci/background-step.mjs start format -- npm run format:check',
  );
  assert.equal(steps[typecheck].run, 'npm run typecheck');
  assert.equal(
    steps[format].run,
    'node scripts/ci/background-step.mjs wait format',
  );
  for (const index of [generate, launch, typecheck, format]) {
    assert.equal(steps[index].if, '${{ !cancelled() }}');
    assert.equal(steps[index]['continue-on-error'], undefined);
  }
  assert.ok(format < index('Check generated work list after formatting'));
  assert.ok(workflow.jobs['lint-and-test'].needs.includes('static-checks'));
});

for (const [formatCode, typeCode] of [
  [0, 0],
  [3, 0],
  [0, 7],
  [3, 7],
]) {
  bashTest(
    `parallel checks preserve separate logs and results (${formatCode}, ${typeCode})`,
    async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'static-parallel-'));
      try {
        start(
          'format',
          `echo format-out; echo format-err >&2; exit ${formatCode}`,
          { dir },
        );
        const typecheck = spawnSync(
          'bash',
          ['-c', `echo type-out; echo type-err >&2; exit ${typeCode}`],
          {
            encoding: 'utf8',
            timeout: 5000,
            stdio: ['ignore', 'pipe', 'pipe'],
          },
        );
        const formatOut = sink();
        assert.equal(typecheck.status, typeCode);
        assert.equal(
          await wait('format', { dir, out: formatOut, pollMs: 10 }),
          formatCode,
        );
        assert.equal(formatOut.text(), 'format-out\nformat-err\n');
        assert.equal(typecheck.stdout, 'type-out\n');
        assert.equal(typecheck.stderr, 'type-err\n');
        assertAggregator(formatCode !== 0 || typeCode !== 0);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    },
  );
}

bashTest('both checks can start before either finishes', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'static-overlap-'));
  try {
    // A finite rendezvous fails if the checks accidentally become sequential.
    for (const [name, peer] of [
      ['format', 'typecheck'],
      ['typecheck', 'format'],
    ]) {
      const marker = path.join(dir, `${name}.ready`).replaceAll('\\', '/');
      const other = path.join(dir, `${peer}.ready`).replaceAll('\\', '/');
      const command = `touch '${marker}'; for i in {1..100}; do [ -f '${other}' ] && exit 0; sleep 0.02; done; exit 9`;
      if (name === 'format') start(name, command, { dir });
      else
        assert.equal(
          spawnSync('bash', ['-c', command], { timeout: 5000, stdio: 'ignore' })
            .status,
          0,
        );
    }
    assert.equal(await wait('format', { dir, out: sink(), pollMs: 10 }), 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

bashTest(
  'a signalled check fails without losing the other result',
  async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'static-signal-'));
    try {
      start('format', "sh -c 'echo terminated; kill -TERM $$'", { dir });
      const typecheck = spawnSync('bash', ['-c', 'echo completed; exit 7'], {
        timeout: 5000,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const out = sink();
      assert.equal(await wait('format', { dir, out, pollMs: 10 }), 143);
      assert.match(out.text(), /terminated/);
      assert.equal(typecheck.status, 7);
      assert.equal(typecheck.stdout, 'completed\n');
      assertAggregator(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },
);
