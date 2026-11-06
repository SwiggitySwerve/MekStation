import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

import { readWorkflow } from './budget-workflow.mjs';
import {
  AGGREGATOR,
  aggregatorMissing,
  shouldReportMissing,
} from './lint-and-test-guard.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));

test('draft and ready PR pushes run the same checks without a duplicate ready transition', () => {
  const workflow = readWorkflow(root);
  assert.deepEqual(workflow.on.pull_request.types, [
    'opened',
    'synchronize',
    'reopened',
  ]);
  assert.deepEqual(workflow.on.pull_request.branches, ['main']);
  for (const [id, job] of Object.entries(workflow.jobs)) {
    assert.doesNotMatch(job.if ?? '', /draft|ready_for_review/, id);
    for (const step of job.steps ?? [])
      assert.doesNotMatch(
        step.if ?? '',
        /draft|ready_for_review/,
        `${id}/${step.name}`,
      );
  }
  assert.equal(workflow.jobs['lint-and-test'].name, AGGREGATOR);
  assert.equal(workflow.jobs['lint-and-test'].if, 'always()');
});

test('completed source runs still drive head-bound Guard, approval and budget publishing', () => {
  const guard = parse(
    fs.readFileSync(
      path.join(root, '.github/workflows/lint-and-test-guard.yml'),
      'utf8',
    ),
  );
  assert.deepEqual(guard.on, {
    workflow_run: { workflows: ['PR Checks'], types: ['completed'] },
  });
  const steps = guard.jobs.guard.steps;
  assert.equal(
    steps.find((step) => step.run?.includes('lint-and-test-guard.mjs')).env
      .HEAD_SHA,
    '${{ github.event.workflow_run.head_sha }}',
  );
  assert.ok(
    steps.some((step) => step.with?.script?.includes('checkBudgetPolicy')),
  );
  assert.ok(
    steps.some((step) => step.run === 'node scripts/ci/budget-report.mjs'),
  );
  for (const step of steps)
    assert.doesNotMatch(step.if ?? '', /draft|ready_for_review/);
});

test('only the separate budget approval safety reevaluation retains the ready listener', () => {
  const listeners = fs
    .readdirSync(path.join(root, '.github/workflows'))
    .filter((file) => /\.ya?ml$/.test(file))
    .filter((file) => {
      const workflow = parse(
        fs.readFileSync(path.join(root, '.github/workflows', file), 'utf8'),
      );
      return Object.values(workflow.on ?? {}).some((trigger) =>
        trigger?.types?.includes('ready_for_review'),
      );
    });
  assert.deepEqual(listeners, ['ci-budget-approval.yml']);
});

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
