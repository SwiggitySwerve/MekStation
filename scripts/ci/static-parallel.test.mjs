import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { start, wait } from './background-step.mjs';

// Detect Changes runs these contracts before dependencies are installed.
// Read the named blocks directly, as the existing toolchain contracts do.
const workflow = fs
  .readFileSync(
    new URL('../../.github/workflows/pr-checks.yml', import.meta.url),
    'utf8',
  )
  .replaceAll('\r\n', '\n');
const job = (source, name) => {
  const tail = source.split(`\n  ${name}:\n`)[1];
  assert.ok(tail, `Missing job: ${name}`);
  return tail.split(/\n  [\w-]+:\n/)[0];
};
const staticSteps = (source) => {
  const block = job(source, 'static-checks');
  const headers = [...block.matchAll(/^      - name: (.+)$/gm)];
  return headers.map((header, index) => {
    const body = block.slice(header.index, headers[index + 1]?.index);
    const field = (name) =>
      body.match(new RegExp(`^        ${name}: (.+)$`, 'm'))?.[1];
    return {
      body,
      name: header[1],
      run: field('run'),
      if: field('if'),
      'continue-on-error': field('continue-on-error'),
    };
  });
};
const requiredJobs = (source) => {
  const names = job(source, 'lint-and-test').match(
    /    needs:\s*\[([^\]]+)\]/,
  )?.[1];
  assert.ok(names, 'Missing aggregator dependencies');
  return names
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
};
const aggregator = job(workflow, 'lint-and-test');
const dependencies = requiredJobs(workflow);
const gates = aggregator
  .match(/          GATES: >-\n((?:            .+\n)+)/)?.[1]
  .trim();
assert.ok(gates, 'Missing aggregator gates');
JSON.parse(gates);
const aggregatorRun = aggregator
  .match(/^        run: \|\n((?:          .*\n?)*)/m)?.[1]
  .replace(/^          /gm, '');
assert.ok(aggregatorRun, 'Missing aggregator assertion');
const hasBash =
  spawnSync('bash', ['-c', 'true'], { timeout: 5000 }).status === 0;
const bashTest = hasBash ? test : test.skip;
const sink = () => {
  let text = '';
  return { write: (chunk) => (text += chunk), text: () => text };
};

const assertAggregator = (failed) => {
  const needs = Object.fromEntries(
    dependencies.map((name) => [name, { result: 'success' }]),
  );
  needs['static-checks'].result = failed ? 'failure' : 'success';
  const result = spawnSync('bash', ['-e', '-c', aggregatorRun], {
    encoding: 'utf8',
    timeout: 5000,
    env: {
      ...process.env,
      NEEDS_JSON: JSON.stringify(needs),
      GATES: gates,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.equal(result.status, failed ? 1 : 0, result.stdout + result.stderr);
  assert.match(
    result.stdout,
    failed ? /static-checks=failure/ : /All fan-out checks passed/,
  );
};

const assertSchedule = (source) => {
  const steps = staticSteps(source);
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
  assert.ok(requiredJobs(source).includes('static-checks'));
};

test('format overlaps typecheck, after route generation, with independent failure gates', () =>
  assertSchedule(workflow));

const stepBody = (name) => {
  const step = staticSteps(workflow).find((step) => step.name === name);
  assert.ok(step, `Missing fixture step: ${name}`);
  return step.body;
};
const launchBody = stepBody('Start Format Check in the background');
const typeBody = stepBody('Type Check');
const waitBody = stepBody('Format Check');
const swap = (a, b) =>
  workflow.replace(a, 'FIXTURE_STEP').replace(b, a).replace('FIXTURE_STEP', b);
const fixtures = {
  'missing launch': workflow.replace(launchBody, ''),
  'missing wait': workflow.replace(waitBody, ''),
  'launch after typecheck': swap(launchBody, typeBody),
  'wait before typecheck': swap(typeBody, waitBody),
  'launch only in an unrelated job': workflow
    .replace(launchBody, '')
    .replace(
      '\n  simulation-checks:\n',
      `\n  simulation-checks:\n${launchBody}`,
    ),
  'launch only in a comment': workflow.replace(
    launchBody,
    launchBody
      .split('\n')
      .map((line) => `# ${line}`)
      .join('\n'),
  ),
  'wait only in an unrelated job': workflow
    .replace(waitBody, '')
    .replace('\n  simulation-checks:\n', `\n  simulation-checks:\n${waitBody}`),
  'wait only in a comment': workflow.replace(
    waitBody,
    waitBody
      .split('\n')
      .map((line) => `# ${line}`)
      .join('\n'),
  ),
  'lost format failure propagation': workflow.replace(
    waitBody,
    waitBody.replace('if: ${{ !cancelled() }}', 'if: ${{ success() }}'),
  ),
  'lost typecheck failure propagation': workflow.replace(
    typeBody,
    typeBody.replace(
      '        run:',
      '        continue-on-error: true\n        run:',
    ),
  ),
  'static checks missing from aggregator': workflow.replace(
    '        static-checks,\n',
    '',
  ),
};
for (const [name, source] of Object.entries(fixtures)) {
  test(`rejects ${name}`, () => {
    assert.notEqual(source, workflow, 'Fixture did not mutate the workflow');
    assert.throws(() => assertSchedule(source));
  });
}

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
