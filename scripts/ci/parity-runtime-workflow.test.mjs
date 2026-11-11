import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { parse } from 'yaml';

import { inducedWorkflowCensus, readWorkflow } from './budget-workflow.mjs';

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
  assert.deepEqual(wf.permissions, { contents: 'read' });
  assert.deepEqual(wf.concurrency, {
    group: 'parity-runtime-${{ inputs.measure }}-${{ github.ref }}',
    'cancel-in-progress': false,
  });
  const job = wf.jobs.census;
  assert.equal(job['timeout-minutes'], 45);
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
  assert.ok(!steps.some((step) => step['continue-on-error']));
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
