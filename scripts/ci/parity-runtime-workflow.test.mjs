import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { parse } from 'yaml';

import { inducedWorkflowCensus, readWorkflow } from './budget-workflow.mjs';
import {
  LAST_GREEN_RETENTION_DAYS,
  LAST_GREEN_UPLOAD_STATUSES,
} from './parity-runtime-last-green.mjs';

const file = '.github/workflows/parity-runtime.yml';
const workflow = () => parse(fs.readFileSync(file, 'utf8'));

test('runtime census is dispatch/call only, read-only, coalesced and bounded', () => {
  const wf = workflow();
  assert.deepEqual(Object.keys(wf.on).sort(), [
    'workflow_call',
    'workflow_dispatch',
  ]);
  assert.deepEqual(wf.on.workflow_dispatch.inputs.measure.options, [
    'load',
    'reopen',
  ]);
  assert.equal(wf.on.workflow_dispatch.inputs.measure.required, true);
  assert.equal(wf.on.workflow_call.inputs.measure.required, true);
  assert.deepEqual(wf.permissions, { contents: 'read', actions: 'read' });
  assert.deepEqual(wf.concurrency, {
    group: 'parity-runtime-${{ inputs.measure }}-${{ github.ref }}',
    'cancel-in-progress': false,
  });
  const job = wf.jobs.census;
  assert.equal(
    job['timeout-minutes'],
    "${{ inputs.measure == 'load' && 15 || 20 }}",
  );
  assert.equal(job.env, undefined);
  const steps = job.steps;
  assert.equal(
    steps.find((step) => step.uses?.startsWith('actions/setup-node@')).with[
      'node-version'
    ],
    '22',
  );
  for (const checkout of steps.filter((step) =>
    step.uses?.startsWith('actions/checkout@'),
  ))
    assert.equal(checkout.with['persist-credentials'], false);
  assert.ok(!job['continue-on-error']);
  assert.deepEqual(
    steps.filter((step) => step['continue-on-error']).map((step) => step.id),
    ['last-green'],
  );
  assert.equal(
    steps.find((step) => step.name === 'Checkout').with['fetch-depth'],
    0,
  );
});

test('each measure maps to its port entry and a missing entry fails by name', () => {
  const run = workflow().jobs.census.steps.find(
    (step) => step.name === 'Run runtime census',
  ).run;
  assert.match(run, /load\) entry=scripts\/runtime-path-bv\/run\.mjs/);
  assert.match(run, /reopen\) entry=scripts\/runtime-roundtrip\/run\.mjs/);
  assert.match(run, /if \[ ! -f "\$entry" \]; then[\s\S]*exit 1/);
  assert.match(
    run,
    /node "\$entry" --out "\$PARITY_RUNTIME_OUTPUT" \|\| status=\$\?/,
  );
  assert.match(run, /exit "\$status"$/m);
});

test('run-meta.json records what the hosted-vs-local acceptance compares', () => {
  const run = workflow().jobs.census.steps.find(
    (step) => step.name === 'Run runtime census',
  ).run;
  const meta = run.slice(run.indexOf('printf'), run.indexOf('run-meta.json'));
  for (const field of [
    'sha',
    'node',
    'runnerImage',
    'runnerArch',
    'wallSeconds',
    'exitCode',
  ])
    assert.match(meta, new RegExp(`"${field}":`));
  assert.match(meta, /git rev-parse HEAD/);
  assert.match(meta, /ImageOS/);
  assert.match(meta, /ImageVersion/);
  // Written after the census whatever its exit, then the exit is returned.
  assert.ok(run.indexOf('run-meta.json') < run.lastIndexOf('exit "$status"'));
});

test('census output is uploaded even when the census fails', () => {
  const upload = workflow().jobs.census.steps.find((step) =>
    step.uses?.startsWith('actions/upload-artifact@'),
  );
  assert.equal(upload.if, '${{ always() }}');
  assert.equal(upload.with.name, 'parity-runtime-${{ inputs.measure }}');
  assert.equal(upload.with['retention-days'], 14);
  assert.equal(upload.with['if-no-files-found'], 'error');
});

test('runtime census is classified outside the PR census and required aggregator', () => {
  const census = inducedWorkflowCensus(process.cwd(), [file]);
  assert.ok(!census.files.includes('parity-runtime.yml'));
  assert.ok(
    census.otherEvents.some((item) => item.file === 'parity-runtime.yml'),
  );
  assert.ok(
    !readWorkflow(process.cwd()).jobs['lint-and-test'].needs.includes('census'),
  );
});

