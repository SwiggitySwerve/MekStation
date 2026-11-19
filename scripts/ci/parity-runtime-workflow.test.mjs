import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { parse } from 'yaml';

import { inducedWorkflowCensus, readWorkflow } from './budget-workflow.mjs';
import {
  DEFAULT_FAMILY,
  planCensus,
  readRegistry,
} from './parity-runtime-families.mjs';
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
  // The family input defaults to battlemechs, so every existing caller is unchanged.
  const registry = readRegistry();
  const dispatchFamily = wf.on.workflow_dispatch.inputs.family;
  assert.deepEqual(dispatchFamily.options, Object.keys(registry.families));
  assert.equal(dispatchFamily.default, DEFAULT_FAMILY);
  assert.deepEqual(wf.on.workflow_call.inputs.family, {
    required: false,
    default: DEFAULT_FAMILY,
    type: 'string',
  });
  assert.deepEqual(wf.on.workflow_call.inputs['timeout-minutes'], {
    required: false,
    default: 0,
    type: 'number',
  });
  assert.deepEqual(wf.permissions, { contents: 'read', actions: 'read' });
  assert.deepEqual(wf.concurrency, {
    group:
      'parity-runtime-${{ inputs.family }}-${{ inputs.measure }}-${{ github.ref }}',
    'cancel-in-progress': false,
  });
  const job = wf.jobs.census;
  // Owner-held limits: the caller's registry value, else the battlemechs
  // fallback, which must equal the registry's battlemechs values (15 and 20).
  assert.equal(
    job['timeout-minutes'],
    "${{ inputs.timeout-minutes || (inputs.measure == 'load' && 15 || 20) }}",
  );
  assert.deepEqual(registry.families[DEFAULT_FAMILY].timeoutMinutes, {
    load: 15,
    reopen: 20,
  });
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

test('the family is resolved from the registry before anything uses its names or directory', () => {
  const steps = workflow().jobs.census.steps;
  const index = (name) => steps.findIndex((step) => step.name === name);
  const resolve = steps[index('Resolve family')];
  assert.equal(resolve.id, 'family');
  assert.ok(!resolve['continue-on-error']);
  assert.ok(!resolve.if);
  assert.equal(
    resolve.run,
    'node scripts/ci/parity-runtime-families.mjs resolve --family "$FAMILY" --measure "$MEASURE" --timeout-minutes "$TIMEOUT_MINUTES"',
  );
  assert.deepEqual(resolve.env, {
    FAMILY: '${{ inputs.family }}',
    MEASURE: '${{ inputs.measure }}',
    TIMEOUT_MINUTES: '${{ inputs.timeout-minutes }}',
  });
  assert.ok(index('Checkout') < index('Resolve family'));
  for (const later of [
    'Set runner scratch path',
    'Install dependencies',
    'Run runtime census',
  ])
    assert.ok(index('Resolve family') < index(later), later);
  const scratch = steps[index('Set runner scratch path')];
  assert.equal(scratch.env.OUT_DIR, '${{ steps.family.outputs.out-dir }}');
  assert.match(scratch.run, /PARITY_RUNTIME_OUTPUT=%s\/%s/);
});

test('each measure maps to its port entry, gets the registry entry flags, and a missing entry fails by name', (t) => {
  const step = workflow().jobs.census.steps.find(
    (item) => item.name === 'Run runtime census',
  );
  const run = step.run;
  assert.equal(step.env.ENTRY_FLAGS, '${{ steps.family.outputs.entry-flags }}');
  assert.match(run, /load\) entry=scripts\/runtime-path-bv\/run\.mjs/);
  assert.match(run, /reopen\) entry=scripts\/runtime-roundtrip\/run\.mjs/);
  assert.match(run, /if \[ ! -f "\$entry" \]; then[\s\S]*exit 1/);
  assert.match(
    run,
    /node "\$entry" --out "\$PARITY_RUNTIME_OUTPUT" "\$\{flags\[@\]\}" \|\| status=\$\?/,
  );
  assert.match(run, /exit "\$status"$/m);
  // Run the step with a fake node: no flags add no argument (battlemechs
  // today); flags arrive as separate words.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-census-step-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'bin'));
  fs.mkdirSync(path.join(root, 'scripts/runtime-path-bv'), {
    recursive: true,
  });
  fs.writeFileSync(path.join(root, 'scripts/runtime-path-bv/run.mjs'), '');
  fs.writeFileSync(
    path.join(root, 'bin/node'),
    '#!/bin/sh\nif [ "$1" = "--version" ]; then echo v22; exit 0; fi\nprintf "%s\\n" "$@" > "$PARITY_RUNTIME_OUTPUT/args"\n',
    { mode: 0o755 },
  );
  fs.writeFileSync(path.join(root, 'bin/git'), '#!/bin/sh\necho sha\n', {
    mode: 0o755,
  });
  for (const [flags, extra] of [
    ['', []],
    ['--family vehicles', ['--family', 'vehicles']],
  ]) {
    const out = path.join(root, 'out');
    const result = spawnSync('bash', ['-e', '-c', run], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${path.join(root, 'bin')}${path.delimiter}${process.env.PATH}`,
        PARITY_RUNTIME_OUTPUT: out,
        GITHUB_STEP_SUMMARY: path.join(root, 'summary'),
        FAMILY: 'battlemechs',
        MEASURE: 'load',
        ENTRY_FLAGS: flags,
      },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      fs.readFileSync(path.join(out, 'args'), 'utf8').split('\n').slice(0, -1),
      ['scripts/runtime-path-bv/run.mjs', '--out', out, ...extra],
    );
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(out, 'run-meta.json'), 'utf8'))
        .family,
      'battlemechs',
    );
  }
});

test('run-meta.json records what the hosted-vs-local acceptance compares', () => {
  const run = workflow().jobs.census.steps.find(
    (step) => step.name === 'Run runtime census',
  ).run;
  const meta = run.slice(run.indexOf('printf'), run.indexOf('run-meta.json'));
  for (const field of [
    'family',
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
  // Always, once the family resolved (otherwise there is no name or directory).
  assert.equal(
    upload.if,
    "${{ always() && steps.family.outcome == 'success' }}",
  );
  assert.equal(upload.with.name, '${{ steps.family.outputs.census-artifact }}');
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
  assert.match(
    lookup.run,
    /node scripts\/ci\/parity-runtime-last-green\.mjs --family "\$FAMILY" --measure "\$MEASURE"/,
  );
  assert.equal(lookup.env.FAMILY, '${{ inputs.family }}');
  assert.equal(lookup.env.GH_TOKEN, '${{ github.token }}');
  assert.equal(lookup.env.GH_REPO, '${{ github.repository }}');
  assert.equal(lookup.env.RUN_ID, '${{ github.run_id }}');
  const summary = steps.find((step) => step.name === 'Summarize runtime gate');
  assert.equal(summary.if, '${{ !cancelled() }}');
  assert.match(
    summary.run,
    /node scripts\/ci\/parity-runtime-summary\.mjs --family "\$FAMILY"/,
  );
  const upload = steps.find(
    (step) =>
      step.with?.name === '${{ steps.family.outputs.last-green-artifact }}',
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
    '${{ runner.temp }}/${{ steps.family.outputs.out-dir }}/gate/last-green.json',
  );
  assert.equal(upload.with['if-no-files-found'], 'error');
  assert.ok(
    steps.indexOf(upload) > steps.findIndex((step) => step.id === 'gate'),
  );
  const censusUpload = steps.find(
    (step) => step.with?.name === '${{ steps.family.outputs.census-artifact }}',
  );
  assert.equal(
    censusUpload.with.path,
    '${{ runner.temp }}/${{ steps.family.outputs.out-dir }}/',
  );
});

// The plan job and the matrix call shared by Nightly and parity-census.yml.
function assertPlannedMatrix(jobs, planId, matrixId, planRun) {
  const plan = jobs[planId];
  assert.equal(plan['runs-on'], 'ubuntu-latest');
  assert.equal(plan['timeout-minutes'], 5);
  assert.deepEqual(plan.outputs, {
    matrix: '${{ steps.plan.outputs.matrix }}',
  });
  assert.equal(plan.steps.find((item) => item.id === 'plan').run, planRun);
  // No install: the plan reads the registry with Node built-ins only.
  assert.ok(
    !plan.steps.some((item) => /npm (ci|install)/.test(item.run ?? '')),
  );
  for (const checkout of plan.steps.filter((item) =>
    item.uses?.startsWith('actions/checkout@'),
  ))
    assert.equal(checkout.with['persist-credentials'], false);
  const job = jobs[matrixId];
  assert.equal(job.needs, planId);
  assert.equal(job.uses, './.github/workflows/parity-runtime.yml');
  assert.deepEqual(job.strategy, {
    'fail-fast': false,
    'max-parallel': 4,
    matrix: `\${{ fromJSON(needs.${planId}.outputs.matrix) }}`,
  });
  assert.deepEqual(job.with, {
    family: '${{ matrix.family }}',
    measure: '${{ matrix.measure }}',
    'timeout-minutes': '${{ matrix.timeout }}',
  });
  assert.deepEqual(job.permissions, { contents: 'read', actions: 'read' });
}

test('Nightly runs every enabled family x measure from the registry and waits for them before notifying', () => {
  const nightly = parse(
    fs.readFileSync('.github/workflows/nightly-validation.yml', 'utf8'),
  );
  assert.deepEqual(Object.keys(nightly.on).sort(), [
    'schedule',
    'workflow_dispatch',
  ]);
  assertPlannedMatrix(
    nightly.jobs,
    'parity-runtime-plan',
    'parity-runtime',
    'node scripts/ci/parity-runtime-families.mjs plan --families all --measures both',
  );
  assert.deepEqual(nightly.jobs['parity-runtime-plan'].permissions, {
    contents: 'read',
  });
  // Today's Nightly result is unchanged: battlemechs only, both measures,
  // today's limits (and, through the names owner, today's artifact names).
  assert.deepEqual(
    planCensus(readRegistry(), { families: 'all', measures: 'both' }),
    {
      include: [
        { family: 'battlemechs', measure: 'load', timeout: 15 },
        { family: 'battlemechs', measure: 'reopen', timeout: 20 },
      ],
    },
  );
  for (const need of ['parity-runtime-plan', 'parity-runtime'])
    assert.ok(nightly.jobs['notify-on-failure'].needs.includes(need), need);
  assert.match(
    nightly.jobs['notify-on-failure'].steps[0].run,
    /Lanes:.*runtime parity/,
  );
});

test('parity-census is dispatch only, read-only, and plans its matrix from the registry', () => {
  const census = parse(
    fs.readFileSync('.github/workflows/parity-census.yml', 'utf8'),
  );
  assert.deepEqual(Object.keys(census.on), ['workflow_dispatch']);
  // No repo-wide group: GitHub would cancel another lane's pending dispatch.
  assert.equal(census.concurrency, undefined);
  const inputs = census.on.workflow_dispatch.inputs;
  assert.deepEqual(Object.keys(inputs).sort(), ['families', 'measures']);
  assert.equal(inputs.families.type, 'string');
  assert.equal(inputs.families.default, 'all');
  assert.deepEqual(inputs.measures.options, ['both', 'load', 'reopen']);
  assert.deepEqual(census.permissions, { contents: 'read', actions: 'read' });
  assert.deepEqual(Object.keys(census.jobs), ['plan', 'census']);
  assertPlannedMatrix(
    census.jobs,
    'plan',
    'census',
    'node scripts/ci/parity-runtime-families.mjs plan --families "$FAMILIES" --measures "$MEASURES"',
  );
  assert.deepEqual(
    census.jobs.plan.steps.find((step) => step.id === 'plan').env,
    {
      FAMILIES: '${{ inputs.families }}',
      MEASURES: '${{ inputs.measures }}',
    },
  );
  const budget = inducedWorkflowCensus(process.cwd(), [
    '.github/workflows/parity-census.yml',
  ]);
  assert.ok(!budget.files.includes('parity-census.yml'));
  assert.ok(
    budget.otherEvents.some((item) => item.file === 'parity-census.yml'),
  );
});