test('gate runs after census and retrieval, and preserves pass/regression/fail-closed exits', (t) => {
  const steps = workflow().jobs.census.steps;
  const gateIndex = steps.findIndex((step) => step.id === 'gate');
  assert.ok(
    gateIndex > steps.findIndex((step) => step.name === 'Run runtime census'),
  );
  assert.ok(gateIndex > steps.findIndex((step) => step.id === 'last-green'));
  const gate = steps[gateIndex];
  assert.ok(!gate['continue-on-error']);
  assert.equal(gate.if, '${{ !cancelled() }}');
  assert.equal(gate.env.MEASURE, '${{ inputs.measure }}');
  assert.match(gate.run, /node scripts\/lib\/runtime-parity\/gate\.mjs/);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-gate-step-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'bin'));
  fs.writeFileSync(
    path.join(root, 'bin/node'),
    '#!/bin/sh\nprintf "%s\\n" "$@" > "$PARITY_RUNTIME_OUTPUT/args"\nexit "$GATE_EXIT"\n',
    { mode: 0o755 },
  );
  for (const hasGreen of [false, true]) {
    if (hasGreen) {
      fs.mkdirSync(path.join(root, 'previous'));
      fs.writeFileSync(path.join(root, 'previous/last-green.json'), '{}');
    }
    for (const code of [0, 1, 2]) {
      const result = spawnSync('bash', ['-eo', 'pipefail', '-c', gate.run], {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${path.join(root, 'bin')}${path.delimiter}${process.env.PATH}`,
          PARITY_RUNTIME_OUTPUT: root,
          MEASURE: 'load',
          GATE_EXIT: String(code),
        },
      });
      assert.equal(result.status, code, result.stderr);
      const args = fs.readFileSync(path.join(root, 'args'), 'utf8');
      assert.match(args, /--measure\nload\n--run-dir\n/);
      assert.equal(args.includes('--last-green\n'), hasGreen);
    }
  }
});

test('last-green lookup is optional, main-only, and summary runs even on gate failure', () => {
  const steps = workflow().jobs.census.steps;
  const lookup = steps.find((step) => step.id === 'last-green');
  assert.ok(lookup);
  assert.equal(lookup['continue-on-error'], true);
  assert.match(lookup.run, /node scripts\/ci\/parity-runtime-last-green\.mjs/);
  assert.equal(lookup.env.GH_TOKEN, '${{ github.token }}');
  assert.equal(lookup.env.GH_REPO, '${{ github.repository }}');
  assert.equal(lookup.env.RUN_ID, '${{ github.run_id }}');
  const summary = steps.find((step) => step.name === 'Summarize runtime gate');
  assert.equal(summary.if, '${{ !cancelled() }}');
  assert.match(summary.run, /node scripts\/ci\/parity-runtime-summary\.mjs/);
  const upload = steps.find(
    (step) =>
      step.with?.name === 'parity-runtime-last-green-${{ inputs.measure }}',
  );
  // Upload only after a lookup that completed: the statuses in the condition
  // are exactly LAST_GREEN_UPLOAD_STATUSES, read from the lookup step's output,
  // so a failed lookup (or no output at all) uploads nothing.
  assert.equal(
    upload.if,
    "${{ success() && steps.gate.outcome == 'success' && (steps.last-green.outputs.status == 'found' || steps.last-green.outputs.status == 'none') }}",
  );
  const statuses = [
    ...upload.if.matchAll(/steps\.last-green\.outputs\.status == '([a-z]+)'/g),
  ].map((match) => match[1]);
  assert.deepEqual(statuses.sort(), [...LAST_GREEN_UPLOAD_STATUSES].sort());
  assert.ok(!statuses.includes('failed'));
  // The lookup's scan window and the upload's retention are one value.
  assert.equal(upload.with['retention-days'], LAST_GREEN_RETENTION_DAYS);
  assert.equal(upload.with.overwrite, true);
  assert.equal(
    upload.with.path,
    '${{ runner.temp }}/parity-runtime/gate/last-green.json',
  );
  assert.equal(upload.with['if-no-files-found'], 'error');
  assert.ok(
    steps.indexOf(upload) > steps.findIndex((step) => step.id === 'gate'),
  );
  const censusUpload = steps.find(
    (step) => step.with?.name === 'parity-runtime-${{ inputs.measure }}',
  );
  assert.equal(censusUpload.with.path, '${{ runner.temp }}/parity-runtime/');
});

test('Nightly calls both measures independently and waits for them before notifying', () => {
  const nightly = parse(
    fs.readFileSync('.github/workflows/nightly-validation.yml', 'utf8'),
  );
  assert.deepEqual(Object.keys(nightly.on).sort(), [
    'schedule',
    'workflow_dispatch',
  ]);
  const job = nightly.jobs['parity-runtime'];
  assert.ok(job);
  assert.equal(job.uses, './.github/workflows/parity-runtime.yml');
  assert.deepEqual(job.strategy.matrix.measure, ['load', 'reopen']);
  assert.equal(job.strategy['fail-fast'], false);
  assert.deepEqual(job.with, { measure: '${{ matrix.measure }}' });
  assert.deepEqual(job.permissions, { contents: 'read', actions: 'read' });
  assert.ok(nightly.jobs['notify-on-failure'].needs.includes('parity-runtime'));
  assert.match(
    nightly.jobs['notify-on-failure'].steps[0].run,
    /Lanes:.*runtime parity/,
  );
});
